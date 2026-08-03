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
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function inspectToken(token) {
  if (typeof token !== 'string' || token.trim() === '') {
    return { valid: false, reason: 'missing token' };
  }

  if (token.split('.').length !== 3) {
    return { valid: false, reason: 'malformed token' };
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return { valid: false, reason: 'unreadable token payload' };
  }

  if (typeof payload.exp !== 'number') {
    return { valid: false, reason: 'token has no numeric expiration' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) {
    return {
      valid: false,
      reason: 'token is already expired',
      expiresAt: payload.exp,
      now: nowSeconds,
    };
  }

  return { valid: true, payload };
}

export function isTokenValid(token) {
  return inspectToken(token).valid;
}
