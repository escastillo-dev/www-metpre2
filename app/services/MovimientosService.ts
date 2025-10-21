// Servicio de Movimientos de Valores
import BaseApiService from './BaseApiService';

export interface Movimiento {
  folio: number;
  sucursal: string;
  fecha: string;
  hora: string;
  movimiento: string;
  incidencia: string;
  tipoSF: string | null;
  importe: number | null;
}

export interface MovimientoAPI {
  Folio: number;
  Sucursales: string;
  Fecha: string;
  Movimiento: string;
  Hora: string;
  Incidencia: string;
  TipoSF: string | null;
  Importe: number | null;
}

export interface MovimientosResponse {
  estatus: number;
  total: number;
  items: MovimientoAPI[];
}

export interface CreateMovimientoData {
  idCentro: string;
  movimiento: string;
  hora: string;
  caja: number;
  cajero: number;
  idIncidencia: string;
  deposito: string;
  comentario: string;
  anfitrion: number;
  idUsuarios: number;
  sf: string;
  tipoSF: string;
  sfMonto: number;
}

class MovimientosService extends BaseApiService {
  async getMovimientos(filters?: {
    fecha?: string;
    folio?: string;
    sucursal?: string;
    limit?: number;
    offset?: number;
  }) {
    let endpoint = '/mmv/valores';
    const params = new URLSearchParams();
    
    if (filters?.fecha) params.append('fecha', filters.fecha);
    if (filters?.folio) params.append('folio', filters.folio);
    if (filters?.sucursal) params.append('sucursal', filters.sucursal);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.get<MovimientosResponse>(endpoint);
  }

  async createMovimiento(data: CreateMovimientoData) {
    // Validar datos antes de enviar
    const validatedData = this.validateMovimientoData(data);
    
    if (!validatedData.isValid) {
      return {
        success: false,
        message: validatedData.errors.join(', ')
      };
    }

    return this.post('/mmv/movimientos', data);
  }

  async getIncidencias() {
    return this.get<Array<{idIncidencia: number, Incidencia: string}>>('/Incidencias');
  }

  private validateMovimientoData(data: CreateMovimientoData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.idCentro) errors.push('La sucursal es requerida');
    if (!data.idIncidencia) errors.push('La incidencia es requerida');
    if (!data.caja || data.caja <= 0) errors.push('El número de caja es requerido');
    if (!data.cajero || data.cajero <= 0) errors.push('El número de cajero es requerido');
    if (!data.anfitrion || data.anfitrion <= 0) errors.push('El número de anfitrión es requerido');
    if (!data.hora) errors.push('La hora es requerida');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  transformMovimiento(movimiento: MovimientoAPI): Movimiento {
    return {
      folio: movimiento.Folio,
      sucursal: movimiento.Sucursales,
      fecha: movimiento.Fecha,
      hora: movimiento.Hora,
      movimiento: movimiento.Movimiento,
      incidencia: movimiento.Incidencia,
      tipoSF: movimiento.TipoSF,
      importe: movimiento.Importe
    };
  }
}

export default new MovimientosService();