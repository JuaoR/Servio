import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Garcom, HistoricoItem } from '../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Award, 
  Phone, 
  Mail, 
  Plus, 
  Percent, 
  Check, 
  X, 
  Edit2, 
  Trash2, 
  UserCheck, 
  UserX,
  Sparkles,
  TrendingUp,
  DollarSign
} from 'lucide-react';

interface GarconsProps {
  garcons: Garcom[];
  history: HistoricoItem[];
  onCreateGarcom: (g: Omit<Garcom, 'id'>) => void;
  onUpdateGarcom: (id: string, fields: Partial<Garcom>) => void;
  onDeleteGarcom: (id: string) => void;
}

export default function Garcons({ garcons, history, onCreateGarcom, onUpdateGarcom, onDeleteGarcom }: GarconsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commissionRate, setCommissionRate] = useState(10);
  const [active, setActive] = useState(true);

  // Stats calculation
  const getGarcomStats = (waiterName: string) => {
    const waiterSales = history.filter(h => h.garcom.toLowerCase() === waiterName.toLowerCase());
    const totalSalesVal = waiterSales.reduce((sum, h) => sum + h.total, 0);
    const orderCount = waiterSales.length;
    const avgTicket = orderCount > 0 ? totalSalesVal / orderCount : 0;
    
    // Find commission rate
    const gObj = garcons.find(g => g.name.toLowerCase() === waiterName.toLowerCase());
    const rate = gObj ? gObj.commissionRate : 10;
    const totalCommission = waiterSales.reduce((sum, h) => {
      const commRate = gObj ? gObj.commissionRate : 10;
      return sum + (h.total * (commRate / 100));
    }, 0);

    return {
      sales: totalSalesVal,
      count: orderCount,
      avgTicket,
      commission: totalCommission
    };
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    // Generate next default numerical code
    const maxCode = garcons.reduce((max, g) => {
      const num = parseInt(g.code, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    setCode(String(maxCode + 1));
    setPhone('');
    setEmail('');
    setCommissionRate(10);
    setActive(true);
    setShowForm(true);
  };

  const handleOpenEdit = (g: Garcom) => {
    setEditingId(g.id);
    setName(g.name);
    setCode(g.code);
    setPhone(g.phone);
    setEmail(g.email);
    setCommissionRate(g.commissionRate);
    setActive(g.active);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    if (!code.trim()) {
      alert('Código é obrigatório');
      return;
    }

    // Check if code is already in use by another waiter
    const duplicate = garcons.find(g => g.code === code && g.id !== editingId);
    if (duplicate) {
      alert(`O código "${code}" já está sendo usado por ${duplicate.name}`);
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim(),
      phone: phone.trim(),
      email: email.trim(),
      commissionRate: Number(commissionRate) || 0,
      active
    };

    if (editingId) {
      onUpdateGarcom(editingId, payload);
    } else {
      onCreateGarcom(payload);
    }

    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string, gName: string) => {
    if (confirm(`Tem certeza de que deseja excluir o garçom "${gName}"?`)) {
      onDeleteGarcom(id);
    }
  };

  const filteredGarcons = garcons.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.code.includes(searchTerm) ||
    g.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return 'R$ ' + val.toFixed(2).replace('.', ',');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#161B22] border border-[#30363D] p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-serif text-zinc-100">Equipe de Garçons</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Cadastre sua brigada, gerencie taxas de comissão e acompanhe o desempenho individual.</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <UserPlus size={15} />
          <span>Cadastrar Garçom</span>
        </button>
      </div>

      {/* Grid Layout containing Form and Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Waiters list representation - takes 2 cols if form is hidden or 2 cols anyway */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#30363D] rounded-xl text-[#E6EDF3] placeholder-zinc-500 outline-none focus:border-amber-500 transition-colors text-xs"
            />
          </div>

          {/* Waiter grid cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGarcons.length === 0 ? (
              <div className="col-span-full bg-[#161B22] border border-[#30363D] rounded-2xl p-12 text-center text-[#8B949E]">
                <Users size={40} className="mx-auto mb-3 opacity-30 text-amber-500" />
                <h3 className="text-sm font-bold text-zinc-100">Nenhum garçom cadastrado</h3>
                <p className="text-xs text-zinc-500 mt-1">Clique em "Cadastrar Garçom" para registrar seu primeiro funcionário.</p>
              </div>
            ) : (
              filteredGarcons.map(g => {
                const stats = getGarcomStats(g.name);
                return (
                  <motion.div
                    key={g.id}
                    layout
                    className={`bg-[#161B22] border ${g.active ? 'border-[#30363D]' : 'border-zinc-300 opacity-75'} rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden`}
                  >
                    {/* Active/Inactive badge absolute top */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${g.active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></span>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">
                        {g.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {/* Waiter Profile Details */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-[#30363D] flex items-center justify-center font-serif text-sm text-amber-500 font-bold">
                          {g.code}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100 leading-tight flex items-center gap-1">
                            {g.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/5 border border-amber-500/10 px-1.5 py-0.5 rounded-md mt-1 font-semibold">
                            <Percent size={10} /> Comissão: {g.commissionRate}%
                          </span>
                        </div>
                      </div>

                      {/* Contact metadata */}
                      <div className="space-y-1.5 border-t border-[#30363D]/40 pt-3 mb-4 text-[11px] text-zinc-500">
                        {g.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={11} className="text-zinc-500 shrink-0" />
                            <span>{g.phone}</span>
                          </div>
                        )}
                        {g.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={11} className="text-zinc-500 shrink-0 animate-none" />
                            <span className="truncate">{g.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Live stats block */}
                    <div className="bg-zinc-900/30 rounded-xl p-3 grid grid-cols-2 gap-2 text-[10px] border border-[#30363D]/40 mb-4">
                      <div>
                        <span className="block text-zinc-500 font-bold uppercase tracking-wider">Vendas Fechadas</span>
                        <span className="text-xs font-bold text-zinc-100 font-mono mt-0.5 block">{formatCurrency(stats.sales)}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 font-bold uppercase tracking-wider">Comissão Devida</span>
                        <span className="text-xs font-bold text-emerald-500 font-mono mt-0.5 block">{formatCurrency(stats.commission)}</span>
                      </div>
                      <div className="col-span-2 pt-1.5 border-t border-[#30363D]/20 flex justify-between text-zinc-500">
                        <span>Mesas/Pedidos: <strong className="text-zinc-100">{stats.count}</strong></span>
                        <span>Tkt Médio: <strong className="text-zinc-100">{formatCurrency(stats.avgTicket)}</strong></span>
                      </div>
                    </div>

                    {/* Waiter Actions row */}
                    <div className="flex justify-end items-center gap-1.5 pt-2 border-t border-[#30363D]/30">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        className="p-1.5 text-zinc-500 hover:text-amber-500 hover:bg-zinc-900 rounded-md transition-all cursor-pointer"
                        title="Editar Informações"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onUpdateGarcom(g.id, { active: !g.active })}
                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                          g.active ? 'text-zinc-500 hover:text-red-500 hover:bg-red-500/5' : 'text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/5'
                        }`}
                        title={g.active ? 'Desativar Garçom' : 'Ativar Garçom'}
                      >
                        {g.active ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(g.id, g.name)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-md transition-all cursor-pointer"
                        title="Excluir Definitivamente"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Form panel column (Side drawer style) */}
        <div>
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 sticky top-6">
            <div className="flex justify-between items-center pb-3 border-b border-[#30363D] mb-4">
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>{editingId ? 'Editar Garçom' : 'Novo Garçom'}</span>
              </h3>
              {showForm && (
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="text-zinc-500 hover:text-zinc-100 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-900/30 border border-[#30363D] rounded-xl text-xs text-[#E6EDF3] outline-none focus:border-amber-500 font-sans"
                />
              </div>

              {/* Codigo e Taxa de comissao */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Código de Atendimento</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 05"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-900/30 border border-[#30363D] rounded-xl text-xs text-[#E6EDF3] font-mono outline-none focus:border-amber-500 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Comissão (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      placeholder="10"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full pl-3 pr-8 py-2 bg-zinc-900/30 border border-[#30363D] rounded-xl text-xs text-[#E6EDF3] font-mono outline-none focus:border-amber-500 text-right"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500 text-xs font-mono">
                      %
                    </div>
                  </div>
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Telefone de Contato</label>
                <input
                  type="text"
                  placeholder="Ex: (11) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-900/30 border border-[#30363D] rounded-xl text-xs text-[#E6EDF3] outline-none focus:border-amber-500 font-sans"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">E-mail Corporativo</label>
                <input
                  type="email"
                  placeholder="Ex: joao@restaurante.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-900/30 border border-[#30363D] rounded-xl text-xs text-[#E6EDF3] outline-none focus:border-amber-500 font-sans"
                />
              </div>

              {/* Status toggler in form */}
              <div className="flex items-center justify-between p-3 bg-zinc-900/20 border border-[#30363D]/40 rounded-xl">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Garçom Ativo para Lançamentos</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Form buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 btn btn-primary flex justify-center items-center gap-1.5 text-xs font-bold"
                >
                  <Check size={14} />
                  <span>{editingId ? 'Salvar Alterações' : 'Adicionar Garçom'}</span>
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingId(null); }}
                    className="btn btn-secondary text-xs"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
