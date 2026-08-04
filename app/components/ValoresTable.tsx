import React from 'react';

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

interface ValoresTableProps {
  movimientos: Movimiento[];
}

// --- Helpers ----------------------------------------------------------------

const formatMXN = (v: number | null) =>
  v == null ? '-' : v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const formatFecha = (f: string) => {
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return f;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return f;
  }
};

/** Determina color/etiqueta según el tipo de movimiento (Retiro / Corte / Arqueo / etc.) */
function getMovimientoBadge(mov: string): { label: string; bg: string; color: string } {
  const v = (mov || '').trim().toUpperCase();
  if (v === 'R' || v.includes('RETIRO')) return { label: mov || 'Retiro', bg: '#feebc8', color: '#9c4221' };
  if (v === 'C' || v.includes('CORTE')) return { label: mov || 'Corte', bg: '#bee3f8', color: '#2c5282' };
  if (v === 'A' || v.includes('ARQUEO')) return { label: mov || 'Arqueo', bg: '#e9d8fd', color: '#553c9a' };
  return { label: mov || '-', bg: '#e2e8f0', color: '#2d3748' };
}

const emptyState = (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '40px 16px', color: '#a0aec0', fontSize: 14, fontWeight: 500, gap: 8,
  }}>
    <span style={{ fontSize: 32 }}>📭</span>
    No hay movimientos para mostrar
  </div>
);

const ValoresTable: React.FC<ValoresTableProps> = ({ movimientos }) => {
  if (movimientos.length === 0) {
    return <div className="bg-white rounded-xl border border-gray-200">{emptyState}</div>;
  }

  return (
    <>
      {/* --- Vista de escritorio: tabla completa (oculta en móvil) --- */}
      <div className="hidden md:block" style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7fafc' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12.5, color: '#4a5568', fontWeight: 700 }}>Folio</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12.5, color: '#4a5568', fontWeight: 700 }}>Sucursal</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12.5, color: '#4a5568', fontWeight: 700 }}>Fecha</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12.5, color: '#4a5568', fontWeight: 700 }}>Hora</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12.5, color: '#4a5568', fontWeight: 700 }}>Movimiento</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12.5, color: '#4a5568', fontWeight: 700 }}>Incidencia</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12.5, color: '#4a5568', fontWeight: 700 }}>Tipo SF</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12.5, color: '#4a5568', fontWeight: 700 }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((mov) => {
              const badge = getMovimientoBadge(mov.movimiento);
              return (
                <tr key={mov.folio} style={{ borderTop: '1px solid #edf2f7' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#2d3748', fontWeight: 600 }}>#{mov.folio}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#2d3748' }}>{mov.sucursal}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#4a5568' }}>{formatFecha(mov.fecha)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#4a5568' }}>{mov.hora}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#4a5568' }}>{mov.incidencia || '-'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#4a5568' }}>{mov.tipoSF || '-'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#276749', fontWeight: 700, textAlign: 'right' }}>{formatMXN(mov.importe)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- Vista móvil: tarjetas apiladas (ocultas en escritorio) --- */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {movimientos.map((mov) => {
          const badge = getMovimientoBadge(mov.movimiento);
          return (
            <div
              key={mov.folio}
              style={{
                background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
            >
              {/* Encabezado de la tarjeta: folio + badge + importe */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#2d3748' }}>Folio #{mov.folio}</div>
                  <div style={{ fontSize: 12.5, color: '#718096' }}>{formatFecha(mov.fecha)} · {mov.hora}</div>
                </div>
                <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {badge.label}
                </span>
              </div>

              {/* Cuerpo: campos clave en grid de 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 8, columnGap: 10, fontSize: 13 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Sucursal</div>
                  <div style={{ color: '#2d3748', fontWeight: 500 }}>{mov.sucursal}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Tipo SF</div>
                  <div style={{ color: '#2d3748', fontWeight: 500 }}>{mov.tipoSF || '-'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Incidencia</div>
                  <div style={{ color: '#2d3748', fontWeight: 500 }}>{mov.incidencia || '-'}</div>
                </div>
              </div>

              {/* Pie: importe destacado */}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#718096', fontWeight: 600 }}>Importe</span>
                <span style={{ fontSize: 17, color: '#276749', fontWeight: 800 }}>{formatMXN(mov.importe)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ValoresTable;

