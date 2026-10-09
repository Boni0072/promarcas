import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface WithId {
  id: string;
}

function addId<T>(snap: { id: string; data: () => T }): T & WithId {
  return { id: snap.id, ...snap.data() } as T & WithId;
}

export async function getAll<T>(path: string): Promise<(T & WithId)[]> {
  const snap = await getDocs(collection(db, path));
  return snap.docs.map((d) => addId<T>(d as any));
}

export async function getById<T>(path: string, id: string): Promise<(T & WithId) | null> {
  const d = await getDoc(doc(db, path, id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() } as T & WithId;
}

export async function getByField<T>(path: string, field: string, op: any, value: any): Promise<(T & WithId)[]> {
  const q = query(collection(db, path), where(field, op, value));
  const snap = await getDocs(q);
  return snap.docs.map((d) => addId<T>(d as any));
}

export async function getByFieldOrdered<T>(path: string, field: string, op: any, value: any, orderField: string, dir: 'asc' | 'desc' = 'desc'): Promise<(T & WithId)[]> {
  const q = query(collection(db, path), where(field, op, value), orderBy(orderField, dir));
  const snap = await getDocs(q);
  return snap.docs.map((d) => addId<T>(d as any));
}

export async function getOrdered<T>(path: string, orderField: string, dir: 'asc' | 'desc' = 'desc'): Promise<(T & WithId)[]> {
  const q = query(collection(db, path), orderBy(orderField, dir));
  const snap = await getDocs(q);
  return snap.docs.map((d) => addId<T>(d as any));
}

export async function create<T extends Record<string, any>>(path: string, data: T): Promise<string> {
  const ref = await addDoc(collection(db, path), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function createWithId<T extends Record<string, any>>(path: string, id: string, data: T): Promise<void> {
  await setDoc(doc(db, path, id), { ...data, createdAt: serverTimestamp() });
}

export async function update<T extends Record<string, any>>(path: string, id: string, data: Partial<T>): Promise<void> {
  await updateDoc(doc(db, path, id), { ...data, updatedAt: serverTimestamp() } as any);
}

export async function remove(path: string, id: string): Promise<void> {
  await deleteDoc(doc(db, path, id));
}

export function subscribe<T>(path: string, callback: (items: (T & WithId)[]) => void): Unsubscribe {
  return onSnapshot(collection(db, path), (snap) => {
    callback(snap.docs.map((d) => addId<T>(d as any)));
  });
}

export function subscribeOrdered<T>(path: string, orderField: string, dir: 'asc' | 'desc' | undefined, callback: (items: (T & WithId)[]) => void): Unsubscribe {
  const q = query(collection(db, path), orderBy(orderField, dir));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => addId<T>(d as any)));
  });
}
