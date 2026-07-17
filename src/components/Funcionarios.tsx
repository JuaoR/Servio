import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Funcionario, HistoricoItem } from '../types';
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

interface FuncionariosProps {
  funcionarios: Funcionario[];
  history: HistoricoItem[];
  onCreateFuncionario: (g: Omit<Funcionario, 'id'>) => void;
  onUpdateFuncionario: (id: string, fields: Partial<Funcionario>) => void;
  onDeleteFuncionario: (id: string) => void;
}

export default function Funcionarios({ funcionarios, history, onCreateFuncionario, onUpdateFuncionario, onDeleteFuncionario }: FuncionariosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Stats calculation
  const getFuncionarioStats = (waiterName: string) => {
    const waiterSales = history.filter(h => h.funcionario.toLowerCase() === waiterName.toLowerCase());
    const totalSalesVal = waiterSales.reduce((sum, h) => sum + h.total, 0);
    const orderCount = waiterSales.length;
    const avgTicket = orderCount > 0 ? totalSalesVal / orderCount : 0;
    
    // Find commission rate
    const gObj = funcionarios.find(g => g.name.toLowerCase() === waiterName.toLowerCase());
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
    setUsername('');
    setPassword('');
    setEmail('');
    setWhatsapp('');
    setShowForm(true);
  };

  const handleOpenEdit = (g: Funcionario) => {
    setEditingId(g.id);
    setName(g.name);
    setUsername(g.username || '');
    setPassword(g.password || '');
    setEmail(g.email || '');
    setWhatsapp(g.whatsapp || '');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    if (!username.trim()) {
      alert('Nome de usuário é obrigatório');
      return;
    }
    if (!password.trim()) {
      alert('Senha é obrigatória');
      return;
    }

    const duplicate = funcionarios.find(g => g.username.toLowerCase() === username.toLowerCase() && g.id !== editingId);
    if (duplicate) {
      alert(`O usuário "${username}" já está sendo usado por ${duplicate.name}`);
      return;
    }

    const payload = {
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim()
    };

    if (editingId) {
      onUpdateFuncionario(editingId, payload);
    } else {
      onCreateFuncionario(payload);
    }

    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string, gName: string) => {
    if (confirm(`Tem certeza de que deseja excluir o funcionário "${gName}"?`)) {
      onDeleteFuncionario(id);
    }
  };

  const filteredFuncionarios = funcionarios.filter(g => 
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-serif text-[var(--text-main)]">Equipe</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Cadastre sua brigada, gerencie taxas de comissão e acompanhe o desempenho individual.</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <UserPlus size={15} />
          <span>Cadastrar Funcionário</span>
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
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/30 border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-zinc-500 outline-none focus:border-amber-500 transition-colors text-xs"
            />
          </div>

          {/* Waiter grid cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFuncionarios.length === 0 ? (
              <div className="col-span-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-12 text-center text-[var(--text-muted)]">
                <Users size={40} className="mx-auto mb-3 opacity-30 text-amber-500" />
                <h3 className="text-sm font-bold text-[var(--text-main)]">Nenhum funcionário cadastrado</h3>
                <p className="text-xs text-zinc-500 mt-1">Clique em "Cadastrar Funcionário" para registrar seu primeiro funcionário.</p>
              </div>
            ) : (
              filteredFuncionarios.map(g => {
                const stats = getFuncionarioStats(g.name);
                return (
                  <motion.div
                    key={g.id}
                    layout
                    className={`bg-[var(--bg-card)] border ${g.active ? 'border-[var(--border-color)]' : 'border-zinc-300 opacity-75'} rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden`}
                  >
                    {/* Waiter Profile Details */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-[var(--border-color)] flex items-center justify-center font-serif text-sm text-amber-500 font-bold">
                          <Users size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-main)] leading-tight flex items-center gap-1">
                            {g.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/5 border border-amber-500/10 px-1.5 py-0.5 rounded-md mt-1 font-semibold">
                            Login: {g.username}
                          </span>
                        </div>
                      </div>

                      {/* Contact metadata */}
                      <div className="space-y-1.5 border-t border-[var(--border-color)]/40 pt-3 mb-4 text-[11px] text-zinc-500">
                        {g.whatsapp && (
                          <div className="flex items-center gap-2">
                            <Phone size={11} className="text-zinc-500 shrink-0" />
                            <span>{g.whatsapp}</span>
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
                    <div className="bg-zinc-900/30 rounded-xl p-3 grid grid-cols-2 gap-2 text-[10px] border border-[var(--border-color)]/40 mb-4">
                      <div>
                        <span className="block text-zinc-500 font-bold uppercase tracking-wider">Vendas Fechadas</span>
                        <span className="text-xs font-bold text-[var(--text-main)] font-mono mt-0.5 block">{formatCurrency(stats.sales)}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 font-bold uppercase tracking-wider">Comissão Devida</span>
                        <span className="text-xs font-bold text-emerald-500 font-mono mt-0.5 block">{formatCurrency(stats.commission)}</span>
                      </div>
                      <div className="col-span-2 pt-1.5 border-t border-[var(--border-color)]/20 flex justify-between text-zinc-500">
                        <span>Mesas/Pedidos: <strong className="text-[var(--text-main)]">{stats.count}</strong></span>
                        <span>Tkt Médio: <strong className="text-[var(--text-main)]">{formatCurrency(stats.avgTicket)}</strong></span>
                      </div>
                    </div>

                    {/* Waiter Actions row */}
                    <div className="flex justify-end items-center gap-1.5 pt-2 border-t border-[var(--border-color)]/30">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        className="p-1.5 text-zinc-500 hover:text-amber-500 hover:bg-zinc-900 rounded-md transition-all cursor-pointer"
                        title="Editar Informações"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onUpdateFuncionario(g.id, { active: !g.active })}
                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                          g.active ? 'text-zinc-500 hover:text-red-500 hover:bg-red-500/5' : 'text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/5'
                        }`}
                        title={g.active ? 'Desativar Funcionário' : 'Ativar Funcionário'}
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
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 sticky top-6">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)] mb-4">
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>{editingId ? 'Editar Funcionário' : 'Novo Funcionário'}</span>
              </h3>
              {showForm && (
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="text-zinc-500 hover:text-[var(--text-main)] cursor-pointer"
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
                  className="w-full px-3.5 py-2 bg-zinc-900/30 border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] outline-none focus:border-amber-500 font-sans"
                />
              </div>

              {/* Username e Senha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Nome de Usuário (Login)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: joaosilva"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-900/30 border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] font-mono outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Senha para Login</label>
                  <input
                    type="password"
                    required
                    placeholder="***"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-900/30 border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Email e Whatsapp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">E-mail (Opcional)</label>
                  <input
                    type="email"
                    placeholder="Ex: joao@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-900/30 border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] outline-none focus:border-amber-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">WhatsApp (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-900/30 border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 btn btn-primary flex justify-center items-center gap-1.5 text-xs font-bold"
                >
                  <Check size={14} />
                  <span>{editingId ? 'Salvar Alterações' : 'Adicionar Funcionário'}</span>
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
