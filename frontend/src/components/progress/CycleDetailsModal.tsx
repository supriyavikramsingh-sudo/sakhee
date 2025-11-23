import { X, Calendar, Droplet, AlertCircle } from 'lucide-react';

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
  cycle: Cycle;
  onClose: () => void;
}

const CycleDetailsModal = ({ cycle, onClose }: CycleDetailsModalProps) => {
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary">
          <button onClick={onClose} className="btn-primary w-full">
            Close
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
