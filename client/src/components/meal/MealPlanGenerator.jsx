import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMealStore } from '../../store'
import apiClient from '../../services/apiClient'
import { Loader, AlertCircle } from 'lucide-react'

const MealPlanGenerator = ({ userProfile, userId, onGenerated }) => {
  const { t } = useTranslation()
  const { setMealPlan } = useMealStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    region: userProfile?.location || 'north-india',
    dietType: userProfile?.dietType || 'vegetarian',
    budget: 200,
    mealsPerDay: 3,
    duration: 7
  })

  const regions = [
    { value: 'north-india', label: 'North Indian' },
    { value: 'south-india', label: 'South Indian' },
    { value: 'east-india', label: 'East Indian' },
    { value: 'west-india', label: 'West Indian' }
  ]

  const dietTypes = [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'non-vegetarian', label: 'Non-vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'jain', label: 'Jain' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' || name === 'mealsPerDay' ? parseInt(value) : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.generateMealPlan({
        ...formData,
        userId,
        goals: userProfile?.goals || []
      })

      setMealPlan(response.data)
      onGenerated()
    } catch (err) {
      setError(err.message || 'Failed to generate meal plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6 text-primary">
        Create Your Meal Plan
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-danger bg-opacity-10 border-l-4 border-danger rounded flex items-start gap-3">
          <AlertCircle className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-danger">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Region */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Region <span className="text-danger">*</span>
          </label>
          <select
            name="region"
            value={formData.region}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
          >
            {regions.map(r => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Diet Type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Diet Type <span className="text-danger">*</span>
          </label>
          <select
            name="dietType"
            value={formData.dietType}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
          >
            {dietTypes.map(d => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Daily Budget */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Daily Budget: ₹{formData.budget}
          </label>
          <input
            type="range"
            name="budget"
            min="100"
            max="500"
            step="50"
            value={formData.budget}
            onChange={handleInputChange}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>₹100</span>
            <span>₹500</span>
          </div>
        </div>

        {/* Meals Per Day */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Meals Per Day
          </label>
          <select
            name="mealsPerDay"
            value={formData.mealsPerDay}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
          >
            <option value={2}>2 Meals</option>
            <option value={3}>3 Meals</option>
            <option value={4}>4 Meals (with snack)</option>
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Duration
          </label>
          <select
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
          >
            <option value={7}>7 Days</option>
            {/* <option value={14}>2 Weeks</option>
            <option value={30}>1 Month</option> */}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-secondary disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {loading && <Loader className="animate-spin" size={20} />}
          {loading ? 'Generating...' : 'Generate Meal Plan'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-surface rounded text-sm text-muted">
        💡 Plans are customized for PCOS management with low glycemic index foods and anti-inflammatory options.
      </div>
    </div>
  )
}

export default MealPlanGenerator