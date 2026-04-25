import { useEffect, useRef } from 'react';

export interface PageVisibilityCallbacks {
  onVisible?: (timeHidden: number) => void | Promise<void>;
  onHidden?: () => void;
}

const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_PAUSE_THRESHOLD_MS = 15_000;

export const usePageVisibility = (callbacks: PageVisibilityCallbacks) => {
  const lastHiddenAt = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(!document.hidden);
  const wakingUpRef = useRef<boolean>(false);

  const onVisibleRef = useRef(callbacks.onVisible);
  const onHiddenRef = useRef(callbacks.onHidden);

  useEffect(() => {
    onVisibleRef.current = callbacks.onVisible;
    onHiddenRef.current = callbacks.onHidden;
  }, [callbacks.onVisible, callbacks.onHidden]);

  useEffect(() => {
    const fireVisible = async (timeHidden: number, source: string) => {
      if (wakingUpRef.current) return;
      wakingUpRef.current = true;
      try {
        console.log(`👀 [usePageVisibility] wake fired by ${source}, timeHidden=${timeHidden}ms`);
        if (onVisibleRef.current) {
          await onVisibleRef.current(timeHidden);
        }
      } finally {
        wakingUpRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      const isNowVisible = !document.hidden;
      const wasVisible = isVisibleRef.current;

      if (isNowVisible && !wasVisible) {
        const timeHidden = Date.now() - lastHiddenAt.current;
        isVisibleRef.current = true;
        fireVisible(timeHidden, 'visibilitychange');
      } else if (!isNowVisible && wasVisible) {
        lastHiddenAt.current = Date.now();
        isVisibleRef.current = false;
        if (onHiddenRef.current) onHiddenRef.current();
      }
    };

    const handleFocus = () => {
      // Cubre el caso de cambiar a otra app (Alt+Tab) sin que el navegador
      // marque la pestaña como `hidden`. Solo disparamos si previamente
      // habíamos detectado un `blur` (isVisibleRef = false).
      if (!isVisibleRef.current) {
        const timeHidden = Date.now() - lastHiddenAt.current;
        isVisibleRef.current = true;
        fireVisible(timeHidden, 'focus');
      }
    };

    const handleBlur = () => {
      // Solo registramos el "hidden" si el documento sigue sin foco real.
      // Algunos blurs son por click en devtools o iframes; visibilitychange
      // ya cubre el caso definitivo.
      if (isVisibleRef.current && document.hasFocus() === false) {
        lastHiddenAt.current = Date.now();
        isVisibleRef.current = false;
        if (onHiddenRef.current) onHiddenRef.current();
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const timeHidden = Date.now() - lastHiddenAt.current;
        isVisibleRef.current = true;
        fireVisible(timeHidden, 'pageshow');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pageshow', handlePageShow);

    // Heartbeat: cuando el JS engine se pausa (laptop suspend, tab suspendida
    // por el navegador) `visibilitychange` puede no dispararse al volver. Si
    // detectamos que entre dos ticks pasó mucho más tiempo del esperado,
    // tratamos esa pausa como un evento de "wake".
    let lastTick = Date.now();
    const heartbeatId = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      lastTick = now;
      if (elapsed > HEARTBEAT_PAUSE_THRESHOLD_MS) {
        fireVisible(elapsed, 'heartbeat-pause');
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pageshow', handlePageShow);
      window.clearInterval(heartbeatId);
    };
  }, []);
};
