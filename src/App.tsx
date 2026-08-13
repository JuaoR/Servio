import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Settings } from 'lucide-react';
import { Comanda } from './types';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useRestaurantData } from './hooks/useRestaurantData';
import { useCaixa } from './hooks/useCaixa';
import { useComandas } from './hooks/useComandas';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Comandas from './components/Comandas';
import Caixa from './components/Caixa';
import CaixaAbertura from './components/CaixaAbertura';
import CaixaFechamento from './components/CaixaFechamento';
import CaixaSangriaModal from './components/CaixaSangriaModal';
import Produtos from './components/Produtos';
import Categorias from './components/Categorias';
import Historico from './components/Historico';
import Funcionarios from './components/Funcionarios';
import Configuracoes from './components/Configuracoes';
import ComandaModal from './components/ComandaModal';
import PaymentModal from './components/PaymentModal';

// Icons
import {
  ChefHat,
  LayoutDashboard,
  ClipboardList,
  Wallet,
  UtensilsCrossed,
  Tags,
  Users,
  History,
  RefreshCw,
  Clock,
  LogOut,
  Menu,
  X,
  Store,
  BarChart2
} from 'lucide-react';

export default function App() {
  const {
    isLoggedIn,
    isRecoveryMode,
    setIsRecoveryMode,
    restaurantId,
    identifier,
    setIdentifier,
    rname,
    setRname,
    ownerName,
    setOwnerName,
    logoUrl,
    handleLoginSuccess,
    handleLogout
  } = useAuth();

  const {
    categories,
    products,
    history,
    setHistory,
    funcionarios,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleCreateCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleCreateFuncionario,
    handleUpdateFuncionario,
    handleDeleteFuncionario,
    clearHistory
  } = useRestaurantData(restaurantId);

  const {
    caixaAtiva,
    caixaSessoes,
    movimentacoesCaixa,
    setMovimentacoesCaixa,
    fechamentosCaixa,
    handleAbrirCaixaSubmit,
    handleFecharCaixaSubmit,
    handleSangriaOuSuprimentoSubmit
  } = useCaixa(restaurantId, ownerName);

  const {
    comandas,
    handleMetaUpdate,
    handleItemsUpdate,
    handleOpenComanda,
    handleConfirmPayment,
    handleCloseEmptyComanda
  } = useComandas(restaurantId, ownerName, caixaAtiva, setMovimentacoesCaixa, setHistory);

  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const isDarkNow = document.documentElement.classList.toggle('dark');
    setIsDark(isDarkNow);
    localStorage.setItem('servio_theme', isDarkNow ? 'dark' : 'light');
  };

  // Modals state
  const [activeComandaId, setActiveComandaId] = useState<number | null>(null);
  const [showPaymentId, setShowPaymentId] = useState<number | null>(null);

  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false);
  const [modalSangriaTipo, setModalSangriaTipo] = useState<'sangria' | 'suprimento' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('servio_theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Keep digital clock updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeComandasCount = (Object.values(comandas) as Comanda[]).filter(c => c.status === 'aberta').length;

  // Auth gate
  if (!isLoggedIn || isRecoveryMode) {
    return (
      <Login 
        onLogin={handleLoginSuccess} 
        isRecoveryMode={isRecoveryMode}
        onRecoveryComplete={() => {
          setIsRecoveryMode(false);
          handleLogout();
        }}
      />
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            comandas={comandas}
            history={history}
            rname={rname}
            ownerName={ownerName}
            onNavigate={setCurrentView}
            onOpenComanda={setActiveComandaId}
          />
        );
      case 'comandas':
        return (
          <Comandas
            comandas={comandas}
            onOpenComanda={setActiveComandaId}
          />
        );
      case 'caixa':
        return (
          <Caixa
            caixaAtiva={caixaAtiva}
            sessoes={caixaSessoes}
            movimentacoes={movimentacoesCaixa}
            fechamentos={fechamentosCaixa}
            operador={ownerName || 'Admin'}
            onAbrirCaixa={() => setModalAbrirCaixa(true)}
            onFecharCaixa={() => setModalFecharCaixa(true)}
            onSangria={() => setModalSangriaTipo('sangria')}
            onSuprimento={() => setModalSangriaTipo('suprimento')}
          />
        );
      case 'produtos':
        return (
          <Produtos
            products={products}
            categories={categories}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        );
      case 'categorias':
        return (
          <Categorias
            categories={categories}
            products={products}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case 'historico':
        return (
          <Historico
            history={history}
            categories={categories}
            products={products}
            funcionarios={funcionarios || []}
            onClearHistory={clearHistory}
          />
        );
      case 'funcionarios':
        return (
          <Funcionarios
            funcionarios={funcionarios || []}
            history={history}
            restaurantId={restaurantId}
            identifier={identifier}
            onCreateFuncionario={handleCreateFuncionario}
            onUpdateFuncionario={handleUpdateFuncionario}
            onDeleteFuncionario={handleDeleteFuncionario}
          />
        );
      case 'relatorios':
        return <div className="p-4"></div>;
      case 'configuracoes':
        return <Configuracoes restaurantId={restaurantId} identifier={identifier} onUpdateIdentifier={setIdentifier} rname={rname} onUpdateRname={setRname} ownerName={ownerName} onUpdateOwnerName={setOwnerName} isDark={isDark} toggleTheme={toggleTheme} onLogout={handleLogout} onClearLocalData={() => {}} />;
      default:
        return <div className="text-center py-12">View não implementada.</div>;
    }
  };

  const VIEW_TITLES: Record<string, string> = {
    dashboard: 'Dashboard',
    comandas: 'Comandas',
    caixa: 'Caixa / PDV',
    produtos: 'Produtos',
    categorias: 'Categorias',
    funcionarios: 'Funcionários',
    historico: 'Histórico',
    configuracoes: 'Configurações'
  };
  // Navegação mobile: quais views ficam na bottom nav
  const BOTTOM_NAV_VIEWS = ['dashboard', 'comandas', 'caixa', 'produtos', 'historico'];
  const isMoreActive = !BOTTOM_NAV_VIEWS.includes(currentView);

  return (
    <div className="h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex flex-col overflow-hidden relative">
      {/* Dynamic Restaurant Chalkboard Background Texture */}
      <div 
        className="absolute inset-0 bg-[url('/src/assets/images/restaurant_light_bg_1783448355942.jpg')] bg-cover bg-center bg-no-repeat opacity-[0.07] pointer-events-none mix-blend-overlay z-0"
      />
      <div className="h-2 w-full bg-[#f1f5f9] shrink-0 z-10" />
      <div className="flex-1 flex overflow-hidden z-10">
      {/* SIDEBAR - Desktop */}
      <aside className="hidden md:flex w-56 bg-[var(--bg-card)] border-r border-[var(--border-color)] flex-col justify-between shrink-0">
        <div>
          {/* Logo container */}
          <div className="pl-[20px] pt-[5px] pb-[10px] pr-[10px] border-b border-[var(--border-color)] bg-[var(--bg-panel)] flex items-center gap-3">
            <img src={logoUrl || "/images/logo.png"} alt="Servio Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-serif tracking-tight text-sky-600">Servio</span>
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentView('comandas')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'comandas'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={15} />
                <span>Comandas</span>
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                activeComandasCount > 0 ? 'bg-emerald-500 text-black' : 'bg-[#30363D] text-[var(--text-muted)]'
              }`}>
                {activeComandasCount}
              </span>
            </button>

            <button
              onClick={() => setCurrentView('caixa')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'caixa'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wallet size={15} />
                <span>Caixa</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                caixaAtiva ? 'bg-emerald-500 text-black' : 'bg-red-500/20 text-red-400'
              }`}>
                {caixaAtiva ? 'ABERTO' : 'FECHADO'}
              </span>
            </button>

            <div className="h-4" />

            <button
              onClick={() => setCurrentView('produtos')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'produtos'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <UtensilsCrossed size={15} />
              <span>Produtos</span>
            </button>

            <button
              onClick={() => setCurrentView('categorias')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'categorias'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Tags size={15} />
              <span>Categorias</span>
            </button>

            <button
              onClick={() => setCurrentView('funcionarios')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'funcionarios'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Users size={15} />
              <span>Funcionários</span>
            </button>

            <div className="h-4" />

            <button
              onClick={() => setCurrentView('historico')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'historico'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <History size={15} />
              <span>Histórico de Vendas</span>
            </button>

            <button
              onClick={() => setCurrentView('relatorios')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'relatorios'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <BarChart2 size={15} />
              <span>Relatórios</span>
            </button>

            <button
              onClick={() => setCurrentView('configuracoes')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'configuracoes'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Settings size={15} />
              <span>Configurações</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[var(--border-color)] space-y-3 bg-[var(--bg-panel)]">
          {/* Restaurant Name editing inline */}
          <div className="flex items-center gap-1.5 p-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg">
            <Store size={14} className="text-sky-500 shrink-0" />
            <input
              type="text"
              value={rname}
              onChange={(e) => setRname(e.target.value)}
              placeholder="Nome do restaurante..."
              className="bg-transparent text-[13px] text-[var(--text-main)] font-medium outline-none border-none w-full placeholder-[#484F58] focus:ring-0"
            />
            <button
              onClick={() => setCurrentView('configuracoes')}
              className="p-[7px] text-base rounded-lg bg-sky-500/10 hover:bg-sky-500 text-white cursor-pointer ml-1.5 transition-all shadow-sm active:scale-95 shrink-0"
              title="Configurações"
            >
              <Settings size={18} className="text-black" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>v1.0 · Servio</span>
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
              title="Sair"
            >
              <LogOut size={13} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE MENU / DRAWER OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] p-5 flex flex-col justify-between h-full z-10"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <img src={logoUrl || "/images/logo.png"} alt="Servio Logo" className="w-10 h-10 object-contain" />
                    <span className="text-xl font-serif tracking-tight text-sky-600">Servio</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'dashboard' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <LayoutDashboard size={15} />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('comandas'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'comandas' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList size={15} />
                      <span>Comandas</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#30363D]">
                      {activeComandasCount}
                    </span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('caixa'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'caixa' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <Wallet size={15} />
                    <span>Caixa</span>
                  </button>

                  <div className="h-3" />

                  <button
                    onClick={() => { setCurrentView('produtos'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'produtos' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <UtensilsCrossed size={15} />
                    <span>Produtos</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('categorias'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'categorias' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <Tags size={15} />
                    <span>Categorias</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('funcionarios'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'funcionarios' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <Users size={15} />
                    <span>Funcionários</span>
                  </button>

                  <div className="h-3" />

                  <button
                    onClick={() => { setCurrentView('historico'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'historico' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <History size={15} />
                    <span>Histórico de Vendas</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('relatorios'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'relatorios' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <BarChart2 size={15} />
                    <span>Relatórios</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('configuracoes'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'configuracoes' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <Settings size={15} />
                    <span>Configurações</span>
                  </button>
                </nav>
              </div>

              <div className="p-4 border-t border-[var(--border-color)] space-y-3 bg-[var(--bg-panel)] rounded-lg">
                <div className="flex items-center gap-1.5 p-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-md">
                  <Store size={13} className="text-sky-500 shrink-0" />
                  <input
                    type="text"
                    value={rname}
                    onChange={(e) => setRname(e.target.value)}
                    className="bg-transparent text-[11px] text-[var(--text-main)] outline-none border-none w-full min-w-0"
                  />
                  <button
                    onClick={() => { setCurrentView('configuracoes'); setMobileMenuOpen(false); }}
                    className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-500 hover:text-white cursor-pointer ml-1.5 shrink-0 transition-all shadow-sm active:scale-95"
                    title="Configurações"
                  >
                    <Settings size={18} />
                  </button>
                </div>
                <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)]">
                  <span>v1.0 · Servio</span>
                  <button onClick={handleLogout} className="text-red-400 font-bold flex items-center gap-1 cursor-pointer"><LogOut size={12}/>Sair</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar header */}
        <header className="h-14 mobile-header bg-[var(--bg-panel)] border-b border-[var(--border-color)] flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger menu — só desktop (md+), no mobile usamos bottom nav */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="hidden md:block p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <Menu size={20} />
            </button>
            {/* Logo mobile */}
            <img src={logoUrl || "/images/logo.png"} alt="Servio" className="md:hidden w-7 h-7 object-contain" />
            <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight">
              {rname || 'Servio Gourmet'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              title="Alternar Tema"
            >
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            {/* Clock display — oculto no mobile */}
            <div className="mobile-hide flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs font-mono text-[var(--text-main)]">
              <Clock size={13} className="text-sky-500" />
              <span>{currentTime}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Content scroll viewport */}
        <main className="flex-1 overflow-y-auto pt-[24px] pr-[50px] pl-0 ml-[15px] pb-6 mobile-main-content scrollbar-thin">
          {renderCurrentView()}
        </main>
      </div>

      {/* ========== BOTTOM NAVIGATION (mobile only) ========== */}
      <nav className="mobile-bottom-nav md:hidden" aria-label="Navegação principal">
        {/* Dashboard */}
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`mobile-bottom-nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>

        {/* Comandas */}
        <button
          onClick={() => setCurrentView('comandas')}
          className={`mobile-bottom-nav-btn ${currentView === 'comandas' ? 'active' : ''}`}
        >
          <ClipboardList size={20} />
          <span>Comandas</span>
          {activeComandasCount > 0 && (
            <span className="mobile-bottom-nav-badge">{activeComandasCount}</span>
          )}
        </button>

        {/* Produtos */}
        <button
          onClick={() => setCurrentView('produtos')}
          className={`mobile-bottom-nav-btn ${currentView === 'produtos' ? 'active' : ''}`}
        >
          <UtensilsCrossed size={20} />
          <span>Produtos</span>
        </button>

        {/* Histórico */}
        <button
          onClick={() => setCurrentView('historico')}
          className={`mobile-bottom-nav-btn ${currentView === 'historico' ? 'active' : ''}`}
        >
          <History size={20} />
          <span>Histórico</span>
        </button>

        {/* Mais */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className={`mobile-bottom-nav-btn ${isMoreActive ? 'active' : ''}`}
        >
          <Menu size={20} />
          <span>Mais</span>
        </button>
      </nav>

      {/* ========== MORE SHEET (mobile only) ========== */}
      <AnimatePresence>
        {moreSheetOpen && (
          <div className="mobile-more-sheet md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mobile-more-sheet-backdrop"
              onClick={() => setMoreSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="mobile-more-sheet-content"
            >
              <div className="mobile-more-sheet-handle" />

              <div className="flex items-center gap-3 px-2 pb-3 mb-2 border-b border-[var(--border-color)]">
                <img src={logoUrl || "/images/logo.png"} alt="Servio" className="w-8 h-8 object-contain" />
                <div>
                  <p className="text-sm font-bold text-[var(--text-main)] leading-none">{rname}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Servio v1.0</p>
                </div>
              </div>

              <button
                onClick={() => { setCurrentView('categorias'); setMoreSheetOpen(false); }}
                className={`mobile-more-sheet-btn ${currentView === 'categorias' ? 'active' : ''}`}
              >
                <span className="icon"><Tags size={18} /></span>
                <span>Categorias</span>
              </button>

              <button
                onClick={() => { setCurrentView('funcionarios'); setMoreSheetOpen(false); }}
                className={`mobile-more-sheet-btn ${currentView === 'funcionarios' ? 'active' : ''}`}
              >
                <span className="icon"><Users size={18} /></span>
                <span>Funcionários</span>
              </button>

              <button
                onClick={() => { setCurrentView('configuracoes'); setMoreSheetOpen(false); }}
                className={`mobile-more-sheet-btn ${currentView === 'configuracoes' ? 'active' : ''}`}
              >
                <span className="icon"><Settings size={18} /></span>
                <span>Configurações</span>
              </button>

              <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex items-center justify-between px-2">
                <span className="text-xs text-[var(--text-muted)]">Tema</span>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-hover)] rounded-lg text-sm font-semibold text-[var(--text-main)] cursor-pointer"
                >
                  {isDark ? <Moon size={15} /> : <Sun size={15} />}
                  <span>{isDark ? 'Escuro' : 'Claro'}</span>
                </button>
              </div>

              <button
                onClick={() => { handleLogout(); setMoreSheetOpen(false); }}
                className="mobile-more-sheet-btn mt-1"
                style={{ color: '#f87171' }}
              >
                <span className="icon" style={{ color: '#f87171' }}><LogOut size={18} /></span>
                <span>Sair da conta</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CORE OVERLAY MODALS DISPLAY */}
      <AnimatePresence>
        {activeComandaId !== null && (
          <ComandaModal
            id={activeComandaId}
            comanda={comandas[activeComandaId]}
            products={products}
            categories={categories}
            onClose={() => {
              // Auto close if empty
              if (comandas[activeComandaId]?.items.length === 0) {
                handleCloseEmptyComanda(activeComandaId);
              }
              setActiveComandaId(null);
            }}
            onUpdateMeta={handleMetaUpdate}
            onUpdateItems={handleItemsUpdate}
            onOpenComanda={handleOpenComanda}
            onShowPayment={setShowPaymentId}
            rname={rname}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentId !== null && (
          <PaymentModal
            id={showPaymentId}
            comanda={comandas[showPaymentId]}
            onClose={() => setShowPaymentId(null)}
            onConfirmPayment={handleConfirmPayment}
          />
        )}
      </AnimatePresence>

      {/* CAIXA OVERLAY MODALS */}
      <AnimatePresence>
        {modalAbrirCaixa && (
          <CaixaAbertura
            operador={ownerName || 'Admin'}
            onAbrir={handleAbrirCaixaSubmit}
            onClose={() => setModalAbrirCaixa(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalFecharCaixa && caixaAtiva && (
          <CaixaFechamento
            sessao={caixaAtiva}
            movimentacoes={movimentacoesCaixa}
            operador={ownerName || 'Admin'}
            onFechar={handleFecharCaixaSubmit}
            onClose={() => setModalFecharCaixa(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalSangriaTipo && (
          <CaixaSangriaModal
            tipo={modalSangriaTipo}
            operador={ownerName || 'Admin'}
            onConfirm={handleSangriaOuSuprimentoSubmit}
            onClose={() => setModalSangriaTipo(null)}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
