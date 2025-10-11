"use client";
import "../style.css";
import { useState } from "react";
import axios from "axios";

export default function LoginPage() {
  const [nomina, setNomina] = useState(""); // Número de nómina
  const [password, setPassword] = useState(""); // Contraseña
  const [error, setError] = useState(""); // Mensaje de error

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
        "http://127.0.0.1:8000/usuarios/autenticar",
        {
          idUsuarios: parseInt(nomina), // Convertimos la nómina a número
          pwd: password, // Contraseña
        },
        {
          headers: {
            "Content-Type": "application/json", // Encabezado para JSON
          },
        }
      );

      console.log("Respuesta de la API:", response.data);

      // Manejo de respuesta exitosa
      if (response.data.estatus === 1) {
        // Crear credenciales en formato Base64 para autenticación básica
        const credentials = btoa(`${nomina}:${password}`);
        console.log('Credenciales generadas');
        
        const userName = response.data.usuario.nombre;
        const idNivelUsuario = response.data.usuario.idNivelUsuario;
        const nivelUsuario = idNivelUsuario === 1 ? 'Admin' : 'User'; // Asumiendo que 1 es Admin
        const token = response.data.token;
        
        // Guardar la información del usuario
        localStorage.setItem("userCredentials", credentials);
        localStorage.setItem("userName", userName);
        localStorage.setItem("idNivelUsuario", idNivelUsuario.toString());
        localStorage.setItem("userLevel", nivelUsuario); // Guardamos el nivel como texto
        localStorage.setItem("authToken", token);
        localStorage.setItem("userId", nomina); // Guardamos el ID del usuario que servirá para otras operaciones
        console.log("Login exitoso:", response.data);
        alert("Login exitoso");
        window.location.href = "/dashboard"; // Redirigir al dashboard
      } else {
        // Manejo de respuesta con credenciales inválidas
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

          <div className="login-options">
            <label className="remember-me">
              <input type="checkbox" className="checkbox" />
              <span>Recordarme</span>
            </label>
            
          </div>

          <button type="submit" className="login-button">
            Iniciar Sesión
          </button>
        </form>

       
      </div>
    </div>
  );
}