'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Esta ruta ya no tiene una implementación propia: el módulo de Apertura y
 * Cierres vive dentro del dashboard unificado (sidebar + autenticación +
 * estilos consistentes). Se mantiene este archivo solo para no romper
 * enlaces guardados/compartidos hacia /apertura-cierres, redirigiendo de
 * forma segura según el estado de sesión.
 */
export default function AperturaCierresPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    router.replace(token ? '/dashboard?panel=apertura-cierres' : '/login');
  }, [router]);

  return <div>Cargando...</div>;
}
