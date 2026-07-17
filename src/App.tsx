import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemState, Comanda, Categoria, Produto, ItemPedido, HistoricoItem, Garcom } from './types';
import { supabase } from './supabaseClient';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Comandas from './components/Comandas';
import Produtos from './components/Produtos';
import Categorias from './components/Categorias';
import Historico from './components/Historico';
import Funcionarios from './components/Funcionarios';
import ComandaModal from './components/ComandaModal';
import PaymentModal from './components/PaymentModal';

// Icons
import {
  ChefHat,
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Tags,
  Users,
  History,
  RefreshCw,
  Clock,
  LogOut,
  Menu,
  X,
  Store
} from 'lucide-react';

const STORAGE_KEY = 'servio_state_v1';
const LEGACY_STORAGE_KEY = 'restauros_v3';

const DEF_CATS: Categoria[] = [
  { id: 'c1', name: 'Bebidas', color: '#3B82F6', icon: 'CupSoda' },
  { id: 'c2', name: 'Entradas', color: '#F59E0B', icon: 'Salad' },
  { id: 'c3', name: 'Pratos Principais', color: '#EF4444', icon: 'Utensils' },
  { id: 'c4', name: 'Sobremesas', color: '#EC4899', icon: 'Cake' },
  { id: 'c5', name: 'Porções', color: '#8B5CF6', icon: 'Pizza' },
  { id: 'c6', name: 'Drinks & Coquetéis', color: '#10B981', icon: 'Beer' },
];

const DEF_PRODS: Produto[] = [];

const DEF_GARCONS: Funcionario[] = [];


function makeEmptyComandas(): Record<number, Comanda> {
  const c: Record<number, Comanda> = {};
  for (let i = 1; i <= 100; i++) {
    c[i] = {
      id: i,
      status: 'livre',
      items: [],
      mesa: '',
      garcom: '',
      obs: '',
      openedAt: null,
      discount: 0,
    };
  }
  return c;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  
  // Modals state
  const [activeComandaId, setActiveComandaId] = useState<number | null>(null);
  const [showPaymentId, setShowPaymentId] = useState<number | null>(null);

  // Core system state
  const [state, setState] = useState<SystemState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all 100 comandas exist (range 1 to 100)
        const comandas = parsed.comandas || {};
        const cleanedComandas: Record<number, Comanda> = {};
        for (let i = 1; i <= 100; i++) {
          if (comandas[i]) {
            cleanedComandas[i] = {
              ...comandas[i],
              id: i
            };
          } else {
            cleanedComandas[i] = {
              id: i,
              status: 'livre',
              items: [],
              mesa: '',
              garcom: '',
              obs: '',
              openedAt: null,
              discount: 0,
            };
          }
        }
        return {
          categories: parsed.categories || DEF_CATS,
          products: parsed.products || DEF_PRODS,
          comandas: cleanedComandas,
          history: parsed.history || [],
          rname: parsed.rname || 'Restaurante Exemplo',
          funcionarios: parsed.funcionarios || [],
        };
      }
    } catch (e) {
      console.error('Error loading initial state', e);
    }

    return {
      categories: DEF_CATS,
      products: DEF_PRODS,
      comandas: makeEmptyComandas(),
      history: [],
      rname: 'Servio Gourmet',
      funcionarios: [],
    };
  });

  // Save state on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);


  useEffect(() => {
    // Modo escuro padrão se não houver preferência, mas o cliente pediu por padrão modo claro
    const saved = localStorage.getItem('servio_theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Supabase Auth listener
  useEffect(() => {
    // 1. Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        setIsLoggedIn(true);
      }
    });

    // 2. Ouvir mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setIsLoggedIn(true);
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }
      } else {
        setIsLoggedIn(false);
        setIsRecoveryMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar dados do restaurante após login
  useEffect(() => {
    if (isLoggedIn && session?.user) {
      const fetchRestaurant = async () => {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('restaurant_id, restaurants(name)')
            .eq('id', session.user.id)
            .single();
            
          if (profileData && !profileError) {
            const rName = (profileData as any).restaurants?.name;
            if (rName) {
              setState(prev => ({ ...prev, rname: rName }));
            }
          }
        } catch (e) {
          console.error('Erro ao obter restaurante:', e);
        }
      };

      fetchRestaurant();
    }
  }, [isLoggedIn, session]);

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

  // Handler helpers
  const handleMetaUpdate = (id: number, meta: { mesa: string; garcom: string; obs: string }) => {
    setState(prev => {
      const updatedComandas = { ...prev.comandas };
      updatedComandas[id] = {
        ...updatedComandas[id],
        ...meta
      };
      return { ...prev, comandas: updatedComandas };
    });
  };

  const handleItemsUpdate = (id: number, items: ItemPedido[], discount: number = 0) => {
    setState(prev => {
      const updatedComandas = { ...prev.comandas };
      if (items.length === 0) {
        updatedComandas[id] = {
          ...updatedComandas[id],
          items: [],
          discount: 0,
          status: 'livre',
          openedAt: null
        };
      } else {
        updatedComandas[id] = {
          ...updatedComandas[id],
          items,
          discount
        };
      }
      return { ...prev, comandas: updatedComandas };
    });
  };

  const handleOpenComanda = (id: number) => {
    setState(prev => {
      const updatedComandas = { ...prev.comandas };
      updatedComandas[id] = {
        ...updatedComandas[id],
        status: 'aberta',
        openedAt: Date.now()
      };
      return { ...prev, comandas: updatedComandas };
    });
  };

  const handleConfirmPayment = (id: number, method: string, received?: number) => {
    const comanda = state.comandas[id];
    if (!comanda || comanda.items.length === 0) return;

    const subTotal = comanda.items.reduce((s, it) => s + it.price * it.qty, 0);
    const totalVal = Math.max(0, subTotal - comanda.discount);

    const historyItem: HistoricoItem = {
      id: '_' + Math.random().toString(36).substring(2, 9),
      cmdId: id,
      mesa: comanda.mesa,
      garcom: comanda.garcom,
      obs: comanda.obs,
      items: comanda.items.map(it => ({ ...it })),
      subtotal: subTotal,
      discount: comanda.discount,
      total: totalVal,
      payMethod: method,
      openedAt: comanda.openedAt || Date.now(),
      closedAt: Date.now()
    };

    setState(prev => {
      const updatedComandas = { ...prev.comandas };
      // Reset comanda back to empty & free
      updatedComandas[id] = {
        id,
        status: 'livre',
        items: [],
        mesa: '',
        garcom: '',
        obs: '',
        openedAt: null,
        discount: 0
      };

      return {
        ...prev,
        comandas: updatedComandas,
        history: [...prev.history, historyItem]
      };
    });

    // Close checkout modals
    setShowPaymentId(null);
    setActiveComandaId(null);
  };

  // Products CRUD
  const handleCreateProduct = (p: Omit<Produto, 'id'>) => {
    const newProduct: Produto = {
      ...p,
      id: '_' + Math.random().toString(36).substring(2, 9),
    };
    setState(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));
  };

  const handleUpdateProduct = (id: string, updatedFields: Partial<Produto>) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, ...updatedFields } : p)
    }));
  };

  const handleDeleteProduct = (id: string) => {
    setState(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id)
    }));
  };

  // Categories CRUD
  const handleCreateCategory = (c: Omit<Categoria, 'id'>) => {
    const newCat: Categoria = {
      ...c,
      id: '_' + Math.random().toString(36).substring(2, 9),
    };
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCat]
    }));
  };

  const handleUpdateCategory = (id: string, updatedFields: Partial<Categoria>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === id ? { ...c, ...updatedFields } : c)
    }));
  };

  const handleDeleteCategory = (id: string) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id)
    }));
  };

  // Funcionarios CRUD
  const handleCreateGarcom = (g: Omit<Garcom, 'id'>) => {
    const newGarcom: Garcom = {
      ...g,
      id: '_' + Math.random().toString(36).substring(2, 9),
    };
    setState(prev => ({
      ...prev,
      funcionarios: [...(prev.funcionarios || []), newGarcom]
    }));
  };

  const handleUpdateGarcom = (id: string, updatedFields: Partial<Garcom>) => {
    setState(prev => ({
      ...prev,
      funcionarios: (prev.funcionarios || []).map(g => g.id === id ? { ...g, ...updatedFields } : g)
    }));
  };

  const handleDeleteGarcom = (id: string) => {
    setState(prev => ({
      ...prev,
      funcionarios: (prev.funcionarios || []).filter(g => g.id !== id)
    }));
  };

  // Reset entire state
  const handleResetAllData = () => {
    if (confirm('Atenção: isto apagará TODOS os produtos, comandas e relatórios históricos! Tem certeza que deseja resetar?')) {
      setState({
        categories: DEF_CATS,
        products: DEF_PRODS,
        comandas: makeEmptyComandas(),
        history: [],
        rname: 'Servio Gourmet',
        funcionarios: [],
      });
      setCurrentView('dashboard');
    }
  };

  const activeComandasCount = (Object.values(state.comandas) as Comanda[]).filter(c => c.status === 'aberta').length;

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setSession(null);
    setIsRecoveryMode(false);
  };

  // Auth gate
  if (!isLoggedIn || isRecoveryMode) {
    return (
      <Login 
        onLogin={handleLoginSuccess} 
        isRecoveryMode={isRecoveryMode}
        onRecoveryComplete={() => {
          setIsRecoveryMode(false);
          supabase.auth.signOut();
        }}
      />
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            comandas={state.comandas}
            history={state.history}
            rname={state.rname}
            onNavigate={setCurrentView}
            onOpenComanda={setActiveComandaId}
          />
        );
      case 'comandas':
        return (
          <Comandas
            comandas={state.comandas}
            onOpenComanda={setActiveComandaId}
          />
        );
      case 'produtos':
        return (
          <Produtos
            products={state.products}
            categories={state.categories}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        );
      case 'categorias':
        return (
          <Categorias
            categories={state.categories}
            products={state.products}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case 'historico':
        return (
          <Historico
            history={state.history}
            categories={state.categories}
            products={state.products}
            funcionarios={state.funcionarios || []}
            onClearHistory={() => setState(prev => ({ ...prev, history: [] }))}
          />
        );
      case 'funcionarios':
        return (
          <Funcionarios
            funcionarios={state.funcionarios || []}
            history={state.history}
            onCreateGarcom={handleCreateGarcom}
            onUpdateGarcom={handleUpdateGarcom}
            onDeleteGarcom={handleDeleteGarcom}
          />
        );
      default:
        return <div className="text-center py-12">View não implementada.</div>;
    }
  };

  const VIEW_TITLES: Record<string, string> = {
    dashboard: 'Painel Geral',
    comandas: 'Gestão de Comandas',
    produtos: 'Cardápio / Produtos',
    categorias: 'Categorias de Consumo',
    funcionarios: 'Funcionários',
    historico: 'Relatórios & Histórico'
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex flex-col overflow-hidden relative">
      {/* Dynamic Restaurant Chalkboard Background Texture */}
      <div 
        className="absolute inset-0 bg-[url('/src/assets/images/restaurant_light_bg_1783448355942.jpg')] bg-cover bg-center bg-no-repeat opacity-[0.07] pointer-events-none mix-blend-overlay z-0"
      />
      <div className="h-2 w-full bg-[#0F172A] shrink-0 z-10" />
      <div className="flex-1 flex overflow-hidden z-10">
      {/* SIDEBAR - Desktop */}
      <aside className="hidden md:flex w-56 bg-[var(--bg-card)] border-r border-[var(--border-color)] flex-col justify-between shrink-0">
        <div>
          {/* Logo container */}
          <div className="p-5 border-b border-zinc-300 bg-zinc-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-center shadow-lg">
              <ChefHat className="text-amber-500" size={16} />
            </div>
            <div>
              <span className="text-lg font-serif tracking-tight text-amber-600">Servio</span>
              <span className="block text-[8px] text-zinc-600 tracking-[0.15em] uppercase font-bold">Gestão</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1">
            <span className="block px-3 text-[10px] font-bold text-[#484F58] uppercase tracking-widest mb-2">Principal</span>
            
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-amber-500/10 text-amber-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentView('comandas')}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'comandas'
                  ? 'bg-amber-500/10 text-amber-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={15} />
                <span>Comandas</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeComandasCount > 0 ? 'bg-emerald-500 text-black' : 'bg-[#30363D] text-[var(--text-muted)]'
              }`}>
                {activeComandasCount}
              </span>
            </button>

            <span className="block px-3 pt-4 text-[10px] font-bold text-[#484F58] uppercase tracking-widest mb-2">Cadastros</span>

            <button
              onClick={() => setCurrentView('produtos')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'produtos'
                  ? 'bg-amber-500/10 text-amber-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <UtensilsCrossed size={15} />
              <span>Produtos</span>
            </button>

            <button
              onClick={() => setCurrentView('categorias')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'categorias'
                  ? 'bg-amber-500/10 text-amber-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Tags size={15} />
              <span>Categorias</span>
            </button>

            <button
              onClick={() => setCurrentView('funcionarios')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'funcionarios'
                  ? 'bg-amber-500/10 text-amber-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Users size={15} />
              <span>Garçons</span>
            </button>

            <span className="block px-3 pt-4 text-[10px] font-bold text-[#484F58] uppercase tracking-widest mb-2">Relatórios</span>

            <button
              onClick={() => setCurrentView('historico')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'historico'
                  ? 'bg-amber-500/10 text-amber-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <History size={15} />
              <span>Histórico Vendas</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[var(--border-color)] space-y-3 bg-[var(--bg-panel)]">
          {/* Restaurant Name editing inline */}
          <div className="flex items-center gap-1.5 p-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg">
            <Store size={14} className="text-amber-500 shrink-0" />
            <input
              type="text"
              value={state.rname}
              onChange={(e) => setState(prev => ({ ...prev, rname: e.target.value }))}
              placeholder="Nome do restaurante..."
              className="bg-transparent text-xs text-[var(--text-main)] font-medium outline-none border-none w-full placeholder-[#484F58] focus:ring-0"
            />
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
              initial={{ translateX: '-100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] p-5 flex flex-col justify-between h-full z-10"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                      <ChefHat className="text-[#0D1117]" size={18} />
                    </div>
                    <span className="text-lg font-black text-[#E8A200]">Servio</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'dashboard' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <LayoutDashboard size={15} />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('comandas'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'comandas' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[var(--text-muted)]'
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
                    onClick={() => { setCurrentView('produtos'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'produtos' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <UtensilsCrossed size={15} />
                    <span>Produtos</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('categorias'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'categorias' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <Tags size={15} />
                    <span>Categorias</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('funcionarios'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'funcionarios' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <Users size={15} />
                    <span>Garçons</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('historico'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'historico' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <History size={15} />
                    <span>Histórico Vendas</span>
                  </button>
                </nav>
              </div>

              <div className="p-4 border-t border-[var(--border-color)] space-y-3 bg-[var(--bg-panel)] rounded-lg">
                <div className="flex items-center gap-1.5 p-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-md">
                  <Store size={13} className="text-amber-500" />
                  <input
                    type="text"
                    value={state.rname}
                    onChange={(e) => setState(prev => ({ ...prev, rname: e.target.value }))}
                    className="bg-transparent text-[11px] text-[var(--text-main)] outline-none border-none w-full"
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)]">
                  <span>v1.0 · Servio</span>
                  <button onClick={handleLogout} className="text-red-400 font-bold cursor-pointer">Sair</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar header */}
        <header className="h-14 bg-zinc-200 border-b border-zinc-300 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xs font-bold text-zinc-800 tracking-widest uppercase">
              {VIEW_TITLES[currentView] || currentView}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock display */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 border border-zinc-300 rounded-lg text-xs font-mono text-zinc-700">
              <Clock size={13} className="text-amber-600" />
              <span>{currentTime}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Content scroll viewport */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {renderCurrentView()}
        </main>

        <footer className="h-10 bg-[#080808] border-t border-zinc-900 flex items-center justify-center text-[9px] text-zinc-600 tracking-[0.25em] shrink-0">
          Sistema Servio • 🟢 Conectado • Sincronizado
        </footer>
      </div>

      {/* CORE OVERLAY MODALS DISPLAY */}
      <AnimatePresence>
        {activeComandaId !== null && (
          <ComandaModal
            id={activeComandaId}
            comanda={state.comandas[activeComandaId]}
            products={state.products}
            categories={state.categories}
            onClose={() => {
              // Auto close if empty
              if (state.comandas[activeComandaId]?.items.length === 0) {
                setState(prev => {
                  const updatedComandas = { ...prev.comandas };
                  updatedComandas[activeComandaId] = {
                    ...updatedComandas[activeComandaId],
                    status: 'livre',
                    openedAt: null
                  };
                  return { ...prev, comandas: updatedComandas };
                });
              }
              setActiveComandaId(null);
            }}
            onUpdateMeta={handleMetaUpdate}
            onUpdateItems={handleItemsUpdate}
            onOpenComanda={handleOpenComanda}
            onShowPayment={setShowPaymentId}
            rname={state.rname}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentId !== null && (
          <PaymentModal
            id={showPaymentId}
            comanda={state.comandas[showPaymentId]}
            onClose={() => setShowPaymentId(null)}
            onConfirmPayment={handleConfirmPayment}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
