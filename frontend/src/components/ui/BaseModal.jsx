// src/components/ui/BaseModal.jsx
import { FocusOn } from 'react-focus-on';
import { FiX } from 'react-icons/fi';

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) {
  if (!isOpen) return null;

  return (
    <FocusOn onEscapeKey={onClose} shards={[]}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="relative flex flex-col w-full max-w-lg rounded-lg bg-white shadow-xl max-h-[90vh]">
          {/* Modal Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800"
              aria-label="Close modal"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Modal Content (Scrollable) */}
          <div className="flex-auto overflow-y-auto p-4">{children}</div>

          {/* Modal Footer */}
          {footer && (
            <div className="flex-shrink-0 flex justify-end items-center gap-3 p-4 border-t bg-gray-50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </FocusOn>
  );
}
