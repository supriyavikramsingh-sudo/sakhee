import { ArrowRight, Clock, ExternalLink, TrendingDown, Users } from 'lucide-react';

interface Nutrient {
  name: string;
  amount: number;
  unit: string;
}

interface CaloricBreakdown {
  percentProtein: number;
  percentFat: number;
  percentCarbs: number;
}

interface RegionalSubstitute {
  original: string;
  substitute: string;
  reason: string;
  howTo?: string;
}

interface PCOSModifications {
  regionalSubstitutes: RegionalSubstitute[];
  cookingMethodImprovements: string[];
  portionGuidance: string;
  glycemicOptimization: string[];
}

interface Recipe {
  id: number;
  title: string;
  readyInMinutes: number;
  servings: number;
  healthScore: number;
  sourceUrl: string;
  summary?: string;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  nutrition: {
    nutrients: Nutrient[];
    caloricBreakdown: CaloricBreakdown;
  };
  ingredients?: Array<{ name: string; amount: number; unit: string; original: string }>;
  instructions?: string;
  pcosModifications: PCOSModifications;
}

interface RecipeResultCardProps {
  recipe: Recipe;
  remainingSearches: number;
  dailyLimit: number;
  onViewFullRecipe?: (url: string) => void;
}

const RecipeResultCard = ({
  recipe,
  remainingSearches,
  dailyLimit,
  onViewFullRecipe,
}: RecipeResultCardProps) => {
  const handleViewRecipe = () => {
    if (onViewFullRecipe) {
      onViewFullRecipe(recipe.sourceUrl);
    } else {
      window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Get key nutrients
  const getNutrient = (name: string): Nutrient | undefined => {
    return recipe.nutrition.nutrients.find((n) => n.name === name);
  };

  const calories = getNutrient('Calories');
  const protein = getNutrient('Protein');
  const carbs = getNutrient('Carbohydrates');
  const fat = getNutrient('Fat');

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 max-w-3xl animate-slideIn">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">{recipe.title}</h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {recipe.readyInMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Ready in: {recipe.readyInMinutes} mins</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Servings: {recipe.servings}</span>
            </div>
          )}
          {recipe.healthScore !== undefined && (
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              <span>Health Score: {recipe.healthScore}/100</span>
            </div>
          )}
        </div>
      </div>

      {/* Nutrition Facts */}
      <div className="p-6 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">Nutrition (per serving)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {calories && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(calories.amount)}</div>
              <div className="text-xs text-gray-600 mt-1">Calories</div>
            </div>
          )}
          {protein && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round(protein.amount)}g</div>
              <div className="text-xs text-gray-600 mt-1">Protein</div>
            </div>
          )}
          {carbs && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{Math.round(carbs.amount)}g</div>
              <div className="text-xs text-gray-600 mt-1">Carbs</div>
            </div>
          )}
          {fat && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round(fat.amount)}g</div>
              <div className="text-xs text-gray-600 mt-1">Fat</div>
            </div>
          )}
        </div>
      </div>

      {/* PCOS-Friendly Modifications - VISUALLY DISTINCT */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 border-l-4 border-green-500 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">PCOS-Friendly</span>
          <span>Modifications</span>
        </h4>

        {/* Regional Substitutes */}
        {recipe.pcosModifications.regionalSubstitutes.length > 0 && (
          <div className="mb-4">
            <h5 className="font-semibold text-gray-800 mb-3 text-sm">Regional Substitutes:</h5>
            <div className="space-y-3">
              {recipe.pcosModifications.regionalSubstitutes.map((sub, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex items-start gap-2 mb-2">
                    <ArrowRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm">
                        <span className="line-through text-gray-500">{sub.original}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-semibold text-green-700">{sub.substitute}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        <strong>Why:</strong> {sub.reason}
                      </p>
                      {sub.howTo && (
                        <p className="text-xs text-gray-600 mt-1">
                          <strong>How:</strong> {sub.howTo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cooking Method Improvements */}
        {recipe.pcosModifications.cookingMethodImprovements.length > 0 && (
          <div className="mb-4">
            <h5 className="font-semibold text-gray-800 mb-2 text-sm">Cooking Method Improvements:</h5>
            <ul className="space-y-1.5">
              {recipe.pcosModifications.cookingMethodImprovements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Portion Guidance */}
        {recipe.pcosModifications.portionGuidance && (
          <div className="mb-4">
            <h5 className="font-semibold text-gray-800 mb-2 text-sm">Portion Guidance:</h5>
            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-blue-200">
              {recipe.pcosModifications.portionGuidance}
            </p>
          </div>
        )}

        {/* Glycemic Optimization */}
        {recipe.pcosModifications.glycemicOptimization.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-800 mb-2 text-sm">Glycemic Control Tips:</h5>
            <ul className="space-y-1.5">
              {recipe.pcosModifications.glycemicOptimization.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Attribution & Actions */}
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>Powered by:</strong> Spoonacular
            </p>
            <p>
              <strong>PCOS modifications by:</strong> Sakhee AI
            </p>
          </div>
          <button
            onClick={handleViewRecipe}
            className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2"
          >
            <span>View Full Recipe</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Usage Footer */}
      <div className="px-6 py-3 bg-secondary border-t border-primary">
        <p className="text-xs text-gray-600 text-center">
          <strong>{remainingSearches}</strong> recipe {remainingSearches === 1 ? 'search' : 'searches'} remaining today
        </p>
      </div>
    </div>
  );
};

export default RecipeResultCard;
