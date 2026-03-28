import { useNavigate } from 'react-router-dom';
import { Trash2, User, ChevronUp, ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function VacancyCandidateTable({ candidates, ranking, onRemove, removingId, totalPotentialScore = 0 }) {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState({ key: 'weighted_score', direction: 'desc' });
  const [filterType, setFilterType] = useState('all');

  const normalize = (score) => {
    if (!totalPotentialScore) return 0;
    return (score / totalPotentialScore) * 10;
  };

  const semanticValues = useMemo(() => {
    const vals = candidates.map(c => ranking[c.id]).filter(v => v !== undefined);
    if (!vals.length) return { min: 0, max: 0 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [candidates, ranking]);

  const normalizeSemantic = (val) => {
    const { min, max } = semanticValues;
    if (min === max) return 100;
    return Math.round(1 + ((val - min) / (max - min)) * 99);
  };

  const maxNormalized = useMemo(() => {
    if (!candidates.length) return 0;
    const scores = candidates.map(c => normalize(c.weighted_score || 0));
    return Math.max(...scores);
  }, [candidates, totalPotentialScore]);

  const threshold = maxNormalized / 2;

  const filteredCandidates = useMemo(() => {
    if (filterType === 'above_average') {
      return candidates.filter(c => normalize(c.weighted_score || 0) > threshold);
    }
    return candidates;
  }, [candidates, filterType, threshold]);

  const sortedCandidates = useMemo(() => {
    if (!sortConfig.key) return filteredCandidates;

    return [...filteredCandidates].sort((a, b) => {
      let aVal, bVal;

      if (sortConfig.key === 'semantic') {
        aVal = ranking[a.id] || 0;
        bVal = ranking[b.id] || 0;
      } else if (sortConfig.key === 'ai') {
        aVal = a.skills_match_score || '';
        bVal = b.skills_match_score || '';
      } else {
        aVal = a[sortConfig.key];
        bVal = b[sortConfig.key];
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const modifier = sortConfig.direction === 'asc' ? 1 : -1;
      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
      }
      return (aVal - bVal) * modifier;
    });
  }, [filteredCandidates, sortConfig, ranking]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey) return <div className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-30"><ChevronUp size={12} /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="ml-1 text-blue-500" /> : <ChevronDown size={12} className="ml-1 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-4">
          <label htmlFor="score-filter" className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Filter by Score:
          </label>
          <select
            id="score-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <option value="all">All Candidates ({candidates.length})</option>
            <option value="above_average">
              Top Tier (Score &gt; {threshold.toFixed(1)} normalized)
            </option>
          </select>
        </div>
        
        {filterType === 'above_average' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full border border-green-100 dark:border-green-800 animate-in fade-in slide-in-from-right-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Top Talent View Active</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
        <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
          <tr>
            <th
              className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-300 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer uppercase tracking-wider group"
              onClick={() => requestSort('id')}
            >
              <div className="flex items-center">ID <SortIcon colKey="id" /></div>
            </th>
            <th 
              className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-300 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer uppercase tracking-wider group"
              onClick={() => requestSort('type')}
            >
              <div className="flex items-center">Type <SortIcon colKey="type" /></div>
            </th>
            <th 
              className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-300 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer uppercase tracking-wider group"
              onClick={() => requestSort('age')}
            >
              <div className="flex items-center justify-center">Age <SortIcon colKey="age" /></div>
            </th>
            <th 
              className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-300 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer uppercase tracking-wider group"
              onClick={() => requestSort('wfp_jobs_applied')}
            >
              <div className="flex items-center justify-center">WFP Jobs <SortIcon colKey="wfp_jobs_applied" /></div>
            </th>
            <th 
              className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-300 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer uppercase tracking-wider group"
              onClick={() => requestSort('ai')}
            >
              <div className="flex items-center justify-center">WD <SortIcon colKey="ai" /></div>
            </th>
            <th 
              className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-300 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer uppercase tracking-wider group"
              onClick={() => requestSort('weighted_score')}
            >
              <div className="flex items-center justify-center">Score <SortIcon colKey="weighted_score" /></div>
            </th>
            <th 
              className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-300 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer uppercase tracking-wider group"
              onClick={() => requestSort('semantic')}
            >
              <div className="flex items-center justify-center">Semantic <SortIcon colKey="semantic" /></div>
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider">Skills Match</th>
            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
          {sortedCandidates.map(c => {
            const semanticScore = ranking[c.id];
            return (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors">
                <td className="px-4 py-3">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate(`/candidates/${c.id}`)}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <User size={14} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-blue-700 dark:text-blue-400 hover:underline">Candidate #{c.id}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.type}</td>
                <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{c.age}</td>
                <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{c.wfp_jobs_applied ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  {c.skills_match_score ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      {c.skills_match_score}
                    </span>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {c.weighted_score !== undefined ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      {normalize(c.weighted_score).toFixed(1)}
                    </span>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {semanticScore !== undefined ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      normalizeSemantic(semanticScore) >= 70 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : normalizeSemantic(semanticScore) >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                    }`}>
                      {normalizeSemantic(semanticScore)}%
                    </span>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[250px]">
                    {(() => {
                      const skills = Array.isArray(c.matched_skills)
                        ? c.matched_skills
                        : typeof c.matched_skills === 'string'
                          ? c.matched_skills.split(',').map(s => ({ skill: s.trim(), llm_extracted: 0 }))
                          : [];
                      return skills.length > 0 ? (
                        skills.map((skillObj, index) => (
                          <span
                            key={`${skillObj.skill}-${index}`}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              skillObj.llm_extracted
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            }`}
                            title={skillObj.llm_extracted ? 'AI-extracted skill' : 'Manually added skill'}
                          >
                            {skillObj.skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-[10px] italic">No skill match found</span>
                      );
                    })()}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={removingId === c.id}
                    onClick={() => onRemove(c.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
                    title="Remove candidate from vacancy"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

