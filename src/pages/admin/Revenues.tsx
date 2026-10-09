import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Plus, Trash2, Pencil } from 'lucide-react';
import { getAll, create, update, remove } from '@/lib/firestore';
import type { Revenue, RevenueCategory, PaymentStatus, Vehicle } from '@/types';
import { REVENUE_CATEGORY_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, formatCurrency, formatDate, isPaymentOverdue, vehicleTitle, exportToCSV } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FilterBar, SelectField } from '@/components/ui/FilterBar';
import { useAuth } from '@/context/AuthContext';

export function Revenues() {
  const { user, hasRole } = useAuth();
  // Exportação de CSV restrita a admin e gerente.
  const canExport = hasRole('admin', 'gerente');
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('');
  const [form, setForm] = useState({ category: 'outros' as RevenueCategory, description: '', amount: 0, vehicle_id: '', payment_method: '', status: 'pago' as PaymentStatus, due_date: '', received_date: '' });

  useEffect(() => {
    async function load() {
      setRevenues(await getAll<Revenue>('revenues'));
      setVehicles(await getAll<Vehicle>('vehicles'));
      setLoading(false);
    }
    load();
  }, []);

  const vehicleMap = useMemo(() => { const m: Record<string, Vehicle> = {}; vehicles.forEach((v) => { m[v.id] = v; }); return m; }, [vehicles]);
  const filtered = useMemo(() => {
    let r = revenues;
    if (catFilter) r = r.filter((e) => e.category === catFilter);
    return r.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [revenues, catFilter]);

  const totalReceived = revenues.filter((e) => e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const totalPending = revenues.filter((e) => e.status === 'pendente').reduce((s, e) => s + e.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...form, amount: parseFloat(String(form.amount)) || 0, vehicle_id: form.vehicle_id || null, date: new Date().toISOString().split('T')[0], created_by: user?.uid || null };
    if (editId) {
      await update('revenues', editId, data);
    } else {
      await create('revenues', data);
      await create('cash_flow', { type: 'receita', category: form.category, description: form.description, amount: data.amount, vehicle_id: form.vehicle_id || null, status: form.status, date: data.date, due_date: form.due_date || null, paid_date: form.received_date || null, created_by: user?.uid || null });
    }
    setShowModal(false);
    setEditId(null);
    setForm({ category: 'outros', description: '', amount: 0, vehicle_id: '', payment_method: '', status: 'pago', due_date: '', received_date: '' });
    setRevenues(await getAll<Revenue>('revenues'));
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta receita?')) return;
    await remove('revenues', id);
    setRevenues(await getAll<Revenue>('revenues'));
  }

  function startEdit(r: Revenue) {
    setEditId(r.id);
    setForm({ category: r.category, description: r.description, amount: r.amount, vehicle_id: r.vehicle_id || '', payment_method: r.payment_method, status: r.status, due_date: r.due_date || '', received_date: r.received_date || '' });
    setShowModal(true);
  }

  function handleExport() {
    exportToCSV('receitas.csv', ['Data', 'Categoria', 'Descrição', 'Veículo', 'Valor', 'Status'],
      filtered.map((r) => [formatDate(r.date), REVENUE_CATEGORY_LABELS[r.category], r.description, r.vehicle_id ? vehicleTitle(vehicleMap[r.vehicle_id] || { brand: '', model: '' }) : '-', r.amount, PAYMENT_STATUS_LABELS[r.status]]));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Receitas</h2><p className="text-sm text-gray-500">Receitas da empresa</p></div>
        <div className="flex gap-2">
          {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
          <button onClick={() => { setEditId(null); setForm({ category: 'outros', description: '', amount: 0, vehicle_id: '', payment_method: '', status: 'pago', due_date: '', received_date: '' }); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Nova receita</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard title="Recebido" value={formatCurrency(totalReceived)} icon={TrendingUp} color="success" />
        <StatCard title="Pendente" value={formatCurrency(totalPending)} icon={TrendingUp} color="warning" />
        <StatCard title="Total" value={formatCurrency(totalReceived + totalPending)} icon={TrendingUp} color="primary" />
      </div>

      <FilterBar>
        <SelectField value={catFilter} onChange={setCatFilter} placeholder="Todas as categorias" options={Object.entries(REVENUE_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState icon={<TrendingUp className="h-16 w-16" />} title="Nenhuma receita registrada" />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Categoria</th><th className="px-4 py-3 font-medium">Descrição</th><th className="px-4 py-3 font-medium">Veículo</th><th className="px-4 py-3 font-medium text-right">Valor</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(r.date)}</td>
                  <td className="px-4 py-3"><Badge className="bg-gray-100 text-gray-700">{REVENUE_CATEGORY_LABELS[r.category]}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{r.description || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.vehicle_id ? <Link to={`/admin/veiculos/${r.vehicle_id}`} className="hover:text-primary-600">{vehicleTitle(vehicleMap[r.vehicle_id] || { brand: '', model: '' })}</Link> : '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-success-600">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3"><span className={`badge ${PAYMENT_STATUS_COLORS[r.status]}`}>{PAYMENT_STATUS_LABELS[r.status]}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => startEdit(r)} className="text-gray-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button><button onClick={() => handleDelete(r.id)} className="text-error-500 hover:text-error-700"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Editar Receita' : 'Nova Receita'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Categoria</label><select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RevenueCategory })}>{Object.entries(REVENUE_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label">Valor (R$) *</label><input type="number" step="0.01" className="input-field" required value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div><label className="label">Descrição</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Veículo relacionado</label><select className="input-field" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}><option value="">Nenhum</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleTitle(v)}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Status</label><select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PaymentStatus })}>{Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label">Forma de Pagamento</label><input className="input-field" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div>
          </div>
          <button type="submit" className="btn-primary w-full">{editId ? 'Salvar' : 'Adicionar'}</button>
        </form>
      </Modal>
    </div>
  );
}
