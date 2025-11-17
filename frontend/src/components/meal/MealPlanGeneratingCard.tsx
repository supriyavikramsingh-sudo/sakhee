import { Loader } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useJobStore } from '../../store/jobStore'

const MealPlanGeneratingCard = () => {
  const { activeJobs } = useJobStore()
  const [currentJob, setCurrentJob] = useState<any>(null)

  useEffect(() => {
    // Find active meal generation job
    const mealGenJob = activeJobs.find((job: any) => job.type === 'meal-generation')
    setCurrentJob(mealGenJob)
  }, [activeJobs])

  if (!currentJob) return null

  return (
    <div className="bg-white rounded-b-lg shadow-lg p-8 max-w-7xl mx-auto">
      {/* Header with Animation */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-4 relative">
          <Loader className="text-primary animate-spin" size={40} />
          <div className="absolute inset-0 rounded-full border-4 border-primary opacity-20 animate-ping" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🍽️ Your Meal Plan is Being Generated
        </h2>
        <p className="text-gray-600">
          Please wait while we create your personalized meal plan...
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-semibold text-primary">{currentJob.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${currentJob.progress}%` }}
          >
            <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {currentJob.metadata?.progressMessage && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            <Loader className="animate-spin" size={16} />
            <span className="italic">{currentJob.metadata.progressMessage}</span>
          </p>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">What's happening?</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">✓</span>
            <span>Analyzing your health profile and dietary preferences</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">✓</span>
            <span>Retrieving personalized meal templates from our database</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">✓</span>
            <span>Generating AI-powered PCOS-friendly meal combinations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">✓</span>
            <span>Calculating nutrition and balancing macronutrients</span>
          </li>
        </ul>
      </div>

      {/* Job Details */}
      {currentJob.metadata && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Generation Details:</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {currentJob.metadata.duration && (
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-2 font-medium text-gray-800">
                  {currentJob.metadata.duration} days
                </span>
              </div>
            )}
            {currentJob.metadata.cuisines && (
              <div>
                <span className="text-gray-500">Cuisines:</span>
                <span className="ml-2 font-medium text-gray-800">
                  {currentJob.metadata.cuisines.length} selected
                </span>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Estimated Time */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          ⏱️ Estimated time remaining: <span className="font-medium">2-3 minutes</span>
        </p>
      </div>
    </div>
  )
}

export default MealPlanGeneratingCard
