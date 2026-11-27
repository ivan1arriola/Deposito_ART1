/**
 * Helper para hacer peticiones a la API
 */

function headersToSafeObject(headers: Headers) {
  const result: Record<string, string> = {};

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    if (lowerKey === "authorization" || lowerKey === "cookie" || lowerKey === "set-cookie") {
      result[key] = "[OCULTO]";
    } else {
      result[key] = value;
    }
  });

  return result;
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  const err = error as Record<string, unknown>;
  return (
    err.name === "AbortError" ||
    err.code === 20 ||
    (typeof err.message === "string" && err.message.toLowerCase().includes("aborted")) ||
    (typeof err.message === "string" && err.message === "signal is aborted without reason")
  );
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  console.groupCollapsed(`[api] ${init?.method ?? "GET"} ${url}`);

  console.log("[api] URL recibida:", url);
  console.log("[api] init recibido:", init);

  const method = (init?.method ?? "GET").toUpperCase();
  const isReadRequest = method === "GET" || method === "HEAD";
  const headers = new Headers(init?.headers ?? undefined);

  console.log("[api] metodo normalizado:", method);
  console.log("[api] es request de lectura:", isReadRequest);
  console.log("[api] headers iniciales:", headersToSafeObject(headers));

  if (isReadRequest) {
    console.log("[api] aplicando headers anti-cache para lectura");

    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "no-cache");
      console.log("[api] header agregado: Cache-Control = no-cache");
    } else {
      console.log("[api] Cache-Control ya existia:", headers.get("Cache-Control"));
    }

    if (!headers.has("Pragma")) {
      headers.set("Pragma", "no-cache");
      console.log("[api] header agregado: Pragma = no-cache");
    } else {
      console.log("[api] Pragma ya existia:", headers.get("Pragma"));
    }
  }

  const fetchOptions: RequestInit = {
    ...init,
    ...(isReadRequest ? { cache: init?.cache ?? "no-store" } : {}),
    headers,
  };

  console.log("[api] opciones finales para fetch:", {
    ...fetchOptions,
    headers: headersToSafeObject(headers),
    body: fetchOptions.body,
  });

  let response: Response;

  try {
    console.log("[api] ejecutando fetch...");
    response = await fetch(url, fetchOptions);
    console.log("[api] fetch completado");
  } catch (error) {
    if (isAbortError(error)) {
      console.log("[api] fetch abortado");
    }
    console.groupEnd();
    throw error;
  }

  console.log("[api] response.ok:", response.ok);
  console.log("[api] response.status:", response.status);
  console.log("[api] response.statusText:", response.statusText);
  console.log("[api] response.url:", response.url);
  console.log("[api] response.type:", response.type);
  console.log("[api] response.redirected:", response.redirected);
  console.log("[api] response.headers:", headersToSafeObject(response.headers));

  let rawBody = "";

  try {
    console.log("[api] leyendo body como texto...");
    rawBody = await response.text();
    console.log("[api] rawBody recibido:", rawBody);
    console.log("[api] rawBody length:", rawBody.length);
  } catch (error) {
    if (isAbortError(error)) {
      console.log("[api] lectura de body abortada");
    }
    console.groupEnd();
    throw error;
  }

  let data: unknown = null;

  if (rawBody) {
    try {
      console.log("[api] intentando parsear JSON...");
      data = JSON.parse(rawBody);
      console.log("[api] JSON parseado correctamente:", data);
    } catch (_error) {
      console.groupEnd();
      throw new Error("El servidor devolvió una respuesta inválida.");
    }
  } else {
    console.warn("[api] el body vino vacio");
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Error en la operacion.";

    console.groupEnd();
    throw new Error(message || "Error en la operacion.");
  }

  if (data === null) {
    console.groupEnd();
    throw new Error("El servidor no devolvió datos. No se pudo completar la lectura.");
  }

  console.log("[api] respuesta final devuelta:", data);
  console.groupEnd();

  return data as T;
}