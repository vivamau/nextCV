import { useState } from 'react';
import { Plus, X, FileText } from 'lucide-react';
import { useTors, createTor, updateTor, deleteTor } from '../../hooks/useTors';
import TorForm from './components/TorForm';
import TorCard from './components/TorCard';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function TorsPage() {
  const { tors, loading, error, refetch } = useTors();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleCreate = async (fd) => {
    setSaving(true); setFormError(null);
    try {
      await createTor(fd);
      setShowCreate(false);
      refetch();
    } catch (e) {
      setFormError(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  const handleUpdate = async (fd) => {
    setSaving(true); setFormError(null);
    try {
      await updateTor(editing.id, fd);
      setEditing(null);
      refetch();
    } catch (e) {
      setFormError(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this TOR?')) return;
    await deleteTor(id);
    refetch();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Terms of Reference</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <Plus size={15} /> New TOR
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tors.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No TORs yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tors.map(tor => (
            <TorCard
              key={tor.id}
              tor={tor}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="New TOR" onClose={() => setShowCreate(false)}>
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
          <TorForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit TOR" onClose={() => setEditing(null)}>
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
          <TorForm
            initial={{ name: editing.name, description: editing.description || '', va_link: editing.va_link || '' }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}
