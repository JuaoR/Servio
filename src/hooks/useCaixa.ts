import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CaixaSessao, MovimentacaoCaixa, FechamentoCaixa, MovimentacaoTipo } from '../types';
import { mapSupabaseError } from '../utils/errors';

export function useCaixa(restaurantId: string, ownerName: string) {
  const [caixaAtiva, setCaixaAtiva] = useState<CaixaSessao | null>(null);
  const [caixaSessoes, setCaixaSessoes] = useState<CaixaSessao[]>([]);
  const [movimentacoesCaixa, setMovimentacoesCaixa] = useState<MovimentacaoCaixa[]>([]);
  const [fechamentosCaixa, setFechamentosCaixa] = useState<FechamentoCaixa[]>([]);

  useEffect(() => {
    if (restaurantId) {
      const fetchCaixa = async () => {
        try {
          const [
            { data: dbSessoes },
            { data: dbMovs },
            { data: dbFechs }
          ] = await Promise.all([
            supabase.from('caixa_sessoes').select('*').eq('restaurant_id', restaurantId).order('aberto_em', { ascending: false }),
            supabase.from('caixa_movimentacoes').select('*').eq('restaurant_id', restaurantId).order('criado_em', { ascending: false }),
            supabase.from('caixa_fechamentos').select('*').eq('restaurant_id', restaurantId).order('fechado_em', { ascending: false })
          ]);

          if (dbSessoes) {
            const mappedSessoes: CaixaSessao[] = dbSessoes.map(s => ({
              id: s.id,
              restaurantId: s.restaurant_id,
              status: s.status,
              saldoInicial: Number(s.saldo_inicial) || 0,
              abertoEm: new Date(s.aberto_em).getTime(),
              fechadoEm: s.fechado_em ? new Date(s.fechado_em).getTime() : null,
              operador: s.operador,
              obs: s.obs || ''
            }));
            setCaixaSessoes(mappedSessoes);
            const aberta = mappedSessoes.find(s => s.status === 'aberto');
            setCaixaAtiva(aberta || null);
          }

          if (dbMovs) {
            const mappedMovs: MovimentacaoCaixa[] = dbMovs.map(m => ({
              id: m.id,
              caixaId: m.caixa_id,
              restaurantId: m.restaurant_id,
              tipo: m.tipo,
              valor: Number(m.valor) || 0,
              formaPagamento: m.forma_pagamento,
              descricao: m.descricao,
              operador: m.operador,
              comandaId: m.comanda_id,
              criadoEm: new Date(m.criado_em).getTime()
            }));
            setMovimentacoesCaixa(mappedMovs);
          }

          if (dbFechs) {
            const mappedFechs: FechamentoCaixa[] = dbFechs.map(f => ({
              id: f.id,
              caixaId: f.caixa_id,
              restaurantId: f.restaurant_id,
              saldoInicial: Number(f.saldo_inicial) || 0,
              totalVendasDinheiro: Number(f.total_vendas_dinheiro) || 0,
              totalVendasPix: Number(f.total_vendas_pix) || 0,
              totalVendasCredito: Number(f.total_vendas_credito) || 0,
              totalVendasDebito: Number(f.total_vendas_debito) || 0,
              totalVendas: Number(f.total_vendas) || 0,
              totalSangrias: Number(f.total_sangrias) || 0,
              totalSuprimentos: Number(f.total_suprimentos) || 0,
              totalDescontos: Number(f.total_descontos) || 0,
              saldoEsperado: Number(f.saldo_esperado) || 0,
              saldoContado: Number(f.saldo_contado) || 0,
              diferenca: Number(f.diferenca) || 0,
              justificativa: f.justificativa,
              fechadoEm: new Date(f.fechado_em).getTime(),
              duracaoMinutos: f.duracao_minutos,
              duracao: f.duracao_minutos,
              operador: f.operador,
              qtdVendas: f.qtd_vendas
            }));
            setFechamentosCaixa(mappedFechs);
          }
        } catch (e) {
          console.error('Erro ao buscar dados do caixa:', e);
        }
      };

      fetchCaixa();
    } else {
      setCaixaAtiva(null);
      setCaixaSessoes([]);
      setMovimentacoesCaixa([]);
      setFechamentosCaixa([]);
    }
  }, [restaurantId]);

  const handleAbrirCaixaSubmit = async (dados: Omit<CaixaSessao, 'id' | 'fechadoEm' | 'status'>): Promise<boolean> => {
    try {
      const { data: newSessao, error: sessaoErr } = await supabase.rpc('abrir_caixa', {
        p_saldo_inicial: dados.saldoInicial,
        p_operador: dados.operador,
        p_obs: dados.obs || ''
      });

      if (sessaoErr || !newSessao) {
        const errMsg = mapSupabaseError(sessaoErr);
        console.error('[handleAbrirCaixaSubmit] Erro:', sessaoErr);
        alert('Erro ao abrir o caixa: ' + errMsg);
        return false;
      }

      const sessaoObj: CaixaSessao = {
        id: newSessao.id,
        restaurantId: newSessao.restaurant_id,
        status: 'aberto',
        saldoInicial: Number(newSessao.saldo_inicial),
        abertoEm: new Date(newSessao.aberto_em).getTime(),
        operador: newSessao.operador,
        obs: newSessao.obs || ''
      };

      setCaixaAtiva(sessaoObj);
      setCaixaSessoes(prev => [sessaoObj, ...prev]);

      const { data: movs } = await supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('caixa_id', newSessao.id)
        .order('criado_em', { ascending: false });
      if (movs && movs.length > 0) {
        const mapped: MovimentacaoCaixa[] = movs.map(m => ({
          id: m.id, caixaId: m.caixa_id, restaurantId: m.restaurant_id,
          tipo: m.tipo, valor: Number(m.valor), formaPagamento: m.forma_pagamento,
          descricao: m.descricao, operador: m.operador,
          criadoEm: new Date(m.criado_em).getTime()
        }));
        setMovimentacoesCaixa(prev => [...mapped, ...prev]);
      }
      return true;
    } catch (e: any) {
      console.error('[handleAbrirCaixaSubmit] Exceção:', e);
      alert('Erro inesperado ao abrir o caixa: ' + (e?.message || String(e)));
      return false;
    }
  };

  const handleFecharCaixaSubmit = async (fechamento: FechamentoCaixa): Promise<boolean> => {
    if (!caixaAtiva) return false;
    try {
      const { data: newFech, error: fechErr } = await supabase.rpc('fechar_caixa', {
        p_caixa_id: caixaAtiva.id,
        p_saldo_contado: fechamento.saldoContado,
        p_justificativa: fechamento.justificativa || '',
        p_saldo_inicial: fechamento.saldoInicial,
        p_total_vendas_dinheiro: fechamento.totalVendasDinheiro,
        p_total_vendas_pix: fechamento.totalVendasPix,
        p_total_vendas_credito: fechamento.totalVendasCredito,
        p_total_vendas_debito: fechamento.totalVendasDebito,
        p_total_vendas: fechamento.totalVendas,
        p_total_sangrias: fechamento.totalSangrias,
        p_total_suprimentos: fechamento.totalSuprimentos,
        p_total_descontos: fechamento.totalDescontos,
        p_saldo_esperado: fechamento.saldoEsperado,
        p_duracao_minutos: fechamento.duracaoMinutos,
        p_operador: fechamento.operador,
        p_qtd_vendas: fechamento.qtdVendas
      });

      if (fechErr) {
        console.error('[handleFecharCaixaSubmit] Erro:', fechErr);
        alert('Erro ao fechar o caixa: ' + mapSupabaseError(fechErr));
        return false;
      }

      const fechObj: FechamentoCaixa = {
        ...fechamento,
        id: newFech?.id || '_' + Math.random().toString(36).substring(2, 9),
        duracao: fechamento.duracaoMinutos
      };

      setFechamentosCaixa(prev => [fechObj, ...prev]);
      setCaixaSessoes(prev => prev.map(s => s.id === caixaAtiva.id ? { ...s, status: 'fechado', fechadoEm: Date.now() } : s));
      setCaixaAtiva(null);
      return true;
    } catch (e: any) {
      console.error('[handleFecharCaixaSubmit] Exceção:', e);
      alert('Erro inesperado ao fechar o caixa: ' + (e?.message || String(e)));
      return false;
    }
  };

  const handleSangriaOuSuprimentoSubmit = async (tipo: MovimentacaoTipo, valor: number, descricao: string): Promise<boolean> => {
    if (!caixaAtiva) return false;
    try {
      const valorFinal = tipo === 'sangria' ? -Math.abs(valor) : Math.abs(valor);
      const operador = ownerName || 'Operador';
      
      const { data: newMov, error: movErr } = await supabase.rpc('registrar_movimentacao_caixa', {
        p_caixa_id: caixaAtiva.id,
        p_tipo: tipo,
        p_valor: valorFinal,
        p_descricao: descricao,
        p_operador: operador
      });

      if (movErr) {
        console.error('[handleSangriaOuSuprimentoSubmit] Erro:', movErr);
        alert('Erro ao registrar ' + tipo + ': ' + mapSupabaseError(movErr));
        return false;
      }

      if (newMov) {
        const m = newMov as any;
        const movObj: MovimentacaoCaixa = {
          id: m.id, caixaId: m.caixa_id, tipo,
          valor: Number(m.valor), descricao: m.descricao, operador: m.operador,
          criadoEm: new Date(m.criado_em).getTime()
        };
        setMovimentacoesCaixa(prev => [movObj, ...prev]);
      }
      return true;
    } catch (e: any) {
      console.error('[handleSangriaOuSuprimentoSubmit] Exceção:', e);
      alert('Erro inesperado: ' + (e?.message || String(e)));
      return false;
    }
  };

  return {
    caixaAtiva,
    caixaSessoes,
    movimentacoesCaixa,
    setMovimentacoesCaixa,
    fechamentosCaixa,
    handleAbrirCaixaSubmit,
    handleFecharCaixaSubmit,
    handleSangriaOuSuprimentoSubmit
  };
}
