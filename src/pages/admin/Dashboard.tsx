import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, TrendingUp, Package, Car, Wallet, Target, AlertTriangle,
  ShoppingCart, Clock, Percent, AlertOctagon, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { getAll } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import type { Vehicle, VehicleCost, VehicleSale, Expense, Revenue, Settings } from '@/types';
import { StatCard } from '@/components/ui/StatCard';
import {
  formatCurrency, formatPercent, daysInStock, calculateVehicleTotalCost,
  calculateMargin, vehicleTitle, isOwnSale,
} from '@/lib/utils';

interface Alert {
  type: 'danger' | 'warning';
  title: string;
  message: string;
  vehicleId?: string;
}

function toTime(v: any): number {
  if (!v) return 0;
  if (v.seconds) return v.seconds * 1000;
  if (typeof v === 'string') return new Date(v).getTime();
  if (v instanceof Date) return v.getTime();
  return 0;
}

export function Dashboard() {
  const { hasRole, user, profile } = useAuth();
  // Custos, margem e lucro ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    async function load() {
      const [v, c, s, e, r, set] = await Promise.all([
        getAll<Vehicle>('vehicles'),
        getAll<VehicleCost>('vehicle_costs'),
        getAll<VehicleSale>('vehicle_sales'),
        getAll<Expense>('expenses'),
        getAll<Revenue>('revenues'),
        getAll<Settings>('settings'),
      ]);
      setVehicles(v);
      setCosts(c);
      setSales(s);
      setExpenses(e);
      setRevenues(r);
      setSettings(set[0] || null);
      setLoading(false);
    }
    load();
  }, []);

  // Quem não tem acesso financeiro (vendedor) só enxerga as próprias vendas.
  const mySalesOnly = !canSeeFinancials;
  const sellerName = profile?.name || user?.displayName || '';
  const ownSales = useMemo(
    () => (mySalesOnly ? sales.filter((s) => isOwnSale(s, user?.uid || null, sellerName)) : sales),
    [sales, mySalesOnly, user?.uid, sellerName],
  );

  const costsByVehicle = useMemo(() => {
    const map: Record<string, VehicleCost[]> = {};
    for (const c of costs) {
      if (!map[c.vehicle_id]) map[c.vehicle_id] = [];
      map[c.vehicle_id].push(c);
    }
    return map;
  }, [costs]);

  const activeVehicles = useMemo(() => vehicles.filter((v) => !['vendido', 'entregue', 'cancelado'].includes(v.status)), [vehicles]);
  const soldVehicles = useMemo(() => vehicles.filter((v) => v.status === 'vendido' || v.status === 'entregue'), [vehicles]);

  const totalRevenue = ownSales.reduce((s, sale) => s + (sale.sale_price || 0), 0);
  const totalExpenses = expenses.filter((e) => e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const totalVehicleCosts = costs.reduce((s, c) => s + c.amount, 0);

  const grossProfit = ownSales.reduce((sum, sale) => {
    const v = vehicles.find((v) => v.id === sale.vehicle_id);
    if (!v) return sum;
    const tc = calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []);
    return sum + (sale.sale_price - tc - (sale.discount || 0) - (sale.commission_value || 0));
  }, 0);

  const netProfit = grossProfit - totalExpenses;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const ticketMedio = ownSales.length > 0 ? totalRevenue / ownSales.length : 0;

  const stockValue = activeVehicles.reduce((sum, v) => {
    const tc = calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []);
    return sum + tc;
  }, 0);

  const avgDaysInStock = activeVehicles.length > 0 ? activeVehicles.reduce((s, v) => s + daysInStock(v), 0) / activeVehicles.length : 0;

  const alerts = useMemo<Alert[]>(() => {
    const result: Alert[] = [];
    const maxStockDays = settings?.max_stock_days || 60;
    const minMargin = settings?.goal_min_margin || 12;

    for (const v of activeVehicles) {
      const days = daysInStock(v);
      const tc = calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []);
      const m = calculateMargin(v.advertised_price, tc);

      if (days > maxStockDays) {
        result.push({ type: days > 90 ? 'danger' : 'warning', title: 'Veículo parado há muito tempo', message: `${vehicleTitle(v)} está há ${days} dias em estoque`, vehicleId: v.id });
      }
      if (canSeeFinancials && v.advertised_price > 0 && tc > 0 && v.advertised_price < tc) {
        result.push({ type: 'danger', title: 'Preço abaixo do custo', message: `${vehicleTitle(v)} está anunciado abaixo do custo total`, vehicleId: v.id });
      }
      if (canSeeFinancials && v.advertised_price > 0 && tc > 0 && m < minMargin && v.advertised_price >= tc) {
        result.push({ type: 'warning', title: 'Margem abaixo da meta', message: `${vehicleTitle(v)} com margem de ${formatPercent(m)}`, vehicleId: v.id });
      }
      if (canSeeFinancials) {
        const prepCosts = (costsByVehicle[v.id] || []).filter((c) => ['funilaria', 'pintura', 'mecanica', 'pneus', 'estetica', 'higienizacao'].includes(c.category)).reduce((s, c) => s + c.amount, 0);
        if (prepCosts > v.purchase_value * 0.1) {
          result.push({ type: 'warning', title: 'Custo de preparação elevado', message: `${vehicleTitle(v)} teve R$ ${prepCosts.toFixed(0)} em preparação`, vehicleId: v.id });
        }
      }
    }

    if (canSeeFinancials && stockValue > (settings?.goal_monthly_revenue || 100000) * 2) {
      result.push({ type: 'warning', title: 'Capital elevado em estoque', message: `R$ ${stockValue.toFixed(0)} em estoque` });
    }

    if (canSeeFinancials) {
      const monthExpenses = expenses.filter((e) => new Date(e.date).getMonth() === new Date().getMonth()).reduce((s, e) => s + e.amount, 0);
      if (monthExpenses > (settings?.goal_max_expense_budget || 30000)) {
        result.push({ type: 'danger', title: 'Despesas acima do orçamento', message: `Despesas do mês: R$ ${monthExpenses.toFixed(0)}` });
      }

      const pendingReceivable = revenues.filter((r) => r.status === 'pendente').reduce((s, r) => s + r.amount, 0);
      const pendingPayable = expenses.filter((e) => e.status === 'pendente').reduce((s, e) => s + e.amount, 0);
      const cashBalance = pendingReceivable - pendingPayable;
      if (cashBalance < 0) {
        result.push({ type: 'danger', title: 'Fluxo de caixa negativo', message: `Saldo previsto: R$ ${cashBalance.toFixed(0)}` });
      }
    }

    if (ownSales.length < (settings?.goal_monthly_sales || 10) * 0.5 && new Date().getDate() > 15) {
      result.push({ type: 'warning', title: 'Vendas abaixo da meta', message: `${ownSales.length} vendas registradas` });
    }

    return result;
  }, [activeVehicles, costsByVehicle, settings, stockValue, expenses, revenues, ownSales, canSeeFinancials]);

  const chartData = useMemo(() => {
    const now = new Date();
    const periods: { label: string; start: Date; end: Date }[] = [];

    if (period === 'day') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        periods.push({ label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), start: new Date(d.setHours(0, 0, 0, 0)), end: new Date(d.setHours(23, 59, 59, 999)) });
      }
    } else if (period === 'week') {
      for (let i = 7; i >= 0; i--) {
        const start = new Date(now); start.setDate(start.getDate() - i * 7);
        const end = new Date(start); end.setDate(end.getDate() + 6);
        periods.push({ label: `Sem ${8 - i}`, start, end });
      }
    } else if (period === 'month') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        periods.push({ label: d.toLocaleDateString('pt-BR', { month: 'short' }), start: d, end });
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const y = now.getFullYear() - i;
        periods.push({ label: String(y), start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) });
      }
    }

    return periods.map((p) => {
      const rev = revenues.filter((r) => { const d = new Date(r.date); return d >= p.start && d <= p.end; }).reduce((s, r) => s + r.amount, 0)
        + ownSales.filter((s) => { const d = new Date(s.sale_date); return d >= p.start && d <= p.end; }).reduce((s, s2) => s + s2.sale_price, 0);
      const exp = expenses.filter((e) => { const d = new Date(e.date); return d >= p.start && d <= p.end; }).reduce((s, e) => s + e.amount, 0);
      return { name: p.label, Receitas: rev, Despesas: exp, Lucro: rev - exp };
    });
  }, [period, revenues, expenses, ownSales]);

  const stockAgeData = useMemo(() => {
    const buckets = { '0-15 dias': 0, '16-30 dias': 0, '31-60 dias': 0, '61-90 dias': 0, '+90 dias': 0 };
    for (const v of activeVehicles) {
      const d = daysInStock(v);
      if (d <= 15) buckets['0-15 dias']++;
      else if (d <= 30) buckets['16-30 dias']++;
      else if (d <= 60) buckets['31-60 dias']++;
      else if (d <= 90) buckets['61-90 dias']++;
      else buckets['+90 dias']++;
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [activeVehicles]);

  const stockAgeColors = ['#10b981', '#f59e0b', '#fbbf24', '#f87171', '#dc2626'];

  const capitalParado = useMemo(() => {
    return activeVehicles.map((v) => ({ vehicle: v, capital: calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []), days: daysInStock(v) }))
      .sort((a, b) => b.capital - a.capital).slice(0, 5);
  }, [activeVehicles, costsByVehicle]);

  const topProfit = useMemo(() => {
    return ownSales.map((s) => {
        const v = vehicles.find((v) => v.id === s.vehicle_id);
        if (!v) return null;
        const tc = calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []);
        const profit = s.sale_price - tc - (s.discount || 0) - (s.commission_value || 0);
        return { vehicle: v, profit, margin: calculateMargin(s.sale_price, tc) };
      })
      .filter((x): x is { vehicle: Vehicle; profit: number; margin: number } => x !== null)
      .sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [ownSales, vehicles, costsByVehicle]);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600" /></div>;

  const dangerAlerts = alerts.filter((a) => a.type === 'danger');
  const warningAlerts = alerts.filter((a) => a.type === 'warning');

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-error-50 px-5 py-3">
            <AlertOctagon className="h-5 w-5 text-error-600" />
            <h2 className="font-bold text-error-700">Pontos de Atenção</h2>
            <span className="ml-auto text-sm text-error-600">{alerts.length} alertas</span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {dangerAlerts.map((a, i) => (
              <div key={`d-${i}`} className="flex items-start gap-3 px-5 py-3 hover:bg-error-50/30">
                <AlertCircle className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-error-500" />
                <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{a.title}</p><p className="text-xs text-gray-500">{a.message}</p></div>
                {a.vehicleId && <Link to={`/admin/veiculos/${a.vehicleId}`} className="text-xs font-medium text-primary-600 hover:underline">Ver</Link>}
              </div>
            ))}
            {warningAlerts.map((a, i) => (
              <div key={`w-${i}`} className="flex items-start gap-3 px-5 py-3 hover:bg-warning-50/30">
                <AlertTriangle className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-warning-500" />
                <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{a.title}</p><p className="text-xs text-gray-500">{a.message}</p></div>
                {a.vehicleId && <Link to={`/admin/veiculos/${a.vehicleId}`} className="text-xs font-medium text-primary-600 hover:underline">Ver</Link>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-2 gap-4 ${canSeeFinancials ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
        <StatCard title="Faturamento" value={formatCurrency(totalRevenue)} icon={DollarSign} color="primary" />
        {canSeeFinancials && <StatCard title="Lucro Líquido" value={formatCurrency(netProfit)} icon={TrendingUp} color={netProfit >= 0 ? 'success' : 'error'} />}
        {canSeeFinancials && <StatCard title="Margem" value={formatPercent(margin)} icon={Percent} color="accent" />}
        <StatCard title="Veículos Vendidos" value={soldVehicles.length} icon={ShoppingCart} color="success" />
      </div>

      <div className={`grid grid-cols-2 gap-4 ${canSeeFinancials ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
        {canSeeFinancials && <StatCard title="Valor do Estoque" value={formatCurrency(stockValue)} icon={Package} color="primary" subtitle={`${activeVehicles.length} veículos`} />}
        <StatCard title="Ticket Médio" value={formatCurrency(ticketMedio)} icon={Car} color="accent" />
        <StatCard title="Dias Médios em Estoque" value={avgDaysInStock.toFixed(0)} icon={Clock} color={avgDaysInStock > (settings?.max_stock_days || 60) ? 'warning' : 'success'} />
        {canSeeFinancials && <StatCard title="Despesas (Pagas)" value={formatCurrency(totalExpenses)} icon={Wallet} color="error" />}
      </div>

      {canSeeFinancials && (
      <div className="card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-bold text-gray-900">Saúde Financeira</h2><p className="text-sm text-gray-500">Receitas x Despesas x Lucro</p></div>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${period === p ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>
                {p === 'day' ? 'Dia' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
              <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1c6af0" stopOpacity={0.3} /><stop offset="95%" stopColor="#1c6af0" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }} />
            <Legend />
            <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2} fill="url(#colorReceita)" />
            <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#colorDespesa)" />
            <Area type="monotone" dataKey="Lucro" stroke="#1c6af0" strokeWidth={2} fill="url(#colorLucro)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
          <div><p className="text-xs text-gray-400">Receita Total</p><p className="text-lg font-bold text-success-600">{formatCurrency(totalRevenue)}</p></div>
          <div><p className="text-xs text-gray-400">Custos Totais</p><p className="text-lg font-bold text-error-600">{formatCurrency(totalVehicleCosts + totalExpenses)}</p></div>
          <div><p className="text-xs text-gray-400">Lucro Bruto</p><p className="text-lg font-bold text-primary-600">{formatCurrency(grossProfit)}</p></div>
          <div><p className="text-xs text-gray-400">Margem Líquida</p><p className="text-lg font-bold text-accent-600">{formatPercent(totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0)}</p></div>
        </div>
      </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900">Idade do Estoque</h2>
          <p className="text-sm text-gray-500">Distribuição por tempo em estoque</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stockAgeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {stockAgeData.map((_, i) => <Cell key={i} fill={stockAgeColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {canSeeFinancials && (
        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900">Capital Parado em Estoque</h2>
          <p className="text-sm text-gray-500">Veículos com maior capital imobilizado</p>
          <div className="mt-4 space-y-3">
            {capitalParado.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Nenhum veículo em estoque</p>
            ) : (
              capitalParado.map((item, i) => (
                <Link key={item.vehicle.id} to={`/admin/veiculos/${item.vehicle.id}`} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700">#{i + 1}</div>
                  <div className="flex-1 min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{vehicleTitle(item.vehicle)}</p><p className="text-xs text-gray-400">{item.days} dias em estoque</p></div>
                  <p className="text-sm font-bold text-error-600">{formatCurrency(item.capital)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
        )}
      </div>

      {canSeeFinancials && (
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-success-600" /><h2 className="text-lg font-bold text-gray-900">Top 5 Veículos Mais Lucrativos</h2></div>
        {topProfit.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Nenhuma venda registrada ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Veículo</th><th className="pb-2 font-medium">Preço de Venda</th><th className="pb-2 font-medium">Custo Total</th><th className="pb-2 font-medium">Lucro</th><th className="pb-2 font-medium">Margem</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {topProfit.map((item) => {
                  const tc = calculateVehicleTotalCost(item.vehicle.purchase_value, costsByVehicle[item.vehicle.id] || []);
                  return (
                    <tr key={item.vehicle.id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{vehicleTitle(item.vehicle)}</td>
                      <td className="py-3 text-gray-600">{formatCurrency(item.vehicle.sale_price)}</td>
                      <td className="py-3 text-gray-600">{formatCurrency(tc)}</td>
                      <td className="py-3 font-bold text-success-600">{formatCurrency(item.profit)}</td>
                      <td className="py-3"><span className={`badge ${item.margin >= (settings?.goal_min_margin || 12) ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>{formatPercent(item.margin)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-primary-600" /><h2 className="text-lg font-bold text-gray-900">Metas x Realizado</h2></div>
        <div className="space-y-4">
          <GoalBar label="Vendas" current={soldVehicles.length} target={settings?.goal_monthly_sales || 10} unit="" />
          <GoalBar label="Faturamento" current={totalRevenue} target={settings?.goal_monthly_revenue || 100000} unit="R$" />
          {canSeeFinancials && (
            <>
              <GoalBar label="Lucro" current={netProfit} target={settings?.goal_monthly_profit || 20000} unit="R$" />
              <GoalBar label="Margem mínima" current={margin} target={settings?.goal_min_margin || 12} unit="%" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalBar({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const achieved = current >= target;
  const fmt = unit === 'R$' ? (v: number) => formatCurrency(v) : unit === '%' ? (v: number) => formatPercent(v) : (v: number) => String(v);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={achieved ? 'text-success-600 font-semibold' : 'text-gray-500'}>
          {fmt(current)} / {fmt(target)}
          {achieved && <CheckCircle2 className="ml-1 inline h-4 w-4" />}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all ${achieved ? 'bg-success-500' : pct > 50 ? 'bg-primary-500' : 'bg-warning-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
