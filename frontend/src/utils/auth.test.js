import {
  IDLE_TIMEOUT_MS, clearToken, getToken, isSessionExpired,
  recordActivity, setToken,
} from './auth';

function fakeJwt(expiresAtSeconds) {
  return 'header.' + btoa(JSON.stringify({ exp: expiresAtSeconds })) + '.signature';
}

describe('browser inactivity timeout', () => {
  beforeEach(() => localStorage.clear());

  test('fresh login stores role, token and activity time', () => {
    const token = fakeJwt(Math.floor(Date.now() / 1000) + 3600);
    setToken(token, 'staff');
    expect(getToken()).toBe(token);
    expect(localStorage.getItem('role')).toBe('staff');
    expect(isSessionExpired()).toBe(false);
  });

  test('inactive session expires at fifteen minutes', () => {
    const now = Date.now();
    setToken(fakeJwt(Math.floor(now / 1000) + 3600), 'staff');
    localStorage.setItem('gen8:lastActivity', String(now - IDLE_TIMEOUT_MS));
    expect(isSessionExpired(now)).toBe(true);
    expect(recordActivity(now)).toBe(false);
  });

  test('active user can extend local idle window without refreshing JWT', () => {
    const now = Date.now();
    const token = fakeJwt(Math.floor(now / 1000) + 3600);
    setToken(token, 'staff');
    localStorage.setItem('gen8:lastActivity', String(now - 30000));
    expect(recordActivity(now)).toBe(true);
    expect(isSessionExpired(now)).toBe(false);
    expect(getToken()).toBe(token);
  });

  test('missing activity timestamp fails closed', () => {
    setToken(fakeJwt(Math.floor(Date.now() / 1000) + 3600));
    localStorage.removeItem('gen8:lastActivity');
    expect(isSessionExpired()).toBe(true);
  });

  test('expired JWT cannot be revived by activity', () => {
    const now = Date.now();
    setToken(fakeJwt(Math.floor(now / 1000) - 1));
    expect(recordActivity(now)).toBe(false);
  });

  test('logout clears every session key', () => {
    setToken(fakeJwt(Math.floor(Date.now() / 1000) + 3600), 'admin');
    clearToken();
    expect(getToken()).toBe('');
    expect(localStorage.getItem('role')).toBeNull();
    expect(localStorage.getItem('gen8:lastActivity')).toBeNull();
  });
});
