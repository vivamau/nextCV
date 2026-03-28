import { useState, useEffect } from 'react';
import axios from 'axios';

export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return { settings, loading, error, refetch: fetch };
}

export async function saveSettings(data) {
  const res = await axios.put('/api/settings', data);
  return res.data;
}

export async function fetchOllamaModels(url) {
  const res = await axios.get('/api/settings/ollama/models', { params: { url } });
  return res.data;
}

export function useTokenUsage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/settings/token-usage/summary');
      setSummary(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refetch(); }, []);

  return { summary, loading, error, refetch };
}
