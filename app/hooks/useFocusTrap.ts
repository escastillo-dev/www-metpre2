import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Compartido por los modales: cerrar uno no desbloquea el fondo de otro.
let activeModals = 0;
let restorePageScroll: (() => void) | undefined;

function lockPageScroll() {
  if (activeModals++ === 0) {
    const body = document.body;
    const root = document.documentElement;
    const bodyOverflow = body.style.overflow;
    const rootOverflow = root.style.overflow;
    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    restorePageScroll = () => {
      body.style.overflow = bodyOverflow;
      root.style.overflow = rootOverflow;
    };
  }
  return () => {
    if (--activeModals === 0) {
      restorePageScroll?.();
      restorePageScroll = undefined;
    }
  };
}

/**
 * Hook de accesibilidad para modales: al abrirse enfoca el primer elemento
 * interactivo, atrapa la navegación por Tab dentro del modal, y cierra con Escape.
 *
 * @param active si el modal está actualmente visible
 * @param onClose callback invocado al presionar Escape
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, onClose?: () => void) {
  const containerRef = useRef<T | null>(null);

  // Guardamos onClose en un ref para que cambios en su identidad (muy común:
  // suele pasarse como arrow function inline y se recrea en cada render del
  // padre, p. ej. al escribir en un input) NO vuelvan a ejecutar el efecto de
  // abajo. Si el efecto dependiera de onClose directamente, cada tecla
  // presionada en un campo del modal re-enfocaría el primer elemento
  // interactivo y el teclado virtual del celular se cerraría.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const unlockPageScroll = lockPageScroll();
    const originalTabIndex = container.getAttribute('tabindex');
    if (originalTabIndex === null) container.tabIndex = -1;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null
      );

    // No abrir teclados/selectores ni desplazar la página al mostrar el diálogo.
    container.focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && (document.activeElement === first || document.activeElement === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === container)) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && container.contains(focused)) focused.blur();
      if (originalTabIndex === null) container.removeAttribute('tabindex');
      unlockPageScroll();
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [active]);

  return containerRef;
}
