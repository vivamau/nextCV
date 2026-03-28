import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Loader, CheckCircle, AlertTriangle } from 'lucide-react';
import { importCvsForVacancy } from '../../../hooks/useVacancies';

export default function ImportCvsModal({ vacancyId, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const res = await importCvsForVacancy(vacancyId, file);
      setResult(res);
      onImported();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Import CVs from Excel</h2>
          </div>
          {!importing && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Upload an Excel file (.xlsx) to import candidates and link them to this vacancy.
                Existing candidates matched by name will be reused — no duplicates will be created.
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => !importing && inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                } ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={e => handleFile(e.target.files[0])}
                  disabled={importing}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                    <FileSpreadsheet size={20} />
                    <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload size={24} className="mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Drop an .xlsx file here or <span className="text-blue-600 dark:text-blue-400">click to browse</span>
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <CheckCircle size={40} className="mx-auto text-green-500" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Import complete</p>
              <div className="flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.imported}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">candidates processed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.linked}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">linked to vacancy</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          {result ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Done
            </button>
          ) : (
            <>
              {!importing && (
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                  Cancel
                </button>
              )}
              <button
                disabled={!file || importing}
                onClick={handleImport}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <><Loader size={14} className="animate-spin" /> Importing…</>
                ) : (
                  <><Upload size={14} /> Import</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
