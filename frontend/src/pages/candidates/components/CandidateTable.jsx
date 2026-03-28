import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const COLS = [
  { key: 'job_application', label: 'Candidate' },
  { key: 'type', label: 'Type' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'age', label: 'Age' },
  { key: 'wfp_jobs_applied', label: 'Jobs Applied' },
  { key: 'skills_match_score', label: 'Skills Match' },
];

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <ChevronsUpDown size={13} className="text-gray-400" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-blue-600" />
    : <ChevronDown size={13} className="text-blue-600" />;
}

export default function CandidateTable({ candidates, sortBy, sortDir, onSort }) {
  const navigate = useNavigate();

  const handleSort = (key) => {
    if (sortBy === key) {
      onSort(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <tr>
            {COLS.map(c => (
              <th
                key={c.key}
                onClick={() => handleSort(c.key)}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <span className="flex items-center gap-1">
                  {c.label}
                  <SortIcon col={c.key} sortBy={sortBy} sortDir={sortDir} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {candidates.map(c => (
            <tr
              key={c.id}
              onClick={() => navigate(`/candidates/${c.id}`)}
              className="hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-medium text-blue-700 dark:text-blue-400">{c.job_application}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.type}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.nationality}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.age}</td>
              <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{c.wfp_jobs_applied ?? '—'}</td>
              <td className="px-4 py-3"><SkillBadge score={c.skills_match_score} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkillBadge({ score }) {
  if (!score) return <span className="text-gray-400">—</span>;
  const colors = {
    Excellent: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    Good: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    Fair: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    Poor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };
  const cls = colors[score] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{score}</span>;
}
