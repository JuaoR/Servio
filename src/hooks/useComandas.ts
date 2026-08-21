import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Comanda, ItemPedido, CaixaSessao, HistoricoItem, MovimentacaoCaixa } from '../types';
import { mapSupabaseError } from '../utils/errors';

function makeEmptyComandas(): Record<number, Comanda> { const c: Record<number, Comanda> = {}; for (let i=1;i<=100;i++) c[i]={id:i,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}; return c; }
function isEmployeeSession(){ return Boolean(localStorage.getItem('servio_emp_token')); }
function mapRows(rows:any[]):Record<number,Comanda>{ const next=makeEmptyComandas(); for(const c of rows||[]){const n=Number(c.number);if(n<1||n>100)continue;const items=(c.comanda_items||[]).map((it:any)=>({id:it.id,pid:it.product_id,name:it.name,price:Number(it.price),qty:Number(it.quantity),note:it.notes||''}));if(items.length===0)continue;next[n]={id:n,uuid:c.id,status:'aberta',items,mesa:c.table_number||'',garcom:c.waiter_id||'',obs:c.notes||'',openedAt:c.opened_at?new Date(c.opened_at).getTime():null,discount:Number(c.discount||0)};}return next;}

export function useComandas(restaurantId:string,ownerName:string,caixaAtiva:CaixaSessao|null,setMovimentacoesCaixa:React.Dispatch<React.SetStateAction<MovimentacaoCaixa[]>>,setHistory:React.Dispatch<React.SetStateAction<HistoricoItem[]>>){
 const [comandas,setComandas]=useState<Record<number,Comanda>>(makeEmptyComandas());
 const saveQueues=useRef<Record<number,Promise<void>>>({});
 const localVersions=useRef<Record<number,number>>({});
 const confirmedVersions=useRef<Record<number,number>>({});

 const bumpVersion=(id:number)=>{const next=(localVersions.current[id]||0)+1;localVersions.current[id]=next;return next;};

 useEffect(()=>{if(!restaurantId){setComandas(makeEmptyComandas());return;}let cancelled=false;const employee=isEmployeeSession();
  const load=async()=>{if(cancelled)return;if(employee){const token=localStorage.getItem('servio_emp_token');if(!token)return;const {data,error}=await supabase.rpc('get_employee_context',{p_token:token});if(!error&&data&&!cancelled)setComandas(mapRows(Array.isArray(data.comandas)?data.comandas:[]));return;}
   const {data,error}=await supabase.from('comandas').select('*, comanda_items(*)').eq('restaurant_id',restaurantId).eq('status','aberta');if(!error&&!cancelled){const mapped=mapRows(data||[]);setComandas(prev=>{const next={...prev};for(const n of Object.keys(mapped)){const id=Number(n);if(!saveQueues.current[id]&&localVersions.current[id]===(confirmedVersions.current[id]||0))next[id]=mapped[id];}return next;});}
  };
  load();
  if(employee){const timer=setInterval(load,1500);return()=>{cancelled=true;clearInterval(timer)}}
  const channel=supabase.channel('admin-comandas-'+restaurantId)
   .on('postgres_changes',{event:'*',schema:'public',table:'comandas',filter:'restaurant_id=eq.'+restaurantId},async payload=>{
    if(cancelled)return;const row:any=payload.eventType==='DELETE'?payload.old:payload.new;const number=Number(row?.number);if(number<1||number>100)return;
    if(saveQueues.current[number] || (localVersions.current[number]||0)!==(confirmedVersions.current[number]||0))return;
    if(payload.eventType==='DELETE'||row?.status!=='aberta'){setComandas(prev=>({...prev,[number]:{id:number,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}}));return;}
    const {data}=await supabase.from('comandas').select('*, comanda_items(*)').eq('id',row.id).maybeSingle();if(data&&!cancelled){const mapped=mapRows([data])[number];if(mapped)setComandas(prev=>({...prev,[number]:mapped}));}
   })
   .on('postgres_changes',{event:'*',schema:'public',table:'comanda_items'},async payload=>{
    if(cancelled)return;const comandaId=(payload.new as any)?.comanda_id||(payload.old as any)?.comanda_id;if(!comandaId)return;const parent=(await supabase.from('comandas').select('id,number,status').eq('id',comandaId).eq('restaurant_id',restaurantId).maybeSingle()).data;if(!parent||parent.status!=='aberta')return;const number=Number(parent.number);if(saveQueues.current[number]||(localVersions.current[number]||0)!==(confirmedVersions.current[number]||0))return;const {data}=await supabase.from('comandas').select('*, comanda_items(*)').eq('id',comandaId).maybeSingle();if(data&&!cancelled){const mapped=mapRows([data])[number];if(mapped)setComandas(prev=>({...prev,[number]:mapped}));}
   }).subscribe();
  return()=>{cancelled=true;supabase.removeChannel(channel)};
 },[restaurantId]);

 const handleOpenComanda=async(id:number)=>{if(!restaurantId)return;if(isEmployeeSession()){const token=localStorage.getItem('servio_emp_token');if(!token)return;const {data,error}=await supabase.rpc('employee_open_comanda',{p_token:token,p_number:id});if(error){alert('Erro ao abrir comanda: '+error.message);return;}setComandas(prev=>({...prev,[id]:{...prev[id],id,uuid:data?.uuid,status:'aberta',openedAt:Number(data?.openedAt||Date.now()),mesa:data?.mesa||'',obs:data?.obs||'',discount:Number(data?.discount||0)}}));return;}
  const {data,error}=await supabase.from('comandas').select('*, comanda_items(*)').eq('restaurant_id',restaurantId).eq('number',id).eq('status','aberta').maybeSingle();if(error){console.error('[handleOpenComanda]',error);return;}if(data&&(data.comanda_items||[]).length>0){const v=bumpVersion(id);confirmedVersions.current[id]=v;setComandas(prev=>({...prev,[id]:mapRows([data])[id]}));}
 };

 const handleItemsUpdate=async(id:number,items:ItemPedido[],discount=0)=>{if(!restaurantId)return;if(isEmployeeSession()){const current=comandas[id];setComandas(prev=>({...prev,[id]:{...prev[id],items,discount,status:items.length?'aberta':prev[id].status}}));const token=localStorage.getItem('servio_emp_token');if(!token)return;const {data,error}=await supabase.rpc('employee_save_comanda',{p_token:token,p_number:id,p_items:items,p_discount:discount,p_mesa:current?.mesa||'',p_obs:current?.obs||''});if(error){console.error('[employee_save_comanda]',error);return;}setComandas(prev=>({...prev,[id]:{...prev[id],uuid:data?.uuid,status:'aberta'}}));return;}

  const version=bumpVersion(id);
  setComandas(prev=>({...prev,[id]:{...prev[id],items,discount,status:items.length?'aberta':'livre'}}));

  const previous=saveQueues.current[id]||Promise.resolve();
  const job=previous.catch(()=>undefined).then(async()=>{
    let uuid:string|undefined;
    if(items.length===0){
      const {data:existing}=await supabase.from('comandas').select('id').eq('restaurant_id',restaurantId).eq('number',id).eq('status','aberta').maybeSingle();uuid=existing?.id;if(uuid)await supabase.from('comandas').delete().eq('id',uuid).eq('restaurant_id',restaurantId).eq('status','aberta');
      if(localVersions.current[id]===version){confirmedVersions.current[id]=version;setComandas(prev=>({...prev,[id]:{...prev[id],status:'livre',items:[],uuid:undefined,openedAt:null,discount:0}}));}
      return;
    }

    const {data:existing,error:lookupError}=await supabase.from('comandas').select('id,opened_at').eq('restaurant_id',restaurantId).eq('number',id).eq('status','aberta').maybeSingle();
    if(lookupError){console.error('[handleItemsUpdate] lookup:',lookupError);return;}
    uuid=existing?.id;
    if(!uuid){
      const {data:nova,error}=await supabase.from('comandas').insert({restaurant_id:restaurantId,number:id,status:'aberta',opened_at:new Date().toISOString()}).select('id,opened_at').single();
      if(error){if((error as any).code==='23505'){const {data:db}=await supabase.from('comandas').select('id,opened_at').eq('restaurant_id',restaurantId).eq('number',id).eq('status','aberta').maybeSingle();uuid=db?.id;}else{console.error('[handleItemsUpdate] create:',error);alert('Erro ao salvar comanda: '+mapSupabaseError(error));return;}}
      else uuid=nova?.id;
    }
    if(!uuid)return;

    const subtotal=items.reduce((s,it)=>s+it.price*it.qty,0),total=Math.max(0,subtotal-discount);
    const {error:deleteError}=await supabase.from('comanda_items').delete().eq('comanda_id',uuid);if(deleteError){console.error('[handleItemsUpdate] delete items:',deleteError);return;}
    const {error:insertError}=await supabase.from('comanda_items').insert(items.map(it=>({comanda_id:uuid!,product_id:it.pid,name:it.name,price:it.price,quantity:it.qty,notes:it.note||null})));if(insertError){console.error('[handleItemsUpdate] insert items:',insertError);return;}
    const {error:updateError}=await supabase.from('comandas').update({discount,subtotal,total,updated_at:new Date().toISOString()}).eq('id',uuid).eq('restaurant_id',restaurantId);if(updateError){console.error('[handleItemsUpdate] update comanda:',updateError);return;}

    if(localVersions.current[id]===version){confirmedVersions.current[id]=version;setComandas(prev=>({...prev,[id]:{...prev[id],uuid,status:'aberta',items,discount,openedAt:prev[id].openedAt||Date.now()}}));}
  });
  saveQueues.current[id]=job.finally(()=>{if(saveQueues.current[id]===job)delete saveQueues.current[id];});
 };

 const handleMetaUpdate=async(id:number,meta:{mesa:string;garcom:string;obs:string})=>{const current=comandas[id];setComandas(prev=>({...prev,[id]:{...prev[id],...meta}}));if(!restaurantId||isEmployeeSession())return;if(current?.uuid)await supabase.from('comandas').update({table_number:meta.mesa,notes:meta.obs,waiter_id:null,updated_at:new Date().toISOString()}).eq('id',current.uuid).eq('restaurant_id',restaurantId);};
 const handleConfirmPayment=async(id:number,method:string,_received?:number):Promise<boolean>=>{const current=comandas[id];if(!current||current.items.length===0||!restaurantId)return false;if(isEmployeeSession()){const token=localStorage.getItem('servio_emp_token');if(!token)return false;const {data,error}=await supabase.rpc('employee_close_comanda',{p_token:token,p_number:id,p_method:method});if(error||!data)return false;setComandas(prev=>({...prev,[id]:{id,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}}));return true;}if(!current.uuid)return false;const subtotal=current.items.reduce((s,it)=>s+it.price*it.qty,0),total=Math.max(0,subtotal-(current.discount||0)),now=new Date().toISOString();const {error}=await supabase.from('comandas').update({status:'fechada',payment_method:method,subtotal,discount:current.discount||0,total,closed_at:now,updated_at:now}).eq('id',current.uuid).eq('restaurant_id',restaurantId);if(error){alert('Erro ao fechar comanda: '+error.message);return false}confirmedVersions.current[id]=localVersions.current[id]||0;setComandas(prev=>({...prev,[id]:{id,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}}));setHistory(prev=>[{id:current.uuid!,cmdId:id,mesa:current.mesa||'',garcom:current.garcom||'',obs:current.obs||'',items:current.items.map(it=>({...it})),subtotal,discount:current.discount||0,total,payMethod:method,openedAt:current.openedAt||Date.now(),closedAt:Date.now()},...prev]);return true;};
 const handleCloseEmptyComanda=async(id:number)=>{if(isEmployeeSession()){setComandas(prev=>({...prev,[id]:{...prev[id],status:'livre',openedAt:null}}));return;}const uuid=comandas[id]?.uuid;if(uuid)await supabase.from('comandas').delete().eq('id',uuid).eq('restaurant_id',restaurantId).eq('status','aberta');const v=bumpVersion(id);confirmedVersions.current[id]=v;setComandas(prev=>({...prev,[id]:{...prev[id],status:'livre',items:[],uuid:undefined,openedAt:null,discount:0}}));};
 return {comandas,handleMetaUpdate,handleItemsUpdate,handleOpenComanda,handleConfirmPayment,handleCloseEmptyComanda,setComandas};
}