import { useStats } from '../../hooks/useCandidates';

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

const VOTE_COLORS = { yes: 'bg-green-500', no: 'bg-red-500', maybe: 'bg-yellow-400' };

export default function StatsPage() {
  const { stats, loading } = useStats();

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

        <Section title="Gender">
          {stats.genders.map(g => (
            <StatBar key={g.gender} label={g.gender || 'Unknown'} count={g.count} total={stats.total} color="bg-purple-500" />
          ))}
        </Section>

        <Section title="Mau Votes">
          {stats.mauVotes.map(v => (
            <StatBar
              key={v.mau_vote}
              label={v.mau_vote || 'No vote'}
              count={v.count}
              total={stats.total}
              color={VOTE_COLORS[v.mau_vote?.toLowerCase()] || 'bg-gray-400'}
            />
          ))}
        </Section>

        <Section title="Luke Votes">
          {stats.lukeVotes.map(v => (
            <StatBar
              key={v.luke_vote}
              label={v.luke_vote || 'No vote'}
              count={v.count}
              total={stats.total}
              color={VOTE_COLORS[v.luke_vote?.toLowerCase()] || 'bg-gray-400'}
            />
          ))}
        </Section>

        <Section title="Internal vs External">
          {stats.types.map(t => (
            <StatBar key={t.type} label={t.type || 'Unknown'} count={t.count} total={stats.total} color="bg-teal-500" />
          ))}
        </Section>
      </div>
    </div>
  );
}
