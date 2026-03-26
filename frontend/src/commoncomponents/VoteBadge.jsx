const COLORS = {
  yes: 'bg-green-100 text-green-700',
  no: 'bg-red-100 text-red-700',
  maybe: 'bg-yellow-100 text-yellow-700',
};

export default function VoteBadge({ vote }) {
  if (!vote) return <span className="text-gray-400">—</span>;
  const key = vote.toLowerCase();
  const cls = COLORS[key] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {vote}
    </span>
  );
}
