import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Car, Eye, Pencil, Trash2, CalendarCheck, CalendarX, ShoppingCart } from 'lucide-react';
import { getAll, remove, update } from '@/lib/firestore';
import type { Vehicle, VehicleSale } from '@/types';
import {
  VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, vehicleTitle, vehicleYear,
  formatCurrency, formatNumber, formatDate, exportToCSV,
} from '@/lib/utils';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { FilterBar, SelectField, SearchInput } from '@/components/ui/FilterBar';
import { useAuth } from '@/context/AuthContext';

export function VehiclesList() {
  const { hasRole, profile, user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  useEffect(() => {
    async function load() {
      const all = await getAll<Vehicle>('vehicles');
      all.sort((a, b) => {
        const da = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
        const db = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
        return db - da;
      });
      setVehicles(all);
      setSales(await getAll<VehicleSale>('vehicle_sales'));
      setLoading(false);
    }
    load();
  }, []);

  const brands = useMemo(() => [...new Set(vehicles.map((v) => v.brand))].sort(), [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter && v.status !== statusFilter) return false;
      if (brandFilter && v.brand !== brandFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.version?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [vehicles, search, statusFilter, brandFilter]);

  function handleExport() {
    const withCost = hasRole('admin', 'gerente');
    const headers = ['Marca', 'Modelo', 'Versão', 'Ano', 'KM', 'Cor', 'Placa', 'Status', 'Preço'];
    if (withCost) headers.push('Custo');
    headers.push('Entrada');
    exportToCSV('veiculos.csv', headers,
      filtered.map((v) => {
        const row: (string | number)[] = [v.brand, v.model, v.version, vehicleYear(v), v.mileage, v.color, v.plate, VEHICLE_STATUS_LABELS[v.status], v.advertised_price];
        if (withCost) row.push(v.total_cost);
        row.push(formatDate(v.entry_date));
        return row;
      })
    );
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    await remove('vehicles', id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }

  // Venda mais recente por veículo (para exibir "Vendido por" no card).
  const saleByVehicle = useMemo(() => {
    const map: Record<string, VehicleSale> = {};
    for (const s of sales) {
      const prev = map[s.vehicle_id];
      if (!prev || new Date(s.sale_date).getTime() > new Date(prev.sale_date).getTime()) {
        map[s.vehicle_id] = s;
      }
    }
    return map;
  }, [sales]);

  // Exportação de CSV restrita a admin e gerente.
  const canExport = hasRole('admin', 'gerente');
  // Permissões: admin e gerente editam/excluem; os demais perfis apenas reservam.
  const canEdit = hasRole('admin', 'gerente');
  // Custos, margem e lucro ficam visíveis apenas para admin, gerente e financeiro.
  const canSeeFinancials = hasRole('admin', 'gerente', 'financeiro');
  const isReservable = (v: Vehicle) => v.status === 'disponivel' || v.status === 'anunciado';
  // Remover reserva: apenas admin, gerente ou o próprio vendedor que reservou.
  const canUnreserve = (v: Vehicle) =>
    v.status === 'reservado' && (canEdit || (!!user && v.reserved_by === user.uid));

  async function handleReserve(v: Vehicle) {
    if (!confirm(`Reservar o veículo ${vehicleTitle(v)}?`)) return;
    await update<Vehicle>('vehicles', v.id, {
      status: 'reservado',
      reserved_by: user?.uid || null,
      reserved_by_name: profile?.name || user?.displayName || 'Usuário',
      reserved_at: new Date().toISOString(),
      reserved_prev_status: v.status,
    });
    setVehicles((prev) => prev.map((x) => (x.id === v.id
      ? { ...x, status: 'reservado', reserved_by: user?.uid || null, reserved_by_name: profile?.name || user?.displayName || 'Usuário', reserved_at: new Date().toISOString(), reserved_prev_status: v.status }
      : x)));
  }

  async function handleUnreserve(v: Vehicle) {
    if (!confirm(`Remover a reserva do veículo ${vehicleTitle(v)}?`)) return;
    const newStatus = v.reserved_prev_status && v.reserved_prev_status !== 'reservado' ? v.reserved_prev_status : 'disponivel';
    await update<Vehicle>('vehicles', v.id, {
      status: newStatus,
      reserved_by: null,
      reserved_by_name: null,
      reserved_at: null,
      reserved_prev_status: null,
    });
    setVehicles((prev) => prev.map((x) => (x.id === v.id
      ? { ...x, status: newStatus, reserved_by: null, reserved_by_name: null, reserved_at: null, reserved_prev_status: null }
      : x)));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Veículos</h2>
          <p className="text-sm text-gray-500">{filtered.length} veículo(s) cadastrado(s)</p>
        </div>
        <div className="flex gap-2">
          {canExport && <button onClick={handleExport} className="btn-outline">Exportar CSV</button>}
          {canEdit && (
            <button onClick={() => navigate('/admin/veiculos/novo')} className="btn-primary">

              <Plus className="h-4 w-4" /> Novo veículo
            </button>
          )}
        </div>
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por marca, modelo, placa..." className="flex-1 min-w-[200px]" />
        <SelectField
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Todos os status"
          options={Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <SelectField
          value={brandFilter}
          onChange={setBrandFilter}
          placeholder="Todas as marcas"
          options={brands.map((b) => ({ value: b, label: b }))}
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Car className="h-16 w-16" />}
          title="Nenhum veículo encontrado"
          description="Cadastre seu primeiro veículo ou ajuste os filtros."
          action={canEdit ? <button onClick={() => navigate('/admin/veiculos/novo')} className="btn-primary"><Plus className="h-4 w-4" /> Cadastrar veículo</button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <div key={v.id} className="card-hover overflow-hidden">
              <div className="relative aspect-[4/3] bg-gray-100">
                {v.main_photo || v.photos?.[0] ? (
                  <img src={v.main_photo || v.photos[0]} alt={vehicleTitle(v)} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Car className="h-12 w-12 text-gray-300" /></div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`badge ${VEHICLE_STATUS_COLORS[v.status]}`}>{VEHICLE_STATUS_LABELS[v.status]}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-gray-900">{vehicleTitle(v)}</h3>
                    <p className="text-xs text-gray-400">{vehicleYear(v)} · {formatNumber(v.mileage)} km · {v.color}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Preço</p>
                    <p className="font-bold text-primary-600">{formatCurrency(v.advertised_price)}</p>
                  </div>
                  {canSeeFinancials && (
                    <div>
                      <p className="text-xs text-gray-400">Custo</p>
                      <p className="text-sm font-medium text-gray-600">{formatCurrency(v.total_cost)}</p>
                    </div>
                  )}
                </div>
                {v.status === 'reservado' && (v.reserved_by_name || v.reserved_by) && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-purple-600">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Reservado por {v.reserved_by_name || 'Usuário'}
                    {v.reserved_at && ` em ${formatDate(v.reserved_at)}`}
                  </p>
                )}
                {(() => {
                  const soldName = v.sold_by_name || saleByVehicle[v.id]?.salesperson_name || null;
                  const soldDate = saleByVehicle[v.id]?.sale_date || v.sale_date || null;
                  return v.status === 'vendido' && soldName && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-success-600">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Vendido por {soldName}
                      {soldDate && ` em ${formatDate(soldDate)}`}
                    </p>
                  );
                })()}
                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                  <Link to={`/admin/veiculos/${v.id}`} className="btn-outline flex-1 !py-2 text-xs"><Eye className="h-4 w-4" /> Ver</Link>
                  {canEdit ? (
                    <>
                      <Link to={`/admin/veiculos/${v.id}/editar`} className="btn-secondary !py-2 text-xs"><Pencil className="h-4 w-4" /></Link>
                      {canUnreserve(v) && (
                        <button
                          onClick={() => handleUnreserve(v)}
                          className="btn-secondary !py-2 text-xs !text-purple-600 hover:!bg-purple-50"
                          title="Remover reserva"
                        >
                          <CalendarX className="h-4 w-4" />
                        </button>
                      )}
                      {hasRole('admin', 'gerente') && (
                        <button onClick={() => handleDelete(v.id)} className="btn-secondary !py-2 text-xs !text-error-600 hover:!bg-error-50"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </>
                  ) : (
                    <>
                      {isReservable(v) && (
                        <button
                          onClick={() => handleReserve(v)}
                          className="btn-secondary flex-1 !py-2 text-xs !text-purple-600 hover:!bg-purple-50"
                          title="Reservar veículo"
                        >
                          <CalendarCheck className="h-4 w-4" /> Reservar
                        </button>
                      )}
                      {canUnreserve(v) && (
                        <button
                          onClick={() => handleUnreserve(v)}
                          className="btn-secondary flex-1 !py-2 text-xs !text-purple-600 hover:!bg-purple-50"
                          title="Remover reserva"
                        >
                          <CalendarX className="h-4 w-4" /> Remover reserva
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
