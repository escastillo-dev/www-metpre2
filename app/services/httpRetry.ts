// Helper para reintentar peticiones axios que fallan por errores de red intermitentes
// (ECONNRESET, socket hang up, timeouts) provenientes del proxy /backend hacia la API.
// El backend en desarrollo puede tener cortes de conexión momentáneos; en la mayoría
// de los casos un segundo o tercer intento tiene éxito sin problema.
import { AxiosRequestConfig, AxiosResponse } from 'axios';

/** Códigos/mensajes de error considerados "transitorios" y por tanto reintentables. */
function esErrorTransitorio(error: any): boolean {
  const code = error?.code;
  const message: string = error?.message || '';
  return (
    code === 'ECONNRESET' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    message.includes('socket hang up') ||
    message.includes('Network Error') ||
    message.includes('timeout')
  );
}

/**
 * Ejecuta una petición axios.get con reintentos automáticos ante errores de red transitorios.
 * @param requestFn función que retorna la promesa de axios.get(...) a ejecutar/reintentar
 * @param maxRetries número máximo de reintentos adicionales (por defecto 2, es decir hasta 3 intentos totales)
 * @param delayMs tiempo de espera base entre reintentos en milisegundos (crece linealmente)
 */
export async function getConReintentos<T = any>(
  requestFn: () => Promise<AxiosResponse<T>>,
  maxRetries = 2,
  delayMs = 600
): Promise<AxiosResponse<T>> {
  let lastError: any;
  for (let intento = 0; intento <= maxRetries; intento++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      const esUltimoIntento = intento === maxRetries;
      if (!esErrorTransitorio(error) || esUltimoIntento) {
        throw error;
      }
      // Espera antes de reintentar (backoff lineal simple)
      await new Promise(resolve => setTimeout(resolve, delayMs * (intento + 1)));
    }
  }
  throw lastError;
}
