export const pcosLabRanges = {
  insulin_fasting: {
    name: 'Fasting Insulin',
    normal: { min: 2, max: 12, unit: 'mIU/L' },
    pcosHigh: { min: 12, max: 50, unit: 'mIU/L' },
    critical: 50,
    explanation: 'Elevated fasting insulin suggests insulin resistance'
  },
  glucose_fasting: {
    name: 'Fasting Glucose',
    normal: { min: 70, max: 100, unit: 'mg/dL' },
    prediabetic: { min: 100, max: 125, unit: 'mg/dL' },
    diabetic: 125,
    explanation: 'Blood sugar level on fasting'
  },
  testosterone_total: {
    name: 'Total Testosterone',
    normal: { min: 15, max: 70, unit: 'ng/dL' },
    elevated: 70,
    explanation: 'Elevated testosterone is common in PCOS'
  },
  lh_fsh_ratio: {
    name: 'LH/FSH Ratio',
    normal: { min: 1, max: 3, unit: 'ratio' },
    pcosHigh: { min: 3, max: 10, unit: 'ratio' },
    explanation: 'LH/FSH ratio >3 suggests PCOS'
  },
  amh: {
    name: 'Anti-Müllerian Hormone (AMH)',
    normal: { min: 1.0, max: 2.5, unit: 'ng/mL' },
    elevated: 2.5,
    explanation: 'Higher AMH indicates more follicles (characteristic of PCOS)'
  },
  vitamin_d: {
    name: 'Vitamin D (25-OH)',
    deficient: { max: 20, unit: 'ng/mL' },
    insufficient: { min: 20, max: 30, unit: 'ng/mL' },
    optimal: { min: 30, max: 100, unit: 'ng/mL' },
    explanation: 'Low vitamin D is common in PCOS'
  }
}

export default pcosLabRanges