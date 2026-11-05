'use client';

interface Props {
  count: number;
  total?: number;
  loading: boolean;
  error: string;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export default function ProductSearchControls({ count, total, loading, error, hasMore, loadMore, refresh }: Props) {
  const buttonStyle = { padding: '7px 10px', border: '1px solid #cbd5e0', borderRadius: 6, background: '#f7fafc', color: '#235a91', cursor: loading ? 'wait' : 'pointer' };
  return (
    <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, fontSize: 13 }} aria-live="polite">
      {error ? <span role="alert" style={{ color: '#c53030', width: '100%' }}>{error}</span> : (
        <span>{total === undefined ? `${count} productos mostrados` : `Mostrando ${count} de ${total} productos`}</span>
      )}
      {hasMore && <button type="button" style={buttonStyle} disabled={loading} onClick={loadMore}>{loading ? 'Cargando...' : 'Cargar más'}</button>}
      <button type="button" style={buttonStyle} disabled={loading} onClick={refresh}>Actualizar búsqueda</button>
    </div>
  );
}
