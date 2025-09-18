import Button from './ui/Button';

// A simple barcode icon component
const BarcodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M3 5h4V3H1v6h2zM21 3h-6v2h4v4h2zM5 15H3v6h6v-2H5zm16 0h-2v4h-4v2h6zM7 7h2v10H7zm3 0h1v10h-1zm2 0h2v10h-2zm3 0h1v10h-1z"
    />
  </svg>
);

export default function ScanButton({ onClick, className = '', children }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={className}
      variant="secondary"
      size="md"
      leftIcon={BarcodeIcon}
      title="Scan barcode"
    >
      {children ?? 'Scan'}
    </Button>
  );
}
