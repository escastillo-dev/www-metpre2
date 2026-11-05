import axios from 'axios';
import { getCached, invalidateCachePrefix, PRODUCT_TTL_MS } from './apiCache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

export interface CachedProduct {
  [key: string]: unknown;
  CodigoBarras: string;
  Descripcion: string;
  Producto?: string;
  Precio?: number;
}
interface ProductSearchResponse {
  estatus?: number;
  productos?: CachedProduct[];
  items?: CachedProduct[];
  total?: number;
  limit?: number;
  offset?: number;
  mensaje?: string;
}

// La misma búsqueda se comparte entre módulos y conserva códigos con ceros iniciales.
export async function getCachedProductSearch(query: string, limit = 50, offset = 0, refresh = false): Promise<{ data: ProductSearchResponse }> {
  const term = query.trim();
  const prefix = `productos:buscar:v2:${JSON.stringify(term)}:`;
  if (refresh) await invalidateCachePrefix(prefix);
  const data = await getCached<ProductSearchResponse>(`${prefix}${limit}:${offset}`, async () => {
    const response = await axios.get<ProductSearchResponse | CachedProduct[]>(`${API_URL}/productos/buscar`, {
      params: { q: term, limit, offset },
      headers: { Authorization: `Basic ${localStorage.getItem('userCredentials')}`, 'Content-Type': 'application/json' },
    });
    if (Array.isArray(response.data)) return { estatus: 1, productos: response.data };
    if (response.data.estatus === undefined && response.data.items) {
      return { ...response.data, estatus: 1, productos: response.data.items };
    }
    if (response.data.estatus !== undefined && response.data.estatus !== 1) {
      throw new Error(response.data.mensaje || 'No se pudieron consultar los productos.');
    }
    return response.data;
  }, PRODUCT_TTL_MS);
  return { data };
}
