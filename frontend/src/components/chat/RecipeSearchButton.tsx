import { Lock, Search } from 'lucide-react';
import { useState } from 'react';

interface RecipeSearchButtonProps {
  userTier: 'free' | 'pro' | 'max';
  remainingSearches: number;
  dailyLimit: number;
  onRecipeSearchClick: () => void;
  disabled?: boolean;
}

const RecipeSearchButton = ({
  userTier,
  remainingSearches,
  dailyLimit,
  onRecipeSearchClick,
  disabled = false,
}: RecipeSearchButtonProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const isFree = userTier === 'free';
  const isExhausted = remainingSearches <= 0;
  const isDisabled = disabled || isFree || isExhausted;

  const getButtonText = () => {
    if (isFree) {
      return 'Recipe Search';
    }
    if (isExhausted) {
      return `Recipe Search · 0/${dailyLimit}`;
    }
    return `Recipe Search · ${remainingSearches}/${dailyLimit}`;
  };

  const handleClick = () => {
    if (isDisabled) return;
    onRecipeSearchClick();
  };

  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);
  const handleFocus = () => setShowTooltip(true);
  const handleBlur = () => setShowTooltip(false);

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={isDisabled}
        aria-label="Recipe search feature"
        aria-disabled={isDisabled}
        aria-describedby={showTooltip ? 'recipe-search-tooltip' : undefined}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200 ease-in-out
          ${
            isDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'bg-white text-primary hover:bg-primary hover:text-white border border-primary cursor-pointer hover:shadow-md active:scale-95'
          }
        `}
      >
        {isFree ? (
          <Lock className="w-4 h-4" />
        ) : (
          <Search className="w-4 h-4" />
        )}
        <span className="text-sm">{getButtonText()}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          id="recipe-search-tooltip"
          role="tooltip"
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 animate-fadeIn"
        >
          <div className="bg-gray-900 text-white rounded-lg p-4 shadow-xl max-w-xs">
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-8 border-transparent border-t-gray-900"></div>
            </div>

            {isFree ? (
              // FREE user tooltip
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold text-sm">Recipe Search - Pro Feature</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Get PCOS-friendly recipes powered by Spoonacular with regional ingredient
                  alternatives
                </p>
                <div className="space-y-1 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                    <span>Pro: 5 searches/day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    <span>Max: 10 searches/day</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = '/pricing';
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
                  >
                    Upgrade to Pro
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = '/pricing';
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
                  >
                    Upgrade to Max
                  </button>
                </div>
              </div>
            ) : (
              // Pro/Max user tooltip
              <div className="text-xs text-gray-300">
                Search for PCOS-friendly recipes with regional modifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeSearchButton;
