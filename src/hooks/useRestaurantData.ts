import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Categoria, Produto, Funcionario, HistoricoItem } from '../types';
import { mapSupabaseError } from '../utils/errors';

export function useRestaurantData(restaurantId: string) {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [products, setProducts] = useState<Produto[]>([]);
  const [history, setHistory] = useState<HistoricoItem[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      const fetchData = async () => {
        setIsLoadingData(true);
        try {
          const employeeToken = localStorage.getItem('servio_emp_token');

          if (employeeToken) {
            const { data: context, error } = await supabase.rpc('get_employee_context', { p_token: employeeToken });
            if (error || !context) {
              console.error('Erro ao carregar dados do funcionário:', error);
              return;
            }

            const dbCategories = Array.isArray(context.categories) ? context.categories : [];
            const dbProducts = Array.isArray(context.products) ? context.products : [];
            const waiter = context.waiter;

            setCategories(dbCategories.map((c: any) => ({
              id: c.id, name: c.name, color: c.color, icon: c.icon, restaurant_id: c.restaurant_id
            })));
            setProducts(dbProducts.map((p: any) => ({
              id: p.id, name: p.name, cid: p.category_id, category_id: p.category_id,
              price: Number(p.price), avail: p.is_available, is_available: p.is_available,
              cost_price: p.cost_price, sku: p.sku, stock_quantity: Number(p.stock_quantity || 0),
              track_stock: p.track_stock, restaurant_id: p.restaurant_id
            })));
            setFuncionarios(waiter ? [{
              id: waiter.id, name: waiter.name, code: waiter.code, username: waiter.code,
              password: '', phone: '', whatsapp: '', email: '', active: true, is_active: true,
              commissionRate: 0, commission_rate: 0, restaurant_id: context.restaurant_id
            }] : []);
            setHistory([]);
            return;
          }

          const [
            { data: dbCategories },
            { data: dbProducts },
            { data: dbWaiters },
            { data: dbHistory }
          ] = await Promise.all([
            supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('name'),
            supabase.from('products').select('*').eq('restaurant_id', restaurantId).order('name'),
            supabase.from('waiters').select('*').eq('restaurant_id', restaurantId).order('name'),
            supabase.from('comanda_history').select('*').eq('restaurant_id', restaurantId).order('closed_at', { ascending: false }).limit(200)
          ]);

          if (dbCategories) setCategories(dbCategories.map((c: any) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon, restaurant_id: c.restaurant_id })));
          if (dbProducts) setProducts(dbProducts.map((p: any) => ({ id: p.id, name: p.name, cid: p.category_id, category_id: p.category_id, price: Number(p.price), avail: p.is_available, is_available: p.is_available, cost_price: p.cost_price, sku: p.sku, stock_quantity: Number(p.stock_quantity || 0), track_stock: p.track_stock, restaurant_id: p.restaurant_id })));
          if (dbWaiters) setFuncionarios(dbWaiters.map((w: any) => ({ id: w.id, name: w.name, code: w.code, username: w.code, password: w.password || '', phone: w.phone, whatsapp: w.phone, email: w.email, active: w.is_active, is_active: w.is_active, commissionRate: Number(w.commission_rate || 0), commission_rate: Number(w.commission_rate || 0), restaurant_id: w.restaurant_id })));
          if (dbHistory) setHistory(dbHistory.map((h: any) => ({ id: h.id, cmdId: h.comanda_number, mesa: h.table_number || '', garcom: h.waiter_name || '', obs: h.notes || '', items: (h.items || []).map((it: any) => ({ id: it.id || String(Math.random()), pid: it.product_id, name: it.name, price: Number(it.price), qty: Number(it.quantity), note: it.notes || '' })), subtotal: Number(h.subtotal), discount: Number(h.discount), total: Number(h.total), payMethod: h.payment_method || '', openedAt: h.opened_at ? new Date(h.opened_at).getTime() : Date.now(), closedAt: new Date(h.closed_at).getTime() })));
        } catch (e) {
          console.error('Erro ao buscar dados do restaurante:', e);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    } else {
      setCategories([]); setProducts([]); setHistory([]); setFuncionarios([]);
    }
  }, [restaurantId]);

  const handleCreateProduct = async (p: Omit<Produto, 'id'>) => {
    if (!restaurantId) return;
    const { data, error } = await supabase.from('products').insert([{ restaurant_id: restaurantId, category_id: p.cid, name: p.name, price: p.price, is_available: p.avail ?? true, cost_price: p.cost_price, sku: p.sku, stock_quantity: p.stock_quantity ?? 0, track_stock: p.track_stock ?? false }]).select().single();
    if (error) { alert('Erro ao criar produto: ' + mapSupabaseError(error)); return; }
    setProducts(prev => [...prev, { id: data.id, name: data.name, cid: data.category_id, category_id: data.category_id, price: Number(data.price), avail: data.is_available, is_available: data.is_available, cost_price: data.cost_price, sku: data.sku, stock_quantity: Number(data.stock_quantity), track_stock: data.track_stock, restaurant_id: data.restaurant_id }]);
  };

  const handleUpdateProduct = async (id: string, updatedFields: Partial<Produto>) => {
    const dbFields: any = {};
    if (updatedFields.name !== undefined) dbFields.name = updatedFields.name;
    if (updatedFields.price !== undefined) dbFields.price = updatedFields.price;
    if (updatedFields.avail !== undefined) dbFields.is_available = updatedFields.avail;
    if (updatedFields.is_available !== undefined) dbFields.is_available = updatedFields.is_available;
    if (updatedFields.cid !== undefined) dbFields.category_id = updatedFields.cid;
    if (updatedFields.category_id !== undefined) dbFields.category_id = updatedFields.category_id;
    if (updatedFields.cost_price !== undefined) dbFields.cost_price = updatedFields.cost_price;
    if (updatedFields.sku !== undefined) dbFields.sku = updatedFields.sku;
    if (updatedFields.stock_quantity !== undefined) dbFields.stock_quantity = updatedFields.stock_quantity;
    if (updatedFields.track_stock !== undefined) dbFields.track_stock = updatedFields.track_stock;
    const { error } = await supabase.from('products').update(dbFields).eq('id', id);
    if (error) { alert('Erro ao atualizar produto: ' + mapSupabaseError(error)); return; }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { alert('Erro ao excluir produto: ' + mapSupabaseError(error)); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleCreateCategory = async (c: Omit<Categoria, 'id'>) => {
    if (!restaurantId) return;
    const { data, error } = await supabase.from('categories').insert([{ restaurant_id: restaurantId, name: c.name, color: c.color, icon: c.icon }]).select().single();
    if (error) { alert('Erro ao criar categoria: ' + mapSupabaseError(error)); return; }
    setCategories(prev => [...prev, { id: data.id, name: data.name, color: data.color, icon: data.icon, restaurant_id: data.restaurant_id }]);
  };

  const handleUpdateCategory = async (id: string, updatedFields: Partial<Categoria>) => {
    const { error } = await supabase.from('categories').update({ name: updatedFields.name, color: updatedFields.color, icon: updatedFields.icon }).eq('id', id);
    if (error) { alert('Erro ao atualizar categoria: ' + mapSupabaseError(error)); return; }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { alert('Erro ao excluir categoria: ' + mapSupabaseError(error)); return; }
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleCreateFuncionario = async (g: Omit<Funcionario, 'id'> & { id?: string }) => {
    if (!restaurantId) return;
    if (g.id) { setFuncionarios(prev => [...prev, { id: g.id, name: g.name, username: g.username, code: g.username, phone: g.whatsapp || g.phone || '', email: g.email || '', active: true, is_active: true, commissionRate: 0, commission_rate: 0, restaurant_id: restaurantId }]); return; }
    const { data, error } = await supabase.from('waiters').insert([{ restaurant_id: restaurantId, name: g.name, code: g.username || String(Date.now()).slice(-4), password: g.password || null, phone: g.whatsapp || g.phone, email: g.email, is_active: true, commission_rate: 0 }]).select().single();
    if (error) { alert('Erro ao criar funcionário: ' + mapSupabaseError(error)); return; }
    setFuncionarios(prev => [...prev, { id: data.id, name: data.name, username: data.code, code: data.code, phone: data.phone, email: data.email, active: data.is_active, is_active: data.is_active, commissionRate: Number(data.commission_rate), commission_rate: Number(data.commission_rate), restaurant_id: data.restaurant_id }]);
  };

  const handleUpdateFuncionario = async (id: string, updatedFields: Partial<Funcionario>) => {
    const dbFields: any = {};
    if (updatedFields.name !== undefined) dbFields.name = updatedFields.name;
    if (updatedFields.username !== undefined) dbFields.code = updatedFields.username;
    if (updatedFields.code !== undefined) dbFields.code = updatedFields.code;
    if (updatedFields.password !== undefined && updatedFields.password !== '') dbFields.password = updatedFields.password;
    if (updatedFields.phone !== undefined) dbFields.phone = updatedFields.phone;
    if (updatedFields.whatsapp !== undefined) dbFields.phone = updatedFields.whatsapp;
    if (updatedFields.email !== undefined) dbFields.email = updatedFields.email;
    if (updatedFields.active !== undefined) dbFields.is_active = updatedFields.active;
    if (updatedFields.is_active !== undefined) dbFields.is_active = updatedFields.is_active;
    if (updatedFields.commissionRate !== undefined) dbFields.commission_rate = updatedFields.commissionRate;
    const { error } = await supabase.from('waiters').update(dbFields).eq('id', id);
    if (error) { alert('Erro ao atualizar funcionário: ' + mapSupabaseError(error)); return; }
    setFuncionarios(prev => prev.map(g => g.id === id ? { ...g, ...updatedFields } : g));
  };

  const handleDeleteFuncionario = async (id: string) => {
    const { error } = await supabase.from('waiters').delete().eq('id', id);
    if (error) { alert('Erro ao excluir funcionário: ' + mapSupabaseError(error)); return; }
    setFuncionarios(prev => prev.filter(g => g.id !== id));
  };

  const clearHistory = () => setHistory([]);
  const resetAllData = () => { setCategories([]); setProducts([]); setHistory([]); setFuncionarios([]); };

  return { categories, products, history, setHistory, funcionarios, isLoadingData, handleCreateProduct, handleUpdateProduct, handleDeleteProduct, handleCreateCategory, handleUpdateCategory, handleDeleteCategory, handleCreateFuncionario, handleUpdateFuncionario, handleDeleteFuncionario, clearHistory, resetAllData };
}