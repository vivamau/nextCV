import { useState, useEffect } from 'react';
import { Settings, RefreshCw, CheckCircle, AlertCircle, Loader, Zap } from 'lucide-react';
import { useSettings, saveSettings, fetchOllamaModels, useTokenUsage } from '../../hooks/useSettings';

const PROVIDERS = [
  { value: 'none', label: 'None (disabled)' },
  { value: 'ollama', label: 'Ollama (local)' },
];

function StatusBadge({ status }) {
  if (!status) return null;
  const map = {
    saved:   { icon: CheckCircle,  cls: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800',  text: 'Settings saved' },
    error:   { icon: AlertCircle,  cls: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',        text: 'Failed to save' },
    unreachable: { icon: AlertCircle, cls: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800', text: 'Ollama unreachable' },
  };
  const { icon: Icon, cls, text } = map[status] || {};
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${cls}`}>
      <Icon size={13} /> {text}
    </span>
  );
}

function TokenUsagePanel() {
  const { summary, loading } = useTokenUsage();

  if (loading) return <p className="text-sm text-gray-400 dark:text-gray-500">Loading token usage...</p>;
  if (!summary) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-yellow-500" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Token Usage</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: summary.totalTokens },
          { label: 'Prompt', value: summary.totalPromptTokens },
          { label: 'Completion', value: summary.totalCompletionTokens },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{value.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {summary.byModel.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">By Provider &amp; Model</p>
          <div className="space-y-1.5">
            {summary.byModel.map(row => (
              <div key={`${row.provider}/${row.model}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">{row.provider}</span>
                  <span className="text-gray-700 dark:text-gray-300 truncate">{row.model}</span>
                </div>
                <div className="shrink-0 ml-2 text-right">
                  <span className="text-gray-600 dark:text-gray-300">{row.total_tokens.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 ml-1">({row.count} calls · ↑{row.prompt_tokens.toLocaleString()} ↓{row.completion_tokens.toLocaleString()})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.byOperation.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">By Operation</p>
          <div className="space-y-1.5">
            {summary.byOperation.map(row => (
              <div key={row.operation} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 capitalize">{row.operation.replace(/_/g, ' ')}</span>
                <span className="text-gray-500 dark:text-gray-400 shrink-0 ml-2">{row.total_tokens.toLocaleString()} <span className="text-[10px] text-gray-400">({row.count} calls)</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.totalTokens === 0 && (
        <p className="text-sm text-gray-400 italic">No token usage recorded yet.</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, loading } = useSettings();

  const [provider, setProvider] = useState('none');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  // Populate form once settings load
  useEffect(() => {
    if (!settings) return;
    setProvider(settings.llm_provider || 'none');
    setOllamaUrl(settings.ollama_url || 'http://localhost:11434');
    setApiKey(settings.ollama_api_key || '');
    setModel(settings.llm_model || '');
  }, [settings]);

  const loadModels = async (url = ollamaUrl) => {
    setLoadingModels(true);
    setStatus(null);
    try {
      const list = await fetchOllamaModels(url);
      setModels(list);
      if (list.length && !list.includes(model)) setModel(list[0]);
    } catch {
      setModels([]);
      setStatus('unreachable');
    } finally {
      setLoadingModels(false);
    }
  };

  // Auto-load models when provider switches to ollama
  useEffect(() => {
    if (provider === 'ollama') loadModels();
  }, [provider]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await saveSettings({ llm_provider: provider, llm_model: model, ollama_url: ollamaUrl, ollama_api_key: apiKey });
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings size={20} className="text-gray-500 dark:text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Settings</h1>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">LLM Configuration</h2>

          {/* Provider */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Provider
              </label>
              <select
                value={provider}
                onChange={e => { setProvider(e.target.value); setModel(''); setStatus(null); }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Ollama-specific fields */}
            {provider === 'ollama' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Ollama URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={ollamaUrl}
                      onChange={e => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => loadModels(ollamaUrl)}
                      disabled={loadingModels}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={loadingModels ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    API Key <span className="normal-case font-normal text-gray-400">(required for cloud models)</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Leave empty for local models"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  {loadingModels ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader size={14} className="animate-spin" /> Loading models...
                    </div>
                  ) : models.length > 0 ? (
                    <select
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      required
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Select a model...</option>
                      {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                      No models found. Make sure Ollama is running and click Refresh.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <StatusBadge status={status} />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader size={14} className="animate-spin" /> : null}
            Save Settings
          </button>
        </div>
      </form>

      <TokenUsagePanel />
    </div>
  );
}
