'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import '../styles/apertura-cierre-modal.css';

interface Equipment { id: string; name: string; icon: string }
interface EquipmentEvaluation { status: string; comment: string }
interface Sucursal { idCentro: string; Sucursal: string }
interface RegistroData {
  sucursal: string; fecha: string; horaInicio: string; horaFin: string;
  anfitrion: string; plantilla: string; candados: number; comentarios: string;
}
interface AperturaCierreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RegistroData & {
    tipo: 'apertura' | 'cierre';
    equipos: Array<EquipmentEvaluation & { id: string }>;
  }) => Promise<void>;
  equipmentList: Equipment[];
  sucursalesAsignadas: Sucursal[];
  tipo: 'apertura' | 'cierre';
  guardando: boolean;
}

function initialForm(): RegistroData {
  const now = new Date();
  const fecha = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { sucursal: '', fecha, horaInicio: now.toTimeString().slice(0, 5),
    horaFin: '', anfitrion: '', plantilla: '', candados: 0, comentarios: '' };
}

const statusOptions = [
  { value: 'B', label: 'Bien' },
  { value: 'R', label: 'Regular' },
  { value: 'M', label: 'Mal' }
];
const steps = ['Datos generales', 'Evaluar equipos', 'Revisar registro'];

export default function AperturaCierreModal({ isOpen, onClose, onSubmit, equipmentList,
  sucursalesAsignadas, tipo, guardando }: AperturaCierreModalProps) {
  const [formData, setFormData] = useState(initialForm);
  const [evaluations, setEvaluations] = useState<Record<string, EquipmentEvaluation>>({});
  const [step, setStep] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const id = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen, () => { if (!guardando) onClose(); });

  useEffect(() => {
    if (!isOpen) {
      setFormData(initialForm());
      setEvaluations({});
      setStep(1);
      setShowErrors(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      bodyRef.current?.scrollTo({ top: 0 });
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [step, isOpen]);

  const missing = [
    !formData.sucursal && 'Sucursal', !formData.fecha && 'Fecha',
    !formData.horaInicio && 'Hora de inicio', !formData.anfitrion.trim() && 'Anfitrión'
  ].filter(Boolean);
  const completed = equipmentList.filter(e => evaluations[e.id]?.status).length;
  const allEvaluated = completed === equipmentList.length;
  const update = <K extends keyof RegistroData>(field: K, value: RegistroData[K]) =>
    setFormData(prev => ({ ...prev, [field]: value }));
  const evaluate = (equipmentId: string, patch: Partial<EquipmentEvaluation>) =>
    setEvaluations(prev => ({ ...prev, [equipmentId]: {
      status: prev[equipmentId]?.status || '', comment: prev[equipmentId]?.comment || '', ...patch
    } }));

  const handleContinue = () => {
    if (guardando) return;
    if ((step === 1 && missing.length > 0) || (step === 2 && !allEvaluated)) {
      setShowErrors(true);
      const selector = step === 1 ? ':invalid' : '[data-pending="true"] input';
      const field = bodyRef.current?.querySelector<HTMLElement>(selector);
      field?.focus();
      return;
    }
    setShowErrors(false);
    setStep(prev => Math.min(3, prev + 1));
  };
  const handleSubmit = async () => {
    if (guardando || missing.length > 0 || !allEvaluated) return;
    await onSubmit({ ...formData, tipo, equipos: equipmentList.map(e => ({ id: e.id, ...evaluations[e.id] })) });
  };
  const invalid = (empty: boolean) => showErrors && empty;
  if (!isOpen) return null;

  return createPortal(
    <div className="apci-overlay">
      <div className={`apci-dialog apci-dialog--${tipo}`} ref={containerRef} role="dialog"
        aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1} aria-busy={guardando}>
        <header className="apci-header">
          <div><p className="apci-eyebrow">Registro de sucursal</p>
            <h2 id={`${id}-title`}>{tipo === 'apertura' ? 'Nueva apertura' : 'Nuevo cierre'}</h2></div>
          <button type="button" className="apci-close" aria-label="Cerrar registro" onClick={onClose} disabled={guardando}>×</button>
        </header>
        <nav className="apci-progress" aria-label="Progreso del registro">
          <ol>{steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined}
            className={step >= index + 1 ? 'apci-step-active' : ''}>
            <span>{index + 1}</span><span>{label}</span>
          </li>)}</ol>
        </nav>
        <div className="apci-body" ref={bodyRef}>
          <h3 ref={headingRef} tabIndex={-1} className="apci-step-title">{steps[step - 1]}</h3>
          {step === 1 && <>
            <p className="apci-help">Los campos con * son obligatorios.</p>
            <div className="apci-fields">
              <label className="apci-full">Sucursal *
                <select value={formData.sucursal} onChange={e => update('sucursal', e.target.value)} required
                  aria-invalid={invalid(!formData.sucursal)}>
                  <option value="">Selecciona una sucursal</option>
                  {sucursalesAsignadas.map(s => <option key={s.idCentro} value={s.idCentro}>{s.Sucursal}</option>)}
                </select>
              </label>
              <label className="apci-full">Fecha *<input type="date" value={formData.fecha} required
                aria-invalid={invalid(!formData.fecha)} onChange={e => update('fecha', e.target.value)} /></label>
              <label>Hora de inicio *<input type="time" value={formData.horaInicio} required
                aria-invalid={invalid(!formData.horaInicio)} onChange={e => update('horaInicio', e.target.value)} /></label>
              <label>Hora de fin<input type="time" value={formData.horaFin} onChange={e => update('horaFin', e.target.value)} /></label>
              <label className="apci-full">Anfitrión *<input type="text" inputMode="numeric" pattern="[0-9]*"
                value={formData.anfitrion} required placeholder="Número de nómina"
                aria-invalid={invalid(!formData.anfitrion.trim())} onChange={e => update('anfitrion', e.target.value)} /></label>
              <label>Plantilla<input type="text" inputMode="numeric" pattern="[0-9]*" value={formData.plantilla}
                onChange={e => update('plantilla', e.target.value)} /></label>
              <label>Candados<input type="text" inputMode="numeric" pattern="[0-9]*" value={formData.candados || ''}
                onChange={e => update('candados', Math.max(0, parseInt(e.target.value) || 0))} /></label>
            </div>
            {showErrors && missing.length > 0 && <p className="apci-error" role="alert">Completa: {missing.join(', ')}.</p>}
          </>}
          {step === 2 && <>
            <p className="apci-help" role="status">{completed} de {equipmentList.length} equipos evaluados. Selecciona un estado para cada equipo.</p>
            <div className="apci-equipment-list">{equipmentList.map((equipment, index) =>
              <fieldset className="apci-equipment" key={equipment.id} data-pending={!evaluations[equipment.id]?.status}>
                <legend><span aria-hidden="true">{equipment.icon} </span>{index + 1}. {equipment.name}</legend>
                <div className="apci-status-options">{statusOptions.map(status =>
                  <label className={`apci-status apci-status--${status.value}`} key={status.value}>
                    <input type="radio" name={`${id}-equipment-${equipment.id}`} value={status.value}
                      checked={evaluations[equipment.id]?.status === status.value}
                      onChange={() => evaluate(equipment.id, { status: status.value })} />
                    <span>{status.label}</span>
                  </label>
                )}</div>
                <details className="apci-comment"><summary>Comentario opcional{evaluations[equipment.id]?.comment ? ' · Agregado' : ''}</summary>
                  <label>Detalle de {equipment.name}<textarea rows={2} value={evaluations[equipment.id]?.comment || ''}
                    onChange={e => evaluate(equipment.id, { comment: e.target.value })} placeholder="Describe lo que observaste" /></label>
                </details>
              </fieldset>
            )}</div>
            {showErrors && !allEvaluated && <p className="apci-error" role="alert">Faltan {equipmentList.length - completed} equipos por evaluar.</p>}
          </>}
          {step === 3 && <>
            <p className="apci-help">Confirma los datos antes de registrar {tipo === 'apertura' ? 'la apertura' : 'el cierre'}.</p>
            <section className="apci-review"><div className="apci-section-heading"><h4>Datos generales</h4>
              <button type="button" className="apci-edit" onClick={() => setStep(1)} disabled={guardando}>Editar datos</button></div>
              <dl>{[
                ['Sucursal', sucursalesAsignadas.find(s => s.idCentro === formData.sucursal)?.Sucursal],
                ['Fecha', formData.fecha], ['Hora de inicio', formData.horaInicio], ['Hora de fin', formData.horaFin || 'Sin especificar'],
                ['Anfitrión', formData.anfitrion], ['Plantilla', formData.plantilla || 'Sin especificar'], ['Candados', formData.candados]
              ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            </section>
            <section className="apci-review"><div className="apci-section-heading"><h4>Equipos ({completed}/{equipmentList.length})</h4>
              <button type="button" className="apci-edit" onClick={() => setStep(2)} disabled={guardando}>Editar equipos</button></div>
              <ul className="apci-review-equipment">{equipmentList.map(e => <li key={e.id}>
                <div><span>{e.name}</span><strong className={`apci-result--${evaluations[e.id]?.status}`}>
                  {statusOptions.find(s => s.value === evaluations[e.id]?.status)?.label || 'Sin evaluar'}</strong></div>
                {evaluations[e.id]?.comment && <p>{evaluations[e.id].comment}</p>}
              </li>)}</ul>
            </section>
            <label className="apci-final-comment">Comentarios finales (opcional)<textarea rows={3} value={formData.comentarios}
              onChange={e => update('comentarios', e.target.value)} placeholder="Agrega información sobre el recorrido" /></label>
          </>}
        </div>
        <footer className="apci-footer">
          <span className="apci-footer-progress">Paso {step} de 3</span>
          <div className="apci-actions">
            <button type="button" className="apci-secondary" disabled={guardando}
              onClick={() => { if (step === 1) onClose(); else { setShowErrors(false); setStep(step - 1); } }}>
              {step === 1 ? 'Cancelar' : 'Anterior'}
            </button>
            <button type="button" className="apci-primary" disabled={guardando}
              onClick={step < 3 ? handleContinue : handleSubmit}>
              {guardando ? 'Guardando…' : step < 3 ? 'Continuar' : `Registrar ${tipo}`}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.body
  );
}
