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
            const toClose: string[] = [];
            dbComandas.forEach((c: any) => {
              if (c.number && c.number >= 1 && c.number <= 100) {
                const itensDB: any[] = c.comanda_items || [];
                const mappedItems = itensDB.map((it: any) => ({
                  id: it.id, pid: it.product_id, name: it.name,
                  price: Number(it.price), qty: Number(it.quantity), note: it.notes || ''
                }));
                if (mappedItems.length > 0) {
                  updatedComandas[c.number] = {
                    id: c.number, uuid: c.id, status: 'aberta',
                    items: mappedItems, mesa: c.table_number || '',
                    garcom: c.waiter_id || '', obs: c.notes || '',
                    openedAt: c.opened_at ? new Date(c.opened_at).getTime() : Date.now(),
                    discount: Number(c.discount) || 0
                  };
                } else {
                  // Comanda aberta sem itens = lixo antigo, fechar no banco
                  toClose.push(c.id);
                }
              }
            });
            setComandas(updatedComandas);
            // Fechar silenciosamente todas as comandas vazias no banco
            if (toClose.length > 0) {
              supabase.from('comandas').update({ status: 'fechada' })
                .in('id', toClose).then(() => {});
            }
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
               // Buscar itens frescos do Supabase (preço sempre atualizado)
               supabase
                 .from('comandas')
                 .select('*, comanda_items(*)')
                 .eq('id', newData.id)
                 .single()
                 .then(({ data: fresh }) => {
                   if (!fresh) return;
                   const itensDB: any[] = fresh.comanda_items || [];
                   const mappedItems = itensDB.map((it: any) => ({
                     id: it.id, pid: it.product_id, name: it.name,
                     price: Number(it.price), qty: Number(it.quantity), note: it.notes || ''
                   }));
                   setComandas(prev => {
                     const upd = { ...prev };
                     upd[newData.number] = {
                       id: newData.number, uuid: newData.id, status: 'aberta',
                       items: mappedItems, mesa: fresh.table_number || '',
                       garcom: fresh.waiter_id || '', obs: fresh.notes || '',
                       openedAt: fresh.opened_at ? new Date(fresh.opened_at).getTime() : Date.now(),
                       discount: Number(fresh.discount) || 0
                     };
                     return upd;
                   });
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
    if (!restaurantId) return;
    const comanda = comandas[id];

    // Atualizar estado local
    setComandas(prev => {
      const upd = { ...prev };
      // NUNCA zerar uuid ou status aqui — só itens
      upd[id] = { ...upd[id], items, discount };
      return upd;
    });

    // Garantir que temos uuid — se não tiver, buscar/criar no banco
    let uuid = comanda?.uuid;
    if (!uuid) {
      // Tentar buscar comanda aberta existente no banco
      const { data: existing } = await supabase
        .from('comandas')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('number', id)
        .eq('status', 'aberta')
        .single();
      if (existing) {
        uuid = existing.id;
        setComandas(prev => ({ ...prev, [id]: { ...prev[id], uuid: existing.id } }));
      } else {
        // Criar nova comanda no banco
        const { data: nova } = await supabase
          .from('comandas')
          .insert([{ restaurant_id: restaurantId, number: id, status: 'aberta', opened_at: new Date().toISOString() }])
          .select().single();
        if (nova) {
          uuid = nova.id;
          setComandas(prev => ({ ...prev, [id]: { ...prev[id], uuid: nova.id, status: 'aberta', openedAt: Date.now() } }));
        }
      }
    }

    if (!uuid) { console.error('[handleItemsUpdate] Sem UUID para comanda', id); return; }

    const subTotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const total = Math.max(0, subTotal - discount);

    // Deletar e reinserir itens (forma mais segura)
    await supabase.from('comanda_items').delete().eq('comanda_id', uuid);
    if (items.length > 0) {
      const dbItems = items.map(it => ({
        comanda_id: uuid,
        product_id: it.pid,
        name: it.name,
        price: it.price,
        quantity: it.qty,
        notes: it.note || null
      }));
      const { error: itemErr } = await supabase.from('comanda_items').insert(dbItems);
      if (itemErr) console.error('[handleItemsUpdate] Erro ao inserir itens:', itemErr);
    }
    // Atualizar totais na comanda
    await supabase
      .from('comandas')
      .update({ discount, subtotal: subTotal, total, updated_at: new Date().toISOString() })
      .eq('id', uuid);
  };

  const handleOpenComanda = async (id: number) => {
    if (!restaurantId) return;
    const now = new Date().toISOString();
    const existing = comandas[id];

    // Se já tem uuid no estado, verificar se ainda existe no banco
    if (existing?.uuid) {
      const { data: check } = await supabase
        .from('comandas').select('id, status').eq('id', existing.uuid).single();
      if (check && check.status === 'aberta') {
        setComandas(prev => {
          const upd = { ...prev };
          upd[id] = { ...upd[id], status: 'aberta', openedAt: Date.now() };
          return upd;
        });
        return;
      }
      // uuid inválido ou comanda já fechada — limpar e criar nova
      setComandas(prev => {
        const upd = { ...prev };
        upd[id] = { ...upd[id], uuid: undefined, status: 'livre', items: [] };
        return upd;
      });
    }

    const { data: newComanda, error } = await supabase
      .from('comandas')
      .insert([{ restaurant_id: restaurantId, number: id, status: 'aberta', opened_at: now }])
      .select()
      .single();

    if (error) {
      // Registro duplicado: buscar a comanda existente no banco
      if ((error as any).code === '23505') {
        const { data: existing } = await supabase
          .from('comandas').select('*').eq('restaurant_id', restaurantId)
          .eq('number', id).eq('status', 'aberta').single();
        if (existing) {
          setComandas(prev => {
            const upd = { ...prev };
            upd[id] = { ...upd[id], uuid: existing.id, status: 'aberta', openedAt: Date.now() };
            return upd;
          });
          return;
        }
      }
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
    if (!comanda.uuid || !restaurantId) {
      console.error('[handleConfirmPayment] Comanda sem UUID ou sem restaurantId');
      return false;
    }

    const subTotal = comanda.items.reduce((s, it) => s + it.price * it.qty, 0);
    const totalVal = Math.max(0, subTotal - (comanda.discount || 0));
    const opName = ownerName || 'Operador';
    const now = new Date().toISOString();

    // PASSO 1: Marcar comanda como fechada no banco (fonte de verdade)
    const { error: closeErr } = await supabase
      .from('comandas')
      .update({
        status: 'fechada',
        payment_method: method,
        subtotal: subTotal,
        discount: comanda.discount || 0,
        total: totalVal,
        closed_at: now,
        updated_at: now
      })
      .eq('id', comanda.uuid);

    if (closeErr) {
      console.error('[handleConfirmPayment] Erro ao fechar comanda:', closeErr);
      alert('Erro ao fechar comanda: ' + closeErr.message);
      return false;
    }

    // PASSO 2: Atualizar estado local — comanda vira livre
    setComandas(prev => ({
      ...prev,
      [id]: { id, uuid: undefined, status: 'livre', items: [], mesa: '', garcom: '', obs: '', openedAt: null, discount: 0 }
    }));

    // PASSO 3: Buscar dados completos da comanda fechada para o histórico
    const { data: fechada } = await supabase
      .from('comandas')
      .select('*, comanda_items(*)')
      .eq('id', comanda.uuid)
      .single();

    const historyItem: HistoricoItem = {
      id: comanda.uuid,
      cmdId: id,
      mesa: comanda.mesa || '',
      garcom: comanda.garcom || '',
      obs: comanda.obs || '',
      items: comanda.items.map(it => ({ ...it })),
      subtotal: subTotal,
      discount: comanda.discount || 0,
      total: totalVal,
      payMethod: method,
      openedAt: comanda.openedAt || Date.now(),
      closedAt: Date.now()
    };
    setHistory(prev => [historyItem, ...prev]);

    // PASSO 4: Registrar movimentação no caixa se houver caixa aberto
    if (caixaAtiva) {
      const { data: newMov, error: movErr } = await supabase
        .from('caixa_movimentacoes')
        .insert({
          caixa_id: caixaAtiva.id,
          restaurant_id: restaurantId,
          tipo: 'venda',
          valor: totalVal,
          forma_pagamento: method,
          descricao: 'Comanda #' + id,
          operador: opName,
          comanda_id: comanda.uuid
        })
        .select()
        .single();

      if (movErr) {
        console.error('[handleConfirmPayment] Erro ao registrar movimentação:', movErr);
      } else if (newMov) {
        setMovimentacoesCaixa(prev => [{
          id: newMov.id,
          caixaId: newMov.caixa_id,
          restaurantId: newMov.restaurant_id,
          tipo: 'venda',
          valor: Number(newMov.valor),
          formaPagamento: newMov.forma_pagamento,
          descricao: newMov.descricao,
          operador: newMov.operador,
          criadoEm: new Date(newMov.criado_em).getTime()
        }, ...prev]);
      }
    }

    return true;
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