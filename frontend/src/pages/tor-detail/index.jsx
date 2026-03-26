import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink, Sparkles, Loader, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTor, useTorSkills, extractTorSkills, saveTorSkills } from '../../hooks/useTors';
import SkillWeightTag from '../tors/components/SkillWeightTag';

export default function TorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tor, loading } = useTor(id);
  const { skills, loading: loadingSkills, refetch: refetchSkills } = useTorSkills(id);
  const [localSkills, setLocalSkills] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractError, setExtractError] = useState(null);

  useEffect(() => {
    if (skills) setLocalSkills(skills);
  }, [skills]);

  const handleExtract = async () => {
    setExtracting(true); setExtractError(null);
    try { await extractTorSkills(id); await refetchSkills(); }
    catch (e) { setExtractError(e.response?.data?.error || e.message); }
    finally { setExtracting(false); }
  };

  const updateWeight = async (skillId, weight) => {
    const updated = localSkills.map(s => s.id === skillId ? { ...s, weight } : s);
    setLocalSkills(updated);
    setSaving(true);
    try {
      await saveTorSkills(id, updated.map(({ skill, weight }) => ({ skill, weight })));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!tor) return <p className="text-red-500">TOR not found</p>;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-700">
          <ArrowLeft size={15} /> Back
        </button>
        {saving && <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1"><Loader size={10} className="animate-spin" /> saving weights...</span>}
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{tor.name}</h1>
              {tor.file_name && <p className="text-xs text-gray-400 mt-0.5">{tor.file_name}</p>}
            </div>
          </div>
          <button
            onClick={handleExtract}
            disabled={extracting || !tor.file_name}
            title={tor.file_name ? 'Extract skills with LLM' : 'Upload a document first'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-600 hover:text-purple-700 hover:border-purple-300 disabled:opacity-40"
          >
            {extracting ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Extract Skills
          </button>
        </div>

        {tor.description && <p className="text-sm text-gray-600">{tor.description}</p>}

        {tor.va_link && (
          <a href={tor.va_link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <ExternalLink size={13} /> {tor.va_link}
          </a>
        )}
      </div>

      {/* Skills */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Requirements Weighting
            {!loadingSkills && <span className="ml-2 font-normal text-gray-400">({localSkills.length})</span>}
          </h2>
          <span className="text-[10px] text-gray-400 italic">Click weight to adjust (1-5)</span>
        </div>
        
        {extractError && <p className="text-xs text-red-500 mb-3">{extractError}</p>}
        {loadingSkills ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : localSkills.length === 0 ? (
          <p className="text-sm text-gray-400">No skills extracted yet. Click "Extract Skills" to analyse the document.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {localSkills.map(s => (
              <SkillWeightTag 
                key={s.id} 
                skill={s.skill} 
                weight={s.weight} 
                onWeightChange={(w) => updateWeight(s.id, w)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Document content */}
      {tor.file_content && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Document Content</h2>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {tor.file_content}
          </pre>
        </div>
      )}
    </div>
  );
}
