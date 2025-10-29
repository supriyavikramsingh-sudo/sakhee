import { FileText } from 'lucide-react';

const LabContextBadge = ({ sources, contextUsed }) => {
  if (!sources || !contextUsed) return null;

  const medicalReportSource = sources.find((s) => s.type === 'medical_report');
  const labGuidanceSource = sources.find((s) => s.type === 'lab_guidance');

  if (!medicalReportSource && !contextUsed.labValues) return null;

  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-2">
        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-blue-900">Personalized Using Your Lab Values</p>
          </div>

          {medicalReportSource && (
            <p className="text-xs text-blue-700">
              {medicalReportSource.labCount} lab values analyzed from your medical report
              {medicalReportSource.uploadedAt && (
                <span className="ml-1">
                  (uploaded {new Date(medicalReportSource.uploadedAt).toLocaleDateString()})
                </span>
              )}
            </p>
          )}

          {labGuidanceSource && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-xs text-blue-600">
                ✓ Evidence-based dietary guidance applied for your specific lab abnormalities
              </span>
            </div>
          )}

          {contextUsed.labGuidance && (
            <div className="mt-1 text-xs text-blue-600">
              ✓ RAG-retrieved recommendations specific to your metabolic markers
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabContextBadge;
