import { Link } from 'react-router-dom';
import { Briefcase, Calendar, FileText, Pencil, Trash2, Users } from 'lucide-react';

function StatusBadge({ openedAt, closedAt }) {
  const now = new Date();
  const closed = closedAt && new Date(closedAt) < now;
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
      closed ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
    }`}>
      {closed ? 'Closed' : 'Open'}
    </span>
  );
}

export default function VacancyCard({ vacancy, onEdit, onDelete, onClick }) {
  return (
    <div
      onClick={() => onClick(vacancy.id)}
      className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-blue-500 shrink-0" />
          <h3 className="font-semibold text-gray-900">{vacancy.title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge openedAt={vacancy.opened_at} closedAt={vacancy.closed_at} />
          <button onClick={e => { e.stopPropagation(); onEdit(vacancy); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
            <Pencil size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(vacancy.id); }}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {vacancy.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{vacancy.description}</p>
      )}

      {vacancy.tor_name && (
        <div className="flex items-center gap-1.5">
          <Link
            to={`/tors/${vacancy.tor_id}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            <FileText size={11} /> {vacancy.tor_name}
          </Link>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto pt-1 border-t border-gray-50">
        {vacancy.opened_at && (
          <span className="flex items-center gap-1">
            <Calendar size={12} /> {new Date(vacancy.opened_at).toLocaleDateString()}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <Users size={12} /> candidates
        </span>
      </div>
    </div>
  );
}
