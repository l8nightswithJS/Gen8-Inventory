import { FiX, FiBox, FiPackage } from 'react-icons/fi';
import Button from './ui/Button';

export default function LocationViewModal({ location, onClose }) {
  const inventoryItems = location?.items || [];

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto"
        onClick={(e) => e.stopPropagation()}
        // This onKeyDown prevents keyboard events on the modal content from bubbling up and closing the modal
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FiBox className="text-blue-600" size={24} />
            <div>
              <h3
                id="location-modal-title"
                className="text-lg font-bold text-slate-800"
              >
                Location Details
              </h3>
              <p className="text-sm text-slate-500">{location.code}</p>
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
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-700 mb-6">
            {location.description || 'No description provided.'}
          </p>
          <h4 className="font-bold text-slate-800 mb-3">
            Inventory at this Location
          </h4>
          <div className="space-y-3">
            {inventoryItems.length > 0 ? (
              inventoryItems.map(({ quantity, items: item }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <FiPackage className="text-slate-500" />
                    <span className="font-medium text-slate-700">
                      {item.attributes?.name || 'Unknown Item'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg text-slate-800">
                      {quantity}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">units</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-500 py-6 bg-slate-50 rounded-lg">
                This location is empty.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
