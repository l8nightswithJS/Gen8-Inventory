// src/components/SearchBar.jsx
import { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [q, setQ] = useState('');

  const submit = () => onSearch(q);
  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Search name or part #"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        className="h-10 w-64 max-w-full rounded-xl border border-gray-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        aria-label="Search name or part number"
      />
      <button
        onClick={submit}
        className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Search
      </button>
    </div>
  );
}
