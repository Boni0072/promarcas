import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, DollarSign, Clock, TrendingDown } from 'lucide-react';
import { getAll } from '@/lib/firestore';
import type { Vehicle, VehicleCost, Settings } from '@/types';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import {
  formatCurrency, daysInStock, calculateVehicleTotalCost, calculateMargin,
  VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, vehicleTitle, vehicleYear,
  formatPercent, formatDate, getStockAgeBucket, exportToCSV,
} from '@/lib/utils';
import { FilterBar, SelectField } from '@/components/ui/FilterBar';
import { useAuth } from '@/context/AuthContext';

const ACTIVE_STATUSES = ['em_negociacao', 'comprado', 'em_preparacao', 'disponivel', 'anunciado', 'reservado'];

export function Stock() {
  const { hasRole } = useAuth();
  // Custos, margem e lucro ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  // Exportação de CSV restrita a admin e gerente.
  const canExport = hasRole('admin', 'gerente');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [ageFilter, setAgeFilter] = useState('');

  useEffect(() => {
    async function load() {
      const allV = await getAll<Vehicle>('vehicles');
      setVehicles(allV.filter((v) => ACTIVE_STATUSES.includes(v.status)));
      setCosts(await getAll<VehicleCost>('vehicle_costs'));
      const allS = await getAll<Settings>('settings');
      setSettings(allS[0] || null);
      setLoading(false);
    }
    load();
  }, []);

  const costsByVehicle = useMemo(() => {
    const map: Record<string, VehicleCost[]> = {};
    for (const c of costs) {
      if (!map[c.vehicle_id]) map[c.vehicle_id] = [];
      map[c.vehicle_id].push(c);
    }
    return map;
  }, [costs]);

  const stockData = useMemo(() => {
    return vehicles.map((v) => {
      const tc = calculateVehicleTotalCost(v.purchase_value, costsByVehicle[v.id] || []);
      const additional = tc - v.purchase_value;
      const profit = v.advertised_price - tc;
      const margin = calculateMargin(v.advertised_price, tc);
      const days = daysInStock(v);
      return { ...v, totalCost: tc, additionalCosts: additional, profit, margin, days, ageBucket: getStockAgeBucket(days) };
    });
  }, [vehicles, costsByVehicle]);

  const filtered = useMemo(() => {
    if (!ageFilter) return stockData;
    return stockData.filter((v) => v.ageBucket === ageFilter);
  }, [stockData, ageFilter]);

  const stats = useMemo(() => {
    const total = stockData.length;
    const available = stockData.filter((v) => v.status === 'disponivel').length;
    const advertised = stockData.filter((v) => v.status === 'anunciado').length;
    const reserved = stockData.filter((v) => v.status === 'reservado').length;
    const totalValue = stockData.reduce((s, v) => s + v.totalCost, 0);
    return { total, available, advertised, reserved, totalValue };
  }, [stockData]);

  function handleExport() {
    exportToCSV('estoque.csv',
      ['Veículo', 'Ano', 'Status', 'Dias', 'Custo Aquisição', 'Custos Adicionais', 'Custo Total', 'Preço Anunciado', 'Lucro Estimado', 'Margem'],
      filtered.map((v) => [vehicleTitle(v), vehicleYear(v), VEHICLE_STATUS_LABELS[v.status], v.days, v.purchase_value, v.additionalCosts, v.totalCost, v.advertised_price, v.profit, formatPercent(v.margin)])
    );
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Controle de Estoque</h2><p className="text-sm text-gray-500">{stats.total} veículo(s) em estoque</p></div>
        {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Estoque Total" value={stats.total} icon={Package} color="primary" />
        <StatCard title="Disponíveis" value={stats.available} icon={Package} color="success" />
        <StatCard title="Anunciados" value={stats.advertised} icon={Package} color="accent" />
        <StatCard title="Reservados" value={stats.reserved} icon={Package} color="warning" />
      </div>

      <div className={`grid grid-cols-1 gap-4 ${canSeeFinancials ? 'sm:grid-cols-3' : 'sm:grid-cols-1'}`}>
        {canSeeFinancials && (
          <>
            <StatCard title="Valor Total do Estoque" value={formatCurrency(stats.totalValue)} icon={DollarSign} color="primary" />
            <StatCard title="Capital Parado" value={formatCurrency(stats.totalValue)} icon={TrendingDown} color="error" subtitle="Custo total imobilizado" />
          </>
        )}
        <StatCard title="Dias Médios" value={(stockData.reduce((s, v) => s + v.days, 0) / (stats.total || 1)).toFixed(0)} icon={Clock} color={stockData.length > 0 && (stockData.reduce((s, v) => s + v.days, 0) / stockData.length) > (settings?.max_stock_days || 60) ? 'warning' : 'success'} />
      </div>

      <FilterBar>
        <SelectField value={ageFilter} onChange={setAgeFilter} placeholder="Todas as idades"
          options={[
            { value: '0-15 dias', label: '0-15 dias' },
            { value: '16-30 dias', label: '16-30 dias' },
            { value: '31-60 dias', label: '31-60 dias' },
            { value: '61-90 dias', label: '61-90 dias' },
            { value: '+90 dias', label: '+90 dias' },
          ]}
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState icon={<Package className="h-16 w-16" />} title="Estoque vazio" description="Não há veículos em estoque no momento." />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
                <th className="px-4 py-3 font-medium">Veículo</th>
                <th className="px-4 py-3 font-medium">Entrada</th>
                <th className="px-4 py-3 font-medium text-center">Dias</th>
                {canSeeFinancials && <th className="px-4 py-3 font-medium text-right">Custo Total</th>}
                <th className="px-4 py-3 font-medium text-right">Preço Anunciado</th>
                {canSeeFinancials && <th className="px-4 py-3 font-medium text-right">Lucro Est.</th>}
                {canSeeFinancials && <th className="px-4 py-3 font-medium text-right">Margem</th>}
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/veiculos/${v.id}`} className="font-medium text-gray-900 hover:text-primary-600">{vehicleTitle(v)}</Link>
                    <p className="text-xs text-gray-400">{vehicleYear(v)} · {v.plate}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(v.entry_date)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${v.days > (settings?.max_stock_days || 60) ? 'bg-error-100 text-error-700' : v.days > 30 ? 'bg-warning-100 text-warning-700' : 'bg-gray-100 text-gray-600'}`}>{v.days}d</span>
                  </td>
                  {canSeeFinancials && <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(v.totalCost)}</td>}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(v.advertised_price)}</td>
                  {canSeeFinancials && <td className={`px-4 py-3 text-right font-semibold ${v.profit >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(v.profit)}</td>}
                  {canSeeFinancials && (
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold ${v.margin >= (settings?.goal_min_margin || 12) ? 'text-success-600' : 'text-warning-600'}`}>{formatPercent(v.margin)}</span>
                    </td>
                  )}
                  <td className="px-4 py-3"><span className={`badge ${VEHICLE_STATUS_COLORS[v.status]}`}>{VEHICLE_STATUS_LABELS[v.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
