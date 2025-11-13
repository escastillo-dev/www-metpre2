"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";

// URL de la API - usar variable de entorno o fallback a localhost
const API_URL = "https://met-hmaqcjdea9fsh8ak.mexicocentral-01.azurewebsites.net";

interface Usuario {
  idUsuarios: number;
  NombreUsuario: string;
  email: string;
  idNivelUsuario: string;
  estatus: number;
}

export default function ConsultarUsuarios() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [error, setError] = useState<string>("");
  const userModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await axios.get(`${API_URL}/usuarios`, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        setUsers(response.data);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError("Ocurrió un error al obtener los usuarios. Inténtalo de nuevo más tarde.");
      }
    }
    fetchUsers();
  }, []);

  const openUserModal = () => {
    if (userModalRef.current) {
      userModalRef.current.style.display = "block";
    }
  };

  const closeUserModal = () => {
    if (userModalRef.current) {
      userModalRef.current.style.display = "none";
    }
  };

  const addUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newUser = {
      NombreUsuario: formData.get("userName") as string,
      email: formData.get("userEmail") as string,
      idNivelUsuario: formData.get("userRole") as string,
    };

    try {
      const response = await axios.post(`${API_URL}/usuarios`, newUser, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      closeUserModal();
      setUsers((prevUsers) => [...prevUsers, response.data]);
    } catch (err) {
      console.error("Error adding user:", err);
      setError("Ocurrió un error al agregar el usuario. Inténtalo de nuevo más tarde.");
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/usuarios/${id}`);
      setUsers((prevUsers) => prevUsers.filter((user) => user.idUsuarios !== id));
    } catch (err) {
      console.error("Error deleting user:", err);
      setError("Ocurrió un error al eliminar el usuario. Inténtalo de nuevo más tarde.");
    }
  };

  return (
    <section id="users" className="content-section">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h3>Gestión de Usuarios</h3>
        <button
          className="btn btn-primary"
          onClick={openUserModal}
        >
          👤 Agregar Usuario
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.idUsuarios}>
              <td>{user.NombreUsuario}</td>
              <td>{user.email}</td>
              <td>{user.idNivelUsuario}</td>
              <td
                style={{
                  color: user.estatus === 1 ? "#48bb78" : "#f56565",
                }}
              >
                {user.estatus === 1 ? "Activo" : "Inactivo"}
              </td>
              <td>
                <button className="btn btn-secondary" style={{ marginRight: "0.5rem" }}>
                  Editar
                </button>
                <button className="btn btn-danger" onClick={() => deleteUser(user.idUsuarios)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div id="userModal" ref={userModalRef} className="modal" style={{ display: "none" }}>
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">Agregar Usuario</h3>
            <button className="close-btn" onClick={closeUserModal}>&times;</button>
          </div>
          <form onSubmit={addUser}>
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input type="text" className="form-input" name="userName" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" name="userEmail" required />
            </div>
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select className="form-select" name="userRole" required>
                <option value="">Seleccionar rol</option>
                <option value="admin">Administrador</option>
                <option value="cajero">Cajero</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Crear Usuario
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
