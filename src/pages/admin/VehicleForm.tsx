import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { getById, create, update } from '@/lib/firestore';
import type { Vehicle, VehicleStatus, VehicleOrigin } from '@/types';
import { VEHICLE_STATUS_LABELS, ORIGIN_LABELS } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ImageUploader } from '@/components/admin/ImageUploader';

const FUEL_TYPES = ['Flex', 'Gasolina', 'Diesel', 'Etanol', 'Híbrido', 'Elétrico', 'Gás Natural'];
const TRANSMISSION_TYPES = ['Manual', 'Automático', 'Automatizado', 'CVT'];
const BODY_TYPES = ['Sedan', 'Hatch', 'SUV', 'Pickup', 'Minivan', 'Coupe', 'Conversível', 'Perua/Wagon'];
const COLORS = ['Branco', 'Prata', 'Preto', 'Cinza', 'Vermelho', 'Azul', 'Verde', 'Amarelo', 'Marrom', 'Bege', 'Dourado', 'Outra'];

export function VehicleForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, hasRole } = useAuth();
  const isEdit = !!id;

  // Perfis sem permissão de edição não acessam o formulário nem por URL direta.
  const canEdit = hasRole('admin', 'gerente');

  useEffect(() => {
    if (!authLoading && !canEdit) navigate('/admin/veiculos', { replace: true });
  }, [authLoading, canEdit, navigate]);

  // Pasta de destino no Storage. Em edição usa o id do veículo; em novo, gera um id temporário.
  const [folderId] = useState(() => id || `novo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  const [form, setForm] = useState<Partial<Vehicle>>({
    brand: '', model: '', version: '', year_fabrication: new Date().getFullYear(), year_model: new Date().getFullYear(),
    color: '', fuel: '', transmission: '', mileage: 0, doors: 4, body_type: '', plate: '', chassis: '', renavam: '',
    plate_last_digit: '', description: '', photos: [], main_photo: '', features: [],
    purchase_value: 0, advertised_price: 0, min_price: 0, total_cost: 0,
    origin: 'compra_particular', status: 'comprado', entry_date: new Date().toISOString().split('T')[0],
    seller_origin: '', payment_method: '', notes: '',
  });
  const [featuresInput, setFeaturesInput] = useState('');
  const [photosInput, setPhotosInput] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getById<Vehicle>('vehicles', id).then((data) => {
        if (data) {
          setForm(data);
          setFeaturesInput(data.features?.join(', ') || '');
          setPhotosInput(data.photos?.join('\n') || '');
        }
      });
    }
  }, [id]);

  function updateField<K extends keyof Vehicle>(key: K, value: Vehicle[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const urlList = photosInput.split('\n').map((s) => s.trim()).filter(Boolean);

  function addUrl() {
    const url = newUrl.trim();
    if (!url) return;
    // Evita duplicatas
    if (urlList.includes(url)) {
      setNewUrl('');
      return;
    }
    const next = [...urlList, url].join('\n');
    setPhotosInput(next);
    setNewUrl('');
  }

  function removeUrl(url: string) {
    setPhotosInput(urlList.filter((u) => u !== url).join('\n'));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const features = featuresInput.split(',').map((s) => s.trim()).filter(Boolean);
    // Fotos vindas do uploader + URLs coladas manualmente no textarea (sem duplicar)
    const uploadedPhotos = form.photos || [];
    const manualPhotos = photosInput.split('\n').map((s) => s.trim()).filter(Boolean);
    const photos = [...new Set([...uploadedPhotos, ...manualPhotos])];
    const mainPhoto = photos[mainPhotoIndex] || form.main_photo || photos[0] || '';

    const payload: any = {
      ...form,
      features,
      photos,
      main_photo: mainPhoto,
    };

    if (isEdit) {
      await update<Vehicle>('vehicles', id!, payload);
    } else {
      payload.entry_user = user?.uid || null;
      await create('vehicles', payload);
    }

    navigate('/admin/veiculos');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/veiculos')} className="btn-outline !py-2 !px-3">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar Veículo' : 'Novo Veículo'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-5">
          <h3 className="mb-4 font-bold text-gray-900">Dados do Veículo</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className="label">Marca *</label><input className="input-field" required value={form.brand || ''} onChange={(e) => updateField('brand', e.target.value)} placeholder="Ex: Toyota" /></div>
            <div><label className="label">Modelo *</label><input className="input-field" required value={form.model || ''} onChange={(e) => updateField('model', e.target.value)} placeholder="Ex: Corolla" /></div>
            <div><label className="label">Versão</label><input className="input-field" value={form.version || ''} onChange={(e) => updateField('version', e.target.value)} placeholder="Ex: XEi 2.0" /></div>
            <div><label className="label">Ano Fabricação</label><input type="number" className="input-field" value={form.year_fabrication || ''} onChange={(e) => updateField('year_fabrication', parseInt(e.target.value) || null)} /></div>
            <div><label className="label">Ano Modelo</label><input type="number" className="input-field" value={form.year_model || ''} onChange={(e) => updateField('year_model', parseInt(e.target.value) || null)} /></div>
            <div><label className="label">Cor</label><select className="input-field" value={form.color || ''} onChange={(e) => updateField('color', e.target.value)}><option value="">Selecione</option>{COLORS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="label">Combustível</label><select className="input-field" value={form.fuel || ''} onChange={(e) => updateField('fuel', e.target.value)}><option value="">Selecione</option>{FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
            <div><label className="label">Câmbio</label><select className="input-field" value={form.transmission || ''} onChange={(e) => updateField('transmission', e.target.value)}><option value="">Selecione</option>{TRANSMISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="label">Carroceria</label><select className="input-field" value={form.body_type || ''} onChange={(e) => updateField('body_type', e.target.value)}><option value="">Selecione</option>{BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
            <div><label className="label">Quilometragem</label><input type="number" className="input-field" value={form.mileage || 0} onChange={(e) => updateField('mileage', parseInt(e.target.value) || 0)} /></div>
            <div><label className="label">Nº de Portas</label><input type="number" className="input-field" value={form.doors || 4} onChange={(e) => updateField('doors', parseInt(e.target.value) || 4)} /></div>
            <div><label className="label">Final de Placa</label><input className="input-field" maxLength={1} value={form.plate_last_digit || ''} onChange={(e) => updateField('plate_last_digit', e.target.value)} placeholder="Ex: 5" /></div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-bold text-gray-900">Documentação</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label">Placa</label><input className="input-field uppercase" value={form.plate || ''} onChange={(e) => updateField('plate', e.target.value.toUpperCase())} placeholder="ABC1234" /></div>
            <div><label className="label">Chassi</label><input className="input-field" value={form.chassis || ''} onChange={(e) => updateField('chassis', e.target.value)} /></div>
            <div><label className="label">RENAVAM</label><input className="input-field" value={form.renavam || ''} onChange={(e) => updateField('renavam', e.target.value)} /></div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-bold text-gray-900">Origem e Entrada</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className="label">Origem</label><select className="input-field" value={form.origin || ''} onChange={(e) => updateField('origin', e.target.value as VehicleOrigin)}>{Object.entries(ORIGIN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label">Data de Entrada</label><input type="date" className="input-field" value={form.entry_date || ''} onChange={(e) => updateField('entry_date', e.target.value)} /></div>
            <div><label className="label">Status</label><select className="input-field" value={form.status || ''} onChange={(e) => updateField('status', e.target.value as VehicleStatus)}>{Object.entries(VEHICLE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label">Valor de Compra (R$)</label><input type="number" step="0.01" className="input-field" value={form.purchase_value || 0} onChange={(e) => updateField('purchase_value', parseFloat(e.target.value) || 0)} /></div>
            <div><label className="label">Vendedor / Origem</label><input className="input-field" value={form.seller_origin || ''} onChange={(e) => updateField('seller_origin', e.target.value)} placeholder="Nome do vendedor anterior" /></div>
            <div><label className="label">Forma de Pagamento</label><input className="input-field" value={form.payment_method || ''} onChange={(e) => updateField('payment_method', e.target.value)} placeholder="Ex: À vista, Financiado" /></div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-bold text-gray-900">Precificação</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label">Preço Anunciado (R$)</label><input type="number" step="0.01" className="input-field" value={form.advertised_price || 0} onChange={(e) => updateField('advertised_price', parseFloat(e.target.value) || 0)} /></div>
            <div><label className="label">Preço Mínimo (R$)</label><input type="number" step="0.01" className="input-field" value={form.min_price || 0} onChange={(e) => updateField('min_price', parseFloat(e.target.value) || 0)} /></div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-bold text-gray-900">Fotos e Itens</h3>
          <div className="space-y-4">
            <ImageUploader
              value={form.photos || []}
              onChange={(urls) => updateField('photos', urls)}
              folder={`vehicles/${folderId}`}
              mainIndex={mainPhotoIndex}
              onMainChange={setMainPhotoIndex}
            />
            <details className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-gray-600">
                Adicionar fotos por URL (opcional)
              </summary>

              <div className="mt-3 space-y-3">
                {/* Campo + botão para adicionar um link */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="input-field flex-1"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addUrl();
                      }
                    }}
                    placeholder="Cole aqui o link da foto (https://...)"
                  />
                  <button
                    type="button"
                    onClick={addUrl}
                    disabled={!newUrl.trim()}
                    className="btn-primary !py-2 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" /> Adicionar
                  </button>
                </div>

                {/* Lista de links já adicionados */}
                {urlList.length > 0 ? (
                  <ul className="space-y-2">
                    {urlList.map((u, i) => (
                      <li
                        key={`${u}-${i}`}
                        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5"
                      >
                        <img
                          src={u}
                          alt={`Foto ${i + 1}`}
                          className="h-10 w-14 flex-shrink-0 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span className="flex-1 truncate text-xs text-gray-600">{u}</span>
                        <button
                          type="button"
                          onClick={() => removeUrl(u)}
                          className="flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-600"
                          title="Remover link"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">
                    Nenhum link adicionado ainda. Você pode adicionar quantos quiser.
                  </p>
                )}
              </div>
            </details>
            <div><label className="label">Itens e Opcionais (separados por vírgula)</label><input className="input-field" value={featuresInput} onChange={(e) => setFeaturesInput(e.target.value)} placeholder="Ar condicionado, Airbag, ABS..." /></div>
            <div><label className="label">Descrição</label><textarea className="input-field min-h-[100px]" value={form.description || ''} onChange={(e) => updateField('description', e.target.value)} placeholder="Descrição do veículo..." /></div>
            <div><label className="label">Observações</label><textarea className="input-field min-h-[60px]" value={form.notes || ''} onChange={(e) => updateField('notes', e.target.value)} /></div>
          </div>
        </div>

        {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary"><Save className="h-4 w-4" /> {loading ? 'Salvando...' : 'Salvar veículo'}</button>
          <button type="button" onClick={() => navigate('/admin/veiculos')} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
