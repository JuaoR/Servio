import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Comanda, Produto, Categoria, ItemPedido } from '../types';
import LucideIcon from './LucideIcon';
import { X, User, Users, Clipboard, Plus, Minus, Trash, Printer, CheckSquare, Search, BookOpen, ArrowLeft } from 'lucide-react';

interface ComandaModalProps {
  id: number;
  comanda: Comanda;
  products: Produto[];
  categories: Categoria[];
  onClose: () => void;
  onUpdateMeta: (id: number, meta: { mesa: string; garcom: string; obs: string }) => void;
  onUpdateItems: (id: number, items: ItemPedido[], discount?: number) => void;
  onOpenComanda: (id: number) => void;
  onShowPayment: (id: number) => void;
  rname: string;
}

export default function ComandaModal({
  id,
  comanda,
  products,
  categories,
  onClose,
  onUpdateMeta,
  onUpdateItems,
  onOpenComanda,
  onShowPayment,
  rname
}: ComandaModalProps) {
  const [mesa, setMesa] = useState(comanda.mesa);
  const [garcom, setGarcom] = useState(comanda.garcom);
  const [obs, setObs] = useState(comanda.obs);
  const [discount, setDiscount] = useState(comanda.discount);
  
  const [pickerCat, setPickerCat] = useState('all');
  const [pickerSearch, setPickerSearch] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const open = comanda.status === 'aberta';

  const subTotal = comanda.items.reduce((s, it) => s + it.price * it.qty, 0);
  const totalVal = Math.max(0, subTotal - discount);

  const handleMetaChange = (field: 'mesa' | 'garcom' | 'obs', val: string) => {
    if (field === 'mesa') setMesa(val);
    if (field === 'garcom') setGarcom(val);
    if (field === 'obs') setObs(val);

    onUpdateMeta(id, {
      mesa: field === 'mesa' ? val : mesa,
      garcom: field === 'garcom' ? val : garcom,
      obs: field === 'obs' ? val : obs,
    });
  };

  const handleOpenComanda = () => {
    onOpenComanda(id);
  };

  const handleAddItem = (p: Produto) => {
    // If not open, automatically open it
    let currentItems = [...comanda.items];
    const existing = currentItems.find(it => it.pid === p.id);
    
    if (existing) {
      // Já está nos itens do pedido, ignora cliques repetidos no menu para evitar incrementos acidentais
      return;
    }

    currentItems.push({
      id: '_' + Math.random().toString(36).substring(2, 9),
      pid: p.id,
      name: p.name,
      price: p.price,
      qty: 1,
      note: ''
    });

    onUpdateItems(id, currentItems, discount);
    
    if (comanda.status === 'livre') {
      onOpenComanda(id);
    }
  };

  const handleQtyChange = (itemId: string, diff: number) => {
    let currentItems = comanda.items
      .map(it => {
        if (it.id === itemId) {
          return { ...it, qty: it.qty + diff };
        }
        return it;
      })
      .filter(it => it.qty > 0);

    onUpdateItems(id, currentItems, discount);
  };

  const handleRemoveItem = (itemId: string) => {
    let currentItems = comanda.items.filter(it => it.id !== itemId);
    onUpdateItems(id, currentItems, discount);
  };

  const handleToggleNote = (item: ItemPedido) => {
    if (activeNoteId === item.id) {
      setActiveNoteId(null);
    } else {
      setActiveNoteId(item.id);
      setTempNote(item.note);
    }
  };

  const handleSaveNote = (itemId: string) => {
    let currentItems = comanda.items.map(it => {
      if (it.id === itemId) {
        return { ...it, note: tempNote };
      }
      return it;
    });
    onUpdateItems(id, currentItems, discount);
    setActiveNoteId(null);
  };

  const handleDiscountChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setDiscount(num);
    onUpdateItems(id, comanda.items, num);
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    onUpdateItems(id, [], 0);
    setDiscount(0);
    setShowClearConfirm(false);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;

    const formattedDate = comanda.openedAt 
      ? new Date(comanda.openedAt).toLocaleString('pt-BR') 
      : new Date().toLocaleString('pt-BR');

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comanda #${id}</title>
        <style>
          body { font-family: monospace; max-width: 300px; margin: 20px auto; font-size: 13px; color: #000; }
          .c { text-align: center; }
          .hr { border-top: 1px dashed #000; margin: 8px 0; }
          .r { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="c"><b>${rname.toUpperCase() || 'SERVIO'}</b></div>
        <div class="c">━━━ COMANDA #${id} ━━━</div>
        <div class="hr"></div>
        <div>Mesa: ${mesa || '—'}</div>
        <div>Garçom: ${garcom || '—'}</div>
        <div>Abertura: ${formattedDate}</div>
        ${obs ? `<div>Obs: ${obs}</div>` : ''}
        <div class="hr"></div>
        <div style="font-weight:bold">ITEM&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;QT&nbsp;&nbsp;&nbsp;TOTAL</div>
        <div class="hr"></div>
        ${comanda.items.map(it => `
          <div class="r">
            <span>${it.name}</span>
            <span>${it.qty}× R$ ${(it.price * it.qty).toFixed(2)}</span>
          </div>
          ${it.note ? `<div style="font-size:11px;color:#555;padding-left:6px;">↳ Obs: ${it.note}</div>` : ''}
        `).join('')}
        <div class="hr"></div>
        <div class="r"><span>Subtotal</span><span>R$ ${subTotal.toFixed(2)}</span></div>
        ${discount > 0 ? `<div class="r"><span>Desconto</span><span>-R$ ${discount.toFixed(2)}</span></div>` : ''}
        <div class="r"><b>TOTAL</b><b>R$ ${totalVal.toFixed(2)}</b></div>
        <div class="hr"></div>
        <div class="c" style="font-size:11px">Impresso em ${new Date().toLocaleString('pt-BR')}</div>
      </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  // Picker Filter
  const availableProducts = products.filter(p => {
    if (!p.avail) return false;
    if (pickerCat !== 'all' && p.cid !== pickerCat) return false;
    if (pickerSearch.trim() && !p.name.toLowerCase().includes(pickerSearch.toLowerCase())) return false;
    return true;
  });

  const getCategory = (catId: string) => {
    return categories.find(c => c.id === catId);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-40">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl h-[90vh] bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#30363D] flex justify-between items-center bg-[#1c2128]">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-amber-500">#{id}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              open ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-[#8B949E] bg-[#21262D]'
            }`}>
              {open ? '● Aberta' : '○ Livre'}
            </span>
            {open && comanda.openedAt && (
              <span className="text-xs text-[#8B949E] hidden sm:inline">
                Abertura: {new Date(comanda.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {open && (
              <button
                onClick={handlePrint}
                disabled={comanda.items.length === 0}
                className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 text-[10px] font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 ml-2 transition-colors"
              >
                <Printer size={12} />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#30363D] text-[#8B949E] hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left panel: Info & Items list */}
          <div className="flex-1 overflow-y-auto p-4 border-b md:border-b-0 md:border-r border-[#30363D] space-y-4">
            {/* Meta Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Users size={12} />
                  <span>Mesa / Cliente</span>
                </label>
                <input
                  type="text"
                  value={mesa}
                  onChange={(e) => handleMetaChange('mesa', e.target.value)}
                  placeholder="Ex: Mesa 5, João"
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <User size={12} />
                  <span>Garçom</span>
                </label>
                <input
                  type="text"
                  value={garcom}
                  onChange={(e) => handleMetaChange('garcom', e.target.value)}
                  placeholder="Ex: Lucas"
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clipboard size={12} />
                <span>Observações Gerais</span>
              </label>
              <input
                type="text"
                value={obs}
                onChange={(e) => handleMetaChange('obs', e.target.value)}
                placeholder="Ex: Sem cebola nos pratos, gelo separado"
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-amber-500"
              />
            </div>

            {/* Items display */}
            <div className="space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[#21262D]">
                <h3 className="text-sm font-bold text-white">Itens do Pedido</h3>
                {open && comanda.items.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Trash size={12} />
                    <span>Limpar tudo</span>
                  </button>
                )}
              </div>

              {comanda.items.length === 0 ? (
                <div className="py-12 text-center text-[#484F58]">
                  <BookOpen size={32} className="mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-semibold">Comanda vazia.</p>
                  <p className="text-[10px] text-[#8B949E] mt-1">Adicione produtos ao lado para iniciar o pedido.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {comanda.items.map(item => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#0D1117] border border-[#21262D] rounded-xl flex items-start gap-3 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{item.name}</span>
                        <span className="text-[10px] text-[#8B949E] block mt-0.5">
                          R$ {item.price.toFixed(2)} × {item.qty} = <strong className="text-[#E6EDF3]">R$ {(item.price * item.qty).toFixed(2)}</strong>
                        </span>
                        {item.note && (
                          <span className="inline-block text-[9px] text-amber-500 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 mt-1">
                            Obs: {item.note}
                          </span>
                        )}

                        {activeNoteId === item.id && (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              value={tempNote}
                              onChange={(e) => setTempNote(e.target.value)}
                              placeholder="Observação do item..."
                              className="flex-1 bg-[#161B22] border border-[#30363D] rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-500"
                            />
                            <button
                              onClick={() => handleSaveNote(item.id)}
                              className="px-2 py-1 bg-amber-500 text-black font-bold text-[10px] rounded hover:bg-amber-600 cursor-pointer"
                            >
                              Ok
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQtyChange(item.id, -1)}
                            className="w-5 h-5 rounded bg-[#21262D] hover:bg-amber-500 hover:text-black text-white flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="text-xs font-bold font-mono text-white min-w-[14px] text-center">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => handleQtyChange(item.id, 1)}
                            className="w-5 h-5 rounded bg-[#21262D] hover:bg-amber-500 hover:text-black text-white flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleToggleNote(item)}
                            className="text-[10px] text-[#8B949E] hover:text-white underline cursor-pointer"
                          >
                            Obs
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Product picker */}
          <div className="w-full md:w-80 flex flex-col bg-[#11141a]">
            <div className="p-3 border-b border-[#30363D] shrink-0">
              <span className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-2">
                Cardápio de Lançamento
              </span>

              {/* Categories horizontal list */}
              <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin">
                <button
                  onClick={() => setPickerCat('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition-all whitespace-nowrap cursor-pointer ${
                    pickerCat === 'all'
                      ? 'bg-amber-500 border-amber-500 text-black'
                      : 'bg-[#21262D] border-[#30363D] text-[#8B949E] hover:text-white'
                  }`}
                >
                  Todos
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setPickerCat(c.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                      pickerCat === c.id
                        ? 'text-white'
                        : 'bg-[#21262D] border-[#30363D] text-[#8B949E] hover:text-white'
                    }`}
                    style={pickerCat === c.id ? { backgroundColor: c.color, borderColor: c.color } : {}}
                  >
                    <LucideIcon name={c.icon} size={11} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>

              {/* Search picker products */}
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 text-[#484F58]" size={13} />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#E6EDF3] placeholder-[#484F58] outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* List of products to tap/click */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {availableProducts.length === 0 ? (
                <div className="py-8 text-center text-[#484F58]">
                  <p className="text-[11px]">Nenhum produto disponível.</p>
                </div>
              ) : (
                availableProducts.map(p => {
                  const catInfo = getCategory(p.cid);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddItem(p)}
                      className="p-2.5 bg-[#161B22] border border-[#21262D] hover:border-amber-500/50 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-semibold text-[#E6EDF3] block truncate">{p.name}</span>
                        {catInfo && (
                          <span
                            className="text-[9px] font-medium"
                            style={{ color: catInfo.color }}
                          >
                            {catInfo.name}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-amber-500 shrink-0">
                        R$ {p.price.toFixed(2)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#30363D] bg-[#1c2128] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="block text-[9px] font-bold text-[#8B949E] uppercase tracking-wider">Subtotal</span>
              <span className="text-xs text-white">R$ {subTotal.toFixed(2)}</span>
            </div>

            <div>
              <span className="block text-[9px] font-bold text-[#8B949E] uppercase tracking-wider">Desconto R$</span>
              <input
                type="number"
                min="0"
                max={subTotal}
                step="0.50"
                value={discount || ''}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="0.00"
                className="w-16 bg-[#0D1117] border border-[#30363D] rounded px-1.5 py-0.5 text-xs text-white text-center outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <span className="block text-[9px] font-bold text-[#8B949E] uppercase tracking-wider">Total</span>
              <span className="text-lg font-black text-amber-500">R$ {totalVal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Voltar</span>
            </button>
            {open && (
              <button
                onClick={() => onShowPayment(id)}
                disabled={comanda.items.length === 0}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-black rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckSquare size={14} />
                <span>Fechar &amp; Pagar</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Custom Confirmation Dialog for Clear Items */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-left"
          >
            <h3 className="text-sm font-bold text-zinc-900">Limpar Itens</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Tem certeza que deseja remover todos os itens?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Sim
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
