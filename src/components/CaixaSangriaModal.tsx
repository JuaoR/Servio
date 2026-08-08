import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ArrowDownCircle, ArrowUpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MovimentacaoTipo } from '../types';

interface CaixaSangriaModalProps {
  tipo: 'sangria' | 'suprimento';
  operador: string;
  onConfirm: (tipo: MovimentacaoTipo, valor: number, descricao: string) => void;
  onClose: () => void;
}

export default function CaixaSangriaModal({ tipo, operador, onConfirm, onClose }: CaixaSangriaModalProps) {
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const isSangria = tipo === 'sangria';
  const numValor = parseFloat(valor.replace(',', '.')) || 0;

  const accentColor = isSangria ? 'text-red-400' : 'text-emerald-500';
  const accentBg = isSangria ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20';
  const btnColor = isSangria
    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20';

  const motivosSangria = ['Recolhimento para cofre', 'Pagamento de fornecedor', 'Pagamento de despesa', 'Retirada de sócio', 'Outro'];
  const motivosSuprimento = ['Troco inicial adicional', 'Reforço de caixa', 'Entrada de dinheiro', 'Outro'];
  const motivosSugeridos = isSangria ? motivosSangria : motivosSuprimento;

  const handleSubmit = () => {
    setError('');
    if (numValor <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    if (!motivo.trim()) {
      setError('O motivo é obrigatório.');
      return;
    }
    onConfirm(tipo as MovimentacaoTipo, isSangria ? -numValor : numValor, motivo.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-panel)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${accentBg} border flex items-center justify-center`}>
              {isSangria
                ? <ArrowDownCircle size={16} className="text-red-400" />
                : <ArrowUpCircle size={16} className="text-emerald-500" />
              }
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--text-main)]">
                {isSangria ? 'Sangria de Caixa' : 'Suprimento de Caixa'}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isSangria ? 'Retirada de dinheiro' : 'Entrada de dinheiro'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-hover)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tipo destaque */}
          <div className={`${accentBg} border rounded-xl p-3 flex items-center gap-2`}>
            {isSangria
              ? <ArrowDownCircle size={14} className="text-red-400 shrink-0" />
              : <ArrowUpCircle size={14} className="text-emerald-500 shrink-0" />
            }
            <p className={`text-xs font-bold ${accentColor}`}>
              {isSangria
                ? 'Este valor será retirado do caixa físico e registrado como saída.'
                : 'Este valor será adicionado ao caixa físico e registrado como entrada.'}
            </p>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Valor (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Motivo * <span className="normal-case font-normal">(obrigatório)</span>
            </label>
            {/* Quick motivos */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {motivosSugeridos.slice(0, -1).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer transition-colors ${
                    motivo === m
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-500 font-bold'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-sky-500/30 hover:text-[var(--text-main)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Descreva o motivo..."
              rows={2}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 resize-none transition-colors"
            />
          </div>

          {/* Operador */}
          <div className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Responsável</span>
            <span className="text-xs font-bold text-[var(--text-main)]">{operador}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <AlertTriangle size={13} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400 font-semibold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="py-2.5 bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--bg-panel)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className={`py-2.5 ${btnColor} text-white text-xs font-black rounded-xl cursor-pointer shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5`}
            >
              <CheckCircle2 size={13} />
              Confirmar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
