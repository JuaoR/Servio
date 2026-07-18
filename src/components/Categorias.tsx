import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Categoria, Produto } from '../types';
import LucideIcon, { AVAILABLE_ICONS } from './LucideIcon';
import { Plus, Edit2, Trash2, Tag, Check } from 'lucide-react';

interface CategoriasProps {
  categories: Categoria[];
  products: Produto[];
  onCreateCategory: (c: Omit<Categoria, 'id'>) => void;
  onUpdateCategory: (id: string, c: Partial<Categoria>) => void;
  onDeleteCategory: (id: string) => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#64748B'  // Slate
];

export default function Categorias({ categories, products, onCreateCategory, onUpdateCategory, onDeleteCategory }: CategoriasProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Utensils');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setIcon('Utensils');
    setColor(PRESET_COLORS[0]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Categoria) => {
    setEditingId(c.id);
    setName(c.name);
    setIcon(c.icon);
    setColor(c.color);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      onUpdateCategory(editingId, { name, icon, color });
    } else {
      onCreateCategory({ name, icon, color });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const productCount = products.filter(p => p.cid === id).length;
    let message = 'Deseja excluir esta categoria?';
    if (productCount > 0) {
      message = `Esta categoria contém ${productCount} produto(s). Excluir mesmo assim? Todos os produtos nela ficarão sem categoria correspondente.`;
    }
    if (confirm(message)) {
      onDeleteCategory(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex justify-start bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl">
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary cursor-pointer"
        >
          <Plus size={15} />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Categoria</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Código Cor</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Produtos Associados</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#484F58]">
                    <Tag className="mx-auto mb-2" size={36} />
                    <p className="text-sm">Nenhuma categoria cadastrada.</p>
                  </td>
                </tr>
              ) : (
                categories.map(c => {
                  const prodCount = products.filter(p => p.cid === c.id).length;
                  return (
                    <tr key={c.id} className="border-b border-[var(--bg-hover)]/50 hover:bg-[var(--bg-hover)]/25 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center border"
                            style={{
                              color: c.color,
                              backgroundColor: `${c.color}15`,
                              borderColor: `${c.color}35`
                            }}
                          >
                            <LucideIcon name={c.icon} size={18} />
                          </div>
                          <span className="font-bold text-[var(--text-main)] text-sm">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded border border-white/10"
                            style={{ backgroundColor: c.color }}
                          ></span>
                          <span className="font-mono text-xs text-[var(--text-muted)]">{c.color}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-main)]">
                        <span className="inline-flex items-center justify-center bg-[var(--bg-hover)] text-[var(--text-muted)] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[var(--border-color)]">
                          {prodCount} produto(s)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-md hover:bg-[#30363D] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-md hover:bg-[#30363D] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
              <h3 className="font-bold text-[var(--text-main)] text-base">
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Bebidas"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-main)] outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Ícone
                </label>
                <div className="grid grid-cols-7 gap-1.5 p-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg max-h-[110px] overflow-y-auto">
                  {AVAILABLE_ICONS.map(icName => (
                    <button
                      key={icName}
                      type="button"
                      onClick={() => setIcon(icName)}
                      className={`p-2 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                        icon === icName
                          ? 'bg-sky-500/10 border-sky-500 text-sky-500 font-bold'
                          : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#484F58]'
                      }`}
                    >
                      <LucideIcon name={icName} size={15} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Cor de Identificação
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-6 h-6 rounded-full border border-white/10 relative transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && (
                        <span className="absolute inset-0 flex items-center justify-center text-[var(--text-main)] font-bold text-[10px]">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[#30363D] text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-[#090D14] text-xs font-bold rounded-lg cursor-pointer"
                >
                  {editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
