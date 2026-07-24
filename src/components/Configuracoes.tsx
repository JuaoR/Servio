import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Store, 
  Printer, 
  Shield, 
  Save, 
  Check, 
  AlertTriangle, 
  Trash2, 
  Lock, 
  Eye, 
  EyeOff, 
  Database,
  Moon,
  Sun
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface ConfiguracoesProps {
  rname: string;
  onUpdateRname: (name: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
  onClearLocalData: () => void;
}

type TabType = 'geral' | 'impressao' | 'seguranca';

export default function Configuracoes({ 
  rname, 
  onUpdateRname, 
  isDark, 
  toggleTheme,
  onLogout,
  onClearLocalData
}: ConfiguracoesProps) {
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [localName, setLocalName] = useState(rname);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Print settings state
  const [printerType, setPrinterType] = useState('usb');
  const [paperWidth, setPaperWidth] = useState('80mm');
  const [autoPrint, setAutoPrint] = useState(false);
  const [printHeader, setPrintHeader] = useState('');
  const [printFooter, setPrintFooter] = useState('');

  // Security settings state
  const [confirmRequired, setConfirmRequired] = useState(true);
  const [sessionDuration, setSessionDuration] = useState('24h');

  // Dialog and Action confirmation state
  const [confirmingAction, setConfirmingAction] = useState<'clear' | 'delete' | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSaveGeneral = () => {
    setError(null);
    setSuccess(null);
    if (!localName.trim()) {
      setError('O nome do restaurante não pode ficar em branco.');
      return;
    }
    onUpdateRname(localName);
    setSaved(true);
    setSuccess('Configurações gerais salvas com sucesso!');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSavePrint = () => {
    setError(null);
    setSuccess(null);
    setSaved(true);
    setSuccess('Configurações de impressão salvas!');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleVerifyPasswordAndExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingAction) return;
    setIsLoadingAction(true);
    setActionError(null);

    try {
      // 1. Obter e-mail do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setActionError('Usuário não autenticado no sistema.');
        setIsLoadingAction(false);
        return;
      }

      // 2. Tentar autenticar o usuário com a senha digitada
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: confirmPassword,
      });

      if (authError) {
        setActionError('Senha incorreta. Por favor, tente novamente.');
        setIsLoadingAction(false);
        return;
      }

      // 3. Executar a ação
      if (confirmingAction === 'clear') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData?.restaurant_id) {
          setActionError('Não foi possível encontrar o ID do restaurante.');
          setIsLoadingAction(false);
          return;
        }

        const restId = profileData.restaurant_id;

        // Limpa todas as tabelas no Supabase que pertencem ao restaurante do usuário
        // Cascade delete cuida do resto, mas executamos em ordem de dependência para garantir
        await supabase.from('comandas').delete().eq('restaurant_id', restId);
        await supabase.from('waiters').delete().eq('restaurant_id', restId);
        await supabase.from('products').delete().eq('restaurant_id', restId);
        await supabase.from('categories').delete().eq('restaurant_id', restId);

        // Limpa estado local do React
        onClearLocalData();
        
        setSuccess('Todos os dados operacionais foram limpos do banco de dados.');
        setConfirmingAction(null);
        setConfirmPassword('');
      } else if (confirmingAction === 'delete') {
        // Chama a RPC criada para remover restaurante, profile e o auth.users
        const { error: rpcError } = await supabase.rpc('delete_user_account');
        
        if (rpcError) {
          setActionError('Erro ao excluir conta do Supabase: ' + rpcError.message);
        } else {
          setSuccess('Sua conta e todos os dados foram permanentemente removidos. Deslogando...');
          setConfirmingAction(null);
          setConfirmPassword('');
          setTimeout(() => {
            onLogout();
          }, 2000);
        }
      }
    } catch (err: any) {
      setActionError('Ocorreu um erro inesperado: ' + err.message);
    } finally {
      setIsLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg shrink-0">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wider">Configurações do Sistema</h1>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">Gerencie o perfil, impressora, segurança e dados do restaurante.</p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold text-center animate-pulse">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Sidebar */}
        <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none shrink-0">
          <button 
            onClick={() => { setActiveTab('geral'); setError(null); setSuccess(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap text-sm ${
              activeTab === 'geral' 
                ? 'bg-sky-500/15 text-sky-500 border-l-4 border-sky-500' 
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]'
            }`}
          >
            <Store size={18} />
            <span>Geral</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('impressao'); setError(null); setSuccess(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap text-sm ${
              activeTab === 'impressao' 
                ? 'bg-sky-500/15 text-sky-500 border-l-4 border-sky-500' 
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]'
            }`}
          >
            <Printer size={18} />
            <span>Impressão</span>
          </button>

          <button 
            onClick={() => { setActiveTab('seguranca'); setError(null); setSuccess(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap text-sm ${
              activeTab === 'seguranca' 
                ? 'bg-sky-500/15 text-sky-500 border-l-4 border-sky-500' 
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]'
            }`}
          >
            <Shield size={18} />
            <span>Segurança e Dados</span>
          </button>
        </div>

        {/* Content Panel */}
        <div className="md:col-span-2 space-y-6">
          {/* TAB 1: GERAL */}
          {activeTab === 'geral' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider pb-2 border-b border-[var(--border-color)] flex items-center gap-2">
                <Store size={16} className="text-sky-500" /> Perfil do Estabelecimento
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Nome do Restaurante
                  </label>
                  <input 
                    type="text"
                    value={localName}
                    onChange={e => setLocalName(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-semibold"
                    placeholder="Ex: Servio Gourmet"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)]">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Tema do Sistema</h4>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Alterne entre modo escuro ou claro.</p>
                  </div>
                  
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-all"
                  >
                    {isDark ? (
                      <>
                        <Sun size={14} className="text-yellow-500" />
                        <span>Claro</span>
                      </>
                    ) : (
                      <>
                        <Moon size={14} className="text-indigo-400" />
                        <span>Escuro</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSaveGeneral}
                    className="w-full sm:w-auto px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-[#090D14] font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider active:scale-98"
                  >
                    {saved ? <Check size={14} /> : <Save size={14} />}
                    {saved ? 'Salvo' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: IMPRESSÃO */}
          {activeTab === 'impressao' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider pb-2 border-b border-[var(--border-color)] flex items-center gap-2">
                <Printer size={16} className="text-sky-500" /> Impressora e Cupom
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Tipo de Conexão
                    </label>
                    <select
                      value={printerType}
                      onChange={e => setPrinterType(e.target.value)}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] outline-none focus:border-sky-500 font-medium"
                    >
                      <option value="usb">USB (Cabo / Bluetooth)</option>
                      <option value="network">Rede / Wi-Fi (IP)</option>
                      <option value="none">Apenas Impressão do Navegador</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Largura do Papel
                    </label>
                    <select
                      value={paperWidth}
                      onChange={e => setPaperWidth(e.target.value)}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] outline-none focus:border-sky-500 font-medium"
                    >
                      <option value="80mm">80mm (Recomendado)</option>
                      <option value="58mm">58mm (Mini Impressora)</option>
                      <option value="A4">A4 (Impressora Comum)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)]">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Impressão Automática</h4>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Imprimir o cupom não fiscal imediatamente ao cobrar/fechar comanda.</p>
                  </div>
                  
                  <button
                    onClick={() => setAutoPrint(!autoPrint)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${autoPrint ? 'bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoPrint ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Texto do Cabeçalho
                  </label>
                  <input 
                    type="text"
                    value={printHeader}
                    onChange={e => setPrintHeader(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
                    placeholder="Ex: Obrigado pela preferência!"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Texto do Rodapé
                  </label>
                  <input 
                    type="text"
                    value={printFooter}
                    onChange={e => setPrintFooter(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
                    placeholder="Ex: Siga-nos no Instagram @meurestaurante"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSavePrint}
                    className="w-full sm:w-auto px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-[#090D14] font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider active:scale-98"
                  >
                    {saved ? <Check size={14} /> : <Save size={14} />}
                    {saved ? 'Salvo' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: SEGURANÇA E DADOS */}
          {activeTab === 'seguranca' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider pb-2 border-b border-[var(--border-color)] flex items-center gap-2">
                <Shield size={16} className="text-sky-500" /> Segurança e Sessão
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)]">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Confirmar com Senha</h4>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Exigir senha do administrador para operações críticas.</p>
                  </div>
                  
                  <button
                    onClick={() => setConfirmRequired(!confirmRequired)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${confirmRequired ? 'bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${confirmRequired ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Duração da Sessão
                  </label>
                  <select
                    value={sessionDuration}
                    onChange={e => setSessionDuration(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] outline-none focus:border-sky-500 font-medium"
                  >
                    <option value="8h">8 horas (Recomendado para turnos)</option>
                    <option value="24h">24 horas</option>
                    <option value="7d">7 dias</option>
                  </select>
                </div>

                {/* DANGER ZONE */}
                <div className="pt-4 border-t border-red-500/20 space-y-4">
                  <h4 className="text-[11px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Zona de Perigo
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Clear System Data */}
                    <div className="p-4 border border-red-500/25 bg-red-500/5 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <h5 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                          <Database size={13} className="text-red-500" />
                          Limpar Dados
                        </h5>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-normal">
                          Apaga comandas, itens de comandas, produtos, categorias e funcionários permanentemente do Supabase. O layout básico do restaurante será redefinido.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setConfirmingAction('clear');
                          setActionError(null);
                        }}
                        className="w-full py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-bold text-[10px] rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <Trash2 size={12} /> Limpar Dados
                      </button>
                    </div>

                    {/* Delete Account */}
                    <div className="p-4 border border-red-500/25 bg-red-500/5 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <h5 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                          <Trash2 size={13} className="text-red-500" />
                          Excluir Conta
                        </h5>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-normal">
                          Exclui permanentemente o restaurante, seu perfil de administrador e as credenciais de login do banco de dados e autenticação do Supabase.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setConfirmingAction('delete');
                          setActionError(null);
                        }}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-md"
                      >
                        <AlertTriangle size={12} /> Excluir Conta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* PASSWORD CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmingAction !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center gap-2.5 text-red-500 border-b border-[var(--border-color)] pb-3">
                <AlertTriangle size={20} className="shrink-0 animate-bounce" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {confirmingAction === 'clear' ? 'Confirmar Limpeza de Dados' : 'Confirmar Exclusão de Conta'}
                </h3>
              </div>

              {actionError && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold text-center">
                  {actionError}
                </div>
              )}

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {confirmingAction === 'clear' ? (
                  <span>
                    <strong>ATENÇÃO!</strong> Esta ação irá apagar definitivamente todos os registros operacionais (comandas, vendas, produtos e equipes) do banco de dados do Supabase. Essa ação não poderá ser desfeita.
                  </span>
                ) : (
                  <span>
                    <strong>PERIGO MÁXIMO!</strong> Você está prestes a excluir permanentemente seu estabelecimento, todos os dados cadastrados e suas credenciais de login. Você perderá totalmente o acesso a este painel.
                  </span>
                )}
              </p>

              <form onSubmit={handleVerifyPasswordAndExecute} className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Confirme sua Senha de Administrador
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Senha do administrador"
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl pl-10 pr-10 py-3 text-xs text-[var(--text-main)] outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isLoadingAction}
                    onClick={() => {
                      setConfirmingAction(null);
                      setConfirmPassword('');
                      setActionError(null);
                    }}
                    className="px-4 py-2.5 bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoadingAction}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md hover:shadow-red-500/10 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isLoadingAction ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={13} />
                        <span>Confirmar e Executar</span>
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
