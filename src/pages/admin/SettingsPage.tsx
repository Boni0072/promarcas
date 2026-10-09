import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Target, Building2, Images, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { getAll, create, update as updateDoc } from '@/lib/firestore';
import type { Settings, BannerSlide } from '@/types';
import { LoadingState } from '@/components/ui/States';
import { BANNER_GRADIENT_GROUPS, BANNER_GRADIENT_OPTIONS, DEFAULT_BANNERS, MAX_BANNERS, createBanner } from '@/lib/banners';

const DEFAULT_SETTINGS: Settings = {
  id: '',
  banners: DEFAULT_BANNERS.map((b) => ({ ...b })),
  company_name: '',
  company_phone: '',
  company_whatsapp: '',
  company_email: '',
  company_address: '',
  company_logo: '',
  min_margin_pct: 0,
  max_stock_days: 0,
  goal_monthly_sales: 0,
  goal_monthly_revenue: 0,
  goal_monthly_profit: 0,
  goal_min_margin: 0,
  goal_max_stock_days: 0,
  goal_max_expense_budget: 0,
  created_at: '',
  updated_at: '',
};

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const all = await getAll<Settings>('settings');
        const doc = all[0];
        setSettings(doc ? {
          ...DEFAULT_SETTINGS,
          ...doc,
          banners: Array.isArray(doc.banners) && doc.banners.length > 0
            ? doc.banners
            : DEFAULT_BANNERS.map((b) => ({ ...b })),
        } : { ...DEFAULT_SETTINGS });
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
        setSettings({ ...DEFAULT_SETTINGS });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function updateBanner(index: number, patch: Partial<BannerSlide>) {
    setSettings((prev) => prev ? {
      ...prev,
      banners: prev.banners.map((b, i) => i === index ? { ...b, ...patch } : b),
    } : prev);
  }

  function addBanner() {
    setSettings((prev) => prev && prev.banners.length < MAX_BANNERS
      ? { ...prev, banners: [...prev.banners, createBanner()] }
      : prev);
  }

  function removeBanner(index: number) {
    setSettings((prev) => prev
      ? { ...prev, banners: prev.banners.filter((_, i) => i !== index) }
      : prev);
  }

  function moveBanner(index: number, dir: -1 | 1) {
    setSettings((prev) => {
      if (!prev) return prev;
      const target = index + dir;
      if (target < 0 || target >= prev.banners.length) return prev;
      const banners = [...prev.banners];
      [banners[index], banners[target]] = [banners[target], banners[index]];
      return { ...prev, banners };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (settings.id) {
        const { id, ...data } = settings;
        await updateDoc<Settings>('settings', id, { ...data, updated_at: now });
      } else {
        const { id, ...data } = settings;
        await create('settings', { ...data, created_at: now, updated_at: now });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      alert('Não foi possível salvar as configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!settings) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Configurações</h2>
        <p className="text-sm text-gray-500">Configure os parâmetros do sistema</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-primary-600" /><h3 className="font-bold text-gray-900">Dados da Empresa</h3></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Nome da Empresa</label><input className="input-field" value={settings.company_name} onChange={(e) => update('company_name', e.target.value)} /></div>
            <div><label className="label">Telefone</label><input className="input-field" value={settings.company_phone} onChange={(e) => update('company_phone', e.target.value)} /></div>
            <div><label className="label">WhatsApp (com DDI)</label><input className="input-field" value={settings.company_whatsapp} onChange={(e) => update('company_whatsapp', e.target.value)} placeholder="5511999999999" /></div>
            <div><label className="label">E-mail</label><input className="input-field" value={settings.company_email} onChange={(e) => update('company_email', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="label">Endereço</label><input className="input-field" value={settings.company_address} onChange={(e) => update('company_address', e.target.value)} /></div>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-primary-600" /><h3 className="font-bold text-gray-900">Metas e Parâmetros</h3></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="label">Margem Mínima (%)</label><input type="number" step="0.01" className="input-field" value={settings.min_margin_pct} onChange={(e) => update('min_margin_pct', parseFloat(e.target.value) || 0)} /></div>
            <div><label className="label">Dias Máx. em Estoque</label><input type="number" className="input-field" value={settings.max_stock_days} onChange={(e) => update('max_stock_days', parseInt(e.target.value) || 0)} /></div>
            <div><label className="label">Meta de Vendas/mês</label><input type="number" className="input-field" value={settings.goal_monthly_sales} onChange={(e) => update('goal_monthly_sales', parseInt(e.target.value) || 0)} /></div>
            <div><label className="label">Meta Faturamento (R$)</label><input type="number" step="0.01" className="input-field" value={settings.goal_monthly_revenue} onChange={(e) => update('goal_monthly_revenue', parseFloat(e.target.value) || 0)} /></div>
            <div><label className="label">Meta Lucro (R$)</label><input type="number" step="0.01" className="input-field" value={settings.goal_monthly_profit} onChange={(e) => update('goal_monthly_profit', parseFloat(e.target.value) || 0)} /></div>
            <div><label className="label">Margem Mín. Meta (%)</label><input type="number" step="0.01" className="input-field" value={settings.goal_min_margin} onChange={(e) => update('goal_min_margin', parseFloat(e.target.value) || 0)} /></div>
            <div><label className="label">Dias Máx. Meta</label><input type="number" className="input-field" value={settings.goal_max_stock_days} onChange={(e) => update('goal_max_stock_days', parseInt(e.target.value) || 0)} /></div>
            <div><label className="label">Orçamento Despesas (R$)</label><input type="number" step="0.01" className="input-field" value={settings.goal_max_expense_budget} onChange={(e) => update('goal_max_expense_budget', parseFloat(e.target.value) || 0)} /></div>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-1 flex items-center gap-2"><Images className="h-5 w-5 text-primary-600" /><h3 className="font-bold text-gray-900">Banners da Vitrine</h3></div>
          <p className="mb-4 text-sm text-gray-500">Slides rotativos exibidos na página pública, abaixo dos filtros. Use as setas ↑↓ para reordenar, a lixeira para excluir, ou desmarque <em>Ativo</em> para ocultar sem excluir. As alterações são aplicadas após <strong>Salvar configurações</strong>.</p>

          <div className="space-y-4">
            {settings.banners.map((banner, index) => (
              <div key={banner.id} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{index + 1}</span>
                  <span className="text-sm font-semibold text-gray-700">{banner.title || 'Sem título'}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button type="button" onClick={() => moveBanner(index, -1)} disabled={index === 0} aria-label="Mover para cima" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => moveBanner(index, 1)} disabled={index === settings.banners.length - 1} aria-label="Mover para baixo" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => removeBanner(index)} aria-label="Excluir banner" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-900"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <div className={`h-12 w-32 shrink-0 overflow-hidden rounded-lg bg-gradient-to-r ${banner.gradient}`}>
                    {banner.image && <img src={banner.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={banner.enabled} onChange={(e) => updateBanner(index, { enabled: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    Ativo (exibir na vitrine)
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label">Título</label><input className="input-field" value={banner.title} onChange={(e) => updateBanner(index, { title: e.target.value })} placeholder="Ex.: Semana do Consumidor" /></div>
                  <div><label className="label">Texto do botão</label><input className="input-field" value={banner.cta} onChange={(e) => updateBanner(index, { cta: e.target.value })} placeholder="Ex.: Ver ofertas" /></div>
                  <div className="sm:col-span-2"><label className="label">Subtítulo</label><input className="input-field" value={banner.subtitle} onChange={(e) => updateBanner(index, { subtitle: e.target.value })} placeholder="Descrição curta da campanha" /></div>
                  <div className="sm:col-span-2"><label className="label">Cor do banner (gradiente)</label>
                    <div className="space-y-3 rounded-xl border border-gray-200 p-3">
                      {BANNER_GRADIENT_GROUPS.map((group) => (
                        <div key={group.title}>
                          <p className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">{group.title}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.options.map((opt) => {
                              const active = banner.gradient === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  title={opt.label}
                                  aria-label={`Cor do banner: ${opt.label}`}
                                  aria-pressed={active}
                                  onClick={() => updateBanner(index, { gradient: opt.value })}
                                  className={`h-9 w-9 rounded-full bg-gradient-to-r ${opt.value} transition-transform hover:scale-110 ${
                                    active ? 'ring-2 ring-primary-600 ring-offset-2' : 'ring-1 ring-black/10'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                      Selecionado:{' '}
                      <span className="font-medium text-gray-700">
                        {BANNER_GRADIENT_OPTIONS.find((opt) => opt.value === banner.gradient)?.label ?? 'Personalizado'}
                      </span>
                    </p>
                  </div>
                  <div><label className="label">Imagem de fundo (URL, opcional)</label><input className="input-field" value={banner.image} onChange={(e) => updateBanner(index, { image: e.target.value })} placeholder="https://..." /></div>
                </div>
              </div>
            ))}

            {settings.banners.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                Nenhum banner. A vitrine exibirá os slides padrão até você adicionar um.
              </p>
            )}
          </div>

          <button type="button" onClick={addBanner} disabled={settings.banners.length >= MAX_BANNERS} className="btn-secondary mt-4">
            <Plus className="h-4 w-4" /> Adicionar banner ({settings.banners.length}/{MAX_BANNERS})
          </button>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary"><Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar configurações'}</button>
          {saved && <span className="self-center text-sm font-medium text-success-600">Configurações salvas!</span>}
        </div>
      </form>
    </div>
  );
}
