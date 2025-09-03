// frontend/src/components/IdleLogout.jsx
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/auth';

export default function IdleLogout({ timeout = 15 * 60 * 1000 }) {
  const navigate = useNavigate();
  const timerId = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    timerId.current = setTimeout(() => {
      clearToken();
      // Optional: add a toast/alert here for UX
      navigate('/login', { replace: true });
    }, timeout);
  }, [navigate, timeout]);

  useEffect(() => {
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];

    resetTimer();

    events.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      if (timerId.current) {
        clearTimeout(timerId.current);
        timerId.current = null;
      }
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [resetTimer]);

  return null;
}
