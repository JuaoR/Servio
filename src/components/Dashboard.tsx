import React from 'react';
import { motion } from 'motion/react';
import { Categoria, Produto, Comanda, HistoricoItem } from '../types';
import { ClipboardList, AlertTriangle, Landmark, Scale, Plus, Calendar, ArrowRight, DollarSign } from 'lucide-react';

interface DashboardProps {
  comandas: Record<number, Comanda>;
  history: HistoricoItem[];
  rname: string;
  onNavigate: (view: string) => void;
  onOpenComanda: (id: number) => void;
}

export default function Dashboard({ comandas, history, rname, onNavigate, onOpenComanda }: DashboardProps) {

  const abertas = Object.values(comandas).filter(c => c.status === 'aberta');
  
  const todayStr = new Date().toDateString();
  const todayHistory = history.filter(h => new Date(h.closedAt).toDateString() === todayStr);
  const faturamentoHoje = todayHistory.reduce((sum, h) => sum + h.total, 0);
  const ticketMedio = todayHistory.length > 0 ? faturamentoHoje / todayHistory.length : 0;

  // Most sold item calculation
  const itemCounts: Record<string, number> = {};
  todayHistory.forEach(h => {
    h.items.forEach(it => {
      itemCounts[it.name] = (itemCounts[it.name] || 0) + it.qty;
    });
  });
  const topItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

  const subTotal = (c: Comanda) => c.items.reduce((s, it) => s + it.price * it.qty, 0);
  const cmdTotal = (c: Comanda) => Math.max(0, subTotal(c) - (c.discount || 0));

  const formatCurrency = (val: number) => {
    return 'R$ ' + val.toFixed(2).replace('.', ',');
  };

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
    pix: { ic: '⚡', lb: 'Pix', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' }
  };

  return (
    <div className="space-y-6">
      {/* Greeting and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
            {getGreeting()}, {rname || 'Visitante'}!
          </h1>
          <p className="text-[var(--text-muted)] text-xs flex items-center gap-2 mt-1">
            <Calendar size={13} />
            <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </p>
        </div>
        <button
          onClick={() => onNavigate('comandas')}
          className="btn btn-primary self-start sm:self-auto shadow-md shadow-sky-500/5 cursor-pointer"
        >
          <Plus size={16} />
          <span>Lançar Comanda</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 border-l-4 border-l-blue-500"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Comandas Abertas</p>
              <h3 className="text-3xl font-black text-[var(--text-main)] mt-2">{abertas.length}</h3>
            </div>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
              <ClipboardList size={20} />
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3">De 100 mesas/comandas disponíveis</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 border-l-4 border-l-blue-500"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Faturamento Hoje</p>
              <h3 className="text-3xl font-black text-[var(--text-main)] mt-2">{formatCurrency(faturamentoHoje)}</h3>
            </div>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
              <Landmark size={20} />
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3">{todayHistory.length} comanda(s) fechada(s)</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 border-l-4 border-l-blue-500"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ticket Médio</p>
              <h3 className="text-3xl font-black text-[var(--text-main)] mt-2">{formatCurrency(ticketMedio)}</h3>
            </div>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
              <Scale size={20} />
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3 truncate">
            {topItem ? `Top venda: ${topItem[0]}` : 'Sem vendas hoje ainda'}
          </p>
        </motion.div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Comandas */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[var(--text-main)] tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              <span>Comandas em Aberto ({abertas.length})</span>
            </h2>
            <button
              onClick={() => onNavigate('comandas')}
              className="text-xs text-sky-500 hover:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Ver todas</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {abertas.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#484F58] py-8">
                <ClipboardList size={36} className="mb-2" />
                <p className="text-sm">Nenhuma comanda aberta no momento.</p>
                <button
                  onClick={() => onNavigate('comandas')}
                  className="text-xs text-sky-500 hover:underline mt-2 cursor-pointer font-medium"
                >
                  Abrir nova comanda
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {abertas
                  .sort((a, b) => a.id - b.id)
                  .map(c => {
                    return (
                      <motion.div
                        key={c.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => onOpenComanda(c.id)}
                        className={`p-2 rounded-xl border text-center cursor-pointer transition-all bg-sky-500/10 border-sky-500/30 hover:border-sky-500`}
                      >
                        <span className={`text-xl font-black block text-[var(--text-main)]`}>
                          #{c.id}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] font-medium block mt-1 truncate">
                          {c.mesa || `Comanda ${c.id}`}
                        </span>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-sky-500/15 text-sky-500`}>
                            {getElapsedStr(c.openedAt)}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[var(--text-main)] block mt-2">
                          {formatCurrency(cmdTotal(c))}
                        </span>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[var(--text-main)] tracking-tight">Últimas Vendas Fechadas</h2>
            <button
              onClick={() => onNavigate('historico')}
              className="text-xs text-sky-500 hover:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Relatório completo</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {recentHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#484F58] py-8">
                <DollarSign size={36} className="mb-2" />
                <p className="text-sm">Nenhuma venda registrada hoje.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      <th className="pb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ID</th>
                      <th className="pb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Mesa</th>
                      <th className="pb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Pagamento</th>
                      <th className="pb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentHistory.map(h => {
                      const pay = PAYMENT_LABELS[h.payMethod] || { ic: '❓', lb: h.payMethod, color: 'text-gray-400 bg-gray-500/10' };
                      return (
                        <tr key={h.id} className="border-b border-[var(--bg-hover)]/50 hover:bg-[var(--bg-hover)]/20 transition-colors">
                          <td className="py-2.5 font-semibold text-[var(--text-main)]">#{h.cmdId}</td>
                          <td className="py-2.5 text-[var(--text-muted)] truncate max-w-[100px]">{h.mesa || '—'}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${pay.color}`}>
                              <span>{pay.ic}</span>
                              <span>{pay.lb}</span>
                            </span>
                          </td>
                          <td className="py-2.5 font-bold text-[var(--text-main)] text-right">{formatCurrency(h.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
