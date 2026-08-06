import { FiBox, FiPackage } from 'react-icons/fi';
import Button from './ui/Button';
import BaseModal from './ui/BaseModal';

export default function LocationViewModal({
  location,
  isOpen = true,
  onClose,
}) {
  const inventoryItems = Array.isArray(location?.items) ? location.items : [];
  const descriptionId = 'location-modal-desc';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Location Details"
      describedBy={descriptionId}
      size="max-w-md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
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

      <div id={descriptionId} className="max-h-[60vh] overflow-y-auto">
        <div className="space-y-3">
          {inventoryItems.length > 0 ? (
            inventoryItems.map((entry, index) => {
              const item = entry.item || entry.items || {};
              const quantity = Number(entry.quantity ?? 0);
              const displayQuantity = Number.isFinite(quantity) ? quantity : 0;
              const name =
                item.name ||
                item.description ||
                item.part_number ||
                'Unknown Item';

              return (
                <div
                  key={`${item.id || 'item'}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FiPackage className="flex-shrink-0 text-slate-500 dark:text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-700 dark:text-slate-300">
                        {name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.part_number || 'No part number'}
                        {item.lot_number ? ` · Lot ${item.lot_number}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-lg font-bold text-slate-800 dark:text-white">
                      {displayQuantity}
                    </span>
                    {item.uom && (
                      <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.uom}
                      </span>
                    )}
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
