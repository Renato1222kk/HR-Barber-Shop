import {
  LayoutDashboard,
  CalendarDays,
  Users,
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

// Menu completo (usado na sidebar do desktop).
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumo do dia' },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays, description: 'Seus agendamentos' },
  { href: '/clientes', label: 'Clientes', icon: Users, description: 'Cadastro e historico' },
  { href: '/servicos', label: 'Servicos', icon: Scissors, description: 'Gerencie precos e duracao' },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet, description: 'Veja faturamento e relatorios' },
  { href: '/insights', label: 'Insights', icon: Sparkles, description: 'Analises inteligentes do negocio' },
  { href: '/configuracoes', label: 'Configuracoes', icon: Settings, description: 'Horarios, perfil e preferencias' },
];

const byHref = (href: string): NavItem => NAV_ITEMS.find((i) => i.href === href)!;

// Bottom navigation mobile: Dashboard, Agenda, [ + ], Clientes, Mais
export const MOBILE_LEFT: NavItem[] = [byHref('/dashboard'), byHref('/agenda')];
export const MOBILE_RIGHT: NavItem[] = [byHref('/clientes')];

// Opcoes do menu "Mais" (bottom sheet).
export const MORE_NAV: NavItem[] = [
  byHref('/financeiro'),
  byHref('/servicos'),
  byHref('/insights'),
  byHref('/configuracoes'),
];
