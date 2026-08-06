import BaseModal from './ui/BaseModal';
import { FiPackage, FiClipboard, FiEdit3 } from 'react-icons/fi';
import Button from './ui/Button';

export default function ItemActionModal({
  isOpen = true,
  item,
  onClose,
  onCheckStock,
  onEditDetails,
}) {
  const descriptionId = 'item-action-modal-desc';
  const displayName =
    item?.name || item?.description || item?.part_number || 'Unknown Item';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Item Scanned"
      describedBy={descriptionId}
      size="max-w-sm"
    >
      <div className="px-4">
        <div className="mb-4 -mt-2 flex items-center gap-3">
          <FiPackage
            className="text-blue-600 dark:text-blue-400 flex-shrink-0"
            size={22}
          />
          <div className="min-w-0">
            <p className="max-w-xs truncate text-sm font-medium text-slate-700 dark:text-slate-300">
              {displayName}
            </p>
            <p className="max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
              {item?.part_number || 'No part number'}
              {item?.lot_number ? ` · Lot ${item.lot_number}` : ''}
            </p>
          </div>
        </div>

        <p
          id={descriptionId}
          className="mb-6 text-center text-slate-700 dark:text-slate-300"
        >
          What would you like to do?
        </p>

        <div className="flex flex-col gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => onCheckStock(item)}
            leftIcon={FiClipboard}
          >
            Check Stock
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => onEditDetails(item)}
            leftIcon={FiEdit3}
          >
            Edit Details
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
