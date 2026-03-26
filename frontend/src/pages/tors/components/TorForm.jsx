import { useState, useEffect, useRef } from 'react';
import { Upload, X } from 'lucide-react';

const EMPTY = { name: '', description: '', va_link: '' };

export default function TorForm({ initial, onSubmit, onCancel, loading }) {
  const [fields, setFields] = useState(initial || EMPTY);
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  useEffect(() => { setFields(initial || EMPTY); setFile(null); }, [initial]);

  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', fields.name.trim());
    fd.append('description', fields.description || '');
    fd.append('va_link', fields.va_link || '');
    if (file) fd.append('file', file);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
        <input
          required
          value={fields.name}
          onChange={set('name')}
          placeholder="e.g. Programme Associate P2"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
        <textarea
          value={fields.description}
          onChange={set('description')}
          rows={3}
          placeholder="Brief description of the position..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">VA Link</label>
        <input
          type="url"
          value={fields.va_link}
          onChange={set('va_link')}
          placeholder="https://..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">TOR Document</label>
        <div
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-gray-300 rounded-md px-4 py-5 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <Upload size={15} className="text-blue-500" />
              {file.name}
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                <X size={14} className="text-gray-400 hover:text-red-500" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Click to upload a TOR document (.txt, .pdf, .docx)</p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.pdf,.docx,.doc"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : initial ? 'Update TOR' : 'Create TOR'}
        </button>
      </div>
    </form>
  );
}
