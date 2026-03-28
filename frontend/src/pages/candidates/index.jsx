import { useState } from 'react';
import axios from 'axios';
import { Database, Loader } from 'lucide-react';
import { useCandidates } from '../../hooks/useCandidates';
import Filters from './components/Filters';
import CandidateTable from './components/CandidateTable';
import Pagination from './components/Pagination';

export default function CandidatesPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, sort_by: 'job_application', sort_dir: 'asc' });
  const { data, total, page, limit, loading, error } = useCandidates(filters);
  const [indexing, setIndexing] = useState(false);
  const [indexMsg, setIndexMsg] = useState('');

  const handleSort = (sort_by, sort_dir) => setFilters(f => ({ ...f, sort_by, sort_dir, page: 1 }));

  const handleIndexAll = async () => {
    setIndexing(true);
    setIndexMsg('');
    try {
      const res = await axios.post('/api/candidates/index-all');
      setIndexMsg(`Successfully indexed ${res.data.indexed} candidates.`);
      setTimeout(() => setIndexMsg(''), 5000);
    } catch (err) {
      setIndexMsg('Indexing failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Candidates</h1>
        <div className="flex items-center gap-3">
          {indexMsg && <span className="text-sm font-medium text-green-600">{indexMsg}</span>}
          <button
            onClick={handleIndexAll}
            disabled={indexing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md text-sm font-medium border border-blue-200 dark:border-blue-800 disabled:opacity-50"
            title="Index all candidates into LanceDB for semantic search"
          >
            {indexing ? <Loader size={16} className="animate-spin" /> : <Database size={16} />}
            {indexing ? 'Indexing...' : 'Index Candidates'}
          </button>
        </div>
      </div>
      <Filters filters={filters} onChange={setFilters} />

      {error && <p className="text-red-500 mb-3">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <CandidateTable candidates={data} sortBy={filters.sort_by} sortDir={filters.sort_dir} onSort={handleSort} />
          <Pagination
            page={page}
            limit={limit}
            total={total}
            onChange={(p) => setFilters(f => ({ ...f, page: p }))}
          />
        </>
      )}
    </div>
  );
}
