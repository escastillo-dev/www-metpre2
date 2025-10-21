'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface DashboardStats {
  totalUsuarios: number;
  usuariosPorZona: {
    [key: string]: {
      nombre: string;
      total: number;
    };
  };
  usuariosPorNivel: {
    [key: string]: {
      nombre: string;
      total: number;
    };
  };
}

interface DashboardOverviewProps {
  userLevel?: string;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ userLevel }) => {
  const [stats, setStats] = useState<{
    totalUsuarios: number;
    usuariosPorZona: { [key: string]: number };
    usuariosPorNivel: { [key: string]: number };
  }>({
    totalUsuarios: 0,
    usuariosPorZona: {},
    usuariosPorNivel: {},
  });

  // Estados para métricas de mermas
  const [mermasStats, setMermasStats] = useState<{
    totalPerdidas: number;
    totalMermas: number;
    mermasHoy: number;
    mermasMes: number;
    sucursalesConMermas: number;
  }>({
    totalPerdidas: 0,
    totalMermas: 0,
    mermasHoy: 0,
    mermasMes: 0,
    sucursalesConMermas: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMermas, setLoadingMermas] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        console.log('Iniciando carga de estadísticas...');
        
        const userCredentials = localStorage.getItem('userCredentials');
        if (!userCredentials) {
          console.error('No se encontraron las credenciales');
          return;
        }
        
        // Configurar los headers para la petición
        const headers = {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        };

        console.log('Headers a enviar:', headers);

        // Realizar la petición directamente a la URL completa
        const response = await axios.get('http://127.0.0.1:8000/stats/dashboard', { 
          headers,
          withCredentials: true
        });
        console.log('Respuesta del dashboard:', response.data);

        if (response.data.estatus === 1) {
          const { data } = response.data;
          
          // Procesar datos para las gráficas
          const usuariosPorZona: { [key: string]: number } = {};
          const usuariosPorNivel: { [key: string]: number } = {};

          // Procesar usuarios por zona y ordenar por total
          Object.entries(data.usuariosPorZona)
            .sort(([, a]: [string, any], [, b]: [string, any]) => b.total - a.total)
            .forEach(([id, info]: [string, any]) => {
              usuariosPorZona[info.nombre] = info.total;
            });

          // Procesar usuarios por nivel y ordenar por total
          Object.entries(data.usuariosPorNivel)
            .sort(([, a]: [string, any], [, b]: [string, any]) => b.total - a.total)
            .forEach(([id, info]: [string, any]) => {
              usuariosPorNivel[info.nombre] = info.total;
            });

          console.log('Datos procesados:', {
            totalUsuarios: data.totalUsuarios,
            usuariosPorZona,
            usuariosPorNivel
          });

          setStats({
            totalUsuarios: data.totalUsuarios,
            usuariosPorZona,
            usuariosPorNivel,
          });
        }
        
        setIsLoading(false);

        console.log('Estadísticas cargadas:', stats);

        setIsLoading(false);
      } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  // Función para obtener estadísticas de mermas
  const fetchMermasStats = async () => {
    setLoadingMermas(true);
    try {
      console.log('Iniciando carga de estadísticas de mermas...');
      
      const userCredentials = localStorage.getItem('userCredentials');
      const userId = localStorage.getItem('userId');
      
      if (!userCredentials || !userId) {
        console.error('No se encontraron las credenciales o userId');
        setLoadingMermas(false);
        return;
      }

      const headers = {
        'Authorization': `Basic ${userCredentials}`,
        'Content-Type': 'application/json'
      };

      // Obtener sucursales del usuario
      const userResponse = await axios.get(`http://127.0.0.1:8000/usuarios/${userId}`, { headers });
      
      if (userResponse.data.estatus !== 1 || !userResponse.data.sucursales) {
        console.error('No se pudieron obtener las sucursales del usuario');
        setLoadingMermas(false);
        return;
      }

      const sucursales = userResponse.data.sucursales;
      const sucursalesIds = sucursales.map((s: any) => s.idCentro).join(',');

      // Obtener mermas de las sucursales del usuario
      const mermasResponse = await axios.get(`http://127.0.0.1:8000/mermas/sucursales/${sucursalesIds}`, { headers });
      
      if (mermasResponse.data.estatus === 1) {
        const mermas = mermasResponse.data.mermas || [];
        
        // Calcular estadísticas
        const hoy = new Date().toISOString().split('T')[0];
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        const mermasHoy = mermas.filter((m: any) => m.Fecha >= hoy).length;
        const mermasMes = mermas.filter((m: any) => m.Fecha >= inicioMes).length;
        const sucursalesUnicas = new Set(mermas.map((m: any) => m.idCentro)).size;

        // Calcular total de pérdidas
        let totalPerdidas = 0;
        for (const merma of mermas) {
          try {
            const productosResponse = await axios.get(`http://127.0.0.1:8000/mermas/${merma.idMaMe}/productos`, { headers });
            if (productosResponse.data.estatus === 1) {
              const productos = productosResponse.data.productos || [];
              const valorMerma = productos.reduce((suma: number, producto: any) => {
                const cantidad = parseFloat(producto.Cantidad) || 0;
                const precio = parseFloat(producto.Precio || 0);
                return suma + (cantidad * precio);
              }, 0);
              totalPerdidas += valorMerma;
            }
          } catch (error) {
            console.error(`Error al obtener productos de merma ${merma.idMaMe}:`, error);
          }
        }

        setMermasStats({
          totalPerdidas: totalPerdidas,
          totalMermas: mermas.length,
          mermasHoy: mermasHoy,
          mermasMes: mermasMes,
          sucursalesConMermas: sucursalesUnicas,
        });

        console.log('Estadísticas de mermas calculadas:', {
          totalPerdidas,
          totalMermas: mermas.length,
          mermasHoy,
          mermasMes,
          sucursalesConMermas: sucursalesUnicas,
        });
      }
    } catch (error) {
      console.error('Error al obtener estadísticas de mermas:', error);
    } finally {
      setLoadingMermas(false);
    }
  };

  // useEffect para cargar estadísticas de mermas
  useEffect(() => {
    if (!isLoading) { // Solo cargar mermas después de cargar usuarios
      fetchMermasStats();
    }
  }, [isLoading]);

  const zonasChartData = {
    labels: Object.keys(stats.usuariosPorZona),
    datasets: [
      {
        data: Object.values(stats.usuariosPorZona),
        backgroundColor: [
          '#2368b3',  // Azul principal
          '#64b5f6',  // Azul claro
          '#1976d2',  // Azul medio
          '#0d47a1',  // Azul oscuro
          '#bbdefb',  // Azul muy claro
          '#1565c0',  // Azul medio oscuro
        ],
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  // Opciones adicionales para el gráfico de zonas
  const zonasChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = stats.totalUsuarios;
            const value = context.raw || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${value} usuarios (${percentage}%)`;
          }
        }
      }
    }
  };

  const nivelesChartData = {
    labels: Object.keys(stats.usuariosPorNivel),
    datasets: [
      {
        label: 'Usuarios por Nivel',
        data: Object.values(stats.usuariosPorNivel),
        backgroundColor: [
          '#2368b3',  // Azul principal
          '#64b5f6',  // Azul claro
          '#1976d2',  // Azul medio
        ],
        borderRadius: 8,
        maxBarThickness: 50,
      },
    ],
  };

  if (isLoading) {
    return <div>Cargando estadísticas...</div>;
  }

  // Si el usuario no es Admin, mostrar imagen alternativa
  if (userLevel !== 'Admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-12 max-w-2xl w-full mx-auto transform transition-all">
          <div className="flex flex-col items-center">
            <div className="mb-8 p-6 bg-gray-50 rounded-full">
              <img 
                src="/window.svg" 
                alt="Acceso Restringido" 
                className="w-32 h-32" 
                style={{ 
                  filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
                }}
              />
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold" style={{ color: '#2368b3' }}>
                Acceso Restringido
              </h2>
              <p className="text-2xl font-semibold" style={{ color: '#f26722' }}>
                Área Administrativa
              </p>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Esta sección del panel está disponible solo para usuarios administradores.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-overview" style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      <div className="stats-header" style={{
        marginBottom: '2rem',
      }}>
        {/* Grid de Métricas Principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Total Usuarios */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ 
                margin: 0, 
                color: '#2368b3',
                fontSize: '1rem',
                fontWeight: '600'
              }}>Total Usuarios</h3>
              <div style={{ 
                background: 'rgba(35, 104, 179, 0.1)', 
                color: '#2368b3', 
                borderRadius: '8px', 
                padding: '8px', 
                fontSize: '20px' 
              }}>👥</div>
            </div>
            <p style={{ 
              fontSize: '2.5rem', 
              margin: 0, 
              color: '#333',
              fontWeight: 'bold'
            }}>{stats.totalUsuarios}</p>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Usuarios activos</span>
          </div>

          {/* Total Pérdidas */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ 
                margin: 0, 
                color: '#e53e3e',
                fontSize: '1rem',
                fontWeight: '600'
              }}>Pérdidas Totales</h3>
              <div style={{ 
                background: 'rgba(229, 62, 62, 0.1)', 
                color: '#e53e3e', 
                borderRadius: '8px', 
                padding: '8px', 
                fontSize: '20px' 
              }}>💰</div>
            </div>
            <p style={{ 
              fontSize: '2rem', 
              margin: 0, 
              color: '#e53e3e',
              fontWeight: 'bold'
            }}>
              {loadingMermas ? '...' : `$${mermasStats.totalPerdidas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Valor en dinero</span>
          </div>

          {/* Total Mermas */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ 
                margin: 0, 
                color: '#f5942b',
                fontSize: '1rem',
                fontWeight: '600'
              }}>Total Mermas</h3>
              <div style={{ 
                background: 'rgba(245, 148, 43, 0.1)', 
                color: '#f5942b', 
                borderRadius: '8px', 
                padding: '8px', 
                fontSize: '20px' 
              }}>📊</div>
            </div>
            <p style={{ 
              fontSize: '2.5rem', 
              margin: 0, 
              color: '#333',
              fontWeight: 'bold'
            }}>
              {loadingMermas ? '...' : mermasStats.totalMermas}
            </p>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Registros totales</span>
          </div>

          {/* Mermas del Mes */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ 
                margin: 0, 
                color: '#38a169',
                fontSize: '1rem',
                fontWeight: '600'
              }}>Mermas del Mes</h3>
              <div style={{ 
                background: 'rgba(56, 161, 105, 0.1)', 
                color: '#38a169', 
                borderRadius: '8px', 
                padding: '8px', 
                fontSize: '20px' 
              }}>📈</div>
            </div>
            <p style={{ 
              fontSize: '2.5rem', 
              margin: 0, 
              color: '#333',
              fontWeight: 'bold'
            }}>
              {loadingMermas ? '...' : mermasStats.mermasMes}
            </p>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Este mes</span>
          </div>
        </div>
      </div>

      {/* Alerta de Pérdidas Altas */}
      {!loadingMermas && mermasStats.totalPerdidas > 5000 && (
        <div style={{
          background: 'linear-gradient(135deg, #fed7d7, #feb2b2)',
          border: '2px solid #fc8181',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 4px 12px rgba(252, 129, 129, 0.3)'
        }}>
          <div style={{ 
            fontSize: '3rem',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>🚨</div>
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              margin: '0 0 0.5rem 0', 
              color: '#c53030', 
              fontSize: '1.25rem', 
              fontWeight: '700' 
            }}>
              ¡Alerta: Pérdidas Elevadas Detectadas!
            </h4>
            <p style={{ 
              margin: 0, 
              color: '#c53030', 
              fontSize: '1rem',
              fontWeight: '500'
            }}>
              Las pérdidas totales han alcanzado ${mermasStats.totalPerdidas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}. 
              Se recomienda revisar los procesos de control de inventario.
            </p>
          </div>
          <div style={{
            background: 'rgba(197, 48, 48, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{ color: '#c53030', fontWeight: 'bold', fontSize: '1.1rem' }}>
              {mermasStats.totalMermas} mermas
            </div>
            <div style={{ color: '#c53030', fontSize: '0.8rem', opacity: 0.8 }}>
              registradas
            </div>
          </div>
        </div>
      )}

      {/* Métricas Adicionales de Mermas */}
      {!loadingMermas && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 1.5rem 0', 
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>📊 Resumen de Control de Pérdidas</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {mermasStats.mermasHoy}
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Mermas Hoy</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {mermasStats.sucursalesConMermas}
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Sucursales con Mermas</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                ${mermasStats.totalMermas > 0 ? (mermasStats.totalPerdidas / mermasStats.totalMermas).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Promedio por Merma</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {mermasStats.mermasMes > 0 ? Math.round(mermasStats.mermasMes / new Date().getDate()) : 0}
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Promedio Diario</div>
            </div>
          </div>
        </div>
      )}

      <div className="charts-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '2rem',
        marginTop: '2rem',
      }}>
        <div className="chart-container" style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ 
            margin: '0 0 1.5rem 0', 
            color: '#2368b3',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>Distribución por Zona</h3>
          <div style={{ height: '400px', position: 'relative' }}>
            <Pie 
              data={zonasChartData} 
              options={zonasChartOptions} 
            />
          </div>
        </div>

        <div className="chart-container" style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ 
            margin: '0 0 1.5rem 0', 
            color: '#2368b3',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>Usuarios por Nivel</h3>
          <div style={{ height: '400px', position: 'relative' }}>
            <Bar 
              data={nivelesChartData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 20,
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.1)'
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;