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

  // 1. Obter sessão inicial
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        setIsLoggedIn(true);
      }
    });

    // 2. Ouvir mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setIsLoggedIn(true);
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }
      } else {
        setIsLoggedIn(false);
        setIsRecoveryMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar dados do perfil
  useEffect(() => {
    if (isLoggedIn && session?.user) {
      const fetchProfile = async () => {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('restaurant_id, role, name, restaurants(name, owner_name, logo_url)')
            .eq('id', session.user.id)
            .single();
            
          if (profileData && !profileError) {
            const restId = profileData.restaurant_id;
            const rRole = profileData.role || 'admin';
            setRestaurantId(restId);
            setUserRole(rRole);

            const rName = (profileData as any).restaurants?.name;
            const metaIdentifier = session.user?.user_metadata?.restaurant_id;
            if (metaIdentifier) {
              setIdentifier(metaIdentifier);
            } else if ((profileData as any).restaurants?.owner_name) {
              setIdentifier((profileData as any).restaurants?.owner_name);
            }
            if (rName) {
              setRname(rName);
            }
            const rOwnerName = profileData.name;
            if (rOwnerName) {
              setOwnerName(rOwnerName);
            }
            // Logo do restaurante (canto superior esquerdo da sidebar)
            const rLogoDb = (profileData as any).restaurants?.logo_url;
            const rLogoLocal = localStorage.getItem('servio_logo_' + restId);
            const finalLogo = rLogoDb || rLogoLocal || '';
            if (finalLogo) {
              setLogoUrl(finalLogo);
              if (finalLogo !== rLogoLocal) {
                localStorage.setItem('servio_logo_' + restId, finalLogo);
              }
            }
            // Foto de perfil do dono (bolinhas de avatar)
            const savedPhoto = localStorage.getItem('servio_profile_photo_' + restId);
            if (savedPhoto) setProfilePhoto(savedPhoto);
          }
        } catch (e) {
          console.error('Erro ao obter perfil do restaurante:', e);
          setRname('Erro ao carregar');
        }
      };

      fetchProfile();
    } else {
      // Limpar perfil se deslogado
      setRestaurantId('');
      setUserRole('admin');
      setIdentifier('');
      setRname('Carregando...');
      setOwnerName('');
      setLogoUrl('');
      setProfilePhoto('');
    }
  }, [isLoggedIn, session]);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setSession(null);
    setIsRecoveryMode(false);
  };

  return {
    isLoggedIn,
    session,
    isRecoveryMode,
    setIsRecoveryMode,
    userRole,
    restaurantId,
    identifier,
    setIdentifier,
    rname,
    setRname,
    ownerName,
    setOwnerName,
    logoUrl,
    setLogoUrl,
    profilePhoto,
    setProfilePhoto,
    handleLoginSuccess,
    handleLogout
  };
}
