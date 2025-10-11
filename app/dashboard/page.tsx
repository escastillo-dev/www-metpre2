'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import './dashboard.css';
import DashboardOverview from '../components/DashboardOverview';

interface User {
  idUsuarios: number;
  NombreUsuario: string;
  idNivelUsuario: number;
  estatus: number;
  FechaAlta: string | null;
  nivel: string;
  sucursales: number;
}

interface Sucursal {
  idCentro: string;
  Sucursales: string;
  idZona?: number;
  Zona?: string;
}

interface Zona {
  idZona: number;
  zona: string;
}

const Dashboard = () => {
  const [activePanel, setActivePanel] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userName, setUserName] = useState('');
  const [userLevel, setUserLevel] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [editForm, setEditForm] = useState({
    NombreUsuario: '',
    idNivelUsuario: null as number | null,
    estatus: null as number | null,
  });
  const [userLevels, setUserLevels] = useState<{ idNivelUsuario: number; NivelUsuario: string }[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);

  // Función para obtener las zonas
  const fetchZonas = async () => {
    try {
      console.log('Obteniendo zonas...');
      const credentials = localStorage.getItem('userCredentials');
      if (!credentials) {
        console.error('No se encontraron las credenciales');
        return;
      }

      const response = await axios.get('http://127.0.0.1:8000/zonas', {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
      });
      console.log('Respuesta de zonas:', response.data); // Debug

      if (response.data && Array.isArray(response.data.zonas)) {
        const zonasFromApi = response.data.zonas.map((zona: { idZona: number; Zona: string }) => ({
          idZona: zona.idZona,
          zona: zona.Zona // Asegurarnos de usar el campo correcto de la API
        }));
        // Agregar opción "Todas las zonas" al principio
        const zonasData = [
          { idZona: 0, zona: "Todas las zonas" },
          ...zonasFromApi
        ];
        console.log('Zonas procesadas:', zonasData); // Debug
        setZonas(zonasData);
      }
    } catch (error) {
      console.error('Error al obtener zonas:', error);
    }
  };
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [selectedSucursal, setSelectedSucursal] = useState<string | null>(null);
  const [selectedZona, setSelectedZona] = useState<string>("Todas las zonas");
  const [filteredSucursales, setFilteredSucursales] = useState<Sucursal[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.replace('/login');
      }
    }
  }, [router]);

  // Función para obtener las sucursales por zona
  const fetchSucursales = async (zonaId: number = 0) => {
    try {
      const credentials = localStorage.getItem('userCredentials');
      if (!credentials) {
        console.error('No se encontraron las credenciales');
        return;
      }

      if (!assigningUser) {
        console.error('No hay usuario seleccionado');
        return;
      }

      // Construir la URL con los parámetros de consulta
      const params = new URLSearchParams();
      if (zonaId !== 0) {
        params.append('idZona', zonaId.toString());
      }
      const queryString = params.toString();
      const url = `http://127.0.0.1:8000/usuarios/${assigningUser.idUsuarios}/sucursales-disponibles${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching sucursales for user:', assigningUser.idUsuarios, 'with zona:', zonaId);
      console.log('Request URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.data && Array.isArray(response.data.sucursales)) {
        const sucursalesData = response.data.sucursales.map((sucursal: any) => ({
          idCentro: sucursal.idCentro,
          Sucursales: sucursal.Sucursales
        }));
        setSucursales(sucursalesData);
        setFilteredSucursales(sucursalesData);
      }
    } catch (error) {
      console.error('Error al obtener sucursales:', error);
    }
  };

  // Función para obtener los usuarios
  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/usuarios', {
        params: { limit, offset },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      setUsers(response.data.usuarios);
      setTotalUsers(response.data.total);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Efecto para cargar usuarios cuando cambian los parámetros
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
      fetchZonas();
    }
  }, [isAuthenticated, limit, offset]);

  // Función para obtener el nombre del nivel de usuario
  const fetchUserLevel = async (idNivel: number) => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/niveles-usuario', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (response.data && Array.isArray(response.data.niveles)) {
        const nivel = response.data.niveles.find((n: any) => n.idNivelUsuario === idNivel);
        if (nivel) {
          return nivel.NivelUsuario;
        }
      }
    } catch (error) {
      console.error('Error al obtener niveles de usuario:', error);
    }
    return 'Usuario';
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('userName');
      const storedLevel = localStorage.getItem('userLevel');
      if (storedName) {
        setUserName(storedName);
      }
      if (storedLevel) {
        setUserLevel(storedLevel);
      }

      // Obtener y establecer el nivel del usuario
      const getUserLevel = async () => {
        const idNivel = localStorage.getItem('idNivelUsuario');
        if (idNivel) {
          const nivelNombre = await fetchUserLevel(parseInt(idNivel));
          setUserLevel(nivelNombre);
        }
      };

      getUserLevel();
    }
  }, []);

  // Ensured the dropdown preselects the user's assigned level and populates options correctly
  useEffect(() => {
    const fetchUserLevels = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/niveles-usuario', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        console.log('API response for user levels:', response.data); // Debug log
        if (response.data && Array.isArray(response.data.niveles)) {
          setUserLevels(response.data.niveles);
          console.log('User levels set:', response.data.niveles); // Debug log
        } else {
          console.error('Unexpected API response format:', response.data);
        }
      } catch (error) {
        console.error('Error fetching user levels:', error);
      }
    };

    fetchUserLevels();
  }, []);

  const filteredUsers = users.filter((user) =>
    user.NombreUsuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nivel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalUsers / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditForm({
      NombreUsuario: user.NombreUsuario,
      idNivelUsuario: user.idNivelUsuario || null,
      estatus: user.estatus || null,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const { NombreUsuario, idNivelUsuario, estatus } = editForm;
      const token = localStorage.getItem('authToken');

      if (!token) {
        console.error('No se encontró token de autenticación');
        router.replace('/login');
        return;
      }

      // Convertir estatus a 1 o 0 según la base de datos
      const estatusDB = estatus === 1 ? 1 : 0;

      // Debug: Mostrar el token y los headers
      console.log('Token:', token);
      console.log('Headers:', {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      });

      console.log('Enviando datos:', {
        NombreUsuario: NombreUsuario.trim(),
        idNivelUsuario: idNivelUsuario || 0,
        estatus: estatusDB,
        idCentro: null
      });

      // Configurar axios con interceptores para debugging
      axios.interceptors.request.use(request => {
        console.log('Request Headers:', request.headers);
        return request;
      });

      // Obtener las credenciales codificadas en base64 del localStorage
      const credentials = localStorage.getItem('userCredentials');
      
      if (!credentials) {
        console.error('No se encontraron las credenciales');
        router.replace('/login');
        return;
      }

      const response = await axios.put(
        `http://127.0.0.1:8000/usuarios/${editingUser.idUsuarios}`,
        {
          NombreUsuario: NombreUsuario.trim(),
          idNivelUsuario: idNivelUsuario || 0,
          estatus: estatusDB,
          idCentro: null
        },
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      console.log('Respuesta de la API:', response.data);

      if (response.data.estatus === 1) {
        // Cerrar el modal y limpiar el formulario
        setEditingUser(null);
        setEditForm({
          NombreUsuario: '',
          idNivelUsuario: null,
          estatus: null,
        });

        // Mostrar mensaje de éxito
        alert(response.data.mensaje || 'Usuario actualizado correctamente.');
        
        // Refrescar la tabla de usuarios
        await fetchUsers();
      }

      setEditingUser(null);
      setEditForm({
        NombreUsuario: '',
        idNivelUsuario: null,
        estatus: null,
      });

      alert(response.data.mensaje || 'Usuario actualizado correctamente.');
    } catch (error: any) {
      console.error('Error al actualizar el usuario:', error);

      if (error.response) {
        console.error('Estado del error:', error.response.status);
        console.error('Detalles del error:', error.response.data);
        
        // Solo redirigir al login si realmente es un error de autenticación
        if (error.response.status === 401 && error.response.data?.detail?.includes('autenticación')) {
          localStorage.removeItem('authToken');
          router.replace('/login');
          return;
        }
      }

      // Mostrar el mensaje de error
      alert(error.response?.data?.mensaje || 'Hubo un error al actualizar el usuario. Por favor, inténtelo de nuevo.');
    }
  };

  if (!isAuthenticated) {
    return <div>Cargando...</div>;
  }

  // Determinar qué panel mostrar
  const renderActivePanel = () => {
    switch (activePanel) {
      case 'dashboard':
        return <DashboardOverview userLevel={userLevel} />;
      case 'users':
        if (userLevel !== 'Admin') {
          setActivePanel('dashboard');
          return <DashboardOverview userLevel={userLevel} />;
        }
        // ... resto del contenido de usuarios
        return (
          <div className="content-section">
            {/* ... contenido de usuarios ... */}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <div className={`sidebar ${isMenuCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button 
            className="sidebar-toggle" 
            onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
            title={isMenuCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            <span id="toggleIcon">◀</span>
          </button>
          <div className="logo-section">
            <div className="logo-icon">Met</div>
            {!isMenuCollapsed && <h2 className="company-name">Pre</h2>}
          </div>
          <div className="user-info">
            <div className="user-avatar">
              {userName ? userName.slice(0, 2).toUpperCase() : 'U'}
            </div>
            {!isMenuCollapsed && (
              <div className="user-details">
                <h4>{userName}</h4>
                <p>{userLevel || 'Usuario'}</p>
              </div>
            )}
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div
              className={`nav-item ${activePanel === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActivePanel('dashboard')}
              title="Dashboard"
            >
              <span className="nav-icon">🏠</span>
              {!isMenuCollapsed && <span className="nav-text">Dashboard</span>}
            </div>
            {userLevel === 'Admin' && (
              <div
                className={`nav-item ${activePanel === 'users' ? 'active' : ''}`}
                onClick={() => setActivePanel('users')}
                title="Usuarios"
              >
                <span className="nav-icon">👥</span>
                {!isMenuCollapsed && <span className="nav-text">Usuarios</span>}
              </div>
            )}
            <div
              className={`nav-item ${activePanel === 'valores' ? 'active' : ''}`}
              onClick={() => setActivePanel('valores')}
              title="Manejo de Valores"
            >
              <span className="nav-icon">💰</span>
              {!isMenuCollapsed && <span className="nav-text">Manejo de Valores</span>}
            </div>
          </div>
          <div className="nav-section">
            <div
              className="nav-item"
              onClick={() => {
                localStorage.removeItem('authToken');
                router.replace('/login');
              }}
              title="Cerrar Sesión"
            >
              <span className="nav-icon">🚪</span>
              {!isMenuCollapsed && <span className="nav-text">Cerrar Sesión</span>}
            </div>
          </div>
        </nav>
      </div>
      <div className="main-content">
        <div className="top-bar">
          <h1 className="page-title">
            {activePanel === 'dashboard' && (
            <DashboardOverview userLevel={userLevel} />
          )}
            {activePanel === 'users' && 'Gestión de Usuarios'}
            {activePanel === 'valores' && 'Manejo de Valores'}
          </h1>
        </div>
        <div className="content-area">
          {activePanel === 'valores' && (
            <div className="content-panel active">
              <iframe
                src="/valores"
                style={{
                  width: '100%',
                  height: 'calc(100vh - 80px)',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#fff'
                }}
              />
            </div>
          )}
          {activePanel === 'users' && (
            <div className="content-panel active">
              <h2>Lista de Usuarios</h2>
              <div className="search-section">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Buscar usuarios por nombre, email o sucursal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Sucursal</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.idUsuarios}>
                      <td>{user.NombreUsuario}</td>
                      <td>{user.nivel}</td>
                      <td>{user.sucursales}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            user.estatus === 1 ? 'status-active' : 'status-inactive'
                          }`}
                        >
                          {user.estatus === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons" style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                        }}>
                          <button
                            className="btn-small btn-update"
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#2368b3',
                              color: 'white',
                            }}
                            onClick={() => handleEditClick(user)}
                            title="Editar usuario"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn-small btn-assign"
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#f5942b',
                              color: 'white',
                            }}
                            onClick={async () => {
                              setAssigningUser(user);
                              setSelectedSucursal(null);
                              setSelectedZona("Todas las zonas"); // Resetear la zona seleccionada
                              await fetchZonas(); // Cargar las zonas primero
                              await fetchSucursales(0); // Luego cargar todas las sucursales
                            }}
                            title="Asignar sucursal"
                          >
                            🏢 Sucursal
                          </button>
                          <button
                            className="btn-small btn-delete"
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#e53e3e',
                              color: 'white',
                            }}
                            onClick={() => {
                              if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
                                console.log(`Usuario ${user.idUsuarios} eliminado`);
                              }
                            }}
                            title="Eliminar usuario"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Paginación */}
              <div className="pagination-container" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: 'white',
                borderTop: '1px solid #e2e8f0',
                marginTop: '1rem'
              }}>
                <div className="pagination-info" style={{ color: '#4a5568' }}>
                  Mostrando {offset + 1} - {Math.min(offset + limit, totalUsers)} de {totalUsers} usuarios
                </div>
                <div className="pagination-controls" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      backgroundColor: offset === 0 ? '#f7fafc' : 'white',
                      color: offset === 0 ? '#a0aec0' : '#2368b3',
                      cursor: offset === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= totalUsers}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      backgroundColor: offset + limit >= totalUsers ? '#f7fafc' : 'white',
                      color: offset + limit >= totalUsers ? '#a0aec0' : '#2368b3',
                      cursor: offset + limit >= totalUsers ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Siguiente
                  </button>
                </div>
                <div className="pagination-size" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="limit" style={{ color: '#4a5568' }}>Mostrar:</label>
                  <select
                    id="limit"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setOffset(0); // Resetear a la primera página cuando se cambia el límite
                    }}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Modal de Asignar Sucursal */}
              {assigningUser && (
                <div className="modal-overlay" style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000,
                }}>
                  <div className="modal-content" style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                    width: '400px',
                  }}>
                    <h3>Asignar Sucursal</h3>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!selectedSucursal) {
                        alert('Por favor, seleccione una sucursal');
                        return;
                      }
                      try {
                        console.log('Asignando sucursal:', {
                          idUsuarios: assigningUser.idUsuarios,
                          idCentro: selectedSucursal.toString()
                        });

                        const response = await axios.post(
                          `http://127.0.0.1:8000/usuarios/${assigningUser.idUsuarios}/sucursales`,
                          {
                            idCentro: selectedSucursal.toString(), // Convertir a string como lo requiere la API
                          },
                          {
                            headers: {
                              'Authorization': `Basic ${localStorage.getItem('userCredentials')}`,
                              'Content-Type': 'application/json',
                            },
                          }
                        );

                        if (response.data.estatus === 1) {
                          alert(response.data.mensaje || 'Sucursal asignada correctamente');
                          await fetchUsers();
                          setAssigningUser(null);
                          setSelectedSucursal(null);
                        }
                      } catch (error) {
                        console.error('Error al asignar sucursal:', error);
                        alert('Error al asignar sucursal. Por favor, inténtelo de nuevo.');
                      }
                    }}>
                      <div style={{ marginBottom: '20px' }}>
                        <p>Usuario: {assigningUser.NombreUsuario}</p>
                      </div>
                      <label>
                        Zona:
                        <select
                          value={selectedZona}
                          onChange={async (e) => {
                            const zonaNombre = e.target.value;
                            console.log('Zona seleccionada:', zonaNombre); // Debug
                            setSelectedZona(zonaNombre);
                            setSelectedSucursal(null); // Reset sucursal selection
                            const zonaSeleccionada = zonas.find(z => z.zona === zonaNombre);
                            console.log('Zona encontrada:', zonaSeleccionada); // Debug
                            const zonaId = zonaNombre === "Todas las zonas" ? 0 : zonaSeleccionada?.idZona || 0;
                            await fetchSucursales(zonaId);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            margin: '10px 0',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                          }}
                        >
                          <option value="Todas las zonas">Todas las zonas</option>
                          {zonas.filter(zona => zona.idZona !== 0).map((zona) => (
                            <option key={zona.idZona} value={zona.zona}>
                              {zona.zona}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Sucursal:
                        <select
                          value={selectedSucursal?.toString() || ''}
                          onChange={(e) => {
                            console.log('Sucursal seleccionada:', e.target.value); // Debug
                            setSelectedSucursal(e.target.value ? e.target.value : null);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            margin: '10px 0',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                          }}
                        >
                          <option value="">Seleccione una sucursal</option>
                          {(selectedZona === "Todas las zonas" ? sucursales : filteredSucursales).map((sucursal) => (
                            <option key={sucursal.idCentro} value={sucursal.idCentro}>
                              {sucursal.Sucursales}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                        <button
                          type="submit"
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#2368b3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Asignar
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssigningUser(null)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#e53e3e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              {/* Modal de Editar Usuario */}
              {editingUser && (
                <div className="modal-overlay" style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000,
                }}>
                  <div className="modal-content" style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                    width: '400px',
                  }}>
                    <h3>Editar Usuario</h3>
                    <form onSubmit={handleEditSubmit}>
                      <label>
                        Nombre:
                        <input
                          type="text"
                          value={editForm.NombreUsuario}
                          onChange={(e) => setEditForm({ ...editForm, NombreUsuario: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px',
                            margin: '10px 0',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                          }}
                        />
                      </label>
                      <label>
                        Nivel de Usuario:
                        <select
                          value={editForm.idNivelUsuario || ''}
                          onChange={(e) => setEditForm({ ...editForm, idNivelUsuario: parseInt(e.target.value) || null })}
                          style={{
                            width: '100%',
                            padding: '8px',
                            margin: '10px 0',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                          }}
                        >
                          <option value="">Seleccione un nivel</option>
                          {userLevels.map((level) => (
                            <option key={level.idNivelUsuario} value={level.idNivelUsuario}>
                              {level.NivelUsuario}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Estatus:
                        <select
                          value={editForm.estatus || ''}
                          onChange={(e) => setEditForm({ ...editForm, estatus: parseInt(e.target.value) || null })}
                          style={{
                            width: '100%',
                            padding: '8px',
                            margin: '10px 0',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                          }}
                        >
                          <option value="1">Activo</option>
                          <option value="0">Inactivo</option>
                        </select>
                      </label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                        <button
                          type="submit"
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#2368b3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Guardar Cambios
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUser(null)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#e53e3e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;