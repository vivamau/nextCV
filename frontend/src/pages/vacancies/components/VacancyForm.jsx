import { useState, useEffect } from 'react';
import { useTors } from '../../../hooks/useTors';

const EMPTY = { title: '', description: '', tor_id: '', opened_at: '', closed_at: '' };

export default function VacancyForm({ initial, onSubmit, onCancel, loading }) {
  const [fields, setFields] = useState(initial || EMPTY);
  const { tors } = useTors();

  useEffect(() => { setFields(initial || EMPTY); }, [initial]);

  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title: fields.title.trim(),
      description: fields.description || null,
      tor_id: fields.tor_id || null,
      opened_at: fields.opened_at || null,
      closed_at: fields.closed_at || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Title *</label>
        <input
          required value={fields.title} onChange={set('title')}
          placeholder="e.g. Programme Associate P2"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
        <textarea
          value={fields.description || ''} onChange={set('description')} rows={3}
          placeholder="Brief description of the vacancy..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Associated TOR</label>
        <select
          value={fields.tor_id || ''} onChange={set('tor_id')}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">None</option>
          {tors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Opened</label>
          <input
            type="date" value={fields.opened_at || ''} onChange={set('opened_at')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Closed</label>
          <input
            type="date" value={fields.closed_at || ''} onChange={set('closed_at')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
            Cancel
          </button>
        )}
        <button
          type="submit" disabled={loading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : initial ? 'Update' : 'Create Vacancy'}
        </button>
      </div>
    </form>
  );
}
