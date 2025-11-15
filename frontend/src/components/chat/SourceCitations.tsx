import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

type Source = {
  type: string;
  content?: string;
  disclaimer?: string;
  labCount?: number;
  count?: number;
};

interface SourceCitationsProps {
  sources: Source[];
}

const SourceCitations = ({ sources }: SourceCitationsProps) => {
  const [expanded, setExpanded] = useState(false);
  const { userProfile } = useAuthStore();

  if (!sources || sources.length === 0) return null;

  // Function to get formatted source title
  const getSourceTitle = (source: Source) => {
    switch (source.type) {
      case 'reddit':
        return 'Reddit Community Insights';
      case 'nutrition':
        return 'Spoonacular Database';
      case 'medical':
      case 'lab_guidance':
        return 'Sakhee Database';
      case 'medical_report':
        const userName = userProfile?.name || userProfile?.profileData?.name || 'Your';
        return `${userName} Report Data`;
      default:
        return 'Medical Literature';
    }
  };

  // Function to get source tag label
  const getSourceTag = (source: Source) => {
    switch (source.type) {
      case 'reddit':
        return 'Reddit';
      case 'nutrition':
        return 'Spoonacular';
      case 'medical':
        return 'Medical KB';
      case 'lab_guidance':
        return 'Lab Guidance';
      case 'medical_report':
        return 'Your Report';
      default:
        return source.type || 'Reference';
    }
  };

  return (
    <div className="ml-8 mt-3 p-3 bg-surface rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-muted hover:text-primary transition"
      >
        <ChevronDown
          size={16}
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
          className="transition-transform"
        />
        Sources ({sources.length})
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 text-xs">
          {sources.map((source, idx) => (
            <div key={idx} className="p-2 bg-white rounded border-l-4 border border-primary">
              <p className="font-medium text-gray-900 mb-1">{getSourceTitle(source)}</p>
              {source.content && <p className="text-muted line-clamp-2">{source.content}</p>}
              {source.disclaimer && (
                <p className="text-muted italic text-xs mt-1">{source.disclaimer}</p>
              )}
              {source.labCount && (
                <p className="text-muted text-xs mt-1">{source.labCount} lab values analyzed</p>
              )}
              {source.count && source.type !== 'medical_report' && (
                <p className="text-muted text-xs mt-1">{source.count} documents retrieved</p>
              )}
              <span className="inline-block mt-1 px-2 py-1 bg-primary bg-opacity-10 text-primary rounded text-xs">
                {getSourceTag(source)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SourceCitations;
