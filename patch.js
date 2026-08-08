const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  // Buscar dados do restaurante após login
  useEffect(() => {
    if (isLoggedIn && session?.user) {
      const fetchRestaurant = async () => {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('restaurant_id, restaurants(name)')
            .eq('id', session.user.id)
            .single();
            
          if (profileData && !profileError) {
            const rName = (profileData as any).restaurants?.name;
            if (rName) {
              setState(prev => ({ ...prev, rname: rName }));
            }
          }
        } catch (e) {
          console.error('Erro ao obter restaurante:', e);
        }
      };
      fetchRestaurant();
    }
  }, [isLoggedIn, session]);`;

const replacement = `  // Buscar dados do restaurante após login
  useEffect(() => {
    if (isLoggedIn && session?.user) {
      const fetchRestaurant = async () => {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('restaurant_id, role, restaurants(name)')
            .eq('id', session.user.id)
            .single();
            
          if (profileData && !profileError) {
            const restId = profileData.restaurant_id;
            const rRole = profileData.role || 'admin';
            setRestaurantId(restId);
            setUserRole(rRole);
            
            const rName = (profileData as any).restaurants?.name;
            if (rName) {
              setState(prev => ({ ...prev, rname: rName }));
            }

            // Sync from Supabase for this restaurant
            const [
              { data: dbCategories },
              { data: dbProducts },
              { data: dbWaiters },
              { data: dbComandas }
            ] = await Promise.all([
              supabase.from('categories').select('*').eq('restaurant_id', restId),
              supabase.from('products').select('*').eq('restaurant_id', restId).eq('is_available', true),
              supabase.from('waiters').select('*').eq('restaurant_id', restId),
              supabase.from('comandas').select('*').eq('restaurant_id', restId).eq('status', 'aberta')
            ]);

            setState(prev => {
              const newState = { ...prev };
              if (dbCategories) newState.categories = dbCategories as any;
              if (dbProducts) newState.products = dbProducts as any;
              if (dbWaiters) newState.garcons = dbWaiters as any;
              
              if (dbComandas) {
                // Initialize clean comandas 1-100
                const updatedComandas = {} as Record<number, any>;
                for (let i = 1; i <= 100; i++) {
                  updatedComandas[i] = {
                    id: i,
                    status: 'livre',
                    items: [],
                    mesa: '',
                    garcom: '',
                    obs: '',
                    openedAt: null,
                    discount: 0
                  };
                }
                
                // Overlay active comandas from Supabase
                dbComandas.forEach(c => {
                  if (c.number && c.number >= 1 && c.number <= 100) {
                    updatedComandas[c.number] = {
                      id: c.number,
                      uuid: c.id,
                      status: 'aberta',
                      items: c.items || [],
                      mesa: c.table_number || '',
                      garcom: c.waiter_id || '',
                      obs: c.notes || '',
                      openedAt: c.opened_at ? new Date(c.opened_at).getTime() : Date.now(),
                      discount: c.discount || 0
                    };
                  }
                });
                
                newState.comandas = updatedComandas;
              }
              return newState;
            });
            
            // Subscribe to realtime comandas changes
            const channel = supabase
              .channel('comandas_' + restId)
              .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'comandas',
                filter: 'restaurant_id=eq.' + restId
              }, (payload) => {
                const newData = payload.new as any;
                const oldData = payload.old as any;
                
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                   if (newData.status === 'aberta' && newData.number >= 1 && newData.number <= 100) {
                     setState(prev => {
                        const upd = { ...prev.comandas };
                        upd[newData.number] = {
                          id: newData.number,
                          uuid: newData.id,
                          status: 'aberta',
                          items: newData.items || [],
                          mesa: newData.table_number || '',
                          garcom: newData.waiter_id || '',
                          obs: newData.notes || '',
                          openedAt: newData.opened_at ? new Date(newData.opened_at).getTime() : Date.now(),
                          discount: newData.discount || 0
                        };
                        return { ...prev, comandas: upd };
                     });
                   } else if (newData.status === 'fechada' && newData.number >= 1 && newData.number <= 100) {
                     // Free it up
                     setState(prev => {
                        const upd = { ...prev.comandas };
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
                        return { ...prev, comandas: upd };
                     });
                   }
                } else if (payload.eventType === 'DELETE') {
                  if (oldData.number >= 1 && oldData.number <= 100) {
                    setState(prev => {
                        const upd = { ...prev.comandas };
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
                        return { ...prev, comandas: upd };
                     });
                  }
                }
              })
              .subscribe();
              
            return () => {
              supabase.removeChannel(channel);
            };
          }
        } catch (e) {
          console.error('Erro ao obter restaurante:', e);
        }
      };
      
      const unsubscribePromise = fetchRestaurant();
      
      return () => {
        if (unsubscribePromise) {
          unsubscribePromise.then(unsub => {
            if (typeof unsub === 'function') unsub();
          });
        }
      };
    }
  }, [isLoggedIn, session]);`;

const newCode = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', newCode);
console.log('patched');
