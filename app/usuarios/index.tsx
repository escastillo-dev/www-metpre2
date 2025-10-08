"use client";

import Link from "next/link";

export default function UsuariosIndex() {
  return (
    <div className="usuarios-container">
      <h1>Gestión de Usuarios</h1>
      <ul>
        <li>
          <Link href="/usuarios/consulta">Consultar Usuarios</Link>
        </li>
        <li>
          <Link href="/usuarios/crear">Crear Usuario</Link>
        </li>
        <li>
          <Link href="/usuarios/editar">Editar Usuario</Link>
        </li>
        <li>
          <Link href="/usuarios/eliminar">Eliminar Usuario</Link>
        </li>
      </ul>
    </div>
  );
}