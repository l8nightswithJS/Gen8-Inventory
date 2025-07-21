// src/components/ConfirmModal.jsx
import React from 'react'
import PropTypes from 'prop-types'

export default function ConfirmModal({
  title = 'Confirm',
  message,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  variant = 'danger',       // 'danger' | 'success'
  onCancel,
  onConfirm,
}) {
  // Choose confirm-button classes based on variant
  const confirmClasses =
    variant === 'success'
      ? 'bg-green-600 hover:bg-green-700 text-white'
      : 'bg-red-600 hover:bg-red-700 text-white'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        {title && (
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {title}
          </h3>
        )}
        {message && (
          <p className="text-gray-700 mb-6">
            {message}
          </p>
        )}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded transition ${confirmClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

ConfirmModal.propTypes = {
  title:        PropTypes.string,
  message:      PropTypes.string.isRequired,
  cancelText:   PropTypes.string,
  confirmText:  PropTypes.string,
  variant:      PropTypes.oneOf(['danger', 'success']),
  onCancel:     PropTypes.func.isRequired,
  onConfirm:    PropTypes.func.isRequired,
}
