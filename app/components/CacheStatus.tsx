'use client';
import { useEffect, useRef, useState } from 'react';
import { invalidateOperational, OPERATIONAL_EVENT, OPERATIONAL_TTL_MS, OperationalDomain } from '../services/operationalCache';

interface Props { domain: OperationalDomain; onRefresh: () => void | Promise<void> }
export default function CacheStatus({ domain, onRefresh }: Props) {
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  const refresh = useRef(onRefresh);
  useEffect(() => { refresh.current = onRefresh; }, [onRefresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const onCache = (event: Event) => {
      const detail = (event as CustomEvent<{ domain: OperationalDomain; updatedAt?: number; invalidated?: boolean }>).detail;
      if (detail.domain !== domain) return;
      if (detail.updatedAt) { setUpdatedAt(detail.updatedAt); setNow(Date.now()); }
      // No descargar al invalidar: la pantalla se renueva por su flujo habitual
      // o al volver a visitarla. Así no se recargan paneles ocultos del dashboard.
      if (detail.invalidated) setUpdatedAt(null);
    };
    window.addEventListener(OPERATIONAL_EVENT, onCache);
    return () => window.removeEventListener(OPERATIONAL_EVENT, onCache);
  }, [domain]);
  const update = async () => {
    setBusy(true); setError('');
    try { await invalidateOperational([domain]); await refresh.current(); }
    catch { setError('No se pudo actualizar. Intenta nuevamente.'); }
    finally { setBusy(false); }
  };
  return <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
    <span role="status" style={{ fontSize: 12, color: '#526178' }}>{error || (updatedAt ? `Actualizado: ${new Date(updatedAt).toLocaleString('es-MX')} · ${now - updatedAt >= OPERATIONAL_TTL_MS ? 'Datos guardados; actualiza para consultar cambios' : 'Datos vigentes (5 min)'}` : 'Sin consulta vigente. Actualiza para obtener datos recientes.')}</span>
    <button type="button" onClick={update} disabled={busy} style={{ minHeight: 44, padding: '8px 14px', border: '1px solid #2368b3', color: '#2368b3', background: 'white', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>{busy ? 'Actualizando…' : 'Actualizar'}</button>
  </div>;
}
