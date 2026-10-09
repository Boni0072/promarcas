import {
  LayoutDashboard, Car, ArrowDownToLine, Package, DollarSign, Receipt,
  TrendingUp, ShoppingCart, Wallet, ArrowLeftRight, FileBarChart,
  Settings, Users, type LucideIcon,
} from 'lucide-react';
import { normalizeRole } from '@/lib/utils';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Navegação agrupada por seções (usada na sidebar e na seleção de permissões). */
export const navSections: NavSection[] = [
  {
    title: 'Visão Geral',
    items: [
      { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Veículos',
    items: [
      { path: '/admin/veiculos', label: 'Veículos', icon: Car },
      { path: '/admin/entradas', label: 'Entradas', icon: ArrowDownToLine },
      { path: '/admin/estoque', label: 'Estoque', icon: Package },
    ],
  },
  {
    title: 'Precificação e Custos',
    items: [
      { path: '/admin/precos', label: 'Preços', icon: DollarSign },
      { path: '/admin/custos', label: 'Custos', icon: Receipt },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { path: '/admin/vendas', label: 'Vendas', icon: ShoppingCart },
      { path: '/admin/comissoes', label: 'Comissões', icon: Receipt, roles: ['admin', 'gerente', 'financeiro'] },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { path: '/admin/financeiro', label: 'Financeiro', icon: Wallet, roles: ['admin', 'gerente', 'financeiro'] },
      { path: '/admin/despesas', label: 'Despesas', icon: ArrowLeftRight, roles: ['admin', 'gerente', 'financeiro'] },
      { path: '/admin/receitas', label: 'Receitas', icon: TrendingUp, roles: ['admin', 'gerente', 'financeiro'] },
    ],
  },
  {
    title: 'Análises',
    items: [
      { path: '/admin/relatorios', label: 'Relatórios', icon: FileBarChart },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { path: '/admin/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
      { path: '/admin/usuarios', label: 'Usuários', icon: Users, roles: ['admin'] },
    ],
  },
];

/** Lista achatada de todos os itens. */
export const navItems: NavItem[] = navSections.flatMap((s) => s.items);

/**
 * Verifica se um perfil pode acessar um determinado path.
 * - admin (ou qualquer variação do rótulo, ex. "administrador") sempre tem acesso total;
 * - respeita restrição de `roles` do item;
 * - respeita a lista de `pages` do perfil quando definida (undefined = sem restrição por página).
 */
export function canAccess(
  profile: { role: string; pages?: string[] } | null | undefined,
  path: string,
  roles?: string[]
): boolean {
  if (!profile) return false;
  // Dashboard sempre acessível a quem está logado
  if (path === '/admin') return true;
  // Perfil administrador: acesso total, ignora `roles` e `pages`.
  if (normalizeRole(profile.role) === 'admin') return true;
  const role = normalizeRole(profile.role);
  if (roles && !roles.includes(role)) return false;
  if (profile.pages) return profile.pages.includes(path);
  return true;
}

/** Retorna o item de navegação correspondente a um pathname (mais específico primeiro). */
export function resolveNavPath(pathname: string): NavItem | undefined {
  const sorted = [...navItems].sort((a, b) => b.path.length - a.path.length);
  return sorted.find((item) =>
    item.path === '/admin'
      ? pathname === '/admin'
      : pathname === item.path || pathname.startsWith(item.path + '/') || pathname.startsWith(item.path)
  );
}
