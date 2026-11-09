import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearToken,
  IDLE_TIMEOUT_MS,
  isSessionExpired,
  recordActivity,
} from '../utils/auth';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
const ACTIVITY_THROTTLE_MS = 1000;

export default function IdleLogout() {
  const navigate = useNavigate();
  const lastWrite = useRef(0);

  const expireIfNeeded = useCallback(() => {
    if (!isSessionExpired()) return false;
    clearToken();
    navigate('/login?reason=expired', { replace: true });
    return true;
  }, [navigate]);

  useEffect(() => {
    if (expireIfNeeded()) return undefined;

    const onActivity = () => {
      if (expireIfNeeded()) return;
      const now = Date.now();
      if (now - lastWrite.current < ACTIVITY_THROTTLE_MS) return;
      if (!recordActivity(now)) {
        expireIfNeeded();
        return;
      }
      lastWrite.current = now;
    };

    const onStorage = (event) => {
      if (event.key === 'token' && !event.newValue) {
        clearToken();
        navigate('/login', { replace: true });
      } else if (
        event.key === 'gen8:lastActivity' ||
        event.key === 'token'
      ) {
        expireIfNeeded();
      }
    };

    const onFocus = () => expireIfNeeded();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') expireIfNeeded();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    // Check the actual last activity timestamp, not just timer elapsed time:
    // suspended background tabs cannot be trusted to fire timers on schedule.
    const interval = window.setInterval(expireIfNeeded, Math.min(10000, IDLE_TIMEOUT_MS));

    return () => {
      window.clearInterval(interval);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [expireIfNeeded]);

  return null;
}
