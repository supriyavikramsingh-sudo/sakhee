import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import MealPlanHistoryItem from './MealPlanHistoryItem';

interface MealPlanHistoryMetadata {
  planId: string;
  planName: string;
  generatedAt: Date | any;
  numberOfDays: number;
  dietType: string;
  regions: string[];
  isKeto: boolean;
  caloriesPerDay: number;
}

interface MealPlanHistoryPanelProps {
  plans: MealPlanHistoryMetadata[];
  activePlanId: string | null;
  onSelectPlan: (planId: string) => void;
  isLoading: boolean;
}

const MealPlanHistoryPanel = ({
  plans,
  activePlanId,
  onSelectPlan,
  isLoading,
}: MealPlanHistoryPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('sakhee_mealPanelExpanded');
    return saved !== null ? saved === 'true' : true; // Default to expanded
  });

  // Save preference to localStorage when changed
  useEffect(() => {
    localStorage.setItem('sakhee_mealPanelExpanded', String(isExpanded));
  }, [isExpanded]);

  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Desktop: Side Panel | Mobile: Bottom Sheet */}

      {/* DESKTOP VIEW (>= 768px) */}
      <div
        className={`hidden md:block relative bg-white border-r border-gray-200 shadow-sm transition-all duration-[480ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isExpanded ? 'w-[300px]' : 'w-12'
        }`}
        style={{
          minHeight: '500px',
        }}
      >
        {/* Toggle Button */}
        <button
          onClick={togglePanel}
          className="absolute -right-3 top-8 z-10 bg-primary text-white rounded-full p-1.5 shadow-md hover:shadow-lg hover:bg-primaryDark transition-all duration-200"
          aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
        >
          {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* Panel Content */}
        {isExpanded && (
          <div className="h-full flex flex-col p-4">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="text-primary" size={24} strokeWidth={2.5} />
                <h3 className="text-xl font-bold font-serif text-gray-900">Meal Plan History</h3>
              </div>
              <div className="h-px bg-gradient-to-r from-primary via-accent to-transparent" />
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
                  <p className="text-muted text-sm mt-3">Loading history...</p>
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-8">
                  <History className="mx-auto text-muted mb-3" size={40} />
                  <p className="text-muted text-sm">No meal plans yet</p>
                  <p className="text-muted text-xs mt-1">Generate your first plan to get started</p>
                </div>
              ) : (
                plans.map((plan) => (
                  <MealPlanHistoryItem
                    key={plan.planId}
                    planId={plan.planId}
                    planName={plan.planName}
                    generatedAt={plan.generatedAt}
                    isActive={plan.planId === activePlanId}
                    onClick={() => onSelectPlan(plan.planId)}
                  />
                ))
              )}
            </div>

            {/* Footer Info */}
            {plans.length > 0 && !isLoading && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-muted text-center">{plans.length} of 5 plans saved</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOBILE VIEW (< 768px) - Bottom Sheet */}
      <div className="md:hidden">
        {/* Collapsed Tab */}
        {!isExpanded && (
          <button
            onClick={togglePanel}
            className="fixed bottom-0 left-0 right-0 z-30 bg-primary text-white py-3 shadow-lg flex items-center justify-center gap-2 font-medium"
          >
            <History size={20} />
            <span>History ({plans.length})</span>
            <ChevronRight className="rotate-[-90deg]" size={18} />
          </button>
        )}

        {/* Bottom Sheet */}
        {isExpanded && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={togglePanel}
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[50vh] overflow-hidden animate-slide-up">
              {/* Handle */}
              <div className="py-3 flex justify-center">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Content */}
              <div className="px-4 pb-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="text-primary" size={20} />
                    <h3 className="text-lg font-bold font-serif text-gray-900">
                      Meal Plan History
                    </h3>
                  </div>
                  <button onClick={togglePanel} className="text-gray-500 hover:text-gray-700">
                    <ChevronLeft className="rotate-90" size={20} />
                  </button>
                </div>

                {/* History List */}
                <div className="space-y-3 pb-4">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
                      <p className="text-muted text-sm mt-3">Loading history...</p>
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="mx-auto text-muted mb-3" size={40} />
                      <p className="text-muted text-sm">No meal plans yet</p>
                    </div>
                  ) : (
                    plans.map((plan) => (
                      <MealPlanHistoryItem
                        key={plan.planId}
                        planId={plan.planId}
                        planName={plan.planName}
                        generatedAt={plan.generatedAt}
                        isActive={plan.planId === activePlanId}
                        onClick={() => {
                          onSelectPlan(plan.planId);
                          togglePanel(); // Auto-collapse on selection
                        }}
                      />
                    ))
                  )}
                </div>

                {/* Footer Info */}
                {plans.length > 0 && !isLoading && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-muted text-center">
                      {plans.length} of 5 plans saved
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default MealPlanHistoryPanel;
