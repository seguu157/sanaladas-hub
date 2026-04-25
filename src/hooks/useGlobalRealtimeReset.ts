import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { usePageVisibility } from './usePageVisibility';

const SOFT_RESET_THRESHOLD_MS = 3_000;
const HARD_RELOAD_THRESHOLD_MS = 30_000;
const WATCHDOG_TIMEOUT_MS = 8_000;

// Estrategia escalonada al volver de una ausencia:
//
//   < 5s:    nada (wake muy breve, foco devolviéndose, no hace falta tocar nada)
//   5-60s:   soft reset — refresca la sesión + disconnect/connect del websocket
//            de Supabase Realtime. Cada componente con canales también re-suscribe
//            sus propios canales (en su propio usePageVisibility), así que tras
//            este reset global todos los canales arrancan sobre un websocket fresco.
//   > 60s:   hard reload — `window.location.reload()`. En la práctica, tras
//            ausencias largas el cliente de Supabase JS puede entrar en estados
//            donde los queries se cuelgan sin que el AbortSignal aborte. Para
//            la tablet de cocina, recargar la página es 100% fiable.
//
// Watchdog: tras un soft reset, si en WATCHDOG_TIMEOUT_MS el cliente sigue
// "vivo" (heartbeat sigue ticando) pero los datos no llegaron, forzamos hard
// reload como fallback. Esto se controla con un flag externo
// (window.__lastDataActivityAt) que useOrders mantiene actualizado.
export const useGlobalRealtimeReset = () => {
  const watchdogRef = useRef<number | null>(null);

  const cancelWatchdog = () => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (timeHidden < SOFT_RESET_THRESHOLD_MS) return;

      // > 60s ausente: la única forma fiable de volver a un estado limpio en el
      // cliente de Supabase es recargar la página. La tablet de cocina pierde
      // < 1s de UX vs. quedarse colgada bugueada.
      if (timeHidden >= HARD_RELOAD_THRESHOLD_MS) {
        console.log(
          `🌐 [global] Hard reload tras ${Math.round(timeHidden / 1000)}s ausente`
        );
        cancelWatchdog();
        // Pequeño delay para que el log se vea en consola antes del reload.
        window.setTimeout(() => window.location.reload(), 100);
        return;
      }

      console.log(
        `🌐 [global] Soft reset tras ${Math.round(timeHidden / 1000)}s ausente`
      );

      const wakeStartedAt = Date.now();
      (window as any).__lastWakeStartedAt = wakeStartedAt;

      try {
        await supabase.auth.refreshSession();
      } catch (e) {
        console.warn('⚠️ [global] refreshSession falló:', e);
      }

      try {
        const realtime: any = supabase.realtime;
        if (typeof realtime?.disconnect === 'function') {
          realtime.disconnect();
        }
        if (typeof realtime?.connect === 'function') {
          realtime.connect();
        }
        console.log('✅ [global] websocket de realtime reseteado');
      } catch (e) {
        console.warn('⚠️ [global] reset de realtime falló:', e);
      }

      // Watchdog: si tras WATCHDOG_TIMEOUT_MS no hemos visto actividad de
      // datos posterior a este wake, recargamos. El flag
      // window.__lastDataActivityAt lo actualizan los hooks que cargan datos
      // (p.ej. useOrders al recibir filas).
      cancelWatchdog();
      watchdogRef.current = window.setTimeout(() => {
        const lastActivity = (window as any).__lastDataActivityAt || 0;
        if (lastActivity < wakeStartedAt) {
          console.warn(
            '🚨 [global] Watchdog: sin actividad de datos tras el wake — hard reload'
          );
          window.location.reload();
        } else {
          console.log('✅ [global] Watchdog OK — actividad de datos detectada');
        }
        watchdogRef.current = null;
      }, WATCHDOG_TIMEOUT_MS);
    }, [])
  });
};
