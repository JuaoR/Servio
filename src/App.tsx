import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemState, Comanda, Categoria, Produto, ItemPedido, HistoricoItem, Garcom } from './types';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Comandas from './components/Comandas';
import Produtos from './components/Produtos';
import Categorias from './components/Categorias';
import Historico from './components/Historico';
import Garcons from './components/Garcons';
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

const DEF_PRODS: Produto[] = [
  { id: 'p1', name: 'Refrigerante Lata', cid: 'c1', price: 6, avail: true },
  { id: 'p2', name: 'Suco Natural 300ml', cid: 'c1', price: 9, avail: true },
  { id: 'p3', name: 'Água Mineral 500ml', cid: 'c1', price: 4, avail: true },
  { id: 'p4', name: 'Cerveja Long Neck', cid: 'c1', price: 12, avail: true },
  { id: 'p5', name: 'Vinho Taça', cid: 'c1', price: 22, avail: true },
  { id: 'p6', name: 'Bruschetta ao Alho', cid: 'c2', price: 22, avail: true },
  { id: 'p7', name: 'Bolinho de Bacalhau (6un)', cid: 'c2', price: 28, avail: true },
  { id: 'p8', name: 'Tábua de Frios', cid: 'c2', price: 45, avail: true },
  { id: 'p9', name: 'Picanha Grelhada', cid: 'c3', price: 89, avail: true },
  { id: 'p10', name: 'Frango à Parmegiana', cid: 'c3', price: 52, avail: true },
  { id: 'p11', name: 'Massa Carbonara', cid: 'c3', price: 45, avail: true },
  { id: 'p12', name: 'Risoto de Camarão', cid: 'c3', price: 68, avail: true },
  { id: 'p13', name: 'Petit Gateau', cid: 'c4', price: 24, avail: true },
  { id: 'p14', name: 'Pudim de Leite', cid: 'c4', price: 14, avail: true },
  { id: 'p15', name: 'Porção Batata Frita', cid: 'c5', price: 32, avail: true },
  { id: 'p16', name: 'Porção Calabresa', cid: 'c5', price: 38, avail: true },
  { id: 'p17', name: 'Mojito', cid: 'c6', price: 28, avail: true },
  { id: 'p18', name: 'Caipirinha', cid: 'c6', price: 24, avail: true },
  { id: 'p19', name: 'Aperol Spritz', cid: 'c6', price: 32, avail: true },
];

const DEF_GARCONS: Garcom[] = [
  { id: 'g1', name: 'Ricardo Mendes', code: '10', phone: '(11) 98765-4321', email: 'ricardo@servio.com', active: true, commissionRate: 10 },
  { id: 'g2', name: 'Beatriz Oliveira', code: '12', phone: '(11) 91234-5678', email: 'beatriz@servio.com', active: true, commissionRate: 10 },
  { id: 'g3', name: 'Gustavo Farias', code: '15', phone: '(11) 93456-7890', email: 'gustavo@servio.com', active: true, commissionRate: 12 },
  { id: 'g4', name: 'Luciana Costa', code: '18', phone: '(11) 94567-8901', email: 'luciana@servio.com', active: true, commissionRate: 10 }
];


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
          garcons: parsed.garcons || DEF_GARCONS,
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
      garcons: DEF_GARCONS,
    };
  });

  // Save state on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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

  // Garcons CRUD
  const handleCreateGarcom = (g: Omit<Garcom, 'id'>) => {
    const newGarcom: Garcom = {
      ...g,
      id: '_' + Math.random().toString(36).substring(2, 9),
    };
    setState(prev => ({
      ...prev,
      garcons: [...(prev.garcons || []), newGarcom]
    }));
  };

  const handleUpdateGarcom = (id: string, updatedFields: Partial<Garcom>) => {
    setState(prev => ({
      ...prev,
      garcons: (prev.garcons || []).map(g => g.id === id ? { ...g, ...updatedFields } : g)
    }));
  };

  const handleDeleteGarcom = (id: string) => {
    setState(prev => ({
      ...prev,
      garcons: (prev.garcons || []).filter(g => g.id !== id)
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
        garcons: DEF_GARCONS,
      });
      setCurrentView('dashboard');
    }
  };

  const activeComandasCount = (Object.values(state.comandas) as Comanda[]).filter(c => c.status === 'aberta').length;

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // Auth gate
  if (!isLoggedIn) {
    return <Login onLogin={handleLoginSuccess} />;
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
            garcons={state.garcons || []}
            onClearHistory={() => setState(prev => ({ ...prev, history: [] }))}
          />
        );
      case 'garcons':
        return (
          <Garcons
            garcons={state.garcons || []}
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
    garcons: 'Equipe de Garçons',
    historico: 'Relatórios & Histórico'
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] flex flex-col overflow-hidden relative">
      {/* Dynamic Restaurant Chalkboard Background Texture */}
      <div 
        className="absolute inset-0 bg-[url('/src/assets/images/restaurant_bg_1783447237820.jpg')] bg-cover bg-center bg-no-repeat opacity-[0.07] pointer-events-none mix-blend-overlay z-0"
      />
      <div className="h-2 w-full bg-[#0F172A] shrink-0 z-10" />
      <div className="flex-1 flex overflow-hidden z-10">
      {/* SIDEBAR - Desktop */}
      <aside className="hidden md:flex w-56 bg-[#161B22] border-r border-[#30363D] flex-col justify-between shrink-0">
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
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
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
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={15} />
                <span>Comandas</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeComandasCount > 0 ? 'bg-emerald-500 text-black' : 'bg-[#30363D] text-[#8B949E]'
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
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
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
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
              }`}
            >
              <Tags size={15} />
              <span>Categorias</span>
            </button>

            <button
              onClick={() => setCurrentView('garcons')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'garcons'
                  ? 'bg-amber-500/10 text-amber-500 font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
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
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
              }`}
            >
              <History size={15} />
              <span>Histórico Vendas</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#30363D] space-y-3 bg-[#11141a]">
          {/* Restaurant Name editing inline */}
          <div className="flex items-center gap-1.5 p-2 bg-[#0D1117] border border-[#30363D] rounded-lg">
            <Store size={14} className="text-amber-500 shrink-0" />
            <input
              type="text"
              value={state.rname}
              onChange={(e) => setState(prev => ({ ...prev, rname: e.target.value }))}
              placeholder="Nome do restaurante..."
              className="bg-transparent text-xs text-[#E6EDF3] font-medium outline-none border-none w-full placeholder-[#484F58] focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#8B949E]">
            <span>v1.2 · Servio</span>
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
              className="relative w-64 bg-[#161B22] border-r border-[#30363D] p-5 flex flex-col justify-between h-full z-10"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                      <ChefHat className="text-[#0D1117]" size={18} />
                    </div>
                    <span className="text-lg font-black text-[#E8A200]">Servio</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md text-[#8B949E] hover:text-white cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'dashboard' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[#8B949E]'
                    }`}
                  >
                    <LayoutDashboard size={15} />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('comandas'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'comandas' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[#8B949E]'
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
                      currentView === 'produtos' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[#8B949E]'
                    }`}
                  >
                    <UtensilsCrossed size={15} />
                    <span>Produtos</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('categorias'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'categorias' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[#8B949E]'
                    }`}
                  >
                    <Tags size={15} />
                    <span>Categorias</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('garcons'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'garcons' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[#8B949E]'
                    }`}
                  >
                    <Users size={15} />
                    <span>Garçons</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('historico'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'historico' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-[#8B949E]'
                    }`}
                  >
                    <History size={15} />
                    <span>Histórico Vendas</span>
                  </button>
                </nav>
              </div>

              <div className="p-4 border-t border-[#30363D] space-y-3 bg-[#11141a] rounded-lg">
                <div className="flex items-center gap-1.5 p-1.5 bg-[#0D1117] border border-[#30363D] rounded-md">
                  <Store size={13} className="text-amber-500" />
                  <input
                    type="text"
                    value={state.rname}
                    onChange={(e) => setState(prev => ({ ...prev, rname: e.target.value }))}
                    className="bg-transparent text-[11px] text-white outline-none border-none w-full"
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-[#8B949E]">
                  <span>v1.2 · Servio</span>
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
          SISTEMA OPERACIONAL SERVIO • CONECTADO AO NODE-BR-01
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
