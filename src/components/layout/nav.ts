import {
  CalendarDays,
  Users,
  UserCog,
  Scissors,
  Wallet,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

// Menu completo (sidebar do desktop e menu recolhivel do mobile).
export const NAV_ITEMS: NavItem[] = [
  { href: '/agenda', label: 'Agenda', icon: CalendarDays, description: 'Seus agendamentos' },
  { href: '/clientes', label: 'Clientes', icon: Users, description: 'Cadastro e histórico' },
  { href: '/barbeiros', label: 'Barbeiros', icon: UserCog, description: 'Cadastro do profissional' },
  { href: '/servicos', label: 'Serviços', icon: Scissors, description: 'Preços e duração' },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet, description: 'Faturamento e relatórios' },
  { href: '/insights', label: 'Insights', icon: Sparkles, description: 'Análises do negócio' },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    description: 'Horários e preferências',
  },
];

const byHref = (href: string): NavItem => NAV_ITEMS.find((i) => i.href === href)!;

// Bottom navigation mobile: Agenda, Clientes, [ + ], Financeiro, Mais
export const MOBILE_LEFT: NavItem[] = [byHref('/agenda'), byHref('/clientes')];
export const MOBILE_RIGHT: NavItem[] = [byHref('/financeiro')];

// Opcoes do menu "Mais" (bottom sheet).
export const MORE_NAV: NavItem[] = [
  byHref('/barbeiros'),
  byHref('/servicos'),
  byHref('/insights'),
  byHref('/configuracoes'),
];
