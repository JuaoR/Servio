import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChefHat, Mail, Lock, ArrowRight, ClipboardList, Package, Sparkles, LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(); // Bypasses auth checks per user request, login instantly!
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
            {/* Elegant fading green gradient for the ribbon */}
            <linearGradient id="greenRibbonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#098043" stopOpacity="1" />
              <stop offset="75%" stopColor="#098043" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#098043" stopOpacity="0.35" />
            </linearGradient>
            {/* Elegant soft shadow/glow gradient */}
            <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#098043" stopOpacity="0.15" />
              <stop offset="75%" stopColor="#098043" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#098043" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          
          {/* Subtle Ambient Soft Glow behind the ribbon, also thicker at bottom */}
          <path 
            d="M 52 0 C 27 300, 80 700, 14 1080 L 106 1080 C 130 700, 53 300, 68 0 Z" 
            fill="url(#glowGrad)"
          />
          
          {/* Main Rich Green Ribbon (starts around 6px wide at top, expands to around 44px wide at bottom) */}
          <path 
            d="M 57 0 C 32 300, 85 700, 34 1080 L 78 1080 C 112 700, 48 300, 63 0 Z" 
            fill="url(#greenRibbonGrad)"
          />
        </svg>
      </div>

      {/* Centralized container wrapper to keep elements beautifully composed and closer to the center */}
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
              {/* Pill Badge */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#E8F5E9] text-[#098043] text-xs font-bold tracking-wide uppercase mb-8">
                Sistema completo para restaurantes
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#0F172A] leading-[1.12] mb-6">
                O controle do seu <br />
                restaurante na <br />
                <span className="text-[#098043]">palma da sua mão.</span>
              </h1>

              {/* Paragraph Description */}
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

          {/* Footer info matching left layout spacing */}
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider pt-6 mt-8 lg:mt-0">
            <span>&copy; {new Date().getFullYear()} Servio — Todos os direitos reservados.</span>
          </div>
        </div>

        {/* RIGHT PANEL - Login Form Card (Col-span 5) */}
        <div className="lg:col-span-5 flex items-center justify-center p-6 md:p-12 lg:p-10 xl:p-12 z-10 relative">
          {/* Decorative background visual shape behind the card */}
          <div className="absolute top-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none -z-10" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-[550px] bg-white border border-zinc-200 rounded-xl p-10 md:p-12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)]"
          >
            {/* Top center round icon inside card */}
            <div className="mb-6 text-center">
              <div className="inline-flex w-16 h-16 rounded-full bg-[#E8F5E9] items-center justify-center shadow-inner">
                <ChefHat className="text-[#098043]" size={28} />
              </div>
              <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight mt-4">
                {isLoginView ? 'Bem-vindo de volta!' : 'Crie sua conta grátis'}
              </h2>
              <p className="text-zinc-500 text-sm mt-1">
                {isLoginView ? 'Acesse sua central de comando' : 'Insira os dados para se cadastrar no sistema.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLoginView && (
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
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Pizzaria do Zé"
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] transition-all text-sm shadow-sm"
                    />
                  </div>
                </div>
              )}

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] transition-all text-sm shadow-sm"
                  />
                </div>
              </div>

              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider group-focus-within:text-[#098043] transition-colors">
                    SENHA
                  </label>
                  {isLoginView && (
                    <span className="text-xs text-[#098043] hover:underline cursor-pointer font-semibold transition-colors">
                      Esqueceu a senha?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#098043] focus:ring-1 focus:ring-[#098043] transition-all text-sm shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-6 bg-[#098043] hover:bg-[#076635] text-white font-bold py-4 rounded-lg transition-all duration-300 shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <LogIn size={16} />
                <span>{isLoginView ? 'Entrar' : 'Cadastrar'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Footer of the card */}
            <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
              <button
                onClick={() => setIsLoginView(!isLoginView)}
                className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                {isLoginView ? (
                  <span>
                    Não tem uma conta? <strong className="text-[#098043] font-bold">Cadastre-se</strong>
                  </span>
                ) : (
                  <span>
                    Já possui uma conta? <strong className="text-[#098043] font-bold">Faça login</strong>
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
}

