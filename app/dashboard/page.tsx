'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import './dashboard.css';
import DashboardOverview from '../components/DashboardOverview';
import AssignSucursalModal from '../components/AssignSucursalModal';
import EditUserModal from '../components/EditUserModal';
import UserTable from '../components/UserTable';
import ValoresContent from '../components/ValoresContent';
import AperturaCierresContent from '../components/AperturaCierresContent';
import MermasContent from '../components/MermasContent';

// URL de la API - usar variable de entorno o fallback a localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface User {
  idUsuarios: number;
  NombreUsuario: string;
  idNivelUsuario: number;
  nivel: string;
  estatus: number;
  sucursales?: string[];
}

interface Zona {
  idZona: number;
  Zona: string;  // Cambiado a mayúscula para coincidir con la API
}

interface Sucursal {
  idCentro: string;
  Sucursales: string;
  idZona?: number;
}

interface UserLevel {
  idNivelUsuario: number;
  NivelUsuario: string;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('dashboard');
  const [userName, setUserName] = useState('');
  const [userLevel, setUserLevel] = useState('');
  
  // Estados para la gestión de usuarios
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [userLevels, setUserLevels] = useState<UserLevel[]>([]);
  
  // Estados para la paginación
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  // Estados para sucursales
  const [selectedSucursal, setSelectedSucursal] = useState<string | null>(null);
  const [selectedZona, setSelectedZona] = useState("Todas las zonas");
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [filteredSucursales, setFilteredSucursales] = useState<Sucursal[]>([]);

  // Form state para edición de usuario
  const [editForm, setEditForm] = useState<Partial<User>>({
    NombreUsuario: '',
    idNivelUsuario: 0,
    estatus: 1,
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const level = localStorage.getItem('userLevel');
    const name = localStorage.getItem('userName');
    setIsAuthenticated(!!token);
    setUserLevel(level || '');
    setUserName(name || '');
    
    // Leer el parámetro 'panel' de la URL
    try {
      const panel = searchParams.get('panel');
      if (panel === 'users') {
        setActivePanel('users');
      } else if (panel === 'valores') {
        setActivePanel('valores');
      } else if (panel === 'apertura-cierres') {
        setActivePanel('apertura-cierres');
      } else if (panel === 'mermas') {
        setActivePanel('mermas');
      } else {
        setActivePanel('dashboard');
      }
    } catch (error) {
      console.log('Error reading search params:', error);
      setActivePanel('dashboard');
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
      if (activePanel === 'users') {
        fetchUserLevels();
        fetchZonas(); // Cargar zonas cuando estamos en la sección de usuarios
      }
    }
  }, [isAuthenticated, limit, offset, activePanel]);

  // Efecto específico para cargar zonas cuando se abre el modal de asignación
  useEffect(() => {
    if (assigningUser) {
      console.log('Modal abierto para usuario:', assigningUser);
      fetchZonas();
      // Reset estados del modal de forma más agresiva
      setSelectedZona("Todas las zonas");
      setSelectedSucursal(null); // Forzar a null
      setSucursales([]);
      setFilteredSucursales([]);
      
      // Cargar sucursales inmediatamente
      setTimeout(() => {
        fetchSucursales(0);
      }, 100);
    } else {
      // Cuando se cierra el modal, limpiar todo
      setSelectedZona("Todas las zonas");
      setSelectedSucursal(null);
      setSucursales([]);
      setFilteredSucursales([]);
    }
  }, [assigningUser]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/usuarios?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Basic ${localStorage.getItem('userCredentials')}`,
        },
      });
      setUsers(response.data.usuarios);
      setTotalUsers(response.data.total);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserLevels = async () => {
    try {
      const response = await axios.get(`${API_URL}/niveles-usuario`, {
        headers: {
          'Authorization': `Basic ${localStorage.getItem('userCredentials')}`,
        },
      });
      if (response.data && response.data.niveles) {
        setUserLevels(response.data.niveles);
      }
    } catch (error) {
      console.error('Error fetching user levels:', error);
    }
  };

  const fetchZonas = async () => {
    try {
      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        console.error('No se encontraron credenciales');
        return;
      }

      const response = await axios.get(`${API_URL}/zonas`, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.data && Array.isArray(response.data.zonas)) {
        setZonas(response.data.zonas);
      } else {
        console.error('Formato de respuesta inválido:', response.data);
      }
    } catch (error) {
      console.error('Error fetching zonas:', error);
      setZonas([]); // Resetear las zonas en caso de error
    }
  };

  const fetchSucursales = async (zonaId: number) => {
    try {
      console.log('=== INICIO fetchSucursales ===');
      console.log('ZonaId recibido:', zonaId);
      console.log('Usuario asignado:', assigningUser);

      if (!assigningUser) {
        console.error('No hay usuario seleccionado');
        return;
      }

      const userCredentials = localStorage.getItem('userCredentials');
      if (!userCredentials) {
        console.error('No se encontraron credenciales');
        return;
      }

      // Construir la URL base
      let url = `${API_URL}/usuarios/${assigningUser.idUsuarios}/sucursales-disponibles`;
      
      // Si se seleccionó una zona específica, agregar el parámetro idZona
      if (zonaId !== 0) {
        url += `?idZona=${zonaId}`;
      }

      console.log('URL construida:', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${userCredentials}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response completo:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);

      // Verificar diferentes formatos posibles de respuesta
      let sucursalesData = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Si la respuesta es directamente un array
          sucursalesData = response.data;
          console.log('Formato: Array directo');
        } else if (response.data.sucursales && Array.isArray(response.data.sucursales)) {
          // Si tiene la propiedad sucursales
          sucursalesData = response.data.sucursales;
          console.log('Formato: Objeto con propiedad sucursales');
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Si tiene la propiedad data
          sucursalesData = response.data.data;
          console.log('Formato: Objeto con propiedad data');
        } else {
          console.error('Formato de respuesta no reconocido:', response.data);
        }
      }

      console.log('Sucursales procesadas:', sucursalesData);
      console.log('Cantidad de sucursales:', sucursalesData.length);

      if (sucursalesData.length > 0) {
        // Mostrar estructura del primer elemento para debug
        console.log('Estructura del primer elemento:', sucursalesData[0]);
        console.log('Propiedades disponibles:', Object.keys(sucursalesData[0]));
      }

      setSucursales(sucursalesData);
      setFilteredSucursales(sucursalesData);
      
      console.log('Estados actualizados con', sucursalesData.length, 'sucursales');
      console.log('=== FIN fetchSucursales ===');

    } catch (error) {
      console.error('=== ERROR en fetchSucursales ===');
      console.error('Error completo:', error);
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      
      // Type guard para axios error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('Error response status:', axiosError.response?.status);
        console.error('Error response data:', axiosError.response?.data);
      }
      
      setSucursales([]);
      setFilteredSucursales([]);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingUser || !editForm) return;
    
    try {
      const response = await axios.put(
       `${API_URL}/usuarios/${editingUser.idUsuarios}`,
        {
          NombreUsuario: editForm.NombreUsuario,
          idNivelUsuario: editForm.idNivelUsuario,
          estatus: editForm.estatus,
        },
        {
          headers: {
            'Authorization': `Basic ${localStorage.getItem('userCredentials')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.estatus === 1) {
        alert(response.data.mensaje || 'Usuario actualizado correctamente');
        // Primero aseguramos que estamos en el panel de usuarios
        setActivePanel('users');
        // También actualizar la URL para mantener el panel
        router.push('/dashboard?panel=users');
        // Luego actualizamos los datos y limpiamos el formulario
        await fetchUsers();
        setEditingUser(null);
        setEditForm({
          NombreUsuario: '',
          idNivelUsuario: 0,
          estatus: 1,
        });
      }
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      alert('Error al actualizar usuario. Por favor, inténtelo de nuevo.');
    }
  };

  const handleEditClick = async (user: User) => {
    try {
      const response = await axios.get(`${API_URL}/niveles-usuario`, {
        headers: {
          'Authorization': `Basic ${localStorage.getItem('userCredentials')}`,
        },
      });
      
      if (response.data && response.data.niveles) {
        setUserLevels(response.data.niveles);
      }
      
      setEditingUser(user);
      setEditForm({
        NombreUsuario: user.NombreUsuario,
        idNivelUsuario: user.idNivelUsuario,
        estatus: user.estatus,
      });
    } catch (error) {
      console.error('Error al cargar niveles de usuario:', error);
      alert('Error al cargar los niveles de usuario. Por favor, intente de nuevo.');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.NombreUsuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nivel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return <div>Cargando...</div>;
  }

  // Función para cerrar el sidebar móvil al hacer clic en un nav-item
  const handleNavClick = (panel: string, path: string) => {
    setActivePanel(panel);
    router.push(path);
    setIsMobileSidebarOpen(false); // Cerrar sidebar en móvil
  };

  return (
    <div className="dashboard-container">
      {/* Botón hamburguesa para móvil */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        aria-label="Toggle menu"
      >
        {isMobileSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay oscuro para móvil */}
      <div 
        className={`sidebar-overlay ${isMobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      <div className={`sidebar ${isMenuCollapsed ? 'collapsed' : ''} ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button 
            className="sidebar-toggle" 
            onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
          >
            <span id="toggleIcon">◀</span>
          </button>
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">Met</div>
              {!isMenuCollapsed && <h2 className="company-name">Pre</h2>}
            </div>
            
            {!isMenuCollapsed && (
              <div className="user-info">
                <div className="user-avatar">
                  {userName ? userName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-details">
                  <h4 className="user-name">{userName}</h4>
                  <h4 className="user-role">{userLevel}</h4>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div 
              className={`nav-item ${activePanel === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard', '/dashboard')}
            >
              <span className="nav-icon">🏠</span>
              {!isMenuCollapsed && <span className="nav-text">Dashboard</span>}
            </div>
            
            {userLevel === 'Admin' && (
              <div 
                className={`nav-item ${activePanel === 'users' ? 'active' : ''}`}
                onClick={() => handleNavClick('users', '/dashboard?panel=users')}
              >
                <span className="nav-icon">👥</span>
                {!isMenuCollapsed && <span className="nav-text">Usuarios</span>}
              </div>
            )}
            
            <div 
              className={`nav-item ${activePanel === 'valores' ? 'active' : ''}`}
              onClick={() => handleNavClick('valores', '/dashboard?panel=valores')}
            >
              <span className="nav-icon">💰</span>
              {!isMenuCollapsed && <span className="nav-text">Manejo de Valores</span>}
            </div>

            <div 
              className={`nav-item ${activePanel === 'apertura-cierres' ? 'active' : ''}`}
              onClick={() => handleNavClick('apertura-cierres', '/dashboard?panel=apertura-cierres')}
            >
              <span className="nav-icon">🌅</span>
              {!isMenuCollapsed && <span className="nav-text">Apertura y cierres</span>}
            </div>

            <div 
              className={`nav-item ${activePanel === 'mermas' ? 'active' : ''}`}
              onClick={() => handleNavClick('mermas', '/dashboard?panel=mermas')}
            >
              <span className="nav-icon">📉</span>
              {!isMenuCollapsed && <span className="nav-text">Manejo de Mermas</span>}
            </div>

            <div
              className="nav-item"
              onClick={() => {
                localStorage.removeItem('authToken');
                router.replace('/login');
              }}
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
            {activePanel === 'dashboard' && <DashboardOverview userLevel={userLevel} />}
            {activePanel === 'users' && 'Gestión de Usuarios'}
            {activePanel === 'valores' && 'Manejo de Valores'}
            {activePanel === 'apertura-cierres' && 'Apertura y Cierres'}
            {activePanel === 'mermas' && 'Manejo de Mermas'}
          </h1>
        </div>

        <div className="content-area">
          {activePanel === 'dashboard' && (
            <DashboardOverview userLevel={userLevel} />
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

              <UserTable
                users={filteredUsers}
                onEdit={handleEditClick}
                onAssign={async (user) => {
                  setAssigningUser(user);
                  setSelectedSucursal(null);
                  setSelectedZona("Todas las zonas");
                  await fetchZonas();
                  await fetchSucursales(0);
                }}
                onDelete={(user) => {
                  if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
                    console.log(`Usuario ${user.idUsuarios} eliminado`);
                  }
                }}
              />

              <div className="pagination-container">
                <div className="pagination-info">
                  Mostrando {offset + 1} - {Math.min(offset + limit, totalUsers)} de {totalUsers} usuarios
                </div>
                <div className="pagination-controls">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= totalUsers}
                  >
                    Siguiente
                  </button>
                </div>
                <div className="pagination-size">
                  <label htmlFor="limit">Mostrar:</label>
                  <select
                    id="limit"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setOffset(0);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <AssignSucursalModal
                show={!!assigningUser}
                user={assigningUser}
                zonas={zonas}
                sucursales={sucursales}
                filteredSucursales={filteredSucursales}
                selectedZona={selectedZona}
                setSelectedZona={setSelectedZona}
                selectedSucursal={selectedSucursal}
                setSelectedSucursal={setSelectedSucursal}
                onClose={() => setAssigningUser(null)}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedSucursal) {
                    alert('Por favor, seleccione una sucursal');
                    return;
                  }
                  try {
                    const response = await axios.post(
                     `${API_URL}/usuarios/${assigningUser?.idUsuarios}/sucursales`,
                      { idCentro: selectedSucursal },
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
                }}
                fetchSucursales={fetchSucursales}
              />

              <EditUserModal
                show={!!editingUser}
                user={editingUser}
                editForm={editForm}
                setEditForm={setEditForm}
                userLevels={userLevels}
                onClose={() => setEditingUser(null)}
                onSubmit={handleEditSubmit}
              />
            </div>
          )}

          {activePanel === 'valores' && (
            <ValoresContent />
          )}

          {activePanel === 'apertura-cierres' && (
            <AperturaCierresContent />
          )}

          {activePanel === 'mermas' && (
            <MermasContent />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
