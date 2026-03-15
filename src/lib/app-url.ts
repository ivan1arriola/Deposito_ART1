function sanitizeBaseUrl(raw: string) {
  return raw.trim().replace(/\/+$/, "");
}

export function getAppBaseUrl(request?: Request) {
  const configured = process.env.NEXTAUTH_URL ?? process.env.APP_BASE_URL;
  if (configured && configured.trim() !== "") {
    return sanitizeBaseUrl(configured);
  }

  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }

  return "http://localhost:3000";
}
