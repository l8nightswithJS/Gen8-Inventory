// In frontend/src/components/UsbScannerInput.jsx (new file)
import { useState } from 'react';
import { FiZap } from 'react-icons/fi'; // A nice icon for "quick scan"

export default function UsbScannerInput({ onScan, disabled }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    // When Enter is pressed and there's text, trigger the onScan function
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onScan(inputValue.trim());
      setInputValue(''); // Clear the input for the next scan
    }
  };

  return (
    <div className="relative">
      <FiZap className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="USB Scan..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        aria-label="USB Barcode Scanner Input"
      />
    </div>
  );
}
