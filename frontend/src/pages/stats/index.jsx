import { useStats } from '../../hooks/useCandidates';
import { useTokenUsage } from '../../hooks/useSettings';
import { Zap } from 'lucide-react';

function StatBar({ label, count, total, color = 'bg-blue-500' }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 truncate text-gray-700 dark:text-gray-200">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right text-gray-500 dark:text-gray-400">{count} ({pct}%)</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function TokenSection({ summary }) {
  const total = summary.totalTokens;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 md:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} className="text-yellow-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Token Usage</h3>
        <span className="ml-auto text-xs text-gray-400">{total.toLocaleString()} total</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-gray-400 italic">No token usage recorded yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {summary.byModel.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">By Provider &amp; Model</p>
              <div className="space-y-2.5">
                {summary.byModel.map(r => {
                  const pct = total ? Math.round((r.total_tokens / total) * 100) : 0;
                  return (
                    <div key={`${r.provider}/${r.model}`} className="flex items-center gap-3 text-sm">
                      <div className="w-40 min-w-0 flex items-center gap-1.5">
                        <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">{r.provider}</span>
                        <span className="truncate text-gray-700 dark:text-gray-200">{r.model}</span>
                      </div>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-right text-gray-500 dark:text-gray-400 shrink-0">
                        {r.total_tokens.toLocaleString()} <span className="text-[10px] text-gray-400">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {summary.byOperation.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">By Operation</p>
              <div className="space-y-2.5">
                {summary.byOperation.map(r => {
                  const pct = total ? Math.round((r.total_tokens / total) * 100) : 0;
                  return (
                    <div key={r.operation} className="flex items-center gap-3 text-sm">
                      <span className="w-40 truncate capitalize text-gray-700 dark:text-gray-200">{r.operation.replace(/_/g, ' ')}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-indigo-400 h-2.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-right text-gray-500 dark:text-gray-400 shrink-0">
                        {r.total_tokens.toLocaleString()} <span className="text-[10px] text-gray-400">({r.count})</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const { stats, loading } = useStats();
  const { summary: tokenSummary } = useTokenUsage();

  if (loading || !stats) return <p className="text-gray-500 dark:text-gray-400">Loading stats...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Statistics</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Total candidates: <strong>{stats.total}</strong></p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section title="Top Nationalities">
          {stats.nationalities.map(n => (
            <StatBar key={n.nationality} label={n.nationality || 'Unknown'} count={n.count} total={stats.total} />
          ))}
        </Section>

        <Section title="Age Groups">
          {(stats.ageGroups || []).map(a => (
            <StatBar key={a.age_group} label={a.age_group} count={a.count} total={stats.total} color="bg-orange-400" />
          ))}
        </Section>

        <Section title="Internal vs External">
          {stats.types.map(t => (
            <StatBar key={t.type} label={t.type || 'Unknown'} count={t.count} total={stats.total} color="bg-teal-500" />
          ))}
        </Section>

        <Section title="Gender">
          {stats.genders.map(g => (
            <StatBar key={g.gender} label={g.gender || 'Unknown'} count={g.count} total={stats.total} color="bg-purple-500" />
          ))}
        </Section>

        {tokenSummary && <TokenSection summary={tokenSummary} />}
      </div>
    </div>
  );
}
