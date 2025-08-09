// src/context/SchemaContext.jsx
import React, { createContext, useContext, useMemo, useCallback } from "react";

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
    const arr = JSON.parse(raw || "[]");
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
  const schema = useMemo(() => getSavedSchema(clientId), [clientId]);

  const setSchema = useCallback(
    (cols) => saveSchema(clientId, cols),
    [clientId]
  );

  const value = useMemo(() => ({ schema, setSchema }), [schema, setSchema]);

  return <SchemaCtx.Provider value={value}>{children}</SchemaCtx.Provider>;
}

export function useSchema() {
  const ctx = useContext(SchemaCtx);
  if (!ctx) {
    throw new Error("useSchema must be used inside <SchemaProvider/>");
  }
  return ctx;
}
