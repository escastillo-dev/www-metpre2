// Estilos inline reutilizados por los paneles de contenido del dashboard
// (Mermas, Productos Consumidos, Recuperaciones, Próximos a Caducar).
// Centralizarlos aquí evita tener que repetir manualmente el mismo ajuste
// (p. ej. tamaño táctil, contraste) en cada archivo que los define por su cuenta.
import type { CSSProperties } from 'react';

export const cardStyle: CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #dee2e6',
};

export const inputStyle: CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #ced4da',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box', minHeight: 44,
};

export const labelStyle: CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6c757d',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
};

export const btnPrimary: CSSProperties = {
  background: '#2368b3', color: 'white', border: 'none', borderRadius: 8,
  padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44,
};

export const btnSecondary: CSSProperties = {
  background: '#f8f9fa', color: '#2d3748', border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', minHeight: 44,
};

export const btnDanger: CSSProperties = {
  background: '#e53e3e', color: 'white', border: 'none', borderRadius: 8,
  padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44,
};

export const modalOverlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};

export const modalContent: CSSProperties = {
  background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
};
