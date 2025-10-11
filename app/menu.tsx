'use client';

import Link from "next/link";
import { useEffect, useState } from 'react';

export default function Menu() {
  const [userLevel, setUserLevel] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const level = localStorage.getItem('userLevel');
      setUserLevel(level || '');
    }
  }, []);

  return (
    <div className="menu-container">
      <nav className="menu">
        <ul className="menu-list">
          {userLevel === 'Admin' && (
            <li className="menu-item">
              <Link href="/usuarios" className="menu-link">
                Usuarios
              </Link>
            </li>
          )}
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