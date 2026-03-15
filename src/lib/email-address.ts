const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmailAddress(email: string) {
  return SIMPLE_EMAIL_RE.test(normalizeEmailAddress(email));
}
