// frontend/src/components/StartInventoryWizard.jsx
import { useState } from 'react';
import InventoryForm from './InventoryForm';
import BulkImport from './BulkImport';

export default function StartInventoryWizard({ client_id, refresh, onFinish }) {
  const [step, setStep] = useState(1);

  return (
    <div
      style={{
        border: '2px dashed #90caf9',
        background: '#f7fafd',
        borderRadius: 12,
        padding: '2rem',
        margin: '2rem 0',
        textAlign: 'center',
      }}
    >
      <h2>Get Started with Inventory</h2>
      {step === 1 && (
        <>
          <p>
            You have no items for this project yet.
            <br />
            <b>Would you like to add your first item or bulk import?</b>
          </p>
          <button onClick={() => setStep(2)} style={{ margin: 6 }}>
            Add Single Item
          </button>
          <button onClick={() => setStep(3)} style={{ margin: 6 }}>
            Bulk Import
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <InventoryForm
            client_id={client_id}
            refresh={() => {
              refresh();
              onFinish();
            }}
          />
          <button onClick={() => setStep(1)} style={{ marginTop: 12 }}>
            Back
          </button>
        </>
      )}
      {step === 3 && (
        <>
          <BulkImport
            client_id={client_id}
            refresh={() => {
              refresh();
              onFinish();
            }}
          />
          <button onClick={() => setStep(1)} style={{ marginTop: 12 }}>
            Back
          </button>
        </>
      )}
    </div>
  );
}
