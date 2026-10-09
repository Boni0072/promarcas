import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileBarChart, Package, ShoppingCart, DollarSign, Receipt, Wallet, TrendingUp, Clock } from 'lucide-react';
import { getAll } from '@/lib/firestore';
import type { Vehicle, VehicleCost, VehicleSale, Expense, Revenue, Settings } from '@/types';
import { formatCurrency, formatPercent, daysInStock, calculateVehicleTotalCost, calculateMargin, vehicleTitle, formatDate, exportToCSV, getStockAgeBucket, isOwnSale } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';

type ReportType = 'estoque' | 'vendas' | 'lucro' | 'custos' | 'despesas' | 'receitas' | 'fluxo' | 'margem' | 'capital' | 'prazo';

export function Reports() {
  const { hasRole, user, profile } = useAuth();
  // Custos, margem e lucro ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  // Exportação de CSV restrita a admin e gerente.
  const canExport = hasRole('admin', 'gerente');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<ReportType>('estoque');

  useEffect(() => {
    async function load() {
      const [v, c, s, e, r, set] = await Promise.all([
        getAll<Vehicle>('vehicles'), getAll<VehicleCost>('vehicle_costs'), getAll<VehicleSale>('vehicle_sales'),
        getAll<Expense>('expenses'), getAll<Revenue>('revenues'), getAll<Settings>('settings'),
      ]);
      setVehicles(v); setCosts(c); setSales(s); setExpenses(e); setRevenues(r); setSettings(set[0] || null);
      setLoading(false);
    }
    load();
  }, []);

  const costsByVehicle = useMemo(() => { const m: Record<string, VehicleCost[]> = {}; costs.forEach((c) => { if (!m[c.vehicle_id]) m[c.vehicle_id] = []; m[c.vehicle_id].push(c); }); return m; }, [costs]);
  const vehicleMap = useMemo(() => { const m: Record<string, Vehicle> = {}; vehicles.forEach((v) => { m[v.id] = v; }); return m; }, [vehicles]);

  // Quem não tem acesso financeiro (vendedor) só enxerga as próprias vendas.
  const mySalesOnly = !canSeeFinancials;
  const sellerName = profile?.name || user?.displayName || '';
  const ownSales = useMemo(
    () => (mySalesOnly ? sales.filter((s) => isOwnSale(s, user?.uid || null, sellerName)) : sales),
    [sales, mySalesOnly, user?.uid, sellerName],
  );

  const reports: { key: ReportType; label: string; icon: typeof Package }[] = [
    { key: 'estoque', label: 'Estoque', icon: Package },
    { key: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { key: 'lucro', label: 'Lucro por Veículo', icon: TrendingUp },
    { key: 'custos', label: 'Custos por Veículo', icon: Receipt },
    { key: 'despesas', label: 'Despesas', icon: Wallet },
    { key: 'receitas', label: 'Receitas', icon: DollarSign },
    { key: 'fluxo', label: 'Fluxo de Caixa', icon: Wallet },
    { key: 'margem', label: 'Margem', icon: TrendingUp },
    { key: 'capital', label: 'Capital Parado', icon: DollarSign },
    { key: 'prazo', label: 'Veículos acima do prazo', icon: Clock },
  ];

  // Relatórios financeiros ficam ocultos para o vendedor.
  const visibleReports = canSeeFinancials
    ? reports
    : reports.filter((r) => ['estoque', 'vendas', 'prazo'].includes(r.key));

  function exportCurrent() {
    switch (activeReport) {
      case 'estoque':
        exportToCSV('relatorio_estoque.csv', ['Veículo', 'Status', 'Dias', 'Custo Total', 'Preço', 'Lucro', 'Margem'],
          vehicles.filter((v) => !['vendido', 'entregue', 'cancelado'].includes(v.status)).map((v) => {
            const tc = calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []);
            return [vehicleTitle(v), v.status, daysInStock(v), tc, v.advertised_price, v.advertised_price - tc, formatPercent(calculateMargin(v.advertised_price, tc))];
          }));
        break;
      case 'vendas':
        exportToCSV('relatorio_vendas.csv', ['Veículo', 'Data', 'Venda', 'Custo', 'Lucro', 'Margem'],
          ownSales.map((s) => { const v = vehicleMap[s.vehicle_id]; const tc = v ? calculateVehicleTotalCost(v.purchase_value, costsByVehicle[s.vehicle_id] || []) : 0; return [v ? vehicleTitle(v) : '-', formatDate(s.sale_date), s.sale_price, tc, s.sale_price - tc, formatPercent(s.sale_price > 0 ? ((s.sale_price - tc) / s.sale_price) * 100 : 0)]; }));
        break;
      default:
        exportToCSV(`relatorio_${activeReport}.csv`, ['Dados'], [['Ver detalhes no sistema']]);
    }
  }

  if (loading) return <LoadingState />;

  const activeVehicles = vehicles.filter((v) => !['vendido', 'entregue', 'cancelado'].includes(v.status));
  const maxDays = settings?.max_stock_days || 60;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Relatórios</h2><p className="text-sm text-gray-500">Selecione um relatório para visualizar</p></div>
        {canExport && <button onClick={exportCurrent} className="btn-primary"><FileBarChart className="h-4 w-4" /> Exportar CSV</button>}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleReports.map((r) => (
          <button key={r.key} onClick={() => setActiveReport(r.key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${activeReport === r.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <r.icon className="h-4 w-4" /> {r.label}
          </button>
        ))}
      </div>

      <div className="card p-5">
        {activeReport === 'estoque' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Veículo</th><th className="pb-2 font-medium">Dias</th>{canSeeFinancials && <th className="pb-2 font-medium text-right">Custo</th>}<th className="pb-2 font-medium text-right">Preço</th>{canSeeFinancials && <th className="pb-2 font-medium text-right">Lucro</th>}{canSeeFinancials && <th className="pb-2 font-medium text-right">Margem</th>}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {activeVehicles.map((v) => {
                  const tc = calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []);
                  return (<tr key={v.id}><td className="py-2.5"><Link to={`/admin/veiculos/${v.id}`} className="font-medium hover:text-primary-600">{vehicleTitle(v)}</Link></td><td className="py-2.5">{daysInStock(v)}</td>{canSeeFinancials && <td className="py-2.5 text-right">{formatCurrency(tc)}</td>}<td className="py-2.5 text-right">{formatCurrency(v.advertised_price)}</td>{canSeeFinancials && <td className={`py-2.5 text-right font-semibold ${v.advertised_price - tc >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(v.advertised_price - tc)}</td>}{canSeeFinancials && <td className="py-2.5 text-right text-xs">{formatPercent(calculateMargin(v.advertised_price, tc))}</td>}</tr>);
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'vendas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Veículo</th><th className="pb-2 font-medium">Data</th><th className="pb-2 font-medium text-right">Venda</th>{canSeeFinancials && <th className="pb-2 font-medium text-right">Custo</th>}{canSeeFinancials && <th className="pb-2 font-medium text-right">Lucro</th>}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {ownSales.map((s) => { const v = vehicleMap[s.vehicle_id]; const tc = v ? calculateVehicleTotalCost(v.purchase_value, costsByVehicle[s.vehicle_id] || []) : 0; const profit = s.sale_price - tc - (s.discount || 0) - (s.commission_value || 0); return (<tr key={s.id}><td className="py-2.5">{v ? <Link to={`/admin/veiculos/${v.id}`} className="font-medium hover:text-primary-600">{vehicleTitle(v)}</Link> : '-'}</td><td className="py-2.5">{formatDate(s.sale_date)}</td><td className="py-2.5 text-right">{formatCurrency(s.sale_price)}</td>{canSeeFinancials && <td className="py-2.5 text-right">{formatCurrency(tc)}</td>}{canSeeFinancials && <td className={`py-2.5 text-right font-bold ${profit >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(profit)}</td>}</tr>); })}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'lucro' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Veículo</th><th className="pb-2 font-medium text-right">Venda</th><th className="pb-2 font-medium text-right">Custo</th><th className="pb-2 font-medium text-right">Desconto</th><th className="pb-2 font-medium text-right">Comissão</th><th className="pb-2 font-medium text-right">Lucro Líquido</th><th className="pb-2 font-medium text-right">ROI</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {ownSales.map((s) => { const v = vehicleMap[s.vehicle_id]; const tc = v ? calculateVehicleTotalCost(v.purchase_value, costsByVehicle[s.vehicle_id] || []) : 0; const profit = s.sale_price - tc - (s.discount || 0) - (s.commission_value || 0); return (<tr key={s.id}><td className="py-2.5">{v ? vehicleTitle(v) : '-'}</td><td className="py-2.5 text-right">{formatCurrency(s.sale_price)}</td><td className="py-2.5 text-right">{formatCurrency(tc)}</td><td className="py-2.5 text-right">{formatCurrency(s.discount)}</td><td className="py-2.5 text-right">{formatCurrency(s.commission_value)}</td><td className={`py-2.5 text-right font-bold ${profit >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(profit)}</td><td className="py-2.5 text-right text-xs">{formatPercent(tc > 0 ? (profit / tc) * 100 : 0)}</td></tr>); })}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'custos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Veículo</th><th className="pb-2 font-medium text-right">Compra</th><th className="pb-2 font-medium text-right">Custos Adic.</th><th className="pb-2 font-medium text-right">Custo Total</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.map((v) => { const vc = costsByVehicle[v.id] || []; const tc = calculateVehicleTotalCost(v.purchase_value, vc); const ad = tc - v.purchase_value; return (<tr key={v.id}><td className="py-2.5">{vehicleTitle(v)}</td><td className="py-2.5 text-right">{formatCurrency(v.purchase_value)}</td><td className="py-2.5 text-right">{formatCurrency(ad)}</td><td className="py-2.5 text-right font-bold">{formatCurrency(tc)}</td></tr>); })}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'despesas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Data</th><th className="pb-2 font-medium">Categoria</th><th className="pb-2 font-medium">Descrição</th><th className="pb-2 font-medium text-right">Valor</th><th className="pb-2 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e) => (<tr key={e.id}><td className="py-2.5">{formatDate(e.date)}</td><td className="py-2.5">{e.category}</td><td className="py-2.5">{e.description}</td><td className="py-2.5 text-right">{formatCurrency(e.amount)}</td><td className="py-2.5">{e.status}</td></tr>))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'receitas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Data</th><th className="pb-2 font-medium">Categoria</th><th className="pb-2 font-medium">Descrição</th><th className="pb-2 font-medium text-right">Valor</th><th className="pb-2 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {revenues.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r) => (<tr key={r.id}><td className="py-2.5">{formatDate(r.date)}</td><td className="py-2.5">{r.category}</td><td className="py-2.5">{r.description}</td><td className="py-2.5 text-right">{formatCurrency(r.amount)}</td><td className="py-2.5">{r.status}</td></tr>))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'fluxo' && <p className="py-8 text-center text-sm text-gray-400">Ver detalhes no módulo "Financeiro"</p>}

        {activeReport === 'margem' && (
          <div className="space-y-3">
            {activeVehicles.map((v) => { const tc = calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []); const m = calculateMargin(v.advertised_price, tc); return (<div key={v.id} className="flex items-center gap-3"><div className="flex-1"><p className="text-sm font-medium">{vehicleTitle(v)}</p></div><div className="w-48"><div className="h-2.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${m >= (settings?.goal_min_margin || 12) ? 'bg-success-500' : m >= 0 ? 'bg-warning-500' : 'bg-error-500'}`} style={{ width: `${Math.max(Math.min(m, 100), 0)}%` }} /></div></div><span className={`text-sm font-semibold w-20 text-right ${m >= (settings?.goal_min_margin || 12) ? 'text-success-600' : 'text-warning-600'}`}>{formatPercent(m)}</span></div>); })}
          </div>
        )}

        {activeReport === 'capital' && (
          <div className="space-y-2">
            {activeVehicles.map((v) => { const tc = calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []); return (<div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3"><Link to={`/admin/veiculos/${v.id}`} className="font-medium hover:text-primary-600">{vehicleTitle(v)}</Link><div className="text-right"><p className="font-bold text-error-600">{formatCurrency(tc)}</p><p className="text-xs text-gray-400">{daysInStock(v)} dias</p></div></div>); }).sort((a, b) => 0)}
          </div>
        )}

        {activeReport === 'prazo' && (
          <div className="space-y-2">
            {activeVehicles.filter((v) => daysInStock(v) > maxDays).length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Nenhum veículo acima do prazo</p>
            ) : (
              activeVehicles.filter((v) => daysInStock(v) > maxDays).map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-error-200 bg-error-50 p-3">
                  <Link to={`/admin/veiculos/${v.id}`} className="font-medium text-gray-900 hover:text-primary-600">{vehicleTitle(v)}</Link>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-error-100 text-error-700">{getStockAgeBucket(daysInStock(v))}</Badge>
                    <span className="font-bold text-error-600">{daysInStock(v)} dias</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
