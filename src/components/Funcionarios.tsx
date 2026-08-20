import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Funcionario, HistoricoItem } from '../types';
import ConfirmModal from './ConfirmModal';
import { Users, UserPlus, Search, Phone, Mail, Check, X, Edit2, Trash2, UserCheck, UserX, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface FuncionariosProps {
  restaurantId?: string;
  identifier?: string;
  funcionarios: Funcionario[];
  history: HistoricoItem[];
  onCreateFuncionario: (g: Omit<Funcionario, 'id'> & { id?: string }) => void;
  onUpdateFuncionario: (id: string, fields: Partial<Funcionario>) => void;
  onDeleteFuncionario: (id: string) => void;
}

export default function Funcionarios({ funcionarios, history, restaurantId, onCreateFuncionario, onUpdateFuncionario, onDeleteFuncionario }: FuncionariosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [formError, setFormError] = useState('');

  const getFuncionarioStats = (waiterName: string) => {
    const sales = history.filter(h => h.garcom?.toLowerCase() === waiterName.toLowerCase());
    const total = sales.reduce((s, h) => s + h.total, 0);
    const count = sales.length;
    const gObj = funcionarios.find(g => g.name.toLowerCase() === waiterName.toLowerCase());
    const commission = sales.reduce((s, h) => s + h.total * ((gObj?.commissionRate ?? 10) / 100), 0);
    return { total, count, avgTicket: count > 0 ? total / count : 0, commission };
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const openCreate = () => {
    setEditingId(null); setName(''); setUsername(''); setPassword('');
    setEmail(''); setWhatsapp(''); setFormError(''); setShowForm(true);
  };

  const openEdit = (g: Funcionario) => {
    setEditingId(g.id); setName(g.name); setUsername(g.username || '');
    setPassword(g.password || ''); setEmail(g.email || '');
    setWhatsapp(g.whatsapp || ''); setFormError(''); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) return setFormError('Nome é obrigatório.');
    if (!username.trim()) return setFormError('Usuário é obrigatório.');
    if (!password.trim()) return setFormError('Senha é obrigatória.');
    if (username.includes(' ')) return setFormError('Usuário não pode ter espaços.');
    if (password.length < 6) return setFormError('Senha deve ter ao menos 6 caracteres.');

    const dup = funcionarios.find(g =>
      g.username && g.username.toLowerCase() === username.trim().toLowerCase() && g.id !== editingId
    );
    if (dup) return setFormError(`Usuário "${username}" já está em uso por ${dup.name}.`);

    const payload = {
      name: name.trim(), username: username.trim(), password: password.trim(),
      email: email.trim(), whatsapp: whatsapp.trim(),
    };

    try {
      if (!editingId && restaurantId) {
        const { data, error } = await supabase.from('waiters').insert({
          restaurant_id: restaurantId, name: payload.name,
          code: payload.username, password: payload.password || null, phone: payload.whatsapp,
          email: payload.email, is_active: true,
        }).select().single();

        if (error) {
          // Duplicata no banco
          if (error.code === '23505') return setFormError(`Usuário "${payload.username}" já existe no sistema.`);
          console.error('Waiters insert error:', error);
          onCreateFuncionario(payload);
        } else {
          onCreateFuncionario({ ...payload, id: data.id });
        }
      } else if (editingId) {
        onUpdateFuncionario(editingId, payload);
      }
      setShowForm(false); setEditingId(null);
    } catch (err: any) {
      setFormError('Erro inesperado: ' + (err?.message || String(err)));
    }
  };

  const filtered = funcionarios.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <button onClick={openCreate} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0">
          <UserPlus size={15} /> Novo Funcionário
        </button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            type="text" placeholder="Buscar funcionário..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-sky-500 transition-colors"
          />
        </div>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} funcionário(s)</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Users size={36} className="opacity-30" />
          <p className="text-sm font-medium">Nenhum funcionário encontrado.</p>
          <button onClick={openCreate} className="text-xs text-primary hover:underline cursor-pointer">Cadastrar agora</button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Funcionário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Contato</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Comissão</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => {
                const stats = getFuncionarioStats(g.name);
                return (
                  <motion.tr
                    key={g.id} layout
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${!g.active ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-sky-600/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-sky-600">{g.name[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground leading-tight cursor-pointer hover:text-sky-500 transition-colors" onClick={() => openEdit(g)}>{g.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">@{g.username || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {g.email ? <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail size={11}/>{g.email}</p> : null}
                        {g.whatsapp ? <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone size={11}/>{g.whatsapp}</p> : null}
                        {!g.email && !g.whatsapp && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-foreground">{fmt(stats.total)}</p>
                      <p className="text-xs text-muted-foreground">{stats.count} pedido(s)</p>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <p className="font-semibold text-emerald-500">{fmt(stats.commission)}</p>
                      <p className="text-xs text-muted-foreground">Tkt médio: {fmt(stats.avgTicket)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(g)} title="Editar" className="h-8 w-8 flex items-center justify-center rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 transition-colors cursor-pointer">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => onUpdateFuncionario(g.id, { active: !g.active })} title={g.active ? 'Desativar' : 'Ativar'}
                          className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${g.active ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500'}`}>
                          {g.active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button onClick={() => setEmployeeToDelete({ id: g.id, name: g.name })} title="Excluir"
                          className="h-8 w-8 flex items-center justify-center rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={15} className="text-sky-500" />
                {editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h3>
              <button onClick={() => setShowForm(false)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground cursor-pointer">
                <X size={15} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome completo *</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border bg-background text-sm text-foreground outline-none focus:border-sky-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Usuário (login) *</label>
                  <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                    autoComplete="off" className="w-full h-9 px-3 rounded-lg border bg-background text-sm font-mono text-foreground outline-none focus:border-sky-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Senha *</label>
                  <input type="text" required value={password} autoComplete="new-password" onChange={e => setPassword(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border bg-background text-sm font-mono text-foreground outline-none focus:border-sky-500 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border bg-background text-sm text-foreground outline-none focus:border-sky-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">WhatsApp</label>
                  <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border bg-background text-sm text-foreground outline-none focus:border-sky-500 transition-colors" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 h-9 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 h-9 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer">
                  <Check size={14} /> {editingId ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={employeeToDelete !== null}
        title="Excluir Funcionário"
        message={`Excluir "${employeeToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        onConfirm={() => { if (employeeToDelete) onDeleteFuncionario(employeeToDelete.id); setEmployeeToDelete(null); }}
        onCancel={() => setEmployeeToDelete(null)}
      />
    </div>
  );
}
