import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HistoricoItem, Categoria, Produto, Garcom } from '../types';
import { 
  Calendar, 
  Search, 
  CreditCard, 
  Download, 
  Trash2, 
  TrendingUp, 
  Award, 
  DollarSign, 
  RefreshCw, 
  Eye, 
  X, 
  Users, 
  Percent, 
  Trophy, 
  Sparkles, 
  Receipt,
  UserCheck
} from 'lucide-react';

interface HistoricoProps {
  history: HistoricoItem[];
  categories: Categoria[];
  products: Produto[];
  onClearHistory: () => void;
  garcons?: Garcom[];
}

export default function Historico({ history, categories, products, onClearHistory, garcons = [] }: HistoricoProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'garcons'>('geral');
  const [filterDate, setFilterDate] = useState('');
  const [filterWaiter, setFilterWaiter] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState<HistoricoItem | null>(null);

  // Waiter dashboard selection
  const [selectedWaiterDetail, setSelectedWaiterDetail] = useState<string>('all');

  const PAYMENT_LABELS: Record<string, { ic: string; lb: string }> = {
    dinheiro: { ic: '💵', lb: 'Dinheiro' },
    credito: { ic: '💳', lb: 'Crédito' },
    debito: { ic: '🏧', lb: 'Débito' },
    pix: { ic: '⚡', lb: 'Pix' }
  };

  const formatCurrency = (val: number) => {
    return 'R$ ' + val.toFixed(2).replace('.', ',');
  };

  // 1. FILTER LOGIC FOR GENERAL TAB
  let recs = [...history].sort((a, b) => b.closedAt - a.closedAt);

  if (filterDate) {
    recs = recs.filter(h => {
      const recDate = new Date(h.closedAt).toISOString().slice(0, 10);
      return recDate === filterDate;
    });
  }

  if (filterWaiter.trim()) {
    recs = recs.filter(h => h.garcom.toLowerCase().includes(filterWaiter.toLowerCase()));
  }

  if (filterMethod !== 'all') {
    recs = recs.filter(h => h.payMethod === filterMethod);
  }

  // 2. METRICS
  const filteredRevenue = recs.reduce((sum, h) => sum + h.total, 0);
  const filteredTicket = recs.length > 0 ? filteredRevenue / recs.length : 0;
  const overallRevenue = history.reduce((sum, h) => sum + h.total, 0);

  // Top Products
  const productRevenue: Record<string, number> = {};
  recs.forEach(h => {
    h.items.forEach(it => {
      productRevenue[it.name] = (productRevenue[it.name] || 0) + (it.price * it.qty);
    });
  });
  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Payment break-down
  const paymentRevenue: Record<string, number> = {};
  recs.forEach(h => {
    paymentRevenue[h.payMethod] = (paymentRevenue[h.payMethod] || 0) + h.total;
  });

  // 3. COMPREHENSIVE WAITER METRICS CALCULATIONS
  // Compile list of unique waiters who have sold, merged with registered waiters
  const allWaiterNames = Array.from(new Set([
    ...garcons.map(g => g.name),
    ...history.map(h => h.garcom).filter(Boolean)
  ]));

  const waiterAnalytics = allWaiterNames.map(name => {
    const waiterOrders = history.filter(h => h.garcom.toLowerCase() === name.toLowerCase());
    const totalSales = waiterOrders.reduce((sum, h) => sum + h.total, 0);
    const orderCount = waiterOrders.length;
    const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;
    
    // Find registered waiter details
    const waiterReg = garcons.find(g => g.name.toLowerCase() === name.toLowerCase());
    const commRate = waiterReg ? waiterReg.commissionRate : 10; // Default to 10%
    
    const commissionEarned = waiterOrders.reduce((sum, h) => {
      return sum + (h.total * (commRate / 100));
    }, 0);

    const activeStatus = waiterReg ? waiterReg.active : true;
    const code = waiterReg ? waiterReg.code : '—';

    return {
      name,
      code,
      totalSales,
      orderCount,
      avgTicket,
      commissionRate: commRate,
      commissionEarned,
      activeStatus
    };
  }).sort((a, b) => b.totalSales - a.totalSales);

  // Identify Best Waiter of the period
  const bestWaiter = waiterAnalytics.length > 0 && waiterAnalytics[0].totalSales > 0 ? waiterAnalytics[0] : null;

  // Waiter metrics aggregates
  const totalStaffCommissions = waiterAnalytics.reduce((sum, w) => sum + w.commissionEarned, 0);

  // Chart calculation for top waiters
  const maxWaiterSales = Math.max(...waiterAnalytics.map(w => w.totalSales), 1);

  // Chart days
  const chartDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    
    const dayRevenue = history
      .filter(h => new Date(h.closedAt).toDateString() === dayStr)
      .reduce((sum, h) => sum + h.total, 0);

    chartDays.push({
      label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
      value: dayRevenue,
      isToday: i === 0
    });
  }
  const maxChartVal = Math.max(...chartDays.map(d => d.value), 1);

  // Export CSV Action
  const handleExportCSV = () => {
    if (history.length === 0) {
      alert('Sem dados para exportar!');
      return;
    }
    const rows = [['ID Comanda', 'Mesa', 'Garcom', 'Itens', 'Subtotal', 'Desconto', 'Total', 'Pagamento', 'Abertura', 'Fechamento']];
    history.forEach(h => {
      rows.push([
        String(h.cmdId),
        h.mesa,
        h.garcom,
        h.items.map(it => `${it.qty}x ${it.name}`).join('; '),
        h.subtotal.toFixed(2),
        h.discount.toFixed(2),
        h.total.toFixed(2),
        PAYMENT_LABELS[h.payMethod]?.lb || h.payMethod,
        new Date(h.openedAt).toLocaleString('pt-BR'),
        new Date(h.closedAt).toLocaleString('pt-BR')
      ]);
    });

    const csvContent = rows.map(r => r.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_servio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = () => {
    if (confirm('Tem certeza de que deseja apagar TODO o histórico de vendas permanentemente?')) {
      onClearHistory();
    }
  };

  // Waiter details ledger selection
  const selectedWaiterData = selectedWaiterDetail !== 'all' 
    ? history.filter(h => h.garcom.toLowerCase() === selectedWaiterDetail.toLowerCase()).sort((a,b) => b.closedAt - a.closedAt)
    : history.sort((a,b) => b.closedAt - a.closedAt);

  return (
    <div className="space-y-6">
      
      {/* 1. TABS SELECTOR AT TOP */}
      <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('geral')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'geral'
              ? 'bg-emerald-600 text-[var(--text-main)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <TrendingUp size={14} />
          <span>Visão Geral e Vendas</span>
        </button>
        <button
          onClick={() => setActiveTab('garcons')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'garcons'
              ? 'bg-emerald-600 text-[var(--text-main)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Users size={14} />
          <span>Desempenho de Garçons</span>
        </button>
      </div>

      {/* TAB 1: VISÃO GERAL */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Faturamento (Filtrado)</p>
              <h3 className="text-2xl font-black text-amber-500 mt-1">{formatCurrency(filteredRevenue)}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-2">{recs.length} comanda(s) encontradas</p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ticket Médio (Filtrado)</p>
              <h3 className="text-2xl font-black text-purple-600 mt-1">{formatCurrency(filteredTicket)}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-2">Valor médio por comanda</p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 border-l-4 border-l-emerald-500">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Histórico Geral Acumulado</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(overallRevenue)}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-2">{history.length} comanda(s) no total geral</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Reports & Filters column */}
            <div className="lg:col-span-3 space-y-4">
              {/* Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl">
                <div className="flex flex-wrap gap-2.5">
                  {/* Date */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Data de Venda</span>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-white border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[#2D251E] outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  {/* Waiter */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Garçom</span>
                    <input
                      type="text"
                      placeholder="Nome do garçom..."
                      value={filterWaiter}
                      onChange={(e) => setFilterWaiter(e.target.value)}
                      className="bg-white border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[#2D251E] placeholder-zinc-400 outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Method */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Forma de Pagto</span>
                    <select
                      value={filterMethod}
                      onChange={(e) => setFilterMethod(e.target.value)}
                      className="bg-white border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[#2D251E] outline-none focus:border-amber-500"
                    >
                      <option value="all">Todos os Pagamentos</option>
                      {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.ic} {v.lb}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end">
                  {(filterDate || filterWaiter || filterMethod !== 'all') && (
                    <button
                      onClick={() => {
                        setFilterDate('');
                        setFilterWaiter('');
                        setFilterMethod('all');
                      }}
                      className="px-3 py-1.5 text-xs bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg border border-[var(--border-color)] transition-colors cursor-pointer"
                    >
                      ✕ Limpar
                    </button>
                  )}
                  <button
                    onClick={handleExportCSV}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>

              {/* Bar Chart section */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
                <h3 className="text-sm font-bold text-[#2D251E] mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-amber-500" />
                  <span>Desempenho de Vendas - Últimos 7 dias</span>
                </h3>

                {/* Custom pure React dynamic Chart representation */}
                <div className="h-44 flex items-end gap-3 sm:gap-6 pt-6 px-2 border-b border-[var(--border-color)]">
                  {chartDays.map((d, i) => {
                    const percent = (d.value / maxChartVal) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full group relative">
                        {/* Val popup */}
                        {d.value > 0 && (
                          <div className="absolute top-[-24px] opacity-0 group-hover:opacity-100 transition-opacity bg-[#2D251E] border border-[var(--border-color)] px-2 py-0.5 rounded text-[10px] text-[var(--text-main)] font-bold whitespace-nowrap z-10 shadow-lg">
                            R$ {d.value.toFixed(0)}
                          </div>
                        )}

                        {/* Bar graphic representation */}
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className={`w-full rounded-t-md transition-all duration-500 relative cursor-pointer ${
                              d.isToday
                                ? 'bg-amber-500 opacity-90 group-hover:opacity-100'
                                : 'bg-emerald-500/80 group-hover:bg-emerald-500'
                            }`}
                            style={{ height: d.value > 0 ? `${percent}%` : '4px' }}
                          >
                          </div>
                        </div>

                        {/* Label */}
                        <span className="text-[10px] text-[var(--text-muted)] mt-2 block font-medium truncate max-w-full">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Table history */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] bg-[#FAF7F2]">
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ID</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Mesa</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Garçom</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Consumo</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Pagto</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Desconto</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-[#484F58]">
                            <Calendar className="mx-auto mb-2 text-zinc-400" size={32} />
                            <p className="text-sm">Nenhum registro de fechamento encontrado.</p>
                          </td>
                        </tr>
                      ) : (
                        recs.map(h => {
                          const pay = PAYMENT_LABELS[h.payMethod] || { ic: '❓', lb: h.payMethod };
                          const totalItems = h.items.reduce((sum, item) => sum + item.qty, 0);
                          return (
                            <tr key={h.id} className="border-b border-[#EAE3D5] hover:bg-[#FAF7F2] transition-colors">
                              <td className="py-3 px-4 font-bold text-[#2D251E]">#{h.cmdId}</td>
                              <td className="py-3 px-4 text-zinc-700">{h.mesa || '—'}</td>
                              <td className="py-3 px-4 text-zinc-700 font-medium">{h.garcom || '—'}</td>
                              <td className="py-3 px-4 text-zinc-600 text-xs">{totalItems} item(s)</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-white border border-[var(--border-color)] text-[var(--text-muted)]">
                                  <span>{pay.ic}</span>
                                  <span>{pay.lb}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs font-bold text-red-500">
                                {h.discount > 0 ? `-R$ ${h.discount.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-3 px-4 font-extrabold text-amber-500">{formatCurrency(h.total)}</td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => setSelectedReceipt(h)}
                                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-[#2D251E] rounded-md border border-[var(--border-color)] transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Eye size={12} />
                                  <span>Ver</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right side panels */}
            <div className="space-y-4">
              {/* Top products */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                <h4 className="text-xs font-bold text-[#2D251E] mb-3 flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                  <Award size={14} className="text-amber-500" />
                  <span>🏆 Top 5 Produtos (Vendas)</span>
                </h4>
                {topProducts.length === 0 ? (
                  <p className="text-[11px] text-zinc-500">Sem vendas para exibir.</p>
                ) : (
                  <div className="space-y-2">
                    {topProducts.map(([name, val], i) => (
                      <div key={name} className="flex justify-between items-center text-xs">
                        <span className="text-zinc-700 truncate max-w-[120px]">
                          {i + 1}. {name}
                        </span>
                        <span className="font-bold text-amber-500">{formatCurrency(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment break-down */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                <h4 className="text-xs font-bold text-[#2D251E] mb-3 flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                  <CreditCard size={14} className="text-blue-500" />
                  <span>💳 Por Pagamento</span>
                </h4>
                {Object.keys(paymentRevenue).length === 0 ? (
                  <p className="text-[11px] text-zinc-500">Sem dados de receita.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(paymentRevenue).map(([key, val]) => {
                      const label = PAYMENT_LABELS[key] || { ic: '❓', lb: key };
                      return (
                        <div key={key} className="flex justify-between items-center text-xs">
                          <span className="text-zinc-700">
                            {label.ic} {label.lb}
                          </span>
                          <span className="font-extrabold text-[#2D251E]">{formatCurrency(val as number)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action box */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Ações Administrativas</h4>
                <button
                  onClick={handleExportCSV}
                  className="w-full py-2 bg-zinc-100 border border-[var(--border-color)] text-[#2D251E] hover:bg-zinc-200 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download size={13} />
                  <span>Exportar Backup CSV</span>
                </button>
                <button
                  onClick={handleClearHistory}
                  className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-[var(--text-main)] text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Limpar Histórico</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETALHAMENTO DE GARÇONS (ESTILO CONSUMER) */}
      {activeTab === 'garcons' && (
        <div className="space-y-6">
          
          {/* Quick Metrics of the Waitstaff */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 border-l-4 border-l-amber-500">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Faturamento Total do Staff</span>
              <h3 className="text-2xl font-black text-[#2D251E] mt-1">{formatCurrency(overallRevenue)}</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Acumulado de todas as comadas</p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 border-l-4 border-l-emerald-500">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total de Comissões Devidas</span>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totalStaffCommissions)}</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Calculado sobre a taxa de cada um</p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 border-l-4 border-l-purple-500">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Média de Comissão</span>
              <h3 className="text-2xl font-black text-purple-600 mt-1">
                {formatCurrency(waiterAnalytics.length > 0 ? totalStaffCommissions / waiterAnalytics.length : 0)}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Média por garçom ativo</p>
            </div>

            {/* Best Waiter Feature Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 border-l-4 border-l-blue-500 relative overflow-hidden">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Destaque do Período 🏆</span>
              {bestWaiter ? (
                <>
                  <h3 className="text-lg font-black text-[#2D251E] mt-1 truncate">{bestWaiter.name}</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Vendeu <strong className="text-amber-500">{formatCurrency(bestWaiter.totalSales)}</strong></p>
                </>
              ) : (
                <p className="text-xs text-[var(--text-muted)] mt-2">Nenhum lançamento registrado</p>
              )}
              <Trophy size={45} className="absolute right-2 bottom-1 text-amber-500/10 shrink-0" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Leaderboard panel / Rankings list */}
            <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-sm font-bold text-[#2D251E] flex items-center gap-1.5">
                    <Trophy className="text-amber-500" size={16} />
                    <span>Ranking de Vendas por Garçom</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Comparativo de performance e volume de fechamentos.</p>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full uppercase">Relatório Analítico</span>
              </div>

              {waiterAnalytics.length === 0 ? (
                <p className="text-xs text-center py-12 text-[var(--text-muted)]">Nenhum lançamento no histórico associado a garçons.</p>
              ) : (
                <div className="space-y-4 pt-2">
                  {waiterAnalytics.map((w, index) => {
                    const pct = overallRevenue > 0 ? (w.totalSales / overallRevenue) * 100 : 0;
                    return (
                      <div key={w.name} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            {/* Medal badge style */}
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              index === 0 ? 'bg-amber-500 text-[var(--text-main)]' : index === 1 ? 'bg-zinc-300 text-zinc-800' : index === 2 ? 'bg-amber-700 text-[var(--text-main)]' : 'bg-zinc-100 text-zinc-500'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-bold text-[#2D251E]">{w.name}</span>
                            <span className="text-[9px] text-[var(--text-muted)] font-mono">({w.orderCount} mesas)</span>
                          </div>
                          
                          <div className="text-right">
                            <span className="font-black text-[#2D251E] font-mono">{formatCurrency(w.totalSales)}</span>
                            
                          </div>
                        </div>

                        {/* Progress Bar visual indicator */}
                        <div className="w-full h-2.5 bg-zinc-100 border border-zinc-200/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              index === 0 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : index === 1 ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span>Percentual no Faturamento: <strong>{pct.toFixed(1)}%</strong></span>
                          <span>Ticket Médio: <strong>{formatCurrency(w.avgTicket)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Individual ledger report filter card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col justify-between h-full">
              <div>
                <h4 className="text-xs font-bold text-[#2D251E] pb-2 border-b border-[var(--border-color)] uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={14} className="text-amber-500" />
                  <span>Filtro de Extrato Individual</span>
                </h4>

                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Selecione o Garçom</label>
                    <select
                      value={selectedWaiterDetail}
                      onChange={(e) => setSelectedWaiterDetail(e.target.value)}
                      className="w-full p-2 bg-white border border-[var(--border-color)] rounded-xl text-xs text-[#2D251E]"
                    >
                      <option value="all">-- Todos os Garçons --</option>
                      {allWaiterNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Summary of selection */}
                  {selectedWaiterDetail !== 'all' && (
                    <div className="bg-[#FAF7F2] border border-[#E9E3D5] p-3.5 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-semibold">Faturamento Individual:</span>
                        <span className="font-extrabold text-[#2D251E]">
                          {formatCurrency(waiterAnalytics.find(w => w.name.toLowerCase() === selectedWaiterDetail.toLowerCase())?.totalSales || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-semibold">Comissão Devida:</span>
                        <span className="font-extrabold text-emerald-600">
                          {formatCurrency(waiterAnalytics.find(w => w.name.toLowerCase() === selectedWaiterDetail.toLowerCase())?.commissionEarned || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-semibold">Mesas Atendidas:</span>
                        <span className="font-extrabold text-[#2D251E]">
                          {waiterAnalytics.find(w => w.name.toLowerCase() === selectedWaiterDetail.toLowerCase())?.orderCount || 0} mesas
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-semibold">Ticket Médio:</span>
                        <span className="font-extrabold text-purple-600">
                          {formatCurrency(waiterAnalytics.find(w => w.name.toLowerCase() === selectedWaiterDetail.toLowerCase())?.avgTicket || 0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-color)] mt-6">
                <p className="text-[10px] text-zinc-500 leading-relaxed italic text-center">
                  Utilize o extrato individual para emitir relatórios de fechamento de caixa e pagamentos de comissão.
                </p>
              </div>
            </div>

          </div>

          {/* Detailed Waiter Transaction Ledger */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-sm font-bold text-[#2D251E] flex items-center gap-1.5">
                  <UserCheck className="text-emerald-500" size={16} />
                  <span>Livro de Lançamentos por Garçom</span>
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Extrato analítico de fechamentos com comissões detalhadas.</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500 font-bold bg-[#FAF7F2] px-3 py-1 border border-[#E9E3D5] rounded-lg">
                  {selectedWaiterData.length} lançamento(s) {selectedWaiterDetail !== 'all' ? `de ${selectedWaiterDetail}` : ''}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[#FAF7F2]">
                    <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Fechamento</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Mesa</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Garçom</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Método</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Faturamento</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Taxa</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Comissão</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedWaiterData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#484F58]">
                        <Receipt className="mx-auto mb-2 text-zinc-400 animate-none" size={32} />
                        <p className="text-xs font-semibold">Nenhum lançamento no histórico.</p>
                      </td>
                    </tr>
                  ) : (
                    selectedWaiterData.map(h => {
                      const pay = PAYMENT_LABELS[h.payMethod] || { ic: '❓', lb: h.payMethod };
                      
                      // Calculate commission specifically
                      const matchedGarcom = garcons.find(g => g.name.toLowerCase() === h.garcom.toLowerCase());
                      const rate = matchedGarcom ? matchedGarcom.commissionRate : 10;
                      const orderCommission = h.total * (rate / 100);

                      return (
                        <tr key={h.id} className="border-b border-[#EAE3D5] hover:bg-[#FAF7F2] transition-colors">
                          <td className="py-3 px-4 font-semibold text-zinc-500">
                            {new Date(h.closedAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#2D251E]">Mesa / Comanda #{h.cmdId} {h.mesa ? `(${h.mesa})` : ''}</td>
                          <td className="py-3 px-4 text-[#2D251E] font-medium">{h.garcom || '—'}</td>
                          <td className="py-3 px-4 text-[var(--text-muted)]">
                            {pay.ic} {pay.lb}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-zinc-800">{formatCurrency(h.total)}</td>
                          <td className="py-3 px-4 text-center font-mono text-zinc-500 font-bold">{rate}%</td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600">{formatCurrency(orderCommission)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedReceipt(h)}
                              className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 border border-[var(--border-color)] text-[10px] font-bold text-[#2D251E] rounded-md transition-all cursor-pointer"
                            >
                              Detalhar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Selected Receipt Detail Dialog Overlay (Global to both tabs) */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[#FAF7F2]">
              <div>
                <h3 className="font-bold text-[#2D251E] text-sm">Detalhamento Comanda #{selectedReceipt.cmdId}</h3>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {new Date(selectedReceipt.closedAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-zinc-500 hover:text-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 border border-[#EAE3D5] p-3 rounded-lg">
                <div>
                  <span className="block text-[10px] text-zinc-500 font-bold uppercase">Mesa</span>
                  <span className="text-[#2D251E] font-semibold">{selectedReceipt.mesa || '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500 font-bold uppercase">Garçom</span>
                  <span className="text-[#2D251E] font-semibold">{selectedReceipt.garcom || '—'}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-[#EAE3D5] mt-1">
                  <span className="block text-[10px] text-zinc-500 font-bold uppercase">Forma Pagto</span>
                  <span className="inline-flex items-center gap-1 mt-0.5 font-bold text-emerald-600">
                    {PAYMENT_LABELS[selectedReceipt.payMethod]?.ic || '❓'}{' '}
                    {PAYMENT_LABELS[selectedReceipt.payMethod]?.lb || selectedReceipt.payMethod}
                  </span>
                </div>
              </div>

              {selectedReceipt.obs && (
                <div className="p-2.5 bg-[#FAF7F2] text-xs text-amber-600 rounded border border-amber-500/10">
                  📝 Obs: {selectedReceipt.obs}
                </div>
              )}

              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Itens Consumidos
                </span>
                {selectedReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1 border-b border-[#FAF7F2] text-[#2D251E]">
                    <div>
                      <span>{it.qty}x {it.name}</span>
                      {it.note && <span className="block text-[10px] text-amber-600">↳ Obs: {it.note}</span>}
                    </div>
                    <span className="font-bold">R$ {(it.price * it.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] text-xs space-y-1.5 font-sans">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span>R$ {selectedReceipt.subtotal.toFixed(2)}</span>
                </div>
                {selectedReceipt.discount > 0 && (
                  <div className="flex justify-between text-red-500 font-semibold">
                    <span>Desconto</span>
                    <span>-R$ {selectedReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-amber-500 pt-2 border-t border-[var(--border-color)] mt-1.5">
                  <span>Total Pago</span>
                  <span>{formatCurrency(selectedReceipt.total)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border-color)] bg-[#FAF7F2] flex justify-end">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-[#2D251E] hover:bg-black text-[var(--text-main)] text-xs font-bold rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
