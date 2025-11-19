import { AlertCircle, CheckCircle, Loader, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useJobStore } from '../../store/jobStore';
import { toast } from 'react-toastify';

const BackgroundJobBanner = () => {
  const navigate = useNavigate();
  const { activeJobs, completedJobs, updateJob, getUnnotifiedCompletedJobs, markJobAsNotified } =
    useJobStore();
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);
  const [completedJob, setCompletedJob] = useState<any>(null);
  const [dismissedActiveJobs, setDismissedActiveJobs] = useState<Set<string>>(new Set());

  // Poll active jobs for updates
  useEffect(() => {
    if (activeJobs.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const job of activeJobs) {
        try {
          const response: any = await apiClient.getJobStatus(job.id);

          if (response.success && response.data) {
            updateJob(job.id, response.data);
          }
        } catch (error) {
          console.error('Failed to poll job status:', error);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [activeJobs, updateJob]);

  // Show notification for newly completed jobs
  useEffect(() => {
    const unnotifiedJobs = getUnnotifiedCompletedJobs();

    if (unnotifiedJobs.length > 0) {
      const job = unnotifiedJobs[0];
      setCompletedJob(job);
      setShowCompletionNotification(true);

      // Remove from dismissed list when job completes (so user sees completion)
      setDismissedActiveJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });

      // Auto-hide notification after 10 seconds
      const timer = setTimeout(() => {
        setShowCompletionNotification(false);
        markJobAsNotified(job.id);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [completedJobs, getUnnotifiedCompletedJobs, markJobAsNotified]);

  const handleViewResult = () => {
    if (completedJob?.type === 'meal-generation') {
      navigate('/meals');
      setShowCompletionNotification(false);
      markJobAsNotified(completedJob.id);
    }
  };

  const handleDismissNotification = () => {
    setShowCompletionNotification(false);
    if (completedJob) {
      markJobAsNotified(completedJob.id);
    }
  };

  const handleDismissActiveJob = (jobId: string) => {
    // Only hide the banner UI, don't stop the background job
    // The job continues to run and poll for updates in the background
    // When the job completes, the completion notification will still show
    setDismissedActiveJobs((prev) => new Set(prev).add(jobId));
  };

  // Don't render anything if no active jobs and no notification
  if (activeJobs.length === 0 && !showCompletionNotification) {
    return null;
  }

  // Filter out dismissed jobs for display
  const visibleActiveJobs = activeJobs.filter((job) => !dismissedActiveJobs.has(job.id));

  // Don't render anything if no visible jobs and no notification
  if (visibleActiveJobs.length === 0 && !showCompletionNotification) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-[100] space-y-2 max-w-md">
      {/* Active Job Banner */}
      {visibleActiveJobs.map((job) => (
        <div
          key={job.id}
          className="bg-white border-l-4 border-primary rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in"
        >
          <Loader className="text-primary animate-spin flex-shrink-0 mt-1" size={20} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold text-primaryDark">
                  {job.type === 'meal-generation' ? 'Generating Meal Plan' : 'Processing...'}
                </p>
                <p className="text-xs text-muted mt-1">
                  We're preparing your page in the background. You can continue using the app —
                  we'll notify you when it's ready.
                </p>
                {job.metadata?.progressMessage && (
                  <p className="text-xs text-primary mt-1 italic">{job.metadata.progressMessage}</p>
                )}
                {job.progress > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-primary mb-1">
                      <span>Progress</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="w-full bg-accent rounded-full h-2">
                      <div
                        className="bg-primaryDark h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDismissActiveJob(job.id)}
                className="text-primaryDark flex-shrink-0"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Completion Notification */}
      {showCompletionNotification && completedJob && (
        <div
          className={`${
            completedJob.status === 'completed'
              ? 'bg-green-50 border-green-500'
              : 'bg-red-50 border-red-500'
          } border-l-4 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in`}
        >
          {completedJob.status === 'completed' ? (
            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
          ) : (
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${
                    completedJob.status === 'completed' ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {completedJob.status === 'completed'
                    ? '✨ Your Meal Plan is Ready!'
                    : '❌ Generation Failed'}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    completedJob.status === 'completed' ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {completedJob.status === 'completed'
                    ? 'Your personalized meal plan has been generated successfully.'
                    : completedJob.error || 'An error occurred during generation.'}
                </p>
                {completedJob.status === 'completed' && (
                  <button
                    onClick={handleViewResult}
                    className="mt-2 text-xs font-semibold text-green-800 hover:text-green-900 underline"
                  >
                    View Meal Plan →
                  </button>
                )}
              </div>
              <button
                onClick={handleDismissNotification}
                className={`${
                  completedJob.status === 'completed'
                    ? 'text-green-400 hover:text-green-600'
                    : 'text-red-400 hover:text-red-600'
                } flex-shrink-0`}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundJobBanner;
