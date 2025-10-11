const DANGEROUS_KEYWORDS = [
  'abortion',
  'pregnancy loss',
  'extreme pain',
  'heavy bleeding',
  'suicide',
  'self-harm'
];

const MEDICATION_KEYWORDS = [
  'overdose',
  'abuse',
  'addiction',
  'illegal'
];

export const safetyGuards = (req, res, next) => {
  const userMessage = req.body?.message?.toLowerCase() || '';
  
  // Check for dangerous keywords
  const hasDangerousKeyword = DANGEROUS_KEYWORDS.some(keyword =>
    userMessage.includes(keyword.toLowerCase())
  );

  if (hasDangerousKeyword) {
    console.warn('⚠️ Safety guard triggered: Dangerous keyword detected');
    req.requiresDoctorConsultation = true;
    req.severityLevel = 'high';
  }

  // Check for medication abuse
  const hasMedicationAbuse = MEDICATION_KEYWORDS.some(keyword =>
    userMessage.includes(keyword.toLowerCase())
  );

  if (hasMedicationAbuse) {
    console.warn('⚠️ Safety guard triggered: Medication abuse detected');
    req.requiresDoctorConsultation = true;
    req.severityLevel = 'critical';
  }

  next();
};

export default safetyGuards;