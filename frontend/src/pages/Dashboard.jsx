import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import ClientCarousel from '../components/ClientCarousel';
import AddClientModal from '../components/AddClientModal';
import Button from '../components/ui/Button';
import { decodeJwtPayload } from '../utils/auth';

function displayName() {
  const saved = localStorage.getItem('displayName');
  if (saved) return saved;

  const payload = decodeJwtPayload(localStorage.getItem('token'));
  return String(payload?.first_name || payload?.display_name || '').trim();
}

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || '';
  const isAdmin = role === 'admin';
  const name = displayName();

  const normalizeToArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.clients)) return payload.clients;
    return [];
  };

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get('/api/clients', {
        params: isAdmin ? { include_archived: true } : undefined,
        meta: { silent: true },
      });
      setClients(normalizeToArray(res.data));
      setError('');
    } catch {
      setError('Could not load your authorized projects.');
      setClients([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const activeClients = clients.filter((client) => !client.archived_at);
  const archivedClients = clients.filter((client) => Boolean(client.archived_at));

  useEffect(() => {
    if (role === 'external_viewer' && activeClients.length === 1) {
      navigate(`/clients/${activeClients[0].id}`, { replace: true });
    }
  }, [activeClients, navigate, role]);

  const handleArchive = async (id) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/api/clients/${id}`);
      await fetchClients();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to archive client.');
    }
  };

  const handleRestore = async (id) => {
    if (!isAdmin) return;
    try {
      await api.post(`/api/clients/${id}/restore`);
      await fetchClients();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to restore client.');
    }
  };

  const handlePermanentDelete = async (id, clientName) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/api/clients/${id}/permanent`, {
        data: { confirm_name: clientName },
      });
      await fetchClients();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to permanently delete client.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/60 sm:px-7">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
          Gener8 Inventory
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {name ? `Welcome, ${name}` : 'Welcome back'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Choose a project below to view inventory, or use the navigation above for scanning and other tools available to your account.
        </p>
      </section>

      <div className="mb-6 flex items-start justify-between gap-4 px-1 sm:items-center sm:px-0">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
            Inventory scopes
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {isAdmin ? 'Projects & Clients' : 'Your Projects'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Only projects authorized for this account are shown.
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="secondary"
            onClick={() => setShowAddModal(true)}
            className="min-h-11 shrink-0"
          >
            + Add Client
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <ClientCarousel
        clients={activeClients}
        onClientArchived={handleArchive}
        onClientRestored={handleRestore}
        onClientPermanentlyDeleted={handlePermanentDelete}
        onClientUpdated={fetchClients}
      />

      {isAdmin && archivedClients.length > 0 && (
        <section className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
          <Button variant="ghost" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? 'Hide' : 'Show'} Archived Clients ({archivedClients.length})
          </Button>
          {showArchived && (
            <div className="mt-4">
              <ClientCarousel
                clients={archivedClients}
                onClientArchived={handleArchive}
                onClientRestored={handleRestore}
                onClientPermanentlyDeleted={handlePermanentDelete}
                onClientUpdated={fetchClients}
              />
            </div>
          )}
        </section>
      )}

      {isAdmin && showAddModal && (
        <AddClientModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onClientAdded={() => {
            fetchClients();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
