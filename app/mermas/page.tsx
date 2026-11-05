'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Esta ruta ya no tiene una implementación propia: el módulo de Mermas vive
 * dentro del dashboard unificado (sidebar + autenticación + estilos
 * consistentes). Se mantiene este archivo solo para no romper enlaces
 * guardados/compartidos hacia /mermas, redirigiendo de forma segura según
 * el estado de sesión.
 */
export default function MermasPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    router.replace(token ? '/dashboard?panel=mermas' : '/login');
  }, [router]);

  return <div>Cargando...</div>;
}
