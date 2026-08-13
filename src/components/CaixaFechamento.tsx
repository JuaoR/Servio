import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Lock, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { CaixaSessao, MovimentacaoCaixa, FechamentoCaixa } from '../types';

interface CaixaFechamentoProps {
  sessao: CaixaSessao;
  movimentacoes: MovimentacaoCaixa[];
  operador: string;
  onFechar: (fechamento: FechamentoCaixa) => void;
  onClose: () => void;
}

const fmtR = (v: number) => 'R$ ' + Math.abs(v).toFixed(2).replace('.', ',');

export default function CaixaFechamento({ sessao, movimentacoes, operador, onFechar, onClose }: CaixaFechamentoProps) {
  const [saldoContado, setSaldoContado] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [error, setError] = useState('');

  const mov = movimentacoes.filter(m => m.caixaId === sessao.id);

  const stats = useMemo(() => {
    const vendas = mov.filter(m => m.tipo === 'venda');
    const sangrias = mov.filter(m => m.tipo === 'sangria');
    const suprimentos = mov.filter(m => m.tipo === 'suprimento');

    const totalVendasDinheiro = vendas.filter(m => m.formaPagamento === 'dinheiro').reduce((s, m) => s + m.valor, 0);
    const totalVendasPix = vendas.filter(m => m.formaPagamento === 'pix').reduce((s, m) => s + m.valor, 0);
    const totalVendasCredito = vendas.filter(m => m.formaPagamento === 'credito').reduce((s, m) => s + m.valor, 0);
    const totalVendasDebito = vendas.filter(m => m.formaPagamento === 'debito').reduce((s, m) => s + m.valor, 0);
    const totalVendas = vendas.reduce((s, m) => s + m.valor, 0);
    const totalSangrias = Math.abs(sangrias.reduce((s, m) => s + m.valor, 0));
    const totalSuprimentos = suprimentos.reduce((s, m) => s + m.valor, 0);
    const totalDescontos = 0; // tracked separately if needed

    // Expected cash: saldoInicial + dinheiro recebido em vendas + suprimentos - sangrias
    const saldoEsperado = sessao.saldoInicial + totalVendasDinheiro + totalSuprimentos - totalSangrias;

    const duracao = Math.round((Date.now() - sessao.abertoEm) / 60000);

    return {
      totalVendasDinheiro,
      totalVendasPix,
      totalVendasCredito,
      totalVendasDebito,
      totalVendas,
      totalSangrias,
      totalSuprimentos,
      totalDescontos,
      saldoEsperado,
      duracao,
      qtdVendas: vendas.length,
    };
  }, [mov, sessao]);

  const numSaldoContado = parseFloat(saldoContado.replace(',', '.')) || 0;
  const diferenca = numSaldoContado - stats.saldoEsperado;
  const temDiferenca = Math.abs(diferenca) > 0.01;

  const handleNext = () => {
    setError('');
    if (!saldoContado.trim()) {
      setError('Informe o valor contado em caixa.');
      return;
    }
    if (temDiferenca && !justificativa.trim()) {
      setError('Há uma diferença no caixa. Informe a justificativa obrigatoriamente.');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = () => {
    const fechamento: FechamentoCaixa = {
      caixaId: sessao.id,
      saldoInicial: sessao.saldoInicial,
      ...stats,
      saldoContado: numSaldoContado,
      diferenca,
      justificativa: justificativa.trim(),
      fechadoEm: Date.now(),
      operador,
    };
    onFechar(fechamento);
  };

  const StatRow = ({ label, value, color = '', bold = false }: { label: string; value: string; color?: string; bold?: boolean }) => (
    <div className={`flex justify-between items-center py-1.5 ${bold ? 'border-t border-[var(--border-color)] mt-1 pt-2.5' : ''}`}>
      <span className={`text-xs ${bold ? 'font-black text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
      <span className={`text-xs font-black ${color || (bold ? 'text-[var(--text-main)]' : 'text-[var(--text-main)]')}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-panel)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Lock size={16} className="text-sky-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--text-main)]">Fechamento de Caixa</h3>
              <p className="text-[10px] text-[var(--text-muted)]">Conferência e encerramento do turno</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-hover)]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {step === 'form' ? (
            <>
              {/* Resumo de Vendas */}
              <div>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Vendas do Turno</p>
                <div className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl p-3 space-y-0.5">
                  <StatRow label="💵 Dinheiro" value={fmtR(stats.totalVendasDinheiro)} />
                  <StatRow label="⚡ Pix" value={fmtR(stats.totalVendasPix)} />
                  <StatRow label="💳 Crédito" value={fmtR(stats.totalVendasCredito)} />
                  <StatRow label="🏧 Débito" value={fmtR(stats.totalVendasDebito)} />
                  <StatRow label={`Total (${stats.qtdVendas} venda${stats.qtdVendas !== 1 ? 's' : ''})`} value={fmtR(stats.totalVendas)} bold color="text-sky-500" />
                </div>
              </div>

              {/* Movimentações */}
              <div>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Movimentações de Dinheiro</p>
                <div className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl p-3 space-y-0.5">
                  <StatRow label="Saldo Inicial" value={fmtR(sessao.saldoInicial)} />
                  <StatRow label="Suprimentos" value={fmtR(stats.totalSuprimentos)} color="text-emerald-500" />
                  <StatRow label="Sangrias" value={`- ${fmtR(stats.totalSangrias)}`} color="text-red-400" />
                  <StatRow label="Saldo Esperado em Caixa" value={fmtR(stats.saldoEsperado)} bold color="text-sky-500" />
                </div>
              </div>

              {/* Contagem física */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Valor Contado Fisicamente (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saldoContado}
                    onChange={e => setSaldoContado(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              {/* Diferença em tempo real */}
              {saldoContado !== '' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`rounded-xl p-3 border flex items-center justify-between ${
                    !temDiferenca
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : diferenca > 0
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {!temDiferenca ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : diferenca > 0 ? (
                      <TrendingUp size={16} className="text-amber-500" />
                    ) : (
                      <TrendingDown size={16} className="text-red-400" />
                    )}
                    <div>
                      <p className={`text-xs font-black ${!temDiferenca ? 'text-emerald-500' : diferenca > 0 ? 'text-amber-500' : 'text-red-400'}`}>
                        {!temDiferenca ? 'Caixa confere!' : diferenca > 0 ? 'Sobra de caixa' : 'Falta de caixa'}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {!temDiferenca ? 'Diferença zero.' : `Diferença de ${fmtR(Math.abs(diferenca))}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-black ${!temDiferenca ? 'text-emerald-500' : diferenca > 0 ? 'text-amber-500' : 'text-red-400'}`}>
                    {diferenca >= 0 ? '+' : ''}{fmtR(diferenca).replace('R$ ', '')  }
                  </span>
                </motion.div>
              )}

              {/* Justificativa (se houver diferença) */}
              {temDiferenca && saldoContado !== '' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <label className="block text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5">
                    <AlertTriangle size={10} className="inline mr-1" />
                    Justificativa da Diferença * (obrigatória)
                  </label>
                  <textarea
                    value={justificativa}
                    onChange={e => setJustificativa(e.target.value)}
                    placeholder="Explique o motivo da diferença encontrada..."
                    rows={2}
                    className="w-full bg-[var(--bg-base)] border border-red-500/30 rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-red-500 resize-none transition-colors"
                  />
                </motion.div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={13} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-400 font-semibold">{error}</p>
                </div>
              )}
            </>
          ) : (
            /* Step 2 - Confirmation */
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="text-xs font-black text-amber-500 uppercase tracking-wide">Confirmar Fechamento</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Esta ação encerrará o caixa atual. Todas as informações serão salvas permanentemente.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Total de Vendas</span>
                    <span className="font-bold text-sky-500">{fmtR(stats.totalVendas)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Saldo Esperado</span>
                    <span className="font-bold text-[var(--text-main)]">{fmtR(stats.saldoEsperado)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Saldo Contado</span>
                    <span className="font-bold text-[var(--text-main)]">{fmtR(numSaldoContado)}</span>
                  </div>
                  {temDiferenca && (
                    <div className={`flex justify-between text-xs font-black border-t border-amber-500/20 pt-2 mt-1`}>
                      <span className={diferenca < 0 ? 'text-red-400' : 'text-amber-500'}>
                        {diferenca < 0 ? '⚠ Falta' : '⚠ Sobra'}
                      </span>
                      <span className={diferenca < 0 ? 'text-red-400' : 'text-amber-500'}>
                        {diferenca >= 0 ? '+' : ''}{fmtR(Math.abs(diferenca)).replace('R$ ', 'R$ ')}
                      </span>
                    </div>
                  )}
                  {!temDiferenca && (
                    <div className="flex justify-between text-xs font-black border-t border-emerald-500/20 pt-2 mt-1 text-emerald-500">
                      <span>✓ Caixa confere</span>
                      <span>Diferença zero</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-[var(--text-muted)]">Operador</span>
                    <span className="font-bold text-[var(--text-main)]">{operador}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Duração do turno</span>
                    <span className="font-bold text-[var(--text-main)]">
                      {stats.duracao >= 60
                        ? `${Math.floor(stats.duracao / 60)}h ${stats.duracao % 60}min`
                        : `${stats.duracao}min`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)] shrink-0">
          {step === 'form' ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="py-2.5 bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--bg-card)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleNext}
                className="py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <Lock size={13} />
                Revisar Fechamento
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStep('form')}
                className="py-2.5 bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--bg-card)] transition-colors"
              >
                Corrigir
              </button>
              <button
                onClick={handleConfirm}
                className="py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <Lock size={13} />
                Fechar Caixa
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
