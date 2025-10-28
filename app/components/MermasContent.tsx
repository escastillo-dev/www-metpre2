'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// URL de la API - usar variable de entorno o fallback a localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Merma {
  idMaMe: number;
  idCentro: string;
  fecha: string;
  idUsuario: number;
  anfitrion: number;
  motivo: string;
  nombreSucursal?: string;
  nombreUsuario?: string;
  nombreAnfitrion?: string;
}

interface Sucursal {
  idCentro: string;
  Sucursal: string;
}

export default function MermasContent() {
  const [records, setRecords] = useState<Merma[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [sucursalesAsignadas, setSucursalesAsignadas] = useState<Sucursal[]>([]);
  const [filter, setFilter] = useState('todos');
  const [statsKey, setStatsKey] = useState(0);

  // Estados para modales
  const [showNewMermaModal, setShowNewMermaModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [mermaCreada, setMermaCreada] = useState<any>(null);
  const [motivosMerma, setMotivosMerma] = useState<any[]>([]);
  const [loadingMotivos, setLoadingMotivos] = useState(false);
  
  // Estados del formulario de nueva merma
  const [nuevaMerma, setNuevaMerma] = useState({
    idCentro: '',
    Anfitrion: '', // Número de nómina del anfitrión
    motivoGeneral: '', // Motivo que se aplicará por defecto a todos los productos
    observaciones: ''
  });

  // Estados para búsqueda y gestión de productos
  const [searchTerm, setSearchTerm] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Estados para modal de detalles
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [mermaDetalle, setMermaDetalle] = useState<any>(null);
  const [productosDetalle, setProductosDetalle] = useState<any[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Estado para total de pérdidas en dinero
  const [totalPerdidasDinero, setTotalPerdidasDinero] = useState(0);
  const [loadingTotalPerdidas, setLoadingTotalPerdidas] = useState(false);

  // Estados para filtros y alertas
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [montoAlerta, setMontoAlerta] = useState(1000); // Alerta cuando pérdidas excedan $1000
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [filtrosActivos, setFiltrosActivos] = useState(false);

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

      const response = await axios.get(`${API_URL}/usuarios/${userId}`, {
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



  // Función para obtener los registros de mermas
  const fetchRegistrosMermas = async () => {
    setLoadingRecords(true);
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        console.error('No se encontraron credenciales de usuario');
        setLoadingRecords(false);
        return;
      }

      console.log('=== DEBUG: Iniciando fetchRegistrosMermas ===');
      console.log('Sucursales asignadas:', sucursalesAsignadas);

      // Verificar que tenemos sucursales asignadas
      if (sucursalesAsignadas.length === 0) {
        console.log('No hay sucursales asignadas, no se cargarán mermas');
        setRecords([]);
        setLoadingRecords(false);
        return;
      }

      // Construir URL con filtro de sucursales
      const sucursalesIds = sucursalesAsignadas.map(s => s.idCentro).join(',');
      console.log('IDs de sucursales para consultar:', sucursalesIds);
      
      const url = `${API_URL}/mermas/sucursales/${sucursalesIds}`;
      console.log('URL a consultar:', url);
      
      // Llamar a la API real de mermas
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Respuesta completa de la API:', response);
      console.log('Status de respuesta:', response.status);
      console.log('Data de respuesta:', response.data);

      if (response.data.estatus === 1) {
        console.log('Respuesta de mermas recibida:', response.data);
        
        // Mapear los datos de la API al formato esperado por el frontend
        const mermasFormateadas = (response.data.mermas || []).map((merma: any) => {
          console.log('Procesando merma:', merma);
          
          return {
            idMaMe: merma.idMaMe,
            idCentro: merma.idCentro,
            fecha: merma.Fecha, // La API devuelve 'Fecha' con mayúscula
            idUsuario: merma.idUsuario,
            anfitrion: merma.Anfitrion, // La API devuelve 'Anfitrion' con mayúscula (número de nómina)
            motivo: 'Múltiples motivos', // Las mermas pueden tener múltiples productos con diferentes motivos
            nombreSucursal: merma.nombreSucursal || 'Sucursal no encontrada',
            nombreUsuario: merma.nombreUsuario || 'Usuario no encontrado',
            nombreAnfitrion: `Nómina: ${merma.Anfitrion}` // Mostrar el número de nómina
          };
        });

        console.log('Mermas formateadas:', mermasFormateadas);
        setRecords(mermasFormateadas);
      } else {
        console.error('Error en la respuesta de mermas:', response.data.mensaje);
        setRecords([]);
      }
    } catch (error) {
      console.error('Error al obtener registros de mermas:', error);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Función para calcular el total de pérdidas en dinero
  const calcularTotalPerdidas = async () => {
    console.log('=== INICIANDO CÁLCULO DE PÉRDIDAS ===');
    setLoadingTotalPerdidas(true);
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials || records.length === 0) {
        console.log('No hay credenciales o registros, estableciendo pérdidas en 0');
        setTotalPerdidasDinero(0);
        setLoadingTotalPerdidas(false);
        return;
      }

      console.log(`Calculando pérdidas para ${records.length} mermas`);
      let totalPerdidas = 0;
      
      // Para cada merma, obtener sus productos y calcular el valor
      for (const merma of records) {
        console.log(`Procesando merma ${merma.idMaMe}`);
        try {
          const response = await axios.get(`${API_URL}/mermas/${merma.idMaMe}/productos`, {
            headers: {
              'Authorization': `Basic ${userCredentials}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.data.estatus === 1) {
            const productos = response.data.productos || [];
            console.log(`Merma ${merma.idMaMe} tiene ${productos.length} productos:`, productos);
            
            // Calcular el valor de pérdida para esta merma
            const valorMerma = productos.reduce((suma: number, producto: any) => {
              // El API devuelve el campo "Precio" (con P mayúscula)
              const cantidad = parseFloat(producto.Cantidad) || 0;
              const precio = parseFloat(producto.Precio || 0);
              const valorProducto = cantidad * precio;
              console.log(`  Producto ${producto.CodigoBarras}: ${cantidad} x $${precio} = $${valorProducto}`);
              return suma + valorProducto;
            }, 0);

            console.log(`Valor total de merma ${merma.idMaMe}: $${valorMerma}`);
            totalPerdidas += valorMerma;
          }
        } catch (error) {
          console.error(`Error al obtener productos de merma ${merma.idMaMe}:`, error);
        }
      }

      console.log(`=== TOTAL CALCULADO: $${totalPerdidas} ===`);
      setTotalPerdidasDinero(totalPerdidas);
    } catch (error) {
      console.error('Error al calcular total de pérdidas:', error);
      setTotalPerdidasDinero(0);
    } finally {
      setLoadingTotalPerdidas(false);
    }
  };

  // Función para calcular pérdidas considerando filtros de fecha
  const calcularTotalPerdidasFiltradas = async () => {
    console.log('=== INICIANDO CÁLCULO DE PÉRDIDAS FILTRADAS ===');
    setLoadingTotalPerdidas(true);
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        console.log('No hay credenciales, estableciendo pérdidas en 0');
        setTotalPerdidasDinero(0);
        setLoadingTotalPerdidas(false);
        return;
      }

      // Obtener registros filtrados
      const recordsFiltrados = getFilteredRecords();
      
      if (recordsFiltrados.length === 0) {
        console.log('No hay registros filtrados, estableciendo pérdidas en 0');
        setTotalPerdidasDinero(0);
        setLoadingTotalPerdidas(false);
        return;
      }

      console.log(`Calculando pérdidas para ${recordsFiltrados.length} mermas filtradas`);
      let totalPerdidas = 0;
      
      // Para cada merma filtrada, obtener sus productos y calcular el valor
      for (const merma of recordsFiltrados) {
        console.log(`Procesando merma filtrada ${merma.idMaMe}`);
        try {
          const response = await axios.get(`${API_URL}/mermas/${merma.idMaMe}/productos`, {
            headers: {
              'Authorization': `Basic ${userCredentials}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.data.estatus === 1) {
            const productos = response.data.productos || [];
            console.log(`Merma ${merma.idMaMe} tiene ${productos.length} productos:`, productos);
            
            // Calcular el valor de pérdida para esta merma
            const valorMerma = productos.reduce((suma: number, producto: any) => {
              const cantidad = parseFloat(producto.Cantidad) || 0;
              const precio = parseFloat(producto.Precio || 0);
              const valorProducto = cantidad * precio;
              console.log(`  Producto ${producto.CodigoBarras}: ${cantidad} x $${precio} = $${valorProducto}`);
              return suma + valorProducto;
            }, 0);

            console.log(`Valor total de merma filtrada ${merma.idMaMe}: $${valorMerma}`);
            totalPerdidas += valorMerma;
          }
        } catch (error) {
          console.error(`Error al obtener productos de merma ${merma.idMaMe}:`, error);
        }
      }

      console.log(`=== TOTAL FILTRADO CALCULADO: $${totalPerdidas} ===`);
      setTotalPerdidasDinero(totalPerdidas);
    } catch (error) {
      console.error('Error al calcular total de pérdidas filtradas:', error);
      setTotalPerdidasDinero(0);
    } finally {
      setLoadingTotalPerdidas(false);
    }
  };

  // Función para obtener motivos de merma
  const fetchMotivosMerma = async () => {
    setLoadingMotivos(true);
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        console.error('No se encontraron credenciales de usuario');
        return;
      }

      const response = await axios.get(`${API_URL}/motivos-merma`, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.estatus === 1) {
        setMotivosMerma(response.data.motivos || []);
      } else {
        console.error('Error al obtener motivos:', response.data.mensaje);
      }
    } catch (error) {
      console.error('Error al obtener motivos de merma:', error);
    } finally {
      setLoadingMotivos(false);
    }
  };

  // Función para buscar productos
  const buscarProductos = async (termino: string) => {
    if (!termino || termino.length < 2) {
      setProductos([]);
      return;
    }

    setLoadingProductos(true);
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) return;

      const response = await axios.get(`${API_URL}/productos/buscar?q=${encodeURIComponent(termino)}`, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.estatus === 1) {
        setProductos(response.data.productos || []);
      }
    } catch (error) {
      console.error('Error al buscar productos:', error);
    } finally {
      setLoadingProductos(false);
    }
  };

  // Función para manejar la búsqueda con debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Establecer nuevo timeout
    const newTimeout = setTimeout(() => {
      buscarProductos(value);
    }, 300); // Esperar 300ms después de que el usuario deje de escribir

    setSearchTimeout(newTimeout);
  };

  // Función para agregar producto a la lista
  const agregarProducto = (producto: any) => {
    const yaExiste = productosSeleccionados.find(p => p.CodigoBarras === producto.CodigoBarras);
    if (!yaExiste) {
      setProductosSeleccionados([...productosSeleccionados, {
        ...producto,
        Cantidad: '1', // Cantidad por defecto
        idMotMer: nuevaMerma.motivoGeneral || motivosMerma[0]?.idMotMer || '' // Motivo por defecto
      }]);
      setSearchTerm('');
      setProductos([]);
    }
  };

  // Función para actualizar cantidad de producto
  const actualizarCantidad = (codigoBarras: string, cantidad: string) => {
    setProductosSeleccionados(prev => 
      prev.map(p => 
        p.CodigoBarras === codigoBarras ? {...p, Cantidad: cantidad} : p
      )
    );
  };

  // Función para actualizar motivo de producto
  const actualizarMotivo = (codigoBarras: string, motivo: string) => {
    setProductosSeleccionados(prev => 
      prev.map(p => 
        p.CodigoBarras === codigoBarras ? {...p, idMotMer: motivo} : p
      )
    );
  };

  // Función para eliminar producto de la lista
  const eliminarProducto = (codigoBarras: string) => {
    setProductosSeleccionados(prev => 
      prev.filter(p => p.CodigoBarras !== codigoBarras)
    );
  };

  // Función para abrir el modal de nueva merma
  const handleNuevaMerma = () => {
    setCurrentStep(1);
    setMermaCreada(null);
    setProductosSeleccionados([]);
    setNuevaMerma({
      idCentro: '',
      Anfitrion: '',
      motivoGeneral: '',
      observaciones: ''
    });
    fetchMotivosMerma();
    setShowNewMermaModal(true);
  };

  // Función para manejar el envío del formulario (Paso 1)
  const handleSubmitPaso1 = async () => {
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      const userId = localStorage.getItem('userId');
      
      if (!userCredentials || !userId) {
        alert('No se encontraron credenciales de usuario');
        return;
      }

      if (!nuevaMerma.idCentro) {
        alert('Por favor seleccione una sucursal');
        return;
      }

      if (!nuevaMerma.Anfitrion) {
        alert('Por favor seleccione un usuario anfitrión');
        return;
      }

      console.log('Datos a enviar:', {
        idCentro: nuevaMerma.idCentro,
        Fecha: new Date().toISOString().split('T')[0], // Fecha automática
        idUsuario: parseInt(userId),
        Anfitrion: nuevaMerma.Anfitrion // Número de nómina como string
      });

      const mermaData = {
        idCentro: nuevaMerma.idCentro,
        Fecha: new Date().toISOString().split('T')[0], // Fecha automática
        idUsuario: parseInt(userId),
        Anfitrion: nuevaMerma.Anfitrion // Número de nómina como string
      };

      const response = await axios.post(`${API_URL}/mermas`, mermaData, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Respuesta del servidor:', response.data);

      if (response.data.estatus === 1) {
        // Manejar tanto si devuelve el objeto merma como si solo devuelve el mensaje con ID
        let mermaId = null;
        if (response.data.merma && response.data.merma.idMaMe) {
          mermaId = response.data.merma.idMaMe;
        } else {
          // Extraer ID del mensaje si está en formato "Merma creada exitosamente con ID: 12"
          const match = response.data.mensaje.match(/ID:\s*(\d+)/);
          if (match) {
            mermaId = parseInt(match[1]);
          }
        }
        
        setMermaCreada({ 
          idMaMe: mermaId, 
          ...response.data.merma 
        });
        setCurrentStep(2); // Pasar al paso 2
      } else {
        alert(`Error del servidor: ${response.data.mensaje}`);
      }
    } catch (error) {
      const err = error as any;
      console.error('Error completo:', err);
      if (err && err.response) {
        // El servidor respondió con un código de error
        console.error('Datos de error:', err.response.data);
        console.error('Status:', err.response.status);
        alert(`Error del servidor (${err.response.status}): ${err.response.data?.mensaje || 'Error desconocido'}`);
      } else if (err && err.request) {
        // La petición se hizo pero no hubo respuesta
        console.error('No se recibió respuesta del servidor');
        alert('Error de conexión: No se pudo conectar con el servidor');
      } else {
        // Error al configurar la petición
        console.error('Error al configurar petición:', err?.message);
        alert(`Error: ${err?.message}`);
      }
    }
  };

  // Función para finalizar y guardar productos
  const handleFinalizarMerma = async () => {
    if (productosSeleccionados.length === 0) {
      // Si no hay productos, solo cerrar el modal y refrescar
      setShowNewMermaModal(false);
      setNuevaMerma({
        idCentro: '',
        Anfitrion: '',
        motivoGeneral: '',
        observaciones: ''
      });
      setCurrentStep(1);
      fetchRegistrosMermas(); // Refrescar la tabla
      setStatsKey(prev => prev + 1); // Actualizar estadísticas
      return;
    }

    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials || !mermaCreada) return;

      console.log('Guardando productos:', productosSeleccionados);

      // Guardar cada producto individualmente CON SU MOTIVO
      for (const producto of productosSeleccionados) {
        const productoData = {
          CodigoBarras: producto.CodigoBarras,
          Cantidad: producto.Cantidad,
          idMotMer: parseInt(producto.idMotMer || nuevaMerma.motivoGeneral || '1') // Usar motivo del producto o motivo general
        };

        console.log('Enviando producto:', productoData);

        await axios.post(`${API_URL}/mermas/${mermaCreada.idMaMe}/productos`, productoData, {
          headers: {
            'Authorization': `Basic ${userCredentials}`,
            'Content-Type': 'application/json'
          }
        });
      }

      alert('Merma registrada exitosamente con productos');
      setShowNewMermaModal(false);
      setNuevaMerma({
        idCentro: '',
        Anfitrion: '',
        motivoGeneral: '',
        observaciones: ''
      });
      setProductosSeleccionados([]);
      setCurrentStep(1);
      fetchRegistrosMermas(); // Refrescar la tabla
      setStatsKey(prev => prev + 1); // Actualizar estadísticas
    } catch (error) {
      const err = error as any;
      console.error('Error al guardar productos:', err);
      if (err && err.response) {
        console.error('Datos de error:', err.response.data);
        console.error('Status:', err.response.status);
        alert(`Error del servidor (${err.response.status}): ${err.response.data?.mensaje || 'Error desconocido'}`);
      } else if (err && err.request) {
        console.error('No se recibió respuesta del servidor');
        alert('Error de conexión: No se pudo conectar con el servidor');
      } else {
        console.error('Error al configurar petición:', err?.message);
        alert(`Error: ${err?.message}`);
      }
    }
  };

  // Cargar sucursales al montar el componente
  useEffect(() => {
    fetchSucursalesAsignadas();
  }, []);

  // Cargar registros cuando se obtienen las sucursales asignadas
  useEffect(() => {
    if (sucursalesAsignadas.length > 0) {
      fetchRegistrosMermas();
    }
  }, [sucursalesAsignadas]);

  // Calcular total de pérdidas cuando cambian los registros o filtros
  useEffect(() => {
    if (records.length > 0) {
      calcularTotalPerdidasFiltradas();
    } else {
      setTotalPerdidasDinero(0);
    }
  }, [records, filtroFechaInicio, filtroFechaFin, filter]);

  // Verificar alertas cuando cambian las pérdidas
  useEffect(() => {
    if (totalPerdidasDinero > montoAlerta) {
      setMostrarAlerta(true);
    } else {
      setMostrarAlerta(false);
    }
  }, [totalPerdidasDinero, montoAlerta]);

  // Verificar si hay filtros activos
  useEffect(() => {
    setFiltrosActivos(Boolean(filtroFechaInicio || filtroFechaFin));
  }, [filtroFechaInicio, filtroFechaFin]);

  // Funciones para manejar acciones de la tabla
  const handleVerDetalles = async (mermaId: number) => {
    setLoadingDetalle(true);
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        setLoadingDetalle(false);
        return;
      }

      // Obtener información de la merma
      const mermaInfo = records.find(m => m.idMaMe === mermaId);
      setMermaDetalle(mermaInfo);

      // Obtener productos de la merma
      const response = await axios.get(`${API_URL}/mermas/${mermaId}/productos`, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.estatus === 1) {
        setProductosDetalle(response.data.productos || []);
        setShowDetalleModal(true);
      } else {
        console.error('Error al obtener productos:', response.data.mensaje);
        alert('Error al obtener detalles de la merma');
      }
    } catch (error) {
      console.error('Error al obtener detalles:', error);
      alert('Error al obtener detalles de la merma');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleEditarMerma = (mermaId: number) => {
    alert(`Función de edición para merma ${mermaId} - Por implementar`);
  };

  // Calcular estadísticas dinámicas
  const stats = React.useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const registrosHoy = records.filter(record => record.fecha === hoy);
    const totalMermasHoy = registrosHoy.length;
    const totalMermasMes = records.filter(record => {
      const fechaRecord = new Date(record.fecha);
      const fechaActual = new Date();
      return fechaRecord.getMonth() === fechaActual.getMonth() && 
             fechaRecord.getFullYear() === fechaActual.getFullYear();
    }).length;
    
    return [
      { 
        title: 'Mermas Hoy', 
        value: totalMermasHoy, 
        icon: '📉', 
        color: '#e53e3e', 
        bg: 'rgba(229, 62, 62, 0.1)', 
        change: totalMermasHoy > 0 ? 'Registradas' : 'Sin mermas', 
        positive: totalMermasHoy === 0 
      },
      { 
        title: 'Mermas del Mes', 
        value: totalMermasMes, 
        icon: '📊', 
        color: '#f5942b', 
        bg: 'rgba(245, 148, 43, 0.1)', 
        change: `${records.length} total`, 
        positive: totalMermasMes < 5 
      },
      { 
        title: 'Pérdidas en Dinero', 
        value: loadingTotalPerdidas ? '...' : `$${totalPerdidasDinero.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
        icon: '💰', 
        color: '#e53e3e', 
        bg: 'rgba(229, 62, 62, 0.1)', 
        change: filtrosActivos ? 'Filtros aplicados' : 'Total acumulado', 
        positive: false 
      },
      { 
        title: 'Promedio Diario', 
        value: records.length > 0 ? Math.round(records.length / 30) : 0, 
        icon: '📈', 
        color: '#38a169', 
        bg: 'rgba(56, 161, 105, 0.1)', 
        change: 'Últimos 30 días', 
        positive: true 
      }
    ];
  }, [records, sucursalesAsignadas, statsKey, totalPerdidasDinero, loadingTotalPerdidas]);

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

  const getFilteredRecords = () => {
    let filteredRecords = records;
    
    // Filtro por opciones predefinidas (hoy, mes, todos)
    const today = new Date().toISOString().split('T')[0];
    switch (filter) {
      case 'hoy': 
        filteredRecords = records.filter(r => r.fecha === today);
        break;
      case 'mes': 
        const fechaActual = new Date();
        filteredRecords = records.filter(r => {
          const fechaRecord = new Date(r.fecha);
          return fechaRecord.getMonth() === fechaActual.getMonth() && 
                 fechaRecord.getFullYear() === fechaActual.getFullYear();
        });
        break;
      default: 
        filteredRecords = records;
        break;
    }

    // Filtro adicional por rango de fechas personalizado
    if (filtroFechaInicio && filtroFechaFin) {
      filteredRecords = filteredRecords.filter(r => {
        const fechaRecord = r.fecha;
        return fechaRecord >= filtroFechaInicio && fechaRecord <= filtroFechaFin;
      });
    } else if (filtroFechaInicio) {
      filteredRecords = filteredRecords.filter(r => r.fecha >= filtroFechaInicio);
    } else if (filtroFechaFin) {
      filteredRecords = filteredRecords.filter(r => r.fecha <= filtroFechaFin);
    }

    return filteredRecords;
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

      {/* Action Buttons Section */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#2d3748', fontSize: '24px', fontWeight: '600' }}>
            Registro de Mermas
          </h3>
          <p style={{ margin: 0, color: '#4a5568', fontSize: '16px' }}>
            Registra las pérdidas y mermas de productos de las sucursales asignadas
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          {/* Botón Nueva Merma */}
          <div 
            onClick={handleNuevaMerma}
            style={{
              background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
              borderRadius: 16,
              padding: 32,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(229, 62, 62, 0.3)',
              border: 'none',
              textAlign: 'center' as const,
              minWidth: 300
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(229, 62, 62, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(229, 62, 62, 0.3)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: 16 }}>📉</div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
              Registrar Nueva Merma
            </h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px', lineHeight: 1.4 }}>
              Registra productos dañados, vencidos o perdidos en la sucursal
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
              Formulario Rápido
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: 32, 
          padding: 20, 
          background: '#fef5e7', 
          borderRadius: 12,
          textAlign: 'center' as const
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: '#744210', fontWeight: '500' }}>
              Control de Pérdidas y Mermas
            </span>
          </div>
          <p style={{ margin: 0, color: '#744210', fontSize: '14px' }}>
            Registra todas las mermas para mantener un control preciso del inventario
          </p>
        </div>
      </div>

      {/* Tabla de Registros */}

      {/* Responsive: Cards en móvil, tabla en desktop/tablet */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#2d3748' }}>Registros de Mermas</h3>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <option value="todos">Todos los registros</option>
            <option value="hoy">Solo hoy</option>
            <option value="mes">Este mes</option>
          </select>
        </div>

        {/* Alerta de Pérdidas Altas */}
        {mostrarAlerta && (
          <div style={{
            background: 'linear-gradient(135deg, #fed7d7, #feb2b2)',
            border: '1px solid #fc8181',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: '24px' }}>🚨</span>
            <div>
              <h4 style={{ margin: 0, color: '#c53030', fontSize: 16, fontWeight: '600' }}>
                ¡Alerta de Pérdidas Elevadas!
              </h4>
              <p style={{ margin: 0, color: '#c53030', fontSize: 14 }}>
                Las pérdidas actuales (${totalPerdidasDinero.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) superan el límite establecido (${montoAlerta.toLocaleString('es-MX', { minimumFractionDigits: 2 })})
              </p>
            </div>
            <button
              onClick={() => setMostrarAlerta(false)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#c53030',
                fontSize: 18,
                cursor: 'pointer',
                padding: 4
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Filtros Avanzados */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h4 style={{ margin: 0, color: '#495057', fontSize: 14, fontWeight: '600' }}>
              🔍 Filtros Avanzados
            </h4>
            {filtrosActivos && (
              <button
                onClick={() => {
                  setFiltroFechaInicio('');
                  setFiltroFechaFin('');
                }}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: '500', color: '#6c757d', marginBottom: 4 }}>
                Fecha desde:
              </label>
              <input
                type="date"
                value={filtroFechaInicio}
                onChange={(e) => setFiltroFechaInicio(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: 6,
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: '500', color: '#6c757d', marginBottom: 4 }}>
                Fecha hasta:
              </label>
              <input
                type="date"
                value={filtroFechaFin}
                onChange={(e) => setFiltroFechaFin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: 6,
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: '500', color: '#6c757d', marginBottom: 4 }}>
                Monto de alerta ($):
              </label>
              <input
                type="number"
                value={montoAlerta}
                onChange={(e) => setMontoAlerta(Number(e.target.value))}
                min="0"
                step="100"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: 6,
                  fontSize: 14
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6c757d' }}>
              <span>📊</span>
              <span>
                {filtrosActivos ? 
                  `Mostrando ${getFilteredRecords().length} de ${records.length} registros` :
                  `${records.length} registros totales`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Responsive rendering */}
        {typeof window !== 'undefined' && window.innerWidth < 768 ? (
          loadingRecords ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                Cargando registros...
              </div>
            </div>
          ) : getFilteredRecords().length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
              📉 No hay registros de mermas para mostrar
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {getFilteredRecords().map(record => (
                <div key={record.idMaMe} style={{
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  border: '1px solid #e2e8f0',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#2d3748', fontSize: 16 }}>#{record.idMaMe}</span>
                    <span style={{ color: '#718096', fontSize: 13 }}>{formatDate(record.fecha)}</span>
                  </div>
                  <div style={{ color: '#2d3748', fontWeight: 600 }}>{record.nombreSucursal || getBranchName(record.idCentro)}</div>
                  <div style={{ color: '#4a5568', fontSize: 13 }}>Usuario: {record.nombreUsuario || 'Usuario no encontrado'}</div>
                  <div style={{ color: '#4a5568', fontSize: 13 }}>Anfitrión: {record.nombreAnfitrion}</div>
                  <div style={{ color: '#4a5568', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.motivo}>
                    Motivo: {record.motivo}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button 
                      title="Ver Detalles" 
                      onClick={() => handleVerDetalles(record.idMaMe)}
                      style={{ 
                        padding: '8px 16px', 
                        background: '#2368b3', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 8, 
                        cursor: 'pointer', 
                        fontSize: 14 
                      }}
                    >
                      👁️ Ver
                    </button>
                    <button 
                      title="Editar" 
                      onClick={() => handleEditarMerma(record.idMaMe)}
                      style={{ 
                        padding: '8px 16px', 
                        background: '#38a169', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 8, 
                        cursor: 'pointer', 
                        fontSize: 14 
                      }}
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7fafc' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>ID</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Sucursal</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Fecha</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Usuario</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Anfitrión</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Motivo</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingRecords ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        Cargando registros...
                      </div>
                    </td>
                  </tr>
                ) : getFilteredRecords().length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
                      📉 No hay registros de mermas para mostrar
                    </td>
                  </tr>
                ) : (
                  getFilteredRecords().map(record => (
                    <tr key={record.idMaMe} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 12, fontFamily: 'monospace' }}>{record.idMaMe}</td>
                      <td style={{ padding: 12 }}>{record.nombreSucursal || getBranchName(record.idCentro)}</td>
                      <td style={{ padding: 12 }}>{formatDate(record.fecha)}</td>
                      <td style={{ padding: 12 }}>{record.nombreUsuario || 'Usuario no encontrado'}</td>
                      <td style={{ padding: 12 }}>{record.nombreAnfitrion}</td>
                      <td style={{ padding: 12 }}>
                        <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.motivo}>
                          {record.motivo}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            title="Ver Detalles" 
                            onClick={() => handleVerDetalles(record.idMaMe)}
                            style={{ 
                              padding: '6px 12px', 
                              background: '#2368b3', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: 6, 
                              cursor: 'pointer', 
                              fontSize: 14 
                            }}
                          >
                            👁️
                          </button>
                          <button 
                            title="Editar" 
                            onClick={() => handleEditarMerma(record.idMaMe)}
                            style={{ 
                              padding: '6px 12px', 
                              background: '#38a169', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: 6, 
                              cursor: 'pointer', 
                              fontSize: 14 
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Nueva Merma - 2 Pasos */}
      {showNewMermaModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            padding: 32, 
            maxWidth: currentStep === 1 ? '500px' : '800px', 
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            
            {/* Indicador de pasos */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '8px 16px',
                background: currentStep === 1 ? '#e53e3e' : '#38a169',
                color: 'white',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 600
              }}>
                {currentStep === 1 ? '1️⃣' : '✅'} Datos de Merma
              </div>
              <div style={{ 
                width: 40, 
                height: 2, 
                background: currentStep === 2 ? '#38a169' : '#e2e8f0' 
              }}></div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '8px 16px',
                background: currentStep === 2 ? '#e53e3e' : '#e2e8f0',
                color: currentStep === 2 ? 'white' : '#4a5568',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 600
              }}>
                2️⃣ Productos
              </div>
            </div>

            {currentStep === 1 ? (
              // PASO 1: Datos básicos de la merma
              <>
                <h3 style={{ margin: '0 0 24px 0', color: '#2d3748', fontSize: '24px' }}>
                  📉 Registrar Nueva Merma
                </h3>
                
                {/* Sucursal */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#4a5568' }}>
                    Sucursal *
                  </label>
                  <select 
                    value={nuevaMerma.idCentro}
                    onChange={(e) => setNuevaMerma({...nuevaMerma, idCentro: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 8,
                      fontSize: 16
                    }}
                  >
                    <option value="">Seleccione una sucursal</option>
                    {sucursalesAsignadas.map(sucursal => (
                      <option key={sucursal.idCentro} value={sucursal.idCentro}>
                        {sucursal.Sucursal}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Anfitrión */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#4a5568' }}>
                    Número de Nómina del Anfitrión *
                  </label>
                  <input 
                    type="text"
                    value={nuevaMerma.Anfitrion}
                    onChange={(e) => setNuevaMerma({...nuevaMerma, Anfitrion: e.target.value})}
                    placeholder="Ingrese el número de nómina del anfitrión"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 8,
                      fontSize: 16
                    }}
                  />
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                    Número de nómina del empleado responsable de la merma
                  </div>
                </div>

                {/* Motivo General para productos */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#4a5568' }}>
                    Motivo General (aplicará a todos los productos)
                  </label>
                  {loadingMotivos ? (
                    <div style={{ padding: 12, background: '#f7fafc', borderRadius: 8, textAlign: 'center' }}>
                      Cargando motivos...
                    </div>
                  ) : (
                    <select 
                      value={nuevaMerma.motivoGeneral}
                      onChange={(e) => setNuevaMerma({...nuevaMerma, motivoGeneral: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: 8,
                        fontSize: 16
                      }}
                    >
                      <option value="">Seleccione un motivo general</option>
                      {motivosMerma.map(motivo => (
                        <option key={motivo.idMotMer} value={motivo.idMotMer}>
                          {motivo.Motivo}
                        </option>
                      ))}
                    </select>
                  )}
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                    Este motivo se aplicará a todos los productos que agregues (opcional)
                  </div>
                </div>

                {/* Observaciones */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#4a5568' }}>
                    Observaciones
                  </label>
                  <textarea 
                    value={nuevaMerma.observaciones}
                    onChange={(e) => setNuevaMerma({...nuevaMerma, observaciones: e.target.value})}
                    placeholder="Descripción adicional de la merma..."
                    rows={3}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 8,
                      fontSize: 16,
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Botones Paso 1 */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setShowNewMermaModal(false)}
                    style={{ 
                      padding: '12px 24px', 
                      background: '#e2e8f0', 
                      border: 'none', 
                      borderRadius: 8, 
                      cursor: 'pointer',
                      fontSize: 16,
                      fontWeight: 500
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSubmitPaso1}
                    disabled={!nuevaMerma.idCentro || !nuevaMerma.Anfitrion}
                    style={{ 
                      padding: '12px 24px', 
                      background: (!nuevaMerma.idCentro || !nuevaMerma.Anfitrion) ? '#cbd5e0' : '#2368b3',
                      color: 'white',
                      border: 'none', 
                      borderRadius: 8, 
                      cursor: (!nuevaMerma.idCentro || !nuevaMerma.Anfitrion) ? 'not-allowed' : 'pointer',
                      fontSize: 16,
                      fontWeight: 500
                    }}
                  >
                    Continuar → Productos
                  </button>
                </div>
              </>
            ) : (
              // PASO 2: Agregar productos
              <>
                <h3 style={{ margin: '0 0 16px 0', color: '#2d3748', fontSize: '24px' }}>
                  🛒 Agregar Productos a la Merma
                </h3>
                
                <div style={{ 
                  background: '#f0f9ff', 
                  padding: 16, 
                  borderRadius: 8, 
                  marginBottom: 24,
                  border: '1px solid #bae6fd'
                }}>
                  <p style={{ margin: 0, color: '#075985', fontSize: 14 }}>
                    <strong>Merma #{mermaCreada?.idMaMe}</strong> creada exitosamente. 
                    Ahora puedes agregar los productos afectados.
                  </p>
                </div>

                {/* Buscador de productos */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#4a5568' }}>
                    🔍 Buscar Producto
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Buscar por nombre o código de barras..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 16
                    }}
                  />
                  
                  {/* Resultados de búsqueda */}
                  {searchTerm && (
                    <div style={{ 
                      maxHeight: 200, 
                      overflowY: 'auto', 
                      border: '1px solid #e2e8f0', 
                      borderTop: 'none',
                      borderRadius: '0 0 8px 8px',
                      background: 'white'
                    }}>
                      {loadingProductos ? (
                        <div style={{ padding: 16, textAlign: 'center', color: '#4a5568' }}>
                          Buscando productos...
                        </div>
                      ) : productos.length > 0 ? (
                        productos.map(producto => (
                          <div
                            key={producto.CodigoBarras}
                            onClick={() => agregarProducto(producto)}
                            style={{
                              padding: 12,
                              borderBottom: '1px solid #f7fafc',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: '#2d3748' }}>
                                {producto.Producto}
                              </div>
                              <div style={{ fontSize: 14, color: '#4a5568' }}>
                                Código: {producto.CodigoBarras}
                              </div>
                            </div>
                            <button style={{
                              background: '#38a169',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: 12
                            }}>
                              ➕ Agregar
                            </button>
                          </div>
                        ))
                      ) : searchTerm.length >= 2 ? (
                        <div style={{ padding: 16, textAlign: 'center', color: '#4a5568' }}>
                          No se encontraron productos
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Lista de productos seleccionados */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#2d3748' }}>
                    📦 Productos Seleccionados ({productosSeleccionados.length})
                  </h4>
                  
                  {productosSeleccionados.length === 0 ? (
                    <div style={{ 
                      padding: 24, 
                      background: '#f7fafc', 
                      borderRadius: 8, 
                      textAlign: 'center',
                      color: '#4a5568'
                    }}>
                      No hay productos agregados. Puedes finalizar sin productos o buscar algunos arriba.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      {productosSeleccionados.map((producto, index) => (
                        <div
                          key={producto.CodigoBarras}
                          style={{
                            padding: 16,
                            borderBottom: index < productosSeleccionados.length - 1 ? '1px solid #f7fafc' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#2d3748', marginBottom: 4 }}>
                              {producto.Producto}
                            </div>
                            <div style={{ fontSize: 14, color: '#4a5568' }}>
                              {producto.CodigoBarras}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
                            {/* Cantidad */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ fontSize: 12, color: '#4a5568', minWidth: 60 }}>Cantidad:</label>
                              <input
                                type="number"
                                value={producto.Cantidad}
                                onChange={(e) => actualizarCantidad(producto.CodigoBarras, e.target.value)}
                                min="1"
                                style={{
                                  width: 80,
                                  padding: '4px 6px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 4,
                                  textAlign: 'center',
                                  fontSize: 12
                                }}
                              />
                            </div>
                            
                            {/* Motivo */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ fontSize: 12, color: '#4a5568', minWidth: 60 }}>Motivo:</label>
                              <select
                                value={producto.idMotMer || ''}
                                onChange={(e) => actualizarMotivo(producto.CodigoBarras, e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '4px 6px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 4,
                                  fontSize: 12
                                }}
                              >
                                <option value="">Seleccionar motivo</option>
                                {motivosMerma.map(motivo => (
                                  <option key={motivo.idMotMer} value={motivo.idMotMer}>
                                    {motivo.Motivo}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => eliminarProducto(producto.CodigoBarras)}
                            style={{
                              background: '#e53e3e',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: 14
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botones Paso 2 */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                  <button 
                    onClick={() => setCurrentStep(1)}
                    style={{ 
                      padding: '12px 24px', 
                      background: '#e2e8f0', 
                      border: 'none', 
                      borderRadius: 8, 
                      cursor: 'pointer',
                      fontSize: 16,
                      fontWeight: 500
                    }}
                  >
                    ← Volver
                  </button>
                  
                  <button 
                    onClick={handleFinalizarMerma}
                    style={{ 
                      padding: '12px 24px', 
                      background: '#38a169',
                      color: 'white',
                      border: 'none', 
                      borderRadius: 8, 
                      cursor: 'pointer',
                      fontSize: 16,
                      fontWeight: 500
                    }}
                  >
                    ✅ Finalizar Merma
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalles de Merma */}
      {showDetalleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            minWidth: '600px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 'bold', color: '#1a202c' }}>
                📋 Detalle de Merma #{mermaDetalle?.idMaMe}
              </h2>
              <button
                onClick={() => setShowDetalleModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#718096',
                  padding: 4
                }}
              >
                ×
              </button>
            </div>

            {/* Información General de la Merma */}
            {mermaDetalle && (
              <div style={{ 
                background: '#f7fafc', 
                padding: 16, 
                borderRadius: 8, 
                marginBottom: 20,
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: '600', color: '#2d3748' }}>
                  Información General
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
                  <div>
                    <strong>Sucursal:</strong> {mermaDetalle.nombreSucursal || getBranchName(mermaDetalle.idCentro)}
                  </div>
                  <div>
                    <strong>Fecha:</strong> {formatDate(mermaDetalle.fecha)}
                  </div>
                  <div>
                    <strong>Usuario:</strong> {mermaDetalle.nombreUsuario}
                  </div>
                  <div>
                    <strong>Anfitrión:</strong> {mermaDetalle.nombreAnfitrion}
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Productos */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: '600', color: '#2d3748' }}>
                Productos de la Merma
              </h3>
              
              {loadingDetalle ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#718096' }}>
                  Cargando productos...
                </div>
              ) : productosDetalle.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 20, 
                  color: '#718096',
                  background: '#f7fafc',
                  borderRadius: 8,
                  border: '1px dashed #cbd5e0'
                }}>
                  📦 No hay productos registrados en esta merma
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#edf2f7' }}>
                        <th style={{ padding: 10, textAlign: 'left', fontWeight: '600', color: '#4a5568', border: '1px solid #e2e8f0' }}>
                          Código
                        </th>
                        <th style={{ padding: 10, textAlign: 'left', fontWeight: '600', color: '#4a5568', border: '1px solid #e2e8f0' }}>
                          Producto
                        </th>
                        <th style={{ padding: 10, textAlign: 'center', fontWeight: '600', color: '#4a5568', border: '1px solid #e2e8f0' }}>
                          Cantidad
                        </th>
                        <th style={{ padding: 10, textAlign: 'center', fontWeight: '600', color: '#4a5568', border: '1px solid #e2e8f0' }}>
                          Precio Unit.
                        </th>
                        <th style={{ padding: 10, textAlign: 'center', fontWeight: '600', color: '#4a5568', border: '1px solid #e2e8f0' }}>
                          Total Pérdida
                        </th>
                        <th style={{ padding: 10, textAlign: 'left', fontWeight: '600', color: '#4a5568', border: '1px solid #e2e8f0' }}>
                          Motivo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosDetalle.map((producto, index) => {
                        const cantidad = parseFloat(producto.Cantidad) || 0;
                        const precio = parseFloat(producto.Precio || 0);
                        const totalPerdida = cantidad * precio;
                        
                        return (
                          <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: 10, border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                              {producto.CodigoBarras}
                            </td>
                            <td style={{ padding: 10, border: '1px solid #e2e8f0' }}>
                              {producto.nombreProducto || 'Producto no encontrado'}
                            </td>
                            <td style={{ padding: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                              {producto.Cantidad}
                            </td>
                            <td style={{ padding: 10, border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>
                              ${precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: 10, border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace', fontWeight: '600', color: '#e53e3e' }}>
                              ${totalPerdida.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: 10, border: '1px solid #e2e8f0' }}>
                              {producto.descripcionMotivo || 'Sin motivo'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Fila de total */}
                      {productosDetalle.length > 0 && (
                        <tr style={{ background: '#f7fafc', fontWeight: '600' }}>
                          <td colSpan={4} style={{ padding: 10, border: '1px solid #e2e8f0', textAlign: 'right' }}>
                            <strong>Total de la Merma:</strong>
                          </td>
                          <td style={{ padding: 10, border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace', color: '#e53e3e', fontSize: 16 }}>
                            <strong>
                              ${productosDetalle.reduce((sum, p) => {
                                const cantidad = parseFloat(p.Cantidad) || 0;
                                const precio = parseFloat(p.Precio || 0);
                                return sum + (cantidad * precio);
                              }, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td style={{ padding: 10, border: '1px solid #e2e8f0' }}></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setShowDetalleModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}