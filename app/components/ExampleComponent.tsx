// Ejemplo de componente usando la nueva arquitectura
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, useApp } from '../context';
import { useMovimientos, useSucursales } from '../hooks';

interface ExampleComponentProps {
  // Props del componente
}

export default function ExampleComponent({}: ExampleComponentProps) {
  // Context hooks para estado global
  const { state: authState, logout } = useAuth();
  const { addNotification, setLoading } = useApp();
  
  // Custom hooks para lógica de negocio
  const {
    movimientos,
    loading: movimientosLoading,
    error: movimientosError,
    loadMovimientos,
    createMovimiento,
    clearError: clearMovimientosError
  } = useMovimientos();
  
  const {
    sucursales,
    loading: sucursalesLoading,
    getSucursalName,
    loadSucursales
  } = useSucursales();

  // Estado local del componente
  const [selectedSucursal, setSelectedSucursal] = useState<string>('');

  // Effects
  useEffect(() => {
    if (authState.isAuthenticated) {
      loadSucursales();
      loadMovimientos();
    }
  }, [authState.isAuthenticated, loadSucursales, loadMovimientos]);

  // Handlers
  const handleCreateMovimiento = async () => {
    if (!selectedSucursal) {
      addNotification({
        type: 'warning',
        message: 'Selecciona una sucursal'
      });
      return;
    }

    const movimientoData = {
      idCentro: selectedSucursal,
      movimiento: 'Ejemplo',
      hora: new Date().toLocaleTimeString(),
      caja: 1,
      cajero: 1,
      idIncidencia: '1',
      deposito: 'No',
      comentario: 'Movimiento de ejemplo',
      anfitrion: 1,
      idUsuarios: authState.user?.idUsuarios || 0,
      sf: 'No',
      tipoSF: '',
      sfMonto: 0
    };

    const success = await createMovimiento(movimientoData);
    
    if (success) {
      setSelectedSucursal('');
    }
  };

  const handleLogout = () => {
    logout();
    addNotification({
      type: 'info',
      message: 'Sesión cerrada exitosamente'
    });
  };

  // Loading state
  if (authState.loading || movimientosLoading || sucursalesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (movimientosError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-600">{movimientosError}</p>
            <button
              onClick={clearMovimientosError}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Limpiar error
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Panel de Movimientos
            </h1>
            <p className="text-gray-600">
              Bienvenido, {authState.user?.NombreUsuario}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Crear Movimiento */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Crear Nuevo Movimiento</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sucursal
            </label>
            <select
              value={selectedSucursal}
              onChange={(e) => setSelectedSucursal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar sucursal</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.idCentro} value={sucursal.idCentro}>
                  {sucursal.Sucursal}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreateMovimiento}
            disabled={!selectedSucursal}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Crear Movimiento
          </button>
        </div>
      </div>

      {/* Lista de Movimientos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">
          Movimientos Recientes ({movimientos.length})
        </h2>
        
        {movimientos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay movimientos registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Folio</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Sucursal</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Movimiento</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Incidencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.folio} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {movimiento.folio}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {getSucursalName(movimiento.sucursal)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {movimiento.fecha}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {movimiento.movimiento}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {movimiento.incidencia}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}