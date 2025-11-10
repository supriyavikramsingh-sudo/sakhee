import { Alert } from 'antd';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import firestoreService from '../../services/firestoreService';
import { useAuthStore } from '../../store/authStore';

const CalorieDisclaimer = () => {
  const { user, userProfile } = useAuthStore();
  const [disclaimerText, setDisclaimerText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserMetrics = async () => {
      try {
        // Try to get user profile if not already loaded
        let profile = userProfile;

        if (!profile && user?.uid) {
          const result = await firestoreService.getUserProfile(user.uid);
          if (result.success) {
            profile = result.data;
          }
        }

        // Check if we have calculated metrics
        if (profile?.daily_calorie_requirement && profile?.profileData) {
          const { daily_calorie_requirement, profileData } = profile;

          const height = profileData.height_cm || 'N/A';
          const weight = profileData.current_weight_kg || 'N/A';
          const activityLevel = profileData.activityLevel || 'moderate';
          const weightGoal = profileData.weight_goal || 'maintain';

          // Map activity levels to readable text
          const activityLabelMap: Record<string, string> = {
            sedentary: 'Sedentary',
            light: 'Lightly Active',
            moderate: 'Moderately Active',
            very: 'Very Active',
          };

          // Map weight goals to readable text
          const goalLabelMap: Record<string, string> = {
            maintain: 'maintain weight',
            lose: 'lose weight',
            gain: 'gain weight',
          };

          const activityLabel = activityLabelMap[activityLevel] || activityLevel;
          const goalLabel = goalLabelMap[weightGoal] || weightGoal;

          setDisclaimerText(
            `All meals have been generated based on your personalized daily calorie requirement of ${daily_calorie_requirement} kcal to ${goalLabel}, considering your height (${height} cm), current weight (${weight} kg), and ${activityLabel} lifestyle.`
          );
        } else {
          // Fallback to generic message if no personalized data
          setDisclaimerText(
            'All meals have been generated considering the average daily calorie requirements of 2000 kcal for a moderately active adult woman who is approximately 5\'2" to 5\'4" and weighs 56 kg.'
          );
        }
      } catch (error) {
        console.error('Failed to load user metrics for disclaimer:', error);
        // Fallback message
        setDisclaimerText(
          'All meals have been generated considering standard PCOS-friendly nutritional guidelines.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadUserMetrics();
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-gray-700">Loading nutritional information...</p>
        </div>
      </div>
    );
  }

  return (
    <Alert
      showIcon
      description={
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> {disclaimerText}
        </p>
      }
    />
  );
};

export default CalorieDisclaimer;
