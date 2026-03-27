import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Sparkles, Loader, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { useCandidate, extractCandidateSkills, extractCandidateLinks } from '../../hooks/useCandidates';
import VoteBadge from '../../commoncomponents/VoteBadge';

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value || '—'}</dd>
    </div>
  );
}

export default function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { candidate, resume, skills, vacancies, links, loading, error, refetch, refetchLinks } = useCandidate(id);

  const [extractingSkills, setExtractingSkills] = useState(false);
  const [extractingLinks, setExtractingLinks] = useState(false);
  const [extractError, setExtractError] = useState(null);

  const handleExtractSkills = async () => {
    setExtractingSkills(true);
    setExtractError(null);
    try {
      await extractCandidateSkills(id);
      await refetch();
    } catch (e) {
      setExtractError(e.response?.data?.error || e.message);
    } finally {
      setExtractingSkills(false);
    }
  };

  const handleExtractLinks = async () => {
    setExtractingLinks(true);
    setExtractError(null);
    try {
      await extractCandidateLinks(id);
      await refetchLinks();
    } catch (e) {
      setExtractError(e.response?.data?.error || e.message);
    } finally {
      setExtractingLinks(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!candidate) return null;

  return (
    <div className="max-w-3xl space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-700"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={22} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {candidate.name || candidate.job_application}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Candidate #{candidate.id}</span>
                <span>•</span>
                <span>{candidate.type}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExtractSkills}
              disabled={extractingSkills}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-600 hover:text-purple-700 hover:border-purple-300 disabled:opacity-40 transition-colors"
            >
              {extractingSkills ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Extract Skills
            </button>
            <button
              onClick={handleExtractLinks}
              disabled={extractingLinks}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-600 hover:text-blue-700 hover:border-blue-300 disabled:opacity-40 transition-colors"
            >
              {extractingLinks ? <Loader size={14} className="animate-spin" /> : <LinkIcon size={14} />}
              Extract Links
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-5 mb-6">
          <Field label="Nationality" value={candidate.nationality} />
          <Field label="Gender" value={candidate.gender} />
          <Field label="Age" value={candidate.age} />
          <Field label="Language" value={candidate.language_skill} />
          <Field label="WFP Jobs Applied" value={candidate.wfp_jobs_applied} />
          <Field label="AI Evaluator Score" value={candidate.skills_match_score} />
        </dl>

        {/* Vote sections removed */}
      </div>

      {/* Applied Vacancies & Match Scores */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Applied Vacancies & Match Scores</h3>
          <span className="text-xs text-gray-400">({vacancies.length})</span>
        </div>
        {vacancies.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No vacancies linked to this candidate.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {vacancies.map(v => (
              <div key={v.id} className="p-4 px-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer" 
                       onClick={() => navigate(`/vacancies/${v.id}`)}>
                      {v.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                      {v.skills_match_score && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-100 bg-indigo-50 text-indigo-600">
                          {v.skills_match_score}
                        </span>
                      )}
                      {v.similarity !== null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          v.similarity >= 70 ? 'bg-green-100 text-green-700'
                          : v.similarity >= 40 ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}>
                          {v.similarity}%
                        </span>
                      )}
                      {v.matched_skills && (
                        <div className="flex flex-wrap gap-1 mt-1 border-l-2 border-purple-100 pl-2 ml-1 max-w-[250px]">
                          {v.matched_skills.split(', ').map(s => (
                            <span key={s} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 whitespace-nowrap">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Added At</p>
                    <p className="text-xs text-gray-600">{new Date(v.added_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Skills</h3>
          {extractError && <span className="text-xs text-red-500">{extractError}</span>}
        </div>
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No skills extracted. Click "Extract Skills" in the header to parse the resume.</p>
        )}
      </div>
 
      {/* Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Links</h3>
          {extractError && <span className="text-xs text-red-500">{extractError}</span>}
        </div>
        {links.length > 0 ? (
          <div className="space-y-2">
            {links.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <LinkIcon size={16} className="text-gray-500 group-hover:text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 capitalize">{link.platform}</p>
                  {link.username && (
                    <p className="text-xs text-gray-500">@{link.username}</p>
                  )}
                </div>
                <span className="text-xs text-blue-600 group-hover:text-blue-700">Open →</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No links extracted. Click "Extract Links" in the header to parse resume.</p>
        )}
      </div>

      {/* Resume */}
      {resume?.resume_text && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Resume / CV</h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {resume.resume_text}
          </pre>
        </div>
      )}
    </div>
  );
}
