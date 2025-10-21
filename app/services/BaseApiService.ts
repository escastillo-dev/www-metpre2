// Service Layer - Centralización de llamadas API
import axios, { AxiosResponse, AxiosError } from 'axios';

// Configuración base de la API
const API_BASE_URL = 'http://127.0.0.1:8000';

// Interfaces compartidas
export interface ApiResponse<T = any> {
  estatus: number;
  mensaje?: string;
  data?: T;
  total?: number;
  items?: T[];
}

export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

// Clase base para servicios
class BaseApiService {
  protected baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  protected getAuthHeaders() {
    const userCredentials = localStorage.getItem('userCredentials');
    return {
      'Authorization': `Basic ${userCredentials}`,
      'Content-Type': 'application/json'
    };
  }

  protected async handleRequest<T>(
    requestPromise: Promise<AxiosResponse<T>>
  ): Promise<{ success: boolean; data?: T; message: string; error?: ApiError }> {
    try {
      const response = await requestPromise;
      
      // Verificar si la respuesta tiene el formato esperado
      if (response.data && typeof response.data === 'object' && 'estatus' in response.data) {
        const apiResponse = response.data as any;
        return {
          success: apiResponse.estatus === 1,
          data: response.data,
          message: apiResponse.mensaje || 'Operación exitosa'
        };
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Operación exitosa'
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const apiError: ApiError = {
        message: 'Error en la operación',
        status: axiosError.response?.status,
        details: axiosError.response?.data
      };

      // Manejo específico de errores
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data as any;
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            apiError.message = errorData.detail.map((err: any) => 
              `${err.loc?.join('.')}: ${err.msg}`
            ).join(', ');
          } else if (typeof errorData.detail === 'string') {
            apiError.message = errorData.detail;
          }
        } else if (errorData.mensaje) {
          apiError.message = errorData.mensaje;
        }
      }

      return {
        success: false,
        message: apiError.message,
        error: apiError
      };
    }
  }

  protected async get<T>(endpoint: string, params?: any): Promise<{ success: boolean; data?: T; message: string; error?: ApiError }> {
    const requestPromise = axios.get<T>(`${this.baseURL}${endpoint}`, {
      headers: this.getAuthHeaders(),
      params
    });
    return this.handleRequest(requestPromise);
  }

  protected async post<T>(endpoint: string, data?: any): Promise<{ success: boolean; data?: T; message: string; error?: ApiError }> {
    const requestPromise = axios.post<T>(`${this.baseURL}${endpoint}`, data, {
      headers: this.getAuthHeaders()
    });
    return this.handleRequest(requestPromise);
  }

  protected async put<T>(endpoint: string, data?: any): Promise<{ success: boolean; data?: T; message: string; error?: ApiError }> {
    const requestPromise = axios.put<T>(`${this.baseURL}${endpoint}`, data, {
      headers: this.getAuthHeaders()
    });
    return this.handleRequest(requestPromise);
  }

  protected async delete<T>(endpoint: string): Promise<{ success: boolean; data?: T; message: string; error?: ApiError }> {
    const requestPromise = axios.delete<T>(`${this.baseURL}${endpoint}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleRequest(requestPromise);
  }
}

export default BaseApiService;