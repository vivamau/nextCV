import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export function useTors() {
  const [tors, setTors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/tors');
      setTors(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { tors, loading, error, refetch: fetch };
}

export function useTor(id) {
  const [tor, setTor] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`/api/tors/${id}`)
      .then(r => setTor(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  return { tor, loading };
}

export async function createTor(formData) {
  const res = await axios.post('/api/tors', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateTor(id, formData) {
  const res = await axios.put(`/api/tors/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteTor(id) {
  await axios.delete(`/api/tors/${id}`);
}

export async function extractTorSkills(id) {
  const res = await axios.post(`/api/tors/${id}/extract-skills`);
  return res.data;
}
export async function saveTorSkills(id, skills) {
  const res = await axios.put(`/api/tors/${id}/skills`, { skills });
  return res.data;
}

export function useTorSkills(id) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/tors/${id}/skills`);
      setSkills(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { skills, loading, refetch: fetch };
}
