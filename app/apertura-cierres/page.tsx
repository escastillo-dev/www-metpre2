'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// URL de la API - usar variable de entorno o fallback a localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Equipment {
  id: string;
  name: string;
  icon: string;
}

interface EquipmentEvaluation {
  status: string;
  comment: string;
}

interface OpeningRecord {
  id: number;
  sucursal: string;
  tipo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  anfitrion: string;
  plantilla: string;
  candados: number;
  equipments: { [key: string]: EquipmentEvaluation };
  comentarios: string;
  calificacion: number;
  estado: string;
}

interface Sucursal {
  idCentro: string;
  Sucursal: string;
}

interface Usuario {
  idUsuarios: number;
  NombreUsuario: string;
  idNivelUsuario: number;
  estatus: number;
  FechaAlta?: string;
}

interface UsuarioResponse {
  estatus: number;
  mensaje: string;
  usuario: Usuario;
  sucursales: Sucursal[];
}

const equipmentList: Equipment[] = [
  { id: '1', name: 'Candados', icon: '🔐' },
  { id: '2', name: 'Chapas', icon: '🔒' },
  { id: '3', name: 'Alarmas', icon: '🚨' },
  { id: '4', name: 'Cámaras', icon: '📹' },
  { id: '5', name: 'Cajas', icon: '💰' },
  { id: '6', name: 'Centro de Carga', icon: '⚡' },
  { id: '7', name: 'Llaves de Agua', icon: '💧' },
  { id: '8', name: 'Puertas', icon: '🚪' },
  { id: '9', name: 'Ventanas', icon: '🗔' },
  { id: '10', name: 'Pisos', icon: '▦' },
  { id: '11', name: 'Paredes', icon: '🧱' },
  { id: '12', name: 'Techos', icon: '🏠' },
  { id: '13', name: 'Bodega', icon: '📦' },
  { id: '14', name: 'Cámara Fría', icon: '❄️' },
  { id: '15', name: 'Caja de Valores', icon: '🏦' }
];

export default function AperturaCierresPage() {
  const [records, setRecords] = useState<OpeningRecord[]>([
    {
      id: 1,
      sucursal: 'matriz',
      tipo: 'A',
      fecha: '2024-03-15',
      horaInicio: '08:00',
      horaFin: '08:30',
      anfitrion: '12345',
      plantilla: 'PLT-001',
      candados: 3,
      equipments: {
        '1': { status: 'B', comment: 'Candados en buen estado' },
        '2': { status: 'B', comment: 'Chapas funcionando correctamente' },
        '3': { status: 'B', comment: 'Sistema de alarma operativo' },
        '4': { status: 'B', comment: 'Todas las cámaras funcionando' },
        '5': { status: 'R', comment: 'Una caja presenta desgaste' }
      },
      comentarios: 'Apertura normal, todo en orden.',
      calificacion: 8.5,
      estado: 'completado'
    }
  ]);

  const [formData, setFormData] = useState({
    sucursal: '',
    tipo: '',
    horaInicio: '',
    horaFin: '',
    anfitrion: '',
    plantilla: '',
    candados: 0,
    comentarios: ''
  });

  const [equipmentEvaluations, setEquipmentEvaluations] = useState<{ [key: string]: EquipmentEvaluation }>({});
  const [filter, setFilter] = useState('todos');
  const [showPreview, setShowPreview] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OpeningRecord | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [sucursalesAsignadas, setSucursalesAsignadas] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [statsKey, setStatsKey] = useState(0); // Para forzar recalculación de stats

  // Función para obtener los registros reales de la API
  const fetchRegistrosApci = async () => {
    setLoadingRecords(true);
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        console.error('No se encontraron credenciales de usuario');
        return;
      }

      const response = await axios.get(`${API_URL}/apci/consultar`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 50,
          pagina: 1
        }
      });

      console.log('Registros obtenidos:', response.data);

      if (response.data.estatus === 1) {
        console.log('API Response completa:', response.data);
        console.log('Número de registros:', response.data.registros?.length || 0);
        console.log('Primer registro:', response.data.registros?.[0]);
        
        // Convertir los registros de la API al formato del frontend
        const registrosConvertidos = response.data.registros.map((registro: any) => ({
          id: registro.idApCi,
          sucursal: registro.idCentro,
          tipo: registro.tipoRecorrido,
          fecha: registro.fecha,
          horaInicio: registro.horaInicio,
          horaFin: registro.horaFin,
          anfitrion: registro.anfitrion.toString(),
          plantilla: registro.plantilla.toString(),
          candados: registro.candados,
          equipments: registro.detalles.reduce((acc: any, detalle: any) => {
            acc[detalle.idEquipo] = {
              status: detalle.calificacion,
              comment: detalle.comentario || ''
            };
            return acc;
          }, {}),
          calificacion: registro.calificacionPromedio || 0,
          estado: registro.estado,
          comentarios: '' // Los comentarios generales ya no se usan
        }));

        setRecords(registrosConvertidos);
        // Forzar recalculación de estadísticas
        setStatsKey(prev => prev + 1);
      } else {
        console.error('Error en la respuesta:', response.data.mensaje);
      }
    } catch (error) {
      console.error('Error al obtener registros:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Función para obtener las sucursales asignadas al usuario
  const fetchSucursalesAsignadas = async () => {
    setLoading(true);
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      const userId = localStorage.getItem('userId');
      
      if (!userCredentials || !userId) {
        console.error('No se encontraron las credenciales del usuario');
        setLoading(false);
        return;
      }

      const response = await axios.get<UsuarioResponse>(`${API_URL}/usuarios/${userId}`, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.estatus === 1) {
        if (response.data.sucursales && Array.isArray(response.data.sucursales)) {
          setSucursalesAsignadas(response.data.sucursales);
          console.log('Sucursales asignadas:', response.data.sucursales);
        } else {
          console.error('No se encontraron sucursales asignadas:', response.data);
        }
      } else {
        console.error('Error en la respuesta:', response.data.mensaje);
      }
    } catch (error) {
      console.error('Error al obtener sucursales asignadas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar sucursales y registros al montar el componente
  useEffect(() => {
    fetchSucursalesAsignadas();
    fetchRegistrosApci();
  }, []);

  // Calcular estadísticas dinámicas basadas en los datos reales
  const stats = React.useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]; // Fecha de hoy en formato YYYY-MM-DD
    
    // Filtrar registros de hoy
    const registrosHoy = records.filter(record => record.fecha === hoy);
    
    // Contar aperturas de hoy
    const aperturasHoy = registrosHoy.filter(record => record.tipo === 'A').length;
    
    // Contar cierres de hoy
    const cierresHoy = registrosHoy.filter(record => record.tipo === 'C').length;
    
    // Contar equipos con fallas (registros con estado "con_problemas")
    const registrosConProblemas = records.filter(record => record.estado === 'con_problemas').length;
    
    // Calcular promedio de calificación general
    const calificaciones = records.filter(record => record.calificacion > 0).map(record => record.calificacion);
    const promedioGeneral = calificaciones.length > 0 
      ? Math.round((calificaciones.reduce((sum, cal) => sum + cal, 0) / calificaciones.length) * 10) / 10
      : 0;
    
    return [
      { 
        title: 'Aperturas Hoy', 
        value: aperturasHoy, 
        icon: '🌅', 
        color: '#38a169', 
        bg: 'rgba(56, 161, 105, 0.1)', 
        change: aperturasHoy > 0 ? 'Registradas' : 'Sin registros', 
        positive: aperturasHoy > 0 
      },
      { 
        title: 'Cierres Hoy', 
        value: cierresHoy, 
        icon: '🌙', 
        color: '#f5942b', 
        bg: 'rgba(245, 148, 43, 0.1)', 
        change: cierresHoy > 0 ? 'Registrados' : 'Pendientes', 
        positive: cierresHoy > 0 
      },
      { 
        title: 'Equipos con Fallas', 
        value: registrosConProblemas, 
        icon: '⚠️', 
        color: '#e53e3e', 
        bg: 'rgba(229, 62, 62, 0.1)', 
        change: registrosConProblemas > 0 ? 'Requieren atención' : 'Todo en orden', 
        positive: registrosConProblemas === 0 
      },
      { 
        title: 'Promedio Calificación', 
        value: promedioGeneral, 
        icon: '⭐', 
        color: '#2368b3', 
        bg: 'rgba(35, 104, 179, 0.1)', 
        change: `Total: ${records.length} registros`, 
        positive: promedioGeneral >= 8 
      }
    ];
  }, [records, statsKey]); // Recalcular cuando cambien los registros o statsKey

  const getBranchName = (idCentro: string) => {
    const sucursal = sucursalesAsignadas.find(s => s.idCentro === idCentro);
    return sucursal ? sucursal.Sucursal : idCentro;
  };

  const formatDate = (dateStr: string) => {
    // Evitar problemas de zona horaria parseando manualmente
    if (!dateStr) return '';
    
    // Si ya viene en formato YYYY-MM-DD, convertir a DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    
    // Fallback si no está en formato esperado
    return dateStr;
  };

  const getTipoText = (tipo: string) => {
    return tipo === 'A' ? 'Apertura' : tipo === 'C' ? 'Cierre' : tipo;
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = { B: 'Bien', R: 'Regular', M: 'Mal' };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    return status === 'B' ? '#38a169' : status === 'R' ? '#f5942b' : '#e53e3e';
  };

  const getStatusIcon = (status: string) => {
    return status === 'B' ? '✅' : status === 'R' ? '⚠️' : '❌';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const allEvaluated = equipmentList.every(eq => 
      equipmentEvaluations[eq.id]?.status
    );

    if (!allEvaluated) {
      alert('Por favor completa el estado de todos los equipos');
      return;
    }

    try {
      // Obtener datos del usuario logueado
      const userCredentials = localStorage.getItem('userCredentials');
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName');
      
      if (!userCredentials || !userId) {
        alert('Error: No se encontraron datos del usuario. Por favor inicia sesión nuevamente.');
        return;
      }
      
      // El userId contiene la nomina del usuario, que se usa como idUsuario
      const idUsuario = parseInt(userId);
      
      // Preparar los detalles de equipos según la estructura de la API
      const detalles = Object.keys(equipmentEvaluations).map(equipmentId => ({
        idEquipo: parseInt(equipmentId),
        Calificacion: equipmentEvaluations[equipmentId].status,
        Comentario: equipmentEvaluations[equipmentId].comment || ''
      }));

      // Preparar los datos según la estructura de la API
      const apiData = {
        idCentro: formData.sucursal,
        HoraI: formData.horaInicio + ':00', // Agregar segundos si es necesario
        HoraF: formData.horaFin + ':00',
        Anfitrion: parseInt(formData.anfitrion),
        Plantilla: parseInt(formData.plantilla) || parseInt(formData.plantilla.replace(/[^\d]/g, '')), // Extraer número si tiene formato PLT-001
        Candados: formData.candados,
        idUsuario: idUsuario,
        TipoRecorrido: formData.tipo,
        detalles: detalles
      };

      console.log('Enviando datos a la API:', apiData);

      // Enviar datos a la API
      const response = await axios.post(`${API_URL}/apci`, apiData, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Respuesta de la API:', response.data);

      if (response.data.estatus === 1) {
        alert(`✅ ${response.data.mensaje}`);
        
        // Recargar los registros desde la API para mostrar el nuevo registro
        await fetchRegistrosApci();
        
        clearForm();
      } else {
        alert(`❌ Error: ${response.data.mensaje || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error al enviar datos:', error);
      if (axios.isAxiosError(error) && error.response) {
        alert(`❌ Error del servidor: ${error.response.data?.mensaje || error.response.statusText}`);
      } else {
        alert('❌ Error de conexión. Verifica que el servidor esté disponible.');
      }
    }
  };

  const clearForm = () => {
    setFormData({
      sucursal: '',
      tipo: '',
      horaInicio: '',
      horaFin: '',
      anfitrion: '',
      plantilla: '',
      candados: 0,
      comentarios: ''
    });
    setEquipmentEvaluations({});
  };

  const handlePreview = () => {
    const allEvaluated = equipmentList.every(eq => 
      equipmentEvaluations[eq.id]?.status
    );

    if (!allEvaluated) {
      alert('Por favor completa el estado de todos los equipos antes de ver la vista previa');
      return;
    }

    const statusValues: { [key: string]: number } = { B: 10, R: 6, M: 2 };
    const totalScore = Object.values(equipmentEvaluations).reduce((sum, eq) => sum + statusValues[eq.status], 0);
    const calificacion = Math.round((totalScore / Object.keys(equipmentEvaluations).length) * 10) / 10;

    setPreviewData({
      ...formData,
      equipments: equipmentEvaluations,
      calificacion
    });
    setShowPreview(true);
  };

  const confirmFromPreview = () => {
    setShowPreview(false);
    const form = document.querySelector('form');
    if (form) {
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }
  };

  const viewDetails = (record: OpeningRecord) => {
    setSelectedRecord(record);
    setShowDetails(true);
  };



  const getFilteredRecords = () => {
    const today = new Date().toISOString().split('T')[0];
    switch (filter) {
      case 'apertura': return records.filter(r => r.tipo === 'A');
      case 'cierre': return records.filter(r => r.tipo === 'C');
      case 'hoy': return records.filter(r => r.fecha === today);
      case 'problemas': return records.filter(r => r.estado === 'con_problemas');
      default: return records;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      
      {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        {loadingRecords ? (
          // Mostrar skeleton loader mientras cargan los datos
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
              <div style={{ height: 20, background: '#f0f0f0', borderRadius: 4, marginBottom: 12 }}></div>
              <div style={{ height: 32, background: '#f0f0f0', borderRadius: 4, marginBottom: 8 }}></div>
              <div style={{ height: 16, background: '#f0f0f0', borderRadius: 4, width: '60%' }}></div>
            </div>
          ))
        ) : (
          stats.map((stat, index) => (
            <div key={index} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#2d3748', fontSize: 14 }}>{stat.title}</span>
                <div style={{ background: stat.bg, color: stat.color, borderRadius: 8, padding: 8, fontSize: 20, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {stat.icon}
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#23272f', marginBottom: 8 }}>{stat.value}</div>
              <div style={{ color: stat.positive ? '#38a169' : '#e53e3e', fontWeight: 500, fontSize: 13 }}>{stat.change}</div>
            </div>
          ))
        )}
      </div>

      {/* Form Section */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
          <h3 style={{ margin: 0, color: '#2d3748' }}>Registro de Apertura/Cierre de Sucursal</h3>
          <button onClick={clearForm} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            🔄 Limpiar Formulario
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Datos Generales */}
          <div style={{ background: '#f7fafc', padding: 20, borderRadius: 12, marginBottom: 25 }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#2d3748', display: 'flex', alignItems: 'center', gap: 10 }}>📋 Datos Generales</h4>
            {/* Primera fila */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#2d3748' }}>Sucursal *</label>
                <select value={formData.sucursal} onChange={e => setFormData({...formData, sucursal: e.target.value})} required style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                  <option value="">Selecciona una sucursal</option>
                  {sucursalesAsignadas.map(sucursal => (
                    <option key={sucursal.idCentro} value={sucursal.idCentro}>
                      {sucursal.Sucursal}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#2d3748' }}>Tipo de Recorrido *</label>
                <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} required style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                  <option value="">Selecciona el tipo</option>
                  <option value="A">Apertura</option>
                  <option value="C">Cierre</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#2d3748' }}>Número de Nómina *</label>
                <input type="number" value={formData.anfitrion} onChange={e => setFormData({...formData, anfitrion: e.target.value})} required placeholder="Número de nómina" style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
              </div>
            </div>

            {/* Segunda fila */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#2d3748' }}>Hora de Inicio *</label>
                <input type="time" value={formData.horaInicio} onChange={e => setFormData({...formData, horaInicio: e.target.value})} required style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#2d3748' }}>Hora de Finalización *</label>
                <input type="time" value={formData.horaFin} onChange={e => setFormData({...formData, horaFin: e.target.value})} required style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#2d3748' }}>Número de Plantilla *</label>
                <input type="text" value={formData.plantilla} onChange={e => setFormData({...formData, plantilla: e.target.value})} required placeholder="Ej: PLT-001" style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#2d3748' }}>Candados *</label>
                <input type="number" value={formData.candados || ''} onChange={e => setFormData({...formData, candados: parseInt(e.target.value) || 0})} required min="0" style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
              </div>
            </div>
          </div>

          {/* Evaluación de Equipos */}
          <div style={{ background: '#f7fafc', padding: 20, borderRadius: 12, marginBottom: 25 }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#2d3748' }}>🔧 Evaluación de Equipos ({equipmentList.length} elementos)</h4>
            {equipmentList.map(equipment => (
              <div key={equipment.id} style={{ background: 'white', padding: 20, borderRadius: 12, border: '2px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
                  <span style={{ fontSize: 24 }}>{equipment.icon}</span>
                  <h5 style={{ margin: 0, color: '#2d3748', fontSize: 16, fontWeight: 600 }}>{equipment.name}</h5>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 15 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#2d3748' }}>Estado *</label>
                    <select
                      value={equipmentEvaluations[equipment.id]?.status || ''}
                      onChange={e => setEquipmentEvaluations({...equipmentEvaluations, [equipment.id]: {...equipmentEvaluations[equipment.id], status: e.target.value}})}
                      required
                      style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 8 }}
                    >
                      <option value="">Seleccionar</option>
                      <option value="B">✅ Bien</option>
                      <option value="R">⚠️ Regular</option>
                      <option value="M">❌ Mal</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#2d3748' }}>Comentario</label>
                    <textarea
                      value={equipmentEvaluations[equipment.id]?.comment || ''}
                      onChange={e => setEquipmentEvaluations({...equipmentEvaluations, [equipment.id]: {...equipmentEvaluations[equipment.id], comment: e.target.value}})}
                      rows={3}
                      placeholder="Describe el estado del equipo (opcional)..."
                      style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" style={{ padding: '10px 20px', background: '#38a169', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
              💾 Registrar Recorrido
            </button>
            <button type="button" onClick={clearForm} style={{ padding: '10px 20px', background: '#718096', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
              🗑️ Limpiar
            </button>
            <button type="button" onClick={handlePreview} style={{ padding: '10px 20px', background: '#2368b3', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
              👁️ Vista Previa
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de Registros */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#2d3748' }}>Registros de Aperturas y Cierres</h3>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <option value="todos">Todos los registros</option>
            <option value="apertura">Solo aperturas</option>
            <option value="cierre">Solo cierres</option>
            <option value="hoy">Solo hoy</option>
            <option value="problemas">Con problemas</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7fafc' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Sucursal</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Tipo</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Fecha</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Hora Inicio</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Hora Fin</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Nómina</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Calificación</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Estado</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div style={{ 
                        width: 20, 
                        height: 20, 
                        border: '2px solid #e2e8f0', 
                        borderTop: '2px solid #2368b3', 
                        borderRadius: '50%',
                        animation: 'rotation 1s infinite linear'
                      }}></div>
                      Cargando registros...
                    </div>
                  </td>
                </tr>
              ) : getFilteredRecords().length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
                    📋 No hay registros de apertura/cierre para mostrar
                  </td>
                </tr>
              ) : (
                getFilteredRecords().map(record => (
                <tr key={record.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: 12 }}>{getBranchName(record.sucursal)}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: record.tipo === 'A' ? 'rgba(56, 161, 105, 0.1)' : 'rgba(245, 148, 43, 0.1)', color: record.tipo === 'A' ? '#38a169' : '#f5942b' }}>
                      {record.tipo === 'A' ? '🌅 Apertura' : '🌙 Cierre'}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{formatDate(record.fecha)}</td>
                  <td style={{ padding: 12 }}>{record.horaInicio}</td>
                  <td style={{ padding: 12 }}>{record.horaFin}</td>
                  <td style={{ padding: 12 }}>{record.anfitrion}</td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: record.calificacion >= 8 ? '#38a169' : record.calificacion >= 6 ? '#f5942b' : '#e53e3e' }}>
                        {record.calificacion}/10
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: record.estado === 'completado' ? 'rgba(56, 161, 105, 0.1)' : 'rgba(229, 62, 62, 0.1)', color: record.estado === 'completado' ? '#38a169' : '#e53e3e' }}>
                      {record.estado === 'completado' ? 'Completado' : 'Con Problemas'}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button onClick={() => viewDetails(record)} title="Ver Detalles" style={{ padding: '6px 12px', background: '#2368b3', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
                        👁️
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Vista Previa */}
      {showPreview && previewData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#2d3748' }}>Vista Previa del Registro</h3>
              <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#718096' }}>×</button>
            </div>
            
            <div style={{ background: '#f7fafc', padding: 20, borderRadius: 8, marginBottom: 20 }}>
              <h4 style={{ marginTop: 0, color: '#2d3748' }}>📋 Datos del {previewData.tipo === 'A' ? 'Apertura' : 'Cierre'}:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <p><strong>Sucursal:</strong> {getBranchName(previewData.sucursal)}</p>
                <p><strong>Tipo:</strong> {previewData.tipo === 'A' ? '🌅 Apertura' : '🌙 Cierre'}</p>
                <p><strong>Hora Inicio:</strong> {previewData.horaInicio}</p>
                <p><strong>Hora Fin:</strong> {previewData.horaFin}</p>
                <p><strong>Nómina:</strong> {previewData.anfitrion}</p>
                <p><strong>Plantilla:</strong> {previewData.plantilla}</p>
                <p><strong>Candados:</strong> {previewData.candados}</p>
                <p><strong>Calificación:</strong> <span style={{ color: previewData.calificacion >= 8 ? '#38a169' : previewData.calificacion >= 6 ? '#f5942b' : '#e53e3e', fontWeight: 'bold' }}>{previewData.calificacion}/10</span></p>
              </div>
              
              <h5 style={{ color: '#2d3748', marginTop: 20, marginBottom: 15 }}>🔧 Evaluación de Equipos:</h5>
              {equipmentList.map(equipment => {
                const evaluation = previewData.equipments[equipment.id];
                if (!evaluation) return null;
                const statusColor = getStatusColor(evaluation.status);
                const statusIcon = getStatusIcon(evaluation.status);
                
                return (
                  <div key={equipment.id} style={{ background: 'white', padding: 15, borderRadius: 8, marginBottom: 10, borderLeft: `4px solid ${statusColor}` }}>
                    <p style={{ margin: '0 0 5px 0' }}><strong>{statusIcon} {equipment.icon} {equipment.name}:</strong> {getStatusText(evaluation.status)}</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#4a5568' }}>{evaluation.comment}</p>
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPreview(false)} style={{ padding: '10px 20px', background: '#718096', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
                ❌ Cancelar
              </button>
              <button onClick={confirmFromPreview} style={{ padding: '10px 20px', background: '#38a169', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
                ✅ Confirmar y Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalles */}
      {showDetails && selectedRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 900, maxHeight: '90vh', overflowY: 'auto', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#2d3748' }}>Detalles del Recorrido</h3>
              <button onClick={() => setShowDetails(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#718096' }}>×</button>
            </div>
            
            <div style={{ background: '#f7fafc', padding: 20, borderRadius: 12, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#2d3748' }}>📋 Información General</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <p><strong>Sucursal:</strong> {getBranchName(selectedRecord.sucursal)}</p>
                <p><strong>Tipo:</strong> {selectedRecord.tipo === 'A' ? '🌅 Apertura' : '🌙 Cierre'}</p>
                <p><strong>Fecha:</strong> {formatDate(selectedRecord.fecha)}</p>
                <p><strong>Hora Inicio:</strong> {selectedRecord.horaInicio}</p>
                <p><strong>Hora Fin:</strong> {selectedRecord.horaFin}</p>
                <p><strong>Nómina:</strong> {selectedRecord.anfitrion}</p>
                <p><strong>Plantilla:</strong> {selectedRecord.plantilla}</p>
                <p><strong>Candados:</strong> {selectedRecord.candados}</p>
              </div>
              <div style={{ marginTop: 15, padding: 15, background: 'white', borderRadius: 8 }}>
                <strong>Calificación General:</strong> 
                <span style={{ fontSize: 18, fontWeight: 'bold', color: selectedRecord.calificacion >= 8 ? '#38a169' : selectedRecord.calificacion >= 6 ? '#f5942b' : '#e53e3e', marginLeft: 10 }}>
                  {selectedRecord.calificacion}/10
                </span>
                <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${selectedRecord.calificacion * 10}%`, height: '100%', background: selectedRecord.calificacion >= 8 ? '#38a169' : selectedRecord.calificacion >= 6 ? '#f5942b' : '#e53e3e' }}></div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#2d3748' }}>🔧 Evaluación Detallada de Equipos</h4>
              {equipmentList.map(equipment => {
                const evaluation = selectedRecord.equipments[equipment.id];
                if (!evaluation) return null;
                const statusColor = getStatusColor(evaluation.status);
                const statusIcon = getStatusIcon(evaluation.status);
                
                return (
                  <div key={equipment.id} style={{ background: 'white', padding: 15, borderRadius: 8, marginBottom: 10, borderLeft: `4px solid ${statusColor}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{equipment.icon}</span>
                      <strong>{equipment.name}</strong>
                      <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: statusColor }}>
                        {statusIcon} {getStatusText(evaluation.status)}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#4a5568', fontSize: 14 }}>{evaluation.comment}</p>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDetails(false)} style={{ padding: '10px 20px', background: '#2368b3', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
