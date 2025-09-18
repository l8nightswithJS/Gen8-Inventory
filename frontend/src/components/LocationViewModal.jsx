import { FiBox, FiPackage } from 'react-icons/fi';
import Button from './ui/Button';
import BaseModal from './ui/BaseModal';

export default function LocationViewModal({ location, isOpen, onClose }) {
  const inventoryItems = Array.isArray(location?.items) ? location.items : [];
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
        <FiBox className="text-blue-600 dark:text-blue-400" size={24} />
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {location?.code || '—'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {location?.description || 'No description provided.'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div id={descId} className="max-h-[60vh] overflow-y-auto">
        <div className="space-y-3">
          {inventoryItems.length > 0 ? (
            inventoryItems.map((entry) => {
              const item = entry.item || entry.items;
              const quantity = entry.quantity ?? 0;
              const name =
                item?.attributes?.name ||
                item?.attributes?.part_number ||
                item?.attributes?.description ||
                'Unknown Item';

              return (
                <div
                  key={item?.id || Math.random()}
                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <FiPackage className="text-slate-500 dark:text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-800 dark:text-white">
                      {quantity}
                    </span>
                    <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                      units
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-lg bg-slate-50 dark:bg-slate-800/50 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              This location is empty.
            </p>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
