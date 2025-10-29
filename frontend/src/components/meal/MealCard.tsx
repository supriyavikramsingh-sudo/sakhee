import { ChefHat, Clock, TrendingDown } from 'lucide-react';

const MealCard = ({ meal }) => {
  // Handle both old and new formats
  const macros = meal.macros || {
    protein: meal.protein || 0,
    carbs: meal.carbs || 0,
    fats: meal.fats || 0,
  };

  // Calculate calories if not provided: (protein × 4) + (carbs × 4) + (fats × 9)
  const calories =
    meal.calories || Math.round(macros.protein * 4 + macros.carbs * 4 + macros.fats * 9);

  const glycemicIndex = meal.glycemicIndex || meal.gi || 'Low';
  const cookingTime = meal.cookingTime || meal.time || '20 mins';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      {/* Meal Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="inline-block px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-xs font-medium mb-2">
            {meal.mealType}
          </span>
          <h4 className="text-xl font-bold text-gray-900">{meal.name}</h4>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            glycemicIndex === 'Low'
              ? 'bg-success bg-opacity-10 text-success'
              : glycemicIndex === 'Medium'
              ? 'bg-warning bg-opacity-10 text-warning'
              : 'bg-danger bg-opacity-10 text-danger'
          }`}
        >
          {glycemicIndex} GI
        </span>
      </div>

      {/* Ingredients */}
      {meal.ingredients && meal.ingredients.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Ingredients:</p>
          <ul className="text-sm text-muted space-y-1">
            {meal.ingredients.slice(0, 5).map((ingredient, idx) => {
              // Handle both string and object formats
              const ingredientText =
                typeof ingredient === 'string'
                  ? ingredient
                  : ingredient.item
                  ? `${ingredient.item}${ingredient.quantity ? ` - ${ingredient.quantity}` : ''}${
                      ingredient.unit ? ` ${ingredient.unit}` : ''
                    }`
                  : JSON.stringify(ingredient);

              return <li key={idx}>• {ingredientText}</li>;
            })}
            {meal.ingredients.length > 5 && (
              <li className="text-primary font-medium">+ {meal.ingredients.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Macros */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-surface rounded p-2 text-center">
          <p className="text-xs text-muted">Protein</p>
          <p className="font-bold text-primary">{macros.protein}g</p>
        </div>
        <div className="bg-surface rounded p-2 text-center">
          <p className="text-xs text-muted">Carbs</p>
          <p className="font-bold text-warning">{macros.carbs}g</p>
        </div>
        <div className="bg-surface rounded p-2 text-center">
          <p className="text-xs text-muted">Fats</p>
          <p className="font-bold text-success">{macros.fats}g</p>
        </div>
        <div className="bg-surface rounded p-2 text-center">
          <p className="text-xs text-muted">Calories</p>
          <p className="font-bold text-accent">{calories}</p>
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          {cookingTime}
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown size={14} />
          PCOS-friendly
        </div>
      </div>

      {/* Cooking Tip */}
      {meal.tip && (
        <div className="mt-4 pt-4 border-t border-surface">
          <div className="flex items-start gap-2">
            <ChefHat size={16} className="text-primary flex-shrink-0 mt-1" />
            <p className="text-xs text-gray-700 italic">{meal.tip}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealCard;
