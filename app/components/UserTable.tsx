import React from 'react';

interface User {
  idUsuarios: number;
  NombreUsuario: string;
  idNivelUsuario: number;
  nivel: string;
  sucursales?: string[];
  estatus: number;
}

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onAssign: (user: User) => void;
  onDelete: (user: User) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, onEdit, onAssign, onDelete }) => (
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
      {users.map((user) => (
        <tr key={user.idUsuarios}>
          <td>{user.NombreUsuario}</td>
          <td>{user.nivel}</td>
          <td>{user.sucursales}</td>
          <td>
            <span
              className={`status-badge ${user.estatus === 1 ? 'status-active' : 'status-inactive'}`}
            >
              {user.estatus === 1 ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td>
            <div className="action-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn-small btn-update"
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '4px', background: '#2368b3', color: 'white' }}
                onClick={() => onEdit(user)}
                title="Editar usuario"
              >
                ✏️ Editar
              </button>
              <button
                className="btn-small btn-assign"
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '4px', background: '#f5942b', color: 'white' }}
                onClick={() => onAssign(user)}
                title="Asignar sucursal"
              >
                🏢 Sucursal
              </button>
              <button
                className="btn-small btn-delete"
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '4px', background: '#e53e3e', color: 'white' }}
                onClick={() => onDelete(user)}
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
);

export default UserTable;
