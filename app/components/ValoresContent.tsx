'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { operationalGet, invalidateOperational } from '../services/operationalCache';
import CacheStatus from './CacheStatus';
import { useAuth } from '../context';
import ValoresTable from './ValoresTable';
import ValoresModal from './ValoresModal';
import '../styles/forms.css';
import '../dashboard/dashboard.css';

// URL de la API — configurar NEXT_PUBLIC_API_URL en .env.local (vacío = proxy /backend)
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

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

interface MovimientoFormData {
  idCentro: string;
  movimiento: string;
  hora: string;
  caja: string | number;
  cajero: string | number;
  idIncidencia: string;
  deposito: string;
  comentario: string;
  anfitrion: string | number;
  idUsuarios: number;
  sf: string;
  tipoSF: string;
  sfMonto: string | number;
}

export default function ValoresContent() {
  const { state: authState } = useAuth();
  const guardandoMovimientoRef = useRef(false);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [sucursalesAsignadas, setSucursalesAsignadas] = useState<Sucursal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [incidencias, setIncidencias] = useState<Array<{idIncidencia: number, Incidencia: string}>>([]);
  
  function getNowForInput() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  const [formData, setFormData] = useState<MovimientoFormData>({
    idCentro: "",
    movimiento: "R",
    hora: getNowForInput(),
    caja: "",
    cajero: "",
    idIncidencia: "",
    deposito: "N",
    comentario: "MOVIMIENTO",
    anfitrion: "",
    idUsuarios: 0,
    sf: "N",
    tipoSF: "N",
    sfMonto: ""
  });

  useEffect(() => {
    if (showModal) {
      setFormData(f => ({ ...f, hora: getNowForInput() }));
    }
  }, [showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardandoMovimientoRef.current) return;

    const userCredentials = localStorage.getItem('userCredentials');
    const userId = localStorage.getItem('userId');
    
    if (!userCredentials || !userId) {
      setError('No se encontraron las credenciales del usuario');
      return;
    }

    guardandoMovimientoRef.current = true;
    setGuardandoMovimiento(true);

    try {
      // La hora ya viene en formato HH:MM, solo agregamos segundos
      let hora = formData.hora;
      if (hora && hora.length === 5) {
        hora = hora + ':00';
      }

      const headers = {
        'Authorization': `Basic ${userCredentials}`,
        'Content-Type': 'application/json'
      };
      const movimientoData = {
        ...formData,
        idUsuarios: Number(userId),
        idIncidencia: Number(formData.idIncidencia),
        hora,
        caja: formData.caja ? Number(formData.caja) : 0,
        cajero: formData.cajero ? Number(formData.cajero) : 0,
        anfitrion: formData.anfitrion ? Number(formData.anfitrion) : 0,
        sfMonto: formData.sfMonto ? Number(formData.sfMonto) : 0
      };

      const registrarMovimiento = () =>
        axios.post(`${API_URL}/mmv/movimientos`, movimientoData, { headers });

      let response;
      try {
        response = await registrarMovimiento();
      } catch (movimientoError: unknown) {
        const movimientoRespuesta = axios.isAxiosError(movimientoError)
          ? movimientoError.response
          : undefined;
        const datosError = movimientoRespuesta?.data as
          | { mensaje?: unknown; detail?: unknown }
          | undefined;
        const mensaje = String(datosError?.mensaje || datosError?.detail || '').toLowerCase();
        const faltaFolio =
          movimientoRespuesta?.status === 400 &&
          mensaje.includes('no hay folio abierto');

        if (!faltaFolio) throw movimientoError;

        const folioResponse = await axios.post(
          `${API_URL}/mmv/folios`,
          {
            idCentro: movimientoData.idCentro,
            hora: movimientoData.hora,
            anfitrion: movimientoData.anfitrion,
            idUsuarios: movimientoData.idUsuarios,
            idIncidencia: movimientoData.idIncidencia,
            caja: movimientoData.caja,
            cajero: movimientoData.cajero,
            comentario: movimientoData.comentario
          },
          { headers }
        );

        if (folioResponse.data?.estatus !== 1) {
          throw new Error(folioResponse.data?.mensaje || 'No fue posible abrir el folio');
        }

        // Reintentar una sola vez después de abrir el folio.
        response = await registrarMovimiento();
      }

      if (response.data.estatus === 1) {
        alert(response.data.mensaje);
        await invalidateOperational(['valores', 'dashboard']);
        setShowModal(false);
        // Limpiar el formulario
        setFormData({
          idCentro: "",
          movimiento: "R",
          hora: getNowForInput(),
          caja: "",
          cajero: "",
          idIncidencia: "",
          deposito: "N",
          comentario: "MOVIMIENTO",
          anfitrion: "",
          idUsuarios: 0,
          sf: "N",
          tipoSF: "N",
          sfMonto: ""
        });
        fetchMovimientos();
      } else {
        alert(response.data.mensaje || 'Error desconocido al registrar el movimiento');
      }
    } catch (error: unknown) {
      const data = axios.isAxiosError(error) ? error.response?.data : undefined;
      const mensaje = data?.mensaje || data?.detail ||
        (error instanceof Error ? error.message : 'Error al registrar el movimiento');
      alert(typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje));
    } finally {
      guardandoMovimientoRef.current = false;
      setGuardandoMovimiento(false);
    }
  };
  
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [folioFiltro, setFolioFiltro] = useState('');
  const [sucursalFiltro, setSucursalFiltro] = useState('');

  const fetchIncidencias = async () => {
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
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

      if (response.data.estatus === 1) {
        setIncidencias(response.data.incidencias || []);
      }
    } catch (error) {
      console.error('Error al cargar incidencias:', error);
    }
  };

  useEffect(() => {
    fetchIncidencias();
  }, []);

  useEffect(() => {
    if (authState.sucursales.length > 0) {
      setSucursalesAsignadas(authState.sucursales);
      setError('');
    } else if (!authState.loading && authState.isAuthenticated) {
      setSucursalesAsignadas([]);
      setError('No hay sucursales asignadas para este usuario');
    }
  }, [authState.sucursales, authState.loading, authState.isAuthenticated]);

  useEffect(() => {
    if (sucursalesAsignadas.length > 0) {
      fetchMovimientos();
    }
  }, [sucursalesAsignadas, offset, limit, fechaFiltro, folioFiltro, sucursalFiltro]);

  const fetchMovimientos = async () => {
    setLoadingMovimientos(true);
    setError('');
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        setError('No se encontraron las credenciales');
        return;
      }

      if (sucursalesAsignadas.length === 0) {
        setMovimientos([]);
        setTotal(0);
        return;
      }

      const centros = sucursalFiltro
        ? [sucursalFiltro]
        : sucursalesAsignadas.map(sucursal => sucursal.idCentro);

      // La API solo admite un idCentro por solicitud. Consultar cada sucursal
      // asignada evita la búsqueda global que provocaba esperas prolongadas.
      const responses = await Promise.all(
        centros.map(idCentro => operationalGet<MovimientosResponse>(`${API_URL}/mmv/movimientos`, {
          params: {
            idCentro,
            limit,
            offset,
            ...(fechaFiltro ? { fecha: fechaFiltro } : {}),
            ...(folioFiltro ? { folio: folioFiltro } : {})
          },
          headers: {
            'Authorization': `Basic ${userCredentials}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }))
      );

      const respuestasValidas = responses.filter(response =>
        response.data.estatus === 1 && Array.isArray(response.data.items)
      );
      const items = respuestasValidas.flatMap(response => response.data.items);

      if (respuestasValidas.length === responses.length) {
        const movimientosProcesados = items
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
            const fechaComparacion = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            if (fechaComparacion !== 0) return fechaComparacion;
            return b.hora.localeCompare(a.hora);
          });
      
        // Filtro adicional en el frontend para asegurar que solo se muestren sucursales asignadas
        const movimientosFiltrados = movimientosProcesados.filter(movimiento => {
          // Buscar la sucursal por nombre o por ID
          const sucursalEncontrada = sucursalesAsignadas.find(s => 
            s.Sucursal === movimiento.sucursal || s.idCentro === movimiento.sucursal
          );
          return sucursalEncontrada !== undefined;
        });
        
        setMovimientos(movimientosFiltrados);
        setTotal(respuestasValidas.reduce((totalActual, response) => totalActual + response.data.total, 0));
      } else {
        setError('Error al obtener los movimientos: formato de datos inválido');
      }
    } catch (error: unknown) {
      const detalle = axios.isAxiosError(error)
        ? error.response?.data?.mensaje || error.message
        : error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error al cargar los movimientos: ${detalle}`);
    } finally {
      setLoadingMovimientos(false);
    }
  };

  return (
    <div style={{ padding: '20px' }} className="px-3 py-4 sm:px-5 sm:py-5">
      <CacheStatus domain="valores" onRefresh={fetchMovimientos} />
      {error && <div style={{ marginBottom: 12, color: '#c53030' }}>Error: {error}</div>}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3" style={{ marginBottom: '20px' }}>
        <h1 className="text-xl sm:text-2xl" style={{ margin: 0 }}>Manejo de Valores</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto"
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Nuevo Movimiento
        </button>
      </div>

      {/* Filtros */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Fecha:
          </label>
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Folio:
          </label>
          <input
            type="text"
            value={folioFiltro}
            onChange={(e) => setFolioFiltro(e.target.value)}
            placeholder="Buscar por folio"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Sucursal:
          </label>
          <select
            value={sucursalFiltro}
            onChange={(e) => setSucursalFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="">Todas las sucursales</option>
            {sucursalesAsignadas.map((sucursal) => (
              <option key={sucursal.idCentro} value={sucursal.idCentro}>
                {sucursal.Sucursal}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Registros por página:
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Tabla de movimientos (responsive: tabla en escritorio, tarjetas en móvil) */}
      {loadingMovimientos
        ? <div>Cargando movimientos...</div>
        : <ValoresTable movimientos={movimientos} />
      }

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3" style={{ 
        marginTop: '20px'
      }}>
        <div className="text-sm text-center sm:text-left">
          Mostrando {movimientos.length} de {total} registros
        </div>
        <div className="flex gap-2 justify-center sm:justify-start">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="flex-1 sm:flex-none"
            style={{
              padding: '8px 16px',
              backgroundColor: offset === 0 ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: offset === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Anterior
          </button>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={movimientos.length < limit}
            className="flex-1 sm:flex-none"
            style={{
              padding: '8px 16px',
              backgroundColor: movimientos.length < limit ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: movimientos.length < limit ? 'not-allowed' : 'pointer'
            }}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal */}
      <ValoresModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        incidencias={incidencias}
        sucursalesAsignadas={sucursalesAsignadas}
        guardando={guardandoMovimiento}
      />
    </div>
  );
}
