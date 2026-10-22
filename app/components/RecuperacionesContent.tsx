'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { operationalGet, invalidateOperational } from '../services/operationalCache';
import CacheStatus from './CacheStatus';
import { getCachedProductSearch } from '../services/productCache';
import '../styles/recuperaciones.css';
import { getConReintentos } from '../services/httpRetry';
import { getCached } from '../services/apiCache';
import BarcodeScannerModal from './BarcodeScannerModal';
import { cardStyle, inputStyle, labelStyle, btnPrimary, btnSecondary, modalOverlay, modalContent as modalContentBase } from '../styles/sharedStyles';
import { useFocusTrap } from '../hooks/useFocusTrap';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

// --- Tipos -------------------------------------------------------------------

interface TipoRecuperacion {
  idTipoRecuperacion: number;
  Tipo: string;
}

interface Proveedor {
  idProveedor: number;
  proveedor: string; // campo que devuelve la API
}

interface ProductoBusqueda {
  CodigoBarras: string;
  Descripcion?: string;
  Producto?: string;
  Precio?: number;
}

interface ProductoFila {
  id: string; // clave única para la fila
  producto: ProductoBusqueda | null;
  searchTerm: string;
  sugerencias: ProductoBusqueda[];
  loadingSearch: boolean;
  cantidad: string;
}

interface Stats {
  totalImporte: number;
  totalEventos: number;
  porZona: { idZona: number; Zona: string; total: number; importe: number }[];
  porSucursal: { idCentro: string; Sucursal: string; total: number; importe: number }[];
  porProveedor: { idProveedor: number | null; proveedor: string | null; total: number; importe: number }[];
  porTipo: { idTipoRecuperacion: number; Tipo: string; total: number; importe: number }[];
  topProductos: { CodigoBarras: string; Producto: string; totalCantidad: number; importe: number }[];
  porMes: { mes: string; total: number }[];
}

// --- Estilos compartidos -----------------------------------------------------

// Este modal es ligeramente más ancho que el resto (más campos por fila).
const modalContent: React.CSSProperties = { ...modalContentBase, maxWidth: 620, maxHeight: '92vh' };

const formatMXN = (v: number | string) =>
  Number(v).toLocaleString('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

// --- Componente --------------------------------------------------------------

export default function RecuperacionesContent() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Modal nueva recuperación
  const [showModal, setShowModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const modalRef = useFocusTrap<HTMLDivElement>(showModal, () => setShowModal(false));

  // Catálogos
  const [tipos, setTipos] = useState<TipoRecuperacion[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [sucursalesAsignadas, setSucursalesAsignadas] = useState<{ idCentro: string; Sucursal: string }[]>([]);

  // Formulario
  const [form, setForm] = useState({
    idCentro: '',
    idTipoRecuperacion: '',
    idProveedor: '',
    nombreInfractor: '',
    comentario: '',
  });

  // Tabla de productos
  const [filas, setFilas] = useState<ProductoFila[]>([crearFila()]);
  const searchTimeouts = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [showScannerFor, setShowScannerFor] = useState<string | null>(null);

  // Notificación
  const [notif, setNotif] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null);
  const showNotif = (tipo: 'ok' | 'error', msg: string) => {
    setNotif({ tipo, msg });
    setTimeout(() => setNotif(null), 4500);
  };

  function crearFila(): ProductoFila {
    return { id: Math.random().toString(36).slice(2), producto: null, searchTerm: '', sugerencias: [], loadingSearch: false, cantidad: '1' };
  }

  const getHeaders = () => ({
    Authorization: `Basic ${localStorage.getItem('userCredentials')}`,
    'Content-Type': 'application/json',
  });
  const getUserId = () => localStorage.getItem('userId') || '';

  // --- Fetch inicial ----------------------------------------------------------

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await operationalGet(`${API_URL}/recuperaciones/stats`, { headers: getHeaders() });
      if (res.data.estatus === 1) setStats(res.data);
    } catch {
      // stats opcionales, no bloquear UI
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchSucursales = useCallback(async () => {
    try {
      const userId = getUserId();
      if (!userId) return;
      const data = await getCached(`sucursales_${userId}`, async () => {
        const res = await getConReintentos(() => axios.get(`${API_URL}/usuarios/${userId}`, { headers: getHeaders() }));
        return res.data;
      });
      if (data.estatus === 1 && data.sucursales) {
        setSucursalesAsignadas(data.sucursales);
        if (data.sucursales.length === 1) {
          setForm(f => ({ ...f, idCentro: data.sucursales[0].idCentro }));
        }
      }
    } catch { /* ignorar */ }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchSucursales();
  }, [fetchStats, fetchSucursales]);

  // --- Cargar catálogos al abrir modal ----------------------------------------

  const abrirModal = async () => {
    setShowModal(true);
    setFilas([crearFila()]);
    setForm(f => ({ ...f, idTipoRecuperacion: '', idProveedor: '', nombreInfractor: '', comentario: '' }));
    try {
      const data = await getCached('tipos_recuperacion', async () => {
        const res = await axios.get(`${API_URL}/catalogos/tipos-recuperacion`, { headers: getHeaders() });
        return res.data;
      });
      if (data.estatus === 1) setTipos(data.tipos || data.data || []);
    } catch { /* ignorar */ }
  };

  // Cargar proveedores cuando cambia el tipo o la sucursal
  useEffect(() => {
    const tipoId = parseInt(form.idTipoRecuperacion);
    if (tipoId === 1) {
      const params = form.idCentro ? `?idCentro=${form.idCentro}` : '?limit=100&offset=0';
      // Intentar disponibles, si falla usar listado general
      getCached(`proveedores_disponibles:${params}`, async () =>
        (await axios.get(`${API_URL}/proveedores/disponibles${params}`, { headers: getHeaders() })).data)
        .then(data => {
          const lista = data.items || data.proveedores || data.data || [];
          if (lista.length > 0) { setProveedores(lista); return; }
          throw new Error('empty');
        })
        .catch(() => {
          getCached('proveedores:limit=100&offset=0', async () =>
            (await axios.get(`${API_URL}/proveedores?limit=100&offset=0`, { headers: getHeaders() })).data)
            .then(data => setProveedores(data.items || data.proveedores || []))
            .catch(() => {});
        });
    }
  }, [form.idTipoRecuperacion, form.idCentro]);

  // --- Búsqueda de productos --------------------------------------------------

  const buscarProducto = (filaId: string, q: string) => {
    setFilas(prev => prev.map(f => f.id === filaId ? { ...f, searchTerm: q, sugerencias: [], producto: null } : f));
    if (searchTimeouts.current![filaId]) clearTimeout(searchTimeouts.current![filaId]);
    if (!q || q.length < 2) return;

    setFilas(prev => prev.map(f => f.id === filaId ? { ...f, loadingSearch: true } : f));
    searchTimeouts.current![filaId] = setTimeout(async () => {
      try {
        const res = await getCachedProductSearch(q);
        const lista: ProductoBusqueda[] = res.data.estatus === 1
          ? (res.data.productos || [])
          : (res.data.items || []);
        setFilas(prev => prev.map(f => f.id === filaId ? { ...f, sugerencias: lista, loadingSearch: false } : f));
      } catch {
        setFilas(prev => prev.map(f => f.id === filaId ? { ...f, loadingSearch: false } : f));
      }
    }, 300);
  };

  const seleccionarProducto = (filaId: string, p: ProductoBusqueda) => {
    setFilas(prev => prev.map(f =>
      f.id === filaId ? { ...f, producto: p, searchTerm: (p.Producto || p.Descripcion || ''), sugerencias: [] } : f
    ));
  };

  // Maneja el código escaneado con la cámara para una fila específica
  const handleBarcodeScanned = (codigo: string) => {
    const filaId = showScannerFor;
    setShowScannerFor(null);
    if (filaId) buscarProducto(filaId, codigo);
  };

  const agregarFila = () => setFilas(prev => [...prev, crearFila()]);
  const eliminarFila = (id: string) => setFilas(prev => prev.filter(f => f.id !== id));

  // --- Guardar recuperación --------------------------------------------------

  const handleGuardar = async () => {
    if (guardandoRef.current) return;
    if (!form.idCentro) { showNotif('error', 'Selecciona una sucursal.'); return; }
    if (!form.idTipoRecuperacion) { showNotif('error', 'Selecciona un tipo de recuperación.'); return; }
    const tipoId = parseInt(form.idTipoRecuperacion);
    if (tipoId === 1 && !form.idProveedor) { showNotif('error', 'Selecciona un proveedor.'); return; }
    if (tipoId !== 1 && !form.nombreInfractor.trim()) { showNotif('error', 'Ingresa el nombre del infractor.'); return; }

    const productosValidos = filas.filter(f => f.producto && parseFloat(f.cantidad) > 0);
    if (productosValidos.length === 0) { showNotif('error', 'Agrega al menos un producto con cantidad válida.'); return; }

    guardandoRef.current = true;
    setGuardando(true);
    try {
      const body: Record<string, unknown> = {
        idCentro: form.idCentro,
        idTipoRecuperacion: tipoId,
        comentario: form.comentario || undefined,
        idUsuario: parseInt(getUserId()) || 0,
        productos: productosValidos.map(f => ({
          CodigoBarras: f.producto!.CodigoBarras,
          cantidad: parseFloat(f.cantidad),
        })),
      };
      if (tipoId === 1) body.idProveedor = parseInt(form.idProveedor);
      else body.nombreInfractor = form.nombreInfractor.trim();

      const res = await axios.post(`${API_URL}/recuperaciones`, body, { headers: getHeaders() });
      if (res.data.estatus === 1) {
        showNotif('ok', `✅ Recuperación registrada (ID: ${res.data.id}).`);
        await invalidateOperational(['recuperaciones', 'dashboard']);
        setShowModal(false);
        fetchStats();
      } else {
        showNotif('error', res.data.mensaje || 'Error al guardar.');
      }
    } catch (err: any) {
      showNotif('error', err?.response?.data?.detail || err?.response?.data?.mensaje || 'Error al conectar con el servidor.');
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const tipoSeleccionado = parseInt(form.idTipoRecuperacion);
  const esProveedor = tipoSeleccionado === 1;

  // --- Render -----------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CacheStatus domain="recuperaciones" onRefresh={fetchStats} />

      {/* Notificación toast */}
      {notif && (
        <div style={{
          position: 'fixed', top: 24, left: isMobile ? 16 : 'auto', right: isMobile ? 16 : 24,
          zIndex: 9999, padding: '12px 20px', borderRadius: 10, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          background: notif.tipo === 'ok' ? '#c6f6d5' : '#fed7d7',
          color:      notif.tipo === 'ok' ? '#276749' : '#c53030',
          border:     notif.tipo === 'ok' ? '1.5px solid #68d391' : '1.5px solid #fc8181',
          fontSize: 14,
        }}>
          {notif.msg}
        </div>
      )}

      {/* Encabezado */}
      <div style={{ ...cardStyle, padding: isMobile ? '16px 14px' : 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#2d3748', fontSize: isMobile ? 17 : 20, fontWeight: 700 }}>
              🔄 Recuperaciones
            </h3>
            {!isMobile && <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>Registro y seguimiento de recuperaciones por tipo de evento</p>}
          </div>
          <button style={{ ...btnPrimary, fontSize: isMobile ? 13 : 14, padding: isMobile ? '8px 14px' : '10px 20px' }} onClick={abrirModal}>
            + Nueva recuperación
          </button>
        </div>
      </div>

      {/* Tarjetas de Stats */}
      {loadingStats ? (
        <div style={{ ...cardStyle, padding: 32, textAlign: 'center', color: '#718096' }}>Cargando estadísticas...</div>
      ) : stats ? (
        <>
          {/* KPIs principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { title: 'Total eventos', value: stats.totalEventos.toString(), icon: '📋', color: '#2368b3', bg: 'rgba(35,104,179,0.08)' },
              { title: 'Importe total', value: formatMXN(stats.totalImporte), icon: '💰', color: '#276749', bg: 'rgba(39,103,73,0.08)' },
            ].map(s => (
              <div key={s.title} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, color: '#2d3748', fontSize: 14 }}>{s.title}</span>
                  <div style={{ background: s.bg, borderRadius: 8, padding: 8, fontSize: 18, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Por tipo */}
          {stats.porTipo?.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ margin: '0 0 16px 0', color: '#2d3748', fontSize: 15, fontWeight: 600 }}>📊 Por tipo de recuperación</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.porTipo.map(t => {
                  const pct = stats.totalEventos > 0 ? Math.round((t.total / stats.totalEventos) * 100) : 0;
                  return (
                    <div key={t.idTipoRecuperacion}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#2d3748' }}>{t.Tipo}</span>
                        <span style={{ color: '#718096' }}>{t.total} eventos · {formatMXN(t.importe)}</span>
                      </div>
                      <div style={{ background: '#e2e8f0', borderRadius: 4, height: 8 }}>
                        <div style={{ background: '#2368b3', borderRadius: 4, height: 8, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            {/* Por zona */}
            {stats.porZona?.length > 0 && (
              <div style={cardStyle}>
                <h4 style={{ margin: '0 0 12px 0', color: '#2d3748', fontSize: 15, fontWeight: 600 }}>🗺️ Por zona</h4>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 320 }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      {['Zona', 'Eventos', 'Importe'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#4a5568', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.porZona.map(z => (
                      <tr key={z.idZona} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px 10px', color: '#2d3748', fontWeight: 500 }}>{z.Zona}</td>
                        <td style={{ padding: '8px 10px', color: '#4a5568' }}>{z.total}</td>
                        <td style={{ padding: '8px 10px', color: '#276749', fontWeight: 600 }}>{formatMXN(z.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {/* Top proveedores */}
            {stats.porProveedor?.length > 0 && (
              <div style={cardStyle}>
                <h4 style={{ margin: '0 0 12px 0', color: '#2d3748', fontSize: 15, fontWeight: 600 }}>🏢 Top proveedores</h4>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 320 }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      {['Proveedor', 'Eventos', 'Importe'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#4a5568', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.porProveedor.slice(0, 10).map((p, idx) => (
                      <tr key={p.idProveedor ?? `sin-proveedor-${idx}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px 10px', color: p.proveedor ? '#2d3748' : '#a0aec0', fontWeight: 500, fontStyle: p.proveedor ? 'normal' : 'italic' }}>{p.proveedor ?? 'Sin proveedor / Infractor'}</td>
                        <td style={{ padding: '8px 10px', color: '#4a5568' }}>{p.total}</td>
                        <td style={{ padding: '8px 10px', color: '#276749', fontWeight: 600 }}>{formatMXN(p.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>

          {/* Top productos */}
          {stats.topProductos?.length > 0 && (
            <div className="recuperaciones-top-productos" style={{ ...cardStyle, minWidth: 0 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#2d3748', fontSize: 15, fontWeight: 600 }}>📦 Top productos recuperados</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 400 }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      {['Producto', 'Código', 'Cantidad', 'Importe'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#4a5568', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topProductos.slice(0, 10).map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td data-label="Producto" style={{ padding: '8px 12px', color: '#2d3748', fontWeight: 500 }}>{p.Producto}</td>
                        <td data-label="Código" style={{ padding: '8px 12px', color: '#a0aec0', fontFamily: 'monospace', fontSize: 11 }}>{p.CodigoBarras}</td>
                        <td data-label="Cantidad" style={{ padding: '8px 12px', color: '#4a5568' }}>{p.totalCantidad} pzs</td>
                        <td data-label="Importe" style={{ padding: '8px 12px', color: '#276749', fontWeight: 600 }}>{formatMXN(p.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Por mes */}
          {stats.porMes?.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ margin: '0 0 16px 0', color: '#2d3748', fontSize: 15, fontWeight: 600 }}>📅 Eventos por mes</h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', overflowX: 'auto', paddingBottom: 8 }}>
                {(() => {
                  const maxTotal = Math.max(...stats.porMes.map(m => m.total), 1);
                  return stats.porMes.map((m, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#2368b3' }}>{m.total}</span>
                      <div style={{
                        width: 36, background: '#2368b3', borderRadius: '4px 4px 0 0',
                        height: Math.max(8, Math.round((m.total / maxTotal) * 100)),
                        opacity: 0.7 + (i / stats.porMes.length) * 0.3,
                      }} />
                      <span style={{ fontSize: 10, color: '#a0aec0', whiteSpace: 'nowrap' }}>{m.mes.slice(5)}/{m.mes.slice(2, 4)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Por sucursal */}
          {stats.porSucursal?.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ margin: '0 0 12px 0', color: '#2d3748', fontSize: 15, fontWeight: 600 }}>🏪 Por sucursal (top 20)</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 380 }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      {['Sucursal', 'Clave', 'Eventos', 'Importe'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#4a5568', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.porSucursal.slice(0, 20).map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px 12px', color: '#2d3748', fontWeight: 500 }}>{s.Sucursal}</td>
                        <td style={{ padding: '8px 12px', color: '#a0aec0', fontFamily: 'monospace', fontSize: 11 }}>{s.idCentro}</td>
                        <td style={{ padding: '8px 12px', color: '#4a5568' }}>{s.total}</td>
                        <td style={{ padding: '8px 12px', color: '#276749', fontWeight: 600 }}>{formatMXN(s.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ ...cardStyle, padding: 32, textAlign: 'center', color: '#a0aec0' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin datos de estadísticas</div>
          <div style={{ fontSize: 13 }}>Registra la primera recuperación para ver el dashboard</div>
        </div>
      )}

      {/* ── MODAL: Nueva recuperación ─────────────────────────────────── */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent} ref={modalRef} role="dialog" aria-modal="true" aria-label="Nueva recuperación" tabIndex={-1}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#2368b3', fontSize: 18, fontWeight: 700 }}>🔄 Nueva Recuperación</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#a0aec0', lineHeight: 1, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Sucursal */}
              <div>
                <label style={labelStyle}>Sucursal *</label>
                <select value={form.idCentro} onChange={e => setForm(f => ({ ...f, idCentro: e.target.value }))} style={inputStyle}>
                  <option value="">Selecciona una sucursal</option>
                  {sucursalesAsignadas.map(s => <option key={s.idCentro} value={s.idCentro}>{s.Sucursal}</option>)}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label style={labelStyle}>Tipo de recuperación *</label>
                <select value={form.idTipoRecuperacion} onChange={e => setForm(f => ({ ...f, idTipoRecuperacion: e.target.value, idProveedor: '', nombreInfractor: '' }))} style={inputStyle}>
                  <option value="">Selecciona un tipo</option>
                  {tipos.map(t => <option key={t.idTipoRecuperacion} value={t.idTipoRecuperacion}>{t.Tipo}</option>)}
                </select>
              </div>

              {/* Proveedor (solo si tipo = 1) */}
              {esProveedor && (
                <div>
                  <label style={labelStyle}>Proveedor *</label>
                  {proveedores.length > 0 ? (
                    <select value={form.idProveedor} onChange={e => setForm(f => ({ ...f, idProveedor: e.target.value }))} style={inputStyle}>
                      <option value="">Selecciona un proveedor</option>
                      {proveedores.map(p => <option key={p.idProveedor} value={p.idProveedor}>{p.proveedor}</option>)}
                    </select>
                  ) : (
                    <div style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6, color: '#a0aec0', fontSize: 13 }}>
                      Cargando proveedores...
                    </div>
                  )}
                </div>
              )}

              {/* Nombre infractor (tipo ≠ 1) */}
              {form.idTipoRecuperacion && !esProveedor && (
                <div>
                  <label style={labelStyle}>Nombre del infractor *</label>
                  <input
                    type="text"
                    placeholder="Nombre completo del infractor"
                    value={form.nombreInfractor}
                    onChange={e => setForm(f => ({ ...f, nombreInfractor: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Comentario */}
              <div>
                <label style={labelStyle}>Comentario (opcional)</label>
                <textarea
                  rows={2}
                  maxLength={255}
                  placeholder="Descripción del evento..."
                  value={form.comentario}
                  onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none', minHeight: 70 }}
                />
                <div style={{ textAlign: 'right', fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{form.comentario.length}/255</div>
              </div>

              {/* Tabla de productos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={labelStyle}>Productos * (mínimo 1)</label>
                  <button onClick={agregarFila} style={{ background: '#f0fff4', color: '#276749', border: '1px solid #68d391', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    + Agregar fila
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filas.map((fila, idx) => (
                    <div key={fila.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 160, position: 'relative' }}>
                          <label style={{ ...labelStyle, fontSize: 11 }}>Producto #{idx + 1}</label>
                          {fila.producto ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #68d391', background: '#f0fff4', borderRadius: 6, padding: '8px 10px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: '#276749', fontSize: 13 }}>{fila.producto.Producto || fila.producto.Descripcion}</div>
                                <div style={{ fontSize: 11, color: '#4a5568', fontFamily: 'monospace' }}>{fila.producto.CodigoBarras}</div>
                              </div>
                              <button onClick={() => setFilas(prev => prev.map(f => f.id === fila.id ? { ...f, producto: null, searchTerm: '' } : f))}
                                style={{ background: '#e53e3e', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                  type="text"
                                  placeholder="Buscar por nombre o código..."
                                  value={fila.searchTerm}
                                  onChange={e => buscarProducto(fila.id, e.target.value)}
                                  style={{ ...inputStyle, flex: 1, borderRadius: fila.sugerencias.length > 0 ? '6px 6px 0 0' : 6 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowScannerFor(fila.id)}
                                  aria-label="Escanear código de barras"
                                  title="Escanear código de barras"
                                  style={{ ...btnSecondary, padding: '8px 12px', minHeight: 44, flexShrink: 0 }}
                                >
                                  📷
                                </button>
                              </div>
                              {fila.searchTerm && (
                                <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 6px 6px', background: 'white', maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 8px rgba(0,0,0,0.08)', position: 'absolute', width: '100%', zIndex: 10 }}>
                                  {fila.loadingSearch ? (
                                    <div style={{ padding: 12, color: '#718096', fontSize: 13 }}>🔍 Buscando...</div>
                                  ) : fila.sugerencias.length > 0 ? (
                                    fila.sugerencias.map(p => (
                                      <button key={p.CodigoBarras} type="button" onClick={() => seleccionarProducto(fila.id, p)}
                                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'white', border: 'none', borderBottom: '1px solid #f7fafc', padding: '8px 12px', cursor: 'pointer', font: 'inherit' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f0fff4')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                                        <div style={{ fontWeight: 600, color: '#2d3748', fontSize: 13 }}>{p.Producto || p.Descripcion}</div>
                                        <div style={{ fontSize: 11, color: '#718096', fontFamily: 'monospace' }}>{p.CodigoBarras}</div>
                                      </button>
                                    ))
                                  ) : fila.searchTerm.length >= 2 ? (
                                    <div style={{ padding: 12, color: '#718096', fontSize: 13 }}>Sin resultados</div>
                                  ) : null}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div style={{ width: 90 }}>
                          <label style={{ ...labelStyle, fontSize: 11 }}>Cantidad</label>
                          <input
                            type="number" inputMode="decimal" min="0.01" step="0.01"
                            value={fila.cantidad}
                            onChange={e => setFilas(prev => prev.map(f => f.id === fila.id ? { ...f, cantidad: e.target.value } : f))}
                            style={{ ...inputStyle, textAlign: 'center' }}
                          />
                        </div>

                        {filas.length > 1 && (
                          <div style={{ paddingTop: 22 }}>
                            <button onClick={() => eliminarFila(fila.id)}
                              style={{ background: '#fff5f5', color: '#c53030', border: '1px solid #fc8181', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', minHeight: 44, fontSize: 16 }}>
                              🗑
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setShowModal(false)} disabled={guardando} style={{ ...btnSecondary, opacity: guardando ? 0.6 : 1 }}>Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} style={{ ...btnPrimary, opacity: guardando ? 0.6 : 1 }}>
                {guardando ? 'Guardando...' : '✅ Guardar recuperación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de escáner de código de barras */}
      {showScannerFor && (
        <BarcodeScannerModal
          onScan={handleBarcodeScanned}
          onClose={() => setShowScannerFor(null)}
        />
      )}
    </div>
  );
}
