import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store';
import Navbar from '../components/layout/Navbar';
import ProgressLogger from '../components/progress/ProgressLogger';
import ProgressDashboard from '../components/progress/ProgressDashboard';
import ProgressCharts from '../components/progress/ProgressCharts';
import { Plus, TrendingUp } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
              <TrendingUp size={40} />
              {t('progress.title')}
            </h1>
            <p className="text-muted">{t('progress.subtitle')}</p>
          </div>

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
            userId={user?.id}
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
