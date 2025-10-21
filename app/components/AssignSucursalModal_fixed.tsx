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
  
  // Debug logs
  console.log('=== MODAL RENDER ===');
  console.log('User:', user);
  console.log('Zonas:', zonas);
  console.log('Sucursales:', sucursales);
  console.log('Filtered Sucursales:', filteredSucursales);
  console.log('Selected Zona:', selectedZona);
  console.log('Selected Sucursal:', selectedSucursal);
  console.log('setSelectedSucursal function:', typeof setSelectedSucursal);
  
  // Determinar qué sucursales mostrar
  const sucursalesToShow = selectedZona === "Todas las zonas" ? sucursales : filteredSucursales;
  console.log('Sucursales to show:', sucursalesToShow);
  
  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className="modal-content" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '400px' }}>
        <h3>Asignar Sucursal</h3>
        
        {/* Debug Panel - Temporal para diagnosticar */}
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginBottom: '15px', fontSize: '12px', border: '1px solid #ccc' }}>
          <strong>DEBUG INFO:</strong><br/>
          Usuario: {user.NombreUsuario} (ID: {user.idUsuarios})<br/>
          Zona seleccionada: {selectedZona}<br/>
          Sucursal seleccionada: "{selectedSucursal}" (tipo: {typeof selectedSucursal})<br/>
          Es null?: {selectedSucursal === null ? 'SÍ' : 'NO'}<br/>
          Es undefined?: {selectedSucursal === undefined ? 'SÍ' : 'NO'}<br/>
          Total zonas: {zonas.length}<br/>
          Total sucursales: {sucursales.length}<br/>
          Sucursales filtradas: {filteredSucursales.length}<br/>
          Sucursales a mostrar: {sucursalesToShow.length}<br/>
          {sucursalesToShow.length > 0 && (
            <>
              Primera sucursal: {JSON.stringify(sucursalesToShow[0])}<br/>
              Campos disponibles: {sucursalesToShow[0] ? Object.keys(sucursalesToShow[0]).join(', ') : 'N/A'}<br/>
              <button 
                type="button" 
                onClick={() => {
                  console.log('=== TEST BUTTON CLICKED ===');
                  const testSucursal = sucursalesToShow[0];
                  console.log('Primera sucursal:', testSucursal);
                  
                  if (testSucursal) {
                    let testValue: string;
                    if (typeof testSucursal.idCentro === 'string') {
                      testValue = testSucursal.idCentro;
                    } else {
                      testValue = testSucursal.idCentro.toString();
                    }
                    
                    console.log('Valor de test a establecer:', testValue);
                    console.log('Tipo del valor de test:', typeof testValue);
                    
                    setSelectedSucursal(testValue);
                    
                    setTimeout(() => {
                      console.log('Verificación después del test - selectedSucursal:', selectedSucursal);
                    }, 100);
                  }
                  console.log('=== FIN TEST BUTTON ===');
                }}
                style={{ fontSize: '10px', padding: '2px 5px', marginTop: '5px' }}
              >
                Test: Seleccionar primera sucursal
              </button>
            </>
          )}
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
                console.log('=== ZONA CHANGE EVENT ===');
                console.log('Zona seleccionada:', zonaNombre);
                console.log('Zonas disponibles:', zonas);
                
                setSelectedZona(zonaNombre);
                setSelectedSucursal(null); // Reset sucursal selection
                
                let zonaId = 0;
                if (zonaNombre !== "Todas las zonas") {
                  const zonaSeleccionada = zonas.find(z => z.Zona === zonaNombre);
                  console.log('Zona encontrada:', zonaSeleccionada);
                  if (zonaSeleccionada) {
                    zonaId = zonaSeleccionada.idZona;
                  }
                }
                console.log('ID de zona a usar:', zonaId);
                console.log('Llamando a fetchSucursales...');
                
                await fetchSucursales(zonaId);
                console.log('=== FIN ZONA CHANGE ===');
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
              value={selectedSucursal || ''}
              onChange={(e) => {
                console.log('=== SUCURSAL CHANGE EVENT ===');
                const selectedValue = e.target.value;
                console.log('Valor seleccionado del select:', selectedValue);
                console.log('Tipo del valor:', typeof selectedValue);
                
                if (selectedValue === '' || selectedValue === null || selectedValue === undefined) {
                  console.log('Valor vacío, estableciendo null');
                  setSelectedSucursal(null);
                  return;
                }
                
                // Ya es string, solo verificar que no esté vacío
                console.log('Llamando a setSelectedSucursal con:', selectedValue);
                setSelectedSucursal(selectedValue);
                
                // Verificar inmediatamente después
                setTimeout(() => {
                  console.log('Verificación post-set - selectedSucursal debería ser:', selectedValue);
                }, 50);
                
                console.log('=== FIN SUCURSAL CHANGE ===');
              }}
              style={{ width: '100%', padding: '8px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc' }}
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
            
            <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
              Valor actual del estado: "{selectedSucursal}" (tipo: {typeof selectedSucursal})
              {selectedSucursal && <span style={{color: 'green'}}> ✅ Seleccionado</span>}
            </div>
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