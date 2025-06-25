import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ClientCarousel.module.css';
import EditClientModal from './EditClientModal'; // modal for edit
import ConfirmModal from './ConfirmModal'; // modal for delete

export default function ClientCarousel({ clients, onClientUpdated, onClientDeleted, onAddClient }) {
  const navigate = useNavigate();
  const carouselRef = useRef();

  // Modal state
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Scroll
  const scroll = (dir) => {
    const el = carouselRef.current;
    if (!el) return;
    const cardW = el.firstChild ? el.firstChild.offsetWidth : 300;
    el.scrollBy({ left: dir * cardW * 1.2, behavior: 'smooth' });
  };

  return (
    <div className={styles.carouselContainer} tabIndex="0" aria-label="Client carousel">
      <button className={styles.arrow} onClick={() => scroll(-1)} aria-label="Scroll left">&#8592;</button>
      <div className={styles.carousel} ref={carouselRef}>
        {/* ADD CLIENT BUTTON */}
        <div className={styles.cardAdd} onClick={onAddClient} tabIndex={0} aria-label="Add new client">
          <div className={styles.plus}>+</div>
          <div className={styles.addText}>Add Client</div>
        </div>
        {/* CLIENT CARDS */}
        {clients.map((client) => (
          <div className={styles.card} key={client.id}>
            <div className={styles.logoWrap} tabIndex={0}>
              {client.logo_url ? (
                <img src={client.logo_url} alt={`${client.name} logo`} className={styles.logo} />
              ) : (
                <div className={styles.logoFallback}>No Logo</div>
              )}
            </div>
            <div className={styles.clientName}>{client.name}</div>
            <div className={styles.actions}>
              <button
                className={styles.viewBtn}
                onClick={() => navigate(`/clients/${client.id}`)}
                aria-label={`View inventory for ${client.name}`}
              >
                Inventory
              </button>
              <button
                className={styles.editBtn}
                onClick={() => setEditing(client)}
                aria-label={`Edit ${client.name}`}
              >✏️</button>
              <button
                className={styles.deleteBtn}
                onClick={() => setDeleting(client)}
                aria-label={`Delete ${client.name}`}
              >🗑️</button>
            </div>
          </div>
        ))}
      </div>
      <button className={styles.arrow} onClick={() => scroll(1)} aria-label="Scroll right">&#8594;</button>

      {/* Edit Modal */}
      {editing &&
        <EditClientModal
          client={editing}
          onClose={() => setEditing(null)}
          onUpdated={client => {
            setEditing(null);
            onClientUpdated(client);
          }}
        />
      }
      {/* Delete Modal */}
      {deleting &&
        <ConfirmModal
          title={`Delete "${deleting.name}"?`}
          message="Are you sure? This cannot be undone."
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await onClientDeleted(deleting.id);
            setDeleting(null);
          }}
        />
      }
    </div>
  );
}
