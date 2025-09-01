//frontend/src/components/ConfirmModal.jsx
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import PropTypes from 'prop-types';

export default function ConfirmModal({
  title = 'Confirm',
  message,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  variant = 'danger',
  loading = false,
  onCancel,
  onConfirm,
}) {
  const Footer = (
    <>
      <Button variant="secondary" onClick={onCancel} disabled={loading}>
        {cancelText}
      </Button>
      <Button variant={variant} onClick={onConfirm} disabled={loading}>
        {loading ? 'Processing...' : confirmText}
      </Button>
    </>
  );

  return (
    <BaseModal isOpen={true} onClose={onCancel} title={title} footer={Footer}>
      <p className="text-gray-700">{message}</p>
    </BaseModal>
  );
}

ConfirmModal.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  cancelText: PropTypes.string,
  confirmText: PropTypes.string,
  variant: PropTypes.oneOf(['danger', 'primary', 'secondary']),
  loading: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
