import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Profile, UserRole } from '@/types';
import { normalizeRole } from '@/lib/utils';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const pDoc = await getDoc(doc(db, 'profiles', u.uid));
        if (pDoc.exists()) {
          // Normaliza o perfil para o conjunto canônico de roles.
          const data = pDoc.data() as Partial<Profile>;
          setProfile({ id: u.uid, ...data, role: normalizeRole(data.role) } as Profile);
        } else {
          const newProfile = {
            id: u.uid,
            name: u.displayName || '',
            phone: '',
            role: 'vendedor' as UserRole,
            active: true,
          };
          await setDoc(doc(db, 'profiles', u.uid), newProfile);
          setProfile(newProfile as Profile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function signIn(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err: any) {
      return { error: translateError(err.code) };
    }
  }

  async function signUp(email: string, password: string, name: string, role: UserRole = 'vendedor') {
    try {
      const safeRole = normalizeRole(role);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const newProfile = {
        id: cred.user.uid,
        name,
        phone: '',
        role: safeRole,
        active: true,
      };
      await setDoc(doc(db, 'profiles', cred.user.uid), newProfile);
      return { error: null };
    } catch (err: any) {
      return { error: translateError(err.code) };
    }
  }

  async function signOut() {
    await fbSignOut(auth);
    setProfile(null);
  }

  function hasRole(...roles: UserRole[]): boolean {
    if (!profile) return false;
    // Normaliza para tolerar perfis gravados como "administrador", "ADMIN" etc.
    return roles.includes(normalizeRole(profile.role));
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

function translateError(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
  };
  return map[code] || 'Ocorreu um erro. Tente novamente.';
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
