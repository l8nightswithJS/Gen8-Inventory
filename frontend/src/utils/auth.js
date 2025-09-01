// frontend/src/utils/auth.js

export function getToken() {
  return localStorage.getItem("token") || "";
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("token", token);
  }
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function isTokenValid(token) {
  if (!token) return false;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return typeof exp === 'number' && Date.now() < exp * 1000;
  } catch {
    return false;
  }
}
