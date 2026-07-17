import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Produto, Categoria } from '../types';
import { Search, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Coffee, Info } from 'lucide-react';

interface ProdutosProps {
  products: Produto[];
  categories: Categoria[];
  onCreateProduct: (p: Omit<Produto, 'id'>) => void;
  onUpdateProduct: (id: string, p: Partial<Produto>) => void;
  onDeleteProduct: (id: string) => void;
}

export default function Produtos({ products, categories, onCreateProduct, onUpdateProduct, onDeleteProduct }: ProdutosProps) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [cid, setCid] = useState('');
  const [price, setPrice] = useState('');
  const [avail, setAvail] = useState(true);

  const getCategory = (catId: string) => {
    return categories.find(c => c.id === catId) || { name: '—', color: '#666', icon: 'HelpCircle' };
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setCid(categories[0]?.id || '');
    setPrice('');
    setAvail(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Produto) => {
    setEditingId(p.id);
    setName(p.name);
    setCid(p.cid);
    setPrice(String(p.price));
    setAvail(p.avail);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!cid) return;
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) return;

    if (editingId) {
      onUpdateProduct(editingId, { name, cid, price: numericPrice, avail });
    } else {
      onCreateProduct({ name, cid, price: numericPrice, avail });
    }
    setIsModalOpen(false);
  };

  const handleToggleAvail = (p: Produto) => {
    onUpdateProduct(p.id, { avail: !p.avail });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      onDeleteProduct(id);
    }
  };

  // Filter logic
  let filtered = products;
  if (selectedCat !== 'all') {
    filtered = filtered.filter(p => p.cid === selectedCat);
  }
  if (search.trim()) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3.5 top-2.5 text-[var(--text-muted)]" size={15} />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[var(--text-main)] placeholder-[#484F58] outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] outline-none focus:border-amber-500"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-primary self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Products Table Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Produto</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Categoria</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Preço</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#484F58]">
                    <Coffee className="mx-auto mb-2" size={36} />
                    <p className="text-sm">Nenhum produto cadastrado.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const catInfo = getCategory(p.cid);
                  return (
                    <tr key={p.id} className="border-b border-[var(--bg-hover)]/50 hover:bg-[var(--bg-hover)]/25 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[var(--text-main)]">{p.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                          style={{
                            color: catInfo.color,
                            backgroundColor: `${catInfo.color}12`,
                            borderColor: `${catInfo.color}22`
                          }}
                        >
                          {catInfo.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-500">
                        R$ {p.price.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          onClick={() => handleToggleAvail(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all ${
                            p.avail
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                          }`}
                        >
                          {p.avail ? '● Disponível' : '○ Indisponível'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-md hover:bg-[#30363D] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
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

      {/* Modal: Add/Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
              <h3 className="font-bold text-[var(--text-main)] text-base">
                {editingId ? 'Editar Produto' : 'Novo Produto'}
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
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Picanha Grelhada"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Categoria *
                </label>
                <select
                  required
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={avail ? '1' : '0'}
                    onChange={(e) => setAvail(e.target.value === '1')}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                  >
                    <option value="1">Disponível</option>
                    <option value="0">Indisponível</option>
                  </select>
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
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-[#090D14] text-xs font-bold rounded-lg cursor-pointer"
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
