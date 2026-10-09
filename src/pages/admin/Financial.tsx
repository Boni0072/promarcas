import { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { getAll } from '@/lib/firestore';
import type { CashFlowEntry, PaymentStatus } from '@/types';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, formatCurrency, formatDate, isPaymentOverdue, exportToCSV } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { FilterBar, SelectField } from '@/components/ui/FilterBar';
import { useAuth } from '@/context/AuthContext';

export function Financial() {
  // Exportação de CSV restrita a admin e gerente.
  const { hasRole } = useAuth();
  const canExport = hasRole('admin', 'gerente');
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    async function load() {
      setEntries(await getAll<CashFlowEntry>('cash_flow'));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = entries;
    if (typeFilter) r = r.filter((e) => e.type === typeFilter);
    return r.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, typeFilter]);

  const contasReceber = entries.filter((e) => e.type === 'receita' && (e.status === 'pendente' || e.status === 'vencido')).reduce((s, e) => s + e.amount, 0);
  const contasPagar = entries.filter((e) => e.type === 'despesa' && (e.status === 'pendente' || e.status === 'vencido')).reduce((s, e) => s + e.amount, 0);
  const recebido = entries.filter((e) => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const pago = entries.filter((e) => e.type === 'despesa' && e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const saldo = recebido - pago;
  const saldoPrevisto = recebido + contasReceber - pago - contasPagar;

  function handleExport() {
    exportToCSV('fluxo_caixa.csv', ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Status', 'Vencimento'],
      filtered.map((e) => [formatDate(e.date), e.type, e.category, e.description, e.amount, PAYMENT_STATUS_LABELS[e.status], formatDate(e.due_date)]));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Fluxo de Caixa</h2><p className="text-sm text-gray-500">{entries.length} lançamento(s)</p></div>
        {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Contas a Receber" value={formatCurrency(contasReceber)} icon={TrendingUp} color="success" />
        <StatCard title="Contas a Pagar" value={formatCurrency(contasPagar)} icon={TrendingDown} color="error" />
        <StatCard title="Saldo Atual" value={formatCurrency(saldo)} icon={Wallet} color={saldo >= 0 ? 'success' : 'error'} />
        <StatCard title="Saldo Previsto" value={formatCurrency(saldoPrevisto)} icon={DollarSign} color={saldoPrevisto >= 0 ? 'primary' : 'error'} />
      </div>

      <FilterBar>
        <SelectField value={typeFilter} onChange={setTypeFilter} placeholder="Todos os tipos"
          options={[{ value: 'receita', label: 'Receitas' }, { value: 'despesa', label: 'Despesas' }]} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState icon={<Wallet className="h-16 w-16" />} title="Nenhum lançamento no fluxo de caixa" description="Lançamentos são criados automaticamente ao registrar vendas, receitas e despesas." />
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-400"><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Descrição</th><th className="px-4 py-3 font-medium text-right">Valor</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Vencimento</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((e) => {
                const overdue = isPaymentOverdue(e.due_date, e.status);
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{formatDate(e.date)}</td>
                    <td className="px-4 py-3"><span className={`badge ${e.type === 'receita' ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'}`}>{e.type === 'receita' ? 'Receita' : 'Despesa'}</span></td>
                    <td className="px-4 py-3 text-gray-600">{e.description || e.category}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${e.type === 'receita' ? 'text-success-600' : 'text-error-600'}`}>{e.type === 'receita' ? '+' : '-'}{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3"><span className={`badge ${overdue ? 'bg-error-100 text-error-700' : PAYMENT_STATUS_COLORS[e.status as PaymentStatus]}`}>{overdue ? 'Vencido' : PAYMENT_STATUS_LABELS[e.status as PaymentStatus]}</span></td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(e.due_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
