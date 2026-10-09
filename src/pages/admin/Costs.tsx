import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, Plus, Trash2 } from 'lucide-react';
import { getAll, getByField, create, remove } from '@/lib/firestore';
import type { Vehicle, VehicleCost, CostCategory } from '@/types';
import { COST_CATEGORY_LABELS, formatCurrency, formatDate, vehicleTitle, exportToCSV } from '@/lib/utils';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FilterBar, SelectField } from '@/components/ui/FilterBar';
import { useAuth } from '@/context/AuthContext';

export function Costs() {
  const { user, hasRole } = useAuth();
  // Custos ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  // Exportação de CSV restrita a admin e gerente.
  const canExport = hasRole('admin', 'gerente');
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [form, setForm] = useState({ vehicle_id: '', category: 'outros' as CostCategory, description: '', amount: 0, supplier: '', responsible: '', notes: '' });

  useEffect(() => {
    async function load() {
      setCosts(await getAll<VehicleCost>('vehicle_costs'));
      setVehicles(await getAll<Vehicle>('vehicles'));
      setLoading(false);
    }
    load();
  }, []);

  const vehicleMap = useMemo(() => {
    const m: Record<string, Vehicle> = {};
    vehicles.forEach((v) => { m[v.id] = v; });
    return m;
  }, [vehicles]);

  const filtered = useMemo(() => {
    let result = costs;
    if (catFilter) result = result.filter((c) => c.category === catFilter);
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [costs, catFilter]);

  const totalByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of costs) { m[c.category] = (m[c.category] || 0) + c.amount; }
    return m;
  }, [costs]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicle_id) return;
    await create('vehicle_costs', {
      ...form,
      amount: parseFloat(String(form.amount)) || 0,
      date: new Date().toISOString().split('T')[0],
      created_by: user?.uid || null,
    });
    setShowModal(false);
    setForm({ vehicle_id: '', category: 'outros', description: '', amount: 0, supplier: '', responsible: '', notes: '' });
    setCosts(await getAll<VehicleCost>('vehicle_costs'));
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este custo?')) return;
    await remove('vehicle_costs', id);
    setCosts(await getAll<VehicleCost>('vehicle_costs'));
  }

  function handleExport() {
    exportToCSV('custos.csv', ['Veículo', 'Data', 'Categoria', 'Descrição', 'Fornecedor', 'Valor'],
      filtered.map((c) => [vehicleTitle(vehicleMap[c.vehicle_id] || { brand: '', model: '' }), formatDate(c.date), COST_CATEGORY_LABELS[c.category], c.description, c.supplier, c.amount]));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Custos por Veículo</h2>
          {canSeeFinancials && <p className="text-sm text-gray-500">Total: {formatCurrency(costs.reduce((s, c) => s + c.amount, 0))}</p>}
        </div>
        <div className="flex gap-2">
          {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
          {canSeeFinancials && (
            <button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Adicionar custo</button>
          )}
        </div>
      </div>

      {canSeeFinancials && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(totalByCategory).slice(0, 6).map(([cat, total]) => (
            <div key={cat} className="card p-3">
              <p className="text-xs text-gray-400">{COST_CATEGORY_LABELS[cat as CostCategory] || cat}</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>
          ))}
        </div>
      )}

      <FilterBar>
        <SelectField value={catFilter} onChange={setCatFilter} placeholder="Todas as categorias"
          options={Object.entries(COST_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState icon={<Receipt className="h-16 w-16" />} title="Nenhum custo registrado" />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="px-4 py-3 font-medium">Veículo</th><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Categoria</th><th className="px-4 py-3 font-medium">Descrição</th>{canSeeFinancials && <th className="px-4 py-3 font-medium text-right">Valor</th>}<th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><Link to={`/admin/veiculos/${c.vehicle_id}`} className="font-medium text-gray-900 hover:text-primary-600">{vehicleTitle(vehicleMap[c.vehicle_id] || { brand: '', model: '' })}</Link></td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(c.date)}</td>
                  <td className="px-4 py-3"><Badge className="bg-gray-100 text-gray-700">{COST_CATEGORY_LABELS[c.category]}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{c.description || '-'}</td>
                  {canSeeFinancials && <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(c.amount)}</td>}
                  <td className="px-4 py-3">{canSeeFinancials && <button onClick={() => handleDelete(c.id)} className="text-error-500 hover:text-error-700"><Trash2 className="h-4 w-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Adicionar Custo">
        <form onSubmit={handleAdd} className="space-y-4">
          <div><label className="label">Veículo *</label><select className="input-field" required value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}><option value="">Selecione</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleTitle(v)} — {v.plate}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Categoria</label><select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CostCategory })}>{Object.entries(COST_CATEGORY_LABELS).filter(([v]) => v !== 'compra').map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label">Valor (R$) *</label><input type="number" step="0.01" className="input-field" required value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div><label className="label">Descrição</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Fornecedor</label><input className="input-field" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
            <div><label className="label">Responsável</label><input className="input-field" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></div>
          </div>
          <button type="submit" className="btn-primary w-full">Adicionar</button>
        </form>
      </Modal>
    </div>
  );
}
