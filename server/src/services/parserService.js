/**
 * REVERSE-ORDER Parser for Dr. Lal PathLabs
 *
 * In the extracted text, the VALUE appears BEFORE the test name:
 * "81.00 Glucose Plasma, Fasting   70.00 - 100.00 mg/dL"
 *  ^value  ^test name              ^range
 *
 * This parser captures the value that appears BEFORE the test name
 */

import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { Logger } from '../utils/logger.js';
import pcosLabRanges from '../utils/labRanges.js';

const logger = new Logger('ParserService');

class ParserService {
  /**
   * Parse PDF file
   */
  async parsePDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const uint8 = new Uint8Array(dataBuffer);

      let getDocumentFn = pdfjsLib.getDocument ?? pdfjsLib.default?.getDocument;
      if (!getDocumentFn) {
        try {
          const alt = await import('pdfjs-dist/legacy/build/pdf.mjs');
          getDocumentFn = alt.getDocument ?? alt.default?.getDocument;
        } catch (e) {
          logger.warn('Dynamic import fallback for pdfjs failed', { error: e.message });
        }
      }

      if (!getDocumentFn) {
        throw new Error('getDocument is not defined');
      }

      const loadingTask = getDocumentFn({ data: uint8, disableWorker: true });
      const pdfDocument = await loadingTask.promise;

      let fullText = '';

      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      logger.info('PDF parsed successfully', { pages: pdfDocument.numPages });
      return fullText;
    } catch (error) {
      logger.error('PDF parsing failed', { error: error.message, stack: error.stack });
      throw new Error(`Failed to parse PDF file: ${error.message}`);
    }
  }

  /**
   * Parse DOCX file
   */
  async parseDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      logger.info('DOCX parsed successfully');
      return result.value;
    } catch (error) {
      logger.error('DOCX parsing failed', { error: error.message });
      throw new Error('Failed to parse DOCX file');
    }
  }

  /**
   * Extract lab values - REVERSE ORDER (value before name)
   */
  extractLabValues(text) {
    const labValues = {};

    // Log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 Extracted Text Sample (first 2000 chars):');
      console.log(text.substring(0, 2000));
      console.log('=' + '='.repeat(80));
    }

    /**
     * REVERSE ORDER EXTRACTION
     * Pattern: (VALUE) (TEST NAME) (UNIT) (RANGE)
     * Captures the number that appears BEFORE the test name
     */
    const extractValue = (testNamePatterns, unitPattern) => {
      for (const testNamePattern of testNamePatterns) {
        // Pattern: (number) (whitespace) (test name) (optional: range)
        const pattern = new RegExp(
          '(\\d+\\.?\\d*)\\s+' + // THE VALUE (before name)
            testNamePattern + // Test name
            '\\s+' + // Whitespace
            '(?:\\d+\\.?\\d*\\s*-\\s*\\d+\\.?\\d*\\s*)?' + // Optional range
            unitPattern, // Unit
          'i'
        );

        const match = text.match(pattern);
        if (match && match[1]) {
          const value = parseFloat(match[1]);
          if (!isNaN(value) && value >= 0 && value < 10000) {
            return {
              value: value,
              raw: match[0].substring(0, 100),
            };
          }
        }
      }
      return null;
    };

    let result;

    // ==================== GLUCOSE & INSULIN ====================
    result = extractValue(['Glucose\\s+Plasma,?\\s*Fasting', 'Glucose,?\\s*Fasting'], 'mg\\/dL');
    if (result) {
      labValues.glucose_fasting = {
        value: result.value,
        unit: 'mg/dL',
        raw: result.raw,
      };
    }

    result = extractValue(
      ['Insulin,?\\s*Serum\\s*,?\\s*Fasting', 'Insulin,?\\s*Fasting'],
      'uU\\/mL'
    );
    if (result) {
      labValues.insulin_fasting = {
        value: result.value,
        unit: 'µIU/mL',
        raw: result.raw,
      };
    }

    result = extractValue(['HOMA\\s+IR\\s+Index'], '');
    if (result) {
      labValues.homa_ir = {
        value: result.value,
        unit: '',
        raw: result.raw,
      };
    }

    // ==================== LIPID PROFILE ====================
    result = extractValue(['Cholesterol,?\\s*Total'], 'mg\\/dL');
    if (result) {
      labValues.cholesterol_total = {
        value: result.value,
        unit: 'mg/dL',
        raw: result.raw,
      };
    }

    result = extractValue(['Triglycerides'], 'mg\\/dL');
    if (result) {
      labValues.triglycerides = {
        value: result.value,
        unit: 'mg/dL',
        raw: result.raw,
      };
    }

    result = extractValue(['HDL\\s+Cholesterol'], 'mg\\/dL');
    if (result) {
      labValues.hdl_cholesterol = {
        value: result.value,
        unit: 'mg/dL',
        raw: result.raw,
      };
    }

    result = extractValue(['LDL\\s+Cholesterol,?\\s*Calculated'], 'mg\\/dL');
    if (result) {
      labValues.ldl_cholesterol = {
        value: result.value,
        unit: 'mg/dL',
        raw: result.raw,
      };
    }

    result = extractValue(['VLDL\\s+Cholesterol,?\\s*Calculated'], 'mg\\/dL');
    if (result) {
      labValues.vldl_cholesterol = {
        value: result.value,
        unit: 'mg/dL',
        raw: result.raw,
      };
    }

    // ==================== HORMONES ====================
    result = extractValue(['\\bFSH\\b'], 'mIU\\/mL');
    if (result) {
      labValues.fsh = {
        value: result.value,
        unit: 'mIU/mL',
        raw: result.raw,
      };
    }

    result = extractValue(
      ['\\bLH\\b(?!:)'], // LH but not "LH:"
      'mIU\\/mL'
    );
    if (result) {
      labValues.lh = {
        value: result.value,
        unit: 'mIU/mL',
        raw: result.raw,
      };
    }

    result = extractValue(['LH:FSH\\s+Ratio'], '');
    if (result) {
      labValues.lh_fsh_ratio = {
        value: result.value,
        unit: 'ratio',
        raw: result.raw,
      };
    }

    result = extractValue(['Prolactin,?\\s*Serum'], 'ng\\/mL');
    if (result) {
      labValues.prolactin = {
        value: result.value,
        unit: 'ng/mL',
        raw: result.raw,
      };
    }

    result = extractValue(['Testosterone,?\\s*Total'], 'ng\\/dL');
    if (result) {
      labValues.testosterone_total = {
        value: result.value,
        unit: 'ng/dL',
        raw: result.raw,
      };
    }

    result = extractValue(['DHEA\\s+Sulphate'], '(?:μ|u)g\\/dL');
    if (result) {
      labValues.dheas = {
        value: result.value,
        unit: 'µg/dL',
        raw: result.raw,
      };
    }

    result = extractValue(['TSH,?\\s*Ultrasensitive'], '(?:μ|u)IU\\/mL');
    if (result) {
      labValues.tsh = {
        value: result.value,
        unit: 'µIU/mL',
        raw: result.raw,
      };
    }

    result = extractValue(['Anti\\s+Mullerian\\s+Hormone'], 'ng\\/mL');
    if (result) {
      labValues.amh = {
        value: result.value,
        unit: 'ng/mL',
        raw: result.raw,
      };
    }

    // ==================== IRON STUDIES ====================
    result = extractValue(['Iron\\s*(?:\\(Ferrozine\\))?'], '(?:μ|u)g\\/dL');
    if (result) {
      labValues.iron = {
        value: result.value,
        unit: 'µg/dL',
        raw: result.raw,
      };
    }

    result = extractValue(['Total\\s+Iron\\s+Binding\\s+Capacity\\s*\\(TIBC\\)'], '(?:μ|u)g\\/dL');
    if (result) {
      labValues.tibc = {
        value: result.value,
        unit: 'µg/dL',
        raw: result.raw,
      };
    }

    result = extractValue(['Transferrin\\s+Saturation'], '%');
    if (result) {
      labValues.transferrin_saturation = {
        value: result.value,
        unit: '%',
        raw: result.raw,
      };
    }

    result = extractValue(['Ferritin'], 'ng\\/mL');
    if (result) {
      labValues.ferritin = {
        value: result.value,
        unit: 'ng/mL',
        raw: result.raw,
      };
    }

    // ==================== VITAMINS ====================
    result = extractValue(['Vitamin\\s+B12'], 'pg\\/mL');
    if (result) {
      labValues.vitamin_b12 = {
        value: result.value,
        unit: 'pg/mL',
        raw: result.raw,
      };
    }

    result = extractValue(['Vitamin\\s+D'], 'nmol\\/L');
    if (result) {
      labValues.vitamin_d = {
        value: result.value,
        unit: 'nmol/L',
        raw: result.raw,
      };
    }

    // ==================== THYROID ====================
    result = extractValue(['Free\\s+Triiodothyronine\\s*\\(T3,?\\s*Free\\)'], 'pg\\/mL');
    if (result) {
      labValues.t3_free = {
        value: result.value,
        unit: 'pg/mL',
        raw: result.raw,
      };
    }

    result = extractValue(['Free\\s+Thyroxine\\s*\\(T4,?\\s*Free\\)'], 'ng\\/dL');
    if (result) {
      labValues.t4_free = {
        value: result.value,
        unit: 'ng/dL',
        raw: result.raw,
      };
    }

    // ==================== SEX HORMONES ====================
    result = extractValue(['Estradiol'], 'pg\\/mL');
    if (result) {
      labValues.estradiol = {
        value: result.value,
        unit: 'pg/mL',
        raw: result.raw,
      };
    }

    result = extractValue(['Progesterone,?\\s*Serum'], 'ng\\/mL');
    if (result) {
      labValues.progesterone = {
        value: result.value,
        unit: 'ng/mL',
        raw: result.raw,
      };
    }

    // Calculate derived values
    this.calculateDerivedValues(labValues);

    logger.info('Lab values extracted', {
      count: Object.keys(labValues).length,
      keys: Object.keys(labValues),
      sample: Object.entries(labValues).slice(0, 3),
    });

    return labValues;
  }

  /**
   * Calculate derived values
   */
  calculateDerivedValues(labValues) {
    // LH/FSH Ratio (if not already extracted)
    if (labValues.lh && labValues.fsh && !labValues.lh_fsh_ratio) {
      labValues.lh_fsh_ratio = {
        value: parseFloat((labValues.lh.value / labValues.fsh.value).toFixed(2)),
        unit: 'ratio',
        raw: `Calculated from LH:${labValues.lh.value} FSH:${labValues.fsh.value}`,
      };
    }

    // HOMA-IR (if not already extracted)
    if (labValues.glucose_fasting && labValues.insulin_fasting && !labValues.homa_ir) {
      const glucose = labValues.glucose_fasting.value;
      const insulin = labValues.insulin_fasting.value;
      const homaIR = (glucose * insulin) / 405;

      labValues.homa_ir = {
        value: parseFloat(homaIR.toFixed(2)),
        unit: '',
        raw: `Calculated from Glucose:${glucose} Insulin:${insulin}`,
      };
    }

    // Transferrin Saturation (if not already extracted)
    if (labValues.iron && labValues.tibc && !labValues.transferrin_saturation) {
      const saturation = (labValues.iron.value / labValues.tibc.value) * 100;
      labValues.transferrin_saturation = {
        value: parseFloat(saturation.toFixed(2)),
        unit: '%',
        raw: `Calculated from Iron:${labValues.iron.value} TIBC:${labValues.tibc.value}`,
      };
    }
  }

  /**
   * Get default unit for lab value
   */
  getDefaultUnit(labKey) {
    const units = {
      insulin_fasting: 'µIU/mL',
      glucose_fasting: 'mg/dL',
      testosterone_total: 'ng/dL',
      lh: 'mIU/mL',
      fsh: 'mIU/mL',
      amh: 'ng/mL',
      vitamin_d: 'nmol/L',
      vitamin_b12: 'pg/mL',
      hba1c: '%',
      tsh: 'µIU/mL',
      dheas: 'µg/dL',
      cholesterol_total: 'mg/dL',
      triglycerides: 'mg/dL',
      hdl_cholesterol: 'mg/dL',
      ldl_cholesterol: 'mg/dL',
      ferritin: 'ng/mL',
      iron: 'µg/dL',
    };
    return units[labKey] || '';
  }

  /**
   * Check if value is within normal range
   */
  isValueNormal(labKey, value) {
    const ranges = pcosLabRanges[labKey];
    if (!ranges || !ranges.normal) return null;

    const normal = ranges.normal;
    return value >= normal.min && value <= normal.max;
  }

  /**
   * Get severity level for abnormal value
   */
  getSeverity(labKey, value) {
    const ranges = pcosLabRanges[labKey];
    if (!ranges) return 'unknown';

    if (this.isValueNormal(labKey, value)) return 'normal';

    if (ranges.critical && value >= ranges.critical) return 'critical';
    if (ranges.pcosHigh && value >= ranges.pcosHigh.min) return 'high';
    if (ranges.elevated && value >= ranges.elevated) return 'elevated';
    if (ranges.low && value <= ranges.low) return 'low';

    return 'abnormal';
  }
}

export const parserService = new ParserService();
export default parserService;
