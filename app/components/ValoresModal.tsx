import React from 'react';

interface Sucursal {
  idCentro: string;
  Sucursal: string;
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

interface ValoresModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: MovimientoFormData;
  setFormData: React.Dispatch<React.SetStateAction<MovimientoFormData>>;
  incidencias: Array<{idIncidencia: number, Incidencia: string}>;
  sucursalesAsignadas: Sucursal[];
}

const ValoresModal: React.FC<ValoresModalProps> = ({ show, onClose, onSubmit, formData, setFormData, incidencias, sucursalesAsignadas }) => {
  if (!show) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Registrar Nuevo Movimiento</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={onSubmit} className="form-grid">
            <div className="form-group">
              <label className="form-label">Sucursal</label>
              <select
                className="form-input"
                value={formData.idCentro}
                onChange={(e) => setFormData({ ...formData, idCentro: e.target.value })}
                required
              >
                <option value="">Seleccione una sucursal</option>
                {sucursalesAsignadas.map((sucursal) => (
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
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Movimiento</label>
              <select
                className="form-input"
                value={formData.movimiento}
                onChange={(e) => setFormData({ ...formData, movimiento: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, caja: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cajero</label>
              <input
                type="number"
                className="form-input"
                value={formData.cajero}
                onChange={(e) => setFormData({ ...formData, cajero: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Incidencia</label>
              <select
                className="form-input"
                value={formData.idIncidencia}
                onChange={(e) => setFormData({ ...formData, idIncidencia: e.target.value })}
              >
                <option value="">Sin incidencia</option>
                {incidencias.map((incidencia) => (
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
                onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Depósito</label>
              <select
                className="form-input"
                value={formData.deposito}
                onChange={(e) => setFormData({ ...formData, deposito: e.target.value })}
              >
                <option value="N">No</option>
                <option value="S">Sí</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Anfitrión</label>
              <input
                type="number"
                className="form-input"
                value={formData.anfitrion}
                onChange={(e) => setFormData({ ...formData, anfitrion: e.target.value })}
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">¿Sobrante/Faltante?</label>
              <select
                className="form-input"
                value={formData.sf}
                onChange={(e) => {
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

            {formData.sf === 'S' && (
              <>
                <div className="form-group">
                  <label className="form-label">Tipo S/F</label>
                  <select
                    className="form-input"
                    value={formData.tipoSF}
                    onChange={(e) => setFormData({ ...formData, tipoSF: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, sfMonto: e.target.value })}
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
                onClick={onClose}
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
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ValoresModal;
