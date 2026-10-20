'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getConReintentos } from '../services/httpRetry';
import { getCached } from '../services/apiCache';
import BarcodeScannerModal from './BarcodeScannerModal';
import { cardStyle, inputStyle, labelStyle, btnPrimary, btnDanger, btnSecondary, modalOverlay, modalContent } from '../styles/sharedStyles';
import { useFocusTrap } from '../hooks/useFocusTrap';

// URL de la API — configurar NEXT_PUBLIC_API_URL en .env.local (vacío = proxy /backend)
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

// --- Tipos -------------------------------------------------------------------

interface Sucursal {
  idCentro: string;
  Sucursal: string;
}

interface CaducidadRegistro {
  idCad: number;
  idCentro: string;
  nombreSucursal?: string;
  idProducto: string;
  nombreProducto?: string;
  codigoBarras?: string;
  fechaCaducidad: string;
  cantidadDetectada: number;
  fechaRegistro: string;
  diasAlerta: number;
  estatus: 'A' | 'C';
  nota?: string;
  diasRestantes: number;
  ultimaAccion?: string;
  cierre?: CierreCaso | null;
}

interface AccionCaso {
  idAccion: number;
  idCad: number;
  fechaHora: string;
  accion: string;
  cantidad?: number;
  resultado: string;
  comentario?: string;
  nombreUsuario?: string;
}

interface CierreCaso {
  idCierre: number;
  idCad: number;
  fechaCierre: string;
  resultadoFinal: string;
  cantidadSalida?: number;
  cantidadMerma?: number;
  idMerma?: number;
  comentario?: string;
  nombreUsuario?: string;
}

interface ProductoBusqueda {
  CodigoBarras: string;
  Descripcion: string;
  Precio?: number;
}

// --- Helpers -----------------------------------------------------------------

const getSemaforoColor = (dias: number) => {
  if (dias <= 7)  return { bg: '#fff5f5', text: '#c53030', border: '#fc8181', badge: '#fed7d7', label: 'Crítico'  };
  if (dias <= 15) return { bg: '#fffaf0', text: '#c05621', border: '#f6ad55', badge: '#feebc8', label: 'Urgente'  };
  if (dias <= 30) return { bg: '#fffff0', text: '#b7791f', border: '#f6e05e', badge: '#fefcbf', label: 'Próximo'  };
  return          { bg: '#f0fff4', text: '#276749', border: '#68d391', badge: '#c6f6d5', label: 'Normal'   };
};

const formatFecha = (fecha: string) => {
  if (!fecha) return '-';
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const TIPOS_ACCION = [
  { id: 1, label: 'DESCUENTO' },
  { id: 2, label: 'EXHIBICION' },
  { id: 3, label: 'TRANSFERENCIA' },
  { id: 4, label: 'DEVOLUCION' },
  { id: 5, label: 'REUBICACION' },
  { id: 6, label: 'REVISION' },
  { id: 7, label: 'SIN_ACCION' },
];
const RESULTADOS_ACCION = ['EN_PROCESO', 'APLICADA', 'NO_APLICA'];
const RESULTADOS_CIERRE = ['SALIO_EN_VENTA', 'MERMA', 'DEVOLUCION_PROVEEDOR', 'TRANSFERIDO', 'CADUCO_SIN_MOVIMIENTO'];
const generaMerma = (resultado: string) => ['MERMA', 'CADUCO_SIN_MOVIMIENTO'].includes(resultado);

// --- Componente --------------------------------------------------------------

export default function ProximosCaducarContent() {
  // Inicializar con el ancho real (si está disponible) para evitar el parpadeo
  // de la tabla de escritorio antes de cambiar a la vista de tarjetas en móvil.
  // Umbral alineado a 1024px: coincide con el breakpoint "Desktop" real del
  // dashboard (dashboard.css), donde el sidebar (240px) + padding dejan espacio
  // suficiente para la tabla (minWidth:640). Por debajo de 1024px (incluido el
  // rango tablet 768-1023px) el sidebar reduce el ancho disponible por debajo
  // de 640px y la tabla generaba scroll horizontal — por eso se usa tarjetas.
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [registros, setRegistros]           = useState<CaducidadRegistro[]>([]);
  const [loading, setLoading]               = useState(false);
  const [totalCerrados, setTotalCerrados]   = useState(0);
  const [refreshKey, setRefreshKey]         = useState(0);
  const [filtroEstatus, setFiltroEstatus]   = useState<'A' | 'C'>('A');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [sucursalesAsignadas, setSucursalesAsignadas] = useState<Sucursal[]>([]);

  const [casoDetalle, setCasoDetalle]           = useState<CaducidadRegistro | null>(null);
  const [acciones, setAcciones]                 = useState<AccionCaso[]>([]);
  const [loadingDetalle, setLoadingDetalle]     = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);

  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ idCentro: '', codigoBarras: '', fechaCaducidad: '', cantidadDetectada: '', diasAlerta: '30', nota: '' });
  const [productoBuscado, setProductoBuscado]           = useState<ProductoBusqueda | null>(null);
  const [productosSugerencias, setProductosSugerencias] = useState<ProductoBusqueda[]>([]);
  const [loadingProductos, setLoadingProductos]         = useState(false);
  const [searchTimeout, setSearchTimeout]               = useState<ReturnType<typeof setTimeout> | null>(null);
  const [guardandoNuevo, setGuardandoNuevo]             = useState(false);
  const [showScanner, setShowScanner]                   = useState(false);

  const [showAccionModal, setShowAccionModal] = useState(false);
  const [accionForm, setAccionForm]     = useState({ idTipoAccion: 6, cantidad: '', resultado: 'EN_PROCESO', comentario: '' });
  const [guardandoAccion, setGuardandoAccion] = useState(false);

  const [showCierreModal, setShowCierreModal] = useState(false);
  const [cierreForm, setCierreForm] = useState({ resultadoFinal: 'SALIO_EN_VENTA', cantidadSalida: '', cantidadMerma: '', comentario: '' });

  const nuevoModalRef = useFocusTrap<HTMLDivElement>(showNuevoModal, () => setShowNuevoModal(false));
  const detalleModalRef = useFocusTrap<HTMLDivElement>(showDetalleModal, () => setShowDetalleModal(false));
  const accionModalRef = useFocusTrap<HTMLDivElement>(showAccionModal, () => setShowAccionModal(false));
  const cierreModalRef = useFocusTrap<HTMLDivElement>(showCierreModal, () => setShowCierreModal(false));
  const [guardandoCierre, setGuardandoCierre] = useState(false);
  const guardandoNuevoRef = useRef(false);
  const guardandoAccionRef = useRef(false);
  const guardandoCierreRef = useRef(false);
  const mermasPendientesRef = useRef<Record<number, { idMerma: number; cantidad: number; productoGuardado: boolean }>>({});

  const [notif, setNotif] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null);

  const getHeaders = () => ({
    'Authorization': `Basic ${localStorage.getItem('userCredentials')}`,
    'Content-Type': 'application/json',
  });
  const getUserId  = () => localStorage.getItem('userId') || '';
  const showNotif  = (tipo: 'ok' | 'error', msg: string) => { setNotif({ tipo, msg }); setTimeout(() => setNotif(null), 4500); };

  const fetchSucursales = useCallback(async () => {
    try {
      const userId = getUserId();
      if (!userId) return;
      const data = await getCached(`sucursales_${userId}`, async () => {
        const res = await getConReintentos(() => axios.get(`${API_URL}/usuarios/${userId}`, { headers: getHeaders() }));
        return res.data;
      });
      if (data.estatus === 1 && data.sucursales) setSucursalesAsignadas(data.sucursales);
    } catch (e) { console.error('Error al obtener sucursales:', e); }
  }, []);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { estatus: filtroEstatus, limit: '50', offset: '0' };
      if (filtroSucursal) params.idCentro = filtroSucursal;
      if (filtroBusqueda) params.q = filtroBusqueda;
      const headers = getHeaders();
      const res = await axios.get(`${API_URL}/caducidad/registros`, { headers, params });
      if (res.data.estatus === 1) {
        const raw = res.data.items || res.data.registros || [];
        const normalized = raw.map((r: Record<string, unknown>) => ({
          idCad:             r.idCad             ?? r.IdCad,
          idCentro:          r.idCentro          ?? r.IdCentro,
          nombreSucursal:    r.nombreSucursal     ?? r.NombreSucursal,
          idProducto:        r.idProducto         ?? r.IdProducto,
          nombreProducto:    r.nombreProducto     ?? r.NombreProducto ?? null,
          codigoBarras:      r.codigoBarras       ?? r.CodigoBarras,
          fechaCaducidad:    r.fechaCaducidad     ?? r.FechaCaducidad,
          cantidadDetectada: r.cantidadDetectada  ?? r.CantidadDetectada,
          fechaRegistro:     r.fechaRegistro      ?? r.FechaRegistro,
          diasAlerta:        r.diasAlerta         ?? r.DiasAlerta,
          estatus:           r.estatus            ?? r.Estatus,
          nota:              r.nota               ?? r.Nota,
          diasRestantes:     r.diasRestantes      ?? r.DiasRestantes,
          ultimaAccion:      r.ultimaAccion       ?? r.UltimaAccion ?? r.fechaUltimaAccion ?? r.FechaUltimaAccion,
        }));
        setRegistros(normalized);

        // Enriquecer con nombres de productos para los que no traen nombre
        const sinNombre = normalized.filter((r: CaducidadRegistro) => !r.nombreProducto && r.codigoBarras);
        const codigosUnicos = [...new Set(sinNombre.map((r: CaducidadRegistro) => r.codigoBarras))] as string[];
        if (codigosUnicos.length > 0) {
          const resultados = await Promise.allSettled(
            codigosUnicos.map(cb =>
              axios.get(`${API_URL}/productos/buscar?q=${encodeURIComponent(cb)}`, { headers: getHeaders() })
            )
          );
          const mapaProductos: Record<string, string> = {};
          resultados.forEach((res, i) => {
            if (res.status === 'fulfilled' && res.value.data.estatus === 1) {
              const prods = res.value.data.productos || [];
              const match = prods.find((p: Record<string, unknown>) =>
                (p.CodigoBarras ?? p.codigoBarras) === codigosUnicos[i]
              );
              if (match) mapaProductos[codigosUnicos[i]] = (match.Producto ?? match.nombre ?? match.Descripcion ?? '') as string;
            }
          });
          if (Object.keys(mapaProductos).length > 0) {
            setRegistros(prev => prev.map(r =>
              r.codigoBarras && mapaProductos[r.codigoBarras]
                ? { ...r, nombreProducto: mapaProductos[r.codigoBarras] }
                : r
            ));
          }
        }
      } else {
        setRegistros([]);
      }
    } catch (e) { console.error('[Caducidad] Error al obtener registros:', e); setRegistros([]); }
    finally { setLoading(false); }
  }, [filtroEstatus, filtroSucursal, filtroBusqueda, refreshKey]);

  const fetchTotalCerrados = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/caducidad/registros`, {
        headers: getHeaders(),
        params: { estatus: 'C', limit: '1', offset: '0' },
      });
      if (res.data.estatus === 1) {
        setTotalCerrados(res.data.total ?? (res.data.items?.length ?? 0));
      }
    } catch { /* silencioso */ }
  }, [refreshKey]);

  useEffect(() => { fetchSucursales(); }, [fetchSucursales]);
  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);
  useEffect(() => { fetchTotalCerrados(); }, [fetchTotalCerrados]);

  const [searchTermProducto, setSearchTermProducto] = useState('');

  const buscarProductos = (termino: string) => {
    setSearchTermProducto(termino);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!termino || termino.length < 2) { setProductosSugerencias([]); return; }
    setLoadingProductos(true);
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/productos/buscar?q=${encodeURIComponent(termino)}`, { headers: getHeaders() });
        if (res.data.estatus === 1) setProductosSugerencias(res.data.productos || []);
      } catch (e) { console.error('Error buscando productos:', e); }
      finally { setLoadingProductos(false); }
    }, 300);
    setSearchTimeout(t);
  };

  const seleccionarProducto = (p: ProductoBusqueda) => {
    setProductoBuscado(p);
    setNuevoForm(f => ({ ...f, codigoBarras: p.CodigoBarras }));
    setProductosSugerencias([]);
    setSearchTermProducto('');
  };

  // Maneja el código escaneado con la cámara
  const handleBarcodeScanned = (codigo: string) => {
    setShowScanner(false);
    buscarProductos(codigo);
  };

  const resetNuevoForm = () => {
    setNuevoForm({ idCentro: '', codigoBarras: '', fechaCaducidad: '', cantidadDetectada: '', diasAlerta: '30', nota: '' });
    setProductoBuscado(null);
    setProductosSugerencias([]);
    setSearchTermProducto('');
  };

  const handleGuardarNuevo = async () => {
    if (guardandoNuevoRef.current) return;
    if (!nuevoForm.idCentro || !nuevoForm.codigoBarras || !nuevoForm.fechaCaducidad || !nuevoForm.cantidadDetectada) {
      showNotif('error', 'Completa todos los campos obligatorios.'); return;
    }
    const hoy = new Date().toISOString().split('T')[0];
    if (nuevoForm.fechaCaducidad <= hoy) { showNotif('error', 'La fecha de caducidad no puede ser pasada o de hoy.'); return; }
    if (parseFloat(nuevoForm.cantidadDetectada) <= 0) { showNotif('error', 'La cantidad debe ser mayor a 0.'); return; }
    guardandoNuevoRef.current = true;
    setGuardandoNuevo(true);
    try {
      const res = await axios.post(`${API_URL}/caducidad/registros`, {
        idCentro: nuevoForm.idCentro, CodigoBarras: nuevoForm.codigoBarras,
        fechaCaducidad: nuevoForm.fechaCaducidad, cantidadDetectada: parseFloat(nuevoForm.cantidadDetectada),
        idUsuarios: getUserId(), diasAlerta: parseInt(nuevoForm.diasAlerta) || 30, nota: nuevoForm.nota || undefined,
      }, { headers: getHeaders() });
      if (res.data.estatus === 1) {
        showNotif('ok', 'Caso registrado correctamente.');
        setShowNuevoModal(false); resetNuevoForm(); setRefreshKey(k => k + 1);
      } else { showNotif('error', res.data.mensaje || 'Error al registrar.'); }
    } catch (e) { showNotif('error', 'Error de conexión.'); }
    finally { guardandoNuevoRef.current = false; setGuardandoNuevo(false); }
  };

  const handleVerDetalle = async (idCad: number) => {
    setLoadingDetalle(true); setShowDetalleModal(true); setCasoDetalle(null); setAcciones([]);
    try {
      const res = await axios.get(`${API_URL}/caducidad/registros/${idCad}`, { headers: getHeaders() });
      // Estructura: res.data.data.registro + res.data.data.acciones + res.data.data.cierre
      const envelope = res.data.data ?? res.data;
      const raw = envelope.registro ?? envelope;
      const normalized: CaducidadRegistro = {
        idCad:             raw.idCad,
        idCentro:          raw.idCentro,
        nombreSucursal:    raw.nombreSucursal     ?? raw.NombreSucursal,
        idProducto:        raw.idProducto         ?? raw.CodigoBarras,
        nombreProducto:    raw.nombreProducto     ?? raw.NombreProducto,
        codigoBarras:      raw.CodigoBarras        ?? raw.codigoBarras,
        fechaCaducidad:    raw.fechaCaducidad      ?? raw.FechaCaducidad,
        cantidadDetectada: raw.cantidadDetectada   ?? raw.CantidadDetectada,
        fechaRegistro:     raw.FechaRegistro       ?? raw.fechaRegistro,
        diasAlerta:        raw.diasAlerta          ?? raw.DiasAlerta,
        estatus:           raw.estatus             ?? raw.Estatus,
        nota:              raw.nota                ?? raw.Nota,
        diasRestantes:     raw.diasRestantes       ?? raw.DiasRestantes,
        ultimaAccion:      raw.ultimaAccion        ?? raw.UltimaAccion,
        cierre:            envelope.cierre         ?? raw.cierre ?? raw.Cierre,
      };
      // Si no trae nombre, buscarlo por código de barras
      if (!normalized.nombreProducto && normalized.codigoBarras) {
        try {
          const pr = await axios.get(`${API_URL}/productos/buscar?q=${encodeURIComponent(normalized.codigoBarras)}`, { headers: getHeaders() });
          if (pr.data.estatus === 1 && pr.data.productos?.length > 0) {
            const p = pr.data.productos.find((x: Record<string, unknown>) => (x.CodigoBarras ?? x.codigoBarras) === normalized.codigoBarras) || pr.data.productos[0];
            normalized.nombreProducto = (p.Producto ?? p.nombre ?? p.Descripcion ?? '') as string;
          }
        } catch { /* silencioso */ }
      }
      setCasoDetalle(normalized);
      // Normalizar acciones
      const rawAcciones = envelope.acciones ?? envelope.Acciones ?? [];
      setAcciones(rawAcciones.map((a: Record<string, unknown>) => ({
        idAccion:      a.idAccion      ?? a.IdAccion,
        idCad:         idCad,
        accion:        a.accion        ?? a.Accion        ?? a.tipoAccion ?? a.TipoAccion ?? '',
        resultado:     a.resultado     ?? a.Resultado     ?? '',
        cantidad:      a.cantidad      ?? a.Cantidad,
        comentario:    a.comentario    ?? a.Comentario,
        fechaHora:     a.fechaHora     ?? a.FechaHora     ?? a.fecha ?? a.Fecha,
        nombreUsuario: a.nombreUsuario ?? a.NombreUsuario,
      })));
    } catch (e) { console.error('Error al obtener detalle:', e); }
    finally { setLoadingDetalle(false); }
  };

  const handleGuardarAccion = async () => {
    if (guardandoAccionRef.current) return;
    if (!casoDetalle) return;
    guardandoAccionRef.current = true;
    setGuardandoAccion(true);
    try {
      const res = await axios.post(`${API_URL}/caducidad/registros/${casoDetalle.idCad}/acciones`, {
        idTipoAccion: accionForm.idTipoAccion,
        cantidad: accionForm.cantidad ? parseFloat(accionForm.cantidad) : 0,
        resultado: accionForm.resultado,
        comentario: accionForm.comentario || undefined,
        idUsuario: parseInt(getUserId()) || 0,
        idUsuarios: parseInt(getUserId()) || 0,
      }, { headers: getHeaders() });
      if (res.data.estatus === 1) {
        const idCadActual = casoDetalle.idCad;
        const ahora = new Date().toLocaleString('es-MX');
        showNotif('ok', 'Acción registrada.');
        setShowAccionModal(false);
        setAccionForm({ idTipoAccion: 6, cantidad: '', resultado: 'EN_PROCESO', comentario: '' });
        // Actualizar ultimaAccion en la tabla sin recargar todo
        setRegistros(prev => prev.map(r =>
          r.idCad === idCadActual ? { ...r, ultimaAccion: ahora } : r
        ));
        // Recargar detalle con el idCad guardado
        handleVerDetalle(idCadActual);
       } else { showNotif('error', res.data.mensaje || 'Error al guardar acción.'); }
    } catch (e) { console.error('Error al guardar acción:', e); showNotif('error', 'Error de conexión.'); }
    finally { guardandoAccionRef.current = false; setGuardandoAccion(false); }
  };

  const handleGuardarCierre = async () => {
    if (guardandoCierreRef.current) return;
    if (!casoDetalle) return;
    const registrarMerma = generaMerma(cierreForm.resultadoFinal);
    const cantidadMerma = cierreForm.cantidadMerma ? Number(cierreForm.cantidadMerma) : Number(casoDetalle.cantidadDetectada);
    if (registrarMerma && (!Number.isFinite(cantidadMerma) || cantidadMerma <= 0 || cantidadMerma > Number(casoDetalle.cantidadDetectada))) {
      showNotif('error', 'La cantidad a mermar debe ser mayor a cero y no superar la cantidad detectada.');
      return;
    }
    if (registrarMerma && !casoDetalle.codigoBarras) {
      showNotif('error', 'El caso no tiene código de barras. No se puede registrar el producto en Mermas.');
      return;
    }
    const pendiente = mermasPendientesRef.current[casoDetalle.idCad];
    if (pendiente && (!registrarMerma || pendiente.cantidad !== cantidadMerma)) {
      showNotif('error', `La merma #${pendiente.idMerma} ya fue creada. Reintenta el cierre con la misma cantidad y un resultado que registre merma.`);
      return;
    }
    guardandoCierreRef.current = true;
    setGuardandoCierre(true);
    try {
      const userId = getUserId();
      const body: Record<string, unknown> = {
        resultadoFinal: cierreForm.resultadoFinal,
        cantidadSalida: cierreForm.cantidadSalida ? parseFloat(cierreForm.cantidadSalida) : undefined,
        cantidadMerma:  registrarMerma ? cantidadMerma : undefined,
        comentario:     cierreForm.comentario || undefined,
        idUsuarios:     parseInt(userId) || 0,
      };

      // Ambos resultados generan la merma antes de cerrar y vinculan su folio.
      if (registrarMerma) {
        try {
          let idMerma: number | null = pendiente?.idMerma ?? null;
          if (!idMerma) {
            // 1. Crear el encabezado de merma
            const mermaRes = await axios.post(`${API_URL}/mermas`, {
              idCentro:  casoDetalle.idCentro,
              Fecha:     new Date().toISOString().split('T')[0],
              idUsuario: parseInt(userId) || 0,
              Anfitrion: userId,
              observaciones: `Caducidad Caso #${casoDetalle.idCad}. ${cierreForm.comentario || ''}`.trim(),
            }, { headers: getHeaders() });

            // Obtener idMaMe de la respuesta (puede venir directo o en el mensaje)
            if (mermaRes.data.estatus === 1) {
              if (mermaRes.data.merma?.idMaMe) {
                idMerma = mermaRes.data.merma.idMaMe;
              } else if (mermaRes.data.idMaMe) {
                idMerma = mermaRes.data.idMaMe;
              } else if (mermaRes.data.mensaje) {
                const match = mermaRes.data.mensaje.match(/ID[:\s]+(\d+)/i);
                if (match) idMerma = parseInt(match[1]);
              }
            }

            if (!idMerma) {
              showNotif('error', 'No se pudo obtener el ID de la merma creada.');
              setGuardandoCierre(false); return;
            }
            mermasPendientesRef.current[casoDetalle.idCad] = { idMerma, cantidad: cantidadMerma, productoGuardado: false };
          }

          // 2. Agregar el producto a la merma (idMotMer=1 = Caducidad/genérico)
          if (casoDetalle.codigoBarras && !mermasPendientesRef.current[casoDetalle.idCad].productoGuardado) {
            try {
              const productoRes = await axios.post(`${API_URL}/mermas/${idMerma}/productos`, {
                CodigoBarras: casoDetalle.codigoBarras,
                Cantidad:     cantidadMerma,
                idMotMer:     1, // Motivo genérico — caducidad
              }, { headers: getHeaders() });
              if (productoRes.data?.estatus !== 1) throw new Error('El producto no fue registrado.');
              mermasPendientesRef.current[casoDetalle.idCad].productoGuardado = true;
            } catch (e) {
              console.error('Error al agregar producto a merma:', e);
              showNotif('error', `No se pudo guardar el producto en la merma #${idMerma}. El caso sigue abierto.`);
              return;
            }
          }

          body.idMerma = idMerma;
        } catch (e) {
          console.error('Error al crear merma:', e);
          showNotif('error', 'No se pudo crear el registro de merma.');
          setGuardandoCierre(false); return;
        }
      }

      // Registrar el cierre del caso
      const res = await axios.post(`${API_URL}/caducidad/registros/${casoDetalle.idCad}/cierre`, body, { headers: getHeaders() });
      if (res.data.estatus === 1) {
        delete mermasPendientesRef.current[casoDetalle.idCad];
        showNotif('ok', registrarMerma
          ? `✅ Caso cerrado y merma registrada (ID: ${body.idMerma}).`
          : '✅ Caso cerrado correctamente.');
        setShowCierreModal(false);
        setShowDetalleModal(false);
        setCierreForm({ resultadoFinal: 'SALIO_EN_VENTA', cantidadSalida: '', cantidadMerma: '', comentario: '' });
        setRefreshKey(k => k + 1);
      } else {
        showNotif('error', res.data.mensaje || 'Error al cerrar el caso.');
      }
    } catch (e) { showNotif('error', 'Error de conexión al cerrar.'); }
    finally { guardandoCierreRef.current = false; setGuardandoCierre(false); }
  };

  // --- Render ----------------------------------------------------------------

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100%' }}>

      {notif && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '12px 20px',
          borderRadius: 10, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          background: notif.tipo === 'ok' ? '#c6f6d5' : '#fed7d7',
          color:      notif.tipo === 'ok' ? '#276749' : '#c53030',
          border:     notif.tipo === 'ok' ? '1.5px solid #68d391' : '1.5px solid #fc8181',
          maxWidth: 380, fontSize: 14,
        }}>
          {notif.tipo === 'ok' ? ' ' : ' '}{notif.msg}
        </div>
      )}

      {/* Encabezado + filtros */}
      <div style={{ ...cardStyle, marginBottom: 24, padding: isMobile ? '16px 14px' : 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#2d3748', fontSize: isMobile ? 17 : 20, fontWeight: 700 }}>🗓️ Próximos a Caducar</h3>
            {!isMobile && <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>Control y seguimiento de productos con fechas de caducidad próximas</p>}
          </div>
          <button style={{ ...btnPrimary, fontSize: isMobile ? 13 : 14, padding: isMobile ? '8px 14px' : '10px 20px' }} onClick={() => { resetNuevoForm(); setShowNuevoModal(true); }}>+ Nuevo</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {[
            { label: '≤7 días - Crítico',  sem: getSemaforoColor(5)  },
            { label: '≤15 días - Urgente', sem: getSemaforoColor(10) },
            { label: '≤30 días - Próximo', sem: getSemaforoColor(20) },
            { label: '+30 días - Normal', sem: getSemaforoColor(40) },
          ].map(s => (
            <span key={s.label} style={{ background: s.sem.badge, color: s.sem.text, border: `1px solid ${s.sem.border}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
              {s.label}
            </span>
          ))}
        </div>

        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Estatus</label>
              <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value as 'A' | 'C')} style={inputStyle}>
                <option value="A">Abiertos</option>
                <option value="C">Cerrados</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sucursal</label>
              <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)} style={inputStyle}>
                <option value="">Todas las sucursales</option>
                {sucursalesAsignadas.map(s => <option key={s.idCentro} value={s.idCentro}>{s.Sucursal}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Buscar producto</label>
              <input type="text" placeholder="Codigo o nombre..." value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <button onClick={fetchRegistros} style={{ ...btnPrimary, width: '100%' }}> Buscar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Estadisticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
        {[
          { title: 'Críticos (7d)',   value: registros.filter(r => r.diasRestantes <= 7  && r.estatus === 'A').length, icon: '🔴', color: '#c53030', bg: 'rgba(197,48,48,0.08)'  },
          { title: 'Urgentes (15d)',  value: registros.filter(r => r.diasRestantes <= 15 && r.diasRestantes > 7  && r.estatus === 'A').length, icon: '🟠', color: '#c05621', bg: 'rgba(192,86,33,0.08)'  },
          { title: 'Próximos (30d)', value: registros.filter(r => r.diasRestantes <= 30 && r.diasRestantes > 15 && r.estatus === 'A').length, icon: '🟡', color: '#b7791f', bg: 'rgba(183,121,31,0.08)' },
          { title: 'Cerrados',        value: totalCerrados, icon: '✅', color: '#276749', bg: 'rgba(39,103,73,0.08)'  },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: '#2d3748', fontSize: 14 }}>{s.title}</span>
              <div style={{ background: s.bg, borderRadius: 8, padding: 8, fontSize: 18, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#23272f', marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: s.color, fontSize: 12, fontWeight: 500 }}>registros</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, color: '#2d3748', fontSize: 16, fontWeight: 600 }}>Registros {filtroEstatus === 'A' ? 'Abiertos' : 'Cerrados'}</h3>
          <span style={{ color: '#718096', fontSize: 13 }}>{registros.length} registros</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Cargando registros...</div>
        ) : registros.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No se encontraron registros</div>
            <div style={{ fontSize: 13, color: '#a0aec0' }}>Prueba cambiando los filtros o crea un nuevo registro</div>
          </div>
        ) : isMobile ? (
          /* ── Vista tarjetas (móvil) ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {registros.map(r => {
              const sem = getSemaforoColor(r.diasRestantes);
              return (
                <div key={r.idCad} style={{
                  border: `1.5px solid ${sem.border}`,
                  borderRadius: 10,
                  background: sem.bg,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  {/* Fila superior: nombre + badge días */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#2d3748', fontSize: 15, lineHeight: 1.3 }}>
                        {r.nombreProducto || r.idProducto}
                      </div>
                      {r.codigoBarras && (
                        <div style={{ fontSize: 11, color: '#718096', fontFamily: 'monospace', marginTop: 2 }}>
                          {r.codigoBarras}
                        </div>
                      )}
                    </div>
                    <span style={{
                      background: sem.badge, color: sem.text,
                      border: `1px solid ${sem.border}`,
                      borderRadius: 16, padding: '4px 10px',
                      fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {r.diasRestantes <= 0 ? 'Vencido' : `${r.diasRestantes} días`}
                    </span>
                  </div>

                  {/* Fila datos: sucursal · caduca · cantidad */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 13, color: '#4a5568' }}>
                    <span>🏪 {r.nombreSucursal || r.idCentro}</span>
                    <span>📅 {formatFecha(r.fechaCaducidad)}</span>
                    <span>📦 Cant: {r.cantidadDetectada}</span>
                  </div>

                  {/* Fila inferior: estatus + última acción + botón */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        background: r.estatus === 'A' ? '#ebf8ff' : '#f3f4f6',
                        color: r.estatus === 'A' ? '#2b6cb0' : '#6b7280',
                        borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                      }}>
                        {r.estatus === 'A' ? 'Abierto' : 'Cerrado'}
                      </span>
                      {r.ultimaAccion && (
                        <span style={{ fontSize: 11, color: '#a0aec0' }}>⏱ {r.ultimaAccion}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleVerDetalle(r.idCad)}
                      style={{ background: '#2368b3', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Vista tabla (escritorio) ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ background: '#f7fafc' }}>
                  {['#', 'Producto', 'Sucursal', 'Caduca', 'Dias restantes', 'Cantidad', 'Estatus', 'Ultima accion', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#4a5568', fontSize: 13, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map(r => {
                  const sem = getSemaforoColor(r.diasRestantes);
                  return (
                    <tr key={r.idCad} style={{ borderBottom: '1px solid #e2e8f0' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f7fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#a0aec0' }}>{r.idCad}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#2d3748', fontSize: 14 }}>{r.nombreProducto || r.idProducto}</div>
                        {r.codigoBarras && <div style={{ fontSize: 11, color: '#a0aec0', fontFamily: 'monospace' }}>{r.codigoBarras}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4a5568', fontSize: 13 }}>{r.nombreSucursal || r.idCentro}</td>
                      <td style={{ padding: '12px 16px', color: '#4a5568', fontSize: 13, whiteSpace: 'nowrap' }}>{formatFecha(r.fechaCaducidad)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: sem.badge, color: sem.text, border: `1px solid ${sem.border}`, borderRadius: 16, padding: '3px 10px', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {r.diasRestantes <= 0 ? 'Vencido' : `${r.diasRestantes} dias`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4a5568', fontSize: 13 }}>{r.cantidadDetectada}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: r.estatus === 'A' ? '#ebf8ff' : '#f3f4f6', color: r.estatus === 'A' ? '#2b6cb0' : '#6b7280', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                          {r.estatus === 'A' ? 'Abierto' : 'Cerrado'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#a0aec0', fontSize: 12 }}>{r.ultimaAccion || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => handleVerDetalle(r.idCad)}
                          style={{ background: '#2368b3', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Nuevo registro */}
      {showNuevoModal && (
        <div style={modalOverlay}>
          <div style={modalContent} ref={nuevoModalRef} role="dialog" aria-modal="true" aria-label="Nuevo caso de caducidad" tabIndex={-1}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#2368b3', fontSize: 18, fontWeight: 700 }}> Nuevo caso de caducidad</h3>
              <button onClick={() => setShowNuevoModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}>x</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Sucursal *</label>
                <select value={nuevoForm.idCentro} onChange={e => setNuevoForm(f => ({ ...f, idCentro: e.target.value }))} style={inputStyle}>
                  <option value="">Selecciona una sucursal</option>
                  {sucursalesAsignadas.map(s => <option key={s.idCentro} value={s.idCentro}>{s.Sucursal}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>🔍 Producto *</label>
                {productoBuscado ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #68d391', background: '#f0fff4', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#276749', fontSize: 14 }}>{(productoBuscado as any).Producto || productoBuscado.Descripcion}</div>
                      <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>Código: {productoBuscado.CodigoBarras}</div>
                    </div>
                    <button onClick={() => { setProductoBuscado(null); setNuevoForm(f => ({ ...f, codigoBarras: '' })); setSearchTermProducto(''); }}
                      style={{ background: '#e53e3e', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✕ Cambiar</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={searchTermProducto}
                        onChange={e => buscarProductos(e.target.value)}
                        placeholder="Buscar por nombre o código de barras..."
                        style={{ ...inputStyle, flex: 1, borderRadius: productosSugerencias.length > 0 || (searchTermProducto.length >= 2 && !loadingProductos) ? '8px 8px 0 0' : 8 }}
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
                    {searchTermProducto && (
                      <div style={{
                        border: '1px solid #e2e8f0',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        background: 'white',
                        maxHeight: 220,
                        overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}>
                        {loadingProductos ? (
                          <div style={{ padding: 16, textAlign: 'center', color: '#718096', fontSize: 13 }}>🔍 Buscando productos...</div>
                        ) : productosSugerencias.length > 0 ? (
                          productosSugerencias.map(p => (
                            <button
                              key={p.CodigoBarras}
                              type="button"
                              onClick={() => seleccionarProducto(p)}
                              style={{ display: 'flex', width: '100%', textAlign: 'left', background: 'white', border: 'none', font: 'inherit', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f7fafc', justifyContent: 'space-between', alignItems: 'center' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f0fff4')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                            >
                              <div>
                                <div style={{ fontWeight: 600, color: '#2d3748', fontSize: 13 }}>{(p as any).Producto || p.Descripcion}</div>
                                <div style={{ fontSize: 11, color: '#718096', fontFamily: 'monospace', marginTop: 2 }}>Código: {p.CodigoBarras}</div>
                              </div>
                              <span style={{ background: '#2368b3', color: 'white', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>➕ Seleccionar</span>
                            </button>
                          ))
                        ) : searchTermProducto.length >= 2 ? (
                          <div style={{ padding: 16, textAlign: 'center', color: '#718096', fontSize: 13 }}>No se encontraron productos</div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <label style={labelStyle}>Fecha de caducidad *</label>
                <input type="date" min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  value={nuevoForm.fechaCaducidad} onChange={e => setNuevoForm(f => ({ ...f, fechaCaducidad: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cantidad detectada *</label>
                <input type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="Ej. 12.5"
                  value={nuevoForm.cantidadDetectada} onChange={e => setNuevoForm(f => ({ ...f, cantidadDetectada: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dias de alerta (1-365)</label>
                <input type="number" inputMode="numeric" min="1" max="365"
                  value={nuevoForm.diasAlerta} onChange={e => setNuevoForm(f => ({ ...f, diasAlerta: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nota (opcional)</label>
                <textarea rows={2} placeholder="Observaciones adicionales..."
                  value={nuevoForm.nota} onChange={e => setNuevoForm(f => ({ ...f, nota: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none', minHeight: 70 }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNuevoModal(false)} disabled={guardandoNuevo} style={{ ...btnSecondary, opacity: guardandoNuevo ? 0.6 : 1 }}>Cancelar</button>
              <button onClick={handleGuardarNuevo} disabled={guardandoNuevo} style={{ ...btnPrimary, opacity: guardandoNuevo ? 0.6 : 1 }}>
                {guardandoNuevo ? 'Guardando...' : 'Guardar registro'}
              </button>
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

      {/* MODAL: Detalle */}
      {showDetalleModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 640 }} ref={detalleModalRef} role="dialog" aria-modal="true" aria-label="Detalle del caso" tabIndex={-1}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#2368b3', fontSize: 18, fontWeight: 700 }}> Detalle {casoDetalle ? `Caso #${casoDetalle.idCad}` : ''}</h3>
              <button onClick={() => setShowDetalleModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}>x</button>
            </div>
            {loadingDetalle ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Cargando detalle...</div>
            ) : casoDetalle ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Producto', value: casoDetalle.nombreProducto || casoDetalle.idProducto },
                    { label: 'Codigo', value: casoDetalle.codigoBarras || '-' },
                    { label: 'Sucursal', value: casoDetalle.nombreSucursal || casoDetalle.idCentro },
                    { label: 'Cantidad', value: String(casoDetalle.cantidadDetectada) },
                    { label: 'Caduca', value: formatFecha(casoDetalle.fechaCaducidad) },
                    { label: 'Registrado', value: formatFecha(casoDetalle.fechaRegistro) },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#f8f9fa', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const sem = getSemaforoColor(casoDetalle.diasRestantes);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ background: sem.badge, color: sem.text, border: `1.5px solid ${sem.border}`, borderRadius: 20, padding: '6px 16px', fontWeight: 700, fontSize: 14 }}>
                        {casoDetalle.diasRestantes <= 0 ? 'Producto vencido' : `${casoDetalle.diasRestantes} dias restantes - ${sem.label}`}
                      </span>
                      <span style={{ background: casoDetalle.estatus === 'A' ? '#ebf8ff' : '#f3f4f6', color: casoDetalle.estatus === 'A' ? '#2b6cb0' : '#6b7280', borderRadius: 12, padding: '4px 14px', fontSize: 13, fontWeight: 600 }}>
                        {casoDetalle.estatus === 'A' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                  );
                })()}
                {casoDetalle.nota && (
                  <div style={{ background: '#fffff0', border: '1px solid #f6e05e', borderRadius: 8, padding: 12, fontSize: 13, color: '#744210' }}>
                    <strong>Nota:</strong> {casoDetalle.nota}
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, color: '#2d3748', fontSize: 15, fontWeight: 600 }}>📋 Bitácora de acciones</h4>
                    {casoDetalle.estatus === 'A' && (
                      <button onClick={() => setShowAccionModal(true)}
                        style={{ background: '#f5942b', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32 }}>
                        + Agregar accion
                      </button>
                    )}
                  </div>
                  {acciones.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#a0aec0', background: '#f8f9fa', borderRadius: 8, fontSize: 13 }}>Sin acciones registradas</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                      {acciones.map(a => (
                        <div key={a.idAccion} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: '#2d3748' }}>{a.accion.replace(/_/g, ' ')}</span>
                            <span style={{ color: '#a0aec0', fontSize: 11 }}>{new Date(a.fechaHora).toLocaleString('es-MX')}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, color: '#718096', fontSize: 12 }}>
                            <span>Resultado: <strong>{a.resultado.replace(/_/g, ' ')}</strong></span>
                            {a.cantidad != null && <span>Cantidad: <strong>{a.cantidad}</strong></span>}
                            {a.nombreUsuario && <span>Por: {a.nombreUsuario}</span>}
                          </div>
                          {a.comentario && <div style={{ color: '#a0aec0', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>{a.comentario}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {casoDetalle.cierre && (
                  <div style={{ background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#2d3748', fontSize: 14, fontWeight: 600 }}>🔒 Información del cierre</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, fontSize: 13 }}>
                      <div><span style={{ color: '#a0aec0' }}>Resultado: </span><strong>{casoDetalle.cierre.resultadoFinal.replace(/_/g, ' ')}</strong></div>
                      <div><span style={{ color: '#a0aec0' }}>Fecha: </span><strong>{new Date(casoDetalle.cierre.fechaCierre).toLocaleString('es-MX')}</strong></div>
                      {casoDetalle.cierre.cantidadSalida != null && <div><span style={{ color: '#a0aec0' }}>Salida: </span><strong>{casoDetalle.cierre.cantidadSalida}</strong></div>}
                      {casoDetalle.cierre.cantidadMerma  != null && <div><span style={{ color: '#a0aec0' }}>Merma: </span><strong>{casoDetalle.cierre.cantidadMerma}</strong></div>}
                      {casoDetalle.cierre.idMerma && <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#a0aec0' }}>Merma vinculada: </span><strong style={{ color: '#c05621' }}>#{casoDetalle.cierre.idMerma}</strong></div>}
                      {casoDetalle.cierre.comentario && <div style={{ gridColumn: '1/-1', color: '#718096', fontStyle: 'italic' }}>{casoDetalle.cierre.comentario}</div>}
                    </div>
                  </div>
                )}
                {casoDetalle.estatus === 'A' && !casoDetalle.cierre && (
                  <button onClick={() => setShowCierreModal(true)} style={{ ...btnDanger, width: '100%', padding: 14, fontSize: 15 }}> Cerrar caso</button>
                )}
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>No se pudo cargar el detalle.</div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Accion */}
      {showAccionModal && (
        <div style={{ ...modalOverlay, zIndex: 1060 }}>
          <div style={{ ...modalContent, maxWidth: 440 }} ref={accionModalRef} role="dialog" aria-modal="true" aria-label="Registrar acción" tabIndex={-1}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#c05621', fontSize: 16, fontWeight: 700 }}>⚡ Registrar acción</h3>
              <button onClick={() => setShowAccionModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}>x</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                 <label style={labelStyle}>Tipo de acción</label>
                <select value={accionForm.idTipoAccion} onChange={e => setAccionForm(f => ({ ...f, idTipoAccion: parseInt(e.target.value) }))} style={inputStyle}>
                  {TIPOS_ACCION.map(t => <option key={t.id} value={t.id}>{t.label.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Resultado</label>
                <select value={accionForm.resultado} onChange={e => setAccionForm(f => ({ ...f, resultado: e.target.value }))} style={inputStyle}>
                  {RESULTADOS_ACCION.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Cantidad (opcional)</label>
                <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="Ej. 5" value={accionForm.cantidad} onChange={e => setAccionForm(f => ({ ...f, cantidad: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Comentario (opcional)</label>
                <textarea rows={2} value={accionForm.comentario} onChange={e => setAccionForm(f => ({ ...f, comentario: e.target.value }))} style={{ ...inputStyle, resize: 'none', minHeight: 70 }} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAccionModal(false)} disabled={guardandoAccion} style={{ ...btnSecondary, opacity: guardandoAccion ? 0.6 : 1 }}>Cancelar</button>
              <button onClick={handleGuardarAccion} disabled={guardandoAccion}
                style={{ background: '#f5942b', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44, opacity: guardandoAccion ? 0.6 : 1 }}>
                 {guardandoAccion ? 'Guardando...' : 'Guardar acción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cierre */}
      {showCierreModal && (
        <div style={{ ...modalOverlay, zIndex: 1060 }}>
          <div style={{ ...modalContent, maxWidth: 440 }} ref={cierreModalRef} role="dialog" aria-modal="true" aria-label="Cerrar caso" tabIndex={-1}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#c53030', fontSize: 16, fontWeight: 700 }}> Cerrar caso</h3>
              <button onClick={() => setShowCierreModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}>x</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fffaf0', border: '1px solid #f6ad55', borderRadius: 8, padding: 12, fontSize: 13, color: '#744210' }}>
                ⚠️ Esta acción es irreversible. El caso cambiará a Cerrado.
                {generaMerma(cierreForm.resultadoFinal) && (
                  <div style={{ marginTop: 6, color: '#c05621', fontWeight: 600 }}>Se creará un registro en Manejo de Mermas.</div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Resultado final</label>
                <select value={cierreForm.resultadoFinal} onChange={e => setCierreForm(f => ({ ...f, resultadoFinal: e.target.value }))} style={inputStyle}>
                  {RESULTADOS_CIERRE.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              {['SALIO_EN_VENTA', 'TRANSFERIDO', 'DEVOLUCION_PROVEEDOR'].includes(cierreForm.resultadoFinal) && (
                <div>
                  <label style={labelStyle}>Cantidad de salida (opcional)</label>
                  <input type="number" inputMode="decimal" min="0" step="0.01" value={cierreForm.cantidadSalida} onChange={e => setCierreForm(f => ({ ...f, cantidadSalida: e.target.value }))} style={inputStyle} />
                </div>
              )}
              {generaMerma(cierreForm.resultadoFinal) && (
                <div>
                  <label style={labelStyle}>Cantidad a mermar (opcional)</label>
                  <input type="number" inputMode="decimal" min="0.01" max={casoDetalle?.cantidadDetectada} step="0.01" placeholder={`Max. ${casoDetalle?.cantidadDetectada}`}
                    value={cierreForm.cantidadMerma} onChange={e => setCierreForm(f => ({ ...f, cantidadMerma: e.target.value }))} style={inputStyle} />
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#718096' }}>Si la dejas vacía se registrará toda la cantidad detectada.</p>
                </div>
              )}
              <div>
                <label style={labelStyle}>Comentario (opcional)</label>
                <textarea rows={2} value={cierreForm.comentario} onChange={e => setCierreForm(f => ({ ...f, comentario: e.target.value }))} style={{ ...inputStyle, resize: 'none', minHeight: 70 }} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCierreModal(false)} disabled={guardandoCierre} style={{ ...btnSecondary, opacity: guardandoCierre ? 0.6 : 1 }}>Cancelar</button>
              <button onClick={handleGuardarCierre} disabled={guardandoCierre} style={{ ...btnDanger, opacity: guardandoCierre ? 0.6 : 1 }}>
                {guardandoCierre ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
