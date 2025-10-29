import { Plus, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/common/PageHeader';
import Navbar from '../components/layout/Navbar';
import ProgressCharts from '../components/progress/ProgressCharts';
import ProgressDashboard from '../components/progress/ProgressDashboard';
import ProgressLogger from '../components/progress/ProgressLogger';
import { useAuthStore } from '../store/authStore';

const ProgressPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [showLogger, setShowLogger] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    // TODO: Fetch from API
    setLoading(false);
  };

  const handleLogComplete = (newEntry) => {
    // Add new entry to progress data
    setProgressData((prev) => ({
      ...prev,
      entries: [newEntry, ...(prev?.entries || [])],
    }));
    setShowLogger(false);
  };

  return (
    <div className="min-h-screen main-bg">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between">
          <PageHeader
            title={t('progress.title')}
            description={t('progress.subtitle')}
            icon={<TrendingUp size={30} className="text-primary" strokeWidth={3} />}
          />

          <button
            onClick={() => setShowLogger(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            {t('progress.logToday')}
          </button>
        </div>

        {/* Logger Modal */}
        {showLogger && (
          <ProgressLogger
            userId={user?.uid ?? ''}
            onComplete={handleLogComplete}
            onCancel={() => setShowLogger(false)}
          />
        )}

        {/* Dashboard */}
        <ProgressDashboard progressData={progressData} loading={loading} />

        {/* Charts */}
        <div className="mt-8">
          <ProgressCharts progressData={progressData} />
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
