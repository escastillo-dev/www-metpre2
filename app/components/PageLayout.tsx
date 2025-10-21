'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import '../dashboard/dashboard.css';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function PageLayout({ children, title }: PageLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userLevel, setUserLevel] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Usuario';
    const level = localStorage.getItem('userLevel') || 'Usuario';
    setUserName(name);
    setUserLevel(level);
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <div className="dashboard-container">
      <div className={`sidebar ${isMenuCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button 
            className="collapse-btn" 
            onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
          >
            <span id="toggleIcon">◀</span>
          </button>
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">Met</div>
              {!isMenuCollapsed && <h2 className="company-name">Pre</h2>}
            </div>
            
            {!isMenuCollapsed && (
              <div className="user-info">
                <div className="user-avatar">
                  {userName ? userName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-details">
                  <h4 className="user-name">{userName}</h4>
                  <h4 className="user-role">{userLevel}</h4>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div 
              className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={() => router.push('/dashboard')}
            >
              <span className="nav-icon">🏠</span>
              {!isMenuCollapsed && <span className="nav-text">Dashboard</span>}
            </div>
            
            {userLevel === 'Admin' && (
              <div 
                className={`nav-item ${pathname === '/dashboard' && typeof window !== 'undefined' && window.location.search.includes('panel=users') ? 'active' : ''}`}
                onClick={() => router.push('/dashboard?panel=users')}
              >
                <span className="nav-icon">👥</span>
                {!isMenuCollapsed && <span className="nav-text">Usuarios</span>}
              </div>
            )}
            
            <div 
              className={`nav-item ${isActive('/valores') ? 'active' : ''}`}
              onClick={() => router.push('/valores')}
            >
              <span className="nav-icon">💰</span>
              {!isMenuCollapsed && <span className="nav-text">Manejo de Valores</span>}
            </div>

            <div 
              className={`nav-item ${isActive('/apertura-cierres') ? 'active' : ''}`}
              onClick={() => router.push('/apertura-cierres')}
            >
              <span className="nav-icon">🌅</span>
              {!isMenuCollapsed && <span className="nav-text">Apertura y cierres</span>}
            </div>

            <div
              className="nav-item"
              onClick={() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userCredentials');
                localStorage.removeItem('userId');
                localStorage.removeItem('userName');
                localStorage.removeItem('userLevel');
                router.replace('/login');
              }}
            >
              <span className="nav-icon">🚪</span>
              {!isMenuCollapsed && <span className="nav-text">Cerrar Sesión</span>}
            </div>
          </div>
        </nav>
      </div>

      <div className="main-content">
        <div className="top-bar">
          <h1 className="page-title">{title}</h1>
        </div>

        <div className="content-area">
          <div className="content-panel active">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
