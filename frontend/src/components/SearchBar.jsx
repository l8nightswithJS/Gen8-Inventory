import React, { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [q, setQ] = useState('');

  return (
    <div style={{ marginBottom: 16 }}>
      <input
        type="text"
        placeholder="Search name or part #"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch(q)}
        style={{ padding: 8, width: 250 }}
      />
      <button onClick={() => onSearch(q)} style={{ marginLeft: 8 }}>
        Search
      </button>
    </div>
  );
}
