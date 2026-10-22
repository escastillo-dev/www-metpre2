import axios from 'axios';
import { getCached, PRODUCT_TTL_MS } from './apiCache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

interface CachedProduct {
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
}

// La misma búsqueda se comparte entre módulos y conserva códigos con ceros iniciales.
export async function getCachedProductSearch(query: string): Promise<{ data: ProductSearchResponse }> {
  const term = query.trim();
  const data = await getCached<ProductSearchResponse>(`productos:buscar:${term}`, async () => {
    const response = await axios.get<ProductSearchResponse | CachedProduct[]>(`${API_URL}/productos/buscar`, {
      params: { q: term },
      headers: { Authorization: `Basic ${localStorage.getItem('userCredentials')}`, 'Content-Type': 'application/json' },
    });
    if (Array.isArray(response.data)) return { estatus: 1, productos: response.data };
    if (response.data.estatus === undefined && response.data.items) {
      return { ...response.data, estatus: 1, productos: response.data.items };
    }
    return response.data;
  }, PRODUCT_TTL_MS);
  return { data };
}
