import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Comanda, ItemPedido, CaixaSessao, HistoricoItem, MovimentacaoCaixa } from '../types';

function makeEmptyComandas(): Record<number, Comanda> { const c: Record<number, Comanda> = {}; for (let i=1;i<=100;i++) c[i]={id:i,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}; return c; }
function isEmployeeSession(){ return Boolean(localStorage.getItem('servio_emp_token')); }
function mapRows(rows:any[]):Record<number,Comanda>{ const next=makeEmptyComandas(); for(const c of rows||[]){const n=Number(c.number);if(n<1||n>100)continue;const items=(c.items||c.comanda_items||[]).map((it:any)=>({id:it.id,pid:it.pid||it.product_id,name:it.name,price:Number(it.price),qty:Number(it.qty||it.quantity),note:it.note||it.notes||''}));if(items.length===0)continue;next[n]={id:n,uuid:c.uuid||c.id,status:'aberta',items,mesa:c.mesa||c.table_number||'',garcom:c.garcom||c.waiter_id||'',obs:c.obs||c.notes||'',openedAt:c.openedAt?Number(c.openedAt):(c.opened_at?new Date(c.opened_at).getTime():null),discount:Number(c.discount||0)};}return next;}

export function useComandas(restaurantId:string,ownerName:string,caixaAtiva:CaixaSessao|null,setMovimentacoesCaixa:React.Dispatch<React.SetStateAction<MovimentacaoCaixa[]>>,setHistory:React.Dispatch<React.SetStateAction<HistoricoItem[]>>){
 const [comandas,setComandas]=useState<Record<number,Comanda>>(makeEmptyComandas());
 const saveQueues=useRef<Record<number,Promise<void>>>({});
 useEffect(()=>{if(!restaurantId){setComandas(makeEmptyComandas());return;}let cancelled=false;const employee=isEmployeeSession();
  const load=async()=>{if(cancelled)return;
   if(employee){const token=localStorage.getItem('servio_emp_token');if(!token)return;const {data,error}=await supabase.rpc('get_employee_context',{p_token:token});if(!error&&data&&!cancelled)setComandas(mapRows(Array.isArray(data.comandas)?data.comandas:[]));return;}
   const {data,error}=await supabase.rpc('admin_get_open_comandas',{p_restaurant_id:restaurantId});
   if(error){console.error('[admin_get_open_comandas]',error);return;}
   if(!cancelled)setComandas(mapRows(Array.isArray(data)?data:[]));
  };
  load();
  if(employee){const timer=setInterval(load,1500);return()=>{cancelled=true;clearInterval(timer)}}
  const channel=supabase.channel('admin-comandas-'+restaurantId).on('postgres_changes',{event:'*',schema:'public',table:'comandas',filter:'restaurant_id=eq.'+restaurantId},()=>{void load()}).on('postgres_changes',{event:'*',schema:'public',table:'comanda_items'},()=>{void load()}).subscribe();
  return()=>{cancelled=true;supabase.removeChannel(channel)};
 },[restaurantId]);

 const handleOpenComanda=async(id:number)=>{if(!restaurantId)return;
  if(isEmployeeSession()){const token=localStorage.getItem('servio_emp_token');if(!token)return;const {data,error}=await supabase.rpc('employee_open_comanda',{p_token:token,p_number:id});if(error){alert('Erro ao abrir comanda: '+error.message);return;}setComandas(prev=>({...prev,[id]:{...prev[id],id,uuid:data?.uuid,status:'aberta',openedAt:Number(data?.openedAt||Date.now()),mesa:data?.mesa||'',obs:data?.obs||'',discount:Number(data?.discount||0)}}));return;}
  const {data,error}=await supabase.rpc('admin_get_open_comandas',{p_restaurant_id:restaurantId});if(error){console.error('[handleOpenComanda]',error);return;}const found=Array.isArray(data)?data.find((x:any)=>Number(x.number)===id):null;if(found){setComandas(prev=>({...prev,[id]:mapRows([found])[id]}));}
 };

 const handleItemsUpdate=async(id:number,items:ItemPedido[],discount=0)=>{if(!restaurantId)return;
  if(isEmployeeSession()){const current=comandas[id];setComandas(prev=>({...prev,[id]:{...prev[id],items,discount,status:items.length?'aberta':prev[id].status}}));const token=localStorage.getItem('servio_emp_token');if(!token)return;const {data,error}=await supabase.rpc('employee_save_comanda',{p_token:token,p_number:id,p_items:items,p_discount:discount,p_mesa:current?.mesa||'',p_obs:current?.obs||''});if(error){console.error('[employee_save_comanda]',error);return;}setComandas(prev=>({...prev,[id]:{...prev[id],uuid:data?.uuid,status:'aberta'}}));return;}

  // Admin: update the UI immediately. Persistence is atomic and serialized per comanda.
  setComandas(prev=>({...prev,[id]:{...prev[id],items,discount,status:items.length?'aberta':'livre'}}));
  const previous=saveQueues.current[id]||Promise.resolve();
  const job=previous.catch(()=>undefined).then(async()=>{
    const {data,error}=await supabase.rpc('admin_save_comanda',{p_restaurant_id:restaurantId,p_number:id,p_items:items,p_discount:discount,p_mesa:comandas[id]?.mesa||'',p_obs:comandas[id]?.obs||''});
    if(error){console.error('[admin_save_comanda]',error);return;}
    if(!cancelledForSave(id,saveQueues.current)){
      setComandas(prev=>({...prev,[id]:{...prev[id],uuid:data?.uuid||prev[id].uuid,status:data?.status==='aberta'?'aberta':'livre',openedAt:data?.opened_at?new Date(data.opened_at).getTime():prev[id].openedAt}}));
    }
  });
  saveQueues.current[id]=job.finally(()=>{if(saveQueues.current[id]===job)delete saveQueues.current[id]});
 };
 const handleMetaUpdate=async(id:number,meta:{mesa:string;garcom:string;obs:string})=>{setComandas(prev=>({...prev,[id]:{...prev[id],...meta}}));if(!restaurantId||isEmployeeSession())return;const current=comandas[id];if(current?.items?.length)void handleItemsUpdate(id,current.items,current.discount);};
 const handleConfirmPayment=async(id:number,method:string,_received?:number):Promise<boolean>=>{const current=comandas[id];if(!current||current.items.length===0||!restaurantId)return false;if(isEmployeeSession()){const token=localStorage.getItem('servio_emp_token');if(!token)return false;const {data,error}=await supabase.rpc('employee_close_comanda',{p_token:token,p_number:id,p_method:method});if(error||!data)return false;setComandas(prev=>({...prev,[id]:{id,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}}));return true;}if(!current.uuid)return false;const subtotal=current.items.reduce((s,it)=>s+it.price*it.qty,0),total=Math.max(0,subtotal-(current.discount||0)),now=new Date().toISOString();const {error}=await supabase.from('comandas').update({status:'fechada',payment_method:method,subtotal,discount:current.discount||0,total,closed_at:now,updated_at:now}).eq('id',current.uuid).eq('restaurant_id',restaurantId);if(error){alert('Erro ao fechar comanda: '+error.message);return false}setComandas(prev=>({...prev,[id]:{id,status:'livre',items:[],mesa:'',garcom:'',obs:'',openedAt:null,discount:0}}));setHistory(prev=>[{id:current.uuid!,cmdId:id,mesa:current.mesa||'',garcom:current.garcom||'',obs:current.obs||'',items:current.items.map(it=>({...it})),subtotal,discount:current.discount||0,total,payMethod:method,openedAt:current.openedAt||Date.now(),closedAt:Date.now()},...prev]);return true;};
 const handleCloseEmptyComanda=async(id:number)=>{if(isEmployeeSession()){setComandas(prev=>({...prev,[id]:{...prev[id],status:'livre',openedAt:null}}));return;}await supabase.rpc('admin_save_comanda',{p_restaurant_id:restaurantId,p_number:id,p_items:[],p_discount:0,p_mesa:'',p_obs:''});setComandas(prev=>({...prev,[id]:{...prev[id],status:'livre',items:[],uuid:undefined,openedAt:null,discount:0}}));};
 return {comandas,handleMetaUpdate,handleItemsUpdate,handleOpenComanda,handleConfirmPayment,handleCloseEmptyComanda,setComandas};
}
function cancelledForSave(_id:number,_queues:Record<number,Promise<void>>){return false;}
