// Cache ligera para catálogos que cambian poco (sucursales, motivos, tipos, niveles de usuario, etc.)
// Objetivo: evitar volver a descargar los mismos datos cada vez que el usuario cambia de
// pantalla o abre un modal, para reducir el consumo de datos móviles.
//
// Estrategia: cache en memoria (vive mientras la pestaña esté abierta) respaldada por
// sessionStorage (sobrevive a recargas de la misma pestaña, se limpia al cerrarla).
// Un TTL evita servir datos desactualizados por mucho tiempo.

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutos
const memoryCache = new Map<string, CacheEntry<unknown>>();

function readSession<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

function writeSession<T>(key: string, entry: CacheEntry<T>) {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage lleno o no disponible (modo privado); la cache en memoria sigue funcionando
  }
}

/**
 * Devuelve los datos cacheados si están vigentes; de lo contrario ejecuta `fetcher`,
 * guarda el resultado y lo retorna. Pensado para catálogos de solo lectura que casi
 * no cambian durante una sesión (sucursales asignadas, motivos, tipos, niveles, etc.).
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();

  const mem = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (mem && now - mem.timestamp < ttlMs) {
    return mem.data;
  }

  const stored = readSession<T>(key);
  if (stored && now - stored.timestamp < ttlMs) {
    memoryCache.set(key, stored);
    return stored.data;
  }

  const data = await fetcher();
  const entry: CacheEntry<T> = { data, timestamp: now };
  memoryCache.set(key, entry);
  writeSession(key, entry);
  return data;
}

/** Fuerza a que la próxima llamada a getCached() con esta clave vuelva a pedir datos frescos. */
export function invalidateCache(key: string) {
  memoryCache.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignorar
  }
}
