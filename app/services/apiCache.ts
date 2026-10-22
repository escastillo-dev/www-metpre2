// Caché de lecturas: memoria + IndexedDB. Nunca almacena credenciales ni escrituras.
interface CacheEntry<T> { data: T; timestamp: number }
export const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
export const PRODUCT_TTL_MS = CATALOG_TTL_MS;
const ACCESS_TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 500;
const STORE = 'responses';
const DB_NAME = 'metpre-read-cache-v1';
const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
let generation = 0;
let database: Promise<IDBDatabase | null> | undefined;
let storageQueue: Promise<unknown> = Promise.resolve();

function scope(): string | null {
  try {
    const user = localStorage.getItem('userId');
    if (!user || !localStorage.getItem('userCredentials')) return null;
    return JSON.stringify([process.env.NEXT_PUBLIC_API_URL || '/backend', user]);
  } catch { return null; }
}
function scopedKey(key: string) {
  const current = scope();
  return current ? `${current}:${key}` : null;
}
function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!database) database = new Promise(resolve => {
    let settled = false;
    const timer = setTimeout(() => finish(null), 1500);
    function finish(db: IDBDatabase | null) {
      if (settled) { db?.close(); return; }
      settled = true; clearTimeout(timer); resolve(db);
    }
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE);
        store.createIndex('timestamp', 'timestamp');
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); database = undefined; };
        finish(request.result);
      };
      request.onerror = () => finish(null);
      request.onblocked = () => finish(null);
    } catch { finish(null); }
  });
  return database;
}
// Serializar evita que una escritura anterior al logout reaparezca tras limpiar.
function storageOperation<T>(fallback: T, action: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const operation = storageQueue.then(async () => {
    const db = await openDatabase();
    if (!db) return fallback;
    return new Promise<T>(resolve => {
      let result = fallback;
      let tx: IDBTransaction | undefined;
      const timer = setTimeout(() => {
        try { tx?.abort(); } catch { /* La transacción ya terminó. */ }
        resolve(fallback);
      }, 1500);
      const finish = (value: T) => { clearTimeout(timer); resolve(value); };
      try {
        tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => finish(result);
        tx.onerror = tx.onabort = () => finish(fallback);
        action(tx.objectStore(STORE), value => { result = value; });
      } catch { finish(fallback); }
    });
  });
  storageQueue = operation.catch(() => undefined);
  return operation;
}
function readStored(key: string) {
  return storageOperation<CacheEntry<unknown> | undefined>(undefined, (store, done) => {
    const request = store.get(key);
    request.onsuccess = () => done(request.result);
  });
}
function writeStored(key: string, entry: CacheEntry<unknown>) {
  return storageOperation(undefined, store => {
    store.put(entry, key);
    // Eliminar entradas antiguas y limitar el espacio ocupado por búsquedas.
    const request = store.index('timestamp').openCursor(null, 'prev');
    let count = 0;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const value = cursor.value as CacheEntry<unknown>;
      if (++count > MAX_ENTRIES || Date.now() - value.timestamp >= CATALOG_TTL_MS) cursor.delete();
      cursor.continue();
    };
  });
}
function cacheable(data: unknown) {
  if (data && typeof data === 'object' && 'estatus' in data) return data.estatus === 1;
  return true;
}

/** Reutiliza lecturas vigentes, incluso después de cerrar y volver a abrir la PWA. */
export function getCached<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
  const fullKey = scopedKey(key);
  if (!fullKey) return fetcher();
  const ttl = ttlMs ?? (/^(sucursales_|niveles_usuario)/.test(key) ? ACCESS_TTL_MS : CATALOG_TTL_MS);
  const version = generation;
  const existing = inFlight.get(fullKey);
  if (existing) return existing as Promise<T>;
  const stillCurrent = () => version === generation && scopedKey(key) === fullKey;
  const fresh = (entry?: CacheEntry<unknown>) => entry && Date.now() - entry.timestamp < ttl;
  const operation = (async () => {
    const memory = memoryCache.get(fullKey);
    if (fresh(memory)) return memory!.data as T;
    const stored = await readStored(fullKey);
    if (stillCurrent() && fresh(stored)) {
      memoryCache.set(fullKey, stored!);
      return stored!.data as T;
    }
    const data = await fetcher();
    if (stillCurrent() && cacheable(data)) {
      const entry = { data, timestamp: Date.now() };
      memoryCache.delete(fullKey);
      memoryCache.set(fullKey, entry);
      if (memoryCache.size > MAX_ENTRIES) memoryCache.delete(memoryCache.keys().next().value!);
      await writeStored(fullKey, entry);
    }
    return data;
  })();
  inFlight.set(fullKey, operation);
  void operation.finally(() => {
    if (inFlight.get(fullKey) === operation) inFlight.delete(fullKey);
  }).catch(() => undefined);
  return operation;
}

/** Invalida una lectura; las peticiones previas no podrán volver a guardarla. */
export async function invalidateCache(key: string): Promise<void> {
  const fullKey = scopedKey(key);
  if (!fullKey) return;
  generation++;
  memoryCache.delete(fullKey);
  inFlight.clear();
  await storageOperation(undefined, store => { store.delete(fullKey); });
}

/** Limpiar antes de retirar las credenciales al cerrar sesión o cambiar de cuenta. */
export async function clearPersistentCache(): Promise<void> {
  generation++;
  memoryCache.clear();
  inFlight.clear();
  await storageOperation(undefined, store => { store.clear(); });
}
