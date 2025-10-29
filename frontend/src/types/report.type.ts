export interface ReportData {
  id: string;
  userId: string;
  fileMetadata: FileMetadata;
  reportType: string;
  analysis: Analysis;
  labValues: LabValues;
  filename: string;
  extractedText: string;
  uploadedAt: UploadedAt;
}

export interface FileMetadata {
  mimeType: string;
  originalName: string;
  size: number;
}

export interface Analysis {
  timestamp: string;
  reportDate: string;
  analysis: string;
}

export interface LabValues {
  iron: Parameter;
  cholesterol_total: Parameter;
  glucose_fasting: Parameter;
  fsh: Parameter;
  ldl_cholesterol: Parameter;
  hdl_cholesterol: Parameter;
  lh: Parameter;
  vitamin_b12: Parameter;
  transferrin_saturation: Parameter;
  testosterone_total: Parameter;
  dheas: Parameter;
  t3_free: Parameter;
  amh: Parameter;
  vldl_cholesterol: Parameter;
  tibc: Parameter;
  estradiol: Parameter;
  prolactin: Parameter;
  t4_free: Parameter;
  vitamin_d: Parameter;
  triglycerides: Parameter;
  progesterone: Parameter;
  insulin_fasting: Parameter;
  tsh: Parameter;
  lh_fsh_ratio: Parameter;
  homa_ir: Parameter;
  ferritin: Parameter;
}

export interface Parameter {
  severity: string;
  raw: string;
  unit: string;
  value: number;
}

export interface UploadedAt {
  type: string;
  seconds: number;
  nanoseconds: number;
}
