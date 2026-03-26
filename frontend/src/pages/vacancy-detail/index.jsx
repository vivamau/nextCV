import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Calendar, FileText, UserPlus,
  X, Search,
} from 'lucide-react';
import {
  useVacancy, useVacancyCandidates, useVacancyRanking, useSuggestedCandidates,
  addCandidateToVacancy, removeCandidateFromVacancy, addAllCandidatesToVacancy,
} from '../../hooks/useVacancies';
import { useCandidates } from '../../hooks/useCandidates';
import VacancyCandidateTable from './components/VacancyCandidateTable';

// --- Add Candidate Modal ---
function AddCandidateModal({ vacancyId, hasTor, existingIds, onClose, onAdded }) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(null);
  const { data: searchData, loading: searchLoading } = useCandidates({ search, limit: 30 });
  const { candidates: suggestedData, loading: suggestedLoading } = useSuggestedCandidates(vacancyId, hasTor && !search);

  const handle = async (candidateId) => {
    setAdding(candidateId);
    try {
      await addCandidateToVacancy(vacancyId, candidateId);
      onAdded();
    } finally { setAdding(null); }
  };

  const handleBulkAdd = async () => {
    if (!window.confirm('Add ALL candidates from the database to this vacancy?')) return;
    setAdding('all');
    try {
      const res = await addAllCandidatesToVacancy(vacancyId);
      alert(`Successfully added ${res.count} new candidates to this vacancy.`);
      onAdded();
      onClose(); // Close modal after bulk add
    } catch (err) {
      alert('Failed to add candidates: ' + err.message);
    } finally { setAdding(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Add Candidate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="px-6 pt-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700">
              <UserPlus size={16} />
              <span className="text-xs font-medium">Bulk Actions</span>
            </div>
            <button
              disabled={adding === 'all'}
              onClick={handleBulkAdd}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {adding === 'all' ? 'Adding All...' : 'Add All Candidates'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
          {(!search && hasTor) && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-1">
              Top Semantic Matches based on TOR
            </p>
          )}
          
          {(search ? searchLoading : (hasTor ? suggestedLoading : searchLoading)) ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading candidates...</p>
          ) : (search ? searchData : (hasTor ? suggestedData : searchData)).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No candidates found</p>
          ) : (search ? searchData : (hasTor ? suggestedData : searchData)).map(c => {
            const already = existingIds.has(c.id);
            return (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{c.job_application}</p>
                    {c.skills_match_score && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-indigo-100 bg-indigo-50 text-indigo-600" title="Initial AI Evaluator Score">
                        {c.skills_match_score}
                      </span>
                    )}
                    {c.similarity !== undefined && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        c.similarity >= 70 ? 'bg-green-100 text-green-700'
                        : c.similarity >= 40 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-400'
                      }`} title="Semantic similarity with TOR">
                        {c.similarity}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{c.nationality} · {c.gender} · {c.age}</p>
                </div>
                <button
                  disabled={already || !!adding}
                  onClick={() => handle(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    already 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50'
                  }`}
                >
                  {already ? 'Added' : adding === c.id ? 'Adding...' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2 text-sm text-gray-600 hover:text-gray-900">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main page ---
export default function VacancyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vacancy, loading: loadingVacancy } = useVacancy(id);
  const { candidates, loading: loadingCandidates, refetch } = useVacancyCandidates(id);
  const { ranking } = useVacancyRanking(id, !!vacancy?.tor_id);
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState(null);

  const handleRemove = async (candidateId) => {
    setRemoving(candidateId);
    try { await removeCandidateFromVacancy(id, candidateId); await refetch(); }
    finally { setRemoving(null); }
  };

  if (loadingVacancy) return <p className="text-gray-500">Loading...</p>;
  if (!vacancy) return <p className="text-red-500">Vacancy not found</p>;

  const existingIds = new Set(candidates.map(c => c.id));
  const isOpen = !vacancy.closed_at || new Date(vacancy.closed_at) >= new Date();

  return (
    <div className="w-full space-y-5">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-700">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{vacancy.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        </div>

        {vacancy.description && (
          <p className="mt-4 text-sm text-gray-600">{vacancy.description}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          {vacancy.tor_name && (
            <span className="flex items-center gap-1.5">
              <FileText size={13} /> TOR: {vacancy.tor_name}
            </span>
          )}
          {vacancy.opened_at && (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} /> Opened: {new Date(vacancy.opened_at).toLocaleDateString()}
            </span>
          )}
          {vacancy.closed_at && (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} /> Closed: {new Date(vacancy.closed_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Candidates section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">
            Candidates
            <span className="ml-2 text-sm font-normal text-gray-400">({candidates.length})</span>
          </h2>
          <div className="flex items-center gap-4">
            {vacancy.tor_id && (
              <span className="text-xs text-gray-400">Skills matched · Semantic similarity vs TOR</span>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <UserPlus size={14} /> Add
            </button>
          </div>
        </div>

        {loadingCandidates ? (
          <p className="text-gray-400 text-sm px-6 py-8 text-center">Loading...</p>
        ) : candidates.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400">
            <span className="inline-block p-3 rounded-full bg-gray-50 mb-2">
              <Briefcase size={32} className="opacity-30" />
            </span>
            <p className="text-sm border-t border-transparent">No candidates linked yet. Click Add to associate candidates.</p>
          </div>
        ) : (
          <VacancyCandidateTable 
            candidates={candidates} 
            ranking={ranking}
            onRemove={handleRemove}
            removingId={removing}
          />
        )}
      </div>

      {showAdd && (
        <AddCandidateModal
          vacancyId={id}
          hasTor={!!vacancy?.tor_id}
          existingIds={existingIds}
          onClose={() => setShowAdd(false)}
          onAdded={() => { refetch(); }}
        />
      )}
    </div>
  );
}
