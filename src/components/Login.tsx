import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChefHat, 
  Mail, 
  Lock, 
  ArrowRight, 
  ClipboardList, 
  Package, 
  Sparkles, 
  LogIn, 
  Eye, 
  EyeOff, 
  User, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginProps {
  onLogin: () => void;
  isRecoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}

type ViewState = 'login' | 'signup' | 'forgot' | 'reset' | 'confirm_email';

export default function Login({ onLogin, isRecoveryMode = false, onRecoveryComplete }: LoginProps) {
  const [view, setViewState] = useState<ViewState>(isRecoveryMode ? 'reset' : 'login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  
  // UX states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Cooldown states (UX protection against brute force)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Sync recovery mode prop with view state
  useEffect(() => {
    if (isRecoveryMode) {
      setViewState('reset');
      setError(null);
      setSuccess(null);
    }
  }, [isRecoveryMode]);

  // Load and check cooldown from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('servio_auth_attempts');
      if (stored) {
        const { attempts, lockoutUntil } = JSON.parse(stored);
        const now = Date.now();
        if (lockoutUntil && lockoutUntil > now) {
          const secondsLeft = Math.ceil((lockoutUntil - now) / 1000);
          setFailedAttempts(attempts);
          setCooldownSeconds(secondsLeft);
        } else if (lockoutUntil && lockoutUntil <= now) {
          // Cooldown expired
          localStorage.removeItem('servio_auth_attempts');
        }
      }
    } catch (e) {
      console.error('Erro ao ler tentativas de login:', e);
    }
  }, []);

  // Cooldown timer countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setFailedAttempts(0);
          localStorage.removeItem('servio_auth_attempts');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Record failed attempt and handle cooldown lock
  const handleFailedAttempt = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      const duration = 60 * 1000; // 60 segundos
      const lockoutTime = Date.now() + duration;
      setCooldownSeconds(60);
      localStorage.setItem('servio_auth_attempts', JSON.stringify({
        attempts: nextAttempts,
        lockoutUntil: lockoutTime
      }));
    } else {
      localStorage.setItem('servio_auth_attempts', JSON.stringify({
        attempts: nextAttempts,
        lockoutUntil: null
      }));
    }
  };

  // Password validation checks
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&#]/.test(password);
  
  const strengthPoints = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const isPasswordValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const getPasswordStrength = () => {
    if (!password) return { label: '', color: 'bg-zinc-200', textClass: 'text-zinc-400' };
    if (strengthPoints <= 2) return { label: 'Fraca', color: 'bg-red-500', textClass: 'text-red-500' };
    if (strengthPoints < 5) return { label: 'Média', color: 'bg-amber-500', textClass: 'text-amber-500' };
    return { label: 'Forte', color: 'bg-emerald-500', textClass: 'text-emerald-500' };
  };

  const strength = getPasswordStrength();

  // Helper to translate Supabase Auth errors to friendly Portuguese
  const translateAuthError = (msg: string) => {
    const lowercaseMsg = msg.toLowerCase();
    if (lowercaseMsg.includes('invalid login credentials') || lowercaseMsg.includes('email not confirmed')) {
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    }
    if (lowercaseMsg.includes('user already exists') || lowercaseMsg.includes('already registered')) {
      return 'Este e-mail já está cadastrado no sistema.';
    }
    if (lowercaseMsg.includes('too many requests') || lowercaseMsg.includes('rate limit')) {
      return 'Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes.';
    }
    if (lowercaseMsg.includes('network') || lowercaseMsg.includes('failed to fetch')) {
      return 'Falha de conexão. Verifique sua internet e tente novamente.';
    }
    return msg;
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    setSuccess(null);

    // 1. LOGIN FLOW
    if (view === 'login') {
      if (cooldownSeconds > 0) {
        setError(`Bloqueio temporário ativo. Aguarde mais ${cooldownSeconds}s.`);
        return;
      }
      setIsLoading(true);
      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (authError) {
          handleFailedAttempt();
          setError(translateAuthError(authError.message));
        } else {
          // Reset cooldown on successful login
          setFailedAttempts(0);
          localStorage.removeItem('servio_auth_attempts');
          onLogin();
        }
      } catch (err: any) {
        setError('Ocorreu um erro inesperado. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    }

    // 2. SIGNUP FLOW
    if (view === 'signup') {
      if (!isPasswordValid) {
        setError('A senha não atende a todos os requisitos de segurança.');
        return;
      }
      setIsLoading(true);
      try {
        const { data: signupData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              restaurant_name: restaurantName,
              name: ownerName
            }
          }
        });
        if (authError) {
          setError(translateAuthError(authError.message));
        } else if (signupData?.user) {
          // If session is created directly (email confirm disabled in supabase)
          if (signupData.session) {
            setSuccess('Conta criada e logada com sucesso!');
            setTimeout(() => onLogin(), 1500);
          } else {
            // E-mail confirmation is enabled
            setViewState('confirm_email');
          }
        }
      } catch (err: any) {
        setError('Erro ao criar conta. Tente novamente mais tarde.');
      } finally {
        setIsLoading(false);
      }
    }

    // 3. FORGOT PASSWORD FLOW
    if (view === 'forgot') {
      setIsLoading(true);
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`
        });
        if (resetError) {
          setError(translateAuthError(resetError.message));
        } else {
          setSuccess('Link de recuperação enviado! Verifique a caixa de entrada do seu e-mail.');
        }
      } catch (err: any) {
        setError('Erro ao enviar link de recuperação.');
      } finally {
        setIsLoading(false);
      }
    }

    // 4. PASSWORD RESET FLOW
    if (view === 'reset') {
      if (!isPasswordValid) {
        setError('A nova senha não atende aos requisitos de segurança.');
        return;
      }
      setIsLoading(true);
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password
        });
        if (updateError) {
          setError(translateAuthError(updateError.message));
        } else {
          setSuccess('Senha redefinida com sucesso! Redirecionando para o login...');
          setTimeout(() => {
            if (onRecoveryComplete) {
              onRecoveryComplete();
            } else {
              setViewState('login');
            }
          }, 2500);
        }
      } catch (err: any) {
        setError('Erro ao redefinir sua senha.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-center overflow-hidden relative font-sans">
      
      {/* Background ambient texture for restaurant atmosphere - Light style */}
      <div 
        className="absolute inset-0 bg-[url('/src/assets/images/restaurant_light_bg_1783448355942.jpg')] bg-cover bg-left-bottom lg:bg-center bg-no-repeat opacity-[0.16] pointer-events-none mix-blend-multiply z-0"
      />

      {/* Vertical Wavy Green Ribbon Divider */}
      <div className="hidden lg:block absolute top-0 bottom-0 left-[50.5%] -translate-x-1/2 w-48 pointer-events-none z-10 h-full">
        <svg className="w-full h-full" viewBox="0 0 120 1080" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="greenRibbonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#098043" stopOpacity="1" />
              <stop offset="75%" stopColor="#098043" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#098043" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#098043" stopOpacity="0.15" />
              <stop offset="75%" stopColor="#098043" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#098043" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <path 
            d="M 52 0 C 27 300, 80 700, 14 1080 L 106 1080 C 130 700, 53 300, 68 0 Z" 
            fill="url(#glowGrad)"
          />
          <path 
            d="M 57 0 C 32 300, 85 700, 34 1080 L 78 1080 C 112 700, 48 300, 63 0 Z" 
            fill="url(#greenRibbonGrad)"
          />
        </svg>
      </div>

      <div className="w-full max-w-[1360px] mx-auto z-10 grid grid-cols-1 lg:grid-cols-12 min-h-screen items-center">
        {/* LEFT PANEL - Landing Content (Col-span 7) */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 md:p-12 lg:p-14 xl:p-16 py-12 lg:py-20 z-10 relative h-full">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-md border border-zinc-200">
              <ChefHat className="text-[#098043]" size={26} />
            </div>
            <div>
              <span className="text-3xl font-sans tracking-tight font-extrabold text-[#0F172A] block leading-none">Servio</span>
              <span className="text-[9px] tracking-[0.2em] uppercase font-black text-[#098043] block mt-1.5">Gestão de Comandas</span>
            </div>
          </div>

          {/* Hero Section */}
          <div className="my-12 lg:my-8 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#E8F5E9] text-[#098043] text-xs font-bold tracking-wide uppercase mb-8">
                Sistema completo para restaurantes
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#0F172A] leading-[1.12] mb-6">
                O controle do seu <br />
                restaurante na <br />
                <span className="text-[#098043]">palma da sua mão.</span>
              </h1>

              <p className="text-zinc-600 text-sm md:text-base mb-10 leading-relaxed">
                Com o <strong className="text-[#098043] font-bold">Servio</strong>, você lança comandas, controla o estoque, acompanha vendas e entrega relatórios em tempo real. Mais agilidade, menos erros, mais resultados.
              </p>
            </motion.div>

            {/* Value Props Horizontal Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-zinc-200/60">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#E8F5E9] flex items-center justify-center shrink-0 shadow-sm">
                  <ClipboardList className="text-[#098043]" size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Comandas Digitais</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Abertura rápida de mesas e consumo com alertas de espera.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#E8F5E9] flex items-center justify-center shrink-0 shadow-sm">
                  <Package className="text-[#098043]" size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Estoque Inteligente</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Controle de produtos e ingredientes com precisão.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 uppercase tracking-wider pt-6 mt-8 lg:mt-0">
            <span>&copy; {new Date().getFullYear()} Servio — Todos os direitos reservados.</span>
          </div>
        </div>

        {/* RIGHT PANEL - Forms Card */}
        <div className="lg:col-span-5 flex items-center justify-center p-6 md:p-12 lg:p-10 xl:p-12 z-10 relative">
          <div className="absolute top-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none -z-10" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-[550px] bg-white border border-zinc-200 rounded-xl p-10 md:p-12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)]"
          >
            <div className="mb-6 text-center">
              <div className="inline-flex w-16 h-16 rounded-full bg-[#E8F5E9] items-center justify-center shadow-inner">
                <ChefHat className="text-[#098043]" size={28} />
              </div>
              <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight mt-4">
                {view === 'login' && 'Bem-vindo de volta!'}
                {view === 'signup' && 'Crie sua conta grátis'}
                {view === 'forgot' && 'Recuperar Senha'}
                {view === 'reset' && 'Nova Senha'}
                {view === 'confirm_email' && 'Verifique seu e-mail'}
              </h2>
              <p className="text-zinc-500 text-sm mt-1">
                {view === 'login' && 'Acesse sua central de comando'}
                {view === 'signup' && 'Insira os dados para se cadastrar no sistema.'}
                {view === 'forgot' && 'Enviaremos um link de recuperação para seu e-mail'}
                {view === 'reset' && 'Defina uma nova senha para acessar sua conta'}
                {view === 'confirm_email' && 'Verificação de conta necessária'}
              </p>
            </div>

            {/* Error and Success Alerts */}
            {error && (
              <div className="mb-5 p-4 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100 flex items-start gap-2.5">
                <AlertTriangle className="shrink-0 text-red-500" size={16} />
                <span className="leading-normal">{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-5 p-4 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-100 flex items-start gap-2.5">
                <CheckCircle2 className="shrink-0 text-emerald-600" size={16} />
                <span className="leading-normal">{success}</span>
              </div>
            )}

            {view !== 'confirm_email' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. Sign Up Specific Fields */}
                {view === 'signup' && (
                  <>
                    <div className="group">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 group-focus-within:text-[#098043] transition-colors">
                        Nome do Estabelecimento
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                          <Sparkles size={18} />
                        </div>
                        <input
                          type="text"
                          required
                          disabled={isLoading}
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          placeholder="Ex: Pizzaria do Zé"
                          className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-sm shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 group-focus-within:text-[#098043] transition-colors">
                        Seu Nome Completo
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          required
                          disabled={isLoading}
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="Ex: José da Silva"
                          className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-sm shadow-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Email Field (For Login, SignUp, and Forgot view) */}
                {view !== 'reset' && (
                  <div className="group">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 group-focus-within:text-[#098043] transition-colors">
                      E-MAIL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        required
                        disabled={isLoading}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-sm shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Password Field (For Login, SignUp, and Reset views) */}
                {view !== 'forgot' && (
                  <div className="group">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider group-focus-within:text-[#098043] transition-colors">
                        SENHA
                      </label>
                      {view === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setViewState('forgot'); setError(null); setSuccess(null); }}
                          className="text-xs text-[#098043] hover:underline cursor-pointer font-semibold transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={isLoading}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={view === 'reset' ? 'Nova senha' : 'Sua senha'}
                        className="w-full pl-11 pr-12 py-3.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-sm shadow-sm"
                      />
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Password Strength Indicators (SignUp & Reset views only) */}
                {(view === 'signup' || view === 'reset') && password && (
                  <div className="space-y-2.5 pt-1">
                    {/* Strength Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                        <span>FORÇA DA SENHA:</span>
                        <span className={`uppercase ${strength.textClass}`}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${strength.color} transition-all duration-300`} 
                          style={{ width: `${(strengthPoints / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Requirements Checklists */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-medium text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <span className={hasLength ? 'text-emerald-600' : 'text-zinc-300'}>
                          {hasLength ? '✓' : '✗'}
                        </span>
                        <span className={hasLength ? 'text-emerald-700' : ''}>Mín. 8 caracteres</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={hasUpper ? 'text-emerald-600' : 'text-zinc-300'}>
                          {hasUpper ? '✓' : '✗'}
                        </span>
                        <span className={hasUpper ? 'text-emerald-700' : ''}>Letra maiúscula</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={hasLower ? 'text-emerald-600' : 'text-zinc-300'}>
                          {hasLower ? '✓' : '✗'}
                        </span>
                        <span className={hasLower ? 'text-emerald-700' : ''}>Letra minúscula</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={hasNumber ? 'text-emerald-600' : 'text-zinc-300'}>
                          {hasNumber ? '✓' : '✗'}
                        </span>
                        <span className={hasNumber ? 'text-emerald-700' : ''}>Número</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className={hasSpecial ? 'text-emerald-600' : 'text-zinc-300'}>
                          {hasSpecial ? '✓' : '✗'}
                        </span>
                        <span className={hasSpecial ? 'text-emerald-700' : ''}>Caractere especial (@$!%*?&#)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Cooldown Lock Info */}
                {view === 'login' && cooldownSeconds > 0 && (
                  <div className="p-3 bg-amber-50 text-amber-800 text-[11px] rounded-lg border border-amber-100 flex items-center gap-2">
                    <span className="animate-pulse w-2 h-2 bg-amber-600 rounded-full" />
                    <span>Bloqueado temporariamente por excesso de tentativas. Aguarde {cooldownSeconds}s.</span>
                  </div>
                )}

                {/* 6. Submit Button with Spinner */}
                <button
                  type="submit"
                  disabled={isLoading || (view === 'login' && cooldownSeconds > 0) || ((view === 'signup' || view === 'reset') && !isPasswordValid)}
                  className="w-full mt-6 bg-[#098043] hover:bg-[#076635] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all duration-300 shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      <span>
                        {view === 'login' && 'Entrar'}
                        {view === 'signup' && 'Cadastrar'}
                        {view === 'forgot' && 'Enviar link de recuperação'}
                        {view === 'reset' && 'Redefinir e Salvar'}
                      </span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* 7. Confirm Email View */
              <div className="space-y-6 text-center py-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl max-w-sm mx-auto text-emerald-800 text-sm">
                  <p className="leading-relaxed">
                    Cadastrado efetuado com sucesso! Enviamos um link de confirmação para o seu e-mail: <strong>{email}</strong>.
                  </p>
                  <p className="mt-3 font-semibold text-xs">
                    Por favor, clique no link do e-mail para ativar sua conta e liberar o acesso.
                  </p>
                </div>
                <button
                  onClick={() => { setViewState('login'); setError(null); setSuccess(null); }}
                  className="px-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  Voltar para o Login
                </button>
              </div>
            )}

            {/* Form Nav footer links */}
            {view !== 'confirm_email' && (
              <div className="mt-8 pt-6 border-t border-zinc-100 text-center flex flex-col gap-3">
                {view !== 'reset' ? (
                  <button
                    disabled={isLoading}
                    onClick={() => {
                      setError(null);
                      setSuccess(null);
                      setViewState(view === 'login' ? 'signup' : 'login');
                    }}
                    className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {view === 'login' ? (
                      <span>
                        Não tem uma conta? <strong className="text-[#098043] font-bold">Cadastre-se</strong>
                      </span>
                    ) : (
                      <span>
                        Já possui uma conta? <strong className="text-[#098043] font-bold">Faça login</strong>
                      </span>
                    )}
                  </button>
                ) : null}

                {view === 'forgot' && (
                  <button
                    disabled={isLoading}
                    onClick={() => { setViewState('login'); setError(null); setSuccess(null); }}
                    className="text-xs font-semibold text-zinc-400 hover:text-[#098043] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Voltar para o Login
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
