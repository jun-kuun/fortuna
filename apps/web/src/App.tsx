import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/Layout';
import DashboardPage from '@/pages/DashboardPage';
import AssetsPage from '@/pages/AssetsPage';
import TransactionsPage from '@/pages/TransactionsPage';
import StrategyPage from '@/pages/StrategyPage';
import InsightsPage from '@/pages/InsightsPage';
import NewsPage from './pages/NewsPage';

export default function App() {
  return (
    <Layout>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/strategy" element={<StrategyPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/news" element={<NewsPage />} />
      </Routes>
    </Layout>
  );
}
