import { useState } from 'react';
import { FiZap } from 'react-icons/fi';

export default function UsbScannerInput({ onScan, disabled }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onScan(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="relative">
      <FiZap className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
      <input
        type="text"
        placeholder="USB Scan..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/50"
        aria-label="USB Barcode Scanner Input"
      />
    </div>
  );
}
