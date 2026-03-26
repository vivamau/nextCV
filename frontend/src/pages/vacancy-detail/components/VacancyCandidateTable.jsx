import { useNavigate } from 'react-router-dom';
import { Trash2, User } from 'lucide-react';

export default function VacancyCandidateTable({ candidates, ranking, onRemove, removingId }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Candidate</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nationality</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Age</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">WFP Jobs</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Skills Match</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Semantic</th>
            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {candidates.map(c => {
            const semanticScore = ranking[c.id];
            return (
              <tr key={c.id} className="hover:bg-gray-50 group transition-colors">
                <td className="px-4 py-3">
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate(`/candidates/${c.id}`)}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <User size={14} className="text-blue-500" />
                    </div>
                    <span className="font-medium text-blue-700 hover:underline">{c.job_application}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.type}</td>
                <td className="px-4 py-3 text-gray-500">{c.nationality}</td>
                <td className="px-4 py-3 text-center text-gray-500">{c.age}</td>
                <td className="px-4 py-3 text-center text-gray-500">{c.wfp_jobs_applied ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  {c.skills_match_score ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600">
                      {c.skills_match_score}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[250px]">
                    {c.skill_match_count > 0 ? (
                      c.matched_skills.split(', ').map(s => (
                        <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                        0 skills
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {semanticScore !== undefined ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      semanticScore >= 70 ? 'bg-green-100 text-green-700'
                      : semanticScore >= 40 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                      {semanticScore}%
                    </span>
                  ) : <span className="text-gray-300">—</span>}
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
  );
}
