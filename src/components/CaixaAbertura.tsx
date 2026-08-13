import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, DollarSign, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { CaixaSessao } from '../types';

interface CaixaAberturaProps {
  operador: string;
  onAbrir: (sessao: Omit<CaixaSessao, 'id' | 'fechadoEm' | 'status'>) => void;
  onClose: () => void;
}

export default function CaixaAbertura({ operador, onAbrir, onClose }: CaixaAberturaProps) {
  const [saldoInicial, setSaldoInicial] = useState('');
  const [obs, setObs] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  const numSaldo = parseFloat(saldoInicial.replace(',', '.')) || 0;
  const now = new Date();

  const handleConfirm = () => {
    onAbrir({
      saldoInicial: numSaldo,
      abertoEm: Date.now(),
      operador,
      obs,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-panel)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--text-main)]">Abertura de Caixa</h3>
              <p className="text-[10px] text-[var(--text-muted)]">Inicie um novo turno</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-hover)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'form' ? (
            <>
              {/* Info row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={11} className="text-sky-500" />
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Data/Hora</span>
                  </div>
                  <p className="text-xs font-bold text-[var(--text-main)]">
                    {now.toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User size={11} className="text-sky-500" />
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Operador</span>
                  </div>
                  <p className="text-xs font-bold text-[var(--text-main)] truncate">{operador}</p>
                  <p className="text-[10px] text-emerald-500">Administrador</p>
                </div>
              </div>

              {/* Saldo inicial */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Valor Inicial em Caixa (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saldoInicial}
                    onChange={e => setSaldoInicial(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-[var(--text-main)] outline-none focus:border-emerald-500 transition-colors"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Dinheiro físico em troco/fundo de caixa</p>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Observações (opcional)
                </label>
                <textarea
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Ex: Turno da manhã, caixa 1..."
                  rows={2}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 resize-none transition-colors"
                />
              </div>

              <button
                onClick={() => setStep('confirm')}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-[#090D14] font-black text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 size={15} />
                Revisar e Abrir Caixa
              </button>
            </>
          ) : (
            <>
              {/* Confirmation */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={14} className="text-emerald-500" />
                  <span className="text-xs font-black text-emerald-500 uppercase tracking-wide">Confirme os dados</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Operador:</span>
                    <span className="font-bold text-[var(--text-main)]">{operador}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Data/Hora:</span>
                    <span className="font-bold text-[var(--text-main)]">
                      {now.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-500/20 pt-2 mt-1">
                    <span className="text-[var(--text-muted)]">Saldo Inicial:</span>
                    <span className="font-black text-emerald-500 text-base">
                      R$ {numSaldo.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {obs && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Obs:</span>
                      <span className="font-semibold text-[var(--text-main)] text-right max-w-[180px]">{obs}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="py-2.5 bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--bg-panel)] transition-colors"
                >
                  Corrigir
                </button>
                <button
                  onClick={handleConfirm}
                  className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#090D14] font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                >
                  ✓ Abrir Caixa
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
