'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import './dashboard.css';

interface User {
  idUsuarios: number;
  NombreUsuario: string;
  idNivelUsuario: number;
  estatus: number;
  FechaAlta: string | null;
  nivel: string;
  sucursales: number;
}

const Dashboard = () => {
  const [activePanel, setActivePanel] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userName, setUserName] = useState('Usuario');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    NombreUsuario: '',
    idNivelUsuario: null as number | null,
    estatus: null as number | null,
  });
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

  useEffect(() => {
    if (isAuthenticated) {
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

      fetchUsers();
    }
  }, [isAuthenticated, limit, offset]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('userName');
      if (storedName) {
        setUserName(storedName);
      }
    }
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
      const response = await axios.put(
        `http://127.0.0.1:8000/usuarios/${editingUser.idUsuarios}`,
        { NombreUsuario, idNivelUsuario: idNivelUsuario || 0, estatus: estatus || 0 },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.idUsuarios === editingUser.idUsuarios
            ? { ...user, NombreUsuario, idNivelUsuario: idNivelUsuario || 0, estatus: estatus || 0 }
            : user
        )
      );
      setEditingUser(null);
      setEditForm({
        NombreUsuario: '',
        idNivelUsuario: null,
        estatus: null,
      });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  if (!isAuthenticated) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">D</div>
            <h1 className="company-name">Dashboard</h1>
          </div>
          <div className="user-info">
            <div className="user-avatar">JD</div>
            <div className="user-details">
              <h4>{userName}</h4>
              <p>Administrador</p>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div
              className={`nav-item ${activePanel === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActivePanel('dashboard')}
            >
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Dashboard</span>
            </div>
            <div
              className={`nav-item ${activePanel === 'users' ? 'active' : ''}`}
              onClick={() => setActivePanel('users')}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-text">Usuarios</span>
            </div>
          </div>
          <div className="nav-section">
            <div
              className="nav-item"
              onClick={() => {
                localStorage.removeItem('authToken');
                router.replace('/login');
              }}
            >
              <span className="nav-icon">🚪</span>
              <span className="nav-text">Cerrar Sesión</span>
            </div>
          </div>
        </nav>
      </div>
      <div className="main-content">
        <div className="top-bar">
          <h1 className="page-title">
            {activePanel === 'dashboard' && 'Dashboard'}
            {activePanel === 'users' && 'Gestión de Usuarios'}
          </h1>
        </div>
        <div className="content-area">
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
                            onClick={() => console.log(`Asignando sucursal al usuario ${user.idUsuarios}`)}
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
              {editingUser && (
                <div className="edit-form-container">
                  <h3>Editar Usuario</h3>
                  <form onSubmit={handleEditSubmit}>
                    <label>
                      Nombre:
                      <input
                        type="text"
                        value={editForm.NombreUsuario}
                        onChange={(e) => setEditForm({ ...editForm, NombreUsuario: e.target.value })}
                      />
                    </label>
                    <label>
                      Nivel de Usuario:
                      <input
                        type="number"
                        value={editForm.idNivelUsuario || ''}
                        onChange={(e) => setEditForm({ ...editForm, idNivelUsuario: parseInt(e.target.value) || null })}
                      />
                    </label>
                    <label>
                      Estatus:
                      <select
                        value={editForm.estatus || ''}
                        onChange={(e) => setEditForm({ ...editForm, estatus: parseInt(e.target.value) || null })}
                      >
                        <option value="1">Activo</option>
                        <option value="0">Inactivo</option>
                      </select>
                    </label>
                    <button type="submit">Guardar Cambios</button>
                    <button type="button" onClick={() => setEditingUser(null)}>Cancelar</button>
                  </form>
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