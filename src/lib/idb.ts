// src/lib/idb.ts
'use client';

// Минимальная обёртка над IndexedDB без внешних библиотек.
// Работает только в браузере. На сервере (SSR) просто no-op.

const DB_NAME = 'EventMapDB';
const DB_VERSION = 1;
const EVENTS = 'events';
const TILES  = 'tiles';

type ViewportKey = string;

export type Bounds = {
  minLat: number; maxLat: number;
  minLng: number; maxLng: number;
};

export type EventRecord = {
  id: string | number;
  lat: number;
  lng: number;
  // любые остальные поля как есть из БД:
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
        // keyPath: id — событие по id
        db.createObjectStore(EVENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TILES)) {
        // key: строка-ключ «тайла»; value: { key, fetchedAt }
        db.createObjectStore(TILES, { keyPath: 'key' });
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
  const toArr = (v: any) => Array.isArray(v) ? v.map(String) : [];
  return {
    ...raw,
    id: raw.id,
    lat: Number.isFinite(la) ? la : null,
    lng: Number.isFinite(ln) ? ln : null,
    type: undefined,               // на всякий: единое поле types
    types: toArr(raw.type ?? raw.types),
  };
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

/** Удалить событие из кэша */
export async function idbDeleteEvent(id: string | number) {
  if (!canUseIDB()) return;
  const db = await openDB();
  const tx = db.transaction(EVENTS, 'readwrite');
  tx.objectStore(EVENTS).delete(id as any);
  await txDone(tx);
  db.close();
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
  db.close();
}

/** Служебка для «свежести» тайла */
export function makeViewportKey(b: Bounds, zoom: number): ViewportKey {
  // Грубое округление, чтобы ключ был стабильным и редким:
  const z = Math.max(1, Math.min(20, Math.floor(zoom || 13)));
  const r = z >= 13 ? 0.02 : z >= 11 ? 0.05 : 0.1; // шаг для «грубого» ключа
  const fix = (v: number) => (Math.round(v / r) * r).toFixed(2);
  return [
    fix(b.minLat), fix(b.minLng),
    fix(b.maxLat), fix(b.maxLng),
    `z${z}`
  ].join('|');
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
