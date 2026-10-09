import { Link } from 'react-router-dom';
import { MessageCircle, Eye, Gauge, Fuel, Settings2, Calendar, Car } from 'lucide-react';
import type { Vehicle } from '@/types';
import { formatCurrency, formatNumber, vehicleTitle, vehicleYear, VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, generateWhatsAppLink } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface VehicleCardProps {
  vehicle: Vehicle;
  whatsappPhone?: string;
}

export function VehicleCard({ vehicle, whatsappPhone = '' }: VehicleCardProps) {
  const photo = vehicle.main_photo || vehicle.photos?.[0] || '';
  const waLink = generateWhatsAppLink(
    whatsappPhone,
    `Olá, tenho interesse no veículo ${vehicleTitle(vehicle)} ${vehicleYear(vehicle)}. Gostaria de mais informações.`
  );

  const getPriceIndicator = () => {
    if (vehicle.advertised_price <= 0) return 'Verificar preço';
    if (vehicle.min_price > 0 && vehicle.min_price < vehicle.advertised_price) {
      return `A partir de ${formatCurrency(vehicle.min_price)}`;
    }
    return `À vista ${formatCurrency(vehicle.advertised_price)}`;
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-accent-400/70 hover:shadow-accent-400/20">
      <Link to={`/veiculo/${vehicle.id}`} className="relative block aspect-[4/3] overflow-hidden bg-neutral-800">
        {photo ? (
          <img
            src={photo}
            alt={vehicleTitle(vehicle)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
            <Car className="h-16 w-16 text-neutral-700" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-3 left-3">
          <Badge className={`${VEHICLE_STATUS_COLORS[vehicle.status]} ring-2 ring-black/40`}>
            {VEHICLE_STATUS_LABELS[vehicle.status]}
          </Badge>
        </div>
        {vehicle.photos && vehicle.photos.length > 1 && (
          <div className="absolute right-3 bottom-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-accent-400 ring-1 ring-accent-400/40">
            {vehicle.photos.length} fotos
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-accent-400 uppercase">{vehicle.brand}</span>
          <span className="text-xs font-semibold text-neutral-400">{vehicleYear(vehicle)}</span>
        </div>
        
        <Link to={`/veiculo/${vehicle.id}`}>
          <h3 className="line-clamp-1 text-lg font-black text-white uppercase italic group-hover:text-accent-400">
            {vehicleTitle(vehicle)}
          </h3>
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-neutral-600" />
            {formatNumber(vehicle.mileage)} km
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5 text-neutral-600" />
            {vehicle.fuel || '-'}
          </span>
          <span className="flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5 text-neutral-600" />
            {vehicle.transmission || '-'}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-neutral-600" />
            {vehicle.color || '-'}
          </span>
        </div>

        <div className="mt-4 flex-1 border-t border-neutral-800 pt-3">
          <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Preço</p>
          <p className="text-2xl font-black text-accent-400">
            {vehicle.advertised_price > 0 ? formatCurrency(vehicle.advertised_price) : 'Por negociação'}
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            to={`/veiculo/${vehicle.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-neutral-700 bg-transparent py-2.5 text-xs font-black text-white uppercase transition-all hover:border-accent-400 hover:text-accent-400 active:scale-95"
          >
            <Eye className="h-4 w-4" /> Detalhes
          </Link>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-success-500 py-2.5 text-xs font-black text-white uppercase shadow-md transition-all hover:bg-success-600 active:scale-95"
          >
            <MessageCircle className="h-4 w-4" /> Zap
          </a>
        </div>
      </div>
    </div>
  );
}
