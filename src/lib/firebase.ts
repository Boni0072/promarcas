import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAHLusZnZueNB5hewPSz1XznUB3xMygvyw',
  authDomain: 'fechamentooba.firebaseapp.com',
  databaseURL: 'https://fechamentooba-default-rtdb.firebaseio.com',
  projectId: 'fechamentooba',
  storageBucket: 'fechamentooba.firebasestorage.app',
  messagingSenderId: '508432978183',
  appId: '1:508432978183:web:d316c127c4882ee85f35a2',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export default app;
