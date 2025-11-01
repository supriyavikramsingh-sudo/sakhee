import { ArrowRight, CheckCircle2, ChefHat, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { boldify } from '../../utils/helper';

type MealPlanRedirectCardProps = {
  data: {
    type: string;
    detectedIntent: string;
    actionUrl: string;
    helpText: string;
    redirectMessage: string;
    message: string;
    actionText: string;
  };
};

const MealPlanRedirectCard = ({ data }: MealPlanRedirectCardProps) => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/meals');
  };

  return (
    <div className="bg-gradient-to-r from-secondary to-white rounded-xl p-6 border-2 border-primary shadow-lg max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="bg-accent text-white p-3 rounded-full">
          <ChefHat className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            {data.message}
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </h3>
          <p
            className="meal-redirect-message text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: boldify(data.redirectMessage) }}
          />
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg p-4 mb-4 border border-primary">
        <p className="text-sm font-semibold text-gray-700 mb-3">What you'll get:</p>
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
              <span className="text-sm text-gray-600">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={handleRedirect}
        className="w-full btn-primary !py-3 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <span>{data.actionText || 'Go to Meal Plan Generator'}</span>
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* Help Text */}
      {data.helpText && (
        <div className="mt-4 pt-4 border-t border-primary">
          <p className="text-sm text-gray-600 italic">💡 {data.helpText}</p>
        </div>
      )}
    </div>
  );
};

export default MealPlanRedirectCard;
