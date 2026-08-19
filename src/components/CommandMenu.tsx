import { ArrowRight, Moon, Sun, Monitor, LayoutDashboard, ClipboardList, Wallet, UtensilsCrossed, Tags, Users, History, Settings, BarChart2 } from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'

type View = string

const NAV_ITEMS = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Operação' },
  { view: 'comandas', label: 'Comandas', icon: ClipboardList, group: 'Operação' },
  { view: 'caixa', label: 'Caixa / PDV', icon: Wallet, group: 'Operação' },
  { view: 'produtos', label: 'Produtos', icon: UtensilsCrossed, group: 'Catálogo' },
  { view: 'categorias', label: 'Categorias', icon: Tags, group: 'Catálogo' },
  { view: 'funcionarios', label: 'Funcionários', icon: Users, group: 'Catálogo' },
  { view: 'historico', label: 'Histórico de Vendas', icon: History, group: 'Relatórios' },
  { view: 'relatorios', label: 'Relatórios', icon: BarChart2, group: 'Relatórios' },
  { view: 'configuracoes', label: 'Configurações', icon: Settings, group: 'Sistema' },
]

interface CommandMenuProps {
  onNavigate: (view: View) => void
}

export function CommandMenu({ onNavigate }: CommandMenuProps) {
  const { open, setOpen } = useSearch()
  const { setTheme } = useTheme()

  const run = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group)))

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite um comando ou pesquise..." />
      <CommandList>
        <ScrollArea type="hover" className="h-72 pe-1">
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group} heading={group}>
              {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
                <CommandItem
                  key={item.view}
                  value={item.label}
                  onSelect={() => run(() => onNavigate(item.view))}
                >
                  <div className="flex size-4 items-center justify-center">
                    <ArrowRight className="text-muted-foreground/80 size-2" />
                  </div>
                  <item.icon className="size-4 mr-1 text-muted-foreground" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Tema">
            <CommandItem onSelect={() => run(() => setTheme('light'))}>
              <Sun className="size-4 mr-2" /> Tema Claro
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme('dark'))}>
              <Moon className="size-4 mr-2" /> Tema Escuro
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme('system'))}>
              <Monitor className="size-4 mr-2" /> Tema do Sistema
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  )
}
