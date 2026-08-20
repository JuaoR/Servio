import React, { useState } from 'react';
import { Produto, Categoria } from '../types';
import ConfirmModal from './ConfirmModal';
import { Search, Plus, Edit2, Trash2, Coffee } from 'lucide-react';

interface ProdutosProps {
  products: Produto[];
  categories: Categoria[];
  onCreateProduct: (p: Omit<Produto, 'id'>) => void;
  onUpdateProduct: (id: string, p: Partial<Produto>) => void;
  onDeleteProduct: (id: string) => void;
  isEmployee?: boolean;
}

export default function Produtos({ products, categories, onCreateProduct, onUpdateProduct, onDeleteProduct, isEmployee = false }: ProdutosProps) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [cid, setCid] = useState('');
  const [price, setPrice] = useState('');
  const [avail, setAvail] = useState(true);

  const getCategory = (id: string) => categories.find(c => c.id === id) || { name: '—', color: '#666', icon: 'HelpCircle' };
  const filtered = products.filter(p => (selectedCat === 'all' || p.cid === selectedCat) && (!search.trim() || p.name.toLowerCase().includes(search.toLowerCase())));

  const openCreate = () => { setEditingId(null); setName(''); setCid(categories[0]?.id || ''); setPrice(''); setAvail(true); setIsModalOpen(true); };
  const openEdit = (p: Produto) => { setEditingId(p.id); setName(p.name); setCid(p.cid); setPrice(String(p.price)); setAvail(p.avail); setIsModalOpen(true); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cid) return;
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return;
    if (editingId) onUpdateProduct(editingId, { name: name.trim(), cid, price: numericPrice, avail });
    else onCreateProduct({ name: name.trim(), cid, price: numericPrice, avail });
    setIsModalOpen(false);
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl">
      {!isEmployee && <button onClick={openCreate} className="btn btn-primary self-start sm:self-auto cursor-pointer shrink-0"><Plus size={15}/><span>Novo Produto</span></button>}
      <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500 cursor-pointer">
        <option value="all">Todas as Categorias</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="relative w-full sm:w-64"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"/></div>
    </div>

    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      <div className="hidden sm:block overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border-color)]"><th className="py-3 px-4 text-xs text-[var(--text-muted)]">Produto</th><th className="py-3 px-4 text-xs text-[var(--text-muted)]">Categoria</th><th className="py-3 px-4 text-xs text-[var(--text-muted)]">Preço</th><th className="py-3 px-4 text-xs text-[var(--text-muted)]">Status</th>{!isEmployee&&<th className="py-3 px-4 text-xs text-[var(--text-muted)] text-right">Ações</th>}</tr></thead>
      <tbody>{filtered.length===0?<tr><td colSpan={isEmployee?4:5} className="py-12 text-center text-[#484F58]"><Coffee className="mx-auto mb-2" size={36}/><p>Nenhum produto cadastrado.</p></td></tr>:filtered.map(p=>{const c=getCategory(p.cid);return <tr key={p.id} className="border-b border-[var(--bg-hover)]/50 hover:bg-[var(--bg-hover)]/25"><td className="py-3 px-4 font-semibold">{p.name}</td><td className="py-3 px-4"><span className="inline-flex px-2.5 py-0.5 rounded-full border text-xs font-semibold" style={{color:c.color,backgroundColor:`${c.color}12`,borderColor:`${c.color}22`}}>{c.name}</span></td><td className="py-3 px-4 font-bold text-sky-500">R$ {p.price.toFixed(2).replace('.',',')}</td><td className="py-3 px-4"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${p.avail?'text-emerald-400 bg-emerald-500/10 border-emerald-500/20':'text-red-400 bg-red-500/10 border-red-500/20'}`}>{p.avail?'● Disponível':'○ Indisponível'}</span></td>{!isEmployee&&<td className="py-3 px-4 text-right"><button onClick={()=>openEdit(p)} className="p-1.5 mr-1 rounded-md hover:bg-[#30363D] cursor-pointer" title="Editar"><Edit2 size={14}/></button><button onClick={()=>setProductToDelete(p.id)} className="p-1.5 rounded-md text-red-400 hover:bg-[#30363D] cursor-pointer" title="Excluir"><Trash2 size={14}/></button></td>}</tr>})}</tbody></table></div>
      <div className="sm:hidden p-3 space-y-2">{filtered.length===0?<div className="py-12 text-center text-[#484F58]"><Coffee className="mx-auto mb-2" size={36}/><p>Nenhum produto cadastrado.</p></div>:filtered.map(p=>{const c=getCategory(p.cid);return <div key={p.id} className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl p-4 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-bold">{p.name}</p><p className="text-xs text-[var(--text-muted)] mt-1">{c.name}</p><p className="text-sm font-black text-sky-500 mt-1">R$ {p.price.toFixed(2).replace('.',',')}</p><span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs border ${p.avail?'text-emerald-400 border-emerald-500/20':'text-red-400 border-red-500/20'}`}>{p.avail?'Disponível':'Indisponível'}</span></div>{!isEmployee&&<div className="flex gap-2"><button onClick={()=>openEdit(p)} className="p-2.5 rounded-xl bg-[var(--bg-hover)] cursor-pointer"><Edit2 size={16}/></button><button onClick={()=>setProductToDelete(p.id)} className="p-2.5 rounded-xl bg-red-500/10 text-red-400 cursor-pointer"><Trash2 size={16}/></button></div>}</div>})}</div>
    </div>

    {!isEmployee&&isModalOpen&&<div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50"><div className="w-full sm:max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] sm:rounded-xl rounded-t-2xl overflow-hidden shadow-2xl"><div className="p-4 border-b border-[var(--border-color)] flex justify-between"><h3 className="font-bold">{editingId?'Editar Produto':'Novo Produto'}</h3><button onClick={()=>setIsModalOpen(false)}>✕</button></div><form onSubmit={submit} className="p-5 space-y-4"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do Produto" className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3 py-2"/><select required value={cid} onChange={e=>setCid(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3 py-2">{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input type="number" min="0" step="0.10" required value={price} onChange={e=>setPrice(e.target.value)} placeholder="Preço" className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3 py-2"/><select value={avail?'1':'0'} onChange={e=>setAvail(e.target.value==='1')} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-3 py-2"><option value="1">Disponível</option><option value="0">Indisponível</option></select><div className="flex justify-end gap-2"><button type="button" onClick={()=>setIsModalOpen(false)} className="px-4 py-2 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 bg-sky-500 rounded-lg font-bold">{editingId?'Salvar':'Criar'}</button></div></form></div></div>}
    <ConfirmModal isOpen={productToDelete!==null} title="Excluir Produto" message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita." confirmText="Excluir" onConfirm={()=>{if(productToDelete)onDeleteProduct(productToDelete);setProductToDelete(null)}} onCancel={()=>setProductToDelete(null)}/>
  </div>;
}