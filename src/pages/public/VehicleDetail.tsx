import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MessageCircle, Phone, Gauge, Fuel, Settings2, Calendar, DoorOpen, Palette, Tag, CheckCircle2, Car } from 'lucide-react';
import { getAll, getById } from '@/lib/firestore';
import type { Vehicle, Settings } from '@/types';
import { formatCurrency, formatNumber, vehicleTitle, vehicleYear, VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, generateWhatsAppLink } from '@/lib/utils';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const v = await getById<Vehicle>('vehicles', id);
      setVehicle(v);
      const allS = await getAll<Settings>('settings');
      setSettings(allS[0] || null);
      setLoading(false);
    }
    load();
  }, [id]);

  const photos = useMemo(() => {
    if (!vehicle) return [];
    const all = vehicle.main_photo ? [vehicle.main_photo, ...(vehicle.photos || [])] : vehicle.photos || [];
    return [...new Set(all)];
  }, [vehicle]);

  if (loading) return <LoadingState />;

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <EmptyState icon={<Car className="h-16 w-16" />} title="Veículo não encontrado" description="O veículo que você procura não está mais disponível." action={<Link to="/" className="btn-primary">Voltar à vitrine</Link>} />
        </div>
      </div>
    );
  }

  const whatsapp = settings?.company_whatsapp || '';
  const waLink = generateWhatsAppLink(whatsapp, `Olá, tenho interesse no veículo ${vehicleTitle(vehicle)} ${vehicleYear(vehicle)}. Gostaria de mais informações.`);

  const specs = [
    { icon: Calendar, label: 'Ano', value: vehicleYear(vehicle) },
    { icon: Gauge, label: 'KM', value: `${formatNumber(vehicle.mileage)} km` },
    { icon: Fuel, label: 'Combustível', value: vehicle.fuel || '-' },
    { icon: Settings2, label: 'Câmbio', value: vehicle.transmission || '-' },
    { icon: Palette, label: 'Cor', value: vehicle.color || '-' },
    { icon: DoorOpen, label: 'Portas', value: vehicle.doors ? `${vehicle.doors} portas` : '-' },
    { icon: Tag, label: 'Final placa', value: vehicle.plate_last_digit || '-' },
    { icon: Car, label: 'Carroceria', value: vehicle.body_type || '-' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/Promarcas logos.png" alt="PRÓMARCAS MOTORS" className="h-12 w-auto" />
          </Link>
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-primary-600">Voltar à vitrine</Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-200">
              {photos[activePhoto] ? (
                <img src={photos[activePhoto]} alt={vehicleTitle(vehicle)} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><Car className="h-24 w-24 text-gray-300" /></div>
              )}
              <div className="absolute top-4 left-4">
                <span className={`badge ${VEHICLE_STATUS_COLORS[vehicle.status]}`}>{VEHICLE_STATUS_LABELS[vehicle.status]}</span>
              </div>
            </div>
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {photos.map((p, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)} className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${activePhoto === i ? 'border-primary-600' : 'border-transparent'}`}>
                    <img src={p} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-400">{vehicle.brand}</p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{vehicleTitle(vehicle)}</h1>
            <p className="mt-1 text-sm text-gray-500">{vehicleYear(vehicle)} · {formatNumber(vehicle.mileage)} km</p>

            <div className="mt-6 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white">
              <p className="text-sm text-primary-100">Preço à vista</p>
              <p className="text-3xl font-bold">{formatCurrency(vehicle.advertised_price)}</p>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-success-500 px-6 py-3 font-semibold text-white transition hover:bg-success-600">
                <MessageCircle className="h-5 w-5" /> Tenho interesse neste veículo
              </a>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {specs.map((s, i) => (
                <div key={i} className="card p-3 text-center">
                  <s.icon className="mx-auto h-5 w-5 text-gray-400" />
                  <p className="mt-1.5 text-xs text-gray-400">{s.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>

            {vehicle.features && vehicle.features.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900">Itens e opcionais</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {vehicle.features.map((f, i) => (
                    <Badge key={i} className="bg-primary-50 text-primary-700"><CheckCircle2 className="mr-1 h-3 w-3" /> {f}</Badge>
                  ))}
                </div>
              </div>
            )}

            {vehicle.description && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900">Descrição</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{vehicle.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          {settings?.company_phone && (
            <a href={`tel:${settings.company_phone}`} className="btn-outline"><Phone className="h-4 w-4" /> {settings.company_phone}</a>
          )}
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-success"><MessageCircle className="h-5 w-5" /> Falar no WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
