import { Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import CandidatesPage from './pages/candidates/index';
import CandidateDetailPage from './pages/candidate-detail/index';
import StatsPage from './pages/stats/index';
import TorsPage from './pages/tors/index';
import TorDetailPage from './pages/tor-detail/index';
import SettingsPage from './pages/settings/index';
import VacanciesPage from './pages/vacancies/index';
import VacancyDetailPage from './pages/vacancy-detail/index';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CandidatesPage />} />
        <Route path="/candidates/:id" element={<CandidateDetailPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/tors" element={<TorsPage />} />
        <Route path="/tors/:id" element={<TorDetailPage />} />
        <Route path="/vacancies" element={<VacanciesPage />} />
        <Route path="/vacancies/:id" element={<VacancyDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}
