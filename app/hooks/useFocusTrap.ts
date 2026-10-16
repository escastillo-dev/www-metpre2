import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null
      );

    // Enfocar el primer elemento interactivo al abrir
    const focusable = getFocusable();
    (focusable[0] ?? container).focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
    // Solo reaccionamos a cambios de `active`: ver comentario de onCloseRef arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return containerRef;
}
