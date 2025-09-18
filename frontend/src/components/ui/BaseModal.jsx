import { useEffect, useId, useRef } from 'react';
import { FocusOn } from 'react-focus-on';
import { FiX } from 'react-icons/fi';

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  describedBy,
  size = 'max-w-lg',
}) {
  const titleId = useId();
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => closeBtnRef.current?.focus());
    }
  }, [isOpen]);

  const handleOverlayKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <FocusOn onEscapeKey={onClose} returnFocus scrollLock shards={[]}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/60 dark:bg-black/80"
          onClick={onClose}
          onKeyDown={handleOverlayKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
        />

        <div
          className={`relative z-10 flex max-h-[90vh] w-full flex-col rounded-lg bg-white dark:bg-slate-900 shadow-xl ${size}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4">
            <h2
              id={titleId}
              className="text-lg font-semibold text-gray-800 dark:text-white"
            >
              {title}
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-700 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              aria-label="Close modal"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-auto overflow-y-auto p-4">{children}</div>

          {/* Footer (optional) */}
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </FocusOn>
  );
}
