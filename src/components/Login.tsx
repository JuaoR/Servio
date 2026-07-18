import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChefHat, 
  Mail, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  LogIn, 
  Eye, 
  EyeOff, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  Hash,
  AtSign,
  Store,
  ArrowLeft
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [identifier, setIdentifier] = useState('');
  
  // Identifier verification states
  const [isCheckingIdentifier, setIsCheckingIdentifier] = useState(false);
  const [identifierStatus, setIdentifierStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  const [isEmployeeLogin, setIsEmployeeLogin] = useState(false);
  
  // UX states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDashboardHovered, setIsDashboardHovered] = useState(false);
  
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

  // Debounce identifier check for signup
  useEffect(() => {
    if (view !== 'signup') return;
    
    if (identifier.length === 0) {
      setIdentifierStatus('idle');
      return;
    }

    const isValid = /^[a-z0-9-]{4,20}$/.test(identifier);
    if (!isValid) {
      setIdentifierStatus('invalid');
      return;
    }

    setIsCheckingIdentifier(true);
    const timer = setTimeout(async () => {
      try {
        const { data: exists, error } = await supabase.rpc('check_identifier_exists', { identifier_to_check: identifier });
        
        if (exists) {
          setIdentifierStatus('taken');
        } else {
          setIdentifierStatus('available');
        }
      } catch (err) {
        console.error('RPC falhou, assumindo disponível para não travar o fluxo', err);
        setIdentifierStatus('available');
      } finally {
        setIsCheckingIdentifier(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [identifier, view]);

  
  // Real-time email validation
  useEffect(() => {
    if (view !== 'signup') {
      setEmailStatus('idle');
      return;
    }

    if (!email) {
      setEmailStatus('idle');
      return;
    }

    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      setEmailStatus('invalid');
      return;
    }

    setIsCheckingEmail(true);
    const timer = setTimeout(async () => {
      try {
        const { data: exists, error } = await supabase.rpc('check_email_exists', { email_to_check: email });
        
        if (exists) {
          setEmailStatus('taken');
        } else {
          setEmailStatus('available');
        }
      } catch (err) {
        console.error('RPC falhou, assumindo disponível para não travar o fluxo', err);
        setEmailStatus('available');
      } finally {
        setIsCheckingEmail(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [email, view]);

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
    if (strengthPoints < 5) return { label: 'Média', color: 'bg-orange-500', textClass: 'text-orange-500' };
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
        let loginEmail = email;
        if (isEmployeeLogin) {
          if (!identifier || !username) {
            setError('Preencha o identificador do restaurante e o usuário.');
            setIsLoading(false);
            return;
          }
          loginEmail = `${username.toLowerCase().trim()}@${identifier}.com`;
          
          const { data: restData, error: restError } = await supabase
            .from('restaurants')
            .select('id')
            .eq('id', identifier)
            .maybeSingle();
          
          if (!restData || restError) {
            setError('Identificador do restaurante não encontrado.');
            setIsLoading(false);
            return;
          }
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password
        });
        if (authError) {
          handleFailedAttempt();
          setError(translateAuthError(authError.message));
        } else if (authData.user) {
          if (isEmployeeLogin) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('restaurant_id')
              .eq('id', authData.user.id)
              .single();
              
            if (profileError || profileData?.restaurant_id !== identifier) {
              await supabase.auth.signOut();
              setError('Usuário não cadastrado neste restaurante.');
              setIsLoading(false);
              return;
            }
          }
          
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
      setHasAttemptedSubmit(true);
      if (password !== confirmPassword) {
        return;
      }
      if (!agreedToTerms) {
        return;
      }
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
              name: ownerName,
              restaurant_id: identifier
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
        // Primeiro, verifica se o e-mail existe usando o RPC
        const { data: emailExists, error: checkError } = await supabase.rpc('check_email_exists', { email_to_check: email });
        
        // Se a chamada RPC falhar (ex: função não criada no banco), ignoramos e prosseguimos
        // para o fluxo padrão do Supabase para não travar o usuário.
        if (!checkError && !emailExists) {
          setError('Este e-mail não está cadastrado em nosso sistema.');
          setIsLoading(false);
          return;
        }

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
    <>
      <main className="servio-shell">
        <div className="servio-bg" aria-hidden="true">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="grid-noise" />
        </div>

        <div className="servio-container">
          {/* LEFT / HERO */}
          <section className="servio-hero">
            <header className="brand">
              <div className="brand-mark" aria-hidden="true">
                <ChefHat size={20} strokeWidth={2.4} />
              </div>
              <div className="brand-text">
                <span className="brand-name">Servio</span>
                <span className="brand-tag">Gestão de restaurantes</span>
              </div>
            </header>

            <div className={`hero-body ${view === 'signup' ? 'hidden lg:block' : ''}`}>
              <h1 className="hero-title">
                Gerencie seu restaurante
                <br />
                <em>de qualquer lugar.</em>
              </h1>

              <p className="hero-sub">
                Com o <strong>Servio</strong>, você controla comandas, vendas e equipe em tempo real.
                Mais agilidade, menos erros, mais resultados.
              </p>

              <ul className="hero-list">
                <li>
                  <span className="dot" /> Toda a equipe sincronizada em tempo real
                </li>
                <li>
                  <span className="dot" /> Relatórios de vendas
                </li>
                <li>
                  <span className="dot" /> Controle de equipe e permissões
                </li>
              </ul>
            </div>

          </section>

          {/* RIGHT / CARD */}
          <section className="servio-card-wrap">
            <div className={`servio-card ${(view === 'signup' || (view === 'login' && isEmployeeLogin)) ? '!p-4 sm:!p-5 sm:!px-6' : '!p-5 sm:!p-6 sm:!px-8'} relative`}>
              
              {view === 'signup' && (
                <button
                  type="button"
                  onClick={() => {
                    setViewState('login');
                    setIsEmployeeLogin(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="absolute top-4 left-4 p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-all"
                  title="Voltar para login"
                >
                  <ArrowLeft size={18} />
                </button>
              )}


              <div className={`card-head mb-4 ${view === 'signup' ? '!mb-3' : ''}`}>
                {view !== 'signup' && (
                  <div className="card-mark" aria-hidden="true">
                    <ChefHat size={22} strokeWidth={2.4} />
                  </div>
                )}
                <h2 className="card-title">
                  {view === 'login' && 'Bem-vindo(a)!'}
                  {view === 'signup' && 'Crie sua conta'}
                  {view === 'forgot' && 'Recuperar senha'}
                  {view === 'reset' && 'Nova senha'}
                  {view === 'confirm_email' && 'Verifique seu e-mail'}
                </h2>
                <p className={`card-sub ${view === 'signup' ? 'text-[11px] mt-0.5' : ''}`}>
                  {view === 'login' && (isEmployeeLogin ? 'Acesse seu ambiente de trabalho' : 'Acesse sua central de comando')}
                  {view === 'signup' && 'Insira os dados para cadastrar seu restaurante'}
                  {view === 'forgot' && 'Insira seu email para recuperar'}
                  {view === 'reset' && 'Crie uma nova senha segura'}
                  {view === 'confirm_email' && 'Quase lá!'}
                </p>
              </div>


              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[13px] font-medium text-center animate-in fade-in zoom-in-95 duration-200">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[13px] font-medium text-center animate-in fade-in zoom-in-95 duration-200">
                  {success}
                </div>
              )}

              {view !== 'confirm_email' ? (

                <form onSubmit={handleSubmit} className={`card-form ${view === 'signup' ? '!gap-1.5' : (view === 'login' && isEmployeeLogin) ? '!gap-2' : '!gap-3'}`}>
                
                {/* 1. Sign Up Specific Fields */}
                {view === 'signup' && (
                  <>
                    <div className="group">
                      <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 group-focus-within:text-[#098043] transition-colors">
                        Nome do Restaurante
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                          <Store size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          disabled={isLoading}
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          placeholder="Ex: Los Pollos Hermanos"
                          className="w-full pl-9 pr-3 py-1.5 sm:py-1.5 text-[12px] bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-[13px] shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 group-focus-within:text-[#098043] transition-colors flex items-center gap-1 relative">
                        Identificador
                        <div className="group/tooltip relative flex items-center">
                          <HelpCircle size={14} className="text-zinc-400 hover:text-[#098043] cursor-help" />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-white text-zinc-900 border border-zinc-200 text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 hidden group-hover/tooltip:block font-normal normal-case tracking-normal text-center">
                            Seu identificador é único, escolhido por você, e é o que seus funcionários usam para acessar o sistema.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white drop-shadow-sm"></div>
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                          <AtSign size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          disabled={isLoading}
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="Ex: pizzaria-westeros"
                          className={`w-full pl-9 pr-3 py-1.5 sm:py-1.5 text-[12px] bg-white border ${identifierStatus === 'invalid' || identifierStatus === 'taken' ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : identifierStatus === 'available' ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500' : 'border-zinc-200 focus:border-[#098043] focus:ring-[#098043]'} rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:ring-1 disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-[13px] shadow-sm`}
                        />
                      </div>
                      <div className={`mt-1 text-[10px] font-medium leading-tight ${identifier.length > 0 ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                        {isCheckingIdentifier ? (
                          <span className="text-zinc-500 flex items-center gap-1"><span className="w-2.5 h-2.5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></span> Verificando...</span>
                        ) : identifierStatus === 'invalid' ? (
                          <span className="text-red-500">❌ Deve conter entre 4 e 20 caracteres.</span>
                        ) : identifierStatus === 'taken' ? (
                          <span className="text-red-500">❌ Já em uso</span>
                        ) : identifierStatus === 'available' ? (
                          <span className="text-emerald-500">✔ Disponível</span>
                        ) : (
                          <span>&nbsp;</span>
                        )}
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 group-focus-within:text-[#098043] transition-colors">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                          <User size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          disabled={isLoading}
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="Ex: Jon Snow"
                          className="w-full pl-9 pr-3 py-1.5 sm:py-1.5 text-[12px] bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-[13px] shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 group-focus-within:text-[#098043] transition-colors">
                        E-MAIL
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                          <Mail size={16} />
                        </div>
                        <input
                          type="email"
                          required
                          disabled={isLoading}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className={`w-full pl-9 pr-3 py-1.5 sm:py-1.5 text-[12px] bg-white border ${emailStatus === 'invalid' || emailStatus === 'taken' ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : emailStatus === 'available' ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500' : 'border-zinc-200 focus:border-[#098043] focus:ring-[#098043]'} rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:ring-1 disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-[13px] shadow-sm`}
                        />
                      </div>
                      <div className={`mt-1 text-[10px] font-medium leading-tight ${email.length > 0 ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                        {isCheckingEmail ? (
                          <span className="text-zinc-500 flex items-center gap-1"><span className="w-2.5 h-2.5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></span> Verificando...</span>
                        ) : emailStatus === 'invalid' ? (
                          <span className="text-red-500">❌ E-mail inválido</span>
                        ) : emailStatus === 'taken' ? (
                          <span className="text-red-500">❌ E-mail já cadastrado</span>
                        ) : emailStatus === 'available' ? (
                          <span className="text-emerald-500">✔ E-mail disponível</span>
                        ) : (
                          <span>&nbsp;</span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Identifier Field (For Employee Login) */}
                {view === 'login' && isEmployeeLogin && (
                  <div className="group">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 group-focus-within:text-[#098043] transition-colors">
                      Identificador do restaurante
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <AtSign size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        disabled={isLoading}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="Ex: pizzaria-westeros"
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-sm shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Employee Username Field */}
                {view === 'login' && isEmployeeLogin && (
                  <div className="group">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 group-focus-within:text-[#098043] transition-colors">
                      USUÁRIO
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        disabled={isLoading}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Nome de usuário"
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-sm shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Email Field (For Login, SignUp, and Forgot view) */}
                {view !== 'reset' && view !== 'signup' && (!isEmployeeLogin || view !== 'login') && (
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
                    <div className={`flex justify-between items-center ${view === 'signup' ? 'mb-1.5' : 'mb-2'}`}>
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
                      <div className={`absolute inset-y-0 left-0 flex items-center pointer-events-none text-zinc-400 ${view === 'signup' ? 'pl-3' : 'pl-4'}`}>
                        <Lock size={view === 'signup' ? 16 : 18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={isLoading}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={view === 'reset' ? 'Nova senha' : 'Sua senha'}
                        className={`w-full bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] disabled:bg-zinc-50 disabled:text-zinc-500 transition-all shadow-sm ${view === 'signup' ? 'pl-9 pr-10 py-1.5 sm:py-1.5 text-[12px]' : 'pl-11 pr-12 py-3.5 text-sm'}`}
                      />
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute inset-y-0 right-0 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors ${view === 'signup' ? 'pr-3' : 'pr-4'}`}
                      >
                        {showPassword ? <EyeOff size={view === 'signup' ? 16 : 18} /> : <Eye size={view === 'signup' ? 16 : 18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Password Strength Indicators (SignUp & Reset views only) */}
                {/* 4. Password Strength Indicators (SignUp & Reset views only) */}
                {(view === 'signup' || view === 'reset') && (
                  <div className="space-y-1 h-6">
                    {password && (
                      <>
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                          <div className="h-1 flex-1 bg-zinc-100 rounded-full overflow-hidden mr-3">
                            <div 
                              className={`h-full ${strength.color} transition-all duration-300`} 
                              style={{ width: `${(strengthPoints / 5) * 100}%` }}
                            />
                          </div>
                          <span className={`uppercase ${strength.textClass}`}>{strength.label}</span>
                        </div>
                        <div className="text-[10px] text-red-500 font-medium leading-none">
                          {!hasLength ? 'Mínimo 8 caracteres.' :
                           !hasNumber ? 'Deve conter pelo menos 1 número.' :
                           !hasUpper ? 'Deve conter 1 letra maiúscula.' :
                           !hasLower ? 'Deve conter 1 letra minúscula.' :
                           !hasSpecial ? 'Deve conter 1 caractere especial.' : ''}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {view === 'signup' && (
                  <>
                    <div className="group">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 group-focus-within:text-[#098043] transition-colors">
                        Confirmar senha
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                          <Lock size={16} />
                        </div>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          disabled={isLoading}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirmar sua senha"
                          className={`w-full pl-9 pr-10 py-1.5 sm:py-1.5 text-[12px] bg-white border ${(confirmPassword.length > 0 && confirmPassword !== password) || (hasAttemptedSubmit && confirmPassword !== password) ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-zinc-200 focus:border-[#098043] focus:ring-[#098043]'} rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:ring-1 disabled:bg-zinc-50 disabled:text-zinc-500 transition-all text-[13px] shadow-sm`}
                        />
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    {((confirmPassword.length > 0 && confirmPassword !== password) || (hasAttemptedSubmit && confirmPassword !== password)) && (
                      <div className="mt-1">
                        <span className="text-[10px] text-red-500 font-medium leading-none">As senhas não coincidem.</span>
                      </div>
                    )}

                    <div className="flex flex-col mt-2">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={agreedToTerms}
                          onChange={(e) => { setAgreedToTerms(e.target.checked); if (hasAttemptedSubmit) setHasAttemptedSubmit(false); }}
                          className="mt-0.5 rounded border-zinc-300 text-[#098043] focus:ring-[#098043]"
                        />
                        <label htmlFor="terms" className="text-[11px] text-zinc-600 leading-tight">
                          Ao criar conta, concordo com os <a href="#" className="font-semibold text-zinc-800 hover:underline">Termos de uso</a> e <a href="#" className="font-semibold text-zinc-800 hover:underline">Política de privacidade</a>
                        </label>
                      </div>
                      {(hasAttemptedSubmit && !agreedToTerms) && (
                        <div className="pl-5 mt-0.5">
                          <span className="text-[10px] text-red-500 font-medium leading-none">Você precisa concordar com os Termos.</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 5. Cooldown Lock Info */}
                {view === 'login' && cooldownSeconds > 0 && (
                  <div className="p-3 bg-sky-50 text-sky-800 text-[11px] rounded-lg border border-sky-100 flex items-center gap-2">
                    <span className="animate-pulse w-2 h-2 bg-sky-600 rounded-full" />
                    <span>Bloqueado temporariamente por excesso de tentativas. Aguarde {cooldownSeconds}s.</span>
                  </div>
                )}

                {/* 6. Submit Button with Spinner */}
                <button
                  type="submit"
                  disabled={isLoading || (view === 'login' && cooldownSeconds > 0) || ((view === 'signup' || view === 'reset') && !isPasswordValid) || (view === 'signup' && identifierStatus !== 'available') || (view === 'signup' && emailStatus !== 'available')}
                  className={`hover-shine relative w-full bg-[#098043] hover:bg-[#076635] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-300 shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${view === "signup" ? "mt-2 py-2.5 text-[13.5px]" : "mt-3 py-3.5 text-sm"}`}
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-white">
                        {view === 'login' && 'Entrar'}
                        {view === 'signup' && 'Cadastrar'}
                        {view === 'forgot' && 'Enviar link de recuperação'}
                        {view === 'reset' && 'Redefinir e Salvar'}
                      </span>
                      {view === 'login' && <ArrowRight size={18} className="absolute right-4 text-white" />}
                    </>
                  )}
                </button>

                {view === 'login' && (
                  <div className="mt-5">
                    <div className="relative flex items-center py-2 mb-2">
                      <div className="flex-grow border-t border-zinc-200"></div>
                      <span className="flex-shrink-0 mx-4 text-[10px] uppercase font-bold text-zinc-400 bg-white px-2">OU</span>
                      <div className="flex-grow border-t border-zinc-200"></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmployeeLogin(!isEmployeeLogin);
                        setError(null);
                        setSuccess(null);
                      }}
                      className="w-full bg-white border border-[#098043] text-[#098043] hover:bg-emerald-50 font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer py-3 text-sm shadow-sm active:scale-[0.98]"
                    >
                      <User size={18} />
                      {isEmployeeLogin ? 'Entrar como Administrador' : 'Entrar como Funcionário'}
                    </button>
                  </div>
                )}
              </form>
              ) : (
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
              <div className={`border-t border-zinc-100 text-center flex flex-col gap-3 ${view === 'signup' ? 'mt-2 pt-2' : 'mt-5 pt-5'}`}>
                {(view === 'login' || view === 'signup') && (
                  <button
                    disabled={isLoading}
                    onClick={() => {
                      setError(null);
                      setSuccess(null);
                      setViewState(view === 'login' ? 'signup' : 'login');
                      setIsEmployeeLogin(false);
                      setHasAttemptedSubmit(false);
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
                )}

                {view === 'forgot' && (
                  <button
                    disabled={isLoading}
                    onClick={() => { setViewState('login'); setError(null); setSuccess(null); }}
                    className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      <strong className="text-[#098043] font-bold">Voltar para Login</strong>
                    </span>
                  </button>
                )}
              </div>
            )}
          
            </div>

            <p className="copyright">© {new Date().getFullYear()} Servio — Todos os direitos reservados.</p>
          </section>
        </div>
      </main>
    </>
  );
}
