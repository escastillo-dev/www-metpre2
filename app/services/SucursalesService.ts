// Servicio de Sucursales
import BaseApiService from './BaseApiService';
import { Sucursal } from './AuthService';

class SucursalesService extends BaseApiService {
  async getSucursalesAsignadas(userId: string) {
    const result = await this.get<any>(`/usuarios/${userId}`);
    
    if (result.success && result.data?.sucursales) {
      return {
        success: true,
        data: result.data.sucursales as Sucursal[],
        message: 'Sucursales obtenidas correctamente'
      };
    }
    
    return {
      success: false,
      data: [] as Sucursal[],
      message: result.message || 'No se pudieron obtener las sucursales'
    };
  }

  getSucursalName(sucursales: Sucursal[], idCentro: string): string {
    const sucursal = sucursales.find(s => s.idCentro === idCentro);
    return sucursal ? sucursal.Sucursal : idCentro;
  }

  isSucursalAsignada(sucursales: Sucursal[], idCentro: string): boolean {
    return sucursales.some(s => s.idCentro === idCentro);
  }

  getSucursalesIds(sucursales: Sucursal[]): string {
    return sucursales.map(s => s.idCentro).join(',');
  }
}

export default new SucursalesService();