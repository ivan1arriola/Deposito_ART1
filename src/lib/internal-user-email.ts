export function buildInternalUserEmail(username: string) {
  const normalized = username.trim().toLowerCase().replace(/\s+/g, ".");
  return `${normalized}@usuarios.local`;
}
