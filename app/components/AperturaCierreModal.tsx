import React, { useState, useEffect } from 'react';

interface Equipment {
  id: string;
  name: string;
  icon: string;
}

interface EquipmentEvaluation {
  status: string;
  comment: string;
}

interface Sucursal {
  idCentro: string;
  Sucursal: string;
}

interface AperturaCierreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  equipmentList: Equipment[];
  sucursalesAsignadas: Sucursal[];
  tipo: 'apertura' | 'cierre';
}

const AperturaCierreModal: React.FC<AperturaCierreModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  equipmentList,
  sucursalesAsignadas,
  tipo
}) => {
  const [formData, setFormData] = useState({
    sucursal: '',
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: new Date().toTimeString().slice(0, 5),
    horaFin: '',
    anfitrion: '',
    plantilla: '',
    candados: 0,
    comentarios: ''
  });

  const [equipmentEvaluations, setEquipmentEvaluations] = useState<{ [key: string]: EquipmentEvaluation }>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Initialize equipment evaluations based on equipmentList
  useEffect(() => {
    if (equipmentList.length > 0) {
      const initialEvaluations: { [key: string]: EquipmentEvaluation } = {};
      equipmentList.forEach(equipment => {
        if (!equipmentEvaluations[equipment.id]) {
          initialEvaluations[equipment.id] = { status: '', comment: '' };
        } else {
          initialEvaluations[equipment.id] = equipmentEvaluations[equipment.id];
        }
      });
      setEquipmentEvaluations(initialEvaluations);
    }
  }, [equipmentList]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setFormData({
        sucursal: '',
        fecha: new Date().toISOString().split('T')[0],
        horaInicio: new Date().toTimeString().slice(0, 5),
        horaFin: '',
        anfitrion: '',
        plantilla: '',
        candados: 0,
        comentarios: ''
      });
      // Reset equipment evaluations
      const resetEvaluations: { [key: string]: EquipmentEvaluation } = {};
      equipmentList.forEach(equipment => {
        resetEvaluations[equipment.id] = { status: '', comment: '' };
      });
      setEquipmentEvaluations(resetEvaluations);
    }
  }, [isOpen, equipmentList]);

  const handleEquipmentStatusChange = (equipmentId: string, status: string) => {
    setEquipmentEvaluations(prev => ({
      ...prev,
      [equipmentId]: {
        ...prev[equipmentId],
        status: status
      }
    }));
  };

  const handleEquipmentCommentChange = (equipmentId: string, comment: string) => {
    setEquipmentEvaluations(prev => ({
      ...prev,
      [equipmentId]: {
        ...prev[equipmentId],
        comment: comment
      }
    }));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return formData.sucursal && formData.fecha && formData.horaInicio && formData.anfitrion;
      case 2:
        // Verificar que todos los equipos de la lista tengan un estado evaluado
        const evaluatedCount = equipmentList.filter(equipment => 
          equipmentEvaluations[equipment.id]?.status && equipmentEvaluations[equipment.id]?.status !== ''
        ).length;
        return evaluatedCount === equipmentList.length;
      case 3:
        return true; // Step 3 is optional review
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateCurrentStep()) {
      // Prepare data for submission
      const equipmentsForAPI: any[] = [];
      
      Object.entries(equipmentEvaluations).forEach(([equipmentId, evaluation]) => {
        if (evaluation.status) {
          equipmentsForAPI.push({
            id: equipmentId,
            status: evaluation.status,
            comment: evaluation.comment || ''
          });
        }
      });

      const modalData = {
        ...formData,
        tipo: tipo,
        equipos: equipmentsForAPI
      };

      onSubmit(modalData);
      onClose();
    }
  };

  const getCompletedEquipmentCount = () => {
    return equipmentList.filter(equipment => 
      equipmentEvaluations[equipment.id]?.status && equipmentEvaluations[equipment.id]?.status !== ''
    ).length;
  };

  const statusOptions = [
    { value: 'B', label: 'Bien', color: '#48bb78', emoji: '✅' },
    { value: 'R', label: 'Regular', color: '#ed8936', emoji: '⚠️' },
    { value: 'M', label: 'Mal', color: '#e53e3e', emoji: '❌' }
  ];

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: tipo === 'apertura' 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
              {tipo === 'apertura' ? '🌅 Nueva Apertura' : '🌙 Nuevo Cierre'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
              Paso {currentStep} de {totalSteps}
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '20px',
              color: 'white'
            }}
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ padding: '0 32px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '32px',
            paddingTop: '24px'
          }}>
            {[1, 2, 3].map((step) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: currentStep >= step 
                    ? (tipo === 'apertura' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)')
                    : '#e2e8f0',
                  color: currentStep >= step ? 'white' : '#a0aec0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '16px'
                }}>
                  {step}
                </div>
                {step < 3 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: currentStep > step ? (tipo === 'apertura' ? '#667eea' : '#f093fb') : '#e2e8f0',
                    margin: '0 16px'
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Step Labels */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: currentStep >= 1 ? '#2d3748' : '#a0aec0' }}>
                Información Básica
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '600', color: currentStep >= 2 ? '#2d3748' : '#a0aec0' }}>
                Equipos ({getCompletedEquipmentCount()}/{equipmentList.length})
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '600', color: currentStep >= 3 ? '#2d3748' : '#a0aec0' }}>
                Revisión
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '0 32px',
          marginBottom: '24px'
        }}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ color: '#2d3748', marginBottom: '25px', fontSize: '20px' }}>
                📋 Información General
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2d3748' }}>
                    Sucursal *
                  </label>
                  <select
                    value={formData.sucursal}
                    onChange={e => setFormData({...formData, sucursal: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Selecciona una sucursal</option>
                    {sucursalesAsignadas.map(sucursal => (
                      <option key={sucursal.idCentro} value={sucursal.idCentro}>
                        {sucursal.Sucursal}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2d3748' }}>
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={e => setFormData({...formData, fecha: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2d3748' }}>
                    Hora de Inicio *
                  </label>
                  <input
                    type="time"
                    value={formData.horaInicio}
                    onChange={e => setFormData({...formData, horaInicio: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2d3748' }}>
                    Hora de Fin
                  </label>
                  <input
                    type="time"
                    value={formData.horaFin}
                    onChange={e => setFormData({...formData, horaFin: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2d3748' }}>
                    Anfitrión *
                  </label>
                  <input
                    type="text"
                    value={formData.anfitrion}
                    onChange={e => setFormData({...formData, anfitrion: e.target.value})}
                    required
                    placeholder="Nombre del anfitrión"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2d3748' }}>
                    Plantilla
                  </label>
                  <input
                    type="text"
                    value={formData.plantilla}
                    onChange={e => setFormData({...formData, plantilla: e.target.value})}
                    placeholder="Número de plantilla"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2d3748' }}>
                    Candados
                  </label>
                  <input
                    type="number"
                    value={formData.candados || ''}
                    onChange={e => setFormData({...formData, candados: parseInt(e.target.value) || 0})}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Equipment Evaluation with Checkboxes */}
          {currentStep === 2 && (
            <div>
              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ color: '#2d3748', margin: 0, fontSize: '20px' }}>
                    🔧 Evaluación de Equipos
                  </h3>
                  <div style={{ 
                    background: getCompletedEquipmentCount() === equipmentList.length ? '#d4edda' : '#fff3cd', 
                    color: getCompletedEquipmentCount() === equipmentList.length ? '#155724' : '#856404', 
                    padding: '8px 16px', 
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {getCompletedEquipmentCount()} / {equipmentList.length} completados
                  </div>
                </div>
                
                {getCompletedEquipmentCount() < equipmentList.length && (
                  <div style={{
                    background: '#fef7e0',
                    border: '1px solid #f6e05e',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#744210'
                  }}>
                    ⚡ Evalúa todos los equipos para continuar al siguiente paso
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {equipmentList.map(equipment => (
                  <div key={equipment.id} style={{
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: equipmentEvaluations[equipment.id]?.status ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <span style={{ fontSize: '28px' }}>{equipment.icon}</span>
                      <h4 style={{ margin: 0, color: '#2d3748', fontSize: '18px', fontWeight: '600', flex: 1 }}>
                        {equipment.name}
                      </h4>
                      {equipmentEvaluations[equipment.id]?.status ? (
                        <div style={{ 
                          background: 'linear-gradient(135deg, #48bb78, #38a169)', 
                          color: 'white', 
                          borderRadius: '20px', 
                          padding: '6px 16px', 
                          fontSize: '13px', 
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(72, 187, 120, 0.3)'
                        }}>
                          ✓ Evaluado
                        </div>
                      ) : (
                        <div style={{ 
                          background: '#fed7d7', 
                          color: '#c53030', 
                          borderRadius: '20px', 
                          padding: '6px 16px', 
                          fontSize: '13px', 
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          ⏳ Pendiente
                        </div>
                      )}
                    </div>

                    {/* Checkboxes for Status */}
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500', color: '#2d3748' }}>
                        Estado del equipo: *
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {statusOptions.map(status => (
                          <label key={status.value} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 16px',
                            border: `2px solid ${equipmentEvaluations[equipment.id]?.status === status.value ? status.color : '#e2e8f0'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: equipmentEvaluations[equipment.id]?.status === status.value ? `${status.color}15` : 'white',
                            transition: 'all 0.2s ease',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>
                            <input
                              type="checkbox"
                              checked={equipmentEvaluations[equipment.id]?.status === status.value}
                              onChange={() => handleEquipmentStatusChange(equipment.id, status.value)}
                              style={{ display: 'none' }}
                            />
                            <span style={{ fontSize: '16px' }}>{status.emoji}</span>
                            <span style={{ color: equipmentEvaluations[equipment.id]?.status === status.value ? status.color : '#4a5568' }}>
                              {status.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Comment TextArea */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2d3748' }}>
                        Comentarios adicionales:
                      </label>
                      <textarea
                        value={equipmentEvaluations[equipment.id]?.comment || ''}
                        onChange={e => handleEquipmentCommentChange(equipment.id, e.target.value)}
                        rows={2}
                        placeholder="Describe detalles del estado del equipo (opcional)..."
                        style={{ 
                          width: '100%', 
                          padding: '12px', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          resize: 'vertical',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ color: '#2d3748', marginBottom: '25px', fontSize: '20px' }}>
                📋 Revisión Final
              </h3>
              
              <div style={{ background: '#f7fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h4 style={{ color: '#2d3748', marginBottom: '15px' }}>Información General:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div><strong>Sucursal:</strong> {sucursalesAsignadas.find(s => s.idCentro === formData.sucursal)?.Sucursal}</div>
                  <div><strong>Fecha:</strong> {formData.fecha}</div>
                  <div><strong>Hora Inicio:</strong> {formData.horaInicio}</div>
                  <div><strong>Anfitrión:</strong> {formData.anfitrion}</div>
                  <div><strong>Candados:</strong> {formData.candados}</div>
                </div>
              </div>

              <div style={{ background: '#f7fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h4 style={{ color: '#2d3748', marginBottom: '15px' }}>Evaluación de Equipos:</h4>
                {equipmentList.map(equipment => (
                  <div key={equipment.id} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '8px' }}>
                    <span>{equipment.icon} {equipment.name}: </span>
                    <span style={{ 
                      fontWeight: 'bold',
                      color: equipmentEvaluations[equipment.id]?.status === 'B' ? '#48bb78' : 
                            equipmentEvaluations[equipment.id]?.status === 'R' ? '#ed8936' : '#e53e3e'
                    }}>
                      {equipmentEvaluations[equipment.id]?.status === 'B' ? '✅ Bien' : 
                       equipmentEvaluations[equipment.id]?.status === 'R' ? '⚠️ Regular' : 
                       equipmentEvaluations[equipment.id]?.status === 'M' ? '❌ Mal' : 'Sin evaluar'}
                    </span>
                    {equipmentEvaluations[equipment.id]?.comment && (
                      <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '5px' }}>
                        💬 {equipmentEvaluations[equipment.id].comment}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2d3748' }}>
                  Comentarios finales:
                </label>
                <textarea
                  value={formData.comentarios}
                  onChange={e => setFormData({...formData, comentarios: e.target.value})}
                  rows={4}
                  placeholder="Comentarios adicionales sobre el registro..."
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    resize: 'vertical',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer with buttons */}
        <div style={{ 
          borderTop: '1px solid #e2e8f0',
          padding: '24px 32px',
          background: '#f9fafb'
        }}>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Back button */}
            <button
              onClick={handlePrev}
              disabled={currentStep === 1}
              style={{
                padding: '12px 24px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: currentStep === 1 ? '#f7fafc' : 'white',
                color: currentStep === 1 ? '#a0aec0' : '#4a5568',
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ← Anterior
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#4a5568',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>

              {currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  disabled={!validateCurrentStep()}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: validateCurrentStep() 
                      ? (tipo === 'apertura' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)')
                      : '#e2e8f0',
                    color: validateCurrentStep() ? 'white' : '#a0aec0',
                    cursor: validateCurrentStep() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!validateCurrentStep()}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: validateCurrentStep() 
                      ? (tipo === 'apertura' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)')
                      : '#e2e8f0',
                    color: validateCurrentStep() ? 'white' : '#a0aec0',
                    cursor: validateCurrentStep() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  ✅ Registrar {tipo === 'apertura' ? 'Apertura' : 'Cierre'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AperturaCierreModal;