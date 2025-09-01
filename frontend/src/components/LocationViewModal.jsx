// frontend/src/components/LocationViewModal.jsx
import { FiBox, FiPackage } from 'react-icons/fi';
import Button from './ui/Button';
import BaseModal from './ui/BaseModal';

export default function LocationViewModal({ location, isOpen, onClose }) {
  const inventoryItems = location?.items || [];
  const descId = 'location-modal-desc';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Location Details"
      describedBy={descId}
      size="max-w-md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {/* Header Sub-content */}
      <div className="mb-4 flex items-center gap-3">
        <FiBox className="text-blue-600" size={24} />
        <div>
          <h3 className="text-lg font-bold text-slate-800">Location Details</h3>
          <p className="text-sm text-slate-500">{location?.code}</p>
        </div>
      </div>

      {/* Body */}
      <div id={descId} className="max-h-[60vh] overflow-y-auto">
        <p className="mb-6 text-sm text-slate-700">
          {location?.description || 'No description provided.'}
        </p>
        <h4 className="mb-3 font-bold text-slate-800">
          Inventory at this Location
        </h4>
        <div className="space-y-3">
          {inventoryItems.length > 0 ? (
            inventoryItems.map(({ quantity, items: item }) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <FiPackage className="text-slate-500" />
                  <span className="font-medium text-slate-700">
                    {item.attributes?.name || 'Unknown Item'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-800">
                    {quantity}
                  </span>
                  <span className="ml-1 text-xs text-slate-500">units</span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-slate-50 py-6 text-center text-sm text-slate-500">
              This location is empty.
            </p>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
