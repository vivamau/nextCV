import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Calendar, FileText, UserPlus,
  X, Search, RefreshCw, Sparkles, Loader, AlertTriangle,
} from 'lucide-react';
import {
  useVacancy, useVacancyCandidates, useVacancyRanking, useSuggestedCandidates,
  addCandidateToVacancy, removeCandidateFromVacancy, addAllCandidatesToVacancy,
} from '../../hooks/useVacancies';
import { useCandidates } from '../../hooks/useCandidates';
import VacancyCandidateTable from './components/VacancyCandidateTable';
import axios from 'axios';
import { formatDate } from '../../utils/dateUtils';

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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Add Candidate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X size={18} /></button>
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
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
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
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 mt-1">
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
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.job_application}</p>
                    {c.skills_match_score && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" title="Initial AI Evaluator Score">
                        {c.skills_match_score}
                      </span>
                    )}
                    {c.similarity !== undefined && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        c.similarity >= 70 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : c.similarity >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                      }`} title="Semantic similarity with TOR">
                        {c.similarity}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.nationality} · {c.gender} · {c.age}</p>
                </div>
                <button
                  disabled={already || !!adding}
                  onClick={() => handle(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    already
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50'
                  }`}
                >
                  {already ? 'Added' : adding === c.id ? 'Adding...' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Extract Skills Confirmation Modal ---
function ExtractSkillsModal({ candidateCount, alreadyDone, onConfirm, onClose, extracting, progress }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Extract Skills — Bulk Operation</h2>
          </div>
          {!extracting && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            You are about to extract skills via AI for{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{candidateCount} candidate{candidateCount !== 1 ? 's' : ''}</span>{' '}
            that have not had AI extraction run yet.
            {alreadyDone > 0 && (
              <span className="block mt-1 text-xs text-gray-400">
                {alreadyDone} candidate{alreadyDone !== 1 ? 's' : ''} already have AI-extracted skills and will be skipped.
              </span>
            )}
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
            <p className="font-semibold flex items-center gap-1.5"><AlertTriangle size={13} /> Before you proceed:</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-400">
              <li>Each candidate requires a separate LLM call — this will take a while.</li>
              <li>Cloud models (e.g. Gemini) will consume API credits for every call.</li>
              <li>Candidates without a resume will be skipped automatically.</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
            💡 To reduce costs, switch to a <span className="font-semibold">local Ollama model</span> in{' '}
            <Link to="/settings" className="underline hover:text-blue-900 dark:hover:text-blue-100">Settings</Link>{' '}
            before running this operation.
          </div>

          {extracting && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Extracting skills…</span>
                <span>{progress.done}/{progress.total} ({progress.skipped} skipped{progress.failed > 0 ? `, ${progress.failed} failed` : ''})</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
              {progress.current && (
                <p className="text-[11px] text-gray-400 truncate">Processing: {progress.current}</p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          {!extracting ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Sparkles size={14} /> Extract for {candidateCount} candidate{candidateCount !== 1 ? 's' : ''}
              </button>
            </>
          ) : (
            <button disabled className="flex items-center gap-1.5 px-4 py-2 text-sm bg-purple-600/50 text-white rounded-md cursor-not-allowed">
              <Loader size={14} className="animate-spin" /> Extracting…
            </button>
          )}
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
  const { ranking: initialRanking } = useVacancyRanking(id, !!vacancy?.tor_id);
  const [ranking, setRanking] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [reranking, setReranking] = useState(false);
  const [rankingError, setRankingError] = useState(null);
  const [visibleCandidates, setVisibleCandidates] = useState([]);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, skipped: 0, failed: 0, current: '' });

  // Sync initial ranking from hook into local state
  useEffect(() => {
    setRanking(initialRanking);
  }, [initialRanking]);

  const handleRerank = async () => {
    setReranking(true);
    setRankingError(null);
    try {
      const res = await axios.get(`/api/vacancies/${id}/rank`);
      const map = {};
      res.data.forEach(r => { map[r.candidate_id] = r.similarity; });
      setRanking(map);
    } catch (e) {
      setRankingError(e.response?.data?.error || e.message);
    } finally {
      setReranking(false);
    }
  };

  const candidatesWithoutSkills = visibleCandidates.filter(c => !c.has_ai_skills);

  const handleExtractSkills = async () => {
    const toProcess = visibleCandidates.filter(c => !c.has_ai_skills);
    setExtracting(true);
    setProgress({ done: 0, total: toProcess.length, skipped: 0, failed: 0, current: '' });
    let skipped = 0, failed = 0;
    for (let i = 0; i < toProcess.length; i++) {
      const c = toProcess[i];
      setProgress(p => ({ ...p, current: c.job_application || `#${c.id}` }));
      try {
        await axios.post(`/api/candidates/${c.id}/extract-skills`);
      } catch (e) {
        if (e.response?.status === 400) skipped++;
        else failed++;
      }
      setProgress(p => ({ ...p, done: i + 1, skipped, failed }));
    }
    setExtracting(false);
    if (toProcess.length > 0) refetch();
  };

  const handleRemove = async (candidateId) => {
    setRemoving(candidateId);
    try { await removeCandidateFromVacancy(id, candidateId); await refetch(); }
    finally { setRemoving(null); }
  };

  if (loadingVacancy) return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;
  if (!vacancy) return <p className="text-red-500">Vacancy not found</p>;

  const existingIds = new Set(candidates.map(c => c.id));
  const isOpen = !vacancy.closed_at || new Date(vacancy.closed_at) >= new Date();

  return (
    <div className="w-full space-y-5">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{vacancy.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isOpen ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        </div>

        {vacancy.description && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{vacancy.description}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          {vacancy.tor_name && (
            <span className="flex items-center gap-1.5">
              <FileText size={13} /> TOR:{' '}
              <Link to={`/tors/${vacancy.tor_id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                {vacancy.tor_name}
              </Link>
            </span>
          )}
          {vacancy.opened_at && (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} /> Opened: {formatDate(vacancy.opened_at)}
            </span>
          )}
          {vacancy.closed_at && (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} /> Closed: {formatDate(vacancy.closed_at)}
            </span>
          )}
        </div>
      </div>

      {/* Candidates section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">
            Candidates
            <span className="ml-2 text-sm font-normal text-gray-400">({candidates.length})</span>
          </h2>
          <div className="flex items-center gap-4">
            {vacancy.tor_id && (
              <>
                <span className="text-xs text-gray-400 dark:text-gray-500">Skills matched · Semantic similarity vs TOR</span>
                {rankingError && (
                  <span className="text-xs text-red-500" title={rankingError}>⚠ Re-rank failed</span>
                )}
                <button
                  onClick={handleRerank}
                  disabled={reranking}
                  title="Re-run semantic ranking for all candidates"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 disabled:opacity-40 transition-colors"
                >
                  <RefreshCw size={13} className={reranking ? 'animate-spin' : ''} />
                  Re-Rank
                </button>
              </>
            )}
            <button
              onClick={() => setShowExtractModal(true)}
              disabled={candidatesWithoutSkills.length === 0}
              title={candidatesWithoutSkills.length === 0 ? 'All visible candidates already have AI-extracted skills' : `Extract skills for ${candidatesWithoutSkills.length} candidate(s) without AI skills`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600 disabled:opacity-40 transition-colors"
            >
              <Sparkles size={13} />
              Extract Skills{candidatesWithoutSkills.length > 0 && ` (${candidatesWithoutSkills.length})`}
            </button>
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
          <div className="px-6 py-10 text-center text-gray-400 dark:text-gray-500">
            <span className="inline-block p-3 rounded-full bg-gray-50 dark:bg-gray-700 mb-2">
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
            totalPotentialScore={vacancy?.total_potential_score || 0}
            onVisibleCandidates={setVisibleCandidates}
          />
        )}
      </div>

      {showExtractModal && (
        <ExtractSkillsModal
          candidateCount={candidatesWithoutSkills.length}
          alreadyDone={visibleCandidates.length - candidatesWithoutSkills.length}
          onConfirm={handleExtractSkills}
          onClose={() => { if (!extracting) setShowExtractModal(false); }}
          extracting={extracting}
          progress={progress}
        />
      )}

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
