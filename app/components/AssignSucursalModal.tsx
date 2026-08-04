import React from 'react';

interface Sucursal {
  idCentro: string | number;
  Sucursal?: string;    // Agregado campo alternativo
  Sucursales?: string;  // Campo original
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
  selectedSucursal: string | null;
  setSelectedSucursal: (sucursal: string | null) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  fetchSucursales: (zonaId: number) => Promise<void>;
}

const AssignSucursalModal: React.FC<AssignSucursalModalProps> = ({
  show, user, zonas, sucursales, filteredSucursales, selectedZona, setSelectedZona, selectedSucursal, setSelectedSucursal, onClose, onSubmit, fetchSucursales
}) => {
  if (!show || !user) return null;
  
  // Determinar qué sucursales mostrar
  const sucursalesToShow = selectedZona === "Todas las zonas" ? sucursales : filteredSucursales;
  
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
          <h3 style={{ margin: 0, fontSize: 18 }}>Asignar Sucursal</h3>
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
          <div style={{ marginBottom: '20px' }}>
            <p>Usuario: {user.NombreUsuario}</p>
          </div>
          <label>
            Zona:
            <select
              value={selectedZona}
              onChange={async (e) => {
                const zonaNombre = e.target.value;
                
                setSelectedZona(zonaNombre);
                setSelectedSucursal(null); // Reset sucursal selection
                
                let zonaId = 0;
                if (zonaNombre !== "Todas las zonas") {
                  const zonaSeleccionada = zonas.find(z => z.Zona === zonaNombre);
                  if (zonaSeleccionada) {
                    zonaId = zonaSeleccionada.idZona;
                  }
                }
                
                await fetchSucursales(zonaId);
              }}
              style={{ width: '100%', padding: '10px 12px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: 16, boxSizing: 'border-box', minHeight: 44 }}
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
              value={selectedSucursal || ''}
              onChange={(e) => {
                const selectedValue = e.target.value;
                
                if (selectedValue === '' || selectedValue === null || selectedValue === undefined) {
                  setSelectedSucursal(null);
                  return;
                }
                
                // Ya es string, solo verificar que no esté vacío
                setSelectedSucursal(selectedValue);
              }}
              style={{ width: '100%', padding: '10px 12px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: 16, boxSizing: 'border-box', minHeight: 44 }}
            >
              <option value="">Seleccione una sucursal</option>
              {sucursalesToShow.map((sucursal, index) => {
                const optionValue = sucursal.idCentro.toString();
                const optionLabel = sucursal.Sucursal || sucursal.Sucursales || `Sucursal ${sucursal.idCentro}`;
                return (
                  <option key={`${sucursal.idCentro}-${index}`} value={optionValue}>
                    {optionLabel}
                  </option>
                );
              })}
            </select>
            {sucursalesToShow.length === 0 && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                No hay sucursales disponibles para esta zona
              </div>
            )}
          </label>
          <div className="flex flex-col-reverse sm:flex-row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ padding: '12px 20px', backgroundColor: '#e2e8f0', color: '#2d3748', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 15, fontWeight: 600, minHeight: 44 }}>Cancelar</button>
            <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#2368b3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 15, fontWeight: 600, minHeight: 44 }}>Asignar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignSucursalModal;