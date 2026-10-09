import type { BannerSlide } from '@/types';

/**
 * Opções de gradiente dos banners da vitrine.
 * IMPORTANTE: mantenha as classes literais aqui — o Tailwind JIT varre
 * apenas strings completas no código-fonte para gerar o CSS.
 */
export const BANNER_GRADIENT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Cinza (marca)', value: 'from-primary-600 to-primary-900' },
  { label: 'Cinza escuro', value: 'from-primary-800 to-primary-950' },
  { label: 'Cinza claro', value: 'from-primary-500 to-primary-800' },
  { label: 'Grafite', value: 'from-gray-900 to-gray-700' },
  { label: 'Preto', value: 'from-black to-gray-800' },
  { label: 'Marinho', value: 'from-slate-800 to-slate-950' },
];

export const MAX_BANNERS = 6;

export const DEFAULT_BANNERS: BannerSlide[] = [
  {
    id: 'banner-1',
    title: 'Semana do Consumidor',
    subtitle: 'Descontos especiais em todos os veículos do nosso estoque',
    cta: 'Ver ofertas',
    gradient: 'from-primary-600 to-primary-900',
    image: '',
    enabled: true,
  },
  {
    id: 'banner-2',
    title: 'Troque seu carro',
    subtitle: 'Avaliação gratuita, rápida e sem burocracia do jeito que você merece',
    cta: 'Falar com especialista',
    gradient: 'from-primary-800 to-primary-950',
    image: '',
    enabled: true,
  },
  {
    id: 'banner-3',
    title: 'Financiamento facilitado',
    subtitle: 'Aprovação rápida com as melhores taxas do mercado para você',
    cta: 'Saiba mais',
    gradient: 'from-gray-900 to-gray-700',
    image: '',
    enabled: true,
  },
  {
    id: 'banner-4',
    title: 'Compra com confiança',
    subtitle: 'Veículos revisados, com histórico completo e garantia de procedência',
    cta: 'Conhecer veículos',
    gradient: 'from-primary-500 to-primary-800',
    image: '',
    enabled: true,
  },
];

export function createBanner(): BannerSlide {
  return {
    id: `banner-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Novo banner',
    subtitle: 'Descreva aqui a sua campanha',
    cta: 'Saiba mais',
    gradient: BANNER_GRADIENT_OPTIONS[0].value,
    image: '',
    enabled: true,
  };
}