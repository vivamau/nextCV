import { useState } from 'react';
import { Plus, X, Briefcase } from 'lucide-react';
import { useVacancies, createVacancy, updateVacancy, deleteVacancy } from '../../hooks/useVacancies';
import VacancyForm from './components/VacancyForm';
import VacancyCard from './components/VacancyCard';
import { useNavigate } from 'react-router-dom';

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

export default function VacanciesPage() {
  const { vacancies, loading, error, refetch } = useVacancies();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleCreate = async (data) => {
    setSaving(true); setFormError(null);
    try { await createVacancy(data); setShowCreate(false); refetch(); }
    catch (e) { setFormError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (data) => {
    setSaving(true); setFormError(null);
    try { await updateVacancy(editing.id, data); setEditing(null); refetch(); }
    catch (e) { setFormError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vacancy?')) return;
    await deleteVacancy(id);
    refetch();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Vacancies</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <Plus size={15} /> New Vacancy
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : vacancies.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No vacancies yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vacancies.map(v => (
            <VacancyCard
              key={v.id}
              vacancy={v}
              onEdit={setEditing}
              onDelete={handleDelete}
              onClick={(id) => navigate(`/vacancies/${id}`)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="New Vacancy" onClose={() => setShowCreate(false)}>
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
          <VacancyForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Vacancy" onClose={() => setEditing(null)}>
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
          <VacancyForm
            initial={{
              title: editing.title,
              description: editing.description || '',
              tor_id: editing.tor_id || '',
              opened_at: editing.opened_at ? editing.opened_at.split('T')[0] : '',
              closed_at: editing.closed_at ? editing.closed_at.split('T')[0] : '',
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}
