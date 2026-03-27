import { useState, useEffect } from 'react';
import { ExternalLink, Pencil, Trash2, FileText, Sparkles, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTorSkills, extractTorSkills, saveTorSkills } from '../../../hooks/useTors';
import SkillWeightTag from './SkillWeightTag';
import { formatDate } from '../../../utils/dateUtils';

export default function TorCard({ tor, onEdit, onDelete }) {
  const navigate = useNavigate();
  const { skills, loading: loadingSkills, refetch } = useTorSkills(tor.id);
  const [localSkills, setLocalSkills] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractError, setExtractError] = useState(null);

  useEffect(() => {
    if (skills) setLocalSkills(skills);
  }, [skills]);

  const handleExtract = async (e) => {
    e.stopPropagation();
    setExtracting(true);
    setExtractError(null);
    try {
      await extractTorSkills(tor.id);
      await refetch();
    } catch (err) {
      setExtractError(err.response?.data?.error || err.message);
    } finally {
      setExtracting(false);
    }
  };

  const updateWeight = async (skillId, weight) => {
    const updated = localSkills.map(s => s.id === skillId ? { ...s, weight } : s);
    setLocalSkills(updated);
    setSaving(true);
    try {
      await saveTorSkills(tor.id, updated.map(({ skill, weight }) => ({ skill, weight })));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 relative">
      {saving && <div className="absolute top-2 right-12 text-[9px] uppercase font-bold text-gray-400 flex items-center gap-1 z-10"><Loader size={8} className="animate-spin" /> saving...</div>}
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-500 shrink-0" />
          <h3
            className="font-semibold text-gray-900 cursor-pointer hover:text-blue-700"
            onClick={() => navigate(`/tors/${tor.id}`)}
          >
            {tor.name}
          </h3>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={handleExtract}
            disabled={extracting || !tor.file_name}
            title={tor.file_name ? 'Extract skills with LLM' : 'Upload a document first'}
            className="p-1.5 text-gray-400 hover:text-purple-600 rounded disabled:opacity-30"
          >
            {extracting ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
          </button>
          <button onClick={() => onEdit(tor)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
            <Pencil size={15} />
          </button>
          <button onClick={() => onDelete(tor.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {tor.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{tor.description}</p>
      )}

      {/* Skills */}
      {extractError && (
        <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1">{extractError}</p>
      )}
      {loadingSkills ? (
        <p className="text-xs text-gray-400">Loading skills...</p>
      ) : localSkills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {localSkills.map(s => (
            <SkillWeightTag 
              key={s.id} 
              skill={s.skill} 
              weight={s.weight} 
              onWeightChange={(w) => updateWeight(s.id, w)} 
            />
          ))}
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto pt-1 border-t border-gray-50">
        {tor.file_name && (
          <span className="flex items-center gap-1 truncate">
            <FileText size={12} /> {tor.file_name}
          </span>
        )}
        {tor.va_link && (
          <a
            href={tor.va_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-blue-500 hover:underline shrink-0"
          >
            <ExternalLink size={12} /> VA Link
          </a>
        )}
        <span className="ml-auto shrink-0">{formatDate(tor.created_at)}</span>
      </div>
    </div>
  );
}
