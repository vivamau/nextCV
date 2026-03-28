import { Search } from 'lucide-react';

export default function Filters({ filters, onChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value, page: 1 });

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search name..."
          value={filters.search || ''}
          onChange={set('search')}
          className="pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-52 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>

    </div>
  );
}
