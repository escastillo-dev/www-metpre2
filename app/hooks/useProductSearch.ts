'use client';

import { useEffect, useRef, useState } from 'react';
import { CachedProduct, getCachedProductSearch } from '../services/productCache';

const PAGE_SIZE = 50;

export function useProductSearch<T extends { CodigoBarras: string } = CachedProduct>() {
  const [products, setProducts] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | undefined>();
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const term = useRef('');
  const nextOffset = useRef(0);
  const busy = useRef(false);

  function cancel() {
    sequence.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    busy.current = false;
  }

  useEffect(() => () => { cancel(); }, []);

  async function fetchPage(id: number, offset: number, refresh = false) {
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const { data } = await getCachedProductSearch(term.current, PAGE_SIZE, offset, refresh);
      if (id !== sequence.current) return;
      if (data.estatus !== 1) throw new Error(data.mensaje || 'No se pudieron consultar los productos.');
      const page = (data.productos || []) as unknown as T[];
      nextOffset.current = offset + page.length;
      // Sin total no se puede paginar de forma fiable con una API anterior.
      setTotal(data.total);
      setProducts(previous => {
        const unique = new Map<string, T>();
        for (const product of [...(offset ? previous : []), ...page]) unique.set(product.CodigoBarras, product);
        return [...unique.values()];
      });
      if (!page.length && data.total !== undefined && offset < data.total) {
        setError('No se recibieron más productos. Actualiza la búsqueda para volver a consultar.');
      }
    } catch (cause) {
      if (id === sequence.current) setError(cause instanceof Error ? cause.message : 'Error al buscar productos.');
    } finally {
      if (id === sequence.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }

  function search(query: string, refresh = false) {
    cancel();
    term.current = query.trim();
    nextOffset.current = 0;
    setProducts([]);
    setTotal(undefined);
    setError('');
    const valid = term.current.length >= 2;
    setLoading(valid);
    if (!valid) return;
    const id = sequence.current;
    if (refresh) void fetchPage(id, 0, true);
    else timer.current = setTimeout(() => { void fetchPage(id, 0); }, 300);
  }

  function reset() {
    search('');
  }

  const hasMore = total !== undefined && nextOffset.current < total;
  function loadMore() {
    if (!busy.current && hasMore) void fetchPage(sequence.current, nextOffset.current);
  }

  return { products, loading, total, error, hasMore, search, reset, loadMore,
    refresh: () => search(term.current, true) };
}
