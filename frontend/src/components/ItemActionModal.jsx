import BaseModal from './ui/BaseModal';
import { FiPackage, FiClipboard, FiEdit3 } from 'react-icons/fi';
import Button from './ui/Button';

export default function ItemActionModal({
  isOpen,
  item,
  onClose,
  onCheckStock,
  onEditDetails,
}) {
  const descId = 'item-action-modal-desc';
  const a = item?.attributes || {};
  const displayName =
    a.name || a.part_number || a.description || 'Unknown Item';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Item Scanned"
      describedBy={descId}
      size="max-w-sm"
    >
      <div className="px-4">
        {/* Subhead under title */}
        <div className="mb-4 -mt-2 flex items-center gap-3">
          <FiPackage
            className="text-blue-600 dark:text-blue-400 flex-shrink-0"
            size={22}
          />
          <p className="max-w-xs truncate text-sm text-slate-600 dark:text-slate-400">
            {displayName}
          </p>
        </div>

        <p
          id={descId}
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
