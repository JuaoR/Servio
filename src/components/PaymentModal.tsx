import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Comanda } from '../types';
import { X, ArrowLeft, CheckCircle2 } from 'lucide-react';

const PixIcon = () => (
  <img src="/images/pix-logo.jpg" alt="Pix" className="w-6 h-6 object-contain rounded-sm" />
);

interface PaymentModalProps {
  id: number;
  comanda: Comanda;
  onClose: () => void;
  onConfirmPayment: (id: number, method: string, received?: number) => void | Promise<any>;
}

const PAYMENT_METHODS = [
  { key: 'pix', label: 'Pix', icon: <PixIcon />, color: 'text-[#32BCAD] bg-[#32BCAD]/10 border-[#32BCAD]/20' },
  { key: 'dinheiro', label: 'Dinheiro', icon: '💵', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { key: 'credito', label: 'C. Crédito', icon: '💳', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  { key: 'debito', label: 'C. Débito', icon: '🏧', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
];

export default function PaymentModal({ id, comanda, onClose, onConfirmPayment }: PaymentModalProps) {
  const [method, setMethod] = useState('pix');
  const [received, setReceived] = useState('');
  // Preenche valor recebido com total quando muda para dinheiro
  useEffect(() => {
    if (method === 'dinheiro' && !received) {
      setReceived(totalVal.toFixed(2).replace('.', ','));
    }
  }, [method]);

  const subTotal = comanda.items.reduce((s, it) => s + it.price * it.qty, 0);
  const totalVal = Math.max(0, subTotal - (comanda.discount || 0));

  const numericReceived = parseFloat(received) || 0;
  const change = numericReceived - totalVal;

  const handleConfirm = async () => {
    if (method === 'dinheiro') {
      const recVal = numericReceived || totalVal; // sem troco = já trocado
      if (recVal < totalVal) {
        alert('Valor recebido menor que o total!');
        return;
      }
      await onConfirmPayment(id, method, recVal);
    } else {
      await onConfirmPayment(id, method, undefined);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[#1c2128]">
          <h3 className="font-bold text-[var(--text-main)] text-base flex items-center gap-2">
            <span>💳 Fechamento Comanda #{id}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-5">
          {/* Cash details */}
          <div className="text-center py-4 bg-[var(--bg-base)] border border-[var(--bg-hover)] rounded-xl">
            <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Total a Pagar
            </span>
            <span className="text-3xl font-black text-sky-500">
              R$ {totalVal.toFixed(2).replace('.', ',')}
            </span>
            {comanda.mesa && (
              <span className="block text-xs text-[var(--text-muted)] font-medium mt-1">
                {comanda.mesa}
              </span>
            )}
          </div>

          {/* Payment selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => {
                const selected = method === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      selected
                        ? 'bg-sky-500/10 border-sky-500 text-sky-500'
                        : 'bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[#484F58] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span className="text-xl mb-1">{m.icon}</span>
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* If Cash, display input and change calculation */}
          {method === 'dinheiro' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 bg-[var(--bg-base)] border border-[var(--border-color)] p-4 rounded-xl"
            >
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Valor Recebido R$
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder={totalVal.toFixed(2)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-main)] outline-none focus:border-sky-500"
                />
              </div>

              {numericReceived >= totalVal && (
                <div className="bg-[#1c2128] border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Troco</span>
                    <span className="text-lg font-black text-emerald-400">
                      R$ {change.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <span className="text-2xl">💸</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Simple summary review */}
          <div className="p-4 bg-zinc-100 border-2 border-zinc-200 rounded-xl text-xs space-y-2 shadow-sm">
            <span className="block text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">
              Resumo do Consumo
            </span>
            {comanda.items.map(it => (
              <div key={it.id} className="flex justify-between text-zinc-800 font-medium">
                <span>{it.qty}x {it.name}</span>
                <span>R$ {(it.price * it.qty).toFixed(2)}</span>
              </div>
            ))}
            {comanda.discount > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>Desconto</span>
                <span>-R$ {comanda.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-zinc-300 pt-2 mt-2 flex justify-between font-black text-sm text-zinc-900">
              <span>Valor Final</span>
              <span className="text-emerald-600">R$ {totalVal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[#1c2128] flex justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[#30363D] text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>Voltar</span>
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#090D14] text-xs font-black rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
          >
            <CheckCircle2 size={14} />
            <span>Confirmar Pagamento</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
