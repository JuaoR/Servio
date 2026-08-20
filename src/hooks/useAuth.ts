import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [userRole, setUserRole] = useState<string>('admin');
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  const [rname, setRname] = useState('Carregando...');
  const [ownerName, setOwnerName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  const loadEmployee = async (token: string) => {
    const { data: sess, error } = await supabase
      .from('employee_sessions')
      .select('*, waiters(name, code), restaurants(name, owner_name, logo_url)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();
    if (error || !sess) return false;

    let restaurant: any = sess.restaurants;
    if (!restaurant?.name) {
      const { data } = await supabase.from('restaurants').select('name, owner_name, logo_url').eq('id', sess.restaurant_id).single();
      restaurant = data;
    }
    let waiter: any = sess.waiters;
    if (!waiter?.name) {
      const { data } = await supabase.from('waiters').select('name, code').eq('id', sess.waiter_id).single();
      waiter = data;
    }

    setRestaurantId(sess.restaurant_id || '');
    setIdentifier(restaurant?.owner_name || '');
    setOwnerName(waiter?.name || 'Funcionário');
    setUserRole('employee');
    setRname(restaurant?.name || 'Restaurante');
    setLogoUrl(restaurant?.logo_url || '');
    setIsLoggedIn(true);
    return true;
  };

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const token = localStorage.getItem('servio_emp_token');
      if (token) {
        const ok = await loadEmployee(token);
        if (ok || cancelled) return;
        localStorage.removeItem('servio_emp_token');
      }
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!cancelled) {
        setSession(currentSession);
        if (currentSession) setIsLoggedIn(true);
      }
    };
    initialize();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setIsLoggedIn(true);
        if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true);
      } else if (!localStorage.getItem('servio_emp_token')) {
        setIsLoggedIn(false);
        setIsRecoveryMode(false);
      }
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (localStorage.getItem('servio_emp_token')) return;
    if (!isLoggedIn || !session?.user) {
      if (!isLoggedIn) {
        setRestaurantId(''); setUserRole('admin'); setIdentifier('');
        setRname('Carregando...'); setOwnerName(''); setLogoUrl(''); setProfilePhoto('');
      }
      return;
    }
    const fetchProfile = async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles').select('restaurant_id, role, name, restaurants(name, owner_name, logo_url)')
          .eq('id', session.user.id).single();
        if (profileData && !profileError) {
          const restId = profileData.restaurant_id;
          const restaurant = (profileData as any).restaurants;
          setRestaurantId(restId); setUserRole(profileData.role || 'admin');
          setIdentifier(session.user?.user_metadata?.restaurant_id || restaurant?.owner_name || '');
          setRname(restaurant?.name || 'Restaurante'); setOwnerName(profileData.name || '');
          const logo = restaurant?.logo_url || localStorage.getItem('servio_logo_' + restId) || '';
          setLogoUrl(logo); if (logo) localStorage.setItem('servio_logo_' + restId, logo);
          const photo = localStorage.getItem('servio_profile_photo_' + restId); if (photo) setProfilePhoto(photo);
        }
      } catch (e) { console.error('Erro ao obter perfil:', e); }
    };
    fetchProfile();
  }, [isLoggedIn, session]);

  const handleLoginSuccess = async () => {
    const token = localStorage.getItem('servio_emp_token');
    if (token) {
      await loadEmployee(token);
      return;
    }
    setIsLoggedIn(true);
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('servio_emp_token');
    if (token) {
      await supabase.from('employee_sessions').delete().eq('token', token);
      localStorage.removeItem('servio_emp_token');
    }
    await supabase.auth.signOut();
    setIsLoggedIn(false); setSession(null); setIsRecoveryMode(false);
    setUserRole('admin'); setRestaurantId(''); setRname('Carregando...'); setOwnerName(''); setLogoUrl(''); setProfilePhoto('');
  };

  return { isLoggedIn, session, isRecoveryMode, setIsRecoveryMode, userRole, restaurantId, identifier, setIdentifier, rname, setRname, ownerName, setOwnerName, logoUrl, setLogoUrl, profilePhoto, setProfilePhoto, handleLoginSuccess, handleLogout };
}