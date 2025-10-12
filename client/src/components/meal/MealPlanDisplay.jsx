import { useState } from 'react'
import { Calendar, Download, Share2, AlertCircle, Info } from 'lucide-react'
import MealCard from './MealCard'

const MealPlanDisplay = ({ plan }) => {
  const [selectedDay, setSelectedDay] = useState(0)

  if (!plan || !plan.plan) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertCircle className="mx-auto mb-4 text-warning" size={40} />
        <p className="text-muted">No meal plan data available</p>
      </div>
    )
  }

  // Handle both parsed and raw plans
  let parsedPlan = plan.plan
  let isFallback = false
  
  // Check if it's a raw plan that failed to parse
  if (parsedPlan.rawPlan || parsedPlan.error) {
    // Use fallback display
    return (
      <div className="space-y-6">
        <div className="bg-warning bg-opacity-10 border-l-4 border-warning p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-warning flex-shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-warning mb-2">
                Meal Plan Generated (Formatting Issue)
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                The AI generated your meal plan, but we're having trouble displaying it in the structured format. 
                We've created a template-based plan for you instead.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary text-sm"
              >
                Try Generating Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Check if using fallback
  if (parsedPlan.fallback) {
    isFallback = true
  }

  // Extract days array
  const days = parsedPlan.days || []

  if (days.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Info className="mx-auto mb-4 text-primary" size={40} />
        <p className="text-muted mb-4">Generating your personalized meal plan...</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary text-sm"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  const currentDay = days[selectedDay] || days[0]

  return (
    <div className="space-y-6">
      {/* Fallback Notice */}
      {isFallback && (
        <div className="bg-info bg-opacity-10 border-l-4 border-info p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="text-info flex-shrink-0" size={20} />
            <p className="text-sm text-gray-700">
              💡 We've created a PCOS-friendly meal plan using our expert templates. 
              All meals are low-GI and suitable for your preferences.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Duration</p>
          <p className="text-2xl font-bold text-primary">
            {days.length} Days
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Daily Budget</p>
          <p className="text-2xl font-bold text-success">
            ₹{plan.budget || '200'}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Diet Type</p>
          <p className="text-lg font-bold capitalize">
            {plan.dietType || 'Vegetarian'}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Region</p>
          <p className="text-lg font-bold capitalize">
            {(plan.region || 'Indian').replace('-', ' ')}
          </p>
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
        <h3 className="text-2xl font-bold text-primary">
          Day {selectedDay + 1} Meals
        </h3>
        
        {currentDay && currentDay.meals && currentDay.meals.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {currentDay.meals.map((meal, idx) => (
              <MealCard key={idx} meal={meal} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-muted">No meals available for this day</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button className="flex items-center gap-2 px-4 py-2 bg-surface rounded-lg hover:bg-accent hover:text-white transition">
          <Download size={20} />
          Download PDF
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-surface rounded-lg hover:bg-accent hover:text-white transition">
          <Share2 size={20} />
          Share Plan
        </button>
      </div>
    </div>
  )
}

export default MealPlanDisplay