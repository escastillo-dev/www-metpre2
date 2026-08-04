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
    <div
      className="modal-overlay items-end sm:items-center"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        className="modal-content w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl"
        style={{ backgroundColor: 'white', padding: '24px 20px', boxShadow: '0 -4px 24px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Editar Usuario</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 20, cursor: 'pointer', color: '#4a5568' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <label>
            Nombre:
            <input
              type="text"
              value={editForm.NombreUsuario}
              onChange={e => setEditForm({ ...editForm, NombreUsuario: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: 16, boxSizing: 'border-box', minHeight: 44 }}
            />
          </label>
          <label>
            Nivel de Usuario:
            <select
              value={editForm.idNivelUsuario?.toString() || ''}
              onChange={e => setEditForm({ ...editForm, idNivelUsuario: parseInt(e.target.value) || null })}
              style={{ width: '100%', padding: '10px 12px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: 16, boxSizing: 'border-box', minHeight: 44 }}
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
              style={{ width: '100%', padding: '10px 12px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: 16, boxSizing: 'border-box', minHeight: 44 }}
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </label>
          <div className="flex flex-col-reverse sm:flex-row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ padding: '12px 20px', backgroundColor: '#e2e8f0', color: '#2d3748', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 15, fontWeight: 600, minHeight: 44 }}>Cancelar</button>
            <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#2368b3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 15, fontWeight: 600, minHeight: 44 }}>Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
