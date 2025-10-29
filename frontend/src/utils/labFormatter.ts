export const LAB_VALUE_NAMES: Record<string, string> = {
  // Glucose & Insulin
  glucose_fasting: 'Fasting Glucose',
  glucose_plasma_fasting: 'Fasting Plasma Glucose',
  insulin_fasting: 'Fasting Insulin',
  insulin_pp: 'Post-Prandial Insulin',
  homa_ir: 'HOMA-IR',
  hba1c: 'HbA1c',

  // Lipid Profile
  cholesterol_total: 'Total Cholesterol',
  triglycerides: 'Triglycerides',
  hdl_cholesterol: 'HDL Cholesterol',
  ldl_cholesterol: 'LDL Cholesterol',
  vldl_cholesterol: 'VLDL Cholesterol',

  // Hormones
  fsh: 'FSH',
  lh: 'LH',
  lh_fsh_ratio: 'LH:FSH Ratio',
  prolactin: 'Prolactin',
  testosterone_total: 'Total Testosterone',
  testosterone_free: 'Free Testosterone',
  dheas: 'DHEA-S',
  amh: 'Anti-Müllerian Hormone (AMH)',
  estradiol: 'Estradiol (E2)',
  progesterone: 'Progesterone',

  // Thyroid
  tsh: 'TSH',
  t3_free: 'Free T3',
  t4_free: 'Free T4',
  t3_total: 'Total T3',
  t4_total: 'Total T4',

  // Vitamins & Minerals
  vitamin_d: 'Vitamin D (25-OH)',
  vitamin_b12: 'Vitamin B12',
  iron: 'Serum Iron',
  ferritin: 'Ferritin',
  tibc: 'TIBC',
  transferrin_saturation: 'Transferrin Saturation',

  // Other
  crp: 'C-Reactive Protein (CRP)',
  cortisol: 'Cortisol',
  calcium: 'Calcium',
  hemoglobin: 'Hemoglobin',
};

/**
 * Format lab value key to display name
 * @param {string} key - Internal lab value key (e.g., 'homa_ir')
 * @returns {string} - Formatted display name (e.g., 'HOMA-IR')
 */
export function formatLabName(key: string) {
  return LAB_VALUE_NAMES[key] || formatFallback(key);
}

/**
 * Fallback formatter for unmapped keys
 * Converts snake_case to Title Case
 */
function formatFallback(key: string) {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getLabCategory(key: string): string {
  const categories = {
    glucose_insulin: ['glucose_fasting', 'insulin_fasting', 'homa_ir', 'hba1c', 'insulin_pp'],
    lipid_profile: [
      'cholesterol_total',
      'triglycerides',
      'hdl_cholesterol',
      'ldl_cholesterol',
      'vldl_cholesterol',
    ],
    hormones: [
      'fsh',
      'lh',
      'lh_fsh_ratio',
      'prolactin',
      'testosterone_total',
      'testosterone_free',
      'dheas',
      'amh',
      'estradiol',
      'progesterone',
    ],
    thyroid: ['tsh', 't3_free', 't4_free', 't3_total', 't4_total'],
    vitamins: ['vitamin_d', 'vitamin_b12'],
    iron_studies: ['iron', 'ferritin', 'tibc', 'transferrin_saturation'],
    inflammation: ['crp', 'cortisol'],
  };

  for (const [category, keys] of Object.entries(categories)) {
    if (keys.includes(key)) {
      return category;
    }
  }

  return 'other';
}

/**
 * Get category display name
 */
export const CATEGORY_NAMES = {
  glucose_insulin: 'Glucose & Insulin',
  lipid_profile: 'Lipid Profile',
  hormones: 'Hormones',
  thyroid: 'Thyroid Function',
  vitamins: 'Vitamins',
  iron_studies: 'Iron Studies',
  inflammation: 'Inflammation Markers',
  other: 'Other Tests',
};

/**
 * Group lab values by category
 * @param {Object} labValues - Lab values object
 * @returns {Object} - Grouped lab values
 */
export function groupLabValuesByCategory(labValues) {
  const grouped = {};

  Object.entries(labValues).forEach(([key, data]) => {
    const category = getLabCategory(key);
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({ key, ...data });
  });

  return grouped;
}

export default {
  formatLabName,
  getLabCategory,
  groupLabValuesByCategory,
  LAB_VALUE_NAMES,
  CATEGORY_NAMES,
};
