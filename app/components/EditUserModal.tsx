import React from 'react';

interface UserLevel {
  idNivelUsuario: number;
  NivelUsuario: string;
}

interface EditUserModalProps {
  show: boolean;
  user: any;
  editForm: any;
  setEditForm: (form: any) => void;
  userLevels: UserLevel[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ show, user, editForm, setEditForm, userLevels, onClose, onSubmit }) => {
  if (!show || !user) return null;
  
  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className="modal-content" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '400px' }}>
        <h3>Editar Usuario</h3>
        
        <form onSubmit={onSubmit}>
          <label>
            Nombre:
            <input
              type="text"
              value={editForm.NombreUsuario}
              onChange={e => setEditForm({ ...editForm, NombreUsuario: e.target.value })}
              style={{ width: '100%', padding: '8px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>
          <label>
            Nivel de Usuario:
            <select
              value={editForm.idNivelUsuario?.toString() || ''}
              onChange={e => setEditForm({ ...editForm, idNivelUsuario: parseInt(e.target.value) || null })}
              style={{ width: '100%', padding: '8px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">Seleccione un nivel</option>
              {userLevels.map(level => (
                <option key={level.idNivelUsuario} value={level.idNivelUsuario}>{level.NivelUsuario}</option>
              ))}
            </select>
          </label>
          <label>
            Estatus:
            <select
              value={editForm.estatus?.toString() || '1'}
              onChange={e => setEditForm({ ...editForm, estatus: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '8px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#2368b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Cambios</button>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
