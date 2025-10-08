import Link from "next/link";

export default function Menu() {
  return (
    <div className="menu-container">
      <nav className="menu">
        <ul className="menu-list">
          <li className="menu-item">
            <Link href="/usuarios" className="menu-link">
              Usuarios
            </Link>
          </li>
          <li className="menu-item">
            <Link href="/manejo-valores" className="menu-link">
              Manejo de Valores
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}