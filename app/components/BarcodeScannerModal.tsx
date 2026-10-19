'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
}

// Formatos habituales de código de barras de producto + QR por si acaso
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
];

export default function BarcodeScannerModal({ onScan, onClose, title }: BarcodeScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const regionIdRef = useRef(`barcode-scanner-region-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    let handledResult = false;
    const html5Qrcode = new Html5Qrcode(regionIdRef.current, {
      formatsToSupport: SUPPORTED_FORMATS,
      verbose: false,
    });

    const startPromise = html5Qrcode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (cancelled || handledResult) return;
          handledResult = true;
          onScan(decodedText);
        },
        () => {
          // Se ignoran los fallos de decodificación de cada cuadro (normal mientras se enfoca)
        }
      )
      .catch(() => {
        if (!cancelled) {
          setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
        }
      });

    return () => {
      cancelled = true;
      // Esperamos a que start() termine (resuelto o rechazado) antes de intentar detener,
      // y solo llamamos a stop() si el escáner realmente quedó corriendo o pausado.
      // Esto evita el error "Cannot stop, scanner is not running or paused" que ocurre
      // cuando React (Strict Mode) desmonta el efecto antes de que start() finalice.
      startPromise.finally(() => {
        const state = html5Qrcode.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          html5Qrcode
            .stop()
            .then(() => html5Qrcode.clear())
            .catch(() => {
              // Ignorar errores al detener el escáner
            });
        }
      });
    };
  }, [onScan]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#2368b3', fontSize: 16, fontWeight: 700 }}>
            📷 {title || 'Escanear código de barras'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar escáner"
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 20 }}>
          {error ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#e53e3e', fontSize: 13 }}>{error}</div>
          ) : (
            <div id={regionIdRef.current} style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }} />
          )}
          <p style={{ marginTop: 12, marginBottom: 0, fontSize: 12, color: '#718096', textAlign: 'center' }}>
            Apunta la cámara al código de barras del producto.
          </p>
        </div>
      </div>
    </div>
  );
}
