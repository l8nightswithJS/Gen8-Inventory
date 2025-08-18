import AddClientForm from './AddClientForm';

export default function AddClientModal({ isOpen, onClose, onClientAdded }) {
  const handleSuccess = () => {
    if (onClientAdded) onClientAdded();
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md relative p-6">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ×
        </button>
        <AddClientForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
