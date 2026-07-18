import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, User, Bell, Shield, Palette, Store, Moon, Sun, Save, CreditCard, Printer, Check } from 'lucide-react';

interface ConfiguracoesProps {
  rname: string;
  onUpdateRname: (name: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export default function Configuracoes({ rname, onUpdateRname, isDark, toggleTheme }: ConfiguracoesProps) {
  const [localName, setLocalName] = useState(rname);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateRname(localName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[var(--text-main)] tracking-tight">Configurações do Sistema</h1>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">Gerencie as preferências, perfil e opções do Servio.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar Tabs */}
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-sky-500/10 text-sky-500 font-bold rounded-xl transition-colors">
            <Store size={18} />
            <span className="text-sm">Geral</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] font-medium rounded-xl transition-colors">
            <Palette size={18} />
            <span className="text-sm">Aparência</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] font-medium rounded-xl transition-colors opacity-50 cursor-not-allowed" title="Em breve">
            <Printer size={18} />
            <span className="text-sm">Impressão</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] font-medium rounded-xl transition-colors opacity-50 cursor-not-allowed" title="Em breve">
            <CreditCard size={18} />
            <span className="text-sm">Pagamentos</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] font-medium rounded-xl transition-colors opacity-50 cursor-not-allowed" title="Em breve">
            <Shield size={18} />
            <span className="text-sm">Segurança</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Card: Perfil / Restaurante */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-color)]">
              <Store size={16} className="text-sky-500" /> Perfil do Estabelecimento
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                  Nome do Restaurante
                </label>
                <input 
                  value={localName}
                  onChange={e => setLocalName(e.target.value)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  placeholder="Ex: Servio Burger"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                  CNPJ (Opcional)
                </label>
                <input 
                  disabled
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-muted)] outline-none opacity-60 cursor-not-allowed"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleSave}
                  className="w-full sm:w-auto px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {saved ? <Check size={16} /> : <Save size={16} />}
                  {saved ? 'Salvo com sucesso' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Card: Aparência */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-color)]">
              <Palette size={16} className="text-sky-500" /> Aparência e Tema
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)]">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">Modo Escuro</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Alterne entre o tema claro e escuro do sistema.</p>
                </div>
                
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isDark ? 'bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)] opacity-50 cursor-not-allowed" title="Em breve">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">Cor Principal</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Personalize a cor de destaque do sistema (Em breve).</p>
                </div>
                
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-sky-500 border-2 border-[var(--bg-card)] ring-2 ring-sky-500"></div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500"></div>
                  <div className="w-6 h-6 rounded-full bg-purple-500"></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
