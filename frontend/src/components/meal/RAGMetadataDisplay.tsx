import { AlertCircle, CheckCircle, Database, Info, TrendingUp } from 'lucide-react';

const RAGMetadataDisplay = ({ ragMetadata, personalizationSources }) => {
  if (!ragMetadata) return null;

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'high':
        return 'text-success border-success bg-success';
      case 'medium':
        return 'text-warning border-warning bg-warning';
      case 'low':
        return 'text-danger border-danger bg-danger';
      default:
        return 'text-muted border-muted bg-muted';
    }
  };

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'high':
        return <CheckCircle size={18} />;
      case 'medium':
        return <TrendingUp size={18} />;
      case 'low':
        return <AlertCircle size={18} />;
      default:
        return <Info size={18} />;
    }
  };

  const getQualityLabel = (quality) => {
    switch (quality) {
      case 'high':
        return 'Excellent Knowledge Base Coverage';
      case 'medium':
        return 'Good Knowledge Base Coverage';
      case 'low':
        return 'Limited Knowledge Base Coverage';
      default:
        return 'Unknown Coverage';
    }
  };

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Database className="text-info" size={20} />
        <h3 className="text-sm font-bold text-gray-800">🧠 AI Knowledge Sources Used</h3>
      </div>

      {/* RAG Quality Badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 mb-3 ${getQualityColor(
          personalizationSources.ragQuality
        )} bg-opacity-10`}
      >
        {getQualityIcon(personalizationSources.ragQuality)}
        <span className="text-xs font-semibold">
          {getQualityLabel(personalizationSources.ragQuality)}
        </span>
      </div>

      {/* Sources Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {/* Meal Templates */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-600">Meal Templates</span>
            <span
              className={`text-lg font-bold ${
                ragMetadata.mealTemplatesUsed > 0 ? 'text-primary' : 'text-gray-400'
              }`}
            >
              {ragMetadata.mealTemplatesUsed}
            </span>
          </div>
          <p className="text-xs text-gray-500">Regional recipe variations retrieved</p>
        </div>

        {/* Nutrition Guidelines */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-600">Nutrition Guidelines</span>
            <span
              className={`text-lg font-bold ${
                ragMetadata.nutritionGuidelinesUsed > 0 ? 'text-secondary' : 'text-gray-400'
              }`}
            >
              {ragMetadata.nutritionGuidelinesUsed}
            </span>
          </div>
          <p className="text-xs text-gray-500">PCOS-specific dietary rules applied</p>
        </div>

        {/* Symptom Recommendations */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-600">Symptom-Specific</span>
            <span
              className={`text-lg font-bold ${
                ragMetadata.symptomSpecificRecommendations ? 'text-success' : 'text-gray-400'
              }`}
            >
              {ragMetadata.symptomSpecificRecommendations ? '✓' : '—'}
            </span>
          </div>
          <p className="text-xs text-gray-500">Targeted ingredient recommendations</p>
        </div>
      </div>

      {/* Info Message */}
      <div className="flex items-start gap-2 p-2 bg-white bg-opacity-50 rounded-lg">
        <Info className="text-info flex-shrink-0 mt-0.5" size={14} />
        <p className="text-xs text-gray-600">
          This meal plan was generated using evidence-based PCOS nutrition guidelines and regional
          meal templates from our curated knowledge base. The AI retrieved and synthesized relevant
          information to create personalized recommendations.
        </p>
      </div>
    </div>
  );
};

export default RAGMetadataDisplay;
