import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Printer, 
  User, 
  Cloud,
  Save, 
  Check, 
  AlertTriangle, 
  Trash2, 
  Lock, 
  Eye, 
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Upload,
  Info,
  Download,
  Store
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface ConfiguracoesProps {
  restaurantId?: string;
  identifier?: string;
  onUpdateIdentifier?: (id: string) => void;
  rname: string;
  onUpdateRname: (name: string) => void;
  ownerName?: string;
  onUpdateOwnerName: (name: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
  onClearLocalData: () => void;
}

type TabType = 'geral' | 'impressao' | 'conta' | 'backup';

export default function Configuracoes({ 
  restaurantId,
  identifier,
  onUpdateIdentifier,
  rname, 
  onUpdateRname, 
  ownerName,
  onUpdateOwnerName,
  isDark, 
  toggleTheme,
  onLogout,
  onClearLocalData
}: ConfiguracoesProps) {
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  
  // Geral States
  const [localName, setLocalName] = useState(rname);
  const [localIdentifier, setLocalIdentifier] = useState(identifier || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light'|'dark'|'system'>('system');
  const [currency, setCurrency] = useState('BRL');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Impressão States (LocalStorage)
  const [printPaperWidth, setPrintPaperWidth] = useState('80mm');
  const [printHeader, setPrintHeader] = useState('');
  const [printFooter, setPrintFooter] = useState('');

  // Conta States
  const [accountEmail, setAccountEmail] = useState('');
  const [accountRole, setAccountRole] = useState('Administrador');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // General Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Action confirmation state
  const [confirmingAction, setConfirmingAction] = useState<'clear' | 'delete' | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  useEffect(() => {
    if (identifier && !localIdentifier) {
      setLocalIdentifier(identifier);
    }
  }, [identifier]);

  const fetchData = async () => {
    if (!restaurantId) return;
    try {
      const { data: rest, error: restErr } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();
      
      if (!restErr && rest) {
        setLocalName(rest.name || '');
        setLocalIdentifier(rest.identifier || identifier || '');
        setPhone(rest.phone || '');
        setEmail(rest.email || '');
        setAddress(rest.address || '');
        setCity(rest.city || '');
        setStateCode(rest.state || 'SP');
        setZipCode(rest.zip_code || '');
        setLogoUrl(rest.logo_url || null);
        setTheme(rest.theme || 'system');
        setCurrency(rest.currency || 'BRL');
        setTimezone(rest.timezone || 'America/Sao_Paulo');

        const localPrint = localStorage.getItem('servio_print_config');
        if (localPrint) {
          try {
            const parsed = JSON.parse(localPrint);
            if (parsed.paperWidth) setPrintPaperWidth(parsed.paperWidth);
            if (parsed.header !== undefined) setPrintHeader(parsed.header);
            if (parsed.footer !== undefined) setPrintFooter(parsed.footer);
          } catch (e) {}
        }
      }

      const { data: userResp } = await supabase.auth.getUser();
      if (userResp?.user) {
        setAccountEmail(userResp.user.email || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGeral = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!localName.trim()) {
      setError('O nome do restaurante não pode ficar em branco.');
      setIsLoading(false);
      return;
    }

    try {
      onUpdateRname(localName);
      if (onUpdateIdentifier) onUpdateIdentifier(localIdentifier);

      if (restaurantId) {
        const updates = {
          name: localName.trim(),
          identifier: localIdentifier.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          city: city.trim(),
          state: stateCode,
          zip_code: zipCode.trim(),
          theme,
          currency,
          timezone,
          updated_at: new Date().toISOString()
        };
        const { error: updateErr } = await supabase.from('restaurants').update(updates).eq('id', restaurantId);
        if (updateErr) {
          if (updateErr.code === 'PGRST204') {
             // Columns might not exist yet, ignore
          } else {
             throw updateErr;
          }
        }
      }

      setSuccess('Informações do restaurante salvas com sucesso!');
      
      // Apply theme
      applyThemeSetting(theme);

      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError('Erro ao salvar as configurações. Verifique as atualizações do banco.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const applyThemeSetting = (selectedTheme: string) => {
    let finalTheme = selectedTheme;
    if (selectedTheme === 'system') {
      finalTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      localStorage.removeItem('servio_theme');
    } else {
      localStorage.setItem('servio_theme', selectedTheme);
    }
    
    if (finalTheme === 'dark') {
      document.documentElement.classList.add('dark');
      if (!isDark) toggleTheme(); // Sync app state if needed
    } else {
      document.documentElement.classList.remove('dark');
      if (isDark) toggleTheme();
    }
  };

  const handleSaveImpressao = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      localStorage.setItem('servio_print_config', JSON.stringify({
        paperWidth: printPaperWidth,
        header: printHeader,
        footer: printFooter
      }));

      setSuccess('Configurações de impressão salvas!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError('Erro ao salvar impressão.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError(null);
    setSuccess(null);
    
    if (!currentPassword) {
      setError('Informe a senha atual para confirmar a alteração.');
      return;
    }
    
    if (!newPassword) return;
    if (newPassword !== confirmNewPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp?.user?.email) throw new Error('Sessão inválida');

      // Verify current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userResp.user.email,
        password: currentPassword,
      });

      if (signInError) throw new Error('A senha atual está incorreta.');

      const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
      if (authErr) throw authErr;
      
      setSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao alterar senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setSuccess(null);
    
    if (!accountEmail) {
      setError('Email de conta não encontrado.');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(accountEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSuccess('E-mail de redefinição de senha enviado. Verifique sua caixa de entrada.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e.message || 'Erro ao enviar email de redefinição.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !restaurantId) return;
    const file = e.target.files[0];
    
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/webp', 0.8);
            
            setLogoUrl(dataUrl);
            
            const { error: updateErr } = await supabase.from('restaurants').update({ logo_url: dataUrl }).eq('id', restaurantId);
            
            if (updateErr) {
              setError('Erro ao salvar imagem no banco de dados. Tente uma imagem menor.');
            } else {
              setSuccess('Logo atualizado com sucesso!');
              setTimeout(() => setSuccess(null), 3000);
            }
          }
          setIsUploading(false);
        };
        img.onerror = () => {
          setError('Erro ao carregar a imagem para processamento.');
          setIsUploading(false);
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        setError('Erro ao ler a imagem.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
      
    } catch (err: any) {
      console.error(err);
      setError('Erro ao processar imagem.');
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!restaurantId) return;
    setLogoUrl(null);
    await supabase.from('restaurants').update({ logo_url: null }).eq('id', restaurantId);
  };

  const handleExportData = async () => {
    try {
      setIsLoading(true);
      const { data: products } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId);
      const { data: categories } = await supabase.from('categories').select('*').eq('restaurant_id', restaurantId);
      const { data: comandas } = await supabase.from('comandas').select('*').eq('restaurant_id', restaurantId);
      
      const backup = {
        exportedAt: new Date().toISOString(),
        products,
        categories,
        comandas
      };
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `servio-backup-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess('Dados exportados com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Erro ao exportar dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPasswordAndExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsLoadingAction(true);

    try {
      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp?.user?.email) throw new Error('Sessão inválida');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userResp.user.email,
        password: confirmPassword,
      });

      if (signInError) throw new Error('Senha incorreta.');

      if (confirmingAction === 'clear') {
        onClearLocalData();
        setSuccess('Dados limpos com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else if (confirmingAction === 'delete') {
        if (restaurantId) {
           await supabase.from('restaurants').delete().eq('id', restaurantId);
        }
        await supabase.rpc('delete_user');
        onLogout();
      }

      setConfirmingAction(null);
      setConfirmPassword('');
    } catch (err: any) {
      setActionError(err.message || 'Erro ao confirmar a ação.');
    } finally {
      setIsLoadingAction(false);
    }
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'geral', label: 'Geral', icon: <Settings size={16} /> },
    { id: 'impressao', label: 'Impressão', icon: <Printer size={16} /> },
    { id: 'conta', label: 'Conta', icon: <User size={16} /> },
    { id: 'backup', label: 'Dados e Backup', icon: <Cloud size={16} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      
      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 shadow-sm">
            <AlertTriangle size={18} />
            <span className="text-sm font-semibold">{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-3 shadow-sm">
            <Check size={18} />
            <span className="text-sm font-semibold">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and Nav */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 pb-0">
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight mb-2">Configurações</h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">Gerencie as informações e preferências do seu restaurante.</p>
          
          <div className="flex overflow-x-auto hide-scrollbar border-b border-[var(--border-color)]">
            <div className="flex gap-8">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 pb-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    activeTab === item.id 
                      ? 'border-sky-500 text-sky-500' 
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Informações do Restaurante */}
          <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-main)]">Informações do Restaurante</h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">Dados básicos do seu estabelecimento.</p>
              </div>
              <button
                onClick={handleSaveGeral}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                <span>Salvar alterações</span>
              </button>
            </div>

            <div className="space-y-6">
              
              {/* Logo Section */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3">Logo do restaurante</label>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden relative group">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Store size={32} className="text-[var(--text-muted)]" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Recomendado: PNG ou JPG, máx 2MB.</p>
                    <div className="flex items-center gap-3">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/png, image/jpeg" 
                        className="hidden" 
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-hover)] text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Upload size={14} /> Alterar imagem
                      </button>
                      {logoUrl && (
                        <button 
                          onClick={handleRemoveLogo}
                          disabled={isUploading}
                          className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Nome do restaurante</label>
                  <input
                    type="text"
                    value={localName}
                    onChange={e => setLocalName(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Identificador do restaurante</label>
                  <input
                    type="text"
                    readOnly
                    value={localIdentifier}
                    placeholder="ex: restaurante-exemplo"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] opacity-70 cursor-not-allowed rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none font-mono"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1.5">Usado para links e integrações (este campo não pode ser alterado).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Telefone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contato@restaurante.com.br"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Endereço</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Rua, Número - Bairro"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Estado</label>
                    <select
                      value={stateCode}
                      onChange={e => setStateCode(e.target.value)}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors appearance-none"
                    >
                      <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option>
                      <option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option>
                      <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
                      <option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                      <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option>
                      <option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option>
                      <option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option>
                      <option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                      <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">CEP</label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={e => setZipCode(e.target.value)}
                      placeholder="00000-000"
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Aparência do Sistema */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Aparência do Sistema</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">Personalize a aparência do Servio.</p>
              
              <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3">Tema</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    theme === 'light' ? 'border-sky-500 bg-sky-500/5 text-sky-500' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-zinc-400'
                  }`}
                >
                  <Sun size={20} />
                  <span className="text-xs font-bold">Claro</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    theme === 'dark' ? 'border-sky-500 bg-sky-500/5 text-sky-500' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-zinc-600'
                  }`}
                >
                  <Moon size={20} />
                  <span className="text-xs font-bold">Escuro</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    theme === 'system' ? 'border-sky-500 bg-sky-500/5 text-sky-500' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-zinc-400'
                  }`}
                >
                  <Monitor size={20} />
                  <span className="text-xs font-bold">Sistema</span>
                </button>
              </div>
            </div>

            {/* Moeda */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Moeda</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">Configure a moeda utilizada no sistema.</p>
              
              <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Moeda</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors appearance-none"
              >
                <option value="BRL">Real (R$)</option>
              </select>
            </div>

            {/* Fuso horário */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Fuso horário</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">Configure o fuso horário do sistema.</p>
              
              <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Fuso horário</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors appearance-none"
              >
                <option value="America/Sao_Paulo">(GMT-03:00) Brasília</option>
                <option value="America/Manaus">(GMT-04:00) Manaus</option>
                <option value="America/Noronha">(GMT-02:00) Fernando de Noronha</option>
              </select>
            </div>

          </div>

          {/* Sobre o Servio */}
          <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6 flex items-center justify-between">
             <div>
                <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Sobre o Servio</h2>
                <p className="text-sm text-[var(--text-muted)]">Informações sobre sua versão do sistema.</p>
             </div>
             <div className="flex items-center gap-8">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center">
                     <Info size={20} />
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Versão atual</p>
                     <p className="text-sm font-black text-[var(--text-main)]">1.0.0</p>
                   </div>
                </div>
                <div className="hidden sm:block">
                   <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Última atualização</p>
                   <p className="text-sm font-bold text-[var(--text-main)]">08/08/2026</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Aba Impressão */}
      {activeTab === 'impressao' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6 md:p-8 max-w-4xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-main)]">Configurações de Impressão</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">Gerencie como e onde os cupons serão impressos.</p>
            </div>
            <button
              onClick={handleSaveImpressao}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              <span>Salvar alterações</span>
            </button>
          </div>

          <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Tamanho do Papel</label>
                  <select
                    value={printPaperWidth}
                    onChange={e => setPrintPaperWidth(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors appearance-none"
                  >
                    <option value="80mm">80mm</option>
                    <option value="58mm">58mm</option>
                  </select>
                </div>
             </div>

             <div className="pt-6 border-t border-[var(--border-color)]">
               <h3 className="text-sm font-bold text-[var(--text-main)] mb-4">Formatação do Cupom</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Mensagem de Cabeçalho</label>
                   <textarea
                     value={printHeader}
                     onChange={e => setPrintHeader(e.target.value)}
                     placeholder="Bem-vindo ao nosso restaurante!"
                     rows={3}
                     className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors resize-none"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Mensagem de Rodapé</label>
                   <textarea
                     value={printFooter}
                     onChange={e => setPrintFooter(e.target.value)}
                     placeholder="Obrigado pela preferência. Volte sempre!"
                     rows={3}
                     className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors resize-none"
                   />
                 </div>
               </div>
               
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Aba Conta */}
      {activeTab === 'conta' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6 md:p-8">
            <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Informações do Usuário</h2>
            <p className="text-sm text-[var(--text-muted)] mb-8">Dados do perfil de acesso.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Nome do usuário</label>
                <input
                  type="text"
                  readOnly
                  value={ownerName || ''}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] opacity-70 cursor-not-allowed rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">E-mail</label>
                <input
                  type="email"
                  readOnly
                  value={accountEmail}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] opacity-70 cursor-not-allowed rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Função / Permissão</label>
                  <input
                    type="text"
                    readOnly
                    value={accountRole}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] opacity-70 cursor-not-allowed rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none font-semibold text-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Restaurante</label>
                  <input
                    type="text"
                    readOnly
                    value={rname}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] opacity-70 cursor-not-allowed rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6 md:p-8 h-fit">
            <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Segurança</h2>
            <p className="text-sm text-[var(--text-muted)] mb-8">Alteração de credenciais.</p>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdatePassword(); }} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Senha Atual</label>
                  <button type="button" onClick={handleResetPassword} className="text-[10px] font-bold text-sky-500 hover:text-sky-600 transition-colors">
                    Esqueci a senha
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Sua senha atual"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors font-mono"
                  />
                  <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer">
                    {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors font-mono"
                  />
                  <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer">
                    {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">Confirmar Nova Senha</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !newPassword}
                className="w-full flex justify-center items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-black text-white text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Lock size={16} />}
                <span>Atualizar Senha</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Aba Dados e Backup */}
      {activeTab === 'backup' && (
        <div className="max-w-4xl space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6 md:p-8">
             <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Dados e Exportação</h2>
             <p className="text-sm text-[var(--text-muted)] mb-8">Exporte seus dados operacionais de forma segura.</p>
             
             <div className="p-5 border border-sky-500/20 bg-sky-500/5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <div>
                 <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                   <Download size={16} className="text-sky-500" />
                   Exportar Base de Dados
                 </h3>
                 <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md">
                   Baixa um arquivo JSON contendo todos os seus produtos, categorias e histórico de vendas para uso externo ou backup em planilhas.
                 </p>
               </div>
               <button
                 onClick={handleExportData}
                 disabled={isLoading}
                 className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-hover)] text-sm font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
               >
                 {isLoading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Download size={16} />}
                 <span>Exportar Dados</span>
               </button>
             </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-red-500/20 rounded-2xl shadow-sm p-6 md:p-8">
             <h2 className="text-lg font-bold text-red-500 mb-1">Zona de Perigo</h2>
             <p className="text-sm text-[var(--text-muted)] mb-8">Ações destrutivas e irreversíveis.</p>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Clear System Data */}
                <div className="p-5 border border-red-500/25 bg-red-500/5 rounded-xl flex flex-col justify-between space-y-4">
                  <div>
                    <h5 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Trash2 size={16} className="text-red-500" />
                      Limpar Dados Operacionais
                    </h5>
                    <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                      Apaga comandas, itens de comandas, histórico, produtos e equipes permanentemente.
                    </p>
                  </div>
                  <button
                    onClick={() => { setConfirmingAction('clear'); setActionError(null); }}
                    className="w-full py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> Limpar Dados
                  </button>
                </div>

                {/* Delete Account */}
                <div className="p-5 border border-red-500/25 bg-red-500/5 rounded-xl flex flex-col justify-between space-y-4">
                  <div>
                    <h5 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      Excluir Conta do Servio
                    </h5>
                    <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                      Exclui permanentemente o restaurante, os dados cadastrados e suas credenciais.
                    </p>
                  </div>
                  <button
                    onClick={() => { setConfirmingAction('delete'); setActionError(null); }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <AlertTriangle size={14} /> Excluir Conta
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* PASSWORD CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmingAction !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-[var(--border-color)] pb-4">
                <AlertTriangle size={24} className="shrink-0 animate-bounce" />
                <h3 className="text-base font-black tracking-wide">
                  {confirmingAction === 'clear' ? 'Limpar Dados Operacionais' : 'Excluir Conta Permanentemente'}
                </h3>
              </div>
              
              {actionError && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-semibold text-center">
                  {actionError}
                </div>
              )}
              
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {confirmingAction === 'clear' ? (
                  <span>
                    <strong>ATENÇÃO!</strong> Esta ação irá apagar definitivamente todos os registros operacionais (comandas, vendas, produtos e equipes). Essa ação não poderá ser desfeita.
                  </span>
                ) : (
                  <span>
                    <strong>PERIGO MÁXIMO!</strong> Você está prestes a excluir permanentemente seu estabelecimento, todos os dados cadastrados e suas credenciais de login. Você perderá totalmente o acesso a este painel.
                  </span>
                )}
              </p>
              
              <form onSubmit={handleVerifyPasswordAndExecute} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                    Confirme sua Senha de Administrador
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Senha do administrador"
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl pl-11 pr-12 py-3 text-sm text-[var(--text-main)] outline-none focus:border-red-500 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    disabled={isLoadingAction}
                    onClick={() => {
                      setConfirmingAction(null);
                      setConfirmPassword('');
                      setActionError(null);
                    }}
                    className="px-5 py-2.5 bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoadingAction || !confirmPassword}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-black rounded-xl shadow-md hover:shadow-red-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingAction ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Confirmar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
