import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign, Lock, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2,
  AlertTriangle, TrendingUp, History, Activity, ChevronDown, ChevronRight,
  Banknote, CreditCard, Smartphone, LayoutDashboard, ShoppingBag
} from 'lucide-react';
import { CaixaSessao, MovimentacaoCaixa, FechamentoCaixa, MovimentacaoTipo } from '../types';
import { AnimatePresence as AP } from 'motion/react';

interface CaixaProps {
  caixaAtiva: CaixaSessao | null;
  sessoes: CaixaSessao[];
  movimentacoes: MovimentacaoCaixa[];
  fechamentos: FechamentoCaixa[];
  operador: string;
  onAbrirCaixa: () => void;
  onFecharCaixa: () => void;
  onSangria: () => void;
  onSuprimento: () => void;
}

type Tab = 'overview' | 'movimentacoes' | 'historico';

const fmtR = (v: number) => 'R$ ' + v.toFixed(2).replace('.', ',');
const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtDuracao = (min: number) => min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;

const TIPO_CONFIG: Record<MovimentacaoTipo, { label: string; icon: React.ReactNode; cor: string; bgCor: string }> = {
  abertura:    { label: 'Abertura', icon: <DollarSign size={13}/>, cor: 'text-emerald-500', bgCor: 'bg-emerald-500/10' },
  venda:       { label: 'Venda', icon: <ShoppingBag size={13}/>, cor: 'text-sky-500', bgCor: 'bg-sky-500/10' },
  sangria:     { label: 'Sangria', icon: <ArrowDownCircle size={13}/>, cor: 'text-red-400', bgCor: 'bg-red-500/10' },
  suprimento:  { label: 'Suprimento', icon: <ArrowUpCircle size={13}/>, cor: 'text-emerald-500', bgCor: 'bg-emerald-500/10' },
  cancelamento:{ label: 'Cancelamento', icon: <AlertTriangle size={13}/>, cor: 'text-amber-500', bgCor: 'bg-amber-500/10' },
  desconto:    { label: 'Desconto', icon: <TrendingUp size={13}/>, cor: 'text-purple-400', bgCor: 'bg-purple-500/10' },
  fechamento:  { label: 'Fechamento', icon: <Lock size={13}/>, cor: 'text-[var(--text-muted)]', bgCor: 'bg-[var(--bg-hover)]' },
};

const PAGAMENTO_ICON: Record<string, React.ReactNode> = {
  dinheiro: <Banknote size={13} />,
  pix: <Smartphone size={13} />,
  credito: <CreditCard size={13} />,
  debito: <CreditCard size={13} />,
};

function StatCard({ label, value, sub, cor = 'text-[var(--text-main)]', icon }: {
  label: string; value: string; sub?: string; cor?: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-xl font-black ${cor}`}>{value}</p>
        {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cor.replace('text-', 'bg-').replace('500', '500/10').replace('400', '400/10')}`}>
        <span className={cor}>{icon}</span>
      </div>
    </div>
  );
}

export default function Caixa({ caixaAtiva, sessoes, movimentacoes, fechamentos, operador, onAbrirCaixa, onFecharCaixa, onSangria, onSuprimento }: CaixaProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedSessao, setExpandedSessao] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<MovimentacaoTipo | 'all'>('all');

  // Movimentações do caixa ativo
  const movAtivas = useMemo(() =>
    caixaAtiva ? movimentacoes.filter(m => m.caixaId === caixaAtiva.id) : [],
    [movimentacoes, caixaAtiva]
  );

  // Stats do caixa ativo
  const stats = useMemo(() => {
    if (!caixaAtiva) return null;
    const vendas = movAtivas.filter(m => m.tipo === 'venda');
    const sangrias = movAtivas.filter(m => m.tipo === 'sangria');
    const suprimentos = movAtivas.filter(m => m.tipo === 'suprimento');

    const totalVendasDinheiro = vendas.filter(m => m.formaPagamento === 'dinheiro').reduce((s, m) => s + m.valor, 0);
    const totalVendasPix = vendas.filter(m => m.formaPagamento === 'pix').reduce((s, m) => s + m.valor, 0);
    const totalVendasCredito = vendas.filter(m => m.formaPagamento === 'credito').reduce((s, m) => s + m.valor, 0);
    const totalVendasDebito = vendas.filter(m => m.formaPagamento === 'debito').reduce((s, m) => s + m.valor, 0);
    const totalVendas = vendas.reduce((s, m) => s + m.valor, 0);
    const totalSangrias = Math.abs(sangrias.reduce((s, m) => s + m.valor, 0));
    const totalSuprimentos = suprimentos.reduce((s, m) => s + m.valor, 0);
    const saldoEsperado = caixaAtiva.saldoInicial + totalVendasDinheiro + totalSuprimentos - totalSangrias;
    const duracao = Math.round((Date.now() - caixaAtiva.abertoEm) / 60000);

    return { totalVendas, totalVendasDinheiro, totalVendasPix, totalVendasCredito, totalVendasDebito, totalSangrias, totalSuprimentos, saldoEsperado, duracao, qtdVendas: vendas.length };
  }, [movAtivas, caixaAtiva]);

  // Movimentações filtradas
  const movFiltradas = useMemo(() => {
    const base = movAtivas.slice().reverse();
    if (filterTipo === 'all') return base;
    return base.filter(m => m.tipo === filterTipo);
  }, [movAtivas, filterTipo]);

  const TABS = [
    { id: 'overview' as Tab, label: 'Visão Geral', icon: <LayoutDashboard size={14} /> },
    { id: 'movimentacoes' as Tab, label: 'Movimentações', icon: <Activity size={14} />, badge: movAtivas.length || undefined },
    { id: 'historico' as Tab, label: 'Histórico', icon: <History size={14} />, badge: sessoes.filter(s => s.status === 'fechado').length || undefined },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Caixa</h1>
            {/* Status badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              caixaAtiva
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${caixaAtiva ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
              {caixaAtiva ? 'Aberto' : 'Fechado'}
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {caixaAtiva
              ? `Turno aberto às ${fmtTime(caixaAtiva.abertoEm)} · ${fmtDate(caixaAtiva.abertoEm)}`
              : 'Nenhum caixa aberto no momento'}
          </p>
        </div>
      </div>

      {/* Alerta quando caixa fechado */}
      {!caixaAtiva && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3"
        >
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-black text-amber-500">Caixa não iniciado</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Enquanto o caixa estiver fechado, não é possível receber pagamentos de comandas.
            </p>
          </div>
        </motion.div>
      )}

      {/* Action buttons (only when open) */}
      {caixaAtiva && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onSangria}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            <ArrowDownCircle size={14} /> Sangria
          </button>
          <button
            onClick={onSuprimento}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            <ArrowUpCircle size={14} /> Suprimento
          </button>
          <div className="ml-auto">
            <button
              onClick={onFecharCaixa}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)] hover:border-red-500/40 hover:text-red-400 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              <Lock size={14} /> Fechar Caixa
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer relative -mb-px ${
              tab === t.id
                ? 'border-sky-500 text-sky-500'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-black flex items-center justify-center">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ===== OVERVIEW ===== */}
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            {caixaAtiva && stats ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Total Vendido" value={fmtR(stats.totalVendas)} sub={`${stats.qtdVendas} venda${stats.qtdVendas !== 1 ? 's' : ''}`} cor="text-sky-500" icon={<TrendingUp size={15} />} />
                  <StatCard label="Saldo em Caixa" value={fmtR(stats.saldoEsperado)} sub="dinheiro físico esperado" cor="text-emerald-500" icon={<Banknote size={15} />} />
                  <StatCard label="Sangrias" value={fmtR(stats.totalSangrias)} cor="text-red-400" icon={<ArrowDownCircle size={15} />} />
                  <StatCard label="Duração" value={fmtDuracao(stats.duracao)} sub={`Aberto às ${fmtTime(caixaAtiva.abertoEm)}`} icon={<Clock size={15} />} />
                </div>

                {/* Breakdown por forma de pagamento */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Vendas por Forma de Pagamento</p>
                  <div className="space-y-2">
                    {[
                      { label: '💵 Dinheiro', value: stats.totalVendasDinheiro, cor: 'bg-emerald-500' },
                      { label: '⚡ Pix', value: stats.totalVendasPix, cor: 'bg-sky-400' },
                      { label: '💳 Crédito', value: stats.totalVendasCredito, cor: 'bg-purple-400' },
                      { label: '🏧 Débito', value: stats.totalVendasDebito, cor: 'bg-indigo-400' },
                    ].map(item => {
                      const pct = stats.totalVendas > 0 ? (item.value / stats.totalVendas) * 100 : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                            <span className="text-xs font-black text-[var(--text-main)]">{fmtR(item.value)}</span>
                          </div>
                          <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                              className={`h-full ${item.cor} rounded-full`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Movimentações Caixa Resumo */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Fluxo de Caixa</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">Saldo Inicial</span><span className="font-bold text-[var(--text-main)]">{fmtR(caixaAtiva.saldoInicial)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">+ Vendas em Dinheiro</span><span className="font-bold text-emerald-500">+{fmtR(stats.totalVendasDinheiro)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">+ Suprimentos</span><span className="font-bold text-emerald-500">+{fmtR(stats.totalSuprimentos)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">- Sangrias</span><span className="font-bold text-red-400">-{fmtR(stats.totalSangrias)}</span></div>
                    <div className="flex justify-between border-t border-[var(--border-color)] pt-2 mt-1">
                      <span className="font-black text-[var(--text-main)]">Saldo Esperado em Caixa</span>
                      <span className="font-black text-emerald-500 text-sm">{fmtR(stats.saldoEsperado)}</span>
                    </div>
                  </div>
                </div>

                {/* Turno Info */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Informações do Turno</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-[var(--text-muted)]">Operador</span><p className="font-bold text-[var(--text-main)] mt-0.5">{caixaAtiva.operador}</p></div>
                    <div><span className="text-[var(--text-muted)]">Abertura</span><p className="font-bold text-[var(--text-main)] mt-0.5">{fmtDate(caixaAtiva.abertoEm)} {fmtTime(caixaAtiva.abertoEm)}</p></div>
                    <div><span className="text-[var(--text-muted)]">Saldo Inicial</span><p className="font-bold text-[var(--text-main)] mt-0.5">{fmtR(caixaAtiva.saldoInicial)}</p></div>
                    {caixaAtiva.obs && <div><span className="text-[var(--text-muted)]">Obs</span><p className="font-semibold text-[var(--text-main)] mt-0.5">{caixaAtiva.obs}</p></div>}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-4">
                  <DollarSign size={28} className="text-[var(--text-muted)]" />
                </div>
                <p className="text-sm font-black text-[var(--text-main)] mb-1">Nenhum caixa aberto</p>
                <p className="text-xs text-[var(--text-muted)] mb-5 max-w-xs">
                  Abra o caixa para iniciar o turno e liberar os recebimentos de comandas.
                </p>
                <button
                  onClick={onAbrirCaixa}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#090D14] font-black text-sm rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                >
                  Abrir Caixa Agora
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== MOVIMENTAÇÕES ===== */}
        {tab === 'movimentacoes' && (
          <motion.div key="mov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Filter */}
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'venda', 'sangria', 'suprimento', 'abertura'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterTipo(f as MovimentacaoTipo | 'all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                    filterTipo === f
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-500'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-sky-500/30'
                  }`}
                >
                  {f === 'all' ? 'Todas' : TIPO_CONFIG[f as MovimentacaoTipo]?.label}
                </button>
              ))}
            </div>

            {movFiltradas.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                {!caixaAtiva ? 'Nenhum caixa aberto.' : 'Nenhuma movimentação ainda.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {movFiltradas.map(m => {
                  const cfg = TIPO_CONFIG[m.tipo];
                  const isNegativo = m.valor < 0;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-3 flex items-center gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg ${cfg.bgCor} flex items-center justify-center shrink-0`}>
                        <span className={cfg.cor}>{cfg.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${cfg.cor}`}>{cfg.label}</span>
                          {m.formaPagamento && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                              {m.formaPagamento}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate">{m.descricao}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${isNegativo ? 'text-red-400' : m.tipo === 'venda' ? 'text-sky-500' : 'text-emerald-500'}`}>
                          {isNegativo ? '' : m.tipo === 'abertura' ? '' : '+'}{fmtR(Math.abs(m.valor))}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">{fmtTime(m.criadoEm)}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ===== HISTÓRICO ===== */}
        {tab === 'historico' && (
          <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {sessoes.filter(s => s.status === 'fechado').length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)] text-xs">Nenhum caixa fechado ainda.</div>
            ) : (
              sessoes
                .filter(s => s.status === 'fechado')
                .slice()
                .reverse()
                .map(sessao => {
                  const fech = fechamentos.find(f => f.caixaId === sessao.id);
                  const expanded = expandedSessao === sessao.id;
                  return (
                    <div key={sessao.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedSessao(expanded ? null : sessao.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center shrink-0">
                          <Lock size={14} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-[var(--text-main)]">
                            {fmtDate(sessao.abertoEm)} · {fmtTime(sessao.abertoEm)} → {sessao.fechadoEm ? fmtTime(sessao.fechadoEm) : '?'}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {sessao.operador} · {fech ? fmtR(fech.totalVendas) + ' em vendas' : 'sem dados'}
                            {fech && Math.abs(fech.diferenca) > 0.01 && (
                              <span className={`ml-2 ${fech.diferenca < 0 ? 'text-red-400' : 'text-amber-500'}`}>
                                {fech.diferenca < 0 ? '⚠ Falta' : '⚠ Sobra'} {fmtR(Math.abs(fech.diferenca))}
                              </span>
                            )}
                          </p>
                        </div>
                        {expanded ? <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0" /> : <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />}
                      </button>

                      <AnimatePresence>
                        {expanded && fech && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-[var(--border-color)]"
                          >
                            <div className="px-4 py-4 grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Vendas</p>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">💵 Dinheiro</span><span className="font-bold">{fmtR(fech.totalVendasDinheiro)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">⚡ Pix</span><span className="font-bold">{fmtR(fech.totalVendasPix)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">💳 Crédito</span><span className="font-bold">{fmtR(fech.totalVendasCredito)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">🏧 Débito</span><span className="font-bold">{fmtR(fech.totalVendasDebito)}</span></div>
                                <div className="flex justify-between border-t border-[var(--border-color)] pt-1.5 mt-0.5">
                                  <span className="font-black text-[var(--text-main)]">Total</span>
                                  <span className="font-black text-sky-500">{fmtR(fech.totalVendas)}</span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Conferência</p>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Saldo Inicial</span><span className="font-bold">{fmtR(fech.saldoInicial)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Suprimentos</span><span className="font-bold text-emerald-500">+{fmtR(fech.totalSuprimentos)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Sangrias</span><span className="font-bold text-red-400">-{fmtR(fech.totalSangrias)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Esperado</span><span className="font-bold">{fmtR(fech.saldoEsperado)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Contado</span><span className="font-bold">{fmtR(fech.saldoContado)}</span></div>
                                <div className={`flex justify-between border-t border-[var(--border-color)] pt-1.5 mt-0.5 font-black ${Math.abs(fech.diferenca) < 0.01 ? 'text-emerald-500' : fech.diferenca < 0 ? 'text-red-400' : 'text-amber-500'}`}>
                                  <span>Diferença</span>
                                  <span>{fech.diferenca >= 0 ? '+' : ''}{fmtR(fech.diferenca).replace('R$ ', 'R$ ')}</span>
                                </div>
                              </div>
                              {fech.justificativa && (
                                <div className="col-span-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                  <span className="text-[10px] font-bold text-amber-500 uppercase">Justificativa: </span>
                                  <span className="text-[10px] text-[var(--text-muted)]">{fech.justificativa}</span>
                                </div>
                              )}
                              <div className="col-span-2 flex gap-3 text-[10px] text-[var(--text-muted)] border-t border-[var(--border-color)] pt-2">
                                <span>Operador: <strong className="text-[var(--text-main)]">{fech.operador}</strong></span>
                                <span>Duração: <strong className="text-[var(--text-main)]">{fmtDuracao(fech.duracao)}</strong></span>
                                <span>Vendas: <strong className="text-[var(--text-main)]">{fech.qtdVendas}</strong></span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
