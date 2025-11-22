import { Plus, TrendingUp, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import PageHeader from '../components/common/PageHeader';
import PeriodSetupWizard from '../components/progress/PeriodSetupWizard';
import PeriodTimeline from '../components/progress/PeriodTimeline';
import LogPeriodModal from '../components/progress/LogPeriodModal';
import EditPeriodModal from '../components/progress/EditPeriodModal';
import CycleDetailsModal from '../components/progress/CycleDetailsModal';
import DailyTrackingForm from '../components/progress/DailyTrackingForm';
import WeightTracker from '../components/progress/WeightTracker';
import GoalAchievementBanner from '../components/progress/GoalAchievementBanner';
import CycleInsightsCard from '../components/progress/CycleInsightsCard';
import WeeklySymptomForm from '../components/progress/WeeklySymptomForm';
import SymptomTrendsChart from '../components/progress/SymptomTrendsChart';
import WeeklySummariesDashboard from '../components/progress/WeeklySummariesDashboard';
import MonthlyReportsDashboard from '../components/progress/MonthlyReportsDashboard';
import { useAuthStore } from '../store/authStore';
import progressTrackerApi from '../services/progressTrackerApi';

const ProgressPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // Period tracking state
  const [periodSetupComplete, setPeriodSetupComplete] = useState(false);
  const [showPeriodSetup, setShowPeriodSetup] = useState(false);
  const [showLogPeriod, setShowLogPeriod] = useState(false);
  const [showEditPeriod, setShowEditPeriod] = useState(false);
  const [editMode, setEditMode] = useState<'new' | 'edit'>('new');
  const [editCycleData, setEditCycleData] = useState<any>(null);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'period' | 'daily' | 'weekly' | 'reports'>('period');
  const [periodRefreshTrigger, setPeriodRefreshTrigger] = useState(0);

  // Daily tracking state
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [dailyRefreshTrigger, setDailyRefreshTrigger] = useState(0);
  const [goalAchievementData, setGoalAchievementData] = useState<any>(null);
  const [showGoalBanner, setShowGoalBanner] = useState(false);

  // Ovulation tracking state (Phase 4)
  const [ovulationRefreshTrigger, setOvulationRefreshTrigger] = useState(0);

  // Weekly symptom tracking state (Phase 5)
  const [showWeeklySymptomForm, setShowWeeklySymptomForm] = useState(false);
  const [weeklyRefreshTrigger, setWeeklyRefreshTrigger] = useState(0);

  // Weekly summaries state (Phase 6)
  const [summariesRefreshTrigger] = useState(0);

  // Monthly reports state (Phase 7)
  const [reportsRefreshTrigger] = useState(0);
  const [reportsSubTab, setReportsSubTab] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (user?.uid) {
      checkPeriodSetup();
      checkGoalAchievement();
    }
  }, [user]);

  const checkGoalAchievement = async () => {
    if (!user?.uid) return;

    try {
      const response = await progressTrackerApi.getGoalAchievement(user.uid);
      if (response.success && response.data.goalAchieved && !response.data.bannerDismissed) {
        setGoalAchievementData(response.data);
        setShowGoalBanner(true);
      }
    } catch (error) {
      console.error('Failed to check goal achievement:', error);
    }
  };

  const checkPeriodSetup = async () => {
    if (!user?.uid) return;

    try {
      const response = await progressTrackerApi.getPeriodSetup(user.uid);
      if (response.success && response.data.setupCompleted) {
        setPeriodSetupComplete(true);
      } else {
        setShowPeriodSetup(true);
      }
    } catch (error) {
      console.error('Failed to check period setup:', error);
    }
  };

  const handlePeriodSetupComplete = () => {
    setPeriodSetupComplete(true);
    setShowPeriodSetup(false);
  };

  const handleLogPeriodSuccess = async () => {
    // Refresh timeline data
    checkPeriodSetup();
    setOvulationRefreshTrigger((prev) => prev + 1);
    setPeriodRefreshTrigger((prev) => prev + 1);

    // If a cycle details modal is open and we just edited a period, refresh that cycle's data
    if (selectedCycle && editMode === 'edit' && editCycleData?.cycleId) {
      try {
        // Fetch the updated cycle data
        const response = await progressTrackerApi.getCycles(user!.uid, 100);
        if (response.success && response.data) {
          const updatedCycle = response.data.find((c: any) => c.cycleId === editCycleData.cycleId);
          if (updatedCycle) {
            setSelectedCycle(updatedCycle); // Update the modal with fresh data
          }
        }
      } catch (error) {
        console.error('Failed to refresh cycle data:', error);
      }
    }
  };

  const handleEditLastPeriod = async () => {
    if (!user?.uid) return;

    try {
      // Fetch the most recent cycle (the last completed period)
      const response = await progressTrackerApi.getCycles(user.uid, 1);
      if (response.success && response.data.length > 0) {
        // Get the most recent cycle
        const lastCycle = response.data[response.data.length - 1];
        setEditCycleData(lastCycle);
        setShowEditPeriod(true);
      } else {
        toast.error('No periods found to edit.');
      }
    } catch (error) {
      console.error('Failed to fetch last cycle for editing:', error);
      toast.error('Failed to load period data for editing.');
    }
  };

  const handleCycleClick = (cycle: any) => {
    setSelectedCycle(cycle);
  };

  const handleInsightsGenerated = () => {
    // Refresh cycle data if needed
    setSelectedCycle(null);
  };

  const handleDailyTrackingSuccess = () => {
    setShowDailyForm(false);
    setDailyRefreshTrigger((prev) => prev + 1);
    setOvulationRefreshTrigger((prev) => prev + 1); // Refresh ovulation data when daily tracking is updated
    checkGoalAchievement(); // Check if goal was achieved with new data
  };

  const handleGoalBannerDismiss = () => {
    setShowGoalBanner(false);
    setGoalAchievementData(null);
  };

  const handleWeeklySymptomSuccess = () => {
    setShowWeeklySymptomForm(false);
    setWeeklyRefreshTrigger((prev) => prev + 1);
  };

  // Tab navigation
  const tabs = [
    { id: 'period', label: 'Period & Ovulation', icon: <Calendar size={18} /> },
    { id: 'daily', label: 'Daily Tracking', icon: <Plus size={18} /> },
    { id: 'weekly', label: 'Weekly Check-ins', icon: <TrendingUp size={18} /> },
    { id: 'reports', label: 'Reports & Insights', icon: <TrendingUp size={18} /> },
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title={t('progress.title')}
          description={t('progress.subtitle')}
          icon={<TrendingUp size={30} className="text-primary" strokeWidth={3} />}
        />

        {/* Period Setup Wizard */}
        {showPeriodSetup && user?.uid && (
          <PeriodSetupWizard
            userId={user.uid}
            onComplete={handlePeriodSetupComplete}
            onCancel={() => setShowPeriodSetup(false)}
          />
        )}

        {/* Tab Navigation */}
        {periodSetupComplete && (
          <div className="mb-6">
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap transition-all duration-300 border-b-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-muted hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {periodSetupComplete && (
          <>
            {/* Period & Ovulation Tab */}
            {activeTab === 'period' && user?.uid && (
              <div className="space-y-6">
                {/* Unified Cycle Insights Card */}
                <CycleInsightsCard
                  userId={user.uid}
                  refreshTrigger={ovulationRefreshTrigger}
                  onLogPeriod={() => setShowLogPeriod(true)}
                  onTrackSymptoms={() => setShowDailyForm(true)}
                />

                {/* Period Timeline */}
                <PeriodTimeline
                  userId={user.uid}
                  onCycleClick={handleCycleClick}
                  refreshTrigger={periodRefreshTrigger}
                />

                {/* Actions */}
                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() => {
                      setEditMode('new');
                      setEditCycleData(null);
                      setShowLogPeriod(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Log Period
                  </button>
                  <button
                    onClick={handleEditLastPeriod}
                    className="btn-outline flex items-center gap-2"
                  >
                    Edit Last Period
                  </button>
                </div>
              </div>
            )}

            {/* Daily Tracking Tab */}
            {activeTab === 'daily' && user?.uid && (
              <div className="space-y-6">
                {/* Goal Achievement Banner */}
                {showGoalBanner && goalAchievementData && (
                  <GoalAchievementBanner
                    userId={user.uid}
                    goalData={goalAchievementData}
                    onDismiss={handleGoalBannerDismiss}
                  />
                )}

                {/* Action Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowDailyForm(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Log Today's Metrics
                  </button>
                </div>

                {/* Weight Tracker */}
                <WeightTracker userId={user.uid} refreshTrigger={dailyRefreshTrigger} />
              </div>
            )}

            {/* Weekly Check-ins Tab */}
            {activeTab === 'weekly' && user?.uid && (
              <div className="space-y-6">
                {/* Action Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowWeeklySymptomForm(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Weekly Symptom Check-in
                  </button>
                </div>

                {/* Symptom Trends Chart */}
                <SymptomTrendsChart userId={user.uid} refreshTrigger={weeklyRefreshTrigger} />
              </div>
            )}

            {/* Reports & Insights Tab */}
            {activeTab === 'reports' && user?.uid && (
              <div className="space-y-6">
                {/* Sub-tab Switcher */}
                <div className="bg-surface rounded-3xl p-2 inline-flex gap-2">
                  <button
                    onClick={() => setReportsSubTab('weekly')}
                    className={`px-6 py-3 rounded-2xl font-medium transition-all ${
                      reportsSubTab === 'weekly'
                        ? 'bg-primary text-white shadow-lg'
                        : 'text-muted hover:text-text hover:bg-surface-hover'
                    }`}
                  >
                    Weekly Summaries
                  </button>
                  <button
                    onClick={() => setReportsSubTab('monthly')}
                    className={`px-6 py-3 rounded-2xl font-medium transition-all ${
                      reportsSubTab === 'monthly'
                        ? 'bg-primary text-white shadow-lg'
                        : 'text-muted hover:text-text hover:bg-surface-hover'
                    }`}
                  >
                    Monthly Reports
                  </button>
                </div>

                {/* Weekly Summaries */}
                {reportsSubTab === 'weekly' && (
                  <WeeklySummariesDashboard
                    userId={user.uid}
                    refreshTrigger={summariesRefreshTrigger}
                  />
                )}

                {/* Monthly Reports */}
                {reportsSubTab === 'monthly' && (
                  <MonthlyReportsDashboard
                    userId={user.uid}
                    refreshTrigger={reportsRefreshTrigger}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Log Period Modal */}
        {showLogPeriod && user?.uid && (
          <LogPeriodModal
            userId={user.uid}
            onClose={() => {
              setShowLogPeriod(false);
              setEditMode('new');
              setEditCycleData(null);
            }}
            onSuccess={handleLogPeriodSuccess}
            mode={editMode}
            initialData={editCycleData}
          />
        )}

        {/* Edit Period Modal */}
        {showEditPeriod && user?.uid && editCycleData && (
          <EditPeriodModal
            userId={user.uid}
            cycleId={editCycleData.cycleId}
            initialData={editCycleData}
            onClose={() => {
              setShowEditPeriod(false);
              setEditCycleData(null);
            }}
            onSuccess={handleLogPeriodSuccess}
          />
        )}

        {/* Cycle Details Modal */}
        {selectedCycle && user?.uid && (
          <CycleDetailsModal
            userId={user.uid}
            cycle={selectedCycle}
            onClose={() => setSelectedCycle(null)}
            onInsightsGenerated={handleInsightsGenerated}
          />
        )}

        {/* Daily Tracking Form Modal */}
        {showDailyForm && user?.uid && (
          <DailyTrackingForm
            userId={user.uid}
            onClose={() => setShowDailyForm(false)}
            onSuccess={handleDailyTrackingSuccess}
          />
        )}

        {/* Weekly Symptom Form Modal */}
        {showWeeklySymptomForm && user?.uid && (
          <WeeklySymptomForm
            userId={user.uid}
            onClose={() => setShowWeeklySymptomForm(false)}
            onSuccess={handleWeeklySymptomSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
