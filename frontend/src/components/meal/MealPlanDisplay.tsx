import { AlertCircle, Calendar, Download, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import firestoreService from '../../services/firestoreService';
import { useAuthStore } from '../../store/authStore';
import type { PlanData } from '../../types/meal.type';
import { downloadPDFHelper } from '../../utils/pdfHelper';
import CalorieDisclaimer from './CalorieDisclaimer';
import MealCard from './MealCard';

interface MealPlanDisplayProps {
  plan: PlanData;
}

const MealPlanDisplay = ({ plan }: MealPlanDisplayProps) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [canGenerateMore, setCanGenerateMore] = useState(false);

  useEffect(() => {
    const checkLimits = async () => {
      if (!user?.email || !user?.uid) return;
      const testAccount = firestoreService.isTestAccount(user.email);
      if (testAccount) {
        setCanGenerateMore(true);
        return;
      }
      const result = await firestoreService.checkMealPlanLimit(user.uid);
      if (result.success) {
        setCanGenerateMore(result.canGenerate || result.isPro);
      }
    };
    checkLimits();
  }, []);

  const downloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      downloadPDFHelper(plan.plan.days, plan);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!plan || !plan.plan) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertCircle className="mx-auto mb-4 text-warning" size={40} />
        <p className="text-muted">No meal plan data available</p>
      </div>
    );
  }

  // Handle both parsed and raw plans
  let parsedPlan = plan.plan;
  let isFallback = false;

  // Check if using fallback
  if (parsedPlan.fallback) {
    isFallback = true;
  }

  // Extract days array
  const days = parsedPlan.days || [];

  if (days.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Info className="mx-auto mb-4 text-primary" size={40} />
        <p className="text-muted mb-4">Generating your personalized meal plan...</p>
        <button onClick={() => window.location.reload()} className="btn-secondary text-sm">
          Refresh Page
        </button>
      </div>
    );
  }

  const currentDay = days[selectedDay] || days[0];

  return (
    <div className="space-y-6">
      {/* Fallback Notice */}
      {isFallback && (
        <div className="bg-info bg-opacity-10 border-l-4 border-info p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="text-info flex-shrink-0" size={20} />
            <p className="text-sm text-gray-700">
              💡 We've created a PCOS-friendly meal plan using our expert templates. All meals are
              low-GI and suitable for your preferences.
            </p>
          </div>
        </div>
      )}

      {/* Keto Diet Notice */}
      {plan.isKeto && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">⚡</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                🔥 Ketogenic Diet Meal Plan
                <span className="px-2 py-0.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs rounded-full">
                  {plan.dietType === 'vegan'
                    ? 'Vegan Keto'
                    : plan.dietType === 'jain'
                    ? 'Jain Keto'
                    : plan.dietType === 'vegetarian'
                    ? 'Veg Keto'
                    : 'Non-Veg Keto'}
                </span>
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
                <div className="bg-white rounded-lg p-3">
                  <p className="font-semibold text-pink-600 mb-1">Macro Targets</p>
                  <p className="text-xs">• Fat: 70% of calories</p>
                  <p className="text-xs">• Protein: 25%</p>
                  <p className="text-xs">• Carbs: 5% (20-50g/day)</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="font-semibold text-purple-600 mb-1">Key Substitutions</p>
                  <p className="text-xs">• Rice → Cauliflower rice</p>
                  <p className="text-xs">• Roti → Almond flour roti</p>
                  <p className="text-xs">• Potato → Cauliflower</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="font-semibold text-indigo-600 mb-1">PCOS Benefits</p>
                  <p className="text-xs">• Improved insulin sensitivity</p>
                  <p className="text-xs">• Better hormone balance</p>
                  <p className="text-xs">• Stable blood sugar</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3 flex items-start gap-1">
                <AlertCircle className="flex-shrink-0 mt-0.5" size={14} />
                <span>
                  <strong>Medical Note:</strong> Stay well-hydrated and increase salt intake.
                  Initial 1-2 weeks may have "keto flu" symptoms. Consult your healthcare provider
                  for monitoring.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Duration</p>
          <p className="text-2xl font-bold text-primary">{days.length || '3'} Days</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Daily Budget</p>
          <p className="text-2xl font-bold text-success">₹{plan.budget || '200'}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Diet Type</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-lg font-bold capitalize">{plan.dietType || 'Vegetarian'}</p>
            {plan.isKeto && (
              <span className="px-2 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                ⚡ Keto
              </span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Region</p>
          <p className="text-lg font-bold capitalize">
            {plan.regions.map((region) => region.replace('-', ' ')).join() || 'Indian'}
          </p>
        </div>
      </div>

      {/* Calorie Disclaimer - Personalized */}
      <CalorieDisclaimer />

      {/* REPLACE THE ENTIRE HEADER/ACTIONS SECTION WITH THIS: */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">Your Meal Plan</h2>
            <p className="text-sm text-muted">
              {days.length} days • {plan.dietType || 'Custom'} • ₹{plan.budget || 'N/A'}/day
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Download PDF Button - EXISTING, KEEP AS IS */}
            <button
              onClick={downloadPDF}
              disabled={isDownloading}
              className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg hover:bg-accent hover:text-white transition ${
                isDownloading ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              <Download size={20} />
              {isDownloading ? 'Preparing...' : 'Download PDF'}
            </button>

            {/* 🆕 NEW: Generate New Plan Button with Upgrade Logic */}
            <div className="relative">
              <button
                onClick={() => {
                  if (canGenerateMore) {
                    window.location.reload();
                  } else {
                    navigate('/coming-soon');
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition bg-primary text-white hover:bg-secondary`}
              >
                <Calendar size={20} />
                Generate New Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-primary" />
          Select Day
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                selectedDay === i
                  ? 'bg-primary text-white'
                  : 'bg-surface text-gray-700 hover:bg-accent hover:text-white'
              }`}
            >
              Day {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Meals for Selected Day */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-primary">Day {selectedDay + 1} Meals</h3>

        {currentDay && currentDay.meals && currentDay.meals.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {currentDay.meals.map((meal, idx: number) => (
              <MealCard key={idx} meal={meal} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-muted">No meals available for this day</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealPlanDisplay;
