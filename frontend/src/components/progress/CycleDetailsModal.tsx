/**
 * Cycle Details Modal
 * Displays complete details of a period cycle with AI insights
 */

import { useState } from 'react';
import { X, Sparkles, Calendar, Droplet, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';

interface Cycle {
  cycleId: string;
  startDate: Date;
  endDate: Date;
  flow: string;
  color: string;
  colorConsistency: string;
  clots: string;
  spotting: boolean;
  odor: string;
  cycleLength: number | null;
  comparedToLast?: string;
  aiInsights: string | null;
  insightsGeneratedAt: Date | null;
  insightsButtonVisible: boolean;
  month: number;
  year: number;
  loggedAt: Date;
}

interface CycleDetailsModalProps {
  userId: string;
  cycle: Cycle;
  onClose: () => void;
  onInsightsGenerated: () => void;
}

const CycleDetailsModal = ({
  userId,
  cycle,
  onClose,
  onInsightsGenerated,
}: CycleDetailsModalProps) => {
  console.log('Cycle data in modal:', cycle); // Debugging log
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState(cycle.aiInsights);
  const [showInsights, setShowInsights] = useState(false);

  const handleGenerateInsights = async () => {
    setGeneratingInsights(true);
    try {
      const response = await progressTrackerApi.generateCycleInsights(userId, cycle.cycleId);
      if (response.success) {
        setInsights(response.data.insights);
        setShowInsights(true);
        toast.success('AI insights generated!');
        onInsightsGenerated();
      }
    } catch (error: any) {
      console.error('Failed to generate insights:', error);
      toast.error(error.message || 'Failed to generate insights. Try again later.');
    } finally {
      setGeneratingInsights(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateDuration = () => {
    const start = new Date(cycle.startDate);
    const end = new Date(cycle.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary flex items-center justify-between bg-gradient-to-r from-secondary/50 to-accent/30">
          <div>
            <h2 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="text-primary" size={24} />
              Cycle Details
            </h2>
            <p className="text-sm text-muted mt-1">
              {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} className="text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Cycle Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-secondary/30 rounded-xl border border-secondary text-center">
              <div className="text-2xl font-bold text-primary">{calculateDuration()} days</div>
              <div className="text-xs text-muted mt-1">Period Duration</div>
            </div>
            <div className="p-4 bg-secondary/30 rounded-xl border border-secondary text-center">
              <div className="text-2xl font-bold text-gray-800">{cycle.cycleLength || 'N/A'}</div>
              <div className="text-xs text-muted mt-1">Cycle Length</div>
            </div>
            <div className="p-4 bg-secondary/30 rounded-xl border border-secondary text-center">
              <div className="text-2xl font-bold text-gray-800 capitalize">{cycle.flow}</div>
              <div className="text-xs text-muted mt-1">Flow</div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-4 mb-6">
            <DetailRow icon={<Droplet size={18} />} label="Flow" value={cycle.flow} />
            <DetailRow icon={<Droplet size={18} />} label="Color" value={cycle.color} />
            <DetailRow
              icon={<Droplet size={18} />}
              label="Color Consistency"
              value={cycle.colorConsistency}
            />
            <DetailRow icon={<Droplet size={18} />} label="Blood Clots" value={cycle.clots} />
            <DetailRow
              icon={<Droplet size={18} />}
              label="Spotting"
              value={cycle.spotting ? 'Yes' : 'No'}
            />
            <DetailRow icon={<Droplet size={18} />} label="Odor" value={cycle.odor} />
            {cycle.comparedToLast && (
              <DetailRow
                icon={<AlertCircle size={18} />}
                label="Compared to Previous"
                value={cycle.comparedToLast}
              />
            )}
          </div>

          {/* AI Insights Section */}
          {cycle.insightsButtonVisible && !insights && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Sparkles className="text-primary" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Get AI Insights</h3>
                  <p className="text-sm text-muted mb-4">
                    Analyze your cycle patterns and get personalized insights based on PCOS
                    management guidelines.
                  </p>
                  <button
                    onClick={handleGenerateInsights}
                    disabled={generatingInsights}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingInsights ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <span className="flex items-center">
                        <Sparkles size={18} className="mr-2" />
                        Generate Insights
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Display Insights */}
          {(insights || showInsights) && (
            <div className="bg-secondary/30 rounded-2xl p-6 border border-secondary">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-primary" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">AI Analysis</h3>
              </div>

              {/* Medical Disclaimer */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex gap-3">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                <p className="text-xs text-blue-800">
                  💡 These insights are based on your tracked data and PCOS management guidelines.
                  This is not a medical diagnosis. Always consult your healthcare provider for
                  personalized advice.
                </p>
              </div>

              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-line">{insights}</p>
              </div>
            </div>
          )}

          {insights && !showInsights && (
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="w-full btn-outline mt-4"
            >
              {showInsights ? 'Hide' : 'View'} AI Insights
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary">
          <button onClick={onClose} className="btn-primary w-full">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper component for detail rows
const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100">
    <div className="flex items-center gap-3 text-muted">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    <div className="text-gray-800 font-medium">{value}</div>
  </div>
);

export default CycleDetailsModal;
