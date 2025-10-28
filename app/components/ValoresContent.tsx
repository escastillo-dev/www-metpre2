'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import ValoresTable from './ValoresTable';
import ValoresModal from './ValoresModal';
import '../styles/forms.css';
import '../dashboard/dashboard.css';

// URL de la API - usar variable de entorno o fallback a localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
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
    const userCredentials = localStorage.getItem('userCredentials');
    const userId = localStorage.getItem('userId');
    
    if (!userCredentials || !userId) {
      setError('No se encontraron las credenciales del usuario');
      return;
    }

    try {
      // La hora ya viene en formato HH:MM, solo agregamos segundos
      let hora = formData.hora;
      if (hora && hora.length === 5) {
        hora = hora + ':00';
      }
      const response = await axios.post(
        `${API_URL}/mmv/movimientos`,
        {
          ...formData,
          idUsuarios: parseInt(userId),
          hora: hora,
          caja: formData.caja ? Number(formData.caja) : 0,
          cajero: formData.cajero ? Number(formData.cajero) : 0,
          anfitrion: formData.anfitrion ? Number(formData.anfitrion) : 0,
          sfMonto: formData.sfMonto ? Number(formData.sfMonto) : 0
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
  
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [folioFiltro, setFolioFiltro] = useState('');
  const [sucursalFiltro, setSucursalFiltro] = useState('');

  const fetchSucursalesAsignadas = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      const userId = localStorage.getItem('userId');
      
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
        } else {
          setError('No hay sucursales asignadas para este usuario');
        }
      } else {
        setError(response.data.mensaje || 'Error al obtener la información de las sucursales');
      }
    } catch (error) {
      setError('Error al obtener las sucursales asignadas');
    } finally {
      setLoading(false);
    }
  };

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
    fetchSucursalesAsignadas();
    fetchIncidencias();
  }, []);

  useEffect(() => {
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

      let url = `${API_URL}/mmv/movimientos?limit=${limit}&offset=${offset}`;
      
      const sucursalesIds = sucursalesAsignadas.map(s => s.idCentro).join(',');
      url += `&sucursales=${sucursalesIds}`;

      if (fechaFiltro) {
        url += `&fecha=${fechaFiltro}`;
      }
      if (folioFiltro) {
        url += `&folio=${folioFiltro}`;
      }
      if (sucursalFiltro && sucursalesAsignadas.some(s => s.idCentro === sucursalFiltro)) {
        url += `&idCentro=${sucursalFiltro}`;
      }

      const response = await axios.get<MovimientosResponse>(url, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.estatus === 1 && Array.isArray(response.data.items)) {
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
        setTotal(movimientosFiltrados.length); // Usar el total filtrado en lugar del total del servidor
      } else {
        setError('Error al obtener los movimientos: formato de datos inválido');
      }
    } catch (error) {
      setError('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <h1>Manejo de Valores</h1>
        <button 
          onClick={() => setShowModal(true)}
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

      {/* Tabla de movimientos */}
      <div style={{ overflowX: 'auto' }}>
        <ValoresTable movimientos={movimientos} />
      </div>

      {/* Paginación */}
      <div style={{ 
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          Mostrando {movimientos.length} de {total} registros
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
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
      />
    </div>
  );
}
