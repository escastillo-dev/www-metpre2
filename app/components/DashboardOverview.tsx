'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { getConReintentos } from '../services/httpRetry';
import { useAuth } from '../context';

// URL de la API — configurar NEXT_PUBLIC_API_URL en .env.local (vacío = proxy /backend)
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// --- Tipos ---------------------------------------------------------------

interface Sucursal {
  idCentro: string;
  Sucursal: string;
}

interface Zona {
  idZona: number;
  Zona: string;
}

interface ResumenResponse {
  estatus: number;
  mensaje: string;
  fechaInicio: string;
  fechaFin: string;
  merma: { totalEventos: number; totalImporte: number };
  recuperaciones: { totalEventos: number; totalImporte: number };
  caducidad: { criticos: number; urgentes: number; proximos: number; cerrados: number };
  manejoValores: { foliosAbiertos: number; foliosCerrados: number; totalMovimientos: number };
}

interface GraficasResponse {
  estatus: number;
  mensaje: string;
  mermaVsRecuperaciones: { mes: string; merma: number; recuperaciones: number }[];
  topProductosMerma: { CodigoBarras: string; Producto: string | null; totalCantidad: number; importe: number }[];
  topProductosRecuperacion: { CodigoBarras: string; Producto: string | null; totalCantidad: number; importe: number }[];
  caducidadPorZona: { idZona: number; Zona: string | null; criticos: number; urgentes: number; proximos: number }[];
  mermaPorMotivo: { idMotMer: number; Motivo: string | null; totalEventos: number; importe: number }[];
  recuperacionPorTipo: { idTipoRecuperacion: number; Tipo: string | null; totalEventos: number; importe: number }[];
}

interface Filtros {
  fecha_inicio: string;
  fecha_fin: string;
  idCentro: string;
  idZona: string;
}

interface DashboardOverviewProps {
  /** Reservado por si en el futuro se requiere mostrar/ocultar controles puntuales según el nivel del usuario. */
  userLevel?: string;
}

// --- Helpers ---------------------------------------------------------------

const MESES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatMes(mesStr: string): string {
  if (!mesStr || !mesStr.includes('-')) return mesStr || '';
  const [y, m] = mesStr.split('-');
  const idx = parseInt(m, 10) - 1;
  const abbr = MESES_ABBR[idx] ?? m;
  return `${abbr} ${y.slice(2)}`;
}

function truncar(str: string | null | undefined, n = 25): string {
  const val = str || 'Sin nombre';
  return val.length > n ? `${val.slice(0, n - 1)}…` : val;
}

const currencyFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const formatMXN = (v: number) => currencyFmt.format(v || 0);

function getDefaultDates(): { fecha_inicio: string; fecha_fin: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { fecha_inicio: toISO(first), fecha_fin: toISO(now) };
}

const getHeaders = () => ({
  Authorization: `Basic ${localStorage.getItem('userCredentials')}`,
  'Content-Type': 'application/json',
});
// Paletas de color
const COLOR_MERMA = '#f26722';
const COLOR_RECUPERACION = '#38a169';
const COLOR_CRITICO = '#e53e3e';
const COLOR_URGENTE = '#ed8936';
const COLOR_PROXIMO = '#ecc94b';
const COLOR_CERRADO = '#a0aec0';
const COLOR_VALORES = '#2368b3';

const SHADES_ORANGE = ['#f26722', '#f4813f', '#f6995e', '#f8b17d', '#fac99c', '#fce1bb', '#feefda'];
const SHADES_GREEN = ['#276749', '#2f855a', '#38a169', '#48bb78', '#68d391', '#9ae6b4', '#c6f6d5'];

// --- Componentes de UI reutilizables -----------------------------------------

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 20,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
};

const Skeleton: React.FC<{ height?: number; width?: string }> = ({ height = 20, width = '100%' }) => (
  <div className="animate-pulse" style={{ height, width, background: '#e2e8f0', borderRadius: 6 }} />
);

const ErrorBox: React.FC<{ msg: string }> = ({ msg }) => (
  <div style={{
    background: '#fed7d7', color: '#c53030', border: '1px solid #fc8181',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500,
  }}>
    ⚠️ {msg}
  </div>
);

function EmptyState() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 200, color: '#a0aec0', fontSize: 14, fontWeight: 500,
    }}>
      No hay datos disponibles
    </div>
  );
}

/** Gráfica de dona con leyenda lateral que muestra el porcentaje de cada segmento */
function DonutConLeyenda({ labels, data, colors, tooltipPrefix }: {
  labels: string[]; data: number[]; colors: string[]; tooltipPrefix?: string;
}) {
  const total = data.reduce((s, v) => s + v, 0);
  if (labels.length === 0) return <EmptyState />;

  const chartData = {
    labels,
    datasets: [{ data, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }],
  };
  const options = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const value = ctx.raw || 0;
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${tooltipPrefix ?? ''}${ctx.label}: ${formatMXN(value)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 200px', height: 240, position: 'relative', minWidth: 200 }}>
        <Doughnut data={chartData} options={options} />
      </div>
      <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
        {labels.map((label, i) => {
          const value = data[i] || 0;
          const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
          return (
            <div key={`${label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: colors[i % colors.length], flexShrink: 0 }} />
              <span style={{ color: '#4a5568', flex: 1 }}>{label}</span>
              <span style={{ color: '#2d3748', fontWeight: 700 }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DashboardOverview: React.FC<DashboardOverviewProps> = () => {
  const { state: authState } = useAuth();
  const defaults = useMemo(() => getDefaultDates(), []);

  // Filtros del formulario (lo que el usuario está editando) vs. filtros aplicados (los usados en el último fetch)
  const [filtrosForm, setFiltrosForm] = useState<Filtros>({ ...defaults, idCentro: '', idZona: '' });

  // Catálogos (se cargan una sola vez)
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);

  // KPIs
  const [resumen, setResumen] = useState<ResumenResponse | null>(null);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);

  // Gráficas
  const [graficas, setGraficas] = useState<GraficasResponse | null>(null);
  const [loadingGraficas, setLoadingGraficas] = useState(true);
  const [errorGraficas, setErrorGraficas] = useState<string | null>(null);

  // --- Fetchers ---------------------------------------------------------

  const buildParams = (f: Filtros) => {
    const params: Record<string, string> = {};
    // /dashboard/resumen y /dashboard/graficas no aceptan el parámetro
    // "sucursales"; su contrato utiliza idCentro o idZona.
    if (f.idCentro) params.idCentro = f.idCentro;
    if (f.idZona) params.idZona = f.idZona;
    if (f.fecha_inicio) params.fecha_inicio = f.fecha_inicio;
    if (f.fecha_fin) params.fecha_fin = f.fecha_fin;
    return params;
  };

  const fetchResumen = useCallback(async (f: Filtros) => {
    setLoadingResumen(true);
    setErrorResumen(null);
    try {
      const res = await axios.get(`${API_URL}/dashboard/resumen`, {
        headers: getHeaders(),
        params: buildParams(f),
      });
      if (res.data?.estatus === 1) {
        setResumen(res.data);
      } else {
        setErrorResumen(res.data?.mensaje || 'No se pudo cargar el resumen.');
      }
    } catch (error: unknown) {
      const mensaje = axios.isAxiosError(error)
        ? error.response?.data?.mensaje || error.response?.data?.detail ||
          `Error HTTP ${error.response?.status || 'sin respuesta'}`
        : error instanceof Error ? error.message : 'Error desconocido';
      setErrorResumen(`No se pudo cargar el resumen: ${mensaje}`);
    } finally {
      setLoadingResumen(false);
    }
  }, []);

  const fetchGraficas = useCallback(async (f: Filtros) => {
    setLoadingGraficas(true);
    setErrorGraficas(null);
    try {
      const res = await axios.get(`${API_URL}/dashboard/graficas`, {
        headers: getHeaders(),
        params: buildParams(f),
      });
      if (res.data?.estatus === 1) {
        setGraficas(res.data);
      } else {
        setErrorGraficas(res.data?.mensaje || 'No se pudieron cargar las gráficas.');
      }
    } catch (error: unknown) {
      const mensaje = axios.isAxiosError(error)
        ? error.response?.data?.mensaje || error.response?.data?.detail ||
          `Error HTTP ${error.response?.status || 'sin respuesta'}`
        : error instanceof Error ? error.message : 'Error desconocido';
      setErrorGraficas(`No se pudieron cargar las gráficas: ${mensaje}`);
    } finally {
      setLoadingGraficas(false);
    }
  }, []);

  // Catálogos de filtros — una sola vez al montar
  // La Sucursal se restringe a las asignadas al usuario (mismo patrón que Recuperaciones/Valores/Mermas).
  // La Zona sigue siendo un catálogo general.
  useEffect(() => {
    const loadCatalogos = async () => {
      if (authState.loading || !authState.isAuthenticated) return;

      const sucursalesGlobales = authState.sucursales;
      setSucursales(sucursalesGlobales);

      const filtrosIniciales = sucursalesGlobales.length === 1
        ? { ...defaults, idCentro: sucursalesGlobales[0].idCentro, idZona: '' }
        : { ...defaults, idCentro: '', idZona: '' };

      if (sucursalesGlobales.length === 1) {
        setFiltrosForm(filtrosIniciales);
      }

      // Iniciar los datos del dashboard inmediatamente. El catálogo de zonas
      // continúa en paralelo y no bloquea estas dos solicitudes.
      fetchResumen(filtrosIniciales)
        .then(() => fetchGraficas(filtrosIniciales));

      // Nota: las peticiones de usuario (sucursales asignadas) y zonas se resuelven
      // de forma INDEPENDIENTE con Promise.allSettled. Antes se usaba Promise.all,
      // lo que provocaba que si /zonas fallaba (ej. timeout del backend), se perdían
      // también las sucursales asignadas obtenidas correctamente desde /usuarios/{userId}.
      const [usuarioResult, zonaResult] = await Promise.allSettled([
        Promise.resolve({ data: { estatus: 1, sucursales: sucursalesGlobales } }),
        getConReintentos(() => axios.get(`${API_URL}/zonas`, { headers: getHeaders() })),
      ]);

      let asignadas: Sucursal[] = [];
      if (usuarioResult.status === 'fulfilled') {
        const usuarioRes = usuarioResult.value;
        if (usuarioRes && usuarioRes.data?.estatus === 1 && Array.isArray(usuarioRes.data.sucursales)) {
          asignadas = usuarioRes.data.sucursales;
          setSucursales(asignadas);
        } else if (usuarioRes) {
          console.error('Dashboard: respuesta de /usuarios/{id} sin sucursales válidas:', usuarioRes.data);
        }
      } else {
        console.error('Dashboard: error al obtener sucursales asignadas del usuario:', usuarioResult.reason);
      }

      if (zonaResult.status === 'fulfilled') {
        const zonaRes = zonaResult.value;
        const zonaList = zonaRes.data?.items || zonaRes.data?.zonas || zonaRes.data || [];
        setZonas(Array.isArray(zonaList) ? zonaList : []);
      } else {
        console.error('Dashboard: error al obtener catálogo de zonas:', zonaResult.reason);
      }

      // Si el usuario solo tiene una sucursal asignada, se preselecciona automáticamente (igual que en los demás módulos)
      if (asignadas.length === 1) {
        const idCentro = asignadas[0].idCentro;
        setFiltrosForm(f => ({ ...f, idCentro }));
        return;
      }

      // Múltiples sucursales asignadas (o ninguna): cargar con los filtros por defecto,
      // restringiendo SIEMPRE a la lista de sucursales asignadas.
    };
    loadCatalogos();
  }, [authState.loading, authState.isAuthenticated, authState.sucursales, defaults, fetchResumen, fetchGraficas]);

  const handleAplicarFiltros = async () => {
    await fetchResumen(filtrosForm);
    await fetchGraficas(filtrosForm);
  };

  const handleLimpiarFiltros = async () => {
    const reset: Filtros = { ...getDefaultDates(), idCentro: '', idZona: '' };
    setFiltrosForm(reset);
    await fetchResumen(reset);
    await fetchGraficas(reset);
  };

  // Nota: el Dashboard es visible para todos los usuarios autenticados.
  // La restricción de datos se aplica por sucursales asignadas (ver buildParams/fetchResumen/fetchGraficas),
  // no por nivel de usuario — cada usuario solo ve la información de sus propias sucursales.

  // --- Datos preparados para las gráficas --------------------------------

  const mvr = graficas?.mermaVsRecuperaciones ?? [];
  const mermaVsRecData = {
    labels: mvr.map(d => formatMes(d.mes)),
    datasets: [
      { label: 'Merma', data: mvr.map(d => d.merma), backgroundColor: COLOR_MERMA, borderRadius: 6, maxBarThickness: 40 },
      { label: 'Recuperaciones', data: mvr.map(d => d.recuperaciones), backgroundColor: COLOR_RECUPERACION, borderRadius: 6, maxBarThickness: 40 },
    ],
  };
  const mermaVsRecOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { padding: 16, font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${formatMXN(ctx.raw)}` } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v: any) => formatMXN(v) } },
      x: { grid: { display: false } },
    },
  };

  const topMerma = graficas?.topProductosMerma ?? [];
  const topMermaData = {
    labels: topMerma.map(p => truncar(p.Producto)),
    datasets: [{ data: topMerma.map(p => p.importe), backgroundColor: SHADES_ORANGE, borderRadius: 6 }],
  };
  const topMermaOptions = {
    indexAxis: 'y' as const,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const item = topMerma[ctx.dataIndex];
            return [
              `Producto: ${truncar(item?.Producto, 40)}`,
              `Código: ${item?.CodigoBarras ?? '—'}`,
              `Cantidad: ${item?.totalCantidad ?? 0}`,
              `Importe: ${formatMXN(item?.importe ?? 0)}`,
            ];
          },
        },
      },
    },
    scales: { x: { beginAtZero: true, ticks: { callback: (v: any) => formatMXN(v) } } },
  };

  const topRecuperacion = graficas?.topProductosRecuperacion ?? [];
  const topRecuperacionData = {
    labels: topRecuperacion.map(p => truncar(p.Producto)),
    datasets: [{ data: topRecuperacion.map(p => p.importe), backgroundColor: SHADES_GREEN, borderRadius: 6 }],
  };
  const topRecuperacionOptions = {
    indexAxis: 'y' as const,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const item = topRecuperacion[ctx.dataIndex];
            return [
              `Producto: ${truncar(item?.Producto, 40)}`,
              `Código: ${item?.CodigoBarras ?? '—'}`,
              `Cantidad: ${item?.totalCantidad ?? 0}`,
              `Importe: ${formatMXN(item?.importe ?? 0)}`,
            ];
          },
        },
      },
    },
    scales: { x: { beginAtZero: true, ticks: { callback: (v: any) => formatMXN(v) } } },
  };

  const caducidadZona = graficas?.caducidadPorZona ?? [];
  const caducidadZonaData = {
    labels: caducidadZona.map(z => z.Zona || 'Sin nombre'),
    datasets: [
      { label: 'Críticos', data: caducidadZona.map(z => z.criticos), backgroundColor: COLOR_CRITICO },
      { label: 'Urgentes', data: caducidadZona.map(z => z.urgentes), backgroundColor: COLOR_URGENTE },
      { label: 'Próximos', data: caducidadZona.map(z => z.proximos), backgroundColor: COLOR_PROXIMO },
    ],
  };
  const caducidadZonaOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { padding: 16, font: { size: 12 } } },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true },
    },
  };

  const mermaMotivo = graficas?.mermaPorMotivo ?? [];
  const recuperacionTipo = graficas?.recuperacionPorTipo ?? [];

  const kpiCardBase: React.CSSProperties = { ...cardStyle };

  return (
    <div className="dashboard-overview w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* --- Filtros --- */}
      <div style={{ ...cardStyle, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 14px 0', color: '#2d3748', fontSize: 16, fontWeight: 700 }}>🔍 Filtros</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', minWidth: 0 }}>
          <div style={{ minWidth: 150 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>Fecha inicio</label>
            <input
              type="date"
              value={filtrosForm.fecha_inicio}
              onChange={e => setFiltrosForm(f => ({ ...f, fecha_inicio: e.target.value }))}
              style={{ padding: '8px 10px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 13, width: '100%' }}
            />
          </div>
          <div style={{ minWidth: 150 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>Fecha fin</label>
            <input
              type="date"
              value={filtrosForm.fecha_fin}
              onChange={e => setFiltrosForm(f => ({ ...f, fecha_fin: e.target.value }))}
              style={{ padding: '8px 10px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 13, width: '100%' }}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>Sucursal</label>
            <select
              value={filtrosForm.idCentro}
              onChange={e => setFiltrosForm(f => ({ ...f, idCentro: e.target.value }))}
              style={{ padding: '8px 10px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 13, width: '100%' }}
            >
              <option value="">Todas mis sucursales</option>
              {sucursales.map(s => (
                <option key={s.idCentro} value={s.idCentro}>{s.Sucursal}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>Zona</label>
            <select
              value={filtrosForm.idZona}
              onChange={e => setFiltrosForm(f => ({ ...f, idZona: e.target.value }))}
              style={{ padding: '8px 10px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 13, width: '100%' }}
            >
              <option value="">Todas las zonas</option>
              {zonas.map(z => (
                <option key={z.idZona} value={z.idZona}>{z.Zona}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAplicarFiltros}
              style={{ background: '#2368b3', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Aplicar filtros
            </button>
            <button
              onClick={handleLimpiarFiltros}
              style={{ background: '#f8f9fa', color: '#2d3748', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* --- KPI Cards --- */}
      {errorResumen && <ErrorBox msg={errorResumen} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 16 }}>

        {/* Merma */}
        <div style={{ ...kpiCardBase, borderTop: `4px solid ${COLOR_MERMA}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h4 style={{ margin: 0, color: COLOR_MERMA, fontSize: 14, fontWeight: 700 }}>🟠 MERMA</h4>
          </div>
          {loadingResumen ? (
            <><Skeleton height={28} width="60%" /><div style={{ height: 8 }} /><Skeleton height={18} width="80%" /></>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#2d3748' }}>{resumen?.merma.totalEventos ?? 0} eventos</p>
              <span style={{ fontSize: 14, color: COLOR_MERMA, fontWeight: 700 }}>{formatMXN(resumen?.merma.totalImporte ?? 0)}</span>
            </>
          )}
        </div>

        {/* Recuperaciones */}
        <div style={{ ...kpiCardBase, borderTop: `4px solid ${COLOR_RECUPERACION}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h4 style={{ margin: 0, color: COLOR_RECUPERACION, fontSize: 14, fontWeight: 700 }}>🟢 RECUPERACIONES</h4>
          </div>
          {loadingResumen ? (
            <><Skeleton height={28} width="60%" /><div style={{ height: 8 }} /><Skeleton height={18} width="80%" /></>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#2d3748' }}>{resumen?.recuperaciones.totalEventos ?? 0} eventos</p>
              <span style={{ fontSize: 14, color: COLOR_RECUPERACION, fontWeight: 700 }}>{formatMXN(resumen?.recuperaciones.totalImporte ?? 0)}</span>
            </>
          )}
        </div>

        {/* Caducidad */}
        <div style={{ ...kpiCardBase, borderTop: `4px solid ${COLOR_CRITICO}` }}>
          <h4 style={{ margin: '0 0 10px 0', color: COLOR_CRITICO, fontSize: 14, fontWeight: 700 }}>🔴 CADUCIDAD</h4>
          {loadingResumen ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Skeleton height={26} width="45%" /><Skeleton height={26} width="45%" />
              <Skeleton height={26} width="45%" /><Skeleton height={26} width="45%" />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ background: COLOR_CRITICO, color: 'white', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>{resumen?.caducidad.criticos ?? 0} Críticos</span>
              <span style={{ background: COLOR_URGENTE, color: 'white', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>{resumen?.caducidad.urgentes ?? 0} Urgentes</span>
              <span style={{ background: COLOR_PROXIMO, color: '#4a3800', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>{resumen?.caducidad.proximos ?? 0} Próximos</span>
              <span style={{ background: COLOR_CERRADO, color: 'white', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>{resumen?.caducidad.cerrados ?? 0} Cerrados</span>
            </div>
          )}
        </div>

        {/* Manejo de Valores */}
        <div style={{ ...kpiCardBase, borderTop: `4px solid ${COLOR_VALORES}` }}>
          <h4 style={{ margin: '0 0 10px 0', color: COLOR_VALORES, fontSize: 14, fontWeight: 700 }}>🔵 MANEJO DE VALORES</h4>
          {loadingResumen ? (
            <><Skeleton height={18} width="70%" /><div style={{ height: 6 }} /><Skeleton height={18} width="70%" /><div style={{ height: 6 }} /><Skeleton height={18} width="70%" /></>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5, color: '#2d3748', fontWeight: 600 }}>
              <span>{resumen?.manejoValores.foliosAbiertos ?? 0} folios abiertos</span>
              <span>{resumen?.manejoValores.foliosCerrados ?? 0} folios cerrados</span>
              <span>{resumen?.manejoValores.totalMovimientos ?? 0} movimientos totales</span>
            </div>
          )}
        </div>
      </div>

      {/* --- Gráficas --- */}
      {errorGraficas && <ErrorBox msg={errorGraficas} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 20 }}>

        {/* 1. Merma vs Recuperaciones */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 14px 0', color: '#2d3748', fontSize: 15, fontWeight: 700, textAlign: 'center' }}>📊 Merma vs Recuperaciones</h3>
          <div style={{ height: 280, position: 'relative' }}>
            {loadingGraficas ? <Skeleton height={280} /> : mvr.length === 0 ? <EmptyState /> : (
              <Bar data={mermaVsRecData} options={mermaVsRecOptions} />
            )}
          </div>
        </div>

        {/* 2. Top productos merma */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 14px 0', color: '#2d3748', fontSize: 15, fontWeight: 700, textAlign: 'center' }}>📦 Top productos merma</h3>
          <div style={{ height: 280, position: 'relative' }}>
            {loadingGraficas ? <Skeleton height={280} /> : topMerma.length === 0 ? <EmptyState /> : (
              <Bar data={topMermaData} options={topMermaOptions} />
            )}
          </div>
        </div>

        {/* 3. Top productos recuperación */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 14px 0', color: '#2d3748', fontSize: 15, fontWeight: 700, textAlign: 'center' }}>📦 Top productos recuperación</h3>
          <div style={{ height: 280, position: 'relative' }}>
            {loadingGraficas ? <Skeleton height={280} /> : topRecuperacion.length === 0 ? <EmptyState /> : (
              <Bar data={topRecuperacionData} options={topRecuperacionOptions} />
            )}
          </div>
        </div>

        {/* 4. Caducidad por zona */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 14px 0', color: '#2d3748', fontSize: 15, fontWeight: 700, textAlign: 'center' }}>📅 Caducidad por zona</h3>
          <div style={{ height: 280, position: 'relative' }}>
            {loadingGraficas ? <Skeleton height={280} /> : caducidadZona.length === 0 ? <EmptyState /> : (
              <Bar data={caducidadZonaData} options={caducidadZonaOptions} />
            )}
          </div>
        </div>

        {/* 5. Merma por motivo */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 14px 0', color: '#2d3748', fontSize: 15, fontWeight: 700, textAlign: 'center' }}>🟠 Merma por motivo</h3>
          {loadingGraficas ? <Skeleton height={240} /> : (
            <DonutConLeyenda
              labels={mermaMotivo.map(m => m.Motivo || 'Sin nombre')}
              data={mermaMotivo.map(m => m.importe)}
              colors={SHADES_ORANGE}
            />
          )}
        </div>

        {/* 6. Recuperación por tipo */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 14px 0', color: '#2d3748', fontSize: 15, fontWeight: 700, textAlign: 'center' }}>🟢 Recuperación por tipo</h3>
          {loadingGraficas ? <Skeleton height={240} /> : (
            <DonutConLeyenda
              labels={recuperacionTipo.map(t => t.Tipo || 'Sin nombre')}
              data={recuperacionTipo.map(t => t.importe)}
              colors={SHADES_GREEN}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
