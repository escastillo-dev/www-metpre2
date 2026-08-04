import React, { useEffect, useRef, useState } from 'react';

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

const StatusBadge: React.FC<{ estatus: number }> = ({ estatus }) => (
  <span className={`status-badge ${estatus === 1 ? 'status-active' : 'status-inactive'}`}>
    {estatus === 1 ? 'Activo' : 'Inactivo'}
  </span>
);

const emptyState = (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '40px 16px', color: '#a0aec0', fontSize: 14, fontWeight: 500, gap: 8,
  }}>
    <span style={{ fontSize: 32 }}>👤</span>
    No hay usuarios para mostrar
  </div>
);

/** Menú contextual (kebab) con las acciones de una fila/tarjeta, usado en móvil para no saturar de botones */
const ActionsMenu: React.FC<{ user: User; onEdit: (u: User) => void; onAssign: (u: User) => void; onDelete: (u: User) => void }> = ({ user, onEdit, onAssign, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Más acciones"
        style={{
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 20, color: '#4a5568',
        }}
      >
        ⋮
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', zIndex: 20,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 170, overflow: 'hidden',
        }}>
          <button
            onClick={() => { onEdit(user); setOpen(false); }}
            style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#2d3748' }}
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => { onAssign(user); setOpen(false); }}
            style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#2d3748', borderTop: '1px solid #f0f0f0' }}
          >
            🏢 Asignar sucursal
          </button>
          <button
            onClick={() => { onDelete(user); setOpen(false); }}
            style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#e53e3e', borderTop: '1px solid #f0f0f0' }}
          >
            🗑️ Eliminar
          </button>
        </div>
      )}
    </div>
  );
};

const UserTable: React.FC<UserTableProps> = ({ users, onEdit, onAssign, onDelete }) => {
  if (users.length === 0) {
    return <div className="bg-white rounded-xl border border-gray-200">{emptyState}</div>;
  }

  return (
    <>
      {/* --- Vista de escritorio: tabla completa (oculta en móvil) --- */}
      <div className="hidden md:block">
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
                <td><StatusBadge estatus={user.estatus} /></td>
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
      </div>

      {/* --- Vista móvil: tarjetas apiladas con menú de acciones (ocultas en escritorio) --- */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.map((user) => (
          <div
            key={user.idUsuarios}
            style={{
              background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
              padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.NombreUsuario}
                </div>
                <div style={{ fontSize: 12.5, color: '#718096', marginTop: 2 }}>{user.nivel}</div>
              </div>
              <ActionsMenu user={user} onEdit={onEdit} onAssign={onAssign} onDelete={onDelete} />
            </div>

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Sucursal</div>
                <div style={{ color: '#2d3748', fontWeight: 500, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.sucursales || '-'}
                </div>
              </div>
              <StatusBadge estatus={user.estatus} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default UserTable;

