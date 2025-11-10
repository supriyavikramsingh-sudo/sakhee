import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Download, Info } from 'lucide-react';
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
    <div className="space-y-6 bg-white p-4">
      {/* Keto Diet Notice */}
      {plan.isKeto && (
        <div className="bg-gradient-to-r from-pink-100 to-rose-100 border-2 border-pink-300 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">⚡</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                🔥 Ketogenic Diet Meal Plan
                <span className="px-2 py-0.5 bg-gradient-to-r from-pink-400 to-rose-400 text-white text-xs rounded-full">
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

      {/* Calorie Disclaimer - Personalized */}
      <CalorieDisclaimer />

      {/* REPLACE THE ENTIRE HEADER/ACTIONS SECTION WITH THIS: */}
      <div className="bg-gradient-to-r from-pink-100 to-rose-100 rounded-lg border border-primary p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">Your Meal Plan</h2>
            <div className="flex items-center gap-2">
              <p className="text-neutral-900 capitalize">{days.length || '3'} Days</p>•
              <p className="text-neutral-900 capitalize flex gap-1 items-center">
                {plan.dietType || 'Vegetarian'}{' '}
                {plan.isKeto && (
                  <span className="px-2 py-1 bg-gradient-to-r from-pink-400 to-rose-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    ⚡ Keto
                  </span>
                )}
              </p>
              •
              <p className="text-neutral-900 capitalize">
                {plan.regions.map((region) => region.replace('-', ' ')).join() || 'Indian'}
              </p>
              •<p className="text-neutral-900 capitalize">₹{plan.budget || '200'}/day</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Download PDF Button - EXISTING, KEEP AS IS */}
            <button
              onClick={downloadPDF}
              disabled={isDownloading}
              className={`btn-outline flex gap-2 px-4 py-2 bg-surface ${
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

      {/* Meals for Selected Day */}
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <ChevronLeft
            className={selectedDay === 0 ? 'text-muted' : `text-primary hover:text-primaryDark`}
            onClick={selectedDay === 0 ? () => {} : () => setSelectedDay(selectedDay - 1)}
          />
          <h3 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Calendar size={20} className="text-primary" strokeWidth={3} /> Day {selectedDay + 1}{' '}
            Meals
          </h3>
          <ChevronRight
            className={
              selectedDay === days.length - 1
                ? 'text-muted'
                : `text-primary hover:text-primaryDark `
            }
            onClick={
              selectedDay === days.length - 1 ? () => {} : () => setSelectedDay(selectedDay + 1)
            }
          />
        </div>

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
