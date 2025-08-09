// src/components/ColumnSetupModal.jsx
import React, { useState } from "react";

const normalizeKey = (str) =>
  (str || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "")
    .replace(/_+/g, "_");

/**
 * A tiny modal to define the attribute columns for a client's table
 * when they don't have any items yet.
 */
export default function ColumnSetupModal({ isOpen, onClose, onSave, initial = [] }) {
  const [cols, setCols] = useState(initial.length ? initial : [
    "name",
    "part_number",
    "description",
    "quantity",
    "location"
  ]);
  const [input, setInput] = useState("");

  if (!isOpen) return null;

  const addCol = () => {
    const k = normalizeKey(input);
    if (!k) return;
    if (!cols.includes(k)) setCols([...cols, k]);
    setInput("");
  };

  const remove = (key) => {
    setCols(cols.filter((c) => c !== key));
  };

  const save = () => {
    const cleaned = cols.map(normalizeKey).filter(Boolean);
    onSave(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <button
          className="absolute right-3 top-2 text-gray-500 text-2xl"
          onClick={onClose}
          aria-label="close"
        >
          &times;
        </button>
        <h3 className="text-xl font-semibold mb-4">Define Columns</h3>

        <div className="flex gap-2 mb-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a column (e.g., vendor sku)"
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={addCol}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {cols.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded"
            >
              {c}
              <button
                onClick={() => remove(c)}
                className="text-red-600 hover:text-red-800"
                title="remove"
              >
                &times;
              </button>
            </span>
          ))}
          {!cols.length && <em className="text-gray-500">No columns yet.</em>}
        </div>

        <div className="border-t pt-4 space-y-2 text-sm">
          <p className="text-gray-600">
            We’ll always include <code>has_lot</code>, <code>lot_number</code>,{" "}
            <code>low_stock_threshold</code>, and <code>alert_enabled</code> controls on every item,
            even if they are not in your list.
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
            Cancel
          </button>
          <button onClick={save} className="px-4 py-2 bg-green-600 text-white rounded">
            Save Columns
          </button>
        </div>
      </div>
    </div>
  );
}
