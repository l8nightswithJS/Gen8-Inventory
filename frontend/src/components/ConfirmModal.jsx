import React from 'react';
import styles from './ConfirmModal.module.css';

export default function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true" tabIndex={-1}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancel}>Cancel</button>
          <button onClick={onConfirm} className={styles.delete}>Delete</button>
        </div>
      </div>
    </div>
  );
}
