/**
 * Complete PCOS Lab Value Reference Ranges
 *
 * All ranges are based on:
 * - Rotterdam Criteria for PCOS diagnosis
 * - Endocrine Society Clinical Practice Guidelines
 * - Indian Council of Medical Research (ICMR) guidelines for Indian population
 *
 * NOTE: These are general reference ranges. Always consult with healthcare provider
 * for personalized interpretation based on individual circumstances.
 */

const pcosLabRanges = {
  // ==================== GLUCOSE & INSULIN ====================
  glucose_fasting: {
    normal: { min: 70, max: 100 },
    elevated: 100,
    prediabetes: { min: 100, max: 125 },
    critical: 126, // Diabetes threshold
    unit: 'mg/dL',
    description: 'Fasting blood glucose level',
  },

  insulin_fasting: {
    normal: { min: 2, max: 25 },
    optimal: { min: 2, max: 7 },
    elevated: 10,
    pcosHigh: { min: 10, max: 30 },
    critical: 30,
    unit: 'µIU/mL',
    description: 'Fasting insulin level - marker of insulin resistance',
  },

  insulin_pp: {
    normal: { min: 18, max: 276 },
    elevated: 150,
    unit: 'µIU/mL',
    description: 'Post-prandial (2-hour) insulin level',
  },

  homa_ir: {
    normal: { min: 0, max: 2.5 },
    elevated: 2.5,
    pcosHigh: { min: 2.5, max: 5 },
    critical: 5,
    unit: '',
    description: 'HOMA-IR index - insulin resistance marker',
  },

  hba1c: {
    normal: { min: 4, max: 5.6 },
    prediabetes: { min: 5.7, max: 6.4 },
    critical: 6.5, // Diabetes threshold
    unit: '%',
    description: 'Glycated hemoglobin - 3-month average blood sugar',
  },

  // ==================== LIPID PROFILE ====================
  cholesterol_total: {
    optimal: { min: 0, max: 200 },
    normal: { min: 0, max: 200 },
    borderline: { min: 200, max: 239 },
    elevated: 200,
    high: 240,
    unit: 'mg/dL',
    description: 'Total cholesterol',
  },

  triglycerides: {
    optimal: { min: 0, max: 150 },
    normal: { min: 0, max: 150 },
    borderline: { min: 150, max: 199 },
    elevated: 150,
    high: 200,
    critical: 500,
    unit: 'mg/dL',
    description: 'Triglycerides - fat in blood',
  },

  hdl_cholesterol: {
    low: 40, // Risk factor for women
    normal: { min: 50, max: 100 },
    optimal: { min: 60, max: 100 },
    unit: 'mg/dL',
    description: 'HDL - "good" cholesterol',
  },

  ldl_cholesterol: {
    optimal: { min: 0, max: 100 },
    normal: { min: 0, max: 129 },
    borderline: { min: 130, max: 159 },
    elevated: 130,
    high: 160,
    critical: 190,
    unit: 'mg/dL',
    description: 'LDL - "bad" cholesterol',
  },

  vldl_cholesterol: {
    normal: { min: 2, max: 30 },
    elevated: 30,
    unit: 'mg/dL',
    description: 'VLDL - very low density lipoprotein',
  },

  // ==================== HORMONES ====================
  lh: {
    follicular: { min: 2.4, max: 12.6 },
    midCycle: { min: 14, max: 95.6 },
    luteal: { min: 1, max: 11.4 },
    normal: { min: 1.9, max: 12.5 }, // Follicular phase average
    elevated: 12.5,
    pcosHigh: { min: 12.5, max: 20 },
    unit: 'mIU/mL',
    description: 'Luteinizing hormone',
  },

  fsh: {
    follicular: { min: 2.5, max: 10.2 },
    midCycle: { min: 3.4, max: 33.4 },
    luteal: { min: 1.5, max: 9.1 },
    normal: { min: 2.5, max: 10.2 }, // Follicular phase
    low: 2.5,
    unit: 'mIU/mL',
    description: 'Follicle stimulating hormone',
  },

  lh_fsh_ratio: {
    normal: { min: 0, max: 2 },
    elevated: 2,
    pcosHigh: { min: 2, max: 3 },
    critical: 3,
    unit: 'ratio',
    description: 'LH to FSH ratio - PCOS indicator when >2',
  },

  prolactin: {
    nonPregnant: { min: 2.8, max: 29.2 },
    normal: { min: 2.8, max: 29.2 },
    elevated: 29.2,
    high: 50,
    critical: 100,
    unit: 'ng/mL',
    description: 'Prolactin - milk production hormone',
  },

  testosterone_total: {
    normal: { min: 8, max: 60 },
    elevated: 50,
    pcosHigh: { min: 50, max: 80 },
    high: 80,
    unit: 'ng/dL',
    description: 'Total testosterone - androgen marker',
  },

  testosterone_free: {
    normal: { min: 0.3, max: 1.9 },
    elevated: 1.9,
    pcosHigh: { min: 1.9, max: 3 },
    unit: 'pg/mL',
    description: 'Free testosterone - bioavailable androgen',
  },

  dheas: {
    normal: { min: 95.8, max: 511.7 },
    elevated: 430,
    pcosHigh: { min: 430, max: 700 },
    high: 700,
    unit: 'µg/dL',
    description: 'DHEA-Sulfate - adrenal androgen',
  },

  amh: {
    veryLow: { min: 0, max: 0.5 },
    low: { min: 0.5, max: 1 },
    normal: { min: 1, max: 3.5 },
    optimal: { min: 1.5, max: 3 },
    elevated: 3.5,
    pcosHigh: { min: 3.5, max: 8 },
    high: 8,
    unit: 'ng/mL',
    description: 'Anti-Mullerian Hormone - ovarian reserve and PCOS marker',
  },

  estradiol: {
    follicular: { min: 19.5, max: 144.2 },
    midCycle: { min: 63.9, max: 356.7 },
    luteal: { min: 55.8, max: 214.2 },
    normal: { min: 19.5, max: 144.2 }, // Follicular average
    low: 30,
    unit: 'pg/mL',
    description: 'Estradiol (E2) - primary estrogen hormone',
  },

  progesterone: {
    follicular: { min: 0.1, max: 0.3 },
    luteal: { min: 1.2, max: 15.9 },
    normal: { min: 1.2, max: 15.9 }, // Luteal phase
    low: 5, // In luteal phase
    unit: 'ng/mL',
    description: 'Progesterone - corpus luteum hormone',
  },

  // ==================== THYROID ====================
  tsh: {
    normal: { min: 0.5, max: 4.5 },
    optimal: { min: 1, max: 2.5 },
    low: 0.5,
    subclinicalHigh: { min: 4.5, max: 10 },
    elevated: 4.5,
    high: 10,
    unit: 'µIU/mL',
    description: 'Thyroid Stimulating Hormone',
  },

  t3_free: {
    normal: { min: 2.3, max: 4.2 },
    low: 2.3,
    elevated: 4.2,
    unit: 'pg/mL',
    description: 'Free T3 - active thyroid hormone',
  },

  t4_free: {
    normal: { min: 0.89, max: 1.76 },
    low: 0.89,
    elevated: 1.76,
    unit: 'ng/dL',
    description: 'Free T4 - thyroid prohormone',
  },

  // ==================== VITAMINS & MINERALS ====================
  vitamin_d: {
    deficient: { min: 0, max: 20 },
    insufficient: { min: 20, max: 30 },
    normal: { min: 30, max: 100 },
    optimal: { min: 40, max: 80 },
    elevated: 100,
    toxic: 150,
    unit: 'ng/mL',
    description: 'Vitamin D (25-OH) - bone health and immunity',
    note: 'Some labs report in nmol/L - multiply by 2.5 to convert from ng/mL',
  },

  vitamin_b12: {
    deficient: { min: 0, max: 200 },
    low: { min: 200, max: 300 },
    normal: { min: 300, max: 900 },
    optimal: { min: 400, max: 900 },
    elevated: 900,
    unit: 'pg/mL',
    description: 'Vitamin B12 - nerve and blood health',
  },

  iron: {
    low: 50,
    normal: { min: 50, max: 170 },
    elevated: 170,
    high: 180,
    unit: 'µg/dL',
    description: 'Serum iron',
  },

  ferritin: {
    deficient: { min: 0, max: 10 },
    low: { min: 10, max: 30 },
    normal: { min: 10, max: 291 },
    optimal: { min: 30, max: 150 },
    elevated: 200,
    high: 300,
    unit: 'ng/mL',
    description: 'Ferritin - iron storage protein',
  },

  tibc: {
    low: 250,
    normal: { min: 250, max: 425 },
    elevated: 425,
    unit: 'µg/dL',
    description: 'Total Iron Binding Capacity',
  },

  transferrin_saturation: {
    low: 15,
    normal: { min: 15, max: 50 },
    elevated: 50,
    high: 60,
    unit: '%',
    description: 'Transferrin saturation percentage',
  },

  // ==================== INFLAMMATION & STRESS ====================
  crp: {
    normal: { min: 0, max: 1 },
    lowRisk: { min: 0, max: 1 },
    averageRisk: { min: 1, max: 3 },
    highRisk: { min: 3, max: 10 },
    elevated: 3,
    critical: 10,
    unit: 'mg/L',
    description: 'C-Reactive Protein - inflammation marker',
  },

  cortisol: {
    morning: { min: 6, max: 23 },
    afternoon: { min: 2, max: 14 },
    evening: { min: 2, max: 9 },
    normal: { min: 6, max: 23 }, // AM sample
    low: 6,
    elevated: 23,
    high: 30,
    unit: 'µg/dL',
    description: 'Cortisol - stress hormone',
  },

  // ==================== KIDNEY & LIVER (Basic) ====================
  creatinine: {
    normal: { min: 0.6, max: 1.2 },
    low: 0.6,
    elevated: 1.2,
    unit: 'mg/dL',
    description: 'Creatinine - kidney function marker',
  },

  alt_sgpt: {
    normal: { min: 7, max: 56 },
    elevated: 56,
    high: 100,
    unit: 'U/L',
    description: 'ALT (SGPT) - liver enzyme',
  },

  ast_sgot: {
    normal: { min: 5, max: 40 },
    elevated: 40,
    high: 100,
    unit: 'U/L',
    description: 'AST (SGOT) - liver enzyme',
  },
};

/**
 * Helper function to get severity for a given lab value
 * @param {string} labKey - The lab test identifier
 * @param {number} value - The measured value
 * @returns {string} - Severity level: 'optimal', 'normal', 'low', 'elevated', 'high', 'critical'
 */
export function getLabSeverity(labKey, value) {
  const ranges = pcosLabRanges[labKey];
  if (!ranges) return 'unknown';

  // Check for critical levels first
  if (ranges.critical && value >= ranges.critical) return 'critical';
  if (ranges.toxic && value >= ranges.toxic) return 'toxic';

  // Check for high/elevated
  if (ranges.high && value >= ranges.high) return 'high';
  if (ranges.pcosHigh && value >= ranges.pcosHigh.min) return 'elevated';
  if (ranges.elevated && value >= ranges.elevated) return 'elevated';

  // Check for low levels
  if (ranges.deficient && value <= ranges.deficient.max) return 'deficient';
  if (ranges.low && typeof ranges.low === 'number' && value <= ranges.low) return 'low';

  // Check optimal range
  if (ranges.optimal && value >= ranges.optimal.min && value <= ranges.optimal.max) {
    return 'optimal';
  }

  // Check normal range
  if (ranges.normal && value >= ranges.normal.min && value <= ranges.normal.max) {
    return 'normal';
  }

  return 'abnormal';
}

/**
 * Helper function to get reference range display text
 * @param {string} labKey - The lab test identifier
 * @returns {string} - Formatted reference range
 */
export function getReferenceRangeText(labKey) {
  const ranges = pcosLabRanges[labKey];
  if (!ranges || !ranges.normal) return 'Range not defined';

  return `${ranges.normal.min} - ${ranges.normal.max} ${ranges.unit}`;
}

/**
 * Helper function to check if value is in PCOS-concerning range
 * @param {string} labKey - The lab test identifier
 * @param {number} value - The measured value
 * @returns {boolean} - True if value suggests PCOS pattern
 */
export function isPCOSConcerning(labKey, value) {
  const pcosMarkers = {
    lh_fsh_ratio: (val) => val > 2,
    amh: (val) => val > 3.5,
    testosterone_total: (val) => val > 50,
    testosterone_free: (val) => val > 1.9,
    dheas: (val) => val > 430,
    insulin_fasting: (val) => val > 10,
    homa_ir: (val) => val > 2.5,
    triglycerides: (val) => val > 150,
    hdl_cholesterol: (val) => val < 50,
  };

  const checkFunc = pcosMarkers[labKey];
  return checkFunc ? checkFunc(value) : false;
}

export default pcosLabRanges;
