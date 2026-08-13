import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Comanda, ItemPedido, CaixaSessao, HistoricoItem, MovimentacaoCaixa } from '../types';
import { mapSupabaseError } from '../utils/errors';

function makeEmptyComandas(): Record<number, Comanda> {
  const c: Record<number, Comanda> = {};
  for (let i = 1; i <= 100; i++) {
    c[i] = {
      id: i,
      status: 'livre',
      items: [],
      mesa: '',
      garcom: '',
      obs: '',
      openedAt: null,
      discount: 0,
    };
  }
  return c;
}

export function useComandas(
  restaurantId: string,
  ownerName: string,
  caixaAtiva: CaixaSessao | null,
  setMovimentacoesCaixa: React.Dispatch<React.SetStateAction<MovimentacaoCaixa[]>>,
  setHistory: React.Dispatch<React.SetStateAction<HistoricoItem[]>>
) {
  const [comandas, setComandas] = useState<Record<number, Comanda>>(makeEmptyComandas());

  useEffect(() => {
    if (restaurantId) {
      const fetchComandas = async () => {
        try {
          const { data: dbComandas } = await supabase
            .from('comandas')
            .select('*, comanda_items(*)')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'aberta');

          if (dbComandas) {
            const updatedComandas = makeEmptyComandas();
            dbComandas.forEach((c: any) => {
              if (c.number && c.number >= 1 && c.number <= 100) {
                const itensDB: any[] = c.comanda_items || c.items || [];
                const mappedItems = itensDB.map((it: any) => ({
                  id: it.id,
                  pid: it.product_id,
                  name: it.name,
                  price: Number(it.price),
                  qty: Number(it.quantity),
                  note: it.notes || ''
                }));
                updatedComandas[c.number] = {
                  id: c.number,
                  uuid: c.id,
                  status: 'aberta',
                  items: mappedItems,
                  mesa: c.table_number || '',
                  garcom: c.waiter_id || '',
                  obs: c.notes || '',
                  openedAt: c.opened_at ? new Date(c.opened_at).getTime() : Date.now(),
                  discount: Number(c.discount) || 0
                };
              }
            });
            setComandas(updatedComandas);
          }
        } catch (e) {
          console.error('Erro ao buscar comandas:', e);
        }
      };

      fetchComandas();

      const channel = supabase
        .channel('comandas_' + restaurantId)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'comandas',
          filter: 'restaurant_id=eq.' + restaurantId
        }, (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             if (newData.status === 'aberta' && newData.number >= 1 && newData.number <= 100) {
               setComandas(prev => {
                  const upd = { ...prev };
                  upd[newData.number] = {
                    id: newData.number,
                    uuid: newData.id,
                    status: 'aberta',
                    items: newData.items || [], // Nota: comanda_items não vêm no realtime payload
                    mesa: newData.table_number || '',
                    garcom: newData.waiter_id || '',
                    obs: newData.notes || '',
                    openedAt: newData.opened_at ? new Date(newData.opened_at).getTime() : Date.now(),
                    discount: newData.discount || 0
                  };
                  return upd;
               });
             } else if (newData.status === 'fechada' && newData.number >= 1 && newData.number <= 100) {
               setComandas(prev => {
                  const upd = { ...prev };
                  upd[newData.number] = {
                    id: newData.number,
                    status: 'livre',
                    items: [],
                    mesa: '',
                    garcom: '',
                    obs: '',
                    openedAt: null,
                    discount: 0
                  };
                  return upd;
               });
             }
          } else if (payload.eventType === 'DELETE') {
            if (oldData.number >= 1 && oldData.number <= 100) {
              setComandas(prev => {
                  const upd = { ...prev };
                  upd[oldData.number] = {
                    id: oldData.number,
                    status: 'livre',
                    items: [],
                    mesa: '',
                    garcom: '',
                    obs: '',
                    openedAt: null,
                    discount: 0
                  };
                  return upd;
               });
            }
          }
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setComandas(makeEmptyComandas());
    }
  }, [restaurantId]);

  const handleMetaUpdate = async (id: number, meta: { mesa: string; garcom: string; obs: string }) => {
    const comanda = comandas[id];
    setComandas(prev => {
      const updatedComandas = { ...prev };
      updatedComandas[id] = { ...updatedComandas[id], ...meta };
      return updatedComandas;
    });
    
    if (comanda?.uuid && restaurantId) {
      const { error } = await supabase
        .from('comandas')
        .update({
          table_number: meta.mesa,
          notes: meta.obs,
          updated_at: new Date().toISOString()
        })
        .eq('id', comanda.uuid);
      if (error) console.error('[handleMetaUpdate] Erro ao atualizar comanda:', error);
    }
  };

  const handleItemsUpdate = async (id: number, items: ItemPedido[], discount: number = 0) => {
    const comanda = comandas[id];
    setComandas(prev => {
      const updatedComandas = { ...prev };
      if (items.length === 0) {
        updatedComandas[id] = { ...updatedComandas[id], items: [], discount: 0, status: 'livre', openedAt: null };
      } else {
        updatedComandas[id] = { ...updatedComandas[id], items, discount };
      }
      return updatedComandas;
    });
    
    if (comanda?.uuid && restaurantId) {
      const subTotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      const total = Math.max(0, subTotal - discount);
      await supabase.from('comanda_items').delete().eq('comanda_id', comanda.uuid);
      if (items.length > 0) {
        const dbItems = items.map(it => ({
          comanda_id: comanda.uuid,
          product_id: it.pid,
          name: it.name,
          price: it.price,
          quantity: it.qty,
          notes: it.note || null
        }));
        const { error: itemErr } = await supabase.from('comanda_items').insert(dbItems);
        if (itemErr) console.error('[handleItemsUpdate] Erro ao inserir itens:', itemErr);
      }
      const { error: cmdErr } = await supabase
        .from('comandas')
        .update({ discount, subtotal: subTotal, total, updated_at: new Date().toISOString() })
        .eq('id', comanda.uuid);
      if (cmdErr) console.error('[handleItemsUpdate] Erro ao atualizar comanda:', cmdErr);
    }
  };

  const handleOpenComanda = async (id: number) => {
    if (!restaurantId) return;
    const now = new Date().toISOString();
    const existing = comandas[id];
    if (existing?.uuid) {
      setComandas(prev => {
        const upd = { ...prev };
        upd[id] = { ...upd[id], status: 'aberta', openedAt: Date.now() };
        return upd;
      });
      return;
    }
    
    const { data: newComanda, error } = await supabase
      .from('comandas')
      .insert([{ restaurant_id: restaurantId, number: id, status: 'aberta', opened_at: now }])
      .select()
      .single();
    
    if (error) {
      console.error('[handleOpenComanda] Erro ao criar comanda:', error);
      alert('Erro ao abrir comanda: ' + mapSupabaseError(error));
      return;
    }
    
    setComandas(prev => {
      const upd = { ...prev };
      upd[id] = { ...upd[id], uuid: newComanda.id, status: 'aberta', openedAt: Date.now() };
      return upd;
    });
  };

  const handleConfirmPayment = async (id: number, method: string, received?: number): Promise<boolean> => {
    const comanda = comandas[id];
    if (!comanda || comanda.items.length === 0) return false;

    const subTotal = comanda.items.reduce((s, it) => s + it.price * it.qty, 0);
    const totalVal = Math.max(0, subTotal - comanda.discount);
    const opName = ownerName || 'Operador';

    setComandas(prev => {
      const updatedComandas = { ...prev };
      updatedComandas[id] = { id, status: 'livre', items: [], mesa: '', garcom: '', obs: '', openedAt: null, discount: 0 };
      return updatedComandas;
    });

    if (comanda.uuid && restaurantId) {
      const { data: histData, error: histErr } = await supabase.rpc('fechar_comanda', {
        p_comanda_uuid: comanda.uuid,
        p_payment_method: method,
        p_subtotal: subTotal,
        p_discount: comanda.discount,
        p_total: totalVal,
        p_caixa_id: caixaAtiva?.id || null,
        p_operador: opName
      });

      if (histErr) {
        console.error('[handleConfirmPayment] Erro ao fechar comanda via RPC:', histErr);
        return false;
      } else if (histData) {
        const h = histData as any;
        const historyItem: HistoricoItem = {
          id: h.id,
          cmdId: h.comanda_number,
          mesa: h.table_number || '',
          garcom: h.waiter_name || '',
          obs: h.notes || '',
          items: (h.items || []).map((it: any) => ({
            id: it.id,
            pid: it.product_id,
            name: it.name,
            price: Number(it.price),
            qty: Number(it.quantity),
            note: it.notes || ''
          })),
          subtotal: Number(h.subtotal),
          discount: Number(h.discount),
          total: Number(h.total),
          payMethod: h.payment_method,
          openedAt: h.opened_at ? new Date(h.opened_at).getTime() : Date.now(),
          closedAt: new Date(h.closed_at).getTime()
        };
        setHistory(prev => [historyItem, ...prev]);

        if (caixaAtiva) {
          const { data: movs } = await supabase
            .from('caixa_movimentacoes')
            .select('*')
            .eq('caixa_id', caixaAtiva.id)
            .eq('tipo', 'venda')
            .order('criado_em', { ascending: false })
            .limit(1);
          if (movs && movs.length > 0) {
            const m = movs[0];
            const movObj: MovimentacaoCaixa = {
              id: m.id, caixaId: m.caixa_id, restaurantId: m.restaurant_id,
              tipo: 'venda', valor: Number(m.valor), formaPagamento: m.forma_pagamento,
              descricao: m.descricao, operador: m.operador,
              criadoEm: new Date(m.criado_em).getTime()
            };
            setMovimentacoesCaixa(prev => [movObj, ...prev]);
          }
        }
        return true;
      }
    } else {
      console.warn('[handleConfirmPayment] Comanda sem UUID, salvando apenas localmente.');
      const historyItem: HistoricoItem = {
        id: '_' + Math.random().toString(36).substring(2, 9),
        cmdId: id, mesa: comanda.mesa, garcom: comanda.garcom, obs: comanda.obs,
        items: comanda.items.map(it => ({ ...it })),
        subtotal: subTotal, discount: comanda.discount, total: totalVal,
        payMethod: method, openedAt: comanda.openedAt || Date.now(), closedAt: Date.now()
      };
      setHistory(prev => [historyItem, ...prev]);
      return true;
    }
    return false;
  }

  const handleCloseEmptyComanda = (id: number) => {
    setComandas(prev => {
      const updatedComandas = { ...prev };
      updatedComandas[id] = {
        ...updatedComandas[id],
        status: 'livre',
        openedAt: null
      };
      return updatedComandas;
    });
  };

  return {
    comandas,
    handleMetaUpdate,
    handleItemsUpdate,
    handleOpenComanda,
    handleConfirmPayment,
    handleCloseEmptyComanda,
    setComandas
  };
}
