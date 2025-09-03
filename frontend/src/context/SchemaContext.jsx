// frontend/src/context/SchemaContext.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

const SchemaCtx = createContext(null);

/**
 * Minimal client-scoped schema store.
 * We persist a list of attribute keys per client in localStorage.
 * key format: schema:client:{clientId}
 */
function storageKey(clientId) {
  return `schema:client:${clientId}`;
}

export function getSavedSchema(clientId) {
  try {
    const raw = localStorage.getItem(storageKey(clientId));
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveSchema(clientId, cols = []) {
  const unique = Array.from(new Set(cols.filter(Boolean)));
  localStorage.setItem(storageKey(clientId), JSON.stringify(unique));
  return unique;
}

export function SchemaProvider({ clientId, children }) {
  const [schema, setSchemaState] = useState(() => getSavedSchema(clientId));

  // If clientId changes, reload schema from storage
  useEffect(() => {
    setSchemaState(getSavedSchema(clientId));
  }, [clientId]);

  const setSchema = useCallback(
    (cols) => {
      const saved = saveSchema(clientId, cols);
      setSchemaState(saved); // ✅ update state so consumers re-render
    },
    [clientId],
  );

  return (
    <SchemaCtx.Provider value={{ schema, setSchema }}>
      {children}
    </SchemaCtx.Provider>
  );
}

export function useSchema() {
  const ctx = useContext(SchemaCtx);
  if (!ctx) {
    throw new Error('useSchema must be used inside <SchemaProvider/>');
  }
  return ctx;
}
