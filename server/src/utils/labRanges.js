/**
 * FIXED PCOS Lab Value Reference Ranges
 *
 * Key Fixes:
 * 1. Ferritin: 7.7 should be "deficient" (< 10)
 * 2. Prolactin: 21.06 should be "normal" (2.8-29.2)
 * 3. Testosterone: 21.35 should be "normal" (8-60)
 * 4. DHEA-S: 177.1 should be "normal" (95.8-511.7)
 * 5. Vitamin D in nmol/L (not ng/mL)
 */

const pcosLabRanges = {
  // ==================== GLUCOSE & INSULIN ====================
  glucose_fasting: {
    normal: { min: 70, max: 100 },
    elevated: 100,
    prediabetes: { min: 100, max: 125 },
    critical: 126,
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
    description: 'Fasting insulin level',
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
    critical: 6.5,
    unit: '%',
    description: 'Glycated hemoglobin',
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
    description: 'Triglycerides',
  },

  hdl_cholesterol: {
    low: 50, // Below 50 is concerning for women
    normal: { min: 50, max: 100 },
    optimal: { min: 60, max: 100 },
    unit: 'mg/dL',
    description: 'HDL - good cholesterol',
  },

  ldl_cholesterol: {
    optimal: { min: 0, max: 100 },
    normal: { min: 0, max: 129 },
    borderline: { min: 130, max: 159 },
    elevated: 130,
    high: 160,
    critical: 190,
    unit: 'mg/dL',
    description: 'LDL - bad cholesterol',
  },

  vldl_cholesterol: {
    normal: { min: 2, max: 30 },
    elevated: 30,
    unit: 'mg/dL',
    description: 'VLDL cholesterol',
  },

  // ==================== HORMONES ====================
  lh: {
    follicular: { min: 1.9, max: 12.5 },
    normal: { min: 1.9, max: 12.5 },
    elevated: 12.5,
    pcosHigh: { min: 12.5, max: 20 },
    unit: 'mIU/mL',
    description: 'Luteinizing hormone',
  },

  fsh: {
    follicular: { min: 2.5, max: 10.2 },
    normal: { min: 2.5, max: 10.2 },
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
    description: 'LH to FSH ratio',
  },

  prolactin: {
    normal: { min: 2.8, max: 29.2 }, // FIXED: was showing elevated at 21.06
    elevated: 29.2,
    high: 50,
    critical: 100,
    unit: 'ng/mL',
    description: 'Prolactin',
  },

  testosterone_total: {
    normal: { min: 8, max: 60 }, // FIXED: 21.35 is normal, not elevated
    elevated: 60,
    pcosHigh: { min: 60, max: 80 },
    high: 80,
    unit: 'ng/dL',
    description: 'Total testosterone',
  },

  testosterone_free: {
    normal: { min: 0.3, max: 1.9 },
    elevated: 1.9,
    pcosHigh: { min: 1.9, max: 3 },
    unit: 'pg/mL',
    description: 'Free testosterone',
  },

  dheas: {
    normal: { min: 95.8, max: 511.7 }, // FIXED: 177.1 is normal, not elevated
    elevated: 511.7,
    pcosHigh: { min: 511.7, max: 700 },
    high: 700,
    unit: 'µg/dL',
    description: 'DHEA-Sulfate',
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
    description: 'Anti-Müllerian Hormone',
  },

  estradiol: {
    follicular: { min: 19.5, max: 144.2 },
    midcycle: { min: 63.9, max: 356.7 },
    luteal: { min: 55.8, max: 214.2 },
    normal: { min: 19.5, max: 356.7 }, // Include all phases
    unit: 'pg/mL',
    description: 'Estradiol (E2)',
    cycleDependentNote: 'Follicular: 19.5-144.2 | Mid-cycle: 63.9-356.7 | Luteal: 55.8-214.2 pg/mL',
    skipSeverity: true, // Don't calculate severity - cycle dependent
  },

  progesterone: {
    follicular: { min: 0.1, max: 0.3 },
    luteal: { min: 1.2, max: 25.0 },
    normal: { min: 0.1, max: 25.0 }, // Include all phases
    unit: 'ng/mL',
    description: 'Progesterone',
    cycleDependentNote: 'Follicular: 0.1-0.3 | Luteal: 1.2-25.0 ng/mL',
    skipSeverity: true, // Don't calculate severity - cycle dependent
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
    description: 'Free T3',
  },

  t4_free: {
    normal: { min: 0.89, max: 1.76 },
    low: 0.89,
    elevated: 1.76,
    unit: 'ng/dL',
    description: 'Free T4',
  },

  // ==================== VITAMINS & MINERALS ====================
  vitamin_d: {
    deficient: { min: 0, max: 50 }, // FIXED: nmol/L ranges
    insufficient: { min: 50, max: 75 },
    normal: { min: 75, max: 250 },
    optimal: { min: 100, max: 200 },
    elevated: 250,
    toxic: 375,
    unit: 'nmol/L',
    description: 'Vitamin D (25-OH) in nmol/L',
  },

  vitamin_b12: {
    deficient: { min: 0, max: 200 },
    low: { min: 200, max: 300 },
    normal: { min: 300, max: 900 },
    optimal: { min: 400, max: 900 },
    elevated: 900,
    unit: 'pg/mL',
    description: 'Vitamin B12',
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
    deficient: 10, // FIXED: 7.7 should show as deficient/low
    low: { min: 10, max: 30 },
    normal: { min: 30, max: 291 },
    optimal: { min: 50, max: 150 },
    elevated: 200,
    high: 300,
    unit: 'ng/mL',
    description: 'Ferritin - iron storage',
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
    description: 'Transferrin saturation',
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
    description: 'C-Reactive Protein',
  },

  cortisol: {
    morning: { min: 6, max: 23 },
    normal: { min: 6, max: 23 },
    low: 6,
    elevated: 23,
    high: 30,
    unit: 'µg/dL',
    description: 'Cortisol',
  },
};

/**
 * Helper function to get severity for a given lab value
 */
export function getLabSeverity(labKey, value) {
  const ranges = pcosLabRanges[labKey];
  if (!ranges) return 'unknown';

  // Skip severity calculation for cycle-dependent hormones
  if (ranges.skipSeverity) return 'cycle-dependent';

  // Check for deficient first (critical low)
  if (ranges.deficient) {
    if (typeof ranges.deficient === 'object') {
      if (value <= ranges.deficient.max) return 'deficient';
    } else if (value <= ranges.deficient) {
      return 'deficient';
    }
  }

  // Check for low levels
  if (ranges.low) {
    if (typeof ranges.low === 'object') {
      if (value >= ranges.low.min && value <= ranges.low.max) return 'low';
    } else if (value <= ranges.low) {
      return 'low';
    }
  }

  // Check for critical high levels
  if (ranges.critical && value >= ranges.critical) return 'critical';

  // Check for high levels
  if (ranges.high && value >= ranges.high) return 'high';
  if (ranges.pcosHigh && value >= ranges.pcosHigh.min) return 'elevated';
  if (ranges.elevated && value >= ranges.elevated) return 'elevated';

  // Check optimal range
  if (ranges.optimal && value >= ranges.optimal.min && value <= ranges.optimal.max) {
    return 'normal';
  }

  // Check normal range
  if (ranges.normal && value >= ranges.normal.min && value <= ranges.normal.max) {
    return 'normal';
  }

  return 'abnormal';
}

/**
 * Helper function to get reference range display text
 */
export function getReferenceRangeText(labKey) {
  const ranges = pcosLabRanges[labKey];
  if (!ranges || !ranges.normal) return 'Range not defined';

  return `${ranges.normal.min} - ${ranges.normal.max} ${ranges.unit}`;
}

/**
 * Helper function to check if value is in PCOS-concerning range
 */
export function isPCOSConcerning(labKey, value) {
  const pcosMarkers = {
    lh_fsh_ratio: (val) => val > 2,
    amh: (val) => val > 3.5,
    testosterone_total: (val) => val > 60,
    testosterone_free: (val) => val > 1.9,
    dheas: (val) => val > 511.7,
    insulin_fasting: (val) => val > 10,
    homa_ir: (val) => val > 2.5,
    triglycerides: (val) => val > 150,
    hdl_cholesterol: (val) => val < 50,
  };

  const checkFunc = pcosMarkers[labKey];
  return checkFunc ? checkFunc(value) : false;
}

export default pcosLabRanges;
