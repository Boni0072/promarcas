import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth, db, rtdb, firebaseConfig } from '@/lib/firebase';
import { ref, set, onValue, onDisconnect, serverTimestamp, off } from 'firebase/database';
import { doc, setDoc } from 'firebase/firestore';
import type { UserRole } from '@/types';
import { normalizeRole } from '@/lib/utils';

export interface PresenceData {
  online: boolean;
  path: string;
  pathLabel: string;
  name: string;
  lastSeen: number | null;
}

/**
 * Cria um usuário usando uma instância SECUNDÁRIA do Firebase Auth,
 * para não deslogar o administrador que está criando o usuário.
 */
export async function createUserWithRole(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  phone = '',
  pages?: string[],
  avatarUrl = ''
): Promise<{ error: string | null }> {
  const secondaryApp = initializeApp(firebaseConfig, 'secondary-' + Date.now());
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await fbSignOut(secondaryAuth); // evita manter sessão secundária ativa

    // Normaliza o perfil ("administrador" -> "admin") para não perder o acesso total.
    const safeRole = normalizeRole(role);

    const newProfile: Record<string, unknown> = {
      id: cred.user.uid,
      name,
      phone,
      role: safeRole,
      active: true,
      created_at: new Date().toISOString(),
    };
    // Foto do perfil (base64), quando o administrador enviou uma.
    if (avatarUrl) newProfile.avatar_url = avatarUrl;
    // admin tem acesso total; para outros perfis, salva as páginas selecionadas
    if (safeRole !== 'admin') {
      newProfile.pages = pages && pages.length > 0 ? pages : ['/admin'];
    }
    await setDoc(doc(db, 'profiles', cred.user.uid), newProfile);
    return { error: null };
  } catch (err: any) {
    const map: Record<string, string> = {
      'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
      'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
    };
    return { error: map[err.code] || 'Ocorreu um erro ao criar o usuário.' };
  } finally {
    await deleteApp(secondaryApp);
  }
}

/**
 * Marca o usuário como online na rota/página atual no Realtime Database.
 * Configura onDisconnect para marcar offline automaticamente ao fechar a aba.
 */
export function setPresence(uid: string, path: string, pathLabel: string, name: string) {
  const presenceRef = ref(rtdb, `presence/${uid}`);

  const write = () =>
    set(presenceRef, {
      online: true,
      path,
      pathLabel,
      name,
      lastSeen: serverTimestamp(),
    });

  // Ao desconectar (fechar aba, perder rede), marca offline
  onDisconnect(presenceRef)
    .set({ online: false, path: '', pathLabel: '', name, lastSeen: serverTimestamp() })
    .then(write)
    .catch(write);
}

/** Marca manualmente como offline (ex.: no signOut). */
export function clearPresence(uid: string) {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  onDisconnect(presenceRef).cancel();
  off(presenceRef);
  set(presenceRef, {
    online: false,
    path: '',
    pathLabel: '',
    lastSeen: serverTimestamp(),
  }).catch(() => {});
}

/** Escuta a presença de todos os usuários em tempo real. */
export function subscribePresence(cb: (data: Record<string, PresenceData>) => void) {
  const presenceRef = ref(rtdb, 'presence');
  const unsub = onValue(presenceRef, (snap) => {
    cb((snap.val() as Record<string, PresenceData>) || {});
  });
  return () => off(presenceRef);
}

/** Mantido para compatibilidade (não utilizado diretamente na UI). */
export const _auth = auth;
