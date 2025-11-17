import { Alert } from 'antd';
import { CheckCircle } from 'lucide-react';

interface MedicalDisclaimerProps {
  onAcknowledge: () => void;
}

const MedicalDisclaimer = ({ onAcknowledge }: MedicalDisclaimerProps) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-danger mb-6 flex items-center gap-2">
          ⚠️ Medical Disclaimer
        </h2>

        <div className="space-y-4 text-gray-700 mb-8">
          <p>
            <strong>Sakhee</strong> is an AI-powered educational health companion designed to
            provide lifestyle guidance and information for managing PCOS/PCOD symptoms.
          </p>
          <Alert
            showIcon
            message="Important"
            type="warning"
            description={
              <ul className="space-y-2 text-sm">
                <li>Sakhee does NOT diagnose conditions</li>
                <li>Sakhee does NOT prescribe medications</li>
                <li>Sakhee is NOT a replacement for professional medical advice</li>
                <li>Sakhee cannot provide emergency care</li>
              </ul>
            }
          />

          <p>
            <strong>Always consult a qualified healthcare professional:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>For diagnosis confirmation</li>
            <li>For prescription medications</li>
            <li>For fertility planning</li>
            <li>For abnormal lab results</li>
            <li>If symptoms worsen or don't improve</li>
          </ul>

          <Alert
            showIcon
            type="error"
            message="In case of emergency"
            description={
              <>
                <p className="text-sm">
                  In case of severe pain, heavy bleeding, or other emergencies, seek immediate
                  medical attention:
                </p>
                <p className="font-bold text-sm mt-2">
                  Call 102 (Ambulance) or visit the nearest hospital
                </p>
              </>
            }
          />
        </div>

        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
          <span className="text-sm">I understand and accept the medical disclaimer</span>
        </label>

        <button
          onClick={onAcknowledge}
          className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-secondary transition"
        >
          <CheckCircle className="inline mr-2" size={20} />I Acknowledge
        </button>

        <p className="text-xs text-muted text-center mt-4">
          By proceeding, you agree to use Sakhee as an educational tool only
        </p>
      </div>
    </div>
  );
};

export default MedicalDisclaimer;
