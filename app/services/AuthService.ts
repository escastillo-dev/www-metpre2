// Servicio de Autenticación
import BaseApiService from './BaseApiService';

export interface UserData {
  idUsuarios: number;
  NombreUsuario: string;
  idNivelUsuario: number;
  estatus: number;
  FechaAlta?: string;
}

export interface Sucursal {
  idCentro: string;
  Sucursal: string;
}

export interface AuthResponse {
  estatus: number;
  mensaje: string;
  usuario: UserData;
  sucursales?: Sucursal[];
}

class AuthService extends BaseApiService {
  async getCurrentUser(userId: string) {
    return this.get<AuthResponse>(`/usuarios/${userId}`);
  }

  async validateCredentials() {
    const userCredentials = localStorage.getItem('userCredentials');
    const userId = localStorage.getItem('userId');
    
    if (!userCredentials || !userId) {
      return {
        success: false,
        message: 'No se encontraron credenciales de usuario'
      };
    }

    return this.getCurrentUser(userId);
  }

  logout() {
    localStorage.removeItem('userCredentials');
    localStorage.removeItem('userId');
    localStorage.removeItem('userLevel');
    localStorage.removeItem('userName');
  }

  isAuthenticated(): boolean {
    const userCredentials = localStorage.getItem('userCredentials');
    const userId = localStorage.getItem('userId');
    return !!(userCredentials && userId);
  }

  getUserInfo() {
    return {
      userId: localStorage.getItem('userId'),
      userName: localStorage.getItem('userName'),
      userLevel: localStorage.getItem('userLevel'),
      credentials: localStorage.getItem('userCredentials')
    };
  }
}

export default new AuthService();