import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Comanda, ItemPedido, CaixaSessao, HistoricoItem, MovimentacaoCaixa } from '../types';
import { mapSupabaseError } from '../utils/errors';

function makeEmptyComandas(): Record<number, Comanda> {
  const c: Record<number, Comanda> = {};
  for (let i = 1; i <= 100; i++) c[i] = { id: i, status: 'livre', items: [], mesa: '', garcom: '', obs: '', openedAt: null, discount: 0 };
  return c;
}
function isEmployeeSession() { return Boolean(localStorage.getItem('servio_emp_token')); }
function mapEmployeeComandas(rows: any[]): Record<number, Comanda> {
  const next = makeEmptyComandas();
  for (const c of rows || []) {
    const number = Number(c.id); if (number < 1 || number > 100) continue;
    next[number] = { id:number, uuid:c.uuid, status:c.status==='aberta'?'aberta':'livre',
      items:(c.items||[]).map((it:any)=>({id:it.id,pid:it.pid,name:it.name,price:Number(it.price),qty:Number(it.qty),note:it.note||''})),
      mesa:c.mesa||'', garcom:c.garcom||'', obs:c.obs||'', openedAt:c.openedAt?Number(c.openedAt):null, discount:Number(c.discount||0) };
  }
  return next;
}

export function useComandas(restaurantId:string, ownerName:string, caixaAtiva:CaixaSessao|null,
  setMovimentacoesCaixa:React.Dispatch<React.SetStateAction<MovimentacaoCaixa[]>>, setHistory:React.Dispatch<React.SetStateAction<HistoricoItem[]>>) {
  const [comandas,setComandas]=useState<Record<number,Comanda>>(makeEmptyComandas());

  useEffect(()=>{
    if(!restaurantId){setComandas(makeEmptyComandas());return;}
    const employee=isEmployeeSession(); let cancelled=false; let pollTimer:ReturnType<typeof setInterval>|null=null;
    const loadEmployee=async()=>{
      const token=localStorage.getItem('servio_emp_token'); if(!token||cancelled)return;
      const {data,error}=await supabase.rpc('employee_get_comandas',{p_token:token});
      if(error){
        console.error('[employee_get_comandas]',error);
        if(error.code==='PGRST202' || error.message?.includes('404') || error.message?.includes('Could not find the function')) {
          if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
        }
        return;
      }
      if(!cancelled)setComandas(mapEmployeeComandas(data||[]));
    };
    const loadAdmin=async()=>{
      const {data}=await supabase.from('comandas').select('*, comanda_items(*)').eq('restaurant_id',restaurantId).eq('status','aberta');
      if(!data||cancelled)return;
      const next=makeEmptyComandas();
      for(const c of data as any[]){if(!c.number||c.number<1||c.number>100)continue;const items=(c.comanda_items||[]).map((it:any)=>({id:it.id,pid:it.product_id,name:it.name,price:Number(it.price),qty:Number(it.quantity),note:it.notes||''}));if(items.length>0)next[c.number]={id:c.number,uuid:c.id,status:'aberta',items,mesa:c.table_number||'',garcom:c.waiter_id||'',obs:c.notes||'',openedAt:c.opened_at?new Date(c.opened_at).getTime():Date.now(),discount:Number(c.discount||0)}}
      setComandas(next);
    };
    if(employee){loadEmployee();pollTimer=setInterval(loadEmployee,1500);return()=>{cancelled=true;if(pollTimer)clearInterval(pollTimer)}}
    loadAdmin();
    const channel=supabase.channel('comandas_'+restaurantId).on('postgres_changes',{event:'*',schema:'public',table:'comandas',filter:'restaurant_id=eq.'+restaurantId},async payload=>{
      const number=Number(((payload.eventType==='DELETE'?payload.old:payload.new) as any)?.number); if(number<1||number>100)return;
      if(payload.eventType==='DELETE'||(payload.new as any)?.status==='fechada'){setComandas(prev=>({...prev,[number]:{id:number,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}}));return}
      const nd:any=payload.new;if(nd?.status!=='aberta')return;const {data:fresh}=await supabase.from('comandas').select('*, comanda_items(*)').eq('id',nd.id).maybeSingle();if(!fresh)return;
      const items=(fresh.comanda_items||[]).map((it:any)=>({id:it.id,pid:it.product_id,name:it.name,price:Number(it.price),qty:Number(it.quantity),note:it.notes||''}));
      setComandas(prev=>({...prev,[number]:{id:number,uuid:fresh.id,status:'aberta',items,mesa:fresh.table_number||'',garcom:fresh.waiter_id||'',obs:fresh.notes||'',openedAt:fresh.opened_at?new Date(fresh.opened_at).getTime():Date.now(),discount:Number(fresh.discount||0)}}));
    }).subscribe();
    return()=>{cancelled=true;supabase.removeChannel(channel)};
  },[restaurantId]);

  const handleOpenComanda=async(id:number)=>{
    if(!restaurantId)return;
    if(isEmployeeSession()){
      const token=localStorage.getItem('servio_emp_token');if(!token)return;
      const {data,error}=await supabase.rpc('employee_open_comanda',{p_token:token,p_number:id});
      if(error){alert('Erro ao abrir comanda: '+(error.message||'Permissão negada pelo banco de dados'));return;}
      setComandas(prev=>({...prev,[id]:{...prev[id],id,uuid:data?.uuid,status:'aberta',openedAt:Number(data?.openedAt||Date.now()),mesa:data?.mesa||'',obs:data?.obs||'',discount:Number(data?.discount||0)}}));return;
    }
    const existing=comandas[id];
    if(existing?.uuid){const {data:check}=await supabase.from('comandas').select('id,status').eq('id',existing.uuid).maybeSingle();if(check?.status==='aberta'){setComandas(prev=>({...prev,[id]:{...prev[id],status:'aberta',openedAt:Date.now()}}));return}}
    const {data:newComanda,error}=await supabase.from('comandas').insert([{restaurant_id:restaurantId,number:id,status:'aberta',opened_at:new Date().toISOString()}]).select().single();
    if(error){if((error as any).code==='23505'){const {data:existingDb}=await supabase.from('comandas').select('*').eq('restaurant_id',restaurantId).eq('number',id).eq('status','aberta').maybeSingle();if(existingDb){setComandas(prev=>({...prev,[id]:{...prev[id],uuid:existingDb.id,status:'aberta',openedAt:Date.now()}}));return}}console.error('[handleOpenComanda] Erro ao criar comanda:',error);alert('Erro ao abrir comanda: '+mapSupabaseError(error));return}
    setComandas(prev=>({...prev,[id]:{...prev[id],uuid:newComanda.id,status:'aberta',openedAt:Date.now()}}));
  };

  const handleItemsUpdate=async(id:number,items:ItemPedido[],discount:number=0)=>{
    if(!restaurantId)return;const current=comandas[id];setComandas(prev=>({...prev,[id]:{...prev[id],items,discount,status:'aberta'}}));
    if(isEmployeeSession()){
      const token=localStorage.getItem('servio_emp_token');if(!token)return;
      const {data,error}=await supabase.rpc('employee_save_comanda',{p_token:token,p_number:id,p_items:items,p_discount:discount,p_mesa:current?.mesa||'',p_obs:current?.obs||''});
      if(error){console.error('[handleItemsUpdate] Erro:',error);return}
      setComandas(prev=>({...prev,[id]:{...prev[id],uuid:data?.uuid,status:'aberta',openedAt:Number(data?.openedAt||prev[id].openedAt||Date.now())}}));return;
    }
    let uuid=current?.uuid;
    if(!uuid){const {data:existing}=await supabase.from('comandas').select('id').eq('restaurant_id',restaurantId).eq('number',id).eq('status','aberta').maybeSingle();if(existing)uuid=existing.id;else{const {data:nova}=await supabase.from('comandas').insert([{restaurant_id:restaurantId,number:id,status:'aberta',opened_at:new Date().toISOString()}]).select().single();uuid=nova?.id}if(uuid)setComandas(prev=>({...prev,[id]:{...prev[id],uuid,status:'aberta',openedAt:Date.now()}}))}
    if(!uuid)return;const subtotal=items.reduce((s,it)=>s+it.price*it.qty,0),total=Math.max(0,subtotal-discount);await supabase.from('comanda_items').delete().eq('comanda_id',uuid);if(items.length)await supabase.from('comanda_items').insert(items.map(it=>({comanda_id:uuid,product_id:it.pid,name:it.name,price:it.price,quantity:it.qty,notes:it.note||null})));await supabase.from('comandas').update({discount,subtotal,total,updated_at:new Date().toISOString()}).eq('id',uuid);
  };

  const handleMetaUpdate=async(id:number,meta:{mesa:string;garcom:string;obs:string})=>{const current=comandas[id];setComandas(prev=>({...prev,[id]:{...prev[id],...meta}}));if(!restaurantId)return;if(isEmployeeSession()){const token=localStorage.getItem('servio_emp_token');if(!token)return;const {error}=await supabase.rpc('employee_save_comanda',{p_token:token,p_number:id,p_items:current?.items||[],p_discount:current?.discount||0,p_mesa:meta.mesa,p_obs:meta.obs});if(error)console.error('[handleMetaUpdate] Erro:',error);return}if(current?.uuid){const {error}=await supabase.from('comandas').update({table_number:meta.mesa,notes:meta.obs,updated_at:new Date().toISOString()}).eq('id',current.uuid);if(error)console.error('[handleMetaUpdate] Erro:',error)}};

  const handleConfirmPayment=async(id:number,method:string,_received?:number):Promise<boolean>=>{const current=comandas[id];if(!current||current.items.length===0||!restaurantId)return false;if(isEmployeeSession()){const token=localStorage.getItem('servio_emp_token');if(!token)return false;const {data,error}=await supabase.rpc('employee_close_comanda',{p_token:token,p_number:id,p_method:method});if(error||!data)return false;setComandas(prev=>({...prev,[id]:{id,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}}));return true}if(!current.uuid)return false;const subtotal=current.items.reduce((s,it)=>s+it.price*it.qty,0),total=Math.max(0,subtotal-(current.discount||0)),now=new Date().toISOString();const {error:closeErr}=await supabase.from('comandas').update({status:'fechada',payment_method:method,subtotal,discount:current.discount||0,total,closed_at:now,updated_at:now}).eq('id',current.uuid);if(closeErr){console.error('[handleConfirmPayment] Erro ao fechar comanda:',closeErr);alert('Erro ao fechar comanda: '+closeErr.message);return false}setComandas(prev=>({...prev,[id]:{id,uuid:undefined,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}}));setHistory(prev=>[{id:current.uuid!,cmdId:id,mesa:current.mesa||'',garcom:current.garcom||'',obs:current.obs||'',items:current.items.map(it=>({...it})),subtotal,discount:current.discount||0,total,payMethod:method,openedAt:current.openedAt||Date.now(),closedAt:Date.now()},...prev]);return true};
  const handleCloseEmptyComanda=(id:number)=>setComandas(prev=>({...prev,[id]:{...prev[id],status:'livre',openedAt:null}}));
  return {comandas,handleMetaUpdate,handleItemsUpdate,handleOpenComanda,handleConfirmPayment,handleCloseEmptyComanda,setComandas};
}
