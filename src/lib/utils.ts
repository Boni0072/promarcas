import type {
  Vehicle,
  VehicleCost,
  VehicleSale,
  VehicleStatus,
  PaymentStatus,
  ExpenseCategory,
  CostCategory,
  RevenueCategory,
  Expense,
  Revenue,
  UserRole,
} from '@/types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

export function formatPercent(value: number): string {
  return `${(value || 0).toFixed(2).replace('.', ',')}%`;
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function daysBetween(start: string | Date, end: string | Date = new Date()): number {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysInStock(vehicle: Vehicle): number {
  return daysBetween(vehicle.entry_date);
}

export function getAdditionalCosts(costs: VehicleCost[]): number {
  return costs.reduce((sum, c) => sum + (c.amount || 0), 0);
}

export function getTotalCost(vehicle: Vehicle, costs: VehicleCost[]): number {
  const additional = getAdditionalCosts(costs);
  const purchase = costs.find((c) => c.category === 'compra')?.amount || vehicle.purchase_value || 0;
  return purchase + additional - (costs.find((c) => c.category === 'compra') ? 0 : 0);
}

export function calculateVehicleTotalCost(purchaseValue: number, costs: VehicleCost[]): number {
  const additional = costs
    .filter((c) => c.category !== 'compra')
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  return (purchaseValue || 0) + additional;
}

export function calculateGrossProfit(advertisedPrice: number, totalCost: number): number {
  return (advertisedPrice || 0) - (totalCost || 0);
}

export function calculateMargin(price: number, cost: number): number {
  if (!price || price === 0) return 0;
  return ((price - cost) / price) * 100;
}

export function calculateMarkup(price: number, cost: number): number {
  if (!cost || cost === 0) return 0;
  return ((price - cost) / cost) * 100;
}

export function calculateROI(price: number, cost: number): number {
  if (!cost || cost === 0) return 0;
  return ((price - cost) / cost) * 100;
}

export function calculateNetProfit(sale: VehicleSale, totalCost: number): number {
  return (
    (sale.sale_price || 0) -
    (totalCost || 0) -
    (sale.discount || 0) -
    (sale.commission_value || 0)
  );
}

export function isPaymentOverdue(dueDate: string | null, status: PaymentStatus): boolean {
  if (status !== 'pendente' || !dueDate) return false;
  return new Date(dueDate) < new Date();
}

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  em_negociacao: 'Em Negociação',
  comprado: 'Comprado',
  em_preparacao: 'Em Preparação',
  disponivel: 'Disponível',
  anunciado: 'Anunciado',
  reservado: 'Reservado',
  vendido: 'Vendido',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  em_negociacao: 'bg-blue-100 text-blue-700',
  comprado: 'bg-gray-100 text-gray-700',
  em_preparacao: 'bg-amber-100 text-amber-700',
  disponivel: 'bg-green-100 text-green-700',
  anunciado: 'bg-cyan-100 text-cyan-700',
  reservado: 'bg-purple-100 text-purple-700',
  vendido: 'bg-emerald-100 text-emerald-700',
  entregue: 'bg-teal-100 text-teal-700',
  cancelado: 'bg-gray-200 text-gray-800',
};

export const ORIGIN_LABELS: Record<string, string> = {
  compra_particular: 'Compra Particular',
  troca: 'Troca',
  repasse: 'Repasse',
  leilao: 'Leilão',
  outra_loja: 'Outra Loja',
  outros: 'Outros',
};

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  compra: 'Compra',
  documentacao: 'Documentação',
  transferencia: 'Transferência',
  ipva: 'IPVA',
  licenciamento: 'Licenciamento',
  seguro: 'Seguro',
  funilaria: 'Funilaria',
  pintura: 'Pintura',
  mecanica: 'Mecânica',
  pneus: 'Pneus',
  higienizacao: 'Higienização',
  estetica: 'Estética',
  revisao: 'Revisão',
  pecas: 'Peças',
  comissao: 'Comissão',
  marketing: 'Marketing',
  outros: 'Outros',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  aluguel: 'Aluguel',
  salarios: 'Salários',
  energia: 'Energia',
  internet: 'Internet',
  marketing: 'Marketing',
  contabilidade: 'Contabilidade',
  sistemas: 'Sistemas',
  seguros: 'Seguros',
  impostos: 'Impostos',
  telefonia: 'Telefonia',
  manutencao: 'Manutenção',
  administrativo: 'Administrativo',
  outros: 'Outros',
};

export const REVENUE_CATEGORY_LABELS: Record<RevenueCategory, string> = {
  venda_veiculo: 'Venda de Veículo',
  servicos: 'Serviços',
  comissoes: 'Comissões',
  outros: 'Outros',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  pago: 'bg-green-100 text-green-700',
  vencido: 'bg-gray-300 text-gray-900',
  cancelado: 'bg-gray-100 text-gray-700',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  financeiro: 'Financeiro',
};

/** Ordem canônica dos perfis (usada nos selects de perfil). */
export const ROLE_ORDER: UserRole[] = ['admin', 'gerente', 'vendedor', 'financeiro'];

/**
 * Normaliza qualquer variação de nome de perfil para um `UserRole` canônico.
 *
 * Existe porque perfis gravados no Firestore (ou vindos de forms antigos) podem
 * usar rótulos em português como "administrador", "Administrador" ou "ADMIN".
 * Sem essa normalização o perfil do administrador não bate com `role === 'admin'`
 * e ele perde o acesso total ao sistema.
 */
const ROLE_ALIASES: Record<string, UserRole> = {
  admin: 'admin',
  administrador: 'admin',
  administrator: 'admin',
  adm: 'admin',
  root: 'admin',
  gerente: 'gerente',
  manager: 'gerente',
  gestor: 'gerente',
  vendedor: 'vendedor',
  vendor: 'vendedor',
  vendedora: 'vendedor',
  financeiro: 'financeiro',
  financial: 'financeiro',
  financas: 'financeiro',
};

export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return 'vendedor';
  const key = String(role).trim().toLowerCase();
  return ROLE_ALIASES[key] ?? (ROLE_ORDER.includes(key as UserRole) ? (key as UserRole) : 'vendedor');
}

export function getStockAgeBucket(days: number): string {
  if (days <= 15) return '0-15 dias';
  if (days <= 30) return '16-30 dias';
  if (days <= 60) return '31-60 dias';
  if (days <= 90) return '61-90 dias';
  return '+90 dias';
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/**
 * Normaliza um número de WhatsApp para o padrão usado em links wa.me:
 * remove formatação e garante o DDI 55 quando o número é brasileiro.
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  // Já está no padrão internacional com DDI 55 (ex.: 5511999999999).
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  // Número nacional (DDD + 8 ou 9 dígitos): aplica o DDI 55 automaticamente.
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

/** Formata o valor digitado no campo de WhatsApp para exibição (pt-BR). */
export function formatWhatsAppPhoneInput(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 13);
  const formatNational = (d: string): string => {
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };
  if (digits.startsWith('55') && digits.length > 2) {
    return `55 ${formatNational(digits.slice(2))}`;
  }
  return formatNational(digits);
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function vehicleTitle(v: { brand: string; model: string; version?: string }): string {
  return `${v.brand} ${v.model}${v.version ? ` ${v.version}` : ''}`.trim();
}

export function vehicleYear(v: { year_fabrication: number | null; year_model: number | null }): string {
  if (v.year_fabrication && v.year_model) return `${v.year_fabrication}/${v.year_model}`;
  if (v.year_fabrication) return String(v.year_fabrication);
  if (v.year_model) return String(v.year_model);
  return '-';
}

/** Normaliza um nome para comparação: minúsculas, sem acentos e sem espaços extras. */
export function normalizeName(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Indica se uma venda pertence ao usuário logado.
 * Compara primeiro pelo uid (`salesperson`) e, como alternativa para vendas
 * antigas ou lançadas pela gestão, pelo nome do vendedor (`salesperson_name`).
 */
export function isOwnSale(
  sale: { salesperson?: string | null; salesperson_name?: string | null },
  uid: string | null | undefined,
  name: string | null | undefined,
): boolean {
  if (uid && sale.salesperson === uid) return true;
  const mine = normalizeName(name);
  return !!mine && normalizeName(sale.salesperson_name) === mine;
}
