'use client';
import "../style.css";
import { useState } from "react";
import axios from "axios";

export default function LoginPage() {
  const [nomina, setNomina] = useState(""); // Número de nómina
  const [password, setPassword] = useState(""); // Contraseña
  const [error, setError] = useState(""); // Mensaje de error

  // URL de la API - usar variable de entorno o fallback a localhost
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Limpiar errores previos

    // Validaciones de entrada
    if (!nomina || isNaN(parseInt(nomina))) {
      setError("El número de nómina debe ser un número válido.");
      return;
    }

    if (!password || password.trim() === "") {
      setError("La contraseña no puede estar vacía.");
      return;
    }

    try {
      // Enviar solicitud a la API
      const response = await axios.post(
        `${API_URL}/usuarios/autenticar`,
        {
          idUsuarios: parseInt(nomina),
          pwd: password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Respuesta de la API:", response.data);

      if (response.data.estatus === 1) {
        try {
          // Crear credenciales en formato Base64 para autenticación básica
          const credentials = btoa(`${nomina}:${password}`);
          console.log('Credenciales generadas');
          
          const userName = response.data.usuario.nombre;
          const idNivelUsuario = response.data.usuario.idNivelUsuario;
          const token = response.data.token;
          
          // Obtener el nombre del nivel desde la API de niveles
          const nivelResponse = await axios.get(`${API_URL}/niveles-usuario`, {
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Respuesta de niveles:', nivelResponse.data);
          
          // Encontrar el nivel correspondiente al idNivelUsuario
          const nivelInfo = nivelResponse.data.niveles.find(
            (nivel: { idNivelUsuario: number, NivelUsuario: string }) => 
            nivel.idNivelUsuario === idNivelUsuario
          );
          
          const nivelUsuario = nivelInfo ? nivelInfo.NivelUsuario : 'Usuario';
          console.log('Nivel de usuario encontrado:', nivelUsuario);
          
          // Guardar la información del usuario
          localStorage.setItem("userCredentials", credentials);
          localStorage.setItem("userName", userName);
          localStorage.setItem("idNivelUsuario", idNivelUsuario.toString());
          localStorage.setItem("userLevel", nivelUsuario);
          localStorage.setItem("authToken", token);
          localStorage.setItem("userId", nomina);

          console.log("Login exitoso y nivel de usuario guardado:", nivelUsuario);
          alert("Login exitoso");
          window.location.href = "/dashboard";
        } catch (error) {
          console.error("Error al obtener el nivel del usuario:", error);
          setError("Error al obtener el nivel del usuario. Por favor, intente de nuevo.");
        }
      } else {
        setError(response.data.mensaje || "Credenciales incorrectas. Inténtalo de nuevo.");
      }
    } catch (err: any) {
      console.error("Error en el login:", err);
      console.log("Detalles del error:", err.response?.data || err.message || err);
      setError("Ocurrió un error de red. Inténtalo de nuevo.");
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

          <button type="submit" className="submit-button">
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}