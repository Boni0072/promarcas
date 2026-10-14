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
    });
  } catch (err) {
    console.error('[access] falha ao registrar acesso:', err);
  }
}
