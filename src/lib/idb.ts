// src/lib/idb.ts
'use client';

// Минимальная обёртка над IndexedDB без внешних библиотек.
// Работает только в браузере. На сервере (SSR) просто no-op.

const DB_NAME = 'EventMapDB';
// ⬇️ Бамп версии, т.к. добавляем хранилище META
const DB_VERSION = 2;

const EVENTS = 'events';
const TILES  = 'tiles';
const META   = 'meta'; // ⬅️ новое хранилище для служебных метаданных (last sync и пр.)

type ViewportKey = string;

export type Bounds = {
  minLat: number; maxLat: number;
  minLng: number; maxLng: number;
};

export type EventRecord = {
  id: string | number;
  lat: number | null;
  lng: number | null;
  image_url?: string | null;
  [k: string]: any;
};

function canUseIDB() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIDB()) return reject(new Error('IndexedDB is not available'));

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(EVENTS)) {
        db.createObjectStore(EVENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TILES)) {
        db.createObjectStore(TILES, { keyPath: 'key' });
      }
      // ⬇️ добавляем META, если его не было
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

/** Нормализация: приводим lat/lng к числам, type -> types[] */
export function normalizeEvent(raw: any): EventRecord {
  const la = parseFloat(raw?.lat as any);
  const ln = parseFloat(raw?.lng as any);
  const toArr = (v: any) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String);
    return [String(v)];
  };

  const types = toArr(raw.type ?? raw.types);

  return {
    ...raw,
    id: raw.id,
    lat: Number.isFinite(la) ? la : null,
    lng: Number.isFinite(ln) ? ln : null,
    type: types.length ? types : ['other'],
    image_url: raw?.image_url ?? null,
    types,
  };
}

// ============ базовые операции ============

// ✅ починили: теперь через транзакцию/объектное хранилище
export async function idbGetAllEvents(): Promise<EventRecord[]> {
  if (!canUseIDB()) return [];
  const db = await openDB();
  const tx = db.transaction(EVENTS, 'readonly');
  const store = tx.objectStore(EVENTS);
  const req = store.getAll();
  const value = await new Promise<EventRecord[]>((res, rej) => {
    req.onsuccess = () => res(req.result ?? []);
    req.onerror = () => rej(req.error);
  });
  db.close();
  return value;
}

/** Получить только список id всех событий (для синхронизации) */
export async function idbGetAllIds(): Promise<Set<string>> {
  const all = await idbGetAllEvents();
  return new Set(all.map(e => String(e.id)));
}

/** Сохранить/обновить пачку событий */
export async function idbPutEvents(events: any[]) {
  if (!canUseIDB() || !events?.length) return;
  const db = await openDB();
  const tx = db.transaction(EVENTS, 'readwrite');
  const store = tx.objectStore(EVENTS);
  for (const e of events) {
    store.put(normalizeEvent(e));
  }
  await txDone(tx);
  db.close();
}

/** Получить событие по id */
export async function idbGetEventById(id: string | number) {
  if (!canUseIDB()) return null;
  const db = await openDB();
  const tx = db.transaction(EVENTS, 'readonly');
  const store = tx.objectStore(EVENTS);
  const req = store.get(id as any);
  const value = await new Promise<any>((res, rej) => {
    req.onsuccess = () => res(req.result ?? null);
    req.onerror = () => rej(req.error);
  });
  db.close();
  return value;
}

/** Удалить события по списку id (bulk) */
export async function idbBulkDelete(ids: Array<string | number>) {
  if (!canUseIDB() || !ids?.length) return;
  const db = await openDB();
  const tx = db.transaction(EVENTS, 'readwrite');
  const store = tx.objectStore(EVENTS);
  for (const id of ids) {
    store.delete(id as any);
  }
  await txDone(tx);
  db.close();
}

/** Удалить событие из кэша */
export async function idbDeleteEvent(id: string | number) {
  return idbBulkDelete([id]);
}

/** Прочитать все события, попадающие в гео-границы */
export async function idbGetEventsInBounds(b: Bounds): Promise<EventRecord[]> {
  if (!canUseIDB()) return [];
  const db = await openDB();
  const tx = db.transaction(EVENTS, 'readonly');
  const store = tx.objectStore(EVENTS);

  const out: EventRecord[] = [];
  const req = store.openCursor();

  await new Promise<void>((res, rej) => {
    req.onsuccess = (e: any) => {
      const cursor: IDBCursorWithValue | null = e.target.result;
      if (!cursor) return res();
      const ev = cursor.value as EventRecord;
      if (
        typeof ev?.lat === 'number' && typeof ev?.lng === 'number' &&
        ev.lat >= b.minLat && ev.lat <= b.maxLat &&
        ev.lng >= b.minLng && ev.lng <= b.maxLng
      ) {
        out.push(ev);
      }
      cursor.continue();
    };
    req.onerror = () => rej(req.error);
  });

  db.close();
  return out;
}

/** Полная очистка кэша (events + tiles) */
export async function idbClearAll() {
  if (!canUseIDB()) return;
  const db = await openDB();
  const tx1 = db.transaction(EVENTS, 'readwrite');
  tx1.objectStore(EVENTS).clear();
  await txDone(tx1);
  const tx2 = db.transaction(TILES, 'readwrite');
  tx2.objectStore(TILES).clear();
  await txDone(tx2);
  // мету не чистим — там могут быть отпечатки синка, но при желании можно:
  // const tx3 = db.transaction(META, 'readwrite'); tx3.objectStore(META).clear(); await txDone(tx3);
  db.close();
}

// ============ «свежесть» тайла (если захочешь оставить) ============
export function makeViewportKey(b: Bounds, zoom: number): ViewportKey {
  const z = Math.max(1, Math.min(20, Math.floor(zoom || 13)));
  const r = z >= 13 ? 0.02 : z >= 11 ? 0.05 : 0.1;
  const fix = (v: number) => (Math.round(v / r) * r).toFixed(2);
  return [fix(b.minLat), fix(b.minLng), fix(b.maxLat), fix(b.maxLng), `z${z}`].join('|');
}

export async function idbIsTileStale(key: ViewportKey, ttlMs: number): Promise<boolean> {
  if (!canUseIDB()) return true;
  const db = await openDB();
  const tx = db.transaction(TILES, 'readonly');
  const store = tx.objectStore(TILES);
  const req = store.get(key);
  const rec = await new Promise<any>((res, rej) => {
    req.onsuccess = () => res(req.result ?? null);
    req.onerror = () => rej(req.error);
  });
  db.close();
  if (!rec) return true;
  return (Date.now() - (rec.fetchedAt as number)) > ttlMs;
}

export async function idbMarkTileFetched(key: ViewportKey) {
  if (!canUseIDB()) return;
  const db = await openDB();
  const tx = db.transaction(TILES, 'readwrite');
  tx.objectStore(TILES).put({ key, fetchedAt: Date.now() });
  await txDone(tx);
  db.close();
}

// ============ META (необязательные утилиты) ============

export async function idbMetaGet<T = any>(key: string): Promise<T | null> {
  if (!canUseIDB()) return null;
  const db = await openDB();
  const tx = db.transaction(META, 'readonly');
  const store = tx.objectStore(META);
  const req = store.get(key);
  const value = await new Promise<any>((res, rej) => {
    req.onsuccess = () => res(req.result?.value ?? null);
    req.onerror   = () => rej(req.error);
  });
  db.close();
  return value as T | null;
}

export async function idbMetaSet(key: string, value: any) {
  if (!canUseIDB()) return;
  const db = await openDB();
  const tx = db.transaction(META, 'readwrite');
  tx.objectStore(META).put({ key, value });
  await txDone(tx);
  db.close();
}
