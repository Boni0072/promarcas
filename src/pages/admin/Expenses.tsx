import { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, Plus, Trash2, Pencil } from 'lucide-react';
import { getAll, create, update, remove } from '@/lib/firestore';
import type { Expense, ExpenseCategory, PaymentStatus } from '@/types';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, formatCurrency, formatDate, isPaymentOverdue, exportToCSV } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FilterBar, SelectField } from '@/components/ui/FilterBar';
import { useAuth } from '@/context/AuthContext';

export function Expenses() {
  const { user, hasRole } = useAuth();
  // Exportação de CSV restrita a admin e gerente.
  const canExport = hasRole('admin', 'gerente');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ category: 'outros' as ExpenseCategory, description: '', amount: 0, payment_method: '', status: 'pendente' as PaymentStatus, due_date: '', paid_date: '' });

  useEffect(() => {
    async function load() {
      setExpenses(await getAll<Expense>('expenses'));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = expenses;
    if (catFilter) r = r.filter((e) => e.category === catFilter);
    if (statusFilter) r = r.filter((e) => e.status === statusFilter);
    return r.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, catFilter, statusFilter]);

  const totalPaid = expenses.filter((e) => e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const totalPending = expenses.filter((e) => e.status === 'pendente').reduce((s, e) => s + e.amount, 0);
  const totalOverdue = expenses.filter((e) => isPaymentOverdue(e.due_date, e.status)).reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => { const m: Record<string, number> = {}; expenses.forEach((e) => { m[e.category] = (m[e.category] || 0) + e.amount; }); return m; }, [expenses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...form, amount: parseFloat(String(form.amount)) || 0, date: new Date().toISOString().split('T')[0], created_by: user?.uid || null };
    if (editId) {
      await update('expenses', editId, data);
    } else {
      await create('expenses', data);
      await create('cash_flow', { type: 'despesa', category: form.category, description: form.description, amount: data.amount, status: form.status, date: data.date, due_date: form.due_date || null, paid_date: form.paid_date || null, created_by: user?.uid || null });
    }
    setShowModal(false);
    setEditId(null);
    setForm({ category: 'outros', description: '', amount: 0, payment_method: '', status: 'pendente', due_date: '', paid_date: '' });
    setExpenses(await getAll<Expense>('expenses'));
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta despesa?')) return;
    await remove('expenses', id);
    setExpenses(await getAll<Expense>('expenses'));
  }

  function startEdit(e: Expense) {
    setEditId(e.id);
    setForm({ category: e.category, description: e.description, amount: e.amount, payment_method: e.payment_method, status: e.status, due_date: e.due_date || '', paid_date: e.paid_date || '' });
    setShowModal(true);
  }

  function handleExport() {
    exportToCSV('despesas.csv', ['Data', 'Categoria', 'Descrição', 'Valor', 'Status', 'Vencimento'],
      filtered.map((e) => [formatDate(e.date), EXPENSE_CATEGORY_LABELS[e.category], e.description, e.amount, PAYMENT_STATUS_LABELS[e.status], formatDate(e.due_date)]));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Despesas</h2><p className="text-sm text-gray-500">Despesas operacionais da empresa</p></div>
        <div className="flex gap-2">
          {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
          <button onClick={() => { setEditId(null); setForm({ category: 'outros', description: '', amount: 0, payment_method: '', status: 'pendente', due_date: '', paid_date: '' }); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Nova despesa</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Pago" value={formatCurrency(totalPaid)} icon={ArrowLeftRight} color="success" />
        <StatCard title="Pendente" value={formatCurrency(totalPending)} icon={ArrowLeftRight} color="warning" />
        <StatCard title="Vencido" value={formatCurrency(totalOverdue)} icon={ArrowLeftRight} color="error" />
        <StatCard title="Categorias" value={Object.keys(byCategory).length} icon={ArrowLeftRight} color="primary" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Object.entries(byCategory).map(([cat, total]) => (
          <div key={cat} className="card p-3"><p className="text-xs text-gray-400">{EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory] || cat}</p><p className="text-sm font-bold text-gray-900">{formatCurrency(total)}</p></div>
        ))}
      </div>

      <FilterBar>
        <SelectField value={catFilter} onChange={setCatFilter} placeholder="Todas as categorias" options={Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        <SelectField value={statusFilter} onChange={setStatusFilter} placeholder="Todos os status" options={Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight className="h-16 w-16" />} title="Nenhuma despesa registrada" />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Categoria</th><th className="px-4 py-3 font-medium">Descrição</th><th className="px-4 py-3 font-medium text-right">Valor</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Vencimento</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((e) => {
                const overdue = isPaymentOverdue(e.due_date, e.status);
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{formatDate(e.date)}</td>
                    <td className="px-4 py-3"><Badge className="bg-gray-100 text-gray-700">{EXPENSE_CATEGORY_LABELS[e.category]}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{e.description || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3"><span className={`badge ${overdue ? 'bg-error-100 text-error-700' : PAYMENT_STATUS_COLORS[e.status]}`}>{overdue ? 'Vencido' : PAYMENT_STATUS_LABELS[e.status]}</span></td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(e.due_date)}</td>
                    <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => startEdit(e)} className="text-gray-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button><button onClick={() => handleDelete(e.id)} className="text-error-500 hover:text-error-700"><Trash2 className="h-4 w-4" /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Editar Despesa' : 'Nova Despesa'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Categoria</label><select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>{Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label">Valor (R$) *</label><input type="number" step="0.01" className="input-field" required value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div><label className="label">Descrição</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Forma de Pagamento</label><input className="input-field" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div>
            <div><label className="label">Status</label><select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PaymentStatus })}>{Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label">Vencimento</label><input type="date" className="input-field" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><label className="label">Data Pagamento</label><input type="date" className="input-field" value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} /></div>
          </div>
          <button type="submit" className="btn-primary w-full">{editId ? 'Salvar' : 'Adicionar'}</button>
        </form>
      </Modal>
    </div>
  );
}
