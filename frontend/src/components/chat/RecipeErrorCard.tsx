import { AlertCircle, ArrowRight, Clock, Info, Lock } from 'lucide-react';

interface RecipeErrorCardProps {
  errorType: 'upgradeRequired' | 'rateLimited' | 'notFound' | 'apiError';
  dishName?: string;
  dailyLimit?: number;
  resetTime?: string;
  errorMessage?: string;
  onTryAgain?: () => void;
  onUpgrade?: (tier: 'pro' | 'max') => void;
}

const RecipeErrorCard = ({
  errorType,
  dishName = '',
  dailyLimit = 0,
  resetTime,
  errorMessage,
  onTryAgain,
  onUpgrade,
}: RecipeErrorCardProps) => {
  const getTimeUntilReset = (resetAt: string): string => {
    const now = new Date();
    const reset = new Date(resetAt);
    const diff = reset.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Upgrade Required (FREE user)
  if (errorType === 'upgradeRequired') {
    return (
      <div className="bg-gradient-to-br from-secondary to-white rounded-xl p-6 border-2 border-warning shadow-lg max-w-2xl animate-slideIn">
        <div className="flex items-start gap-4">
          <div className="bg-warning text-white p-3 rounded-full flex-shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Recipe Search - Pro Feature
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Get PCOS-friendly recipes powered by Spoonacular with regional ingredient alternatives
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-semibold">Pro:</span>
                <span>5 searches/day</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="font-semibold">Max:</span>
                <span>10 searches/day</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onUpgrade?.('pro')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>Upgrade to Pro</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onUpgrade?.('max')}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>Upgrade to Max</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rate Limit Exceeded
  if (errorType === 'rateLimited') {
    return (
      <div className="bg-gradient-to-br from-warning from-opacity-10 to-white rounded-xl p-6 border-2 border-warning shadow-lg max-w-2xl animate-slideIn">
        <div className="flex items-start gap-4">
          <div className="bg-warning text-white p-3 rounded-full flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Daily Limit Reached</h3>
              <p className="text-gray-700 leading-relaxed">
                You&apos;ve used all <strong>{dailyLimit} recipe searches</strong> today.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Your limit resets at:</span>
                <span className="font-semibold text-gray-900">Midnight IST</span>
              </div>
              {resetTime && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Next reset in:</span>
                  <span className="font-semibold text-primary">{getTimeUntilReset(resetTime)}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Want more searches?</strong> Upgrade to Max for 10 searches/day
              </p>
              <button
                onClick={() => onUpgrade?.('max')}
                className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Upgrade to Max
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dish Not Found
  if (errorType === 'notFound') {
    return (
      <div className="bg-white rounded-xl p-6 border-2 border-gray-300 shadow-lg max-w-2xl animate-slideIn">
        <div className="flex items-start gap-4">
          <div className="bg-gray-200 text-gray-600 p-3 rounded-full flex-shrink-0">
            <Info className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No recipes found for &quot;{dishName}&quot;
              </h3>
              <p className="text-gray-600">Try being more specific or checking the spelling.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Try:</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    <strong>Being more specific:</strong> &quot;chicken curry&quot; instead of
                    &quot;curry&quot;
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    <strong>Using common names:</strong> &quot;paneer&quot; not &quot;cottage
                    cheese&quot;
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    <strong>Checking spelling:</strong> Make sure there are no typos
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 font-medium">
                Good news: This search didn&apos;t count against your daily limit!
              </p>
            </div>

            <button
              onClick={onTryAgain}
              className="w-full btn-primary !py-3 flex items-center justify-center gap-2"
            >
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // API Error
  if (errorType === 'apiError') {
    return (
      <div className="bg-gradient-to-br from-danger from-opacity-10 to-white rounded-xl p-6 border-2 border-danger shadow-lg max-w-2xl animate-slideIn">
        <div className="flex items-start gap-4">
          <div className="bg-danger text-white p-3 rounded-full flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to search recipes</h3>
              <p className="text-gray-700 leading-relaxed">
                We&apos;re having trouble connecting to the recipe service. Please try again in a
                moment.
              </p>
            </div>

            {errorMessage && (
              <details className="bg-gray-50 rounded-lg p-3">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                  Technical details
                </summary>
                <p className="mt-2 text-xs text-gray-500 font-mono break-all">{errorMessage}</p>
              </details>
            )}

            <button
              onClick={onTryAgain}
              className="w-full btn-primary !py-3 flex items-center justify-center gap-2"
            >
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default RecipeErrorCard;
