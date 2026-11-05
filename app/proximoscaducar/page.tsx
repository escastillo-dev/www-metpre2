'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Esta ruta ya no tiene una implementación propia: el módulo de Próximos a
 * Caducar vive dentro del dashboard unificado (sidebar + autenticación +
 * estilos consistentes). Se mantiene este archivo solo para no romper
 * enlaces guardados/compartidos hacia /proximoscaducar, redirigiendo de
 * forma segura según el estado de sesión.
 */
export default function ProximosCaducarPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    router.replace(token ? '/dashboard?panel=proximoscaducar' : '/login');
  }, [router]);

  return <div>Cargando...</div>;
}
