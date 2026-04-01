/**
 * Helper para hacer peticiones a la API
 */

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const isReadRequest = method === "GET" || method === "HEAD";
  const headers = new Headers(init?.headers ?? undefined);

  if (isReadRequest) {
    if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-cache");
    if (!headers.has("Pragma")) headers.set("Pragma", "no-cache");
  }

  const response = await fetch(url, {
    ...init,
    ...(isReadRequest ? { cache: init?.cache ?? "no-store" } : {}),
    headers,
  });
  const rawBody = await response.text();
  let data: unknown = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error("El servidor devolvió una respuesta inválida.");
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Error en la operacion.";
    throw new Error(message || "Error en la operacion.");
  }

  if (data === null) {
    throw new Error("El servidor no devolvió datos. No se pudo completar la lectura.");
  }

  return data as T;
}
