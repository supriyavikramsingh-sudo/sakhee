import { useNavigate } from 'react-router-dom';
import { ChefHat, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { boldify } from '../../utils/helper';

/**
 * Component to display when user requests meal plans in chat
 * Redirects them to the dedicated Meal Plan Generator
 */
const MealPlanRedirectCard = ({ data }) => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/meals');
  };

  return (
    <>
      <style>{`
        .meal-redirect-message strong {
          font-weight: 700 !important;
        }
      `}</style>
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700 shadow-lg max-w-2xl">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-purple-500 text-white p-3 rounded-full">
            <ChefHat className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              {data.message}
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </h3>
            <p
              className="meal-redirect-message text-gray-700 dark:text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: boldify(data.redirectMessage) }}
            />
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-purple-100 dark:border-purple-800">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            What you'll get:
          </p>
          <div className="space-y-2">
            {[
              'Complete 3, 5 or 7-day PCOS-optimized meal plans',
              'Regional Indian cuisine variations',
              'Comprehensive list of ingredients, quantities & substitutions that you can use',
              'Macro breakdowns (protein, carbs, fats, GI)',
              'Bonus cooking tip to help you get started',
              'PDF export for easy sharing',
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleRedirect}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-xl transform hover:scale-105"
        >
          <span>{data.actionText || 'Go to Meal Plan Generator'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Help Text */}
        {data.helpText && (
          <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">💡 {data.helpText}</p>
          </div>
        )}

        {/* Detection Badge (optional, for transparency) */}
        {data.detectedIntent && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Detected: {data.detectedIntent} request
          </div>
        )}
      </div>
    </>
  );
};

export default MealPlanRedirectCard;
