export const pcosLabRanges = {
  insulin_fasting: {
    name: 'Fasting Insulin',
    normal: { min: 2, max: 12, unit: 'mIU/L' },
    pcosHigh: { min: 12, max: 50, unit: 'mIU/L' },
    critical: 50,
    explanation: 'Elevated fasting insulin suggests insulin resistance, common in PCOS'
  },
  glucose_fasting: {
    name: 'Fasting Glucose',
    normal: { min: 70, max: 100, unit: 'mg/dL' },
    prediabetic: { min: 100, max: 125, unit: 'mg/dL' },
    diabetic: 125,
    explanation: 'Blood sugar level after fasting. Elevated levels indicate risk of diabetes'
  },
  testosterone_total: {
    name: 'Total Testosterone',
    normal: { min: 15, max: 70, unit: 'ng/dL' },
    elevated: 70,
    pcosHigh: { min: 70, max: 150, unit: 'ng/dL' },
    explanation: 'Elevated testosterone causes hirsutism and acne in PCOS'
  },
  testosterone_free: {
    name: 'Free Testosterone',
    normal: { min: 0.3, max: 1.9, unit: 'pg/mL' },
    elevated: 1.9,
    explanation: 'Free (unbound) testosterone - more accurate indicator of androgen excess'
  },
  lh: {
    name: 'Luteinizing Hormone (LH)',
    normal: { min: 5, max: 20, unit: 'mIU/mL' },
    explanation: 'Hormone that triggers ovulation. Often elevated in PCOS'
  },
  fsh: {
    name: 'Follicle Stimulating Hormone (FSH)',
    normal: { min: 3, max: 20, unit: 'mIU/mL' },
    explanation: 'Hormone that helps follicles mature'
  },
  lh_fsh_ratio: {
    name: 'LH/FSH Ratio',
    normal: { min: 1, max: 2, unit: 'ratio' },
    pcosHigh: { min: 2, max: 10, unit: 'ratio' },
    explanation: 'Ratio >2-3 suggests PCOS. Higher ratio indicates hormonal imbalance'
  },
  amh: {
    name: 'Anti-Müllerian Hormone (AMH)',
    normal: { min: 1.0, max: 3.0, unit: 'ng/mL' },
    elevated: 3.0,
    pcosHigh: { min: 3.0, max: 10.0, unit: 'ng/mL' },
    explanation: 'Higher AMH indicates more follicles, characteristic of PCOS'
  },
  vitamin_d: {
    name: 'Vitamin D (25-OH)',
    deficient: { max: 20, unit: 'ng/mL' },
    insufficient: { min: 20, max: 30, unit: 'ng/mL' },
    optimal: { min: 30, max: 100, unit: 'ng/mL' },
    explanation: 'Low vitamin D is very common in PCOS and affects insulin sensitivity'
  },
  hba1c: {
    name: 'HbA1c (Glycated Hemoglobin)',
    normal: { min: 4.0, max: 5.6, unit: '%' },
    prediabetic: { min: 5.7, max: 6.4, unit: '%' },
    diabetic: 6.5,
    explanation: 'Average blood sugar over 3 months. Important for PCOS diabetes risk'
  },
  thyroid_tsh: {
    name: 'TSH (Thyroid Stimulating Hormone)',
    normal: { min: 0.4, max: 4.0, unit: 'μIU/mL' },
    elevated: 4.0,
    explanation: 'Thyroid disorders are common with PCOS. High TSH indicates hypothyroidism'
  },
  dheas: {
    name: 'DHEA-S',
    normal: { min: 35, max: 430, unit: 'μg/dL' },
    elevated: 430,
    explanation: 'Adrenal androgen. Elevated in some PCOS cases'
  }
}

export default pcosLabRanges