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
              <Link href="/dashboard?panel=users" className="menu-link">
                Usuarios
              </Link>
            </li>
          )}
          <li className="menu-item">
            <Link href="/dashboard?panel=valores" className="menu-link">
              Manejo de Valores
            </Link>
          </li>
          <li className="menu-item">
            <Link href="/dashboard?panel=apertura-cierres" className="menu-link">
              Apertura y Cierres
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}