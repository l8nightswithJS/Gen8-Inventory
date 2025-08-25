import { FiX, FiPackage, FiClipboard, FiEdit3 } from 'react-icons/fi';
import Button from './ui/Button';

export default function ItemActionModal({
  item,
  onClose,
  onCheckStock,
  onEditDetails,
}) {
  // This handler allows keyboard users to close the modal with the "Enter" or "Space" key
  const handleBackdropKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleBackdropKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close modal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto"
        onClick={(e) => e.stopPropagation()}
        // This onKeyDown prevents keyboard events on the modal content from bubbling up and closing the modal
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-action-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FiPackage className="text-blue-600" size={24} />
            <div>
              <h3
                id="item-action-modal-title"
                className="text-lg font-bold text-slate-800"
              >
                Item Scanned
              </h3>
              <p className="text-sm text-slate-500 truncate max-w-xs">
                {item.attributes?.name || 'Unknown Item'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100"
            aria-label="Close"
          >
            <FiX className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-center text-slate-700 mb-6">
            What would you like to do?
          </p>
          <div className="flex flex-col gap-4">
            <Button
              variant="primary"
              onClick={() => onCheckStock(item)}
              size="lg"
            >
              <FiClipboard className="mr-2" />
              Check Stock Levels
            </Button>
            <Button
              variant="secondary"
              onClick={() => onEditDetails(item)}
              size="lg"
            >
              <FiEdit3 className="mr-2" />
              Edit Product Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
