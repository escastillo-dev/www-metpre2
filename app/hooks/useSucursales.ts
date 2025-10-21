// Hook para manejo de sucursales
'use client';

import { useState, useCallback } from 'react';
import SucursalesService from '../services/SucursalesService';
import { useAuth, useApp } from '../context';
import { Sucursal } from '../services/AuthService';

interface UseSucursalesReturn {
  // Estado
  sucursales: Sucursal[];
  loading: boolean;
  error: string | null;
  
  // Operaciones
  loadSucursales: () => Promise<void>;
  getSucursalName: (idCentro: string) => string;
  isSucursalAsignada: (idCentro: string) => boolean;
  getSucursalesIds: () => string;
  
  // Utilidades
  clearError: () => void;
  resetState: () => void;
}

export function useSucursales(): UseSucursalesReturn {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { state: authState } = useAuth();
  const { addNotification } = useApp();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setSucursales([]);
    setError(null);
    setLoading(false);
  }, []);

  const loadSucursales = useCallback(async () => {
    if (!authState.isAuthenticated || !authState.user?.idUsuarios) {
      setError('Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await SucursalesService.getSucursalesAsignadas(authState.user.idUsuarios.toString());
      
      if (result.success && result.data) {
        setSucursales(result.data);
        addNotification({
          type: 'success',
          message: `${result.data.length} sucursales cargadas`,
          duration: 3000
        });
      } else {
        setError(result.message);
        addNotification({
          type: 'error',
          message: result.message
        });
      }
    } catch (err) {
      const errorMessage = 'Error al cargar sucursales';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage
      });
      console.error('Error loading sucursales:', err);
    } finally {
      setLoading(false);
    }
  }, [authState.isAuthenticated, authState.user, addNotification]);

  const getSucursalName = useCallback((idCentro: string): string => {
    return SucursalesService.getSucursalName(sucursales, idCentro);
  }, [sucursales]);

  const isSucursalAsignada = useCallback((idCentro: string): boolean => {
    return SucursalesService.isSucursalAsignada(sucursales, idCentro);
  }, [sucursales]);

  const getSucursalesIds = useCallback((): string => {
    return SucursalesService.getSucursalesIds(sucursales);
  }, [sucursales]);

  return {
    // Estado
    sucursales,
    loading,
    error,
    
    // Operaciones
    loadSucursales,
    getSucursalName,
    isSucursalAsignada,
    getSucursalesIds,
    
    // Utilidades
    clearError,
    resetState
  };
}

export default useSucursales;
