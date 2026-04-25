import { useEffect, useRef, useState } from 'react';

// Igual que useState pero persiste el valor en sessionStorage. Sobrevive a
// reloads de la página (clave para nuestro auto-reload tras wake) pero no
// a cerrar la pestaña — comportamiento ideal para "restaurar dónde estaba".
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const isFirstRender = useRef(true);

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // sessionStorage puede fallar en modos de privacidad estrictos.
    }
    return initialValue;
  });

  useEffect(() => {
    // Saltamos el primer render para no sobreescribir con el valor inicial
    // si justo se acaba de leer del storage.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue];
}
