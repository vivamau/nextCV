import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export function useCandidates(filters) {
  const [data, setData] = useState({ total: 0, data: [], page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/candidates', { params: filters });
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}

export function useCandidate(id) {
  const [candidate, setCandidate] = useState(null);
  const [resume, setResume] = useState(null);
  const [skills, setSkills] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`/api/candidates/${id}`)
      .then(res => {
        // Handle both old and new response structures just in case
        if (res.data.candidate) {
          setCandidate(res.data.candidate);
          setResume(res.data.resume);
          setSkills(res.data.skills);
          setVacancies(res.data.vacancies || []);
        } else {
          setCandidate(res.data);
          // Fallback if resume/skills weren't bundled yet
          setVacancies([]);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { candidate, resume, skills, vacancies, loading, error };
}

export function useStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/candidates/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
