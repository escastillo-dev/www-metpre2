// Hook para manejo de registros de apertura y cierre
'use client';

import { useState, useCallback } from 'react';
import AperturaCierresService, { 
  AperturaRecord,
  CreateAperturaData
} from '../services/AperturaCierresService';
import { useApp } from '../context';

interface RegistroFilters {
  sucursales?: string;
  limit?: number;
  pagina?: number;
}

interface RegistroStats {
  aperturasHoy: number;
  cierresHoy: number;
  registrosConProblemas: number;
  promedioGeneral: number;
  totalRegistros: number;
}

interface UseAperturaCierresReturn {
  // Estado
  registros: AperturaRecord[];
  stats: RegistroStats | null;
  loading: boolean;
  error: string | null;
  
  // Operaciones
  loadRegistros: (filters?: RegistroFilters) => Promise<void>;
  createRegistro: (data: CreateAperturaData) => Promise<boolean>;
  calculateStats: () => void;
  getFilteredRecords: (filter: string) => AperturaRecord[];
  
  // Utilidades
  refreshData: () => Promise<void>;
  clearError: () => void;
  resetState: () => void;
}

export function useAperturaCierres(): UseAperturaCierresReturn {
  const [registros, setRegistros] = useState<AperturaRecord[]>([]);
  const [stats, setStats] = useState<RegistroStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<RegistroFilters | undefined>();

  const { addNotification } = useApp();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setRegistros([]);
    setStats(null);
    setError(null);
    setLoading(false);
    setLastFilters(undefined);
  }, []);

  const loadRegistros = useCallback(async (filters?: RegistroFilters) => {
    setLoading(true);
    setError(null);
    setLastFilters(filters);

    try {
      const result = await AperturaCierresService.getRegistros(filters);
      
      if (result.success && result.data) {
        // Transformar datos si es necesario
        let registrosTransformados: AperturaRecord[];
        if (Array.isArray(result.data)) {
          registrosTransformados = result.data.map(item => 
            AperturaCierresService.transformRecord(item)
          );
        } else {
          registrosTransformados = [];
        }
        
        setRegistros(registrosTransformados);
        
        // Calcular estadísticas automáticamente
        const statsCalculadas = AperturaCierresService.calculateStats(registrosTransformados);
        setStats(statsCalculadas);
        
        addNotification({
          type: 'success',
          message: `${registrosTransformados.length} registros cargados`,
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
      const errorMessage = 'Error al cargar registros';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage
      });
      console.error('Error loading registros:', err);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const createRegistro = useCallback(async (data: CreateAperturaData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await AperturaCierresService.createRegistro(data);
      
      if (result.success) {
        addNotification({
          type: 'success',
          message: 'Registro creado exitosamente'
        });
        
        // Recargar datos si tenemos filtros previos
        if (lastFilters !== undefined) {
          await loadRegistros(lastFilters);
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
      const errorMessage = 'Error al crear registro';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage
      });
      console.error('Error creating registro:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [addNotification, lastFilters, loadRegistros]);

  const calculateStats = useCallback(() => {
    const statsCalculadas = AperturaCierresService.calculateStats(registros);
    setStats(statsCalculadas);
  }, [registros]);

  const getFilteredRecords = useCallback((filter: string): AperturaRecord[] => {
    return AperturaCierresService.getFilteredRecords(registros, filter);
  }, [registros]);

  const refreshData = useCallback(async () => {
    if (lastFilters !== undefined) {
      await loadRegistros(lastFilters);
    }
  }, [lastFilters, loadRegistros]);

  return {
    // Estado
    registros,
    stats,
    loading,
    error,
    
    // Operaciones
    loadRegistros,
    createRegistro,
    calculateStats,
    getFilteredRecords,
    
    // Utilidades
    refreshData,
    clearError,
    resetState
  };
}

export default useAperturaCierres;
