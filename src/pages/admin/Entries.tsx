import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, Plus, Eye } from 'lucide-react';
import { getAll, getByField, create, update } from '@/lib/firestore';
import type { Vehicle, VehicleEntry, VehicleStatus, VehicleOrigin } from '@/types';
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, ORIGIN_LABELS, vehicleTitle, formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';

export function Entries() {
  const { user, hasRole } = useAuth();
  // Valor de compra (custo) oculto para o vendedor.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  // Exportação de CSV restrita a admin e gerente.
  const canExport = hasRole('admin', 'gerente');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [entries, setEntries] = useState<(VehicleEntry & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', version: '', plate: '', purchase_value: 0, origin: 'compra_particular' as VehicleOrigin, payment_method: '', responsible: '', documentation: '', notes: '' });

  useEffect(() => {
    async function load() {
      const allE = await getAll<VehicleEntry>('vehicle_entries');
      const allV = await getAll<Vehicle>('vehicles');
      setVehicles(allV);
      setEntries(allE as any);
      setLoading(false);
    }
    load();
  }, []);

  const entriesWithVehicle = useMemo(() => {
    return entries.map((e) => ({ ...e, vehicle: vehicles.find((v) => v.id === e.vehicle_id) }))
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
  }, [entries, vehicles]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const vehicleData: Partial<Vehicle> = {
      brand: form.brand, model: form.model, version: form.version, plate: form.plate,
      purchase_value: form.purchase_value, origin: form.origin,
      status: 'comprado' as VehicleStatus, entry_date: today,
      payment_method: form.payment_method, seller_origin: form.responsible,
      notes: form.notes, total_cost: form.purchase_value,
      mileage: 0, doors: 4, features: [], photos: [],
    };
    const vehicleId = await create('vehicles', vehicleData as any);

    await create('vehicle_entries', {
      vehicle_id: vehicleId,
      entry_date: today,
      purchase_value: form.purchase_value,
      origin: form.origin,
      payment_method: form.payment_method,
      responsible: form.responsible,
      documentation: form.documentation,
      notes: form.notes,
      created_by: user?.uid || null,
    });

    setShowModal(false);
    setForm({ brand: '', model: '', version: '', plate: '', purchase_value: 0, origin: 'compra_particular', payment_method: '', responsible: '', documentation: '', notes: '' });
    const allE = await getAll<VehicleEntry>('vehicle_entries');
    const allV = await getAll<Vehicle>('vehicles');
    setVehicles(allV);
    setEntries(allE as any);
  }

  function handleExport() {
    exportToCSV('entradas.csv', ['Veículo', 'Data', 'Origem', 'Valor', 'Pagamento', 'Responsável'],
      entriesWithVehicle.map((e) => [vehicleTitle(e.vehicle || { brand: '', model: '' }), formatDate(e.entry_date), ORIGIN_LABELS[e.origin] || e.origin, e.purchase_value, e.payment_method, e.responsible]));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Entradas</h2><p className="text-sm text-gray-500">{entries.length} entrada(s) registrada(s)</p></div>
        <div className="flex gap-2">
          {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Nova entrada</button>
        </div>
      </div>

      {entriesWithVehicle.length === 0 ? (
        <EmptyState icon={<ArrowDownToLine className="h-16 w-16" />} title="Nenhuma entrada registrada" description="Registre a entrada de um veículo no estoque." action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Nova entrada</button>} />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="px-4 py-3 font-medium">Veículo</th><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Origem</th>{canSeeFinancials && <th className="px-4 py-3 font-medium text-right">Valor</th>}<th className="px-4 py-3 font-medium">Pagamento</th><th className="px-4 py-3 font-medium">Responsável</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {entriesWithVehicle.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.vehicle ? vehicleTitle(e.vehicle) : 'Veículo removido'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(e.entry_date)}</td>
                  <td className="px-4 py-3"><Badge className="bg-gray-100 text-gray-700">{ORIGIN_LABELS[e.origin] || e.origin}</Badge></td>
                  {canSeeFinancials && <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(e.purchase_value)}</td>}
                  <td className="px-4 py-3 text-gray-600">{e.payment_method || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.responsible || '-'}</td>
                  <td className="px-4 py-3">{e.vehicle && <Link to={`/admin/veiculos/${e.vehicle.id}`} className="text-primary-600 hover:underline text-xs"><Eye className="inline h-3.5 w-3.5" /> Ver</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Entrada de Veículo" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-sm text-gray-500">Ao registrar a entrada, o veículo será automaticamente criado no estoque com status "Comprado".</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Marca *</label><input className="input-field" required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><label className="label">Modelo *</label><input className="input-field" required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><label className="label">Versão</label><input className="input-field" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
            <div><label className="label">Placa</label><input className="input-field uppercase" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} /></div>
            <div><label className="label">Valor de Compra (R$) *</label><input type="number" step="0.01" className="input-field" required value={form.purchase_value || ''} onChange={(e) => setForm({ ...form, purchase_value: parseFloat(e.target.value) || 0 })} /></div>
            <div><label className="label">Origem</label><select className="input-field" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value as VehicleOrigin })}>{Object.entries(ORIGIN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label">Forma de Pagamento</label><input className="input-field" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div>
            <div><label className="label">Responsável</label><input className="input-field" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></div>
          </div>
          <div><label className="label">Documentação</label><input className="input-field" value={form.documentation} onChange={(e) => setForm({ ...form, documentation: e.target.value })} /></div>
          <div><label className="label">Observações</label><textarea className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <button type="submit" className="btn-primary w-full">Registrar entrada</button>
        </form>
      </Modal>
    </div>
  );
}
