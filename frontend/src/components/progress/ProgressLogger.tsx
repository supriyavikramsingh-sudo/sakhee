import { Loader, Save, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/apiClient';

interface ProgressLoggerProps {
  userId: string;
  onComplete: (newEntry: any) => void;
  onCancel: () => void;
}

const ProgressLogger = ({ userId, onComplete, onCancel }: ProgressLoggerProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symptoms: [],
    weight: '',
    cycle: '',
    mood: 5,
    energy: 5,
    sleep: 7,
    exercise: '',
    notes: '',
  });

  const symptomOptions = [
    'Irregular periods',
    'Acne',
    'Weight changes',
    'Hair loss',
    'Fatigue',
    'Mood swings',
    'Cravings',
    'Bloating',
    'Headache',
    'Pain',
  ];

  const handleSymptomToggle = (symptom) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.logProgress(userId, {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        sleep: parseFloat(formData.sleep),
      });

      onComplete(response.data);
    } catch (error) {
      console.error('Failed to log progress:', error);
      alert('Failed to log progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-surface p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">{t('progress.logEntry')}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-surface rounded transition">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium mb-2">Symptoms Today</label>
            <div className="grid grid-cols-2 gap-2">
              {symptomOptions.map((symptom) => (
                <label
                  key={symptom}
                  className="flex items-center gap-2 p-3 border border-surface rounded-lg cursor-pointer hover:bg-surface transition"
                >
                  <input
                    type="checkbox"
                    checked={formData.symptoms.includes(symptom)}
                    onChange={() => handleSymptomToggle(symptom)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">{symptom}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium mb-2">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              placeholder="e.g., 65.5"
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Cycle Day */}
          <div>
            <label className="block text-sm font-medium mb-2">Cycle Day (optional)</label>
            <input
              type="text"
              value={formData.cycle}
              onChange={(e) => setFormData({ ...formData, cycle: e.target.value })}
              placeholder="e.g., Day 14"
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Mood Scale */}
          <div>
            <label className="block text-sm font-medium mb-2">Mood (1-10): {formData.mood}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.mood}
              onChange={(e) => setFormData({ ...formData, mood: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>😞 Low</span>
              <span>😊 High</span>
            </div>
          </div>

          {/* Energy Level */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Energy Level (1-10): {formData.energy}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.energy}
              onChange={(e) => setFormData({ ...formData, energy: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>🔋 Low</span>
              <span>⚡ High</span>
            </div>
          </div>

          {/* Sleep Hours */}
          <div>
            <label className="block text-sm font-medium mb-2">Sleep Hours: {formData.sleep}h</label>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={formData.sleep}
              onChange={(e) => setFormData({ ...formData, sleep: parseFloat(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>0h</span>
              <span>12h</span>
            </div>
          </div>

          {/* Exercise */}
          <div>
            <label className="block text-sm font-medium mb-2">Exercise Today</label>
            <input
              type="text"
              value={formData.exercise}
              onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
              placeholder="e.g., 30 min yoga"
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any observations, feelings, or notes..."
              rows={3}
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-surface">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-surface rounded-lg hover:bg-surface transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProgressLogger;
