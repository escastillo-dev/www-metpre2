"use client";

export default function EditarUsuario() {
  const editUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const id = event.currentTarget.userId.value;
    const name = event.currentTarget.userName.value;
    const role = event.currentTarget.userRole.value;

    try {
      const response = await fetch(`/usuarios/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          NombreUsuario: name,
          idNivelUsuario: role,
        }),
      });

      if (response.ok) {
        alert("Usuario actualizado exitosamente");
      } else {
        console.error("Error updating user:", await response.text());
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }

    event.currentTarget.reset();
  };

  return (
    <div className="editar-container">
      <h1>Editar Usuario</h1>
      <form onSubmit={editUser}>
        <div className="form-group">
          <label className="form-label">ID del Usuario</label>
          <input type="number" className="form-input" name="userId" required />
        </div>
        <div className="form-group">
          <label className="form-label">Nombre Completo</label>
          <input type="text" className="form-input" name="userName" required />
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
          Editar Usuario
        </button>
      </form>
    </div>
  );
}