'use client';

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '32px 24px',
        textAlign: 'center',
        background: '#f5f7fa',
        color: '#2d3748',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#2368b3',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 800,
        }}
      >
        Met
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Sin conexión a internet</h1>
      <p style={{ fontSize: 14, color: '#718096', maxWidth: 360, margin: 0 }}>
        No se pudo cargar esta página porque no hay conexión y no está disponible sin conexión.
        Verifica tu red e intenta de nuevo.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          background: '#2368b3',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
