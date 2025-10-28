'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import AperturaCierreModal from './AperturaCierreModal';

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

export default function AperturaCierresContent() {
  // Estado para detectar si es móvil
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
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
  const [statsKey, setStatsKey] = useState(0);
  
  // Estados para los modals
  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const [showCierreModal, setShowCierreModal] = useState(false);

  // Función para manejar el envío desde el modal
  const handleModalSubmit = async (modalData: any) => {
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      const userId = localStorage.getItem('userId');
      
      if (!userCredentials || !userId) {
        alert('No se encontraron credenciales de usuario');
        return;
      }

      // Validar que modalData y modalData.equipos existan
      if (!modalData || !modalData.equipos || !Array.isArray(modalData.equipos)) {
        alert('Error: Los datos del formulario están incompletos');
        return;
      }

      // Transformar los datos del modal al formato de la API
      const detalles = modalData.equipos.map((equipo: any) => ({
        idEquipo: parseInt(equipo.id),
        Calificacion: equipo.status,
        Comentario: equipo.comment || ''
      }));

      const requestData = {
        idCentro: modalData.sucursal,
        HoraI: modalData.horaInicio + ':00',
        HoraF: modalData.horaFin ? modalData.horaFin + ':00' : '',
        Anfitrion: parseInt(modalData.anfitrion) || 0,
        Plantilla: parseInt(modalData.plantilla) || 0,
        Candados: modalData.candados || 0,
        idUsuario: parseInt(userId),
        TipoRecorrido: modalData.tipo === 'apertura' ? 'A' : 'C',
        detalles: detalles
      };

      const response = await axios.post(`${API_URL}/apci`, requestData, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.estatus === 1) {
        alert(`✅ ${response.data.mensaje || `${modalData.tipo === 'apertura' ? 'Apertura' : 'Cierre'} registrado correctamente`}`);
        await fetchRegistrosApci(); // Recargar los registros
        setStatsKey(prev => prev + 1); // Actualizar estadísticas
        
        // Cerrar los modales
        setShowAperturaModal(false);
        setShowCierreModal(false);
      } else {
        throw new Error(response.data?.mensaje || 'Error en la respuesta del servidor');
      }
    } catch (error: any) {
      console.error('Error al registrar:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        alert(`Error del servidor: ${error.response.data?.mensaje || error.response.statusText}`);
      } else {
        alert(`Error al registrar el ${modalData?.tipo === 'apertura' ? 'apertura' : 'cierre'}: ${error.message}`);
      }
    }
  };

  // Función para obtener los registros reales de la API
  const fetchRegistrosApci = async () => {
    setLoadingRecords(true);
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        console.error('No se encontraron credenciales de usuario');
        return;
      }

      // Verificar que tenemos sucursales asignadas
      if (sucursalesAsignadas.length === 0) {
        setRecords([]);
        setLoadingRecords(false);
        return;
      }

      // Construir URL con filtro de sucursales
      const sucursalesIds = sucursalesAsignadas.map(s => s.idCentro).join(',');
      
      const response = await axios.get(`${API_URL}/apci/consultar`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 50,
          pagina: 1,
          sucursales: sucursalesIds // Agregar filtro de sucursales
        }
      });

      if (response.data.estatus === 1) {
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
          comentarios: ''
        }));

        // Filtro adicional en el frontend para asegurar que solo se muestren sucursales asignadas
        const registrosFiltrados = registrosConvertidos.filter((registro: any) => {
          // Buscar la sucursal por ID
          const sucursalEncontrada = sucursalesAsignadas.find(s => 
            s.idCentro === registro.sucursal
          );
          return sucursalEncontrada !== undefined;
        });

        setRecords(registrosFiltrados);
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

  // Cargar sucursales al montar el componente
  useEffect(() => {
    fetchSucursalesAsignadas();
  }, []);

  // Cargar registros cuando se obtienen las sucursales asignadas
  useEffect(() => {
    if (sucursalesAsignadas.length > 0) {
      fetchRegistrosApci();
    }
  }, [sucursalesAsignadas]);

  // Calcular estadísticas dinámicas basadas en los datos reales
  const stats = React.useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const registrosHoy = records.filter(record => record.fecha === hoy);
    const aperturasHoy = registrosHoy.filter(record => record.tipo === 'A').length;
    const cierresHoy = registrosHoy.filter(record => record.tipo === 'C').length;
    const registrosConProblemas = records.filter(record => record.estado === 'con_problemas').length;
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
  }, [records, statsKey]);

  const getBranchName = (idCentro: string) => {
    const sucursal = sucursalesAsignadas.find(s => s.idCentro === idCentro);
    return sucursal ? sucursal.Sucursal : idCentro;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
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
      const userCredentials = localStorage.getItem('userCredentials');
      const userId = localStorage.getItem('userId');
      
      if (!userCredentials || !userId) {
        alert('Error: No se encontraron datos del usuario. Por favor inicia sesión nuevamente.');
        return;
      }
      
      const idUsuario = parseInt(userId);
      
      const detalles = Object.keys(equipmentEvaluations).map(equipmentId => ({
        idEquipo: parseInt(equipmentId),
        Calificacion: equipmentEvaluations[equipmentId].status,
        Comentario: equipmentEvaluations[equipmentId].comment || ''
      }));

      const apiData = {
        idCentro: formData.sucursal,
        HoraI: formData.horaInicio + ':00',
        HoraF: formData.horaFin + ':00',
        Anfitrion: parseInt(formData.anfitrion),
        Plantilla: parseInt(formData.plantilla) || parseInt(formData.plantilla.replace(/[^\d]/g, '')),
        Candados: formData.candados,
        idUsuario: idUsuario,
        TipoRecorrido: formData.tipo,
        detalles: detalles
      };

      const response = await axios.post(`${API_URL}/apci`, apiData, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.estatus === 1) {
        alert(`✅ ${response.data.mensaje}`);
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
  <div className="p-5">
      
      {/* Stats Grid */}
        <div className="stats-grid">
        {loadingRecords ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="stat-card">
              <div style={{ height: 20, background: '#f0f0f0', borderRadius: 4, marginBottom: 12 }}></div>
              <div style={{ height: 32, background: '#f0f0f0', borderRadius: 4, marginBottom: 8 }}></div>
              <div style={{ height: 16, background: '#f0f0f0', borderRadius: 4, width: '60%' }}></div>
            </div>
          ))
        ) : (
          stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#2d3748', fontSize: 18 }}>{stat.title}</span>
                <div style={{ background: stat.bg, color: stat.color, borderRadius: 8, padding: 12, fontSize: 28, minWidth: 56, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  {stat.icon}
                </div>
              </div>
              <div className="stat-value">{stat.value}</div>
              <span style={{ color: stat.positive ? '#38a169' : '#e53e3e', fontWeight: 500, fontSize: 15 }}>{stat.change}</span>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons Section */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#2d3748', fontSize: '24px', fontWeight: '600' }}>
            Registro de Aperturas y Cierres
          </h3>
          <p style={{ margin: 0, color: '#4a5568', fontSize: '16px' }}>
            Selecciona el tipo de registro que deseas realizar
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, maxWidth: '800px', margin: '0 auto' }}>
          {/* Botón Nueva Apertura */}
          <div 
            onClick={() => setShowAperturaModal(true)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 16,
              padding: 32,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
              border: 'none',
              textAlign: 'center' as const
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: 16 }}>🌅</div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
              Nueva Apertura
            </h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px', lineHeight: 1.4 }}>
              Registra el proceso de apertura matutina con evaluación completa de equipos
            </p>
            <div style={{ 
              marginTop: 20, 
              padding: '8px 16px', 
              background: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: 8,
              display: 'inline-block',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              Proceso Guiado • 3 Pasos
            </div>
          </div>

          {/* Botón Nuevo Cierre */}
          <div 
            onClick={() => setShowCierreModal(true)}
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: 16,
              padding: 32,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)',
              border: 'none',
              textAlign: 'center' as const
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(240, 147, 251, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(240, 147, 251, 0.3)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: 16 }}>🌙</div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
              Nuevo Cierre
            </h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px', lineHeight: 1.4 }}>
              Registra el proceso de cierre vespertino con revisión de seguridad
            </p>
            <div style={{ 
              marginTop: 20, 
              padding: '8px 16px', 
              background: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: 8,
              display: 'inline-block',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              Proceso Guiado • 3 Pasos
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: 32, 
          padding: 20, 
          background: '#f7fafc', 
          borderRadius: 12,
          textAlign: 'center' as const
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '20px' }}>✨</span>
            <span style={{ color: '#2d3748', fontWeight: '500' }}>
              Nuevo Sistema de Registro Mejorado
            </span>
          </div>
          <p style={{ margin: 0, color: '#4a5568', fontSize: '14px' }}>
            Proceso dividido en pasos • Selección rápida con checkboxes • Vista previa antes de guardar
          </p>
        </div>
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
        {/* Filtro responsive */}
        <div className={isMobile ? "mb-4" : "mb-4 flex items-center"}>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className={
              (isMobile ? "w-full" : "w-auto") +
              " border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            }
          >
            <option value="todos">Todos los registros</option>
            <option value="apertura">Solo aperturas</option>
            <option value="cierre">Solo cierres</option>
            <option value="hoy">Solo hoy</option>
            <option value="problemas">Con problemas</option>
          </select>
        </div>
        {/* Vista responsive: cards en móvil, tabla en desktop */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loadingRecords ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#4a5568' }}>Cargando registros...</div>
            ) : getFilteredRecords().length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#4a5568' }}>📋 No hay registros de apertura/cierre para mostrar</div>
            ) : (
              getFilteredRecords().map(record => (
                <div
                  key={record.id}
                  style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: '#2d3748', fontSize: 16 }}>{getBranchName(record.sucursal)}</span>
                    <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: record.tipo === 'A' ? 'rgba(56, 161, 105, 0.1)' : 'rgba(245, 148, 43, 0.1)', color: record.tipo === 'A' ? '#38a169' : '#f5942b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {record.tipo === 'A' ? '📦 Apertura' : '🔒 Cierre'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#4a5568', marginBottom: 2 }}>
                    <span>Fecha: {formatDate(record.fecha)}</span> <span style={{ marginLeft: 12 }}>Hora Inicio: {record.horaInicio || '--:--:--'}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#4a5568', marginBottom: 2 }}>
                    <span>Hora Fin: {record.horaFin || '--:--:--'}</span> <span style={{ marginLeft: 12 }}>Anfitrión: {record.anfitrion}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#4a5568', marginBottom: 2 }}>
                    <span>Calificación: <span style={{ fontWeight: 600, color: record.calificacion >= 8 ? '#38a169' : record.calificacion >= 6 ? '#f5942b' : '#e53e3e' }}>{record.calificacion}/10</span></span> <span style={{ marginLeft: 12 }}>Estado: <span style={{ fontWeight: 600, color: record.estado === 'completado' ? '#38a169' : '#e53e3e' }}>{record.estado === 'completado' ? 'Completado' : 'Con Problemas'}</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                      onClick={() => viewDetails(record)}
                      title="Ver Detalles"
                      style={{ padding: '8px 16px', background: '#2368b3', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 500, boxShadow: '0 2px 8px rgba(35,104,179,0.12)' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>👁️ Ver Detalles</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ background: '#f7fafc' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Sucursal</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Tipo</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Fecha</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Hora Inicio</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Hora Fin</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Anfitrión</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Calificación</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Estado</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingRecords ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Cargando registros...</td>
                  </tr>
                ) : getFilteredRecords().length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>📋 No hay registros de apertura/cierre para mostrar</td>
                  </tr>
                ) : (
                  getFilteredRecords().map(record => (
                    <tr key={record.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 12 }}>{getBranchName(record.sucursal)}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: record.tipo === 'A' ? 'rgba(56, 161, 105, 0.1)' : 'rgba(245, 148, 43, 0.1)', color: record.tipo === 'A' ? '#38a169' : '#f5942b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {record.tipo === 'A' ? '📦 Apertura' : '🔒 Cierre'}
                        </span>
                      </td>
                      <td style={{ padding: 12 }}>{formatDate(record.fecha)}</td>
                      <td style={{ padding: 12 }}>{record.horaInicio}</td>
                      <td style={{ padding: 12 }}>{record.horaFin}</td>
                      <td style={{ padding: 12 }}>{record.anfitrion}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ fontWeight: 600, color: record.calificacion >= 8 ? '#38a169' : record.calificacion >= 6 ? '#f5942b' : '#e53e3e' }}>{record.calificacion}/10</span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{ fontWeight: 600, color: record.estado === 'completado' ? '#38a169' : '#e53e3e' }}>{record.estado === 'completado' ? 'Completado' : 'Con Problemas'}</span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <button
                          onClick={() => viewDetails(record)}
                          title="Ver Detalles"
                          style={{ padding: '8px 16px', background: '#2368b3', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 500, boxShadow: '0 2px 8px rgba(35,104,179,0.12)' }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>👁️ Ver Detalles</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Vista Previa */}
      {showPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>👁️ Vista Previa del Registro</h3>
              <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            
            {/* Preview Content */}
            <div style={{ background: '#f7fafc', padding: 20, borderRadius: 12, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 15px 0' }}>📋 Datos Generales</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, fontSize: 14 }}>
                <div><strong>Sucursal:</strong> {getBranchName(formData.sucursal)}</div>
                <div><strong>Tipo:</strong> {formData.tipo === 'A' ? '🌅 Apertura' : '🌙 Cierre'}</div>
                <div><strong>Anfitrion</strong> {formData.anfitrion}</div>
                <div><strong>Plantilla:</strong> {formData.plantilla}</div>
                <div><strong>Hora Inicio:</strong> {formData.horaInicio}</div>
                <div><strong>Hora Fin:</strong> {formData.horaFin}</div>
                <div><strong>Candados:</strong> {formData.candados || 0}</div>
              </div>
            </div>

            <div style={{ background: '#f7fafc', padding: 20, borderRadius: 12 }}>
              <h4 style={{ margin: '0 0 15px 0' }}>🔧 Evaluación de Equipos</h4>
              {equipmentList.map(equipment => {
                const evaluation = equipmentEvaluations[equipment.id];
                return (
                  <div key={equipment.id} style={{ background: 'white', padding: 15, borderRadius: 8, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{equipment.icon}</span>
                      <strong>{equipment.name}</strong>
                    </div>
                    <div style={{ fontSize: 14 }}>
                      <div><strong>Estado:</strong> <span style={{ color: evaluation?.status === 'B' ? '#38a169' : evaluation?.status === 'R' ? '#f5942b' : '#e53e3e' }}>
                        {evaluation?.status === 'B' ? '✅ Bien' : evaluation?.status === 'R' ? '⚠️ Regular' : evaluation?.status === 'M' ? '❌ Mal' : 'No evaluado'}
                      </span></div>
                      {evaluation?.comment && <div><strong>Comentario:</strong> {evaluation.comment}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => setShowPreview(false)} style={{ flex: 1, padding: '10px', background: '#718096', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {showDetails && selectedRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>📋 Detalles del Registro</h3>
              <button onClick={() => { setShowDetails(false); setSelectedRecord(null); }} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            
            {/* Record Details */}
            <div style={{ background: '#f7fafc', padding: 20, borderRadius: 12, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 15px 0' }}>📋 Información General</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, fontSize: 14 }}>
                <div><strong>Sucursal:</strong> {getBranchName(selectedRecord.sucursal)}</div>
                <div><strong>Tipo:</strong> {selectedRecord.tipo === 'A' ? '🌅 Apertura' : '🌙 Cierre'}</div>
                <div><strong>Fecha:</strong> {formatDate(selectedRecord.fecha)}</div>
                <div><strong>Anfitrion:</strong> {selectedRecord.anfitrion}</div>
                <div><strong>Plantilla:</strong> {selectedRecord.plantilla}</div>
                <div><strong>Candados:</strong> {selectedRecord.candados}</div>
                <div><strong>Hora Inicio:</strong> {selectedRecord.horaInicio}</div>
                <div><strong>Hora Fin:</strong> {selectedRecord.horaFin}</div>
                <div><strong>Calificación:</strong> <span style={{ color: selectedRecord.calificacion >= 8 ? '#38a169' : selectedRecord.calificacion >= 6 ? '#f5942b' : '#e53e3e', fontWeight: 'bold' }}>{selectedRecord.calificacion}/10</span></div>
              </div>
            </div>

            {/* Equipment Details */}
            {selectedRecord.equipments && Object.keys(selectedRecord.equipments).length > 0 && (
              <div style={{ background: '#f7fafc', padding: 20, borderRadius: 12 }}>
                <h4 style={{ margin: '0 0 15px 0' }}>🔧 Evaluación de Equipos</h4>
                {Object.entries(selectedRecord.equipments).map(([equipmentId, evaluation]) => {
                  const equipment = equipmentList.find(e => e.id === equipmentId);
                  return (
                    <div key={equipmentId} style={{ background: 'white', padding: 15, borderRadius: 8, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>{equipment?.icon}</span>
                        <strong>{equipment?.name}</strong>
                      </div>
                      <div style={{ fontSize: 14 }}>
                        <div><strong>Estado:</strong> <span style={{ color: evaluation.status === 'B' ? '#38a169' : evaluation.status === 'R' ? '#f5942b' : '#e53e3e' }}>
                          {evaluation.status === 'B' ? '✅ Bien' : evaluation.status === 'R' ? '⚠️ Regular' : '❌ Mal'}
                        </span></div>
                        {evaluation.comment && <div><strong>Comentario:</strong> {evaluation.comment}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => { setShowDetails(false); setSelectedRecord(null); }} style={{ flex: 1, padding: '10px', background: '#718096', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nueva Apertura */}
      {showAperturaModal && (
        <AperturaCierreModal
          isOpen={showAperturaModal}
          onClose={() => setShowAperturaModal(false)}
          onSubmit={handleModalSubmit}
          tipo="apertura"
          equipmentList={equipmentList}
          sucursalesAsignadas={sucursalesAsignadas}
        />
      )}

      {/* Modal de Nuevo Cierre */}
      {showCierreModal && (
        <AperturaCierreModal
          isOpen={showCierreModal}
          onClose={() => setShowCierreModal(false)}
          onSubmit={handleModalSubmit}
          tipo="cierre"
          equipmentList={equipmentList}
          sucursalesAsignadas={sucursalesAsignadas}
        />
      )}
    </div>
  );
};