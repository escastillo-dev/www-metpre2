'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

// URL de la API - usar variable de entorno o fallback a localhost
const API_URL = "https://met-hmaqcjdea9fsh8ak.mexicocentral-01.azurewebsites.net";

interface MovimientoAPI {
  Folio: number;
  Sucursales: string;
  Fecha: string;
  Movimiento: string;
  Hora: string;
  Incidencia: string;
  TipoSF: string | null;
  Importe: number | null;
}

interface Movimiento {
  folio: number;
  sucursal: string;
  fecha: string;
  hora: string;
  movimiento: string;
  incidencia: string;
  tipoSF: string | null;
  importe: number | null;
}

interface MovimientosResponse {
  estatus: number;
  total: number;
  items: MovimientoAPI[];
}

interface Sucursal {
  idCentro: string;
  Sucursal: string;
}

interface Usuario {
  idUsuarios: number;
  NombreUsuario: string;
  idNivelUsuario: number;
  estatus: number;
  FechaAlta?: string;
}

interface UsuarioResponse {
  estatus: number;
  mensaje: string;
  usuario: Usuario;
  sucursales?: Sucursal[];
}

import '../styles/forms.css';

export default function ValoresPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [sucursalesAsignadas, setSucursalesAsignadas] = useState<Sucursal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [incidencias, setIncidencias] = useState<Array<{idIncidencia: number, Incidencia: string}>>([]);
  function getNowForInput() {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  }
  const [formData, setFormData] = useState({
    idCentro: "",
    movimiento: "R",
    hora: getNowForInput(),
    caja: 0,
    cajero: 0,
    idIncidencia: "",
    deposito: "N",
    comentario: "MOVIMIENTO",
    anfitrion: 0,
    idUsuarios: 0,
    sf: "N",
    tipoSF: "N",
    sfMonto: 0
  });

  useEffect(() => {
    if (showModal) {
      setFormData(f => ({ ...f, hora: getNowForInput() }));
    }
  }, [showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userCredentials = localStorage.getItem('userCredentials');
    const userId = localStorage.getItem('userId');
    
    if (!userCredentials || !userId) {
      setError('No se encontraron las credenciales del usuario');
      return;
    }

    try {
      // Convertir hora a formato HH:mm:ss para la API
      let hora = formData.hora;
      if (hora && hora.length === 5) {
        hora = hora + ':00';
      }
      const response = await axios.post(
        `${API_URL}/mmv/movimientos`,
        {
          ...formData,
          idUsuarios: parseInt(userId),
          hora: hora
        },
        {
          headers: {
            'Authorization': `Basic ${userCredentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.estatus === 1) {
        alert(response.data.mensaje);
        setShowModal(false);
        fetchMovimientos(); // Recargar la lista de movimientos
      } else {
        alert(response.data.mensaje || 'Error desconocido al registrar el movimiento');
      }
    } catch (error: any) {
      let mensaje = 'Error al registrar el movimiento';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          mensaje = error.response.data.detail;
        } else if (typeof error.response.data.detail === 'object') {
          mensaje = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        mensaje = error.message;
      }
      alert(mensaje);
    }
  };
  
  // Estados para paginación
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  
  // Estado para filtros
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [folioFiltro, setFolioFiltro] = useState('');
  const [sucursalFiltro, setSucursalFiltro] = useState('');

  // Función para obtener las sucursales asignadas al usuario
  const fetchSucursalesAsignadas = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      const userId = localStorage.getItem('userId');
      const userLevel = localStorage.getItem('userLevel');
      
      console.log('Nivel de usuario:', userLevel);
      console.log('ID de usuario:', userId);
      
      if (!userCredentials || !userId) {
        setError('No se encontraron las credenciales del usuario');
        setLoading(false);
        return;
      }

      const response = await axios.get<UsuarioResponse>(`${API_URL}/usuarios/${userId}`, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.estatus === 1) {
        if (response.data.sucursales && Array.isArray(response.data.sucursales)) {
          setSucursalesAsignadas(response.data.sucursales);
          console.log('Sucursales asignadas:', response.data.sucursales);
        } else {
          console.error('No se encontraron sucursales asignadas:', response.data);
          setError('No hay sucursales asignadas para este usuario');
        }
      } else {
        console.error('Error en la respuesta:', response.data.mensaje);
        setError(response.data.mensaje || 'Error al obtener la información de las sucursales');
      }
    } catch (error) {
      console.error('Error al obtener sucursales asignadas:', error);
      setError('Error al obtener las sucursales asignadas');
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar sucursales al iniciar
  const fetchIncidencias = async () => {
    try {
      console.log('Iniciando carga de incidencias...');
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        console.error('No se encontraron las credenciales del usuario');
        setError('No se encontraron las credenciales del usuario');
        return;
      }

      const response = await axios.get(`${API_URL}/Incidencias`, {
        params: { limit: 50, offset: 0 },
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Respuesta de incidencias:', response.data);
      if (response.data.estatus === 1) {
        console.log('Incidencias cargadas:', response.data.incidencias);
        setIncidencias(response.data.incidencias || []);
      } else {
        console.error('Error en la respuesta de incidencias:', response.data);
      }
    } catch (error) {
      console.error('Error al cargar incidencias:', error);
    }
  };

  useEffect(() => {
    fetchSucursalesAsignadas();
    fetchIncidencias();
  }, []); // Solo se ejecuta al montar el componente

  // Efecto para cargar movimientos cuando cambien los filtros o las sucursales
  useEffect(() => {
    console.log('Sucursales asignadas actualizadas:', sucursalesAsignadas);
    if (sucursalesAsignadas.length > 0) {
      fetchMovimientos();
    }
  }, [sucursalesAsignadas, offset, limit, fechaFiltro, folioFiltro, sucursalFiltro]);

  const fetchMovimientos = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        setError('No se encontraron las credenciales');
        setLoading(false);
        return;
      }

      if (sucursalesAsignadas.length === 0) {
        setMovimientos([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      // Construir URL con parámetros de consulta
      let url = `${API_URL}/mmv/movimientos?limit=${limit}&offset=${offset}`;
      
      // Agregar los IDs de las sucursales asignadas
      const sucursalesIds = sucursalesAsignadas.map(s => s.idCentro).join(',');
      url += `&sucursales=${sucursalesIds}`;

      if (fechaFiltro) {
        url += `&fecha=${fechaFiltro}`;
      }
      if (folioFiltro) {
        url += `&folio=${folioFiltro}`;
      }
      // Solo aplicar el filtro de sucursal si está dentro de las asignadas
      if (sucursalFiltro && sucursalesAsignadas.some(s => s.idCentro === sucursalFiltro)) {
        url += `&idCentro=${sucursalFiltro}`;
      }

      const response = await axios.get<MovimientosResponse>(url, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Respuesta de movimientos:', response.data); // Para depuración

      if (response.data.estatus === 1 && Array.isArray(response.data.items)) {
        // Procesamos los movimientos y los ordenamos por fecha y hora descendente
        const movimientosProcesados = response.data.items
          .map(movimiento => ({
            folio: movimiento.Folio,
            sucursal: movimiento.Sucursales,
            fecha: movimiento.Fecha,
            hora: movimiento.Hora,
            movimiento: movimiento.Movimiento,
            incidencia: movimiento.Incidencia,
            tipoSF: movimiento.TipoSF,
            importe: movimiento.Importe
          }))
          .sort((a, b) => {
            // Comparar primero por fecha
            const fechaComparacion = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            if (fechaComparacion !== 0) return fechaComparacion;
            // Si las fechas son iguales, comparar por hora
            return b.hora.localeCompare(a.hora);
          });
      
        setMovimientos(movimientosProcesados);
        setTotal(response.data.total); // Mantenemos el total real de la API
      } else {
        console.error('Formato de respuesta inválido:', response.data);
        setError('Error al obtener los movimientos: formato de datos inválido');
      }
    } catch (error) {
      console.error('Error al cargar los movimientos:', error);
      setError('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 bg-gradient-to-br from-purple-600 to-purple-800 overflow-y-auto">
      
      {/* Header responsive */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 md:p-6 rounded-xl shadow-md">
        <h1 className="text-xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
          <span className="text-3xl md:text-4xl">💰</span>
          <span>Manejo de Valores</span>
        </h1>
        <button
          className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          onClick={() => setShowModal(true)}
        >
          <span className="text-xl">➕</span>
          <span className="md:hidden">Nuevo</span>
          <span className="hidden md:inline">Registrar Movimiento</span>
        </button>
      </div>
      
      {/* Filtros responsive */}
      <div className="bg-white p-4 md:p-6 rounded-xl mb-6 shadow-md">
        <h4 className="text-lg font-semibold mb-4 text-gray-700">Filtros de Búsqueda</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Folio</label>
            <input
              type="number"
              value={folioFiltro}
              onChange={(e) => setFolioFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              min="1"
              placeholder="#"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
            <select
              value={sucursalFiltro}
              onChange={(e) => setSucursalFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value="">Todas las sucursales</option>
              {sucursalesAsignadas
                .sort((a, b) => a.Sucursal.localeCompare(b.Sucursal))
                .map((sucursal) => (
                  <option key={sucursal.idCentro} value={sucursal.idCentro}>
                    {sucursal.Sucursal}
                  </option>
                ))}
            </select>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Registros</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <button
            className="flex-1 sm:flex-none px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            onClick={() => {
              setOffset(0);
              fetchMovimientos();
            }}
          >
            🔍 Buscar
          </button>
          <button
            className="flex-1 sm:flex-none px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            onClick={() => {
              setFechaFiltro('');
              setFolioFiltro('');
              setSucursalFiltro('');
              setOffset(0);
              fetchMovimientos();
            }}
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {/* Lista de movimientos - Responsive */}
      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base md:text-lg font-semibold text-gray-800">
            <span className="md:hidden">Total: {total}</span>
            <span className="hidden md:inline">Total: {total} registros</span>
          </h3>
        </div>

        {/* MÓVIL: Cards verticales - Solo visible en móvil */}
        <div className="block md:hidden p-4 space-y-3">
          {movimientos.map((movimiento) => (
            <div
              key={`mobile-${movimiento.folio}`}
              className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header del card */}
              <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200">
                <div>
                  <div className="text-sm font-semibold text-purple-600">
                    Folio #{movimiento.folio}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {movimiento.sucursal}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {movimiento.movimiento === 'R' ? '💰' : movimiento.movimiento === 'D' ? '🏦' : '📊'} {movimiento.movimiento}
                  </div>
                  <div className="text-sm font-semibold text-gray-800">
                    {movimiento.importe ? `$${movimiento.importe.toFixed(2)}` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">📅</span>
                  <span className="text-gray-700">
                    {movimiento.fecha ? movimiento.fecha.slice(0, 10).split('-').reverse().join('/') : 'N/A'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">🕐</span>
                  <span className="text-gray-700">{movimiento.hora || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">📝</span>
                  <span className="text-gray-700">{movimiento.incidencia || 'Sin incidencia'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">💵</span>
                  <span className="text-gray-700">Tipo: <strong>{movimiento.tipoSF || '-'}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TABLET: Tabla simplificada - Visible en tablet */}
        <div className="hidden md:block lg:hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Folio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mov.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movimientos.map((movimiento) => (
                <tr key={`tablet-${movimiento.folio}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-purple-600">#{movimiento.folio}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{movimiento.sucursal}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {movimiento.fecha ? movimiento.fecha.slice(0, 10).split('-').reverse().join('/') : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        {movimiento.movimiento === 'R' ? '💰' : movimiento.movimiento === 'D' ? '🏦' : '📊'}
                        {movimiento.movimiento}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                      {movimiento.importe ? `$${movimiento.importe.toFixed(2)}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        {/* DESKTOP: Tabla completa - Visible en desktop */}
        <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Folio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Movimiento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Incidencia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo SF</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.folio} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-purple-600 whitespace-nowrap">#{movimiento.folio}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{movimiento.sucursal}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {movimiento.fecha ? movimiento.fecha.slice(0, 10).split('-').reverse().join('/') : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{movimiento.hora || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        {movimiento.movimiento === 'R' ? '💰' : movimiento.movimiento === 'D' ? '🏦' : '📊'}
                        {movimiento.movimiento}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{movimiento.incidencia || 'Sin incidencia'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap font-medium">{movimiento.tipoSF || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">
                      {movimiento.importe ? `$${movimiento.importe.toFixed(2)}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        {/* Paginación responsive */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 md:px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600 order-2 md:order-1">
            <span className="md:hidden">{offset + 1}-{Math.min(offset + limit, total)} de {total}</span>
            <span className="hidden md:inline">Mostrando {offset + 1} - {Math.min(offset + limit, total)} de {total} movimientos</span>
          </div>
          <div className="flex gap-2 order-1 md:order-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                offset === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <span className="md:hidden">←</span>
              <span className="hidden md:inline">← Anterior</span>
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                offset + limit >= total
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <span className="md:hidden">→</span>
              <span className="hidden md:inline">Siguiente →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Registro de Movimiento */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Registrar Nuevo Movimiento</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form className="form-grid" onSubmit={handleSubmit}>

                <div className="form-group">
                  <label className="form-label">Sucursal</label>
                  <select 
                    className="form-input"
                    value={formData.idCentro}
                    onChange={e => setFormData({...formData, idCentro: e.target.value})}
                    required
                  >
                    <option value="">Seleccione una sucursal</option>
                    {sucursalesAsignadas.map(sucursal => (
                      <option key={sucursal.idCentro} value={sucursal.idCentro}>
                        {sucursal.Sucursal}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hora</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.hora}
                    onChange={e => setFormData({...formData, hora: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Movimiento</label>
                  <select
                    className="form-input"
                    value={formData.movimiento}
                    onChange={e => setFormData({...formData, movimiento: e.target.value})}
                    required
                  >
                    <option value="R">Retiro (R)</option>
                    <option value="C">Corte (C)</option>
                    <option value="A">Arqueo (A)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Caja</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.caja}
                    onChange={e => setFormData({...formData, caja: parseInt(e.target.value)})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cajero</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.cajero}
                    onChange={e => setFormData({...formData, cajero: parseInt(e.target.value)})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Incidencia</label>
                  <select
                    className="form-input"
                    value={formData.idIncidencia}
                    onChange={e => setFormData({...formData, idIncidencia: e.target.value})}
                  >
                    <option value="">Sin incidencia</option>
                    {incidencias.map(incidencia => (
                      <option key={incidencia.idIncidencia} value={incidencia.idIncidencia}>
                        {incidencia.Incidencia}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Comentario</label>
                  <textarea
                    className="form-input"
                    value={formData.comentario}
                    onChange={e => setFormData({...formData, comentario: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">¿Sobrante/Faltante?</label>
                  <select 
                    className="form-input"
                    value={formData.sf}
                    onChange={e => {
                      const newValue = e.target.value;
                      setFormData({
                        ...formData,
                        sf: newValue,
                        tipoSF: newValue === "N" ? "N" : formData.tipoSF,
                        sfMonto: newValue === "N" ? 0 : formData.sfMonto
                      });
                    }}
                  >
                    <option value="N">No</option>
                    <option value="S">Sí</option>
                  </select>
                </div>

                {formData.sf === "S" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Tipo S/F</label>
                      <select 
                        className="form-input"
                        value={formData.tipoSF}
                        onChange={e => setFormData({...formData, tipoSF: e.target.value})}
                        required={formData.sf === "S"}
                      >
                        <option value="N">Seleccione</option>
                        <option value="S">Sobrante</option>
                        <option value="F">Faltante</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Monto S/F</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.sfMonto}
                        onChange={e => setFormData({...formData, sfMonto: parseFloat(e.target.value)})}
                        required={formData.sf === "S"}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </>
                )}

                <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      border: "2px solid #e2e8f0",
                      borderRadius: "0.375rem",
                      backgroundColor: "white",
                      color: "#4a5568",
                      fontWeight: "500",
                      cursor: "pointer"
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontWeight: "500",
                      cursor: "pointer"
                    }}
                  >
                    Guardar Movimiento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
