import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useSearch } from '@/context/search-provider'

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  comandas: 'Comandas',
  caixa: 'Caixa / PDV',
  produtos: 'Produtos',
  categorias: 'Categorias',
  funcionarios: 'Funcionários',
  historico: 'Histórico de Vendas',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
}

interface HeaderProps {
  currentView: string
  ownerName?: string
}

export function Header({ currentView, ownerName }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const { setOpen } = useSearch()

  useEffect(() => {
    const el = document.querySelector('main')
    if (!el) return
    const handler = () => setScrolled(el.scrollTop > 10)
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [])

  const initials = ownerName
    ? ownerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SV'

  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-14 flex items-center gap-3 px-4 bg-background/80 backdrop-blur-md border-b transition-shadow',
        scrolled ? 'shadow-sm' : 'shadow-none'
      )}
    >
      <SidebarTrigger variant="outline" className="h-8 w-8" />
      <Separator orientation="vertical" className="h-5" />

      {/* Título da view atual */}
      <div className="flex-1 flex items-center gap-2">
        <h1 className="text-sm font-semibold text-foreground">
          {VIEW_TITLES[currentView] || currentView}
        </h1>
      </div>

      {/* Direita: search + avatar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 h-8 px-3 rounded-md border bg-muted/50 hover:bg-muted text-muted-foreground text-xs transition-colors cursor-pointer"
        >
          <Search size={13} />
          <span className="hidden sm:inline">Pesquisar...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </button>

        {/* Avatar de perfil */}
        <div
          className="h-8 w-8 rounded-full bg-sky-600/10 border border-border flex items-center justify-center text-[11px] font-bold text-sky-600 cursor-pointer hover:bg-sky-600/20 transition-colors select-none shrink-0"
          title={ownerName || 'Perfil'}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
