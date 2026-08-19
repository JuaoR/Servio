import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Comanda } from './types';

// Hooks de negócio (intocados)
import { useAuth } from './hooks/useAuth';
import { useRestaurantData } from './hooks/useRestaurantData';
import { useCaixa } from './hooks/useCaixa';
import { useComandas } from './hooks/useComandas';

// Telas (intocadas)
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Comandas from './components/Comandas';
import Caixa from './components/Caixa';
import CaixaAbertura from './components/CaixaAbertura';
import CaixaFechamento from './components/CaixaFechamento';
import CaixaSangriaModal from './components/CaixaSangriaModal';
import Produtos from './components/Produtos';
import Categorias from './components/Categorias';
import Historico from './components/Historico';
import Funcionarios from './components/Funcionarios';
import Configuracoes from './components/Configuracoes';
import ComandaModal from './components/ComandaModal';
import PaymentModal from './components/PaymentModal';

// Novo shell (shadcn)
import { ThemeProvider } from './context/theme-provider';
import { SearchProvider } from './context/search-provider';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';
import { AppSidebar } from './components/layout/AppSidebar';
import { Header } from './components/layout/Header';
import { CommandMenu } from './components/CommandMenu';
import { Toaster } from './components/ui/sonner';

type View = 'dashboard' | 'comandas' | 'caixa' | 'produtos' | 'categorias' | 'funcionarios' | 'historico' | 'relatorios' | 'configuracoes';

export default function App() {
  const {
    isLoggedIn, isRecoveryMode, setIsRecoveryMode,
    restaurantId, identifier, setIdentifier,
    rname, setRname, ownerName, setOwnerName, logoUrl,
    handleLoginSuccess, handleLogout,
  } = useAuth();

  const {
    categories, products, history, setHistory, funcionarios,
    handleCreateProduct, handleUpdateProduct, handleDeleteProduct,
    handleCreateCategory, handleUpdateCategory, handleDeleteCategory,
    handleCreateFuncionario, handleUpdateFuncionario, handleDeleteFuncionario,
    clearHistory,
  } = useRestaurantData(restaurantId);

  const {
    caixaAtiva, caixaSessoes, movimentacoesCaixa, setMovimentacoesCaixa,
    fechamentosCaixa, handleAbrirCaixaSubmit, handleFecharCaixaSubmit,
    handleSangriaOuSuprimentoSubmit,
  } = useCaixa(restaurantId, ownerName);

  const {
    comandas, handleMetaUpdate, handleItemsUpdate,
    handleOpenComanda, handleConfirmPayment, handleCloseEmptyComanda,
  } = useComandas(restaurantId, ownerName, caixaAtiva, setMovimentacoesCaixa, setHistory);

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeComandaId, setActiveComandaId] = useState<number | null>(null);
  const [showPaymentId, setShowPaymentId] = useState<number | null>(null);
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false);
  const [modalSangriaTipo, setModalSangriaTipo] = useState<'sangria' | 'suprimento' | null>(null);

  const activeComandasCount = (Object.values(comandas) as Comanda[]).filter((c) => c.status === 'aberta').length;

  // Auth gate — Login inalterado
  if (!isLoggedIn || isRecoveryMode) {
    return (
      <Login
        onLogin={handleLoginSuccess}
        isRecoveryMode={isRecoveryMode}
        onRecoveryComplete={() => { setIsRecoveryMode(false); handleLogout(); }}
      />
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            comandas={comandas} history={history} rname={rname}
            ownerName={ownerName} onNavigate={setCurrentView}
            onOpenComanda={setActiveComandaId}
          />
        );
      case 'comandas':
        return <Comandas comandas={comandas} onOpenComanda={setActiveComandaId} />;
      case 'caixa':
        return (
          <Caixa
            caixaAtiva={caixaAtiva} sessoes={caixaSessoes}
            movimentacoes={movimentacoesCaixa} fechamentos={fechamentosCaixa}
            operador={ownerName || 'Admin'}
            onAbrirCaixa={() => setModalAbrirCaixa(true)}
            onFecharCaixa={() => setModalFecharCaixa(true)}
            onSangria={() => setModalSangriaTipo('sangria')}
            onSuprimento={() => setModalSangriaTipo('suprimento')}
          />
        );
      case 'produtos':
        return (
          <Produtos
            products={products} categories={categories}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        );
      case 'categorias':
        return (
          <Categorias
            categories={categories} products={products}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case 'historico':
        return (
          <Historico
            history={history} categories={categories} products={products}
            funcionarios={funcionarios || []} onClearHistory={clearHistory}
          />
        );
      case 'funcionarios':
        return (
          <Funcionarios
            funcionarios={funcionarios || []} history={history}
            restaurantId={restaurantId} identifier={identifier}
            onCreateFuncionario={handleCreateFuncionario}
            onUpdateFuncionario={handleUpdateFuncionario}
            onDeleteFuncionario={handleDeleteFuncionario}
          />
        );
      case 'relatorios':
        return (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <span className="text-4xl">📊</span>
            <p className="text-sm font-medium">Relatórios em breve...</p>
          </div>
        );
      case 'configuracoes':
        return (
          <Configuracoes
            restaurantId={restaurantId} identifier={identifier}
            onUpdateIdentifier={setIdentifier} rname={rname}
            onUpdateRname={setRname} ownerName={ownerName}
            onUpdateOwnerName={setOwnerName}
            isDark={document.documentElement.classList.contains('dark')}
            toggleTheme={() => {}}
            onLogout={handleLogout}
            onClearLocalData={() => {}}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider>
      <SearchProvider>
        <SidebarProvider>
          <AppSidebar
            currentView={currentView}
            onNavigate={setCurrentView}
            rname={rname}
            ownerName={ownerName}
            logoUrl={logoUrl}
            activeComandasCount={activeComandasCount}
            caixaAtiva={!!caixaAtiva}
            onLogout={handleLogout}
          />

          <SidebarInset>
            <Header currentView={currentView} ownerName={ownerName} />

            <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
              {renderView()}
            </main>
          </SidebarInset>

          {/* Command palette */}
          <CommandMenu onNavigate={setCurrentView} />

          {/* Toaster global */}
          <Toaster richColors position="top-right" />

          {/* Modais de comanda */}
          <AnimatePresence>
            {activeComandaId !== null && (
              <ComandaModal
                id={activeComandaId}
                comanda={comandas[activeComandaId]}
                products={products}
                categories={categories}
                onClose={() => {
                  if (comandas[activeComandaId]?.items.length === 0) {
                    handleCloseEmptyComanda(activeComandaId);
                  }
                  setActiveComandaId(null);
                }}
                onUpdateMeta={handleMetaUpdate}
                onUpdateItems={handleItemsUpdate}
                onOpenComanda={handleOpenComanda}
                onShowPayment={setShowPaymentId}
                rname={rname}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showPaymentId !== null && (
              <PaymentModal
                id={showPaymentId}
                comanda={comandas[showPaymentId]}
                onClose={() => setShowPaymentId(null)}
                onConfirmPayment={handleConfirmPayment}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modalAbrirCaixa && (
              <CaixaAbertura
                operador={ownerName || 'Admin'}
                onAbrir={handleAbrirCaixaSubmit}
                onClose={() => setModalAbrirCaixa(false)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modalFecharCaixa && caixaAtiva && (
              <CaixaFechamento
                sessao={caixaAtiva}
                movimentacoes={movimentacoesCaixa}
                operador={ownerName || 'Admin'}
                onFechar={handleFecharCaixaSubmit}
                onClose={() => setModalFecharCaixa(false)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modalSangriaTipo && (
              <CaixaSangriaModal
                tipo={modalSangriaTipo}
                operador={ownerName || 'Admin'}
                onConfirm={handleSangriaOuSuprimentoSubmit}
                onClose={() => setModalSangriaTipo(null)}
              />
            )}
          </AnimatePresence>
        </SidebarProvider>
      </SearchProvider>
    </ThemeProvider>
  );
}
