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

  const [isLoading, setIsLoading] = useState(true);

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
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '300px',
          margin: '0 auto',
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            color: '#2368b3',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>Total Usuarios</h3>
          <p style={{ 
            fontSize: '3rem', 
            margin: 0, 
            color: '#333',
            fontWeight: 'bold'
          }}>{stats.totalUsuarios}</p>
        </div>
      </div>

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