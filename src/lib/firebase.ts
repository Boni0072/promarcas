import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const env = import.meta.env as Record<string, string | undefined>;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Garante que o app Firebase existe. Se já houver um app [DEFAULT],
// reutiliza-o; caso contrário, cria um novo. Evita o erro "duplicate-app"
// do Vite HMR que recriava o app várias vezes com configs diferentes.
let app: FirebaseApp;

try {
  app = getApp();
} catch {
  app = initializeApp(firebaseConfig);
}

export const auth = getAuth(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Firestore — inicialização defensiva: se o banco (default) não existir
// no projeto (comum ao criar o projeto no console sem ativar Firestore),
// aguardamos a resolução antes de expor `db`. Permite ao app detectar
// o estado de prontitude e exibir um loading/offline state.
let dbInstance: Firestore | null = null;
let dbReadyResolve: ((value: Firestore | PromiseLike<Firestore>) => void) | null = null;
let dbReadyPromise: Promise<Firestore>;

try {
  dbInstance = getFirestore(app);
  // Força a verificação de disponibilidade (sobe a conexão com o backend).
  // Se o projeto não tiver Firestore habilitado, essa operação falha com
  // "Database '(default)' not found", que capturamos abaixo.
  dbReadyPromise = new Promise((resolve, reject) => {
    dbReadyResolve = resolve;
    // Não bloqueia: apenas registra o estado inicial. A verificação efetiva
    // é feita na primeira operação de leitura do AuthContext.
    resolve(dbInstance as Firestore);
  });
} catch (err: any) {
  // Firestore não disponível no projeto (não habilitado ou config incorreta).
  dbInstance = null;
  dbReadyPromise = Promise.reject<Firestore>(err);
}

export { dbReadyPromise };

export const db = dbInstance ?? (null as unknown as Firestore);

export default app;