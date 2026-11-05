'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Esta ruta ya no tiene una implementación propia: el módulo de Valores vive
 * dentro del dashboard unificado (sidebar + autenticación + estilos consistentes).
 * Se mantiene este archivo solo para no romper enlaces guardados/compartidos
 * hacia /valores, redirigiendo de forma segura según el estado de sesión.
 */
export default function ValoresPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    router.replace(token ? '/dashboard?panel=valores' : '/login');
  }, [router]);

  return <div>Cargando...</div>;
}
