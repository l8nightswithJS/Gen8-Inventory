// src/components/ui/BaseModal.jsx
import { useEffect, useId, useRef } from 'react';
import { FocusOn } from 'react-focus-on';
import { FiX } from 'react-icons/fi';

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  describedBy, // optional id
  size = 'max-w-lg',
}) {
  const titleId = useId();
  const closeBtnRef = useRef(null);

  // Body scroll lock while open (hook must run unconditionally)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Move focus to the close button when the modal opens (no autoFocus prop)
  useEffect(() => {
    if (isOpen) {
      // Next tick to ensure element is mounted
      queueMicrotask(() => closeBtnRef.current?.focus());
    }
  }, [isOpen]);

  const handleOverlayKeyDown = (e) => {
    // keyboard equivalent of click for a11y
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onClose();
    }
  };

  // After hooks are declared, we can early-return the null UI
  if (!isOpen) return null;

  return (
    <FocusOn
      onEscapeKey={onClose}
      returnFocus
      scrollLock
      // autoFocus removed to satisfy jsx-a11y/no-autofocus
      shards={[]}
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay: interactive element (click + keyboard) */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
          onKeyDown={handleOverlayKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
        />

        {/* Dialog */}
        <div
          className={`relative z-10 flex max-h-[90vh] w-full flex-col rounded-lg bg-white shadow-xl ${size}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h2 id={titleId} className="text-lg font-semibold text-gray-800">
              {title}
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              aria-label="Close modal"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-auto overflow-y-auto p-4">{children}</div>

          {/* Footer (optional) */}
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t bg-gray-50 p-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </FocusOn>
  );
}
