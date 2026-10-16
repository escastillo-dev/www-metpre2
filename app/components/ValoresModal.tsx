import React, { useState, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

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
  guardando: boolean;
}

const ValoresModal: React.FC<ValoresModalProps> = ({ show, onClose, onSubmit, formData, setFormData, incidencias, sucursalesAsignadas, guardando }) => {
  const containerRef = useFocusTrap<HTMLDivElement>(show, onClose);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!show) setErrors({});
  }, [show]);

  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!formData.idCentro) newErrors.idCentro = 'Seleccione una sucursal';
    if (!formData.hora) newErrors.hora = 'Ingrese la hora';
    if (!formData.movimiento) newErrors.movimiento = 'Seleccione el tipo de movimiento';
    if (formData.caja === '' || formData.caja === undefined) newErrors.caja = 'Ingrese el número de caja';
    if (formData.cajero === '' || formData.cajero === undefined) newErrors.cajero = 'Ingrese el número de cajero';
    if (formData.sf === 'S') {
      if (!formData.tipoSF || formData.tipoSF === 'N') newErrors.tipoSF = 'Seleccione el tipo de sobrante/faltante';
      if (formData.sfMonto === '' || formData.sfMonto === undefined || Number(formData.sfMonto) <= 0) {
        newErrors.sfMonto = 'Ingrese un monto válido mayor a 0';
      }
    }
    return newErrors;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      e.preventDefault();
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit(e);
  };

  const clearError = (field: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };
  if (!show) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={containerRef} role="dialog" aria-modal="true" aria-label="Registrar nuevo movimiento" tabIndex={-1}>
        <div className="modal-header">
          <h3>Registrar Nuevo Movimiento</h3>
          <button type="button" className="modal-close" onClick={onClose} disabled={guardando}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleFormSubmit} noValidate className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="valor-sucursal">Sucursal</label>
              <select
                id="valor-sucursal"
                className="form-input"
                value={formData.idCentro}
                onChange={(e) => { setFormData({ ...formData, idCentro: e.target.value }); clearError('idCentro'); }}
                aria-invalid={!!errors.idCentro}
                aria-describedby={errors.idCentro ? 'valor-sucursal-error' : undefined}
                style={errors.idCentro ? { borderColor: '#e53e3e' } : undefined}
              >
                <option value="">Seleccione una sucursal</option>
                {sucursalesAsignadas.map((sucursal) => (
                  <option key={sucursal.idCentro} value={sucursal.idCentro}>
                    {sucursal.Sucursal}
                  </option>
                ))}
              </select>
              {errors.idCentro && <div id="valor-sucursal-error" role="alert" className="form-error">{errors.idCentro}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="valor-hora">Hora</label>
              <input
                id="valor-hora"
                type="time"
                className="form-input"
                value={formData.hora}
                onChange={(e) => { setFormData({ ...formData, hora: e.target.value }); clearError('hora'); }}
                aria-invalid={!!errors.hora}
                aria-describedby={errors.hora ? 'valor-hora-error' : undefined}
                style={errors.hora ? { borderColor: '#e53e3e' } : undefined}
              />
              {errors.hora && <div id="valor-hora-error" role="alert" className="form-error">{errors.hora}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="valor-movimiento">Tipo de Movimiento</label>
              <select
                id="valor-movimiento"
                className="form-input"
                value={formData.movimiento}
                onChange={(e) => { setFormData({ ...formData, movimiento: e.target.value }); clearError('movimiento'); }}
                aria-invalid={!!errors.movimiento}
                aria-describedby={errors.movimiento ? 'valor-movimiento-error' : undefined}
                style={errors.movimiento ? { borderColor: '#e53e3e' } : undefined}
              >
                <option value="R">Retiro (R)</option>
                <option value="C">Corte (C)</option>
                <option value="A">Arqueo (A)</option>
              </select>
              {errors.movimiento && <div id="valor-movimiento-error" role="alert" className="form-error">{errors.movimiento}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="valor-caja">Caja</label>
              <input
                id="valor-caja"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-input"
                value={formData.caja}
                onChange={(e) => { setFormData({ ...formData, caja: e.target.value }); clearError('caja'); }}
                aria-invalid={!!errors.caja}
                aria-describedby={errors.caja ? 'valor-caja-error' : undefined}
                style={errors.caja ? { borderColor: '#e53e3e' } : undefined}
              />
              {errors.caja && <div id="valor-caja-error" role="alert" className="form-error">{errors.caja}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="valor-cajero">Cajero</label>
              <input
                id="valor-cajero"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-input"
                value={formData.cajero}
                onChange={(e) => { setFormData({ ...formData, cajero: e.target.value }); clearError('cajero'); }}
                aria-invalid={!!errors.cajero}
                aria-describedby={errors.cajero ? 'valor-cajero-error' : undefined}
                style={errors.cajero ? { borderColor: '#e53e3e' } : undefined}
              />
              {errors.cajero && <div id="valor-cajero-error" role="alert" className="form-error">{errors.cajero}</div>}
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-input"
                value={formData.anfitrion}
                onChange={(e) => setFormData({ ...formData, anfitrion: e.target.value })}
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
                  <label className="form-label" htmlFor="valor-tiposf">Tipo S/F</label>
                  <select
                    id="valor-tiposf"
                    className="form-input"
                    value={formData.tipoSF}
                    onChange={(e) => { setFormData({ ...formData, tipoSF: e.target.value }); clearError('tipoSF'); }}
                    aria-invalid={!!errors.tipoSF}
                    aria-describedby={errors.tipoSF ? 'valor-tiposf-error' : undefined}
                    style={errors.tipoSF ? { borderColor: '#e53e3e' } : undefined}
                  >
                    <option value="N">Seleccione</option>
                    <option value="S">Sobrante</option>
                    <option value="F">Faltante</option>
                  </select>
                  {errors.tipoSF && <div id="valor-tiposf-error" role="alert" className="form-error">{errors.tipoSF}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="valor-sfmonto">Monto S/F</label>
                  <input
                    id="valor-sfmonto"
                    type="number"
                    inputMode="decimal"
                    className="form-input"
                    value={formData.sfMonto}
                    onChange={(e) => { setFormData({ ...formData, sfMonto: e.target.value }); clearError('sfMonto'); }}
                    min="0"
                    step="0.01"
                    aria-invalid={!!errors.sfMonto}
                    aria-describedby={errors.sfMonto ? 'valor-sfmonto-error' : undefined}
                    style={errors.sfMonto ? { borderColor: '#e53e3e' } : undefined}
                  />
                  {errors.sfMonto && <div id="valor-sfmonto-error" role="alert" className="form-error">{errors.sfMonto}</div>}
                </div>
              </>
            )}

            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={guardando}
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "0.375rem",
                  backgroundColor: "white",
                  color: "#4a5568",
                  fontWeight: "500",
                  cursor: guardando ? "not-allowed" : "pointer",
                  opacity: guardando ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontWeight: "500",
                  cursor: guardando ? "not-allowed" : "pointer",
                  opacity: guardando ? 0.75 : 1
                }}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ValoresModal;
