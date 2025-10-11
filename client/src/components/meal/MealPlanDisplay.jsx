import { useState } from 'react'
import { Calendar, Download, Share2, AlertCircle } from 'lucide-react'
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

  const days = plan.plan?.dayNumber ? [plan.plan] : []

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Duration</p>
          <p className="text-2xl font-bold text-primary">
            {plan.duration} Days
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Daily Budget</p>
          <p className="text-2xl font-bold text-success">
            ₹{plan.budget}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Diet Type</p>
          <p className="text-lg font-bold capitalize">
            {plan.dietType}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Region</p>
          <p className="text-lg font-bold capitalize">
            {plan.region.replace('-', ' ')}
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
          {Array.from({ length: plan.duration }, (_, i) => (
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
        
        {days.length > 0 && days[0].meals ? (
          <div className="grid md:grid-cols-2 gap-4">
            {days[0].meals.map((meal, idx) => (
              <MealCard key={idx} meal={meal} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-muted">
              Meal details are being generated. Please refresh in a moment.
            </p>
          </div>
        )}

        {/* Grocery List */}
        {days[0]?.groceryList && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h4 className="font-bold text-lg mb-4">🛒 Grocery List</h4>
            <div className="grid md:grid-cols-3 gap-3">
              {days[0].groceryList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="checkbox" className="accent-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
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