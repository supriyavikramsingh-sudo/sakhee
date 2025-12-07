import React from 'react';
import {
  X,
  Calendar,
  Activity,
  Moon,
  Brain,
  Zap,
  FileText,
  TrendingUp,
  Edit3,
  Lock,
} from 'lucide-react';
import type { CalendarEntry } from '../../hooks/useDailyTrackingCalendarOptimized';
import { canEditEntry, getEditableMessage } from '../../utils/entryHelpers';

interface DailyTrackingEntryPreviewProps {
  entry: CalendarEntry | null;
  date: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (entry: CalendarEntry, date: string) => void; // Optional edit callback
}

/**
 * Format date to readable string
 */
function formatDateReadable(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get status badge styling
 */
function getStatusBadge(status: string): { text: string; color: string } {
  switch (status) {
    case 'complete':
      return { text: 'Complete Entry', color: 'bg-green-100 text-green-800 border-green-300' };
    case 'partial':
      return { text: 'Partial Entry', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    case 'empty':
      return { text: 'No Entry', color: 'bg-gray-100 text-gray-600 border-gray-300' };
    default:
      return { text: 'Unknown', color: 'bg-gray-100 text-gray-600 border-gray-300' };
  }
}

export const DailyTrackingEntryPreview: React.FC<DailyTrackingEntryPreviewProps> = ({
  entry,
  date,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!isOpen) return null;

  const { text: statusText, color: statusColor } = getStatusBadge(entry?.status || 'empty');
  const isEmpty = !entry || entry.status === 'empty';
  const canEdit = entry && canEditEntry(date);
  const editMessage = getEditableMessage(date);

  const handleEdit = () => {
    if (canEdit && entry && onEdit) {
      onEdit(entry, date);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-primary" size={24} />
                <h2 className="text-2xl font-semibold font-lora text-gray-800">Daily Entry</h2>
              </div>
              <p className="text-sm text-gray-600">{formatDateReadable(date)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              aria-label="Close"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* Status Badge */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${statusColor}`}
            >
              {statusText}
              {entry && entry.completenessScore > 0 && (
                <span className="ml-1 opacity-70">({entry.completenessScore}%)</span>
              )}
            </span>

            {/* Edit Button (only for entries within 7 days) */}
            {!isEmpty &&
              onEdit &&
              (canEdit ? (
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-dark transition-all shadow-sm"
                >
                  <Edit3 size={14} />
                  Edit Entry
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-xs font-medium border border-gray-300">
                  <Lock size={14} />
                  {editMessage}
                </div>
              ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isEmpty ? (
            /* Empty State */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Entry for This Day</h3>
              <p className="text-sm text-gray-500 mb-6">You didn't log any metrics on this date.</p>
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          ) : (
            /* Entry Data */
            <div className="space-y-6">
              {/* Physical Metrics */}
              {(entry.weight || entry.waistCircumference) && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 rounded-2xl p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="text-blue-600" size={20} />
                    <h3 className="text-base font-semibold text-gray-800">Physical Metrics</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {entry.weight && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Weight</p>
                        <p className="text-lg font-semibold text-gray-800">{entry.weight} kg</p>
                      </div>
                    )}
                    {entry.waistCircumference && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Waist</p>
                        <p className="text-lg font-semibold text-gray-800">
                          {entry.waistCircumference} cm
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activity */}
              {(entry.exercisedToday !== undefined || entry.activityLevel) && (
                <div className="bg-gradient-to-r from-green-50 to-green-50/50 rounded-2xl p-5 border border-green-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="text-green-600" size={20} />
                    <h3 className="text-base font-semibold text-gray-800">Activity</h3>
                  </div>
                  <div className="space-y-3">
                    {entry.exercisedToday !== undefined && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Exercised Today</p>
                        <p className="text-lg font-semibold text-gray-800">
                          {entry.exercisedToday ? '💪 Yes' : '🛋️ No'}
                        </p>
                      </div>
                    )}
                    {entry.activityLevel && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Activity Level</p>
                        <p className="text-sm text-gray-700 capitalize">
                          {entry.activityLevel.replace('_', ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sleep */}
              {entry.sleepHours && (
                <div className="bg-gradient-to-r from-purple-50 to-purple-50/50 rounded-2xl p-5 border border-purple-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Moon className="text-purple-600" size={20} />
                    <h3 className="text-base font-semibold text-gray-800">Sleep</h3>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Hours Slept</p>
                    <p className="text-lg font-semibold text-gray-800">{entry.sleepHours} hours</p>
                  </div>
                </div>
              )}

              {/* Stress & Energy */}
              {(entry.stressLevel || entry.energyLevel) && (
                <div className="bg-gradient-to-r from-orange-50 to-orange-50/50 rounded-2xl p-5 border border-orange-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="text-orange-600" size={20} />
                    <h3 className="text-base font-semibold text-gray-800">Mental Wellbeing</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {entry.stressLevel && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Stress Level</p>
                        <p className="text-sm text-gray-800 capitalize font-medium">
                          {entry.stressLevel}
                        </p>
                      </div>
                    )}
                    {entry.energyLevel && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">
                          <Zap className="inline mr-1" size={12} />
                          Energy Level
                        </p>
                        <p className="text-sm text-gray-800 capitalize font-medium">
                          {entry.energyLevel}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Symptoms */}
              {entry.symptomsTags && entry.symptomsTags.length > 0 && (
                <div className="bg-gradient-to-r from-pink-50 to-pink-50/50 rounded-2xl p-5 border border-pink-100">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-pink-600" size={20} />
                    <h3 className="text-base font-semibold text-gray-800">Symptoms</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.symptomsTags.map((symptom, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-white border border-pink-200 rounded-xl text-xs font-medium text-gray-700"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl p-5 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-gray-600" size={20} />
                    <h3 className="text-base font-semibold text-gray-800">Notes</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {entry.notes}
                  </p>
                </div>
              )}

              {/* Submission Timestamp */}
              {entry.submittedAt && (
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Logged on{' '}
                    {new Date(entry.submittedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-3xl">
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 btn-secondary">
                Close
              </button>
              {/* TODO Phase 4: Add Edit button for last 7 days */}
              {/* <button className="flex-1 btn-primary">
                Edit Entry
              </button> */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTrackingEntryPreview;
