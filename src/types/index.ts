export type UserRole = 'admin' | 'gerente' | 'vendedor' | 'financeiro';

export type VehicleStatus =
  | 'em_negociacao'
  | 'comprado'
  | 'em_preparacao'
  | 'disponivel'
  | 'anunciado'
  | 'reservado'
  | 'vendido'
  | 'entregue'
  | 'cancelado';

export type VehicleOrigin =
  | 'compra_particular'
  | 'troca'
  | 'repasse'
  | 'leilao'
  | 'outra_loja'
  | 'outros';

export type CostCategory =
  | 'compra'
  | 'documentacao'
  | 'transferencia'
  | 'ipva'
  | 'licenciamento'
  | 'seguro'
  | 'funilaria'
  | 'pintura'
  | 'mecanica'
  | 'pneus'
  | 'higienizacao'
  | 'estetica'
  | 'revisao'
  | 'pecas'
  | 'comissao'
  | 'marketing'
  | 'outros';

export type ExpenseCategory =
  | 'aluguel'
  | 'salarios'
  | 'energia'
  | 'internet'
  | 'marketing'
  | 'contabilidade'
  | 'sistemas'
  | 'seguros'
  | 'impostos'
  | 'telefonia'
  | 'manutencao'
  | 'administrativo'
  | 'outros';

export type RevenueCategory =
  | 'venda_veiculo'
  | 'servicos'
  | 'comissoes'
  | 'outros';

export type PaymentStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado';

export interface Profile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  active: boolean;
  pages?: string[];
  created_at: string;
}

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  gradient: string;
  image: string;
  enabled: boolean;
}

export interface Settings {
  id: string;
  banners: BannerSlide[];
  company_name: string;
  company_phone: string;
  company_whatsapp: string;
  company_email: string;
  company_address: string;
  company_logo: string;
  min_margin_pct: number;
  max_stock_days: number;
  goal_monthly_sales: number;
  goal_monthly_revenue: number;
  goal_monthly_profit: number;
  goal_min_margin: number;
  goal_max_stock_days: number;
  goal_max_expense_budget: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  document: string;
  type: 'pf' | 'pj';
  notes: string;
  created_by: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  internal_id: string | null;
  plate: string;
  chassis: string;
  renavam: string;
  brand: string;
  model: string;
  version: string;
  year_fabrication: number | null;
  year_model: number | null;
  color: string;
  fuel: string;
  transmission: string;
  mileage: number;
  doors: number;
  body_type: string;
  plate_last_digit: string;
  features: string[];
  description: string;
  photos: string[];
  main_photo: string;
  purchase_value: number;
  total_cost: number;
  advertised_price: number;
  min_price: number;
  origin: VehicleOrigin;
  status: VehicleStatus;
  entry_date: string;
  entry_user: string | null;
  seller_origin: string;
  payment_method: string;
  notes: string;
  sale_date: string | null;
  sale_price: number;
  sold_by: string | null;
  sold_by_name: string | null;
  reserved_by: string | null;
  reserved_by_name: string | null;
  reserved_at: string | null;
  reserved_prev_status: VehicleStatus | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleEntry {
  id: string;
  vehicle_id: string;
  entry_date: string;
  purchase_value: number;
  origin: VehicleOrigin;
  payment_method: string;
  responsible: string;
  documentation: string;
  notes: string;
  created_by: string | null;
  created_at: string;
}

export interface VehicleCost {
  id: string;
  vehicle_id: string;
  date: string;
  category: CostCategory;
  description: string;
  amount: number;
  supplier: string;
  responsible: string;
  receipt_url: string;
  notes: string;
  created_by: string | null;
  created_at: string;
}

export interface VehiclePriceHistory {
  id: string;
  vehicle_id: string;
  changed_at: string;
  old_price: number;
  new_price: number;
  changed_by: string | null;
  reason: string;
}

export interface SaleDocument {
  name: string;
  url: string;
}

export interface VehicleSale {
  id: string;
  vehicle_id: string;
  customer_id: string | null;
  salesperson: string | null;
  salesperson_name: string;
  sale_date: string;
  sale_price: number;
  payment_method: string;
  down_payment: number;
  financing: number;
  trade_in: string;
  trade_in_value: number;
  discount: number;
  commission_pct: number;
  commission_value: number;
  documents: SaleDocument[];
  notes: string;
  created_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: string;
  status: PaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Revenue {
  id: string;
  date: string;
  category: RevenueCategory;
  description: string;
  amount: number;
  vehicle_id: string | null;
  payment_method: string;
  status: PaymentStatus;
  due_date: string | null;
  received_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CashFlowEntry {
  id: string;
  date: string;
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  amount: number;
  vehicle_id: string | null;
  payment_method: string;
  status: PaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  vehicle_id: string | null;
  read: boolean;
  created_at: string;
}
