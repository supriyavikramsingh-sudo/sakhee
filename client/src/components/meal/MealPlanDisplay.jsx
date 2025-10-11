import { useState } from 'react'
import { Calendar, Download, Share2, AlertCircle, CloudCog } from 'lucide-react'
import MealCard from './MealCard'

const MealPlanDisplay = ({ plan }) => {
  const [selectedDay, setSelectedDay] = useState(0)

  // Normalize the source plan object. The parent may pass either:
  // - plan (object with fields)
  // - plan.plan (the actual plan object)
  const source = plan?.plan ?? plan ?? null

  if (!source) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertCircle className="mx-auto mb-4 text-warning" size={40} />
        <p className="text-muted">No meal plan data available</p>
      </div>
    )
  }

  // Build days array from several possible shapes:
  // 1) source is already an array of days
  // 2) source is a single day object with dayNumber
  // 3) source.rawPlan contains a JSON string with the plan array
  let days = []
  if (Array.isArray(source)) {
    days = source
  } else if (source.dayNumber) {
    days = [source]
  } else if (typeof source.rawPlan === 'string') {
    // Try to extract JSON array from the rawPlan string (handle ```json blocks)
    try {
      const raw = source.rawPlan
      // Find first [ and last ] to extract a possible JSON array
      const start = raw.indexOf('[')
      const end = raw.lastIndexOf(']')
      if (start !== -1 && end !== -1 && end > start) {
        const jsonText = raw.slice(start, end + 1)
        const parsed = JSON.parse(jsonText)
        if (Array.isArray(parsed)) days = parsed
      }
    } catch (e) {
      // ignore parse errors - we'll show the "generating" state below
      // console.debug('Failed to parse rawPlan JSON', e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Duration</p>
          <p className="text-2xl font-bold text-primary">
            {source.duration ?? plan.duration ?? '—'} Days
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Daily Budget</p>
          <p className="text-2xl font-bold text-success">
            ₹{source.budget ?? plan.budget ?? '—'}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Diet Type</p>
          <p className="text-lg font-bold capitalize">
            {source.dietType ?? plan.dietType ?? '—'}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Region</p>
          <p className="text-lg font-bold capitalize">
            {(source.region ?? plan.region ?? '').toString().replace(/-/g, ' ') || '—'}
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
          {Array.from({ length: (source.duration ?? plan.duration ?? days.length) || 1 }, (_, i) => (
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
        
        {days.length > 0 && days[selectedDay]?.meals ? (
          <div className="grid md:grid-cols-2 gap-4">
            {days[selectedDay].meals.map((meal, idx) => (
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
        {days[selectedDay]?.groceryList && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h4 className="font-bold text-lg mb-4">🛒 Grocery List</h4>
            <div className="grid md:grid-cols-3 gap-3">
              {days[selectedDay].groceryList.map((item, idx) => (
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