'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getConReintentos } from '../services/httpRetry';
import BarcodeScannerModal from './BarcodeScannerModal';

// URL de la API — configurar NEXT_PUBLIC_API_URL en .env.local (vacío = proxy /backend)
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

// --- Tipos -------------------------------------------------------------------

interface Sucursal {
  idCentro: string;
  Sucursal: string;
}

interface ProductoBusqueda {
  CodigoBarras: string;
  Producto?: string;
  Descripcion?: string;
}

interface ProductoConsumido {
  idProdConsumido: number;
  Folio: string;
  idCentro: string;
  idColaborador: number;
  CodigoBarras: string;
  Cantidad: number;
  idUsuario: number;
  FechaRegistro: string;
  Comentario?: string;
  nombreColaborador?: string;
  nombreProducto?: string;
  nombreSucursal?: string;
}

// --- Estilos compartidos -----------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #dee2e6',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #ced4da',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box', minHeight: 44,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6c757d',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
};
const btnPrimary: React.CSSProperties = {
  background: '#2368b3', color: 'white', border: 'none', borderRadius: 8,
  padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44,
};
const btnSecondary: React.CSSProperties = {
  background: '#f8f9fa', color: '#2d3748', border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', minHeight: 44,
};
const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  border: 'none', borderRadius: '8px 8px 0 0',
  background: active ? '#fff' : '#f0f4f8',
  color: active ? '#2368b3' : '#718096',
  borderBottom: active ? '3px solid #2368b3' : '3px solid transparent',
});

const formatFechaHora = (fecha: string) => {
  if (!fecha) return '-';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// --- Componente --------------------------------------------------------------

export default function ProductosConsumidosContent() {
  const [activeTab, setActiveTab] = useState<'registrar' | 'listado'>('registrar');

  const [sucursalesAsignadas, setSucursalesAsignadas] = useState<Sucursal[]>([]);

  const [notif, setNotif] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null);
  const showNotif = (tipo: 'ok' | 'error', msg: string) => {
    setNotif({ tipo, msg });
    setTimeout(() => setNotif(null), 4500);
  };

  const getHeaders = () => ({
    Authorization: `Basic ${localStorage.getItem('userCredentials')}`,
    'Content-Type': 'application/json',
  });
  const getUserId = () => localStorage.getItem('userId') || '';

  const fetchSucursales = useCallback(async () => {
    try {
      const userId = getUserId();
      if (!userId) return;
      const res = await getConReintentos(() => axios.get(`${API_URL}/usuarios/${userId}`, { headers: getHeaders() }));
      if (res.data.estatus === 1 && res.data.sucursales) {
        setSucursalesAsignadas(res.data.sucursales);
        if (res.data.sucursales.length === 1) {
          setForm(f => ({ ...f, idCentro: res.data.sucursales[0].idCentro }));
        }
      }
    } catch {
      // ignorar
    }
  }, []);

  useEffect(() => { fetchSucursales(); }, [fetchSucursales]);

  // --- Registrar producto consumido -------------------------------------------

  const [form, setForm] = useState({ idCentro: '', idColaborador: '', Cantidad: '1', Comentario: '' });
  const [producto, setProducto] = useState<ProductoBusqueda | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sugerencias, setSugerencias] = useState<ProductoBusqueda[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [folioGenerado, setFolioGenerado] = useState<string | null>(null);

  const buscarProductos = (q: string) => {
    setSearchTerm(q);
    setProducto(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q || q.length < 2) { setSugerencias([]); return; }
    setLoadingProductos(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/productos/buscar?q=${encodeURIComponent(q)}`, { headers: getHeaders() });
        if (res.data.estatus === 1) setSugerencias(res.data.productos || []);
      } catch {
        // ignorar
      } finally {
        setLoadingProductos(false);
      }
    }, 300);
  };

  const seleccionarProducto = (p: ProductoBusqueda) => {
    setProducto(p);
    setSearchTerm(p.Producto || p.Descripcion || '');
    setSugerencias([]);
  };

  const handleBarcodeScanned = (codigo: string) => {
    setShowScanner(false);
    setSearchTerm(codigo);
    buscarProductos(codigo);
  };

  const resetForm = () => {
    setForm(f => ({ ...f, idColaborador: '', Cantidad: '1', Comentario: '' }));
    setProducto(null);
    setSearchTerm('');
    setSugerencias([]);
    setFolioGenerado(null);
  };

  const handleRegistrar = async () => {
    if (guardandoRef.current) return;
    if (!form.idCentro) { showNotif('error', 'Selecciona una sucursal.'); return; }
    if (!form.idColaborador.trim()) { showNotif('error', 'Ingresa el número de nómina del colaborador.'); return; }
    if (!producto) { showNotif('error', 'Busca y selecciona el producto a marcar.'); return; }
    const cantidad = parseFloat(form.Cantidad);
    if (!cantidad || cantidad <= 0) { showNotif('error', 'La cantidad debe ser mayor a 0.'); return; }

    guardandoRef.current = true;
    setGuardando(true);
    try {
      const body = {
        idCentro: form.idCentro,
        idColaborador: parseInt(form.idColaborador),
        CodigoBarras: producto.CodigoBarras,
        Cantidad: cantidad,
        idUsuario: parseInt(getUserId()) || 0,
        Comentario: form.Comentario.trim() || undefined,
      };
      const res = await axios.post(`${API_URL}/productos-consumidos`, body, { headers: getHeaders() });
      if (res.data.estatus === 1) {
        setFolioGenerado(res.data.Folio);
        showNotif('ok', res.data.mensaje || 'Producto marcado correctamente');
        if (activeTab === 'listado') fetchListado();
      } else {
        showNotif('error', res.data.mensaje || 'No se pudo registrar el producto.');
      }
    } catch (error) {
      let msg = 'Error al registrar el producto. Intenta nuevamente.';
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data as any;
        msg = data.mensaje || data.detail || msg;
      }
      showNotif('error', msg);
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  // --- Listado -----------------------------------------------------------------

  const [items, setItems] = useState<ProductoConsumido[]>([]);
  const [loadingListado, setLoadingListado] = useState(false);
  const [filtroCentro, setFiltroCentro] = useState('');
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [qInput, setQInput] = useState('');
  const [filtroQ, setFiltroQ] = useState('');
  const qTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const handleQChange = (value: string) => {
    setQInput(value);
    if (qTimeout.current) clearTimeout(qTimeout.current);
    qTimeout.current = setTimeout(() => {
      setOffset(0);
      setFiltroQ(value);
    }, 300);
  };

  const fetchListado = useCallback(async () => {
    setLoadingListado(true);
    try {
      const params: Record<string, string | number> = { limit, offset };
      if (filtroCentro) params.idCentro = filtroCentro;
      if (filtroColaborador) params.idColaborador = filtroColaborador;
      if (filtroQ) params.q = filtroQ;
      const res = await axios.get(`${API_URL}/productos-consumidos`, { headers: getHeaders(), params });
      if (res.data.estatus === 1) {
        setItems(res.data.items || []);
        setTotal(res.data.total ?? 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoadingListado(false);
    }
  }, [filtroCentro, filtroColaborador, filtroQ, limit, offset]);

  useEffect(() => {
    if (activeTab === 'listado') fetchListado();
  }, [activeTab, fetchListado]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {notif && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
          background: notif.tipo === 'ok' ? '#f0fff4' : '#fff5f5',
          color: notif.tipo === 'ok' ? '#276749' : '#c53030',
          border: `1px solid ${notif.tipo === 'ok' ? '#68d391' : '#fc8181'}`,
        }}>
          {notif.tipo === 'ok' ? '✅ ' : '❌ '}{notif.msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0' }}>
        <button style={tabStyle(activeTab === 'registrar')} onClick={() => setActiveTab('registrar')}>
          ➕ Registrar
        </button>
        <button style={tabStyle(activeTab === 'listado')} onClick={() => setActiveTab('listado')}>
          📋 Listado
        </button>
      </div>

      {activeTab === 'registrar' && (
        <div style={{ ...cardStyle, maxWidth: 560 }}>
          {folioGenerado ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40 }}>✅</div>
              <h3 style={{ margin: 0, color: '#2d3748' }}>Producto marcado correctamente</h3>
              <p style={{ margin: 0, color: '#718096', fontSize: 13 }}>
                Anota o imprime este folio y pégalo físicamente en el producto:
              </p>
              <div style={{
                background: '#f0f9ff', border: '2px dashed #2368b3', borderRadius: 12,
                padding: '20px 32px', fontFamily: 'monospace', fontSize: 32, fontWeight: 800,
                letterSpacing: 2, color: '#2368b3',
              }}>
                {folioGenerado}
              </div>
              <button style={btnPrimary} onClick={resetForm}>
                📦 Registrar otro producto
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Sucursal *</label>
                <select value={form.idCentro} onChange={e => setForm(f => ({ ...f, idCentro: e.target.value }))} style={inputStyle}>
                  <option value="">Selecciona una sucursal</option>
                  {sucursalesAsignadas.map(s => <option key={s.idCentro} value={s.idCentro}>{s.Sucursal}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Número de nómina del colaborador *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.idColaborador}
                  onChange={e => setForm(f => ({ ...f, idColaborador: e.target.value }))}
                  placeholder="Ingresa el número de nómina"
                  style={inputStyle}
                />
                <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                  Nómina del empleado dueño del producto que se está marcando.
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>🔍 Producto *</label>
                {producto ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #68d391', background: '#f0fff4', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#276749', fontSize: 14 }}>{producto.Producto || producto.Descripcion}</div>
                      <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2, fontFamily: 'monospace' }}>{producto.CodigoBarras}</div>
                    </div>
                    <button onClick={() => { setProducto(null); setSearchTerm(''); }}
                      style={{ background: '#e53e3e', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      ✕ Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => buscarProductos(e.target.value)}
                        placeholder="Buscar por nombre o código de barras..."
                        style={{ ...inputStyle, flex: 1, borderRadius: sugerencias.length > 0 || (searchTerm.length >= 2 && !loadingProductos) ? '8px 8px 0 0' : 8 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        aria-label="Escanear código de barras"
                        title="Escanear código de barras"
                        style={{ ...btnSecondary, padding: '10px 14px', minHeight: 44, flexShrink: 0 }}
                      >
                        📷
                      </button>
                    </div>
                    {searchTerm && (
                      <div style={{
                        border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px',
                        background: 'white', maxHeight: 200, overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'absolute', width: '100%', zIndex: 10,
                      }}>
                        {loadingProductos ? (
                          <div style={{ padding: 16, textAlign: 'center', color: '#718096', fontSize: 13 }}>🔍 Buscando productos...</div>
                        ) : sugerencias.length > 0 ? (
                          sugerencias.map(p => (
                            <div
                              key={p.CodigoBarras}
                              onClick={() => seleccionarProducto(p)}
                              style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f7fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f0fff4')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 600, color: '#2d3748', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.Producto || p.Descripcion}</div>
                                <div style={{ fontSize: 11, color: '#718096', fontFamily: 'monospace', marginTop: 2 }}>{p.CodigoBarras}</div>
                              </div>
                              <span style={{ background: '#2368b3', color: 'white', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>➕ Seleccionar</span>
                            </div>
                          ))
                        ) : searchTerm.length >= 2 ? (
                          <div style={{ padding: 16, textAlign: 'center', color: '#718096', fontSize: 13 }}>No se encontraron productos</div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label style={labelStyle}>Cantidad</label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={form.Cantidad}
                  onChange={e => setForm(f => ({ ...f, Cantidad: e.target.value }))}
                  style={{ ...inputStyle, maxWidth: 140 }}
                />
              </div>

              <div>
                <label style={labelStyle}>Comentario (opcional)</label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={form.Comentario}
                  onChange={e => setForm(f => ({ ...f, Comentario: e.target.value }))}
                  placeholder="Observaciones adicionales..."
                  style={{ ...inputStyle, resize: 'none', minHeight: 60 }}
                />
                <div style={{ textAlign: 'right', fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{form.Comentario.length}/200</div>
              </div>

              <button
                onClick={handleRegistrar}
                disabled={guardando}
                style={{ ...btnPrimary, opacity: guardando ? 0.6 : 1, alignSelf: 'flex-start' }}
              >
                {guardando ? 'Guardando...' : '✅ Marcar producto'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'listado' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...cardStyle, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 180 }}>
              <label style={labelStyle}>Sucursal</label>
              <select value={filtroCentro} onChange={e => { setOffset(0); setFiltroCentro(e.target.value); }} style={inputStyle}>
                <option value="">Todas</option>
                {sucursalesAsignadas.map(s => <option key={s.idCentro} value={s.idCentro}>{s.Sucursal}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 160 }}>
              <label style={labelStyle}>Nómina colaborador</label>
              <input
                type="text" inputMode="numeric"
                value={filtroColaborador}
                onChange={e => { setOffset(0); setFiltroColaborador(e.target.value); }}
                placeholder="Ej. 61574"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={labelStyle}>Búsqueda libre</label>
              <input
                type="text"
                value={qInput}
                onChange={e => handleQChange(e.target.value)}
                placeholder="Folio, código de barras o producto..."
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
                <thead>
                  <tr style={{ background: '#f7fafc' }}>
                    {['Folio', 'Sucursal', 'Colaborador', 'Producto', 'Cantidad', 'Fecha', 'Comentario'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#4a5568', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingListado ? (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#718096' }}>Cargando...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#a0aec0' }}>No hay productos consumidos registrados.</td></tr>
                  ) : (
                    items.map(item => (
                      <tr key={item.idProdConsumido} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#2368b3' }}>{item.Folio}</td>
                        <td style={{ padding: '10px 14px', color: '#2d3748' }}>{item.nombreSucursal || item.idCentro}</td>
                        <td style={{ padding: '10px 14px', color: '#2d3748', fontFamily: 'monospace' }}>{item.idColaborador}</td>
                        <td style={{ padding: '10px 14px', color: '#2d3748' }}>
                          {item.nombreProducto || '-'}
                          <div style={{ fontSize: 11, color: '#a0aec0', fontFamily: 'monospace' }}>{item.CodigoBarras}</div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#4a5568' }}>{item.Cantidad}</td>
                        <td style={{ padding: '10px 14px', color: '#718096', whiteSpace: 'nowrap' }}>{formatFechaHora(item.FechaRegistro)}</td>
                        <td style={{ padding: '10px 14px', color: '#718096', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.Comentario || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '14px 16px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#718096' }}>
                Mostrando {total === 0 ? 0 : offset + 1} - {Math.min(offset + limit, total)} de {total}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} style={{ ...btnSecondary, padding: '6px 14px', minHeight: 36, opacity: offset === 0 ? 0.5 : 1 }}>Anterior</button>
                <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} style={{ ...btnSecondary, padding: '6px 14px', minHeight: 36, opacity: offset + limit >= total ? 0.5 : 1 }}>Siguiente</button>
                <select value={limit} onChange={e => { setOffset(0); setLimit(Number(e.target.value)); }} style={{ ...inputStyle, minHeight: 36, width: 'auto' }}>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de escáner de código de barras */}
      {showScanner && (
        <BarcodeScannerModal
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
