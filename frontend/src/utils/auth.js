// frontend/src/utils/auth.js

export function getToken() {
  return localStorage.getItem('token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  }
}

export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}

export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isTokenValid(token) {
  const payload = decodeJwtPayload(token);
  return (
    typeof payload?.exp === 'number' && Date.now() < payload.exp * 1000
  );
}
