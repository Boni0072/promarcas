import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Car, Gauge, Fuel, Settings2, Calendar, DoorOpen, Palette,
  Tag, DollarSign, Receipt, TrendingUp, ShoppingCart, Plus, History, MessageCircle,
  CalendarCheck, CalendarX,
} from 'lucide-react';
import { getById, getAll, create, update, remove, getByField } from '@/lib/firestore';
import type { Vehicle, VehicleCost, VehicleSale, VehiclePriceHistory, Settings, Customer } from '@/types';
import {
  formatCurrency, formatNumber, vehicleTitle, vehicleYear,
  VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, ORIGIN_LABELS,
  COST_CATEGORY_LABELS, formatDate, calculateVehicleTotalCost,
  calculateGrossProfit, calculateMargin, calculateMarkup,
  daysInStock, generateWhatsAppLink, isOwnSale,
} from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { DocumentUploader } from '@/components/admin/DocumentUploader';
import { useAuth } from '@/context/AuthContext';

function formatPercent(value: number): string {
  return `${(value || 0).toFixed(2).replace('.', ',')}%`;
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: 'success' | 'error' | 'warning' }) {
  const colorClass = color === 'success' ? 'text-success-600' : color === 'error' ? 'text-error-600' : color === 'warning' ? 'text-warning-600' : 'text-gray-900';
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? 'font-bold' : 'font-medium'} ${colorClass}`}>{value}</span>
    </div>
  );
}

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, hasRole } = useAuth();
  const canEdit = hasRole('admin', 'gerente');
  // Custos, margem e lucro ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [priceHistory, setPriceHistory] = useState<VehiclePriceHistory[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'costs' | 'pricing' | 'sale'>('overview');
  const [showCostModal, setShowCostModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);

  // Remover reserva: apenas admin, gerente ou o próprio vendedor que reservou.
  const canUnreserve = !!vehicle && vehicle.status === 'reservado' && (canEdit || (!!user && vehicle.reserved_by === user.uid));

  useEffect(() => {
    async function load() {
      if (!id) return;
      const v = await getById<Vehicle>('vehicles', id);
      setVehicle(v);
      const c = await getByField<VehicleCost>('vehicle_costs', 'vehicle_id', '==', id);
      setCosts(c);
      const s = await getByField<VehicleSale>('vehicle_sales', 'vehicle_id', '==', id);
      setSales(s);
      const ph = await getByField<VehiclePriceHistory>('vehicle_price_history', 'vehicle_id', '==', id);
      setPriceHistory(ph);
      const allS = await getAll<Settings>('settings');
      setSettings(allS[0] || null);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleReserve() {
    if (!vehicle) return;
    if (!confirm(`Reservar o veículo ${vehicleTitle(vehicle)}?`)) return;
    const reservedBy = user?.uid || null;
    const reservedByName = profile?.name || user?.displayName || 'Usuário';
    const reservedAt = new Date().toISOString();
    const prevStatus = vehicle.status;
    await update<Vehicle>('vehicles', vehicle.id, {
      status: 'reservado',
      reserved_by: reservedBy,
      reserved_by_name: reservedByName,
      reserved_at: reservedAt,
      reserved_prev_status: prevStatus,
    });
    setVehicle({ ...vehicle, status: 'reservado', reserved_by: reservedBy, reserved_by_name: reservedByName, reserved_at: reservedAt, reserved_prev_status: prevStatus });
  }

  async function handleUnreserve() {
    if (!vehicle) return;
    if (!confirm(`Remover a reserva do veículo ${vehicleTitle(vehicle)}?`)) return;
    const newStatus = vehicle.reserved_prev_status && vehicle.reserved_prev_status !== 'reservado' ? vehicle.reserved_prev_status : 'disponivel';
    await update<Vehicle>('vehicles', vehicle.id, {
      status: newStatus,
      reserved_by: null,
      reserved_by_name: null,
      reserved_at: null,
      reserved_prev_status: null,
    });
    setVehicle({ ...vehicle, status: newStatus, reserved_by: null, reserved_by_name: null, reserved_at: null, reserved_prev_status: null });
  }

  const totalCost = useMemo(() => vehicle ? calculateVehicleTotalCost(vehicle.purchase_value, costs) : 0, [vehicle, costs]);
  const grossProfit = vehicle ? calculateGrossProfit(vehicle.advertised_price, totalCost) : 0;
  const margin = vehicle ? calculateMargin(vehicle.advertised_price, totalCost) : 0;
  const markup = vehicle ? calculateMarkup(vehicle.advertised_price, totalCost) : 0;
  const days = vehicle ? daysInStock(vehicle) : 0;

  if (loading) return <LoadingState />;
  if (!vehicle) return <EmptyState icon={<Car className="h-16 w-16" />} title="Veículo não encontrado" />;

  const whatsapp = settings?.company_whatsapp || '';
  const waLink = generateWhatsAppLink(whatsapp, `Olá, tenho interesse no veículo ${vehicleTitle(vehicle)} ${vehicleYear(vehicle)}. Gostaria de mais informações.`);

  async function refreshCosts() {
    if (!id) return;
    const c = await getByField<VehicleCost>('vehicle_costs', 'vehicle_id', '==', id);
    setCosts(c);
    const tc = calculateVehicleTotalCost(vehicle!.purchase_value, c);
    await update<Vehicle>('vehicles', id, { total_cost: tc });
    setVehicle({ ...vehicle!, total_cost: tc });
  }

  async function refreshPricing(newPrice: number) {
    if (!id || !vehicle) return;
    if (vehicle.advertised_price !== newPrice) {
      await create('vehicle_price_history', {
        vehicle_id: id,
        old_price: vehicle.advertised_price,
        new_price: newPrice,
        changed_by: user?.uid || null,
        reason: '',
      });
    }
    await update<Vehicle>('vehicles', id, { advertised_price: newPrice });
    setVehicle({ ...vehicle, advertised_price: newPrice });
    const ph = await getByField<VehiclePriceHistory>('vehicle_price_history', 'vehicle_id', '==', id);
    setPriceHistory(ph);
  }

  const tabs = [
    { key: 'overview' as const, label: 'Visão Geral', icon: Car },
    // Aba "Custos" oculta de quem não pode ver valores de custo.
    ...(canSeeFinancials ? [{ key: 'costs' as const, label: 'Custos', icon: Receipt }] : []),
    { key: 'pricing' as const, label: 'Preços', icon: DollarSign },
    { key: 'sale' as const, label: 'Venda', icon: ShoppingCart },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/veiculos')} className="btn-outline !py-2 !px-3"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{vehicleTitle(vehicle)}</h2>
            {vehicle.status === 'reservado' && (vehicle.reserved_by_name || vehicle.reserved_by) && (
              <p className="flex items-center gap-1 text-xs font-medium text-purple-600">
                <CalendarCheck className="h-3.5 w-3.5" />
                Reservado por {vehicle.reserved_by_name || 'Usuário'}
                {vehicle.reserved_at && ` em ${formatDate(vehicle.reserved_at)}`}
              </p>
            )}
            <p className="text-sm text-gray-500">{vehicleYear(vehicle)} · {vehicle.plate}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className={`badge ${VEHICLE_STATUS_COLORS[vehicle.status]} self-center`}>{VEHICLE_STATUS_LABELS[vehicle.status]}</span>
          {canUnreserve && (
            <button onClick={handleUnreserve} className="btn-outline !text-purple-600 hover:!bg-purple-50" title="Remover reserva">
              <CalendarX className="h-4 w-4" /> Remover reserva
            </button>
          )}
          {canEdit ? (
            <Link to={`/admin/veiculos/${vehicle.id}/editar`} className="btn-outline"><Pencil className="h-4 w-4" /> Editar</Link>
          ) : (
            (vehicle.status === 'disponivel' || vehicle.status === 'anunciado') && (
              <button onClick={handleReserve} className="btn-outline !text-purple-600 hover:!bg-purple-50" title="Reservar veículo">
                <CalendarCheck className="h-4 w-4" /> Reservar
              </button>
            )
          )}
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-4 ${canSeeFinancials ? 'lg:grid-cols-5' : 'lg:grid-cols-2'}`}>
        {canSeeFinancials && (
          <div className="card p-4"><p className="text-xs text-gray-400">Custo Total</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totalCost)}</p></div>
        )}
        <div className="card p-4"><p className="text-xs text-gray-400">Preço Anunciado</p><p className="text-lg font-bold text-primary-600">{formatCurrency(vehicle.advertised_price)}</p></div>
        {canSeeFinancials && (
          <div className="card p-4"><p className="text-xs text-gray-400">Lucro Estimado</p><p className={`text-lg font-bold ${grossProfit >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(grossProfit)}</p></div>
        )}
        {canSeeFinancials && (
          <div className="card p-4"><p className="text-xs text-gray-400">Margem</p><p className={`text-lg font-bold ${margin >= (settings?.goal_min_margin || 12) ? 'text-success-600' : 'text-warning-600'}`}>{formatPercent(margin)}</p></div>
        )}
        <div className="card p-4"><p className="text-xs text-gray-400">Dias em Estoque</p><p className={`text-lg font-bold ${days > (settings?.max_stock_days || 60) ? 'text-error-600' : 'text-gray-900'}`}>{days}</p></div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${activeTab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-4 font-bold text-gray-900">Especificações</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Calendar, label: 'Ano', value: vehicleYear(vehicle) },
                { icon: Gauge, label: 'KM', value: `${formatNumber(vehicle.mileage)} km` },
                { icon: Fuel, label: 'Combustível', value: vehicle.fuel || '-' },
                { icon: Settings2, label: 'Câmbio', value: vehicle.transmission || '-' },
                { icon: Palette, label: 'Cor', value: vehicle.color || '-' },
                { icon: DoorOpen, label: 'Portas', value: `${vehicle.doors} portas` },
                { icon: Tag, label: 'Final placa', value: vehicle.plate_last_digit || '-' },
                { icon: Car, label: 'Carroceria', value: vehicle.body_type || '-' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><s.icon className="h-4.5 w-4.5 text-gray-500" /></div>
                  <div><p className="text-xs text-gray-400">{s.label}</p><p className="text-sm font-semibold text-gray-900">{s.value}</p></div>
                </div>
              ))}
            </div>
            {vehicle.features && vehicle.features.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs text-gray-400">Itens e opcionais</p>
                <div className="flex flex-wrap gap-2">{vehicle.features.map((f, i) => <Badge key={i} className="bg-primary-50 text-primary-700">{f}</Badge>)}</div>
              </div>
            )}
            {vehicle.description && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-1 text-xs text-gray-400">Descrição</p>
                <p className="whitespace-pre-wrap text-sm text-gray-600">{vehicle.description}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="mb-4 font-bold text-gray-900">Origem e Entrada</h3>
              <div className="space-y-3 text-sm">
                <Row label="Origem" value={ORIGIN_LABELS[vehicle.origin] || vehicle.origin} />
                <Row label="Data de entrada" value={formatDate(vehicle.entry_date)} />
                {canSeeFinancials && <Row label="Valor de compra" value={formatCurrency(vehicle.purchase_value)} />}
                <Row label="Vendedor/Origem" value={vehicle.seller_origin || '-'} />
                <Row label="Forma de pagamento" value={vehicle.payment_method || '-'} />
                <Row label="Chassi" value={vehicle.chassis || '-'} />
                <Row label="RENAVAM" value={vehicle.renavam || '-'} />
              </div>
            </div>

            <div className="card p-5">
              <h3 className="mb-4 font-bold text-gray-900">{canSeeFinancials ? 'Resumo Financeiro' : 'Preços'}</h3>
              <div className="space-y-2 text-sm">
                {canSeeFinancials && (
                  <>
                    <Row label="Valor de compra" value={formatCurrency(vehicle.purchase_value)} />
                    <Row label="Custos adicionais" value={formatCurrency(totalCost - vehicle.purchase_value)} />
                    <div className="border-t border-gray-100 pt-2"><Row label="Custo total" value={formatCurrency(totalCost)} bold /></div>
                  </>
                )}
                <Row label="Preço anunciado" value={formatCurrency(vehicle.advertised_price)} bold />
                {canSeeFinancials && (
                  <>
                    <Row label="Lucro bruto estimado" value={formatCurrency(grossProfit)} bold color={grossProfit >= 0 ? 'success' : 'error'} />
                    <Row label="Margem %" value={formatPercent(margin)} bold color={margin >= (settings?.goal_min_margin || 12) ? 'success' : 'warning'} />
                    <Row label="Markup %" value={formatPercent(markup)} />
                  </>
                )}
                <Row label="Preço mínimo" value={formatCurrency(vehicle.min_price)} />
              </div>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-success mt-4 w-full"><MessageCircle className="h-4 w-4" /> Compartilhar no WhatsApp</a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'costs' && canSeeFinancials && <CostsTab vehicleId={vehicle.id} costs={costs} onRefresh={refreshCosts} showModal={showCostModal} setShowModal={setShowCostModal} />}
      {activeTab === 'pricing' && <PricingTab vehicle={vehicle} totalCost={totalCost} priceHistory={priceHistory} onUpdate={refreshPricing} showModal={showPriceModal} setShowModal={setShowPriceModal} />}
      {activeTab === 'sale' && <SaleTab vehicle={vehicle} totalCost={totalCost} sales={sales} showModal={showSaleModal} setShowModal={setShowSaleModal} />}
    </div>
  );
}

function CostsTab({ vehicleId, costs, onRefresh, showModal, setShowModal }: {
  vehicleId: string; costs: VehicleCost[]; onRefresh: () => void; showModal: boolean; setShowModal: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({ category: 'outros', description: '', amount: 0, supplier: '', responsible: '', notes: '' });

  async function addCost(e: React.FormEvent) {
    e.preventDefault();
    await create('vehicle_costs', {
      vehicle_id: vehicleId,
      ...form,
      amount: parseFloat(String(form.amount)) || 0,
      date: new Date().toISOString().split('T')[0],
      created_by: user?.uid || null,
    });
    setForm({ category: 'outros', description: '', amount: 0, supplier: '', responsible: '', notes: '' });
    setShowModal(false);
    onRefresh();
  }

  async function deleteCost(costId: string) {
    if (!confirm('Excluir este custo?')) return;
    await remove('vehicle_costs', costId);
    onRefresh();
  }

  const total = costs.filter((c) => c.category !== 'compra').reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Custos do Veículo</h3>
          <p className="text-sm text-gray-500">Total em custos adicionais: {formatCurrency(total)}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Adicionar custo</button>
      </div>

      {costs.length === 0 ? (
        <EmptyState icon={<Receipt className="h-16 w-16" />} title="Nenhum custo registrado" description="Adicione custos como documentação, mecânica, estética, etc." />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {costs.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(c.date)}</td>
                  <td className="px-4 py-3"><Badge className="bg-gray-100 text-gray-700">{COST_CATEGORY_LABELS[c.category]}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{c.description || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.supplier || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => deleteCost(c.id)} className="text-error-500 hover:text-error-700 text-xs">Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Adicionar Custo">
        <form onSubmit={addCost} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Categoria</label><select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{Object.entries(COST_CATEGORY_LABELS).filter(([v]) => v !== 'compra').map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label">Valor (R$)</label><input type="number" step="0.01" className="input-field" required value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div><label className="label">Descrição</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Troca de óleo" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Fornecedor</label><input className="input-field" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
            <div><label className="label">Responsável</label><input className="input-field" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></div>
          </div>
          <div><label className="label">Observação</label><input className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <button type="submit" className="btn-primary w-full">Adicionar</button>
        </form>
      </Modal>
    </div>
  );
}

function PricingTab({ vehicle, totalCost, priceHistory, onUpdate, showModal, setShowModal }: {
  vehicle: Vehicle; totalCost: number; priceHistory: VehiclePriceHistory[];
  onUpdate: (price: number) => void; showModal: boolean; setShowModal: (v: boolean) => void;
}) {
  const { hasRole } = useAuth();
  // Custos, margem e lucro ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  const [newPrice, setNewPrice] = useState(vehicle.advertised_price);
  const [reason, setReason] = useState('');

  async function handlePriceChange(e: React.FormEvent) {
    e.preventDefault();
    if (vehicle.advertised_price !== newPrice) {
      await create('vehicle_price_history', {
        vehicle_id: vehicle.id,
        old_price: vehicle.advertised_price,
        new_price: newPrice,
        reason,
      });
    }
    onUpdate(newPrice);
    setShowModal(false);
    setReason('');
  }

  const grossProfit = calculateGrossProfit(newPrice || vehicle.advertised_price, totalCost);
  const margin = calculateMargin(newPrice || vehicle.advertised_price, totalCost);
  const markup = calculateMarkup(newPrice || vehicle.advertised_price, totalCost);

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 sm:grid-cols-2 ${canSeeFinancials ? 'lg:grid-cols-4' : ''}`}>
        {canSeeFinancials && (
          <div className="card p-4"><p className="text-xs text-gray-400">Custo Total</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totalCost)}</p></div>
        )}
        <div className="card p-4"><p className="text-xs text-gray-400">Preço Atual</p><p className="text-lg font-bold text-primary-600">{formatCurrency(vehicle.advertised_price)}</p></div>
        {canSeeFinancials && (
          <div className="card p-4"><p className="text-xs text-gray-400">Lucro Bruto</p><p className={`text-lg font-bold ${grossProfit >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(grossProfit)}</p></div>
        )}
        {canSeeFinancials && (
          <div className="card p-4"><p className="text-xs text-gray-400">Margem / Markup</p><p className="text-lg font-bold text-accent-600">{formatPercent(margin)} / {formatPercent(markup)}</p></div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Histórico de Alterações de Preço</h3>
        <button onClick={() => { setNewPrice(vehicle.advertised_price); setShowModal(true); }} className="btn-primary"><DollarSign className="h-4 w-4" /> Alterar preço</button>
      </div>

      {priceHistory.length === 0 ? (
        <EmptyState icon={<History className="h-16 w-16" />} title="Nenhuma alteração de preço registrada" />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium text-right">Preço Anterior</th>
                <th className="px-4 py-3 font-medium text-right">Novo Preço</th>
                <th className="px-4 py-3 font-medium text-right">Variação</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {priceHistory.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(p.changed_at)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(p.old_price)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(p.new_price)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.new_price >= p.old_price ? 'text-success-600' : 'text-error-600'}`}>{p.new_price >= p.old_price ? '+' : ''}{formatCurrency(p.new_price - p.old_price)}</td>
                  <td className="px-4 py-3 text-gray-500">{p.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Alterar Preço">
        <form onSubmit={handlePriceChange} className="space-y-4">
          <div><label className="label">Novo Preço (R$)</label><input type="number" step="0.01" className="input-field" required value={newPrice || ''} onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)} /></div>
          <div><label className="label">Motivo</label><input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Ajuste de mercado" /></div>
          {canSeeFinancials && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1">
              <Row label="Custo total" value={formatCurrency(totalCost)} />
              <Row label="Novo lucro" value={formatCurrency(grossProfit)} color={grossProfit >= 0 ? 'success' : 'error'} bold />
              <Row label="Nova margem" value={formatPercent(margin)} color={margin >= 12 ? 'success' : 'warning'} bold />
            </div>
          )}
          <button type="submit" className="btn-primary w-full">Salvar alteração</button>
        </form>
      </Modal>
    </div>
  );
}

function SaleTab({ vehicle, totalCost, sales, showModal, setShowModal }: {
  vehicle: Vehicle; totalCost: number; sales: VehicleSale[]; showModal: boolean; setShowModal: (v: boolean) => void;
}) {
  const { user, profile, hasRole } = useAuth();
  // Custos, margem e lucro ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  // Nome do usuário logado — preenche automaticamente o campo Vendedor da venda.
  const sellerName = profile?.name || user?.displayName || '';
  const [form, setForm] = useState({ customer_name: '', salesperson_name: sellerName, sale_price: 0, payment_method: '', down_payment: 0, financing: 0, trade_in: '', trade_in_value: 0, discount: 0, commission_pct: 0, notes: '', documents: [] as import('@/types').SaleDocument[] });

  // O profile carrega de forma assíncrona; preenche o campo se ainda estiver vazio.
  useEffect(() => {
    setForm((f) => (f.salesperson_name || !sellerName ? f : { ...f, salesperson_name: sellerName }));
  }, [sellerName]);

  async function handleSale(e: React.FormEvent) {
    e.preventDefault();
    const commissionValue = (form.sale_price * form.commission_pct) / 100;

    let customerId: string | null = null;
    if (form.customer_name) {
      const custId = await create('customers', { name: form.customer_name, phone: '', email: '', document: '', type: 'pf', notes: '', created_by: user?.uid || null });
      customerId = custId;
    }

    await create('vehicle_sales', {
      vehicle_id: vehicle.id,
      customer_id: customerId,
      salesperson: user?.uid || null,
      salesperson_name: form.salesperson_name,
      sale_date: new Date().toISOString().split('T')[0],
      sale_price: parseFloat(String(form.sale_price)) || 0,
      payment_method: form.payment_method,
      down_payment: parseFloat(String(form.down_payment)) || 0,
      financing: parseFloat(String(form.financing)) || 0,
      trade_in: form.trade_in,
      trade_in_value: parseFloat(String(form.trade_in_value)) || 0,
      discount: parseFloat(String(form.discount)) || 0,
      commission_pct: parseFloat(String(form.commission_pct)) || 0,
      commission_value: commissionValue,
      documents: form.documents,
      notes: form.notes,
      created_by: user?.uid || null,
    });

    await update<Vehicle>('vehicles', vehicle.id, {
      status: 'vendido',
      sale_date: new Date().toISOString().split('T')[0],
      sale_price: form.sale_price,
      sold_by: user?.uid || null,
      sold_by_name: form.salesperson_name || sellerName || null,
    });

    await create('revenues', {
      date: new Date().toISOString().split('T')[0],
      category: 'venda_veiculo',
      description: `Venda: ${vehicleTitle(vehicle)}`,
      amount: form.sale_price,
      vehicle_id: vehicle.id,
      status: 'pago',
      received_date: new Date().toISOString().split('T')[0],
      created_by: user?.uid || null,
    });

    await create('cash_flow', {
      date: new Date().toISOString().split('T')[0],
      type: 'receita',
      category: 'venda_veiculo',
      description: `Venda: ${vehicleTitle(vehicle)}`,
      amount: form.sale_price,
      vehicle_id: vehicle.id,
      status: 'pago',
      paid_date: new Date().toISOString().split('T')[0],
      created_by: user?.uid || null,
    });

    setShowModal(false);
    window.location.reload();
  }

  // Quem não tem acesso financeiro (vendedor) só enxerga as próprias vendas.
  const mySalesOnly = !canSeeFinancials;
  const ownSales = useMemo(
    () => (mySalesOnly ? sales.filter((s) => isOwnSale(s, user?.uid || null, sellerName)) : sales),
    [sales, mySalesOnly, user?.uid, sellerName],
  );

  const lastSale = ownSales[0];
  const netProfit = lastSale ? lastSale.sale_price - totalCost - (lastSale.discount || 0) - (lastSale.commission_value || 0) : 0;

  return (
    <div className="space-y-4">
      {vehicle.status === 'vendido' || vehicle.status === 'entregue' ? (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-success-600" /><h3 className="font-bold text-gray-900">Venda Realizada</h3></div>
          {lastSale ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-xs text-gray-400">Data da venda</p><p className="font-semibold">{formatDate(lastSale.sale_date)}</p></div>
              <div><p className="text-xs text-gray-400">Preço de venda</p><p className="font-semibold text-primary-600">{formatCurrency(lastSale.sale_price)}</p></div>
              <div><p className="text-xs text-gray-400">Cliente</p><p className="font-semibold">{form.customer_name || '-'}</p></div>
              <div><p className="text-xs text-gray-400">Vendedor</p><p className="font-semibold">{lastSale.salesperson_name || '-'}</p></div>
              <div><p className="text-xs text-gray-400">Desconto</p><p className="font-semibold">{formatCurrency(lastSale.discount)}</p></div>
              {canSeeFinancials && (
                <>
                  <div><p className="text-xs text-gray-400">Comissão</p><p className="font-semibold">{formatCurrency(lastSale.commission_value)}</p></div>
                  <div><p className="text-xs text-gray-400">Lucro Líquido</p><p className={`font-bold ${netProfit >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(netProfit)}</p></div>
                  <div><p className="text-xs text-gray-400">ROI</p><p className="font-bold text-accent-600">{formatPercent(totalCost > 0 ? ((lastSale.sale_price - totalCost) / totalCost) * 100 : 0)}</p></div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Este veículo já foi vendido.</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Registrar Venda</h3>
            <p className="text-sm text-gray-500">Ao registrar a venda, o status mudará automaticamente para "Vendido"</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-success"><ShoppingCart className="h-4 w-4" /> Registrar venda</button>
        </div>
      )}

      {ownSales.length > 0 ? (
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-gray-900">Histórico de Vendas</h3>
          <div className="space-y-2">
            {ownSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div><p className="text-sm font-semibold text-gray-900">{formatDate(s.sale_date)}</p><p className="text-xs text-gray-400">{s.salesperson_name || 'Vendedor não informado'}</p></div>
                <p className="font-bold text-primary-600">{formatCurrency(s.sale_price)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar Venda" size="lg">
        <form onSubmit={handleSale} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Nome do Cliente</label><input className="input-field" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><label className="label">Vendedor</label><input className="input-field" value={form.salesperson_name} onChange={(e) => setForm({ ...form, salesperson_name: e.target.value })} /></div>
            <div><label className="label">Preço de Venda (R$) *</label><input type="number" step="0.01" className="input-field" required value={form.sale_price || ''} onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} /></div>
            <div><label className="label">Forma de Pagamento</label><input className="input-field" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="À vista, Financiado..." /></div>
            <div><label className="label">Entrada (R$)</label><input type="number" step="0.01" className="input-field" value={form.down_payment || ''} onChange={(e) => setForm({ ...form, down_payment: parseFloat(e.target.value) || 0 })} /></div>
            <div><label className="label">Financiamento (R$)</label><input type="number" step="0.01" className="input-field" value={form.financing || ''} onChange={(e) => setForm({ ...form, financing: parseFloat(e.target.value) || 0 })} /></div>
            <div><label className="label">Troca (veículo)</label><input className="input-field" value={form.trade_in} onChange={(e) => setForm({ ...form, trade_in: e.target.value })} /></div>
            <div><label className="label">Valor da Troca (R$)</label><input type="number" step="0.01" className="input-field" value={form.trade_in_value || ''} onChange={(e) => setForm({ ...form, trade_in_value: parseFloat(e.target.value) || 0 })} /></div>
            <div><label className="label">Desconto (R$)</label><input type="number" step="0.01" className="input-field" value={form.discount || ''} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} /></div>
            <div><label className="label">Comissão (%)</label><input type="number" step="0.01" className="input-field" value={form.commission_pct || ''} onChange={(e) => setForm({ ...form, commission_pct: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div><label className="label">Observações</label><textarea className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="rounded-lg border border-gray-200 p-3">
            <DocumentUploader
              value={form.documents}
              onChange={(docs) => setForm({ ...form, documents: docs })}
              folder={`sales/${vehicle.id}`}
            />
          </div>
          {canSeeFinancials && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1">
              <Row label="Custo total" value={formatCurrency(totalCost)} />
              <Row label="Comissão calculada" value={formatCurrency((form.sale_price * form.commission_pct) / 100)} />
              <Row label="Lucro líquido estimado" value={formatCurrency(form.sale_price - totalCost - form.discount - (form.sale_price * form.commission_pct) / 100)} color={form.sale_price - totalCost - form.discount >= 0 ? 'success' : 'error'} bold />
            </div>
          )}
          <button type="submit" className="btn-success w-full">Confirmar venda</button>
        </form>
      </Modal>
    </div>
  );
}
