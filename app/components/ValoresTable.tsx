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

const ValoresTable: React.FC<ValoresTableProps> = ({ movimientos }) => {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Folio</th>
          <th>Sucursal</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Movimiento</th>
          <th>Incidencia</th>
          <th>Tipo SF</th>
          <th>Importe</th>
        </tr>
      </thead>
      <tbody>
        {movimientos.length > 0 ? (
          movimientos.map((mov) => (
            <tr key={mov.folio}>
              <td>{mov.folio}</td>
              <td>{mov.sucursal}</td>
              <td>{mov.fecha}</td>
              <td>{mov.hora}</td>
              <td>{mov.movimiento}</td>
              <td>{mov.incidencia}</td>
              <td>{mov.tipoSF || '-'}</td>
              <td>{mov.importe ? `$${mov.importe.toFixed(2)}` : '-'}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>
              No hay movimientos para mostrar
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default ValoresTable;
