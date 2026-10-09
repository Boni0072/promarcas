import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, DollarSign } from 'lucide-react';
import { getAll } from '@/lib/firestore';
import type { VehicleSale, Vehicle } from '@/types';
import { formatCurrency, formatDate, vehicleTitle, exportToCSV } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { useAuth } from '@/context/AuthContext';

export function Commissions() {
  // Exportação de CSV restrita a admin e gerente.
  const { hasRole } = useAuth();
  const canExport = hasRole('admin', 'gerente');
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setSales(await getAll<VehicleSale>('vehicle_sales'));
      setVehicles(await getAll<Vehicle>('vehicles'));
      setLoading(false);
    }
    load();
  }, []);

  const vehicleMap = useMemo(() => { const m: Record<string, Vehicle> = {}; vehicles.forEach((v) => { m[v.id] = v; }); return m; }, [vehicles]);

  const withCommission = useMemo(() => sales.filter((s) => s.commission_value > 0).sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()), [sales]);

  const bySalesperson = useMemo(() => {
    const m: Record<string, { name: string; total: number; count: number }> = {};
    for (const s of withCommission) {
      const name = s.salesperson_name || 'Não informado';
      if (!m[name]) m[name] = { name, total: 0, count: 0 };
      m[name].total += s.commission_value;
      m[name].count++;
    }
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [withCommission]);

  const totalCommissions = withCommission.reduce((s, x) => s + x.commission_value, 0);

  function handleExport() {
    exportToCSV('comissoes.csv', ['Vendedor', 'Veículo', 'Data', 'Venda', 'Comissão %', 'Comissão R$'],
      withCommission.map((s) => [s.salesperson_name, vehicleTitle(vehicleMap[s.vehicle_id] || { brand: '', model: '' }), formatDate(s.sale_date), s.sale_price, s.commission_pct, s.commission_value]));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Comissões</h2><p className="text-sm text-gray-500">{withCommission.length} comissão(ões) registrada(s)</p></div>
        {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard title="Total em Comissões" value={formatCurrency(totalCommissions)} icon={DollarSign} color="primary" />
        <StatCard title="Vendedores" value={bySalesperson.length} icon={Receipt} color="accent" />
        <StatCard title="Comissão Média" value={formatCurrency(withCommission.length > 0 ? totalCommissions / withCommission.length : 0)} icon={Receipt} color="success" />
      </div>

      {bySalesperson.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-gray-900">Comissões por Vendedor</h3>
          <div className="space-y-2">
            {bySalesperson.map((v) => (
              <div key={v.name} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div><p className="font-semibold text-gray-900">{v.name}</p><p className="text-xs text-gray-400">{v.count} venda(s)</p></div>
                <p className="font-bold text-primary-600">{formatCurrency(v.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {withCommission.length === 0 ? (
        <EmptyState icon={<Receipt className="h-16 w-16" />} title="Nenhuma comissão registrada" description="Comissões aparecem aqui quando vendas com percentual de comissão são registradas." />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="px-4 py-3 font-medium">Vendedor</th><th className="px-4 py-3 font-medium">Veículo</th><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium text-right">Venda</th><th className="px-4 py-3 font-medium text-right">%</th><th className="px-4 py-3 font-medium text-right">Comissão</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {withCommission.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.salesperson_name || '-'}</td>
                  <td className="px-4 py-3"><Link to={`/admin/veiculos/${s.vehicle_id}`} className="text-gray-600 hover:text-primary-600">{vehicleTitle(vehicleMap[s.vehicle_id] || { brand: '', model: '' })}</Link></td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(s.sale_date)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(s.sale_price)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{s.commission_pct}%</td>
                  <td className="px-4 py-3 text-right font-bold text-primary-600">{formatCurrency(s.commission_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
