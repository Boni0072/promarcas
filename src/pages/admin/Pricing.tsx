import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { getAll, getByField } from '@/lib/firestore';
import type { Vehicle, VehicleCost, Settings } from '@/types';
import { formatCurrency, formatPercent, calculateVehicleTotalCost, calculateMargin, calculateMarkup, calculateGrossProfit, vehicleTitle, exportToCSV } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';

export function Pricing() {
  const { hasRole } = useAuth();
  // Custos, margem e lucro ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  // Exportação de CSV restrita a admin e gerente.
  const canExport = hasRole('admin', 'gerente');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const allV = await getAll<Vehicle>('vehicles');
      setVehicles(allV.filter((v) => !['vendido', 'entregue', 'cancelado'].includes(v.status)));
      setCosts(await getAll<VehicleCost>('vehicle_costs'));
      const allS = await getAll<Settings>('settings');
      setSettings(allS[0] || null);
      setLoading(false);
    }
    load();
  }, []);

  const data = useMemo(() => {
    return vehicles.map((v) => {
      const vCosts = costs.filter((c) => c.vehicle_id === v.id);
      const tc = calculateVehicleTotalCost(v.purchase_value, vCosts);
      const profit = calculateGrossProfit(v.advertised_price, tc);
      const margin = calculateMargin(v.advertised_price, tc);
      const markup = calculateMarkup(v.advertised_price, tc);
      return { ...v, totalCost: tc, profit, margin, markup };
    });
  }, [vehicles, costs]);

  const belowMinMargin = data.filter((v) => v.margin < (settings?.goal_min_margin || 12) && v.advertised_price > 0);
  const belowCost = data.filter((v) => v.advertised_price > 0 && v.advertised_price < v.totalCost);
  const avgMargin = data.length > 0 ? data.reduce((s, v) => s + v.margin, 0) / data.length : 0;

  function handleExport() {
    exportToCSV('precos.csv', ['Veículo', 'Custo Total', 'Preço Atual', 'Preço Mínimo', 'Lucro', 'Margem', 'Markup'],
      data.map((v) => [vehicleTitle(v), v.totalCost, v.advertised_price, v.min_price, v.profit, formatPercent(v.margin), formatPercent(v.markup)]));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Controle de Preços</h2><p className="text-sm text-gray-500">{data.length} veículo(s) em análise</p></div>
        {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
      </div>

      {canSeeFinancials && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Margem Média" value={formatPercent(avgMargin)} icon={DollarSign} color={avgMargin >= (settings?.goal_min_margin || 12) ? 'success' : 'warning'} />
          <StatCard title="Abaixo da Meta" value={belowMinMargin.length} icon={TrendingDown} color="warning" subtitle="Veículos com margem baixa" />
          <StatCard title="Abaixo do Custo" value={belowCost.length} icon={AlertTriangle} color="error" subtitle="Prejuízo potencial" />
          <StatCard title="Lucro Total Est." value={formatCurrency(data.reduce((s, v) => s + v.profit, 0))} icon={TrendingUp} color="success" />
        </div>
      )}

      {canSeeFinancials && belowCost.length > 0 && (
        <div className="card border-error-200 bg-error-50 p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-error-600" /><h3 className="font-bold text-error-700">Veículos anunciados abaixo do custo</h3></div>
          <div className="mt-2 space-y-1">
            {belowCost.map((v) => (
              <Link key={v.id} to={`/admin/veiculos/${v.id}`} className="block text-sm text-error-700 hover:underline">
                {vehicleTitle(v)} — Preço: {formatCurrency(v.advertised_price)} | Custo: {formatCurrency(v.totalCost)} | Prejuízo: {formatCurrency(v.profit)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <EmptyState icon={<DollarSign className="h-16 w-16" />} title="Nenhum veículo para análise" />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="px-4 py-3 font-medium">Veículo</th>{canSeeFinancials && <th className="px-4 py-3 font-medium text-right">Custo Total</th>}<th className="px-4 py-3 font-medium text-right">Preço Atual</th><th className="px-4 py-3 font-medium text-right">Preço Mínimo</th>{canSeeFinancials && <th className="px-4 py-3 font-medium text-right">Lucro Est.</th>}{canSeeFinancials && <th className="px-4 py-3 font-medium text-right">Margem</th>}{canSeeFinancials && <th className="px-4 py-3 font-medium text-right">Markup</th>}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><Link to={`/admin/veiculos/${v.id}`} className="font-medium text-gray-900 hover:text-primary-600">{vehicleTitle(v)}</Link></td>
                  {canSeeFinancials && <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(v.totalCost)}</td>}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(v.advertised_price)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(v.min_price)}</td>
                  {canSeeFinancials && <td className={`px-4 py-3 text-right font-semibold ${v.profit >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(v.profit)}</td>}
                  {canSeeFinancials && <td className="px-4 py-3 text-right"><span className={`text-xs font-semibold ${v.margin >= (settings?.goal_min_margin || 12) ? 'text-success-600' : 'text-warning-600'}`}>{formatPercent(v.margin)}</span></td>}
                  {canSeeFinancials && <td className="px-4 py-3 text-right text-gray-500 text-xs">{formatPercent(v.markup)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
