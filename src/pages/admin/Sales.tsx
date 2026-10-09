import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, TrendingUp, DollarSign, Award } from 'lucide-react';
import { getAll } from '@/lib/firestore';
import type { Vehicle, VehicleSale, VehicleCost } from '@/types';
import { formatCurrency, formatPercent, formatDate, calculateVehicleTotalCost, vehicleTitle, exportToCSV, isOwnSale } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { useAuth } from '@/context/AuthContext';

export function Sales() {
  const { hasRole, user, profile } = useAuth();
  // Custos, margem e lucro ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  // Exportação de CSV restrita a admin e gerente.
  const canExport = hasRole('admin', 'gerente');
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setSales(await getAll<VehicleSale>('vehicle_sales'));
      setVehicles(await getAll<Vehicle>('vehicles'));
      setCosts(await getAll<VehicleCost>('vehicle_costs'));
      setLoading(false);
    }
    load();
  }, []);

  const vehicleMap = useMemo(() => { const m: Record<string, Vehicle> = {}; vehicles.forEach((v) => { m[v.id] = v; }); return m; }, [vehicles]);
  const costsByVehicle = useMemo(() => { const m: Record<string, VehicleCost[]> = {}; costs.forEach((c) => { if (!m[c.vehicle_id]) m[c.vehicle_id] = []; m[c.vehicle_id].push(c); }); return m; }, [costs]);

  // Quem não tem acesso financeiro (vendedor) só enxerga as próprias vendas.
  const mySalesOnly = !canSeeFinancials;
  const sellerName = profile?.name || user?.displayName || '';
  const ownSales = useMemo(
    () => (mySalesOnly ? sales.filter((s) => isOwnSale(s, user?.uid || null, sellerName)) : sales),
    [sales, mySalesOnly, user?.uid, sellerName],
  );

  const salesData = useMemo(() => {
    return ownSales.map((s) => {
      const v = vehicleMap[s.vehicle_id];
      const tc = v ? calculateVehicleTotalCost(v.purchase_value, costsByVehicle[s.vehicle_id] || []) : 0;
      const netProfit = s.sale_price - tc - (s.discount || 0) - (s.commission_value || 0);
      const margin = s.sale_price > 0 ? (netProfit / s.sale_price) * 100 : 0;
      const roi = tc > 0 ? (netProfit / tc) * 100 : 0;
      return { ...s, vehicle: v, totalCost: tc, netProfit, margin, roi };
    }).sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
  }, [ownSales, vehicleMap, costsByVehicle]);

  const totalRevenue = salesData.reduce((s, x) => s + x.sale_price, 0);
  const totalProfit = salesData.reduce((s, x) => s + x.netProfit, 0);
  const avgMargin = salesData.length > 0 ? salesData.reduce((s, x) => s + x.margin, 0) / salesData.length : 0;
  const topProfit = [...salesData].sort((a, b) => b.netProfit - a.netProfit).slice(0, 10);
  const bottomProfit = [...salesData].sort((a, b) => a.netProfit - b.netProfit).slice(0, 10);

  function handleExport() {
    exportToCSV('vendas.csv', ['Veículo', 'Data', 'Vendedor', 'Preço Venda', 'Custo Total', 'Desconto', 'Comissão', 'Lucro Líquido', 'Margem', 'ROI'],
      salesData.map((s) => [vehicleTitle(s.vehicle || { brand: '', model: '' }), formatDate(s.sale_date), s.salesperson_name, s.sale_price, s.totalCost, s.discount, s.commission_value, s.netProfit, formatPercent(s.margin), formatPercent(s.roi)]));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Vendas</h2><p className="text-sm text-gray-500">{salesData.length} venda(s) registrada(s)</p></div>
        {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
      </div>

      <div className={`grid grid-cols-2 gap-4 ${canSeeFinancials ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
        <StatCard title="Faturamento" value={formatCurrency(totalRevenue)} icon={DollarSign} color="primary" />
        {canSeeFinancials && <StatCard title="Lucro Líquido" value={formatCurrency(totalProfit)} icon={TrendingUp} color={totalProfit >= 0 ? 'success' : 'error'} />}
        {canSeeFinancials && <StatCard title="Margem Média" value={formatPercent(avgMargin)} icon={ShoppingCart} color="accent" />}
        <StatCard title="Ticket Médio" value={formatCurrency(salesData.length > 0 ? totalRevenue / salesData.length : 0)} icon={Award} color="primary" />
      </div>

      {canSeeFinancials && topProfit.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-success-700">Top 10 Mais Lucrativos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Veículo</th><th className="pb-2 font-medium">Data</th><th className="pb-2 font-medium text-right">Venda</th><th className="pb-2 font-medium text-right">Lucro</th><th className="pb-2 font-medium text-right">Margem</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {topProfit.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{s.vehicle ? <Link to={`/admin/veiculos/${s.vehicle.id}`} className="hover:text-primary-600">{vehicleTitle(s.vehicle)}</Link> : '-'}</td>
                    <td className="py-2.5 text-gray-600">{formatDate(s.sale_date)}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatCurrency(s.sale_price)}</td>
                    <td className="py-2.5 text-right font-bold text-success-600">{formatCurrency(s.netProfit)}</td>
                    <td className="py-2.5 text-right text-xs">{formatPercent(s.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canSeeFinancials && bottomProfit.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-error-700">Top 10 Menos Lucrativos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Veículo</th><th className="pb-2 font-medium">Data</th><th className="pb-2 font-medium text-right">Venda</th><th className="pb-2 font-medium text-right">Lucro</th><th className="pb-2 font-medium text-right">Margem</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {bottomProfit.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{s.vehicle ? <Link to={`/admin/veiculos/${s.vehicle.id}`} className="hover:text-primary-600">{vehicleTitle(s.vehicle)}</Link> : '-'}</td>
                    <td className="py-2.5 text-gray-600">{formatDate(s.sale_date)}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatCurrency(s.sale_price)}</td>
                    <td className={`py-2.5 text-right font-bold ${s.netProfit >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(s.netProfit)}</td>
                    <td className="py-2.5 text-right text-xs">{formatPercent(s.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!canSeeFinancials && salesData.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-gray-700">Vendas Realizadas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="pb-2 font-medium">Veículo</th><th className="pb-2 font-medium">Data</th><th className="pb-2 font-medium">Vendedor</th><th className="pb-2 font-medium text-right">Preço de Venda</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {salesData.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{s.vehicle ? <Link to={`/admin/veiculos/${s.vehicle.id}`} className="hover:text-primary-600">{vehicleTitle(s.vehicle)}</Link> : '-'}</td>
                    <td className="py-2.5 text-gray-600">{formatDate(s.sale_date)}</td>
                    <td className="py-2.5 text-gray-600">{s.salesperson_name || '-'}</td>
                    <td className="py-2.5 text-right font-bold text-primary-600">{formatCurrency(s.sale_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {salesData.length === 0 && <EmptyState icon={<ShoppingCart className="h-16 w-16" />} title="Nenhuma venda registrada" description="As vendas aparecem aqui assim que forem registradas na ficha do veículo." />}
    </div>
  );
}
