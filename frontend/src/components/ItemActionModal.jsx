// frontend/src/components/ItemActionModal.jsx
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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Item Scanned"
      describedBy={descId}
      size="max-w-sm"
    >
      {/* Header content is provided by BaseModal; we only render the body here */}
      <div className="px-4">
        {/* Subhead under title */}
        <div className="mb-4 -mt-2 flex items-center gap-3">
          <FiPackage className="text-blue-600" size={22} />
          <p className="max-w-xs truncate text-sm text-slate-600">
            {item?.attributes?.name || 'Unknown Item'}
          </p>
        </div>

        <p id={descId} className="mb-6 text-center text-slate-700">
          What would you like to do?
        </p>

        <div className="flex flex-col gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => onCheckStock(item)}
          >
            <FiClipboard className="mr-2" />
            Check Stock Levels
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => onEditDetails(item)}
          >
            <FiEdit3 className="mr-2" />
            Edit Product Details
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
