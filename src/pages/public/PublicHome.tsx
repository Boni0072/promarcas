import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Car, MessageCircle, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAll } from '@/lib/firestore';
import { DEFAULT_BANNERS } from '@/lib/banners';
import type { Vehicle, Settings, BannerSlide } from '@/types';
import { vehicleTitle, generateWhatsAppLink } from '@/lib/utils';
import { VehicleCard } from '@/components/public/VehicleCard';
import { LoadingState, EmptyState } from '@/components/ui/States';

const PUBLIC_STATUSES = ['disponivel', 'anunciado', 'reservado'];

type SortKey = 'recentes' | 'preco_asc' | 'preco_desc' | 'km_asc' | 'ano_desc';

const BANNER_INTERVAL_MS = 5000;

export function PublicHome() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [fuel, setFuel] = useState('');
  const [sort, setSort] = useState<SortKey>('recentes');
  const [currentSlide, setCurrentSlide] = useState(0);

  const banners: BannerSlide[] = useMemo(() => {
    const configured = settings?.banners ?? [];
    const source = configured.length > 0 ? configured : DEFAULT_BANNERS;
    return source.filter((b) => b.enabled);
  }, [settings]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, BANNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [banners.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  useEffect(() => {
    async function load() {
      const [allVehicles, allSettings] = await Promise.all([
        getAll<Vehicle>('vehicles'),
        getAll<Settings>('settings'),
      ]);
      setVehicles(allVehicles.filter((v) => PUBLIC_STATUSES.includes(v.status)));
      setSettings(allSettings[0] || null);
      setLoading(false);
    }
    load();
  }, []);

  const brands = useMemo(
    () => [...new Set(vehicles.map((v) => v.brand).filter(Boolean))].sort(),
    [vehicles]
  );

  const fuels = useMemo(
    () => [...new Set(vehicles.map((v) => v.fuel).filter(Boolean))].sort(),
    [vehicles]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = vehicles.filter((v) => {
      const matchesSearch =
        !term ||
        vehicleTitle(v).toLowerCase().includes(term) ||
        (v.brand || '').toLowerCase().includes(term) ||
        (v.model || '').toLowerCase().includes(term);
      const matchesBrand = !brand || v.brand === brand;
      const matchesFuel = !fuel || v.fuel === fuel;
      return matchesSearch && matchesBrand && matchesFuel;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'preco_asc':
          return (a.advertised_price || 0) - (b.advertised_price || 0);
        case 'preco_desc':
          return (b.advertised_price || 0) - (a.advertised_price || 0);
        case 'km_asc':
          return (a.mileage || 0) - (b.mileage || 0);
        case 'ano_desc':
          return (b.year_model || 0) - (a.year_model || 0);
        case 'recentes':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return list;
  }, [vehicles, search, brand, fuel, sort]);

  const whatsapp = settings?.company_whatsapp || '';
  const contactLink = generateWhatsAppLink(
    whatsapp,
    'Olá! Vim pelo site e gostaria de falar com um consultor.'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingState message="Carregando veículos..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <img src="/Promarcas%20logos.png" alt="PRÓMARCAS" className="h-12 w-auto object-contain sm:h-16" />
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Encontre o carro dos seus sonhos
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'veículo disponível' : 'veículos disponíveis'} para você
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>

            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="input-field"
            >
              <option value="">Marca</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              className="input-field"
            >
              <option value="">Combustível</option>
              {fuels.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="input-field"
            >
              <option value="recentes">Mais recentes</option>
              <option value="preco_asc">Menor preço</option>
              <option value="preco_desc">Maior preço</option>
              <option value="km_asc">Menor KM</option>
              <option value="ano_desc">Ano mais novo</option>
            </select>
          </div>

          <a
            href={contactLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-success whitespace-nowrap lg:w-auto"
          >
            <MessageCircle className="h-4 w-4" /> Entre em contato
          </a>
        </div>

        {banners.length > 0 && (
        <div className="group relative mb-8 overflow-hidden rounded-2xl shadow-lg">
          <div className="relative h-52 w-full sm:h-60 md:h-64">
            {banners.map((slide, index) => (
              <div
                key={slide.id}
                aria-hidden={index !== currentSlide}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === currentSlide ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                <div className={`relative flex h-full w-full flex-col justify-center bg-gradient-to-r ${slide.gradient} px-6 sm:px-12`}>
                  {slide.image && (
                    <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-24 right-24 h-64 w-64 rounded-full bg-white/5" />
                  <div className="relative max-w-xl">
                    <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                      Destaque
                    </span>
                    <h2 className="text-2xl font-extrabold text-white drop-shadow sm:text-3xl md:text-4xl">
                      {slide.title}
                    </h2>
                    <p className="mt-2 text-sm text-white/90 drop-shadow sm:text-base">
                      {slide.subtitle}
                    </p>
                    <a
                      href={contactLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow transition-transform hover:scale-105"
                    >
                      {slide.cta} <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={prevSlide}
              aria-label="Slide anterior"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Próximo slide"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {banners.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={`Ir para o slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    index === currentSlide ? 'w-7 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Car className="h-16 w-16" />}
            title="Nenhum veículo encontrado"
            description="Tente ajustar os filtros ou volte mais tarde para conferir novidades."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((v) => (
              <VehicleCard key={v.id} vehicle={v} whatsappPhone={whatsapp} />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid grid-cols-3 items-center gap-4 text-sm">
            <p className="text-center text-gray-500 sm:text-left">
              © {new Date().getFullYear()} Todos os direitos reservados.
            </p>
            <a
              href={contactLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 font-semibold text-success-600 hover:text-success-700"
            >
              <MessageCircle className="h-4 w-4" /> Fale conosco no WhatsApp
            </a>
            <Link
              to="/admin"
              className="flex items-center justify-center gap-2 text-gray-500 hover:text-primary-600 sm:justify-end"
            >
              <Lock className="h-4 w-4" /> Área administrativa
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

