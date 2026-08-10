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
  const email = payload?.email || '';
  const first = email.split('@')[0].split(/[._-]/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
}

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
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
      const res = await api.get('/api/clients', { meta: { silent: true } });
      setClients(normalizeToArray(res.data));
      setError('');
    } catch {
      setError('Could not load your authorized projects.');
      setClients([]);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => {
    if (role === 'external_viewer' && clients.length === 1) navigate(`/clients/${clients[0].id}`, { replace: true });
  }, [clients, navigate, role]);

  const handleDelete = async (id) => {
    if (!isAdmin || !window.confirm('Delete this client?')) return;
    try { await api.delete(`/api/clients/${id}`); fetchClients(); }
    catch { setError('Failed to delete client.'); }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/60 sm:px-7">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Gener8 Inventory</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Welcome{name ? `, ${name}` : ''}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Choose a project below to view inventory, or use the navigation above for scanning and other tools available to your account.
        </p>
      </section>

      <div className="mb-6 flex items-start justify-between gap-4 px-1 sm:items-center sm:px-0">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Inventory scopes</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{isAdmin ? 'Projects & Clients' : 'Your Projects'}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Only projects authorized for this account are shown.</p>
        </div>
        {isAdmin && <Button variant="secondary" onClick={() => setShowAddModal(true)} className="min-h-11 shrink-0">+ Add Client</Button>}
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
      <ClientCarousel clients={clients} onClientDeleted={handleDelete} onClientUpdated={fetchClients} />
      {isAdmin && showAddModal && <AddClientModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onClientAdded={() => { fetchClients(); setShowAddModal(false); }} />}
    </div>
  );
}
