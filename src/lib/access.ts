import { create } from '@/lib/firestore';

/** Registro de um acesso ao sistema (login). */
export interface AccessLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  /** Timestamp do Firestore (serverTimestamp) do momento do acesso. */
  createdAt?: any;
}

interface LogAccessInput {
  userId: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Grava um acesso ao sistema na coleção `access_logs`.
 * É "fire-and-forget": falhas são apenas registradas no console e nunca
 * bloqueiam o fluxo de login.
 */
export async function logAccess({ userId, name, email, role }: LogAccessInput): Promise<void> {
  try {
    await create('access_logs', {
      user_id: userId,
      user_name: name,
      user_email: email,
      role,
      type: 'login',
    });
  } catch (err) {
    console.error('[access] falha ao registrar acesso:', err);
  }
}

/**
 * Grava uma visita (acesso) de um visitante anônimo à vitrine pública na
 * coleção `access_logs`. Assim, o gráfico de Controle de Acessos passa a
 * contabilizar também o público geral, e não apenas os logins do painel.
 *
 * Também é "fire-and-forget": falhas nunca bloqueiam a vitrine.
 */
export async function logVisit(): Promise<void> {
  try {
    await create('access_logs', {
      user_id: '',
      user_name: 'Visitante',
      user_email: '',
      role: 'visitante',
      type: 'visit',
    });
  } catch (err) {
    console.error('[access] falha ao registrar visita:', err);
  }
}

/**
 * Registra uma visita à vitrine pública UMA vez por sessão de navegador.
 * Usa `sessionStorage` para não inflar a contagem quando o visitante
 * recarrega a página (ou em remounts do React, como no StrictMode).
 */
export function logVisitOncePerSession(): void {
  try {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem('vitrine_visit_logged') === '1') return;
    window.sessionStorage.setItem('vitrine_visit_logged', '1');
    void logVisit();
  } catch (err) {
    console.error('[access] falha ao controlar sessão de visita:', err);
  }
}
