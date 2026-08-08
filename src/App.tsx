import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Settings } from 'lucide-react';
import { SystemState, Comanda, Categoria, Produto, ItemPedido, HistoricoItem, Funcionario, CaixaSessao, MovimentacaoCaixa, FechamentoCaixa, MovimentacaoTipo } from './types';
import { supabase } from './supabaseClient';

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
  Store
} from 'lucide-react';

// localStorage: apenas para preferências de UI (tema), nunca para dados críticos
const LEGACY_STORAGE_KEY = 'restauros_v3';

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

// Mapear erro PGCODE do Supabase para mensagem amigável
function mapSupabaseError(error: any): string {
  if (!error) return 'Erro desconhecido';
  const msg = error.message || '';
  const code = error.code || '';
  // Erros personalizados das RPCs
  if (msg.includes('Já existe um caixa aberto')) return 'Já existe um caixa aberto para este restaurante. Feche-o antes de abrir um novo.';
  if (msg.includes('Apenas administradores podem abrir')) return 'Apenas administradores podem abrir o caixa.';
  if (msg.includes('Apenas administradores podem fechar')) return 'Apenas administradores podem fechar o caixa.';
  if (msg.includes('Perfil do usuário não encontrado')) return 'Perfil não encontrado. Tente fazer logout e login novamente.';
  if (msg.includes('O caixa não está aberto')) return 'O caixa não está aberto no momento.';
  if (msg.includes('Sessão de caixa não encontrada')) return 'Sessão de caixa não encontrada no banco.';
  if (msg.includes('Acesso negado')) return 'Acesso negado: operação não permitida.';
  // Erros do PostgreSQL
  if (code === '23505') return 'Registro duplicado — este item já existe.';
  if (code === '23503') return 'Referência inválida — item relacionado não encontrado.';
  if (code === '42501') return 'Permissão negada pelo banco de dados (RLS).';
  if (code === 'PGRST301') return 'Sessão expirada. Faça login novamente.';
  // Genérico
  return msg || 'Erro ao comunicar com o servidor.';
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
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

  // Caixa State
  const [caixaAtiva, setCaixaAtiva] = useState<CaixaSessao | null>(null);
  const [caixaSessoes, setCaixaSessoes] = useState<CaixaSessao[]>([]);
  const [movimentacoesCaixa, setMovimentacoesCaixa] = useState<MovimentacaoCaixa[]>([]);
  const [fechamentosCaixa, setFechamentosCaixa] = useState<FechamentoCaixa[]>([]);
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false);
  const [modalSangriaTipo, setModalSangriaTipo] = useState<'sangria' | 'suprimento' | null>(null);

  // Core system state
  const [userRole, setUserRole] = useState<string>('admin');
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  
  // Estado inicial vazio — dados virão do Supabase após login
  const [state, setState] = useState<SystemState>({
    categories: [],
    products: [],
    comandas: makeEmptyComandas(),
    history: [],
    rname: 'Carregando...',
    funcionarios: [],
  });

  const [isLoadingData, setIsLoadingData] = useState(false);


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
            .select('restaurant_id, role, name, restaurants(name, owner_name)')
            .eq('id', session.user.id)
            .single();
            
          if (profileData && !profileError) {
            const restId = profileData.restaurant_id;
            const rRole = profileData.role || 'admin';
            setRestaurantId(restId);
            setUserRole(rRole);
            
            if (rRole === 'waiter' || rRole === 'employee') {
              setCurrentView('comandas');
            }

            const rName = (profileData as any).restaurants?.name;
            const metaIdentifier = session.user?.user_metadata?.restaurant_id;
            if (metaIdentifier) {
              setIdentifier(metaIdentifier);
            } else if ((profileData as any).restaurants?.owner_name) {
              setIdentifier((profileData as any).restaurants?.owner_name);
            }
            if (rName) {
              setState(prev => ({ ...prev, rname: rName }));
            }
            const rOwnerName = profileData.name;
            if (rOwnerName) {
              setState(prev => ({ ...prev, ownerName: rOwnerName }));
            }

            // Sync from Supabase for this restaurant
            setIsLoadingData(true);
            const [
              { data: dbCategories },
              { data: dbProducts },
              { data: dbWaiters },
              { data: dbComandas },
              { data: dbSessoes },
              { data: dbMovs },
              { data: dbFechs },
              { data: dbHistory }
            ] = await Promise.all([
              supabase.from('categories').select('*').eq('restaurant_id', restId).order('name'),
              supabase.from('products').select('*').eq('restaurant_id', restId).order('name'),
              supabase.from('waiters').select('*').eq('restaurant_id', restId).order('name'),
              supabase.from('comandas').select('*, comanda_items(*)').eq('restaurant_id', restId).eq('status', 'aberta'),
              supabase.from('caixa_sessoes').select('*').eq('restaurant_id', restId).order('aberto_em', { ascending: false }),
              supabase.from('caixa_movimentacoes').select('*').eq('restaurant_id', restId).order('criado_em', { ascending: false }),
              supabase.from('caixa_fechamentos').select('*').eq('restaurant_id', restId).order('fechado_em', { ascending: false }),
              supabase.from('comanda_history').select('*').eq('restaurant_id', restId).order('closed_at', { ascending: false }).limit(200)
            ]);

            if (dbSessoes) {
              const mappedSessoes: CaixaSessao[] = dbSessoes.map(s => ({
                id: s.id,
                restaurantId: s.restaurant_id,
                status: s.status,
                saldoInicial: Number(s.saldo_inicial) || 0,
                abertoEm: new Date(s.aberto_em).getTime(),
                fechadoEm: s.fechado_em ? new Date(s.fechado_em).getTime() : null,
                operador: s.operador,
                obs: s.obs || ''
              }));
              setCaixaSessoes(mappedSessoes);
              const aberta = mappedSessoes.find(s => s.status === 'aberto');
              setCaixaAtiva(aberta || null);
            }

            if (dbMovs) {
              const mappedMovs: MovimentacaoCaixa[] = dbMovs.map(m => ({
                id: m.id,
                caixaId: m.caixa_id,
                restaurantId: m.restaurant_id,
                tipo: m.tipo,
                valor: Number(m.valor) || 0,
                formaPagamento: m.forma_pagamento,
                descricao: m.descricao,
                operador: m.operador,
                comandaId: m.comanda_id,
                criadoEm: new Date(m.criado_em).getTime()
              }));
              setMovimentacoesCaixa(mappedMovs);
            }

            if (dbFechs) {
              const mappedFechs: FechamentoCaixa[] = dbFechs.map(f => ({
                id: f.id,
                caixaId: f.caixa_id,
                restaurantId: f.restaurant_id,
                saldoInicial: Number(f.saldo_inicial) || 0,
                totalVendasDinheiro: Number(f.total_vendas_dinheiro) || 0,
                totalVendasPix: Number(f.total_vendas_pix) || 0,
                totalVendasCredito: Number(f.total_vendas_credito) || 0,
                totalVendasDebito: Number(f.total_vendas_debito) || 0,
                totalVendas: Number(f.total_vendas) || 0,
                totalSangrias: Number(f.total_sangrias) || 0,
                totalSuprimentos: Number(f.total_suprimentos) || 0,
                totalDescontos: Number(f.total_descontos) || 0,
                saldoEsperado: Number(f.saldo_esperado) || 0,
                saldoContado: Number(f.saldo_contado) || 0,
                diferenca: Number(f.diferenca) || 0,
                justificativa: f.justificativa,
                fechadoEm: new Date(f.fechado_em).getTime(),
                duracaoMinutos: f.duracao_minutos,
                duracao: f.duracao_minutos,
                operador: f.operador,
                qtdVendas: f.qtd_vendas
              }));
              setFechamentosCaixa(mappedFechs);
            }

            setState(prev => {
              const newState = { ...prev };
              if (dbCategories) {
                newState.categories = dbCategories.map((c: any) => ({
                  id: c.id, name: c.name, color: c.color, icon: c.icon, restaurant_id: c.restaurant_id
                }));
              }
              if (dbProducts) {
                newState.products = dbProducts.map((p: any) => ({
                  id: p.id, name: p.name, cid: p.category_id, category_id: p.category_id,
                  price: Number(p.price), avail: p.is_available, is_available: p.is_available,
                  cost_price: p.cost_price, sku: p.sku, stock_quantity: Number(p.stock_quantity || 0),
                  track_stock: p.track_stock, restaurant_id: p.restaurant_id
                }));
              }
              if (dbWaiters) {
                const mappedWaiters = dbWaiters.map((w: any) => ({
                  id: w.id, name: w.name, code: w.code, phone: w.phone, email: w.email,
                  active: w.is_active, is_active: w.is_active,
                  commissionRate: Number(w.commission_rate || 0), commission_rate: Number(w.commission_rate || 0),
                  restaurant_id: w.restaurant_id
                }));
                newState.garcons = mappedWaiters;
                newState.funcionarios = mappedWaiters;
              }

              if (dbHistory) {
                newState.history = dbHistory.map((h: any) => ({
                  id: h.id,
                  cmdId: h.comanda_number,
                  mesa: h.table_number || '',
                  garcom: h.waiter_name || '',
                  obs: h.notes || '',
                  items: (h.items || []).map((it: any) => ({
                    id: it.id || String(Math.random()),
                    pid: it.product_id,
                    name: it.name,
                    price: Number(it.price),
                    qty: Number(it.quantity),
                    note: it.notes || ''
                  })),
                  subtotal: Number(h.subtotal),
                  discount: Number(h.discount),
                  total: Number(h.total),
                  payMethod: h.payment_method || '',
                  openedAt: h.opened_at ? new Date(h.opened_at).getTime() : Date.now(),
                  closedAt: new Date(h.closed_at).getTime()
                }));
              }

              if (dbComandas) {
                const updatedComandas = {} as Record<number, any>;
                for (let i = 1; i <= 100; i++) {
                  updatedComandas[i] = {
                    id: i,
                    status: 'livre',
                    items: [],
                    mesa: '',
                    garcom: '',
                    obs: '',
                    openedAt: null,
                    discount: 0
                  };
                }

                dbComandas.forEach((c: any) => {
                  if (c.number && c.number >= 1 && c.number <= 100) {
                    // Mapear itens da comanda_items (join) ou do campo items JSONB
                    const itensDB: any[] = c.comanda_items || c.items || [];
                    const mappedItems = itensDB.map((it: any) => ({
                      id: it.id,
                      pid: it.product_id,
                      name: it.name,
                      price: Number(it.price),
                      qty: Number(it.quantity),
                      note: it.notes || ''
                    }));
                    updatedComandas[c.number] = {
                      id: c.number,
                      uuid: c.id,
                      status: 'aberta',
                      items: mappedItems,
                      mesa: c.table_number || '',
                      garcom: c.waiter_id || '',
                      obs: c.notes || '',
                      openedAt: c.opened_at ? new Date(c.opened_at).getTime() : Date.now(),
                      discount: Number(c.discount) || 0
                    };
                  }
                });
                newState.comandas = updatedComandas;
              }
              return newState;
            });
            setIsLoadingData(false);


            // Subscribe to realtime changes
            const channel = supabase
              .channel('comandas_' + restId)
              .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'comandas',
                filter: 'restaurant_id=eq.' + restId
              }, (payload) => {
                const newData = payload.new as any;
                const oldData = payload.old as any;
                
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                   if (newData.status === 'aberta' && newData.number >= 1 && newData.number <= 100) {
                     setState(prev => {
                        const upd = { ...prev.comandas };
                        upd[newData.number] = {
                          id: newData.number,
                          uuid: newData.id,
                          status: 'aberta',
                          items: newData.items || [],
                          mesa: newData.table_number || '',
                          garcom: newData.waiter_id || '',
                          obs: newData.notes || '',
                          openedAt: newData.opened_at ? new Date(newData.opened_at).getTime() : Date.now(),
                          discount: newData.discount || 0
                        };
                        return { ...prev, comandas: upd };
                     });
                   } else if (newData.status === 'fechada' && newData.number >= 1 && newData.number <= 100) {
                     setState(prev => {
                        const upd = { ...prev.comandas };
                        upd[newData.number] = {
                          id: newData.number,
                          status: 'livre',
                          items: [],
                          mesa: '',
                          garcom: '',
                          obs: '',
                          openedAt: null,
                          discount: 0
                        };
                        return { ...prev, comandas: upd };
                     });
                   }
                } else if (payload.eventType === 'DELETE') {
                  if (oldData.number >= 1 && oldData.number <= 100) {
                    setState(prev => {
                        const upd = { ...prev.comandas };
                        upd[oldData.number] = {
                          id: oldData.number,
                          status: 'livre',
                          items: [],
                          mesa: '',
                          garcom: '',
                          obs: '',
                          openedAt: null,
                          discount: 0
                        };
                        return { ...prev, comandas: upd };
                     });
                  }
                }
              })
              .subscribe();
              
            return () => {
              supabase.removeChannel(channel);
            };
          }
        } catch (e) {
          console.error('Erro ao obter restaurante:', e);
        }
      };
      
      const unsubscribePromise = fetchRestaurant();
      
      return () => {
        if (unsubscribePromise) {
          unsubscribePromise.then(unsub => {
            if (typeof unsub === 'function') unsub();
          });
        }
      };
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

  // Handler helpers — Supabase first, atualiza estado local após confirmação
  const handleMetaUpdate = async (id: number, meta: { mesa: string; garcom: string; obs: string }) => {
    const comanda = state.comandas[id];
    // Atualiza estado local imediatamente (UX)
    setState(prev => {
      const updatedComandas = { ...prev.comandas };
      updatedComandas[id] = { ...updatedComandas[id], ...meta };
      return { ...prev, comandas: updatedComandas };
    });
    // Persiste no banco se houver UUID
    if (comanda?.uuid && restaurantId) {
      const { error } = await supabase
        .from('comandas')
        .update({
          table_number: meta.mesa,
          notes: meta.obs,
          updated_at: new Date().toISOString()
        })
        .eq('id', comanda.uuid);
      if (error) console.error('[handleMetaUpdate] Erro ao atualizar comanda:', error);
    }
  };

  const handleItemsUpdate = async (id: number, items: ItemPedido[], discount: number = 0) => {
    const comanda = state.comandas[id];
    // Atualiza estado local
    setState(prev => {
      const updatedComandas = { ...prev.comandas };
      if (items.length === 0) {
        updatedComandas[id] = { ...updatedComandas[id], items: [], discount: 0, status: 'livre', openedAt: null };
      } else {
        updatedComandas[id] = { ...updatedComandas[id], items, discount };
      }
      return { ...prev, comandas: updatedComandas };
    });
    // Persiste no banco se houver UUID
    if (comanda?.uuid && restaurantId) {
      const subTotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      const total = Math.max(0, subTotal - discount);
      // Substituir itens: deletar antigos e inserir novos
      await supabase.from('comanda_items').delete().eq('comanda_id', comanda.uuid);
      if (items.length > 0) {
        const dbItems = items.map(it => ({
          comanda_id: comanda.uuid,
          product_id: it.pid,
          name: it.name,
          price: it.price,
          quantity: it.qty,
          notes: it.note || null
        }));
        const { error: itemErr } = await supabase.from('comanda_items').insert(dbItems);
        if (itemErr) console.error('[handleItemsUpdate] Erro ao inserir itens:', itemErr);
      }
      const { error: cmdErr } = await supabase
        .from('comandas')
        .update({ discount, subtotal: subTotal, total, updated_at: new Date().toISOString() })
        .eq('id', comanda.uuid);
      if (cmdErr) console.error('[handleItemsUpdate] Erro ao atualizar comanda:', cmdErr);
    }
  };

  const handleOpenComanda = async (id: number) => {
    if (!restaurantId) return;
    const now = new Date().toISOString();
    // Verifica se já existe UUID (comanda já criada no banco)
    const existing = state.comandas[id];
    if (existing?.uuid) {
      setState(prev => {
        const upd = { ...prev.comandas };
        upd[id] = { ...upd[id], status: 'aberta', openedAt: Date.now() };
        return { ...prev, comandas: upd };
      });
      return;
    }
    // Criar comanda no banco
    const { data: newComanda, error } = await supabase
      .from('comandas')
      .insert([{ restaurant_id: restaurantId, number: id, status: 'aberta', opened_at: now }])
      .select()
      .single();
    if (error) {
      console.error('[handleOpenComanda] Erro ao criar comanda:', error);
      alert('Erro ao abrir comanda: ' + mapSupabaseError(error));
      return;
    }
    setState(prev => {
      const upd = { ...prev.comandas };
      upd[id] = { ...upd[id], uuid: newComanda.id, status: 'aberta', openedAt: Date.now() };
      return { ...prev, comandas: upd };
    });
  };

  const handleConfirmPayment = async (id: number, method: string, received?: number) => {
    const comanda = state.comandas[id];
    if (!comanda || comanda.items.length === 0) return;

    const subTotal = comanda.items.reduce((s, it) => s + it.price * it.qty, 0);
    const totalVal = Math.max(0, subTotal - comanda.discount);
    const opName = state.ownerName || 'Operador';

    // Atualizar UI imediatamente
    setState(prev => {
      const updatedComandas = { ...prev.comandas };
      updatedComandas[id] = { id, status: 'livre', items: [], mesa: '', garcom: '', obs: '', openedAt: null, discount: 0 };
      return { ...prev, comandas: updatedComandas };
    });
    setShowPaymentId(null);
    setActiveComandaId(null);

    // Fechar no banco via RPC (atômico: fecha comanda + salva histórico + registra caixa)
    if (comanda.uuid && restaurantId) {
      const { data: histData, error: histErr } = await supabase.rpc('fechar_comanda', {
        p_comanda_uuid: comanda.uuid,
        p_payment_method: method,
        p_subtotal: subTotal,
        p_discount: comanda.discount,
        p_total: totalVal,
        p_caixa_id: caixaAtiva?.id || null,
        p_operador: opName
      });

      if (histErr) {
        console.error('[handleConfirmPayment] Erro ao fechar comanda via RPC:', histErr);
      } else if (histData) {
        // Adicionar ao histórico local a partir dos dados retornados pelo banco
        const h = histData as any;
        const historyItem: HistoricoItem = {
          id: h.id,
          cmdId: h.comanda_number,
          mesa: h.table_number || '',
          garcom: h.waiter_name || '',
          obs: h.notes || '',
          items: (h.items || []).map((it: any) => ({
            id: it.id,
            pid: it.product_id,
            name: it.name,
            price: Number(it.price),
            qty: Number(it.quantity),
            note: it.notes || ''
          })),
          subtotal: Number(h.subtotal),
          discount: Number(h.discount),
          total: Number(h.total),
          payMethod: h.payment_method,
          openedAt: h.opened_at ? new Date(h.opened_at).getTime() : Date.now(),
          closedAt: new Date(h.closed_at).getTime()
        };
        setState(prev => ({ ...prev, history: [historyItem, ...prev.history] }));

        // Atualizar movimentações do caixa se houver caixa ativo
        if (caixaAtiva) {
          const { data: movs } = await supabase
            .from('caixa_movimentacoes')
            .select('*')
            .eq('caixa_id', caixaAtiva.id)
            .eq('tipo', 'venda')
            .order('criado_em', { ascending: false })
            .limit(1);
          if (movs && movs.length > 0) {
            const m = movs[0];
            const movObj: MovimentacaoCaixa = {
              id: m.id, caixaId: m.caixa_id, restaurantId: m.restaurant_id,
              tipo: 'venda', valor: Number(m.valor), formaPagamento: m.forma_pagamento,
              descricao: m.descricao, operador: m.operador,
              criadoEm: new Date(m.criado_em).getTime()
            };
            setMovimentacoesCaixa(prev => [movObj, ...prev]);
          }
        }
      }
    } else {
      // Comanda sem UUID no banco (situação legada) — apenas histórico local
      console.warn('[handleConfirmPayment] Comanda sem UUID, salvando apenas localmente.');
      const historyItem: HistoricoItem = {
        id: '_' + Math.random().toString(36).substring(2, 9),
        cmdId: id, mesa: comanda.mesa, garcom: comanda.garcom, obs: comanda.obs,
        items: comanda.items.map(it => ({ ...it })),
        subtotal: subTotal, discount: comanda.discount, total: totalVal,
        payMethod: method, openedAt: comanda.openedAt || Date.now(), closedAt: Date.now()
      };
      setState(prev => ({ ...prev, history: [historyItem, ...prev.history] }));
    }
  };

  // Caixa Handlers — usando RPCs atômicas e seguras
  const handleAbrirCaixaSubmit = async (dados: Omit<CaixaSessao, 'id' | 'fechadoEm' | 'status'>) => {
    try {
      // RPC abrir_caixa: valida permissões, verifica caixa existente, cria sessão e movimentação atomicamente
      const { data: newSessao, error: sessaoErr } = await supabase.rpc('abrir_caixa', {
        p_saldo_inicial: dados.saldoInicial,
        p_operador: dados.operador,
        p_obs: dados.obs || ''
      });

      if (sessaoErr || !newSessao) {
        const errMsg = mapSupabaseError(sessaoErr);
        console.error('[handleAbrirCaixaSubmit] Erro:', sessaoErr);
        alert('Erro ao abrir o caixa: ' + errMsg);
        return;
      }

      const sessaoObj: CaixaSessao = {
        id: newSessao.id,
        restaurantId: newSessao.restaurant_id,
        status: 'aberto',
        saldoInicial: Number(newSessao.saldo_inicial),
        abertoEm: new Date(newSessao.aberto_em).getTime(),
        operador: newSessao.operador,
        obs: newSessao.obs || ''
      };

      setCaixaAtiva(sessaoObj);
      setCaixaSessoes(prev => [sessaoObj, ...prev]);

      // Buscar movimentação de abertura criada pela RPC
      const { data: movs } = await supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('caixa_id', newSessao.id)
        .order('criado_em', { ascending: false });
      if (movs && movs.length > 0) {
        const mapped: MovimentacaoCaixa[] = movs.map(m => ({
          id: m.id, caixaId: m.caixa_id, restaurantId: m.restaurant_id,
          tipo: m.tipo, valor: Number(m.valor), formaPagamento: m.forma_pagamento,
          descricao: m.descricao, operador: m.operador,
          criadoEm: new Date(m.criado_em).getTime()
        }));
        setMovimentacoesCaixa(prev => [...mapped, ...prev]);
      }

      setModalAbrirCaixa(false);
    } catch (e: any) {
      console.error('[handleAbrirCaixaSubmit] Exceção:', e);
      alert('Erro inesperado ao abrir o caixa: ' + (e?.message || String(e)));
    }
  };

  const handleFecharCaixaSubmit = async (fechamento: FechamentoCaixa) => {
    if (!caixaAtiva) return;
    try {
      // RPC fechar_caixa: atômico — atualiza sessão + cria fechamento + movimentação
      const { data: newFech, error: fechErr } = await supabase.rpc('fechar_caixa', {
        p_caixa_id: caixaAtiva.id,
        p_saldo_contado: fechamento.saldoContado,
        p_justificativa: fechamento.justificativa || '',
        p_saldo_inicial: fechamento.saldoInicial,
        p_total_vendas_dinheiro: fechamento.totalVendasDinheiro,
        p_total_vendas_pix: fechamento.totalVendasPix,
        p_total_vendas_credito: fechamento.totalVendasCredito,
        p_total_vendas_debito: fechamento.totalVendasDebito,
        p_total_vendas: fechamento.totalVendas,
        p_total_sangrias: fechamento.totalSangrias,
        p_total_suprimentos: fechamento.totalSuprimentos,
        p_total_descontos: fechamento.totalDescontos,
        p_saldo_esperado: fechamento.saldoEsperado,
        p_duracao_minutos: fechamento.duracaoMinutos,
        p_operador: fechamento.operador,
        p_qtd_vendas: fechamento.qtdVendas
      });

      if (fechErr) {
        console.error('[handleFecharCaixaSubmit] Erro:', fechErr);
        alert('Erro ao fechar o caixa: ' + mapSupabaseError(fechErr));
        return;
      }

      const fechObj: FechamentoCaixa = {
        ...fechamento,
        id: newFech?.id || '_' + Math.random().toString(36).substring(2, 9),
        duracao: fechamento.duracaoMinutos
      };

      setFechamentosCaixa(prev => [fechObj, ...prev]);
      setCaixaSessoes(prev => prev.map(s => s.id === caixaAtiva.id ? { ...s, status: 'fechado', fechadoEm: Date.now() } : s));
      setCaixaAtiva(null);
      setModalFecharCaixa(false);
    } catch (e: any) {
      console.error('[handleFecharCaixaSubmit] Exceção:', e);
      alert('Erro inesperado ao fechar o caixa: ' + (e?.message || String(e)));
    }
  };

  const handleSangriaOuSuprimentoSubmit = async (tipo: MovimentacaoTipo, valor: number, descricao: string) => {
    if (!caixaAtiva) return;
    try {
      const valorFinal = tipo === 'sangria' ? -Math.abs(valor) : Math.abs(valor);
      const operador = state.ownerName || 'Operador';
      // RPC registrar_movimentacao_caixa: valida caixa aberto e pertence ao restaurante
      const { data: newMov, error: movErr } = await supabase.rpc('registrar_movimentacao_caixa', {
        p_caixa_id: caixaAtiva.id,
        p_tipo: tipo,
        p_valor: valorFinal,
        p_descricao: descricao,
        p_operador: operador
      });

      if (movErr) {
        console.error('[handleSangriaOuSuprimentoSubmit] Erro:', movErr);
        alert('Erro ao registrar ' + tipo + ': ' + mapSupabaseError(movErr));
        return;
      }

      if (newMov) {
        const m = newMov as any;
        const movObj: MovimentacaoCaixa = {
          id: m.id, caixaId: m.caixa_id, tipo,
          valor: Number(m.valor), descricao: m.descricao, operador: m.operador,
          criadoEm: new Date(m.criado_em).getTime()
        };
        setMovimentacoesCaixa(prev => [movObj, ...prev]);
      }
      setModalSangriaTipo(null);
    } catch (e: any) {
      console.error('[handleSangriaOuSuprimentoSubmit] Exceção:', e);
      alert('Erro inesperado: ' + (e?.message || String(e)));
    }
  };

  // Products CRUD — Supabase first
  const handleCreateProduct = async (p: Omit<Produto, 'id'>) => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('products')
      .insert([{ restaurant_id: restaurantId, category_id: p.cid, name: p.name, price: p.price, is_available: p.avail ?? true, cost_price: p.cost_price, sku: p.sku, stock_quantity: p.stock_quantity ?? 0, track_stock: p.track_stock ?? false }])
      .select().single();
    if (error) { alert('Erro ao criar produto: ' + mapSupabaseError(error)); return; }
    const newProduct: Produto = { id: data.id, name: data.name, cid: data.category_id, category_id: data.category_id, price: Number(data.price), avail: data.is_available, is_available: data.is_available, cost_price: data.cost_price, sku: data.sku, stock_quantity: Number(data.stock_quantity), track_stock: data.track_stock, restaurant_id: data.restaurant_id };
    setState(prev => ({ ...prev, products: [...prev.products, newProduct] }));
  };

  const handleUpdateProduct = async (id: string, updatedFields: Partial<Produto>) => {
    const dbFields: any = {};
    if (updatedFields.name !== undefined) dbFields.name = updatedFields.name;
    if (updatedFields.price !== undefined) dbFields.price = updatedFields.price;
    if (updatedFields.avail !== undefined) dbFields.is_available = updatedFields.avail;
    if (updatedFields.is_available !== undefined) dbFields.is_available = updatedFields.is_available;
    if (updatedFields.cid !== undefined) dbFields.category_id = updatedFields.cid;
    if (updatedFields.category_id !== undefined) dbFields.category_id = updatedFields.category_id;
    if (updatedFields.cost_price !== undefined) dbFields.cost_price = updatedFields.cost_price;
    if (updatedFields.sku !== undefined) dbFields.sku = updatedFields.sku;
    if (updatedFields.stock_quantity !== undefined) dbFields.stock_quantity = updatedFields.stock_quantity;
    if (updatedFields.track_stock !== undefined) dbFields.track_stock = updatedFields.track_stock;
    const { error } = await supabase.from('products').update(dbFields).eq('id', id);
    if (error) { alert('Erro ao atualizar produto: ' + mapSupabaseError(error)); return; }
    setState(prev => ({ ...prev, products: prev.products.map(p => p.id === id ? { ...p, ...updatedFields } : p) }));
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { alert('Erro ao excluir produto: ' + mapSupabaseError(error)); return; }
    setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
  };

  // Categories CRUD — Supabase first
  const handleCreateCategory = async (c: Omit<Categoria, 'id'>) => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('categories')
      .insert([{ restaurant_id: restaurantId, name: c.name, color: c.color, icon: c.icon }])
      .select().single();
    if (error) { alert('Erro ao criar categoria: ' + mapSupabaseError(error)); return; }
    const newCat: Categoria = { id: data.id, name: data.name, color: data.color, icon: data.icon, restaurant_id: data.restaurant_id };
    setState(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
  };

  const handleUpdateCategory = async (id: string, updatedFields: Partial<Categoria>) => {
    const { error } = await supabase.from('categories').update({ name: updatedFields.name, color: updatedFields.color, icon: updatedFields.icon }).eq('id', id);
    if (error) { alert('Erro ao atualizar categoria: ' + mapSupabaseError(error)); return; }
    setState(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, ...updatedFields } : c) }));
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { alert('Erro ao excluir categoria: ' + mapSupabaseError(error)); return; }
    setState(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
  };

  // Funcionarios CRUD — Supabase first
  const handleCreateFuncionario = async (g: Omit<Funcionario, 'id'> & { id?: string }) => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('waiters')
      .insert([{ restaurant_id: restaurantId, name: g.name, code: g.code || g.username || String(Date.now()).slice(-4), phone: g.whatsapp || g.phone, email: g.email, is_active: g.active ?? true, commission_rate: g.commissionRate ?? 0 }])
      .select().single();
    if (error) { alert('Erro ao criar funcionário: ' + mapSupabaseError(error)); return; }
    const newFunc: Funcionario = { id: data.id, name: data.name, code: data.code, phone: data.phone, email: data.email, active: data.is_active, is_active: data.is_active, commissionRate: Number(data.commission_rate), commission_rate: Number(data.commission_rate), restaurant_id: data.restaurant_id };
    setState(prev => ({ ...prev, funcionarios: [...(prev.funcionarios || []), newFunc] }));
  };

  const handleUpdateFuncionario = async (id: string, updatedFields: Partial<Funcionario>) => {
    const dbFields: any = {};
    if (updatedFields.name !== undefined) dbFields.name = updatedFields.name;
    if (updatedFields.code !== undefined) dbFields.code = updatedFields.code;
    if (updatedFields.phone !== undefined) dbFields.phone = updatedFields.phone;
    if (updatedFields.whatsapp !== undefined) dbFields.phone = updatedFields.whatsapp;
    if (updatedFields.email !== undefined) dbFields.email = updatedFields.email;
    if (updatedFields.active !== undefined) dbFields.is_active = updatedFields.active;
    if (updatedFields.is_active !== undefined) dbFields.is_active = updatedFields.is_active;
    if (updatedFields.commissionRate !== undefined) dbFields.commission_rate = updatedFields.commissionRate;
    const { error } = await supabase.from('waiters').update(dbFields).eq('id', id);
    if (error) { alert('Erro ao atualizar funcionário: ' + mapSupabaseError(error)); return; }
    setState(prev => ({ ...prev, funcionarios: (prev.funcionarios || []).map(g => g.id === id ? { ...g, ...updatedFields } : g) }));
  };

  const handleDeleteFuncionario = async (id: string) => {
    const { error } = await supabase.from('waiters').delete().eq('id', id);
    if (error) { alert('Erro ao excluir funcionário: ' + mapSupabaseError(error)); return; }
    setState(prev => ({ ...prev, funcionarios: (prev.funcionarios || []).filter(g => g.id !== id) }));
  };

  // Reset entire state
  const handleResetAllData = () => {
    if (confirm('Atenção: isto apagará TODOS os produtos, comandas e relatórios históricos! Tem certeza que deseja resetar?')) {
      setState({
        categories: [],
        products: [],
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
    setCurrentView('dashboard');
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
            ownerName={state.ownerName}
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
      case 'caixa':
        return (
          <Caixa
            caixaAtiva={caixaAtiva}
            sessoes={caixaSessoes}
            movimentacoes={movimentacoesCaixa}
            fechamentos={fechamentosCaixa}
            operador={state.ownerName || 'Admin'}
            onAbrirCaixa={() => setModalAbrirCaixa(true)}
            onFecharCaixa={() => setModalFecharCaixa(true)}
            onSangria={() => setModalSangriaTipo('sangria')}
            onSuprimento={() => setModalSangriaTipo('suprimento')}
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
            funcionarios={state.garcons || state.funcionarios || []}
            history={state.history}
            restaurantId={restaurantId}
            identifier={identifier}
            onCreateFuncionario={handleCreateFuncionario}
            onUpdateFuncionario={handleUpdateFuncionario}
            onDeleteFuncionario={handleDeleteFuncionario}
          />
        );
      case 'configuracoes':
        return <Configuracoes restaurantId={restaurantId} identifier={identifier} onUpdateIdentifier={setIdentifier} rname={state.rname} onUpdateRname={(val) => setState(prev => ({...prev, rname: val}))} ownerName={state.ownerName} onUpdateOwnerName={(val) => setState(prev => ({...prev, ownerName: val}))} isDark={isDark} toggleTheme={toggleTheme} onLogout={handleLogout} onClearLocalData={() => {}} />;
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
            <img src="/images/logo.png" alt="Servio Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-serif tracking-tight text-sky-600">Servio</span>
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1">
            <span className="block px-3 text-[10px] font-bold text-[#484F58] uppercase tracking-widest mb-2">Principal</span>
            
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

            <span className="block px-3 pt-4 text-[10px] font-bold text-[#484F58] uppercase tracking-widest mb-2">Cadastros</span>

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

            <span className="block px-3 pt-4 text-[10px] font-bold text-[#484F58] uppercase tracking-widest mb-2">Relatórios</span>

            <button
              onClick={() => setCurrentView('historico')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all text-left cursor-pointer ${
                currentView === 'historico'
                  ? 'bg-sky-500/10 text-sky-500 font-bold'
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
            <Store size={14} className="text-sky-500 shrink-0" />
            <input
              type="text"
              value={state.rname}
              onChange={(e) => setState(prev => ({ ...prev, rname: e.target.value }))}
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
                    <img src="/images/logo.png" alt="Servio Logo" className="w-10 h-10 object-contain" />
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
                    <span>Módulo Caixa</span>
                  </button>

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

                  <button
                    onClick={() => { setCurrentView('historico'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                      currentView === 'historico' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <History size={15} />
                    <span>Histórico Vendas</span>
                  </button>
                </nav>
              </div>

              <div className="p-4 border-t border-[var(--border-color)] space-y-3 bg-[var(--bg-panel)] rounded-lg">
                <div className="flex items-center gap-1.5 p-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-md">
                  <Store size={13} className="text-sky-500 shrink-0" />
                  <input
                    type="text"
                    value={state.rname}
                    onChange={(e) => setState(prev => ({ ...prev, rname: e.target.value }))}
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
            <img src="/images/logo.png" alt="Servio" className="md:hidden w-7 h-7 object-contain" />
            <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight">
              {state.rname || 'Servio Gourmet'}
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
                <img src="/images/logo.png" alt="Servio" className="w-8 h-8 object-contain" />
                <div>
                  <p className="text-sm font-bold text-[var(--text-main)] leading-none">{state.rname}</p>
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

      {/* CAIXA OVERLAY MODALS */}
      <AnimatePresence>
        {modalAbrirCaixa && (
          <CaixaAbertura
            operador={state.ownerName || 'Admin'}
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
            operador={state.ownerName || 'Admin'}
            onFechar={handleFecharCaixaSubmit}
            onClose={() => setModalFecharCaixa(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalSangriaTipo && (
          <CaixaSangriaModal
            tipo={modalSangriaTipo}
            operador={state.ownerName || 'Admin'}
            onConfirm={handleSangriaOuSuprimentoSubmit}
            onClose={() => setModalSangriaTipo(null)}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
