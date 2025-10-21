// Servicio de Aperturas y Cierres
import BaseApiService from './BaseApiService';

export interface EquipmentEvaluation {
  status: string;
  comment: string;
}

export interface AperturaRecord {
  id: number;
  sucursal: string;
  tipo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  anfitrion: string;
  plantilla: string;
  candados: number;
  equipments: { [key: string]: EquipmentEvaluation };
  comentarios: string;
  calificacion: number;
  estado: string;
}

export interface CreateAperturaData {
  idCentro: string;
  HoraI: string;
  HoraF: string;
  Anfitrion: number;
  Plantilla: number;
  Candados: number;
  idUsuario: number;
  TipoRecorrido: string;
  detalles: Array<{
    idEquipo: number;
    Calificacion: string;
    Comentario: string;
  }>;
}

class AperturaCierresService extends BaseApiService {
  async getRegistros(filters?: {
    sucursales?: string;
    limit?: number;
    pagina?: number;
  }) {
    let endpoint = '/mmv/apertura-cierres';
    const params = new URLSearchParams();
    
    if (filters?.sucursales) params.append('sucursales', filters.sucursales);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.pagina) params.append('pagina', filters.pagina.toString());
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.get<any>(endpoint);
  }

  async createRegistro(data: CreateAperturaData) {
    // Validar datos antes de enviar
    const validatedData = this.validateAperturaData(data);
    
    if (!validatedData.isValid) {
      return {
        success: false,
        message: validatedData.errors.join(', ')
      };
    }

    return this.post('/mmv/apertura-cierres', data);
  }

  private validateAperturaData(data: CreateAperturaData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.idCentro) errors.push('La sucursal es requerida');
    if (!data.HoraI) errors.push('La hora de inicio es requerida');
    if (!data.HoraF) errors.push('La hora de fin es requerida');
    if (!data.Anfitrion || data.Anfitrion <= 0) errors.push('El anfitrión es requerido');
    if (!data.Plantilla || data.Plantilla <= 0) errors.push('La plantilla es requerida');
    if (data.Candados < 0) errors.push('El número de candados no puede ser negativo');
    if (!data.TipoRecorrido) errors.push('El tipo de recorrido es requerido');
    if (!data.detalles || data.detalles.length === 0) errors.push('Se requiere la evaluación de equipos');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  transformRecord(registro: any): AperturaRecord {
    return {
      id: registro.idApCi,
      sucursal: registro.idCentro,
      tipo: registro.tipoRecorrido,
      fecha: registro.fecha,
      horaInicio: registro.horaInicio,
      horaFin: registro.horaFin,
      anfitrion: registro.anfitrion.toString(),
      plantilla: registro.plantilla.toString(),
      candados: registro.candados,
      equipments: registro.detalles?.reduce((acc: any, detalle: any) => {
        acc[detalle.idEquipo] = {
          status: detalle.calificacion,
          comment: detalle.comentario || ''
        };
        return acc;
      }, {}) || {},
      calificacion: registro.calificacionPromedio || 0,
      estado: registro.estado,
      comentarios: ''
    };
  }

  calculateStats(records: AperturaRecord[]) {
    const hoy = new Date().toISOString().split('T')[0];
    const registrosHoy = records.filter(r => r.fecha === hoy);
    
    const aperturasHoy = registrosHoy.filter(r => r.tipo === 'A').length;
    const cierresHoy = registrosHoy.filter(r => r.tipo === 'C').length;
    const registrosConProblemas = records.filter(r => r.estado !== 'completado').length;
    
    const promedioGeneral = records.length > 0 
      ? Math.round(records.reduce((acc, r) => acc + r.calificacion, 0) / records.length * 10) / 10
      : 0;
    
    return {
      aperturasHoy,
      cierresHoy,
      registrosConProblemas,
      promedioGeneral,
      totalRegistros: records.length
    };
  }

  getFilteredRecords(records: AperturaRecord[], filter: string) {
    const hoy = new Date().toISOString().split('T')[0];
    
    switch (filter) {
      case 'apertura':
        return records.filter(r => r.tipo === 'A');
      case 'cierre':
        return records.filter(r => r.tipo === 'C');
      case 'hoy':
        return records.filter(r => r.fecha === hoy);
      case 'problemas':
        return records.filter(r => r.estado !== 'completado');
      default:
        return records;
    }
  }
}

export default new AperturaCierresService();