import { useState, useEffect } from 'react'
import { Search, Moon, Sun, Monitor, Settings, LogOut } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', comandas: 'Comandas', caixa: 'Caixa / PDV',
  produtos: 'Produtos', categorias: 'Categorias', funcionarios: 'Funcionários',
  historico: 'Histórico de Vendas', relatorios: 'Relatórios', configuracoes: 'Configurações',
}

interface HeaderProps {
  currentView: string
  ownerName?: string
  logoUrl?: string
  onNavigate?: (view: string) => void
  onLogout?: () => void
}

export function Header({ currentView, ownerName, logoUrl, onNavigate, onLogout }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const { setOpen } = useSearch()
  const { theme, setTheme } = useTheme()

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
    <header className={cn(
      'sticky top-0 z-50 h-14 flex items-center gap-3 px-4 bg-background/80 backdrop-blur-md border-b transition-shadow',
      scrolled ? 'shadow-sm' : 'shadow-none'
    )}>
      <SidebarTrigger variant="outline" className="h-8 w-8" />
      <Separator orientation="vertical" className="h-5" />

      <div className="flex-1">
        <h1 className="text-sm font-semibold text-foreground">{VIEW_TITLES[currentView] || currentView}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 h-8 px-4 rounded-md border bg-muted/50 hover:bg-muted text-muted-foreground text-xs transition-colors cursor-pointer min-w-[220px]"
        >
          <Search size={13} />
          <span className="hidden sm:inline flex-1 text-left">Pesquisar...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium ml-auto">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </button>

        {/* Avatar com dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                {logoUrl && <AvatarImage src={logoUrl} alt={ownerName} />}
                <AvatarFallback className="bg-sky-600/10 text-sky-600 font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {logoUrl && <AvatarImage src={logoUrl} alt={ownerName} />}
                  <AvatarFallback className="bg-sky-600/10 text-sky-600 font-bold text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid leading-tight">
                  <span className="truncate font-semibold text-sm">{ownerName || 'Admin'}</span>
                  <span className="truncate text-xs text-muted-foreground">Administrador</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2 pb-1">Tema</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer">
                <Sun className="mr-2 size-4" /> Claro {theme === 'light' && <span className="ms-auto text-xs text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer">
                <Moon className="mr-2 size-4" /> Escuro {theme === 'dark' && <span className="ms-auto text-xs text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer">
                <Monitor className="mr-2 size-4" /> Sistema {theme === 'system' && <span className="ms-auto text-xs text-primary">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate?.('configuracoes')} className="cursor-pointer">
              <Settings className="mr-2 size-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onLogout} className="cursor-pointer">
              <LogOut className="mr-2 size-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
