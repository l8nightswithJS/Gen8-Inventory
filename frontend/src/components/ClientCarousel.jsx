import { useState } from 'react';
import { Link } from 'react-router-dom';
import EditClientModal from './EditClientModal';
import ConfirmModal from './ConfirmModal';
import Button from './ui/Button';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function ClientCarousel({ clients, onClientUpdated, onClientDeleted }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const isAdmin = localStorage.getItem('role') === 'admin';

  const resolveLogo = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';
    return `${base}${path}`;
  };

  if (!clients.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">No projects available</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {isAdmin ? 'Add a project or inventory scope to get started.' : 'Your account has not been assigned to a project yet. Contact an administrator.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400 sm:hidden">
        Swipe to browse your authorized projects.
      </p>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-4" aria-label="Authorized projects">
        {clients.map((client) => {
          const access = client.access_level || 'edit';
          return (
            <article key={client.id} className="min-w-[82vw] max-w-sm snap-start rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 sm:min-w-0 sm:max-w-none">
              <Link to={`/clients/${client.id}`} className="block rounded-t-2xl p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500" aria-label={`Open ${client.name}${access === 'read' ? ', read only' : ''}`}>
                <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  {client.logo_url ? (
                    <img src={resolveLogo(client.logo_url)} alt={`${client.name} logo`} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white" aria-hidden="true">
                      {client.name?.slice(0, 2).toUpperCase() || 'G8'}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{client.name}</h2>
                    {!isAdmin && (
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${access === 'read' ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'}`}>
                        {access === 'read' ? 'Read Only' : 'Edit Access'}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Open →</span>
                </div>
              </Link>
              {isAdmin && (
                <div className="flex justify-end gap-1 border-t border-slate-200 px-3 py-2 dark:border-slate-700">
                  <Button onClick={() => setEditing(client)} variant="ghost" size="sm" aria-label={`Edit ${client.name}`}><FiEdit2 aria-hidden="true" /></Button>
                  <Button onClick={() => setDeleting(client)} variant="ghost" size="sm" className="text-rose-600" aria-label={`Delete ${client.name}`}><FiTrash2 aria-hidden="true" /></Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {editing && <EditClientModal client={editing} onClose={() => setEditing(null)} onUpdated={onClientUpdated} />}
      {deleting && (
        <ConfirmModal title={`Delete "${deleting.name}"?`} message="All inventory items for this client will also be deleted. This cannot be undone." onCancel={() => setDeleting(null)} onConfirm={async () => { await onClientDeleted(deleting.id); setDeleting(null); }} />
      )}
    </div>
  );
}
