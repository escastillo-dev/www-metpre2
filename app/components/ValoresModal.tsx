import React from 'react';

interface ValoresModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  incidencias: Array<{idIncidencia: number, Incidencia: string}>;
}

const ValoresModal: React.FC<ValoresModalProps> = ({ show, onClose, onSubmit, formData, setFormData, incidencias }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Registrar Movimiento</h2>
        <form onSubmit={onSubmit}>
          {/* Ejemplo de campos, puedes agregar los que necesites */}
          <label>Sucursal</label>
          <input type="text" value={formData.idCentro} onChange={e => setFormData((f: any) => ({ ...f, idCentro: e.target.value }))} />
          <label>Incidencia</label>
          <select value={formData.idIncidencia} onChange={e => setFormData((f: any) => ({ ...f, idIncidencia: e.target.value }))}>
            <option value="">Selecciona una incidencia</option>
            {incidencias.map(inc => (
              <option key={inc.idIncidencia} value={inc.idIncidencia}>{inc.Incidencia}</option>
            ))}
          </select>
          {/* ...otros campos... */}
          <div className="modal-actions">
            <button type="submit">Guardar</button>
            <button type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          min-width: 320px;
        }
        .modal-actions {
          margin-top: 1rem;
          display: flex;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
};

export default ValoresModal;
