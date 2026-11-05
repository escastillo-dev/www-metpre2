'use client';
import "../style.css";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { clearPersistentCache, invalidateCache } from '../services/apiCache';

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 60_000; // 1 minuto
const STORAGE_INTENTOS = 'loginIntentosFallidos';
const STORAGE_BLOQUEO = 'loginBloqueadoHasta';

function LoginForm() {
  const searchParams = useSearchParams();
  const [nomina, setNomina] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setError('Tu sesión ha expirado o ya no es válida. Inicia sesión nuevamente.');
    }
  }, [searchParams]);

  // Cuenta regresiva del bloqueo temporal por intentos fallidos
  useEffect(() => {
    const actualizarBloqueo = () => {
      const hasta = parseInt(localStorage.getItem(STORAGE_BLOQUEO) || '0', 10);
      const restante = Math.max(0, Math.ceil((hasta - Date.now()) / 1000));
      setSegundosRestantes(restante);
      if (restante === 0 && hasta !== 0) {
        localStorage.removeItem(STORAGE_BLOQUEO);
        localStorage.removeItem(STORAGE_INTENTOS);
      }
    };
    actualizarBloqueo();
    const interval = setInterval(actualizarBloqueo, 1000);
    return () => clearInterval(interval);
  }, []);

  // NEXT_PUBLIC_API_URL en .env.local controla la URL — vacío = usa proxy /backend
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

  const registrarIntentoFallido = () => {
    const intentos = parseInt(localStorage.getItem(STORAGE_INTENTOS) || '0', 10) + 1;
    if (intentos >= MAX_INTENTOS) {
      const hasta = Date.now() + BLOQUEO_MS;
      localStorage.setItem(STORAGE_BLOQUEO, hasta.toString());
      localStorage.setItem(STORAGE_INTENTOS, '0');
      setSegundosRestantes(Math.ceil(BLOQUEO_MS / 1000));
    } else {
      localStorage.setItem(STORAGE_INTENTOS, intentos.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (segundosRestantes > 0) {
      setError(`Demasiados intentos fallidos. Intenta de nuevo en ${segundosRestantes}s.`);
      return;
    }

    if (!nomina || isNaN(parseInt(nomina))) {
      setError("El número de nómina debe ser un número válido.");
      return;
    }
    if (!password || password.trim() === "") {
      setError("La contraseña no puede estar vacía.");
      return;
    }

    setLoading(true);
    try {
      // 1. Autenticar usuario
      const response = await fetch(`${API_URL}/usuarios/autenticar`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idUsuarios: parseInt(nomina), pwd: password }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        registrarIntentoFallido();
        setError(responseData?.mensaje || `Error ${response.status}. Verifica tus credenciales.`);
        return;
      }

      if (responseData.estatus !== 1) {
        registrarIntentoFallido();
        setError(responseData.mensaje || "Credenciales incorrectas. Inténtalo de nuevo.");
        return;
      }

      // Login exitoso: limpiar contador de intentos fallidos
      localStorage.removeItem(STORAGE_INTENTOS);
      localStorage.removeItem(STORAGE_BLOQUEO);

      // 2. Login exitoso — obtener nivel de usuario
      const credentials = btoa(`${nomina}:${password}`);
      const userName      = responseData.usuario.nombre;
      const idNivelUsuario = responseData.usuario.idNivelUsuario;
      const token         = responseData.token;

      const nivelResponse = await fetch(`${API_URL}/niveles-usuario`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });

      const nivelData = await nivelResponse.json();
      const nivelInfo = nivelData.niveles?.find(
        (n: { idNivelUsuario: number; NivelUsuario: string }) =>
          n.idNivelUsuario === idNivelUsuario
      );
      const nivelUsuario = nivelInfo ? nivelInfo.NivelUsuario : 'Usuario';

      // 3. Guardar sesión
      if (localStorage.getItem('userId') !== nomina) await clearPersistentCache();
      localStorage.setItem("userCredentials", credentials);
      localStorage.setItem("userName",        userName);
      localStorage.setItem("idNivelUsuario",  idNivelUsuario.toString());
      localStorage.setItem("userLevel",       nivelUsuario);
      localStorage.setItem("authToken",       token);
      localStorage.setItem("userId",          nomina);
      await invalidateCache(`sucursales_${nomina}`);
      await invalidateCache('niveles_usuario');

      window.location.href = "/dashboard";

    } catch (err: any) {
      if (!navigator.onLine) {
        setError("Sin conexión a internet. Verifica tu red.");
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("No se pudo conectar con el servidor. Verifica que el servicio esté disponible.");
      } else {
        setError(err?.message || "Ocurrió un error inesperado. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="background-animation">
      <div className="floating-shape shape-1"></div>
      <div className="floating-shape shape-2"></div>
      <div className="floating-shape shape-3"></div>

      <div className="login-container">
        <div className="login-header">
          <div className="logo">Met</div>
          <h1 className="login-title">Bienvenido</h1>
          <p className="login-subtitle">Inicia sesión en tu cuenta</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <div className="input-group">
            <label className="input-label" htmlFor="nomina">Número de Nómina</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              id="nomina"
              value={nomina}
              onChange={(e) => setNomina(e.target.value)}
              className="input-field"
              placeholder="Ingresa tu número de nómina"
              disabled={segundosRestantes > 0}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Ingresa tu contraseña"
              disabled={segundosRestantes > 0}
              required
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading || segundosRestantes > 0}>
            {segundosRestantes > 0
              ? `Bloqueado (${segundosRestantes}s)`
              : loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
