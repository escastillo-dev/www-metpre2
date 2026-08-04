'use client';
import "../style.css";
import { useState } from "react";

export default function LoginPage() {
  const [nomina, setNomina] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // NEXT_PUBLIC_API_URL en .env.local controla la URL — vacío = usa proxy /backend
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
        setError(responseData?.mensaje || `Error ${response.status}. Verifica tus credenciales.`);
        return;
      }

      if (responseData.estatus !== 1) {
        setError(responseData.mensaje || "Credenciales incorrectas. Inténtalo de nuevo.");
        return;
      }

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
      localStorage.setItem("userCredentials", credentials);
      localStorage.setItem("userName",        userName);
      localStorage.setItem("idNivelUsuario",  idNivelUsuario.toString());
      localStorage.setItem("userLevel",       nivelUsuario);
      localStorage.setItem("authToken",       token);
      localStorage.setItem("userId",          nomina);

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
              id="nomina"
              value={nomina}
              onChange={(e) => setNomina(e.target.value)}
              className="input-field"
              placeholder="Ingresa tu número de nómina"
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
              required
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}