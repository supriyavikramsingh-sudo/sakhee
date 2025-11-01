import { FileText, Sparkles, Target } from 'lucide-react';

interface MealInfoTipSectionProps {
  profileData: {
    allergies?: string[];
    symptoms?: string[];
    goals?: string[];
    activityLevel?: string;
    cuisines?: string[];
  } | null;
  userReport: string | null;
  displayPersonalizationSources: {
    onboarding: boolean;
    medicalReport: boolean;
  };
}

const MealInfoTipSection = ({
  profileData,
  displayPersonalizationSources,
  userReport,
}: MealInfoTipSectionProps) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          key={`onboarding-${displayPersonalizationSources.onboarding}`}
          className={`p-3 rounded-lg ${
            displayPersonalizationSources.onboarding
              ? 'bg-white border-2 border-primary'
              : 'bg-gray-100 border-2 border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles
              className={
                displayPersonalizationSources.onboarding ? 'text-primary' : 'text-gray-400'
              }
              size={16}
            />
            <span
              className={`text-xs font-semibold ${
                displayPersonalizationSources.onboarding ? 'text-primary' : 'text-gray-500'
              }`}
            >
              ONBOARDING PROFILE
            </span>
          </div>
          {displayPersonalizationSources.onboarding ? (
            <ul className="text-xs text-gray-700 space-y-1">
              {profileData?.allergies && profileData?.allergies?.length > 0 && (
                <li>• Allergies: {profileData.allergies.join(', ')}</li>
              )}
              {profileData?.symptoms && profileData?.symptoms?.length > 0 && (
                <li>• Symptoms: {profileData.symptoms.slice(0, 2).join(', ')}</li>
              )}
              {profileData?.goals && profileData?.goals?.length > 0 && (
                <li>• Goals: {profileData.goals.slice(0, 2).join(', ')}</li>
              )}
              {profileData?.activityLevel && <li>• Activity: {profileData.activityLevel}</li>}
              {profileData?.cuisines && (
                <li>• Cuisines: {profileData.cuisines.slice(0, 2).join(', ')}</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Complete onboarding to enable</p>
          )}
        </div>

        {/* Medical Reports */}
        <div
          key={`medical-${!!userReport}`}
          className={`p-3 rounded-lg ${
            displayPersonalizationSources.medicalReport
              ? 'bg-white border-2 border-primary'
              : 'bg-gray-100 border-2 border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText
              className={
                displayPersonalizationSources.medicalReport ? 'text-primary' : 'text-gray-400'
              }
              size={16}
            />
            <span
              className={`text-xs font-semibold ${
                displayPersonalizationSources.medicalReport ? 'text-primary' : 'text-gray-500'
              }`}
            >
              MEDICAL REPORTS
            </span>
          </div>
          {displayPersonalizationSources.medicalReport ? (
            <ul className="text-xs text-gray-700 space-y-1">
              <li>✓ Latest report analyzed</li>
              <li>✓ Lab values considered</li>
              <li>✓ Nutritional needs adjusted</li>
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Upload reports for more precision</p>
          )}
        </div>

        {/* RAG Knowledge Base */}
        <div className="p-3 rounded-lg bg-white border-2 border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-primary" size={16} />
            <span className="text-xs font-semibold text-primary">PCOS KNOWLEDGE BASE</span>
          </div>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>✓ Evidence-based guidelines</li>
            <li>✓ Regional meal templates</li>
            <li>✓ PCOS-friendly ingredients</li>
          </ul>
        </div>
      </div>
      <div className="mt-3 p-3 bg-white rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>💡 Pro Tip:</strong> Customize regions and cuisines below to try different
          options. Your selections take priority over onboarding data.
        </p>
      </div>
    </>
  );
};

export default MealInfoTipSection;
