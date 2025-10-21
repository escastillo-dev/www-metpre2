// Hook para manejo de movimientos de valores
'use client';

import { useState, useCallback } from 'react';
import MovimientosService, { 
  Movimiento, 
  CreateMovimientoData,
  MovimientosResponse
} from '../services/MovimientosService';
import { useApp } from '../context';

interface MovimientoFilters {
  fecha?: string;
  folio?: string;
  sucursal?: string;
  limit?: number;
  offset?: number;
}

interface IncidenciaData {
  idIncidencia: number;
  Incidencia: string;
}

interface UseMovimientosReturn {
  // Estado
  movimientos: Movimiento[];
  incidencias: IncidenciaData[];
  loading: boolean;
  error: string | null;
  
  // Operaciones
  loadMovimientos: (filters?: MovimientoFilters) => Promise<void>;
  createMovimiento: (data: CreateMovimientoData) => Promise<boolean>;
  loadIncidencias: () => Promise<void>;
  
  // Utilidades
  refreshData: () => Promise<void>;
  clearError: () => void;
  resetState: () => void;
}

export function useMovimientos(): UseMovimientosReturn {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [incidencias, setIncidencias] = useState<IncidenciaData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<MovimientoFilters | undefined>();

  const { addNotification } = useApp();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setMovimientos([]);
    setIncidencias([]);
    setError(null);
    setLoading(false);
    setLastFilters(undefined);
  }, []);

  const loadMovimientos = useCallback(async (filters?: MovimientoFilters) => {
    setLoading(true);
    setError(null);
    setLastFilters(filters);

    try {
      const result = await MovimientosService.getMovimientos(filters);
      
      if (result.success && result.data) {
        // Transformar datos de API a formato del UI
        const movimientosTransformados = result.data.items.map(item => 
          MovimientosService.transformMovimiento(item)
        );
        setMovimientos(movimientosTransformados);
        addNotification({
          type: 'success',
          message: `${result.data.total} movimientos cargados`,
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
      const errorMessage = 'Error al cargar movimientos';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage
      });
      console.error('Error loading movimientos:', err);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const createMovimiento = useCallback(async (data: CreateMovimientoData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await MovimientosService.createMovimiento(data);
      
      if (result.success) {
        addNotification({
          type: 'success',
          message: 'Movimiento creado exitosamente'
        });
        
        // Recargar datos si tenemos filtros previos
        if (lastFilters !== undefined) {
          await loadMovimientos(lastFilters);
        }
        
        return true;
      } else {
        setError(result.message);
        addNotification({
          type: 'error',
          message: result.message
        });
        return false;
      }
    } catch (err) {
      const errorMessage = 'Error al crear movimiento';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage
      });
      console.error('Error creating movimiento:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [addNotification, lastFilters, loadMovimientos]);

  const loadIncidencias = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await MovimientosService.getIncidencias();
      
      if (result.success && result.data) {
        setIncidencias(result.data);
      } else {
        setError(result.message);
        addNotification({
          type: 'error',
          message: result.message
        });
      }
    } catch (err) {
      const errorMessage = 'Error al cargar incidencias';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage
      });
      console.error('Error loading incidencias:', err);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const refreshData = useCallback(async () => {
    if (lastFilters !== undefined) {
      await loadMovimientos(lastFilters);
    }
  }, [lastFilters, loadMovimientos]);

  return {
    // Estado
    movimientos,
    incidencias,
    loading,
    error,
    
    // Operaciones
    loadMovimientos,
    createMovimiento,
    loadIncidencias,
    
    // Utilidades
    refreshData,
    clearError,
    resetState
  };
}

export default useMovimientos;