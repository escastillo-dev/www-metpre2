'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

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
  sucursales?: Array<{
    idCentro: string;
    Sucursales: string;
  }>;
  sucursales: Sucursal[];
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
        'http://127.0.0.1:8000/mmv/movimientos',
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

      const response = await axios.get<UsuarioResponse>(`http://127.0.0.1:8000/usuarios/${userId}`, {
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

      const response = await axios.get('http://127.0.0.1:8000/Incidencias', {
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
      let url = `http://127.0.0.1:8000/mmv/movimientos?limit=${limit}&offset=${offset}`;
      
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
        // Convertimos los nombres de las sucursales asignadas a un Set para búsqueda eficiente
        const sucursalesPermitidas = new Set(sucursalesAsignadas.map(s => s.Sucursal));
        
        // Procesamos los movimientos
        const movimientosProcesados = response.data.items
          .filter(movimiento => {
            // Verificar si la sucursal del movimiento está en las asignadas
            return sucursalesPermitidas.has(movimiento.Sucursales);
          })
          .map(movimiento => ({
            folio: movimiento.Folio,
            sucursal: movimiento.Sucursales,
            fecha: movimiento.Fecha,
            hora: movimiento.Hora,
            movimiento: movimiento.Movimiento,
            incidencia: movimiento.Incidencia,
            tipoSF: movimiento.TipoSF,
            importe: movimiento.Importe
          }));
      
        setMovimientos(movimientosProcesados);
        setTotal(movimientosProcesados.length); // Actualizamos el total solo con los movimientos permitidos
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
    <div style={{
      width: "100%",
      height: "100vh",
      padding: "2rem",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      overflowY: "auto"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
      }}>
        <h3 style={{ color: "white", fontSize: "1.5rem", fontWeight: "600" }}>Manejo de Valores</h3>
        <button
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#f5942b",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "background-color 0.2s",
          }}
          onClick={() => setShowModal(true)}
        >
          <span style={{ fontSize: "1.25rem" }}>💰</span>
          Registrar Movimiento
        </button>
      </div>
      
      {/* Filtros */}
      <div className="search-section" style={{
        background: "rgba(255, 255, 255, 0.95)",
        padding: "1.5rem",
        borderRadius: "12px",
        marginBottom: "1.5rem",
        boxShadow: "0 5px 15px rgba(0, 0, 0, 0.08)"
      }}>
        <h4 style={{ marginBottom: "1rem" }}>Filtros de Búsqueda</h4>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          alignItems: "end"
        }}>
          <div>
            <label className="form-label">Fecha</label>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="form-input"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "0.375rem"
              }}
            />
          </div>
          <div>
            <label className="form-label">Folio</label>
            <input
              type="number"
              value={folioFiltro}
              onChange={(e) => setFolioFiltro(e.target.value)}
              className="form-input"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "0.375rem"
              }}
              min="1"
            />
          </div>
          <div>
            <label className="form-label">Sucursal</label>
            <select
              value={sucursalFiltro}
              onChange={(e) => setSucursalFiltro(e.target.value)}
              className="form-input"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "0.375rem",
                backgroundColor: "white"
              }}
            >
              <option value="">Todas las sucursales asignadas</option>
              {sucursalesAsignadas
                .sort((a, b) => a.Sucursal.localeCompare(b.Sucursal))
                .map((sucursal) => (
                  <option key={sucursal.idCentro} value={sucursal.idCentro}>
                    {sucursal.Sucursal}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <button
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: "500",
              marginRight: "0.5rem"
            }}
            onClick={() => {
              setOffset(0); // Resetear la paginación
              fetchMovimientos();
            }}
          >
            Buscar
          </button>
          <button
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#718096",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: "500"
            }}
            onClick={() => {
              setFechaFiltro('');
              setFolioFiltro('');
              setSucursalFiltro('');
              setOffset(0);
              fetchMovimientos();
            }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Lista de movimientos */}
      <div style={{
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 5px 15px rgba(0, 0, 0, 0.08)",
        width: "100%"
      }}>
        <div style={{ 
          padding: "1rem", 
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Total de registros: {total}</h3>
        </div>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse"
          }}>
            <thead>
              <tr>
                <th style={{ padding: "1rem", textAlign: "left", background: "#f7fafc", fontWeight: 600, color: "#4a5568", whiteSpace: "nowrap" }}>Folio</th>
                <th style={{ padding: "1rem", textAlign: "left", background: "#f7fafc", fontWeight: 600, color: "#4a5568", whiteSpace: "nowrap" }}>Sucursal</th>
                <th style={{ padding: "1rem", textAlign: "left", background: "#f7fafc", fontWeight: 600, color: "#4a5568", whiteSpace: "nowrap" }}>Fecha</th>
                <th style={{ padding: "1rem", textAlign: "left", background: "#f7fafc", fontWeight: 600, color: "#4a5568", whiteSpace: "nowrap" }}>Hora</th>
                <th style={{ padding: "1rem", textAlign: "left", background: "#f7fafc", fontWeight: 600, color: "#4a5568", whiteSpace: "nowrap" }}>Movimiento</th>
                <th style={{ padding: "1rem", textAlign: "left", background: "#f7fafc", fontWeight: 600, color: "#4a5568" }}>Incidencia</th>
                <th style={{ padding: "1rem", textAlign: "left", background: "#f7fafc", fontWeight: 600, color: "#4a5568", whiteSpace: "nowrap" }}>Tipo SF</th>
                <th style={{ padding: "1rem", textAlign: "left", background: "#f7fafc", fontWeight: 600, color: "#4a5568", whiteSpace: "nowrap" }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((movimiento) => (
                <tr key={movimiento.folio} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>{movimiento.folio}</td>
                  <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>{movimiento.sucursal}</td>
                  <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                    {movimiento.fecha
                    ? movimiento.fecha.slice(0, 10).split('-').reverse().join('/')
                    : 'N/A'}
                  </td>
                  <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>{movimiento.hora || 'N/A'}</td>
                  <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>{movimiento.movimiento || 'N/A'}</td>
                  <td style={{ padding: "1rem" }}>{movimiento.incidencia || 'Sin incidencia'}</td>
                  <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>{movimiento.tipoSF || 'N/A'}</td>
                  <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                    {movimiento.importe ? `$${movimiento.importe.toFixed(2)}` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
        <div className="pagination-container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: 'white',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div className="pagination-info" style={{ color: '#4a5568' }}>
            Mostrando {offset + 1} - {Math.min(offset + limit, total)} de {total} movimientos
          </div>
          <div className="pagination-controls" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                backgroundColor: offset === 0 ? '#f7fafc' : 'white',
                color: offset === 0 ? '#a0aec0' : '#2368b3',
                cursor: offset === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                backgroundColor: offset + limit >= total ? '#f7fafc' : 'white',
                color: offset + limit >= total ? '#a0aec0' : '#2368b3',
                cursor: offset + limit >= total ? 'not-allowed' : 'pointer',
              }}
            >
              Siguiente
            </button>
          </div>
          <div className="pagination-size" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="limit" style={{ color: '#4a5568' }}>Mostrar:</label>
            <select
              id="limit"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setOffset(0); // Resetear a la primera página cuando se cambia el límite
              }}
              style={{
                padding: '0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
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