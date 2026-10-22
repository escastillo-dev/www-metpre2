import axios, { AxiosHeaders, AxiosResponse } from 'axios';
import { getCached, peekCache, invalidateCachePrefix } from './apiCache';

export type OperationalDomain = 'mermas' | 'caducidad' | 'recuperaciones' | 'consumidos' | 'aperturas' | 'valores' | 'dashboard';
export const OPERATIONAL_EVENT = 'metpre-operational-cache';
export const OPERATIONAL_TTL_MS = 5 * 60 * 1000;
interface Snapshot { data: unknown; updatedAt: number; etag?: string; lastModified?: string; estatus: number }

export function domainFor(url: string): OperationalDomain {
  const path = url.split('?')[0];
  if (path.includes('/productos-consumidos')) return 'consumidos';
  if (path.includes('/caducidad/')) return 'caducidad';
  if (path.includes('/recuperaciones')) return 'recuperaciones';
  if (path.includes('/apci')) return 'aperturas';
  if (path.includes('/mmv/')) return 'valores';
  if (path.includes('/dashboard/')) return 'dashboard';
  if (path.includes('/mermas')) return 'mermas';
  throw new Error(`Consulta sin dominio operativo: ${path}`);
}

export function operationalKey(url: string, params?: unknown) {
  // Orden estable: mismos filtros aunque los objetos se construyan en otro orden.
  const entries = params instanceof URLSearchParams ? Array.from(params.entries()) : Object.entries(params ?? {});
  const normalized = entries.filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  return `ops:${domainFor(url)}:${JSON.stringify([url, normalized])}`;
}
function notify(detail: { domain: OperationalDomain; updatedAt?: number; invalidated?: boolean }) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(OPERATIONAL_EVENT, { detail }));
}

// Conservar la firma de Axios para no alterar los contratos de los componentes.
export const operationalGet = (async (...[url, config]: Parameters<typeof axios.get>) => {
  const domain = domainFor(url);
  const key = operationalKey(url, config?.params);
  const snapshot = await getCached<Snapshot>(key, async () => {
    const previous = await peekCache<Snapshot>(key);
    const headers = new AxiosHeaders(config?.headers as ConstructorParameters<typeof AxiosHeaders>[0]);
    if (previous?.etag) headers.set('If-None-Match', previous.etag);
    else if (previous?.lastModified) headers.set('If-Modified-Since', previous.lastModified);
    const response = await axios.get<unknown>(url, {
      ...config, headers,
      validateStatus: status => status === 304 || (config?.validateStatus ? config.validateStatus(status) : status >= 200 && status < 300),
    });
    if (response.status === 304) {
      if (!previous) throw new Error('Respuesta 304 sin copia local.');
      return { ...previous, updatedAt: Date.now() };
    }
    const data = response.data;
    const estatus = data && typeof data === 'object' && 'estatus' in data ? Number(data.estatus) : 1;
    return { data, updatedAt: Date.now(), estatus,
      etag: response.headers?.etag as string | undefined,
      lastModified: response.headers?.['last-modified'] as string | undefined };
  }, OPERATIONAL_TTL_MS);
  if (snapshot.estatus === 1) notify({ domain, updatedAt: snapshot.updatedAt });
  return { data: snapshot.data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
}) as typeof axios.get;

/** Actualiza únicamente los módulos dependientes de una escritura confirmada. */
export async function invalidateOperational(domains: OperationalDomain[]) {
  await Promise.all([...new Set(domains)].map(async domain => {
    await invalidateCachePrefix(`ops:${domain}:`);
    notify({ domain, invalidated: true });
  }));
}
