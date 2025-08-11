// src/hooks/useBarcodeScanner.js
import { useCallback, useRef, useState } from 'react';

export default function useBarcodeScanner({ coolOffMs = 1200 } = {}) {
  const [last, setLast] = useState(null);
  const lockRef = useRef(false);
  const tRef = useRef(null);

  const accept = useCallback(
    (value) => {
      if (!value) return false;
      const v = String(value).trim();
      if (!v) return false;
      if (lockRef.current) return false;
      lockRef.current = true;
      clearTimeout(tRef.current);
      setLast(v);
      tRef.current = setTimeout(() => {
        lockRef.current = false;
      }, coolOffMs);
      return v;
    },
    [coolOffMs],
  );

  return { last, accept };
}
