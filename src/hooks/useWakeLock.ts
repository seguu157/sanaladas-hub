import { useEffect, useRef } from 'react';

// Wake Lock API: pide al sistema que no apague la pantalla mientras la app
// está activa. Crítico para la tablet de cocina que está siempre encendida —
// si la pantalla se apaga, el OS suspende la pestaña y se rompe el realtime.
//
// El navegador libera automáticamente el wake lock cuando la página deja de
// ser visible (cambio de pestaña, minimizar). Hay que re-pedirlo al volver.
export const useWakeLock = (enabled: boolean = true) => {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!('wakeLock' in navigator)) {
      console.info('🔓 Wake Lock API no soportada en este navegador');
      return;
    }

    let cancelled = false;

    const request = async () => {
      if (document.hidden) return;
      try {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        console.log('🔒 Wake Lock activo (pantalla no se apagará)');

        sentinel.addEventListener('release', () => {
          console.log('🔓 Wake Lock liberado');
          sentinelRef.current = null;
        });
      } catch (e: any) {
        // En tablets puede fallar por estar en background, falta de soporte,
        // política del navegador (https), etc. No es crítico.
        console.warn('🔓 Wake Lock no se pudo activar:', e?.message || e);
      }
    };

    const handleVisibility = () => {
      if (!document.hidden && !sentinelRef.current) {
        request();
      }
    };

    request();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
    };
  }, [enabled]);
};
