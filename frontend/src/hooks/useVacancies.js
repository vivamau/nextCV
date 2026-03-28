import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export function useVacancies() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try { setVacancies((await axios.get('/api/vacancies')).data); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { vacancies, loading, error, refetch: fetch };
}

export function useVacancy(id) {
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`/api/vacancies/${id}`)
      .then(r => setVacancy(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  return { vacancy, loading };
}

export async function createVacancy(data) {
  return (await axios.post('/api/vacancies', data)).data;
}

export async function updateVacancy(id, data) {
  return (await axios.put(`/api/vacancies/${id}`, data)).data;
}

export async function deleteVacancy(id) {
  await axios.delete(`/api/vacancies/${id}`);
}

export function useVacancyCandidates(vacancyId) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!vacancyId) return;
    setLoading(true);
    try { setCandidates((await axios.get(`/api/vacancies/${vacancyId}/candidates`)).data); }
    finally { setLoading(false); }
  }, [vacancyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { candidates, loading, refetch: fetch };
}

export async function addCandidateToVacancy(vacancyId, candidateId) {
  await axios.post(`/api/vacancies/${vacancyId}/candidates/${candidateId}`);
}

export async function removeCandidateFromVacancy(vacancyId, candidateId) {
  await axios.delete(`/api/vacancies/${vacancyId}/candidates/${candidateId}`);
}

export async function addAllCandidatesToVacancy(vacancyId) {
  return (await axios.post(`/api/vacancies/${vacancyId}/candidates/add-all`)).data;
}

export async function importCvsForVacancy(vacancyId, file) {
  const form = new FormData();
  form.append('file', file);
  return (await axios.post(`/api/vacancies/${vacancyId}/import-cvs`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
}

export function useVacancyRanking(vacancyId, enabled = true) {
  const [ranking, setRanking] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (force = false) => {
    if (!vacancyId || (!enabled && !force)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/vacancies/${vacancyId}/rank`);
      // Convert array to map: { candidateId -> similarity }
      const map = {};
      res.data.forEach(r => { map[r.candidate_id] = r.similarity; });
      setRanking(map);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }, [vacancyId, enabled]);

  useEffect(() => { fetch(); }, [fetch]);
  return { ranking, loading, error, refetch: () => fetch(true) };
}

export function useSuggestedCandidates(vacancyId, enabled = true) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!vacancyId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/vacancies/${vacancyId}/rank-candidates`);
      setCandidates(res.data);
    } catch (e) {
      if (e.response?.status === 422) {
        setCandidates([]);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [vacancyId, enabled]);

  useEffect(() => { fetch(); }, [fetch]);
  return { candidates, loading, error, refetch: fetch };
}
