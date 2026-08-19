import React from 'react';
import { motion } from 'motion/react';
import { Comanda, HistoricoItem } from '../types';
import { ClipboardList, Landmark, Scale, ArrowRight, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface DashboardProps {
  comandas: Record<number, Comanda>;
  history: HistoricoItem[];
  rname: string;
  ownerName?: string;
  onNavigate: (view: string) => void;
  onOpenComanda: (id: number) => void;
}

export default function Dashboard({ comandas, history, rname, ownerName, onNavigate, onOpenComanda }: DashboardProps) {

  const abertas = Object.values(comandas).filter(c => c.status === 'aberta');

  const todayStr = new Date().toDateString();
  const todayHistory = history.filter(h => new Date(h.closedAt).toDateString() === todayStr);
  const faturamentoHoje = todayHistory.reduce((sum, h) => sum + h.total, 0);
  const ticketMedio = todayHistory.length > 0 ? faturamentoHoje / todayHistory.length : 0;

  const itemCounts: Record<string, number> = {};
  todayHistory.forEach(h => {
    h.items.forEach(it => { itemCounts[it.name] = (itemCounts[it.name] || 0) + it.qty; });
  });
  const topItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

  const subTotal = (c: Comanda) => c.items.reduce((s, it) => s + it.price * it.qty, 0);
  const cmdTotal = (c: Comanda) => Math.max(0, subTotal(c) - (c.discount || 0));

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getElapsedStr = (openedAt: number | null) => {
    if (!openedAt) return '';
    const diff = Math.floor((Date.now() - openedAt) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
    return `${m}m${String(s).padStart(2, '0')}s`;
  };

  const recentHistory = [...history].sort((a, b) => b.closedAt - a.closedAt).slice(0, 5);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Bom dia';
    if (hr < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const PAYMENT_LABELS: Record<string, { ic: string; lb: string; color: string }> = {
    dinheiro: { ic: '💵', lb: 'Dinheiro', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
    credito: { ic: '💳', lb: 'Crédito', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
    debito: { ic: '🏧', lb: 'Débito', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
    pix: { ic: '⚡', lb: 'Pix', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  };

  const stats = [
    {
      label: 'Comandas Abertas',
      value: String(abertas.length),
      sub: 'De 100 mesas disponíveis',
      icon: ClipboardList,
      trend: null,
    },
    {
      label: 'Faturamento Hoje',
      value: formatCurrency(faturamentoHoje),
      sub: `${todayHistory.length} comanda(s) fechada(s)`,
      icon: Landmark,
      trend: faturamentoHoje > 0 ? 'up' : null,
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(ticketMedio),
      sub: topItem ? `Top: ${topItem[0]}` : 'Sem vendas hoje',
      icon: Scale,
      trend: ticketMedio > 0 ? 'up' : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {getGreeting()}, {ownerName || 'Visitante'}!
        </h1>
        <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
          <Calendar size={13} />
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid — 3 cards iguais ao template */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, sub, icon: Icon, trend }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6"
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {trend === 'up' && <TrendingUp size={11} className="text-emerald-500" />}
                {trend === 'down' && <TrendingDown size={11} className="text-red-500" />}
                {sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Comandas em Aberto */}
        <div className="rounded-xl border bg-card shadow-sm flex flex-col" style={{ minHeight: 380 }}>
          <div className="p-6 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold leading-none tracking-tight">Comandas em Aberto</h2>
              <p className="text-sm text-muted-foreground mt-1">{abertas.length} ativa(s) agora</p>
            </div>
            <button
              onClick={() => onNavigate('comandas')}
              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              Ver todas <ArrowRight size={13} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {abertas.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8 gap-2">
                <ClipboardList size={32} className="opacity-40" />
                <p className="text-sm">Nenhuma comanda aberta.</p>
                <button
                  onClick={() => onNavigate('comandas')}
                  className="text-xs text-primary hover:underline cursor-pointer font-medium"
                >
                  Abrir nova comanda
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {abertas.sort((a, b) => a.id - b.id).map(c => (
                  <motion.div
                    key={c.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onOpenComanda(c.id)}
                    className="p-3 rounded-lg border border-border bg-muted/40 hover:bg-accent hover:border-primary/40 text-center cursor-pointer transition-all"
                  >
                    <span className="text-xl font-bold block text-foreground">#{c.id}</span>
                    <span className="text-[11px] text-muted-foreground font-medium block mt-0.5 truncate">
                      {c.mesa || `Mesa ${c.id}`}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-primary block mt-1.5 bg-primary/10 rounded px-1.5 py-0.5">
                      {getElapsedStr(c.openedAt)}
                    </span>
                    <span className="text-xs font-bold text-foreground block mt-1.5">
                      {formatCurrency(cmdTotal(c))}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Últimas Vendas */}
        <div className="rounded-xl border bg-card shadow-sm flex flex-col" style={{ minHeight: 380 }}>
          <div className="p-6 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold leading-none tracking-tight">Últimas Vendas</h2>
              <p className="text-sm text-muted-foreground mt-1">Comandas fechadas recentemente</p>
            </div>
            <button
              onClick={() => onNavigate('historico')}
              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              Relatório <ArrowRight size={13} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {recentHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8 gap-2">
                <DollarSign size={32} className="opacity-40" />
                <p className="text-sm">Nenhuma venda hoje.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentHistory.map(h => {
                  const pay = PAYMENT_LABELS[h.payMethod] || { ic: '❓', lb: h.payMethod, color: 'text-muted-foreground' };
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                          {pay.ic}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            #{h.cmdId}{h.mesa ? ` · ${h.mesa}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">{pay.lb}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(h.total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
