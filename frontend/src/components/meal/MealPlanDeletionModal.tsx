import { X, Trash2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
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

interface MealPlanDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: MealPlanHistoryMetadata[];
  onDeletePlan: (planId: string) => Promise<void>;
  onDeleteSuccess: () => void;
}

const MealPlanDeletionModal = ({
  isOpen,
  onClose,
  plans,
  onDeletePlan,
  onDeleteSuccess,
}: MealPlanDeletionModalProps) => {
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async (planId: string) => {
    try {
      setError(null);
      setDeletingPlanId(planId);
      await onDeletePlan(planId);

      // After successful deletion, redirect to generator
      onDeleteSuccess();
    } catch (err: any) {
      console.error('Failed to delete meal plan:', err);
      setError(err.message || 'Failed to delete meal plan. Please try again.');
      setDeletingPlanId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden
                     transform transition-all duration-300 scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2
                       transition-colors duration-200"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white font-serif">Meal Plan Limit Reached</h2>
            <p className="text-white/90 text-sm mt-2">
              You have reached the maximum of 5 saved meal plans
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]">
            {/* Error Message */}
            {error && (
              <div className="bg-danger/10 border border-danger rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-danger flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-danger font-semibold text-sm">Error</p>
                  <p className="text-danger/80 text-xs mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <p className="text-gray-700 text-sm">
                Please delete one of your saved meal plans below to generate a new one:
              </p>
            </div>

            {/* Plan List */}
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.planId} className="relative flex items-center gap-3">
                  {/* Plan Item (non-clickable in this context) */}
                  <div className="flex-1">
                    <MealPlanHistoryItem
                      planId={plan.planId}
                      planName={plan.planName}
                      generatedAt={plan.generatedAt}
                      isActive={false}
                      onClick={() => {}} // No action in modal
                    />
                  </div>

                  {/* Delete Button - Outlined style matching "Delete Report" button */}
                  <button
                    onClick={() => handleDelete(plan.planId)}
                    disabled={deletingPlanId !== null}
                    className={`
                      flex-shrink-0
                      px-4 py-2 rounded-xl border-2 font-medium text-sm
                      transition-all duration-300 ease-in-out
                      flex items-center gap-2
                      ${
                        deletingPlanId === plan.planId
                          ? 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed'
                          : deletingPlanId !== null
                          ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-white border-primary text-primary hover:bg-primary hover:text-white hover:border-primary'
                      }
                    `}
                  >
                    <Trash2 size={16} />
                    {deletingPlanId === plan.planId ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border-2 border-muted text-muted
                       hover:bg-muted/10 font-medium transition-all duration-300 ease-in-out"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MealPlanDeletionModal;
