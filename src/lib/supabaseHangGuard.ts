// Wrapper para detectar mutaciones de Supabase que se cuelgan silenciosamente
// (sin resolver ni rechazar) — síntoma típico del cliente JS de Supabase
// quedando en estado "zombie" tras la suspensión/throttle del navegador.
//
// Si una mutación tarda más de `timeoutMs`, recargamos la página entera. Para
// la tablet de cocina, el reload es 100% fiable y mucho mejor UX que un click
// que parece no hacer nada.

const DEFAULT_TIMEOUT_MS = 10_000;

export async function withHangGuard<T>(
  promise: PromiseLike<T>,
  label: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  let timer: number | null = null;

  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      console.error(
        `🚨 [hangGuard] "${label}" colgado tras ${timeoutMs}ms — recargando página`
      );
      window.location.reload();
      reject(new Error(`Hang detected in "${label}"`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve(promise), timeout]);
    if (timer !== null) window.clearTimeout(timer);
    (window as any).__lastDataActivityAt = Date.now();
    return result as T;
  } catch (err) {
    if (timer !== null) window.clearTimeout(timer);
    throw err;
  }
}
