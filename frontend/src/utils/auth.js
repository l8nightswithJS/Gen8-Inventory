// Centralized browser session management. Server-side JWT expiry is independent
// of this user-experience inactivity timeout.
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';
const ACTIVITY_KEY = 'gen8:lastActivity';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token, role = '') {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
}

export function isTokenValid(token) {
  if (!token) return false;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return Number.isFinite(exp) && Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

export function isSessionExpired(now = Date.now()) {
  if (!isTokenValid(getToken())) return true;
  const last = Number(localStorage.getItem(ACTIVITY_KEY));
  // Fail closed for older sessions without an inactivity timestamp.
  return !Number.isFinite(last) || last <= 0 ||
    last > now || now - last >= IDLE_TIMEOUT_MS;
}

export function recordActivity(now = Date.now()) {
  if (isSessionExpired(now)) return false;
  localStorage.setItem(ACTIVITY_KEY, String(now));
  return true;
}
