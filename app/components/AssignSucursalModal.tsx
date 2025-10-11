import React from 'react';

interface Sucursal {
  idCentro: string | number;
  Sucursales: string;
  idZona?: number;
}

interface Zona {
  idZona: number;
  Zona: string;
}

interface User {
  idUsuarios: number;
  NombreUsuario: string;
  idNivelUsuario: number;
  nivel: string;
  estatus: number;
  sucursales?: string[];
}

interface AssignSucursalModalProps {
  show: boolean;
  user: User | null;
  zonas: Zona[];
  sucursales: Sucursal[];
  filteredSucursales: Sucursal[];
  selectedZona: string;
  setSelectedZona: (zona: string) => void;
  selectedSucursal: number | null;
  setSelectedSucursal: (sucursal: number | null) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  fetchSucursales: (zonaId: number) => Promise<void>;
}

const AssignSucursalModal: React.FC<AssignSucursalModalProps> = ({
  show, user, zonas, sucursales, filteredSucursales, selectedZona, setSelectedZona, selectedSucursal, setSelectedSucursal, onClose, onSubmit, fetchSucursales
}) => {
  if (!show || !user) return null;
  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className="modal-content" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '400px' }}>
        <h3>Asignar Sucursal</h3>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <p>Usuario: {user.NombreUsuario}</p>
          </div>
          <label>
            Zona:
            <select
              value={selectedZona}
              onChange={async (e) => {
                const zonaNombre = e.target.value;
                console.log('Zona seleccionada:', zonaNombre);
                setSelectedZona(zonaNombre);
                setSelectedSucursal(null);
                
                let zonaId = 0;
                if (zonaNombre !== "Todas las zonas") {
                  const zonaSeleccionada = zonas.find(z => z.Zona === zonaNombre);
                  console.log('Zona encontrada:', zonaSeleccionada);
                  if (zonaSeleccionada) {
                    zonaId = zonaSeleccionada.idZona;
                  }
                }
                console.log('ID de zona a usar:', zonaId);
                
                await fetchSucursales(zonaId);
              }}
              style={{ width: '100%', padding: '8px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="Todas las zonas">Todas las zonas</option>
              {zonas.filter(zona => zona.idZona !== 0).map((zona) => (
                <option key={zona.idZona} value={zona.Zona}>{zona.Zona}</option>
              ))}
            </select>
          </label>
          <label>
            Sucursal:
            <select
              value={selectedSucursal?.toString() || ''}
              onChange={e => setSelectedSucursal(e.target.value ? parseInt(e.target.value) : null)}
              style={{ width: '100%', padding: '8px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc' }}
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
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#2368b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Asignar</button>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignSucursalModal;
