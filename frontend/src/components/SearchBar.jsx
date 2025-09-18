import { useState } from 'react';
import Button from './ui/Button';

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
        className="h-10 w-64 max-w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/50"
        aria-label="Search name or part number"
      />
      <Button onClick={submit} variant="secondary" size="md">
        Search
      </Button>
    </div>
  );
}
