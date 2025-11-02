import { detectRegionalLanguage } from '../utils/languageDetector.js';
import { Logger } from '../utils/logger.js';
import { checkForObfuscatedNSFW, containsAnyObfuscatedKeyword } from '../utils/textNormalizer.js';

const logger = new Logger('SafetyGuards');

const DANGEROUS_KEYWORDS = [
  'abortion',
  'pregnancy loss',
  'extreme pain',
  'heavy bleeding',
  'suicide',
  'self-harm',
  'murder',
  'kill',
  'death',
  'violence',
  'bomb',
  'explosion',
  'poison',
];

const MEDICATION_KEYWORDS = ['overdose', 'abuse', 'addiction', 'illegal'];

// NSFW/Inappropriate content keywords (in addition to textNormalizer defaults)
const NSFW_KEYWORDS = [
  'sex',
  'sexual',
  'porn',
  'nude',
  'naked',
  'explicit',
  'adult',
  'xxx',
  'nsfw',
  'intimate',
  'erotic',
  'dick',
  'pussy',

  // Add more as needed while keeping professional
];

export const safetyGuards = (req, res, next) => {
  const userMessage = req.body?.message || '';
  const normalizedMessage = userMessage.toLowerCase();

  // STEP 0: Check for regional language (Hinglish, Tanglish, etc.)
  const languageCheck = detectRegionalLanguage(userMessage);
  if (languageCheck.isRegionalLanguage) {
    logger.warn('⚠️ Safety guard triggered: Regional language detected', {
      detectedLanguage: languageCheck.detectedLanguage,
      matchedWords: languageCheck.matchedWords,
      score: languageCheck.score,
      messagePreview: userMessage.substring(0, 100),
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Language not supported',
        details: `We detected that you're writing in ${languageCheck.detectedLanguage} using English letters. Currently, Sakhee only supports English. We're working on adding support for regional languages soon! In the meantime, please communicate in English, or enable regional language settings in your profile when available.`,
        detectedLanguage: languageCheck.detectedLanguage,
      },
    });
  }

  // STEP 1: ALWAYS check for NSFW content first (highest priority for blocking)
  const nsfwCheck = checkForObfuscatedNSFW(userMessage);
  if (nsfwCheck.isNSFW) {
    logger.warn('⚠️ Safety guard triggered: Obfuscated NSFW content detected', {
      matchedKeyword: nsfwCheck.matchedKeyword,
      messagePreview: userMessage.substring(0, 50),
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Inappropriate content detected',
        details:
          'This platform is designed for PCOS health management. Please keep conversations professional and health-focused.',
      },
    });
  }

  // STEP 2: Check for additional NSFW keywords with obfuscation detection
  const additionalNSFW = containsAnyObfuscatedKeyword(userMessage, NSFW_KEYWORDS);
  if (additionalNSFW.found) {
    logger.warn('⚠️ Safety guard triggered: NSFW keyword detected', {
      matchedKeyword: additionalNSFW.matchedKeyword,
      messagePreview: userMessage.substring(0, 50),
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Inappropriate content detected',
        details:
          'This platform is designed for PCOS health management. Please keep conversations professional and health-focused.',
      },
    });
  }

  // STEP 3: Check for dangerous keywords with obfuscation detection
  const dangerousCheck = containsAnyObfuscatedKeyword(userMessage, DANGEROUS_KEYWORDS);
  if (dangerousCheck.found) {
    logger.warn('⚠️ Safety guard triggered: Dangerous keyword detected', {
      matchedKeyword: dangerousCheck.matchedKeyword,
    });
    req.requiresDoctorConsultation = true;
    req.severityLevel = 'high';
  }

  // STEP 4: Check for medication abuse with obfuscation detection
  const medicationCheck = containsAnyObfuscatedKeyword(userMessage, MEDICATION_KEYWORDS);
  if (medicationCheck.found) {
    logger.warn('⚠️ Safety guard triggered: Medication abuse keyword detected', {
      matchedKeyword: medicationCheck.matchedKeyword,
    });

    req.requiresDoctorConsultation = true;
    req.severityLevel = 'critical';
  }

  next();
};

export default safetyGuards;
