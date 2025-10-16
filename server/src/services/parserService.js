/**
 * FINAL WORKING Parser for Dr. Lal PathLabs
 * Extracts ALL 25+ markers accurately
 *
 * Format in extracted text:
 * "152.00 Total Iron Binding Capacity (TIBC) (Chromozural B) 250.00 - 425.00 μg/dL 367.00"
 * "81.00 Glucose Plasma, Fasting   70.00 - 100.00 mg/dL"
 */

import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { Logger } from '../utils/logger.js';
import pcosLabRanges from '../utils/labRanges.js';

const logger = new Logger('ParserService');

class ParserService {
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
   * Extract lab values with comprehensive pattern matching
   */
  extractLabValues(text) {
    const labValues = {};

    // Log sample for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 Text sample:', text.substring(0, 1500));
    }

    /**
     * Universal extraction function
     * Tries multiple pattern variations for each marker
     */
    const extract = (key, patterns, defaultUnit) => {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const value = parseFloat(match[1]);
          if (!isNaN(value) && value >= 0 && value < 10000) {
            labValues[key] = {
              value: value,
              unit: defaultUnit,
              raw: match[0].substring(0, 80),
            };
            console.log(`✅ ${key}: ${value} ${defaultUnit}`);
            return true;
          }
        }
      }
      console.log(`❌ ${key}: not found`);
      return false;
    };

    // ==================== GLUCOSE & INSULIN ====================
    extract(
      'glucose_fasting',
      [/([\d.]+)\s+Glucose\s+Plasma,?\s*Fasting/i, /Glucose\s+Plasma,?\s*Fasting\s+([\d.]+)/i],
      'mg/dL'
    );

    extract(
      'insulin_fasting',
      [
        /([\d.]+)\s+Insulin,?\s*Serum\s*,?\s*Fasting/i,
        /Insulin,?\s*Serum\s*,?\s*Fasting\s+([\d.]+)/i,
      ],
      'µIU/mL'
    );

    extract('homa_ir', [/([\d.]+)\s+HOMA\s+IR\s+Index/i, /HOMA\s+IR\s+Index\s+([\d.]+)/i], '');

    // ==================== LIPID PROFILE ====================
    extract(
      'cholesterol_total',
      [/([\d.]+)\s+Cholesterol,?\s*Total/i, /Cholesterol,?\s*Total\s+([\d.]+)/i],
      'mg/dL'
    );

    extract(
      'triglycerides',
      [/([\d.]+)\s+Triglycerides\s+</i, /Triglycerides\s+([\d.]+)/i],
      'mg/dL'
    );

    extract(
      'hdl_cholesterol',
      [/([\d.]+)\s+HDL\s+Cholesterol/i, /HDL\s+Cholesterol\s+([\d.]+)/i],
      'mg/dL'
    );

    extract(
      'ldl_cholesterol',
      [
        /([\d.]+)\s+LDL\s+Cholesterol,?\s*Calculated/i,
        /LDL\s+Cholesterol,?\s*Calculated\s+([\d.]+)/i,
      ],
      'mg/dL'
    );

    extract(
      'vldl_cholesterol',
      [
        /([\d.]+)\s+VLDL\s+Cholesterol,?\s*Calculated/i,
        /VLDL\s+Cholesterol,?\s*Calculated\s+([\d.]+)/i,
      ],
      'mg/dL'
    );

    // ==================== HORMONES ====================
    extract('fsh', [/([\d.]+)\s+FSH\s+/i, /\bFSH\b\s+([\d.]+)/i], 'mIU/mL');

    extract('lh', [/([\d.]+)\s+LH\s+(?!:)/i, /\bLH\b\s+(?!:)([\d.]+)/i], 'mIU/mL');

    extract('lh_fsh_ratio', [/([\d.]+)\s+LH:FSH\s+Ratio/i, /LH:FSH\s+Ratio\s+([\d.]+)/i], 'ratio');

    extract(
      'prolactin',
      [/([\d.]+)\s+Prolactin,?\s*Serum/i, /Prolactin,?\s*Serum\s+([\d.]+)/i],
      'ng/mL'
    );

    extract(
      'testosterone_total',
      [/([\d.]+)\s+Testosterone,?\s*Total/i, /Testosterone,?\s*Total\s+([\d.]+)/i],
      'ng/dL'
    );

    extract('dheas', [/([\d.]+)\s+DHEA\s+Sulphate/i, /DHEA\s+Sulphate\s+([\d.]+)/i], 'µg/dL');

    extract(
      'tsh',
      [/([\d.]+)\s+TSH,?\s*Ultrasensitive/i, /TSH,?\s*Ultrasensitive\s+([\d.]+)/i],
      'µIU/mL'
    );

    extract(
      'amh',
      [/([\d.]+)\s+Anti\s+Mullerian\s+Hormone/i, /Anti\s+Mullerian\s+Hormone\s+([\d.]+)/i],
      'ng/mL'
    );

    // ==================== IRON STUDIES ====================
    // Special handling for Iron vs TIBC
    const ironMatch = text.match(
      /Iron\s*\(Ferrozine\)\s+([\d.]+)\s+-\s+([\d.]+)\s+[μu]g\/dL\s+([\d.]+)/i
    );
    if (ironMatch && ironMatch[3]) {
      const value = parseFloat(ironMatch[3]);
      labValues.iron = {
        value: value,
        unit: 'µg/dL',
        raw: ironMatch[0].substring(0, 80),
      };
      console.log(`✅ iron: ${value} µg/dL`);
    }

    // TIBC - capture last number in sequence
    const tibcMatch = text.match(
      /Total\s+Iron\s+Binding\s+Capacity\s*\(TIBC\)[^0-9]+([\d.]+)\s+-\s+([\d.]+)\s+[μu]g\/dL\s+([\d.]+)/i
    );
    if (tibcMatch && tibcMatch[3]) {
      const value = parseFloat(tibcMatch[3]);
      labValues.tibc = {
        value: value,
        unit: 'µg/dL',
        raw: tibcMatch[0].substring(0, 80),
      };
      console.log(`✅ tibc: ${value} µg/dL`);
    }

    // Transferrin Saturation - before Ferritin
    const transferrinMatch = text.match(
      /Transferrin\s+Saturation[^0-9]+([\d.]+)\s+-\s+([\d.]+)\s+%\s+([\d.]+)/i
    );
    if (transferrinMatch && transferrinMatch[3]) {
      const value = parseFloat(transferrinMatch[3]);
      labValues.transferrin_saturation = {
        value: value,
        unit: '%',
        raw: transferrinMatch[0].substring(0, 80),
      };
      console.log(`✅ transferrin_saturation: ${value} %`);
    }

    // Ferritin - last number in sequence
    const ferritinMatch = text.match(/Ferritin\s+([\d.]+)\s+-\s+([\d.]+)\s+ng\/mL\s+([\d.]+)/i);
    if (ferritinMatch && ferritinMatch[3]) {
      const value = parseFloat(ferritinMatch[3]);
      labValues.ferritin = {
        value: value,
        unit: 'ng/mL',
        raw: ferritinMatch[0].substring(0, 80),
      };
      console.log(`✅ ferritin: ${value} ng/mL`);
    }

    // ==================== VITAMINS ====================
    // Vitamin B12 - multiple formats
    const vitB12Match = text.match(
      /VITAMIN\s+B12[;\s:]*\s*(?:CYANOCOBALAMIN,?\s*SERUM)?[^0-9]+([\d.]+)\s+pg\/mL\s+([\d.]+)\s+-\s+([\d.]+)/i
    );
    if (vitB12Match && vitB12Match[1]) {
      const value = parseFloat(vitB12Match[1]);
      labValues.vitamin_b12 = {
        value: value,
        unit: 'pg/mL',
        raw: vitB12Match[0].substring(0, 80),
      };
      console.log(`✅ vitamin_b12: ${value} pg/mL`);
    } else {
      extract(
        'vitamin_b12',
        [
          /([\d.]+)\s+(?:VITAMIN\s+B12|Cyanocobalamin)/i,
          /(?:VITAMIN\s+B12|Cyanocobalamin)[^0-9]+([\d.]+)/i,
        ],
        'pg/mL'
      );
    }

    // Vitamin D - multiple formats
    const vitDMatch = text.match(
      /VITAMIN\s+D[,\s]*25\s*-?\s*HYDROXY[^0-9]+([\d.]+)\s+nmol\/L\s+([\d.]+)\s+-\s+([\d.]+)/i
    );
    if (vitDMatch && vitDMatch[1]) {
      const value = parseFloat(vitDMatch[1]);
      labValues.vitamin_d = {
        value: value,
        unit: 'nmol/L',
        raw: vitDMatch[0].substring(0, 80),
      };
      console.log(`✅ vitamin_d: ${value} nmol/L`);
    } else {
      extract(
        'vitamin_d',
        [
          /([\d.]+)\s+VITAMIN\s+D/i,
          /VITAMIN\s+D[^0-9]+([\d.]+)/i,
          /([\d.]+)\s+25\s*-?\s*(?:OH|HYDROXY)/i,
        ],
        'nmol/L'
      );
    }

    // ==================== THYROID ====================
    extract(
      't3_free',
      [
        /([\d.]+)\s+Free\s+Triiodothyronine\s*\(T3,?\s*Free\)/i,
        /Free\s+Triiodothyronine\s*\(T3,?\s*Free\)\s+([\d.]+)/i,
        /([\d.]+)\s+(?:FT3|T3,?\s*Free)/i,
      ],
      'pg/mL'
    );

    extract(
      't4_free',
      [
        /([\d.]+)\s+Free\s+Thyroxine\s*\(T4,?\s*Free\)/i,
        /Free\s+Thyroxine\s*\(T4,?\s*Free\)\s+([\d.]+)/i,
        /([\d.]+)\s+(?:FT4|T4,?\s*Free)/i,
      ],
      'ng/dL'
    );

    // ==================== SEX HORMONES ====================
    // Estradiol - multiple formats
    const estradiolMatch = text.match(/ESTRADIOL\s*\(E2\)[^0-9]+([\d.]+)\s+pg\/mL/i);
    if (estradiolMatch && estradiolMatch[1]) {
      const value = parseFloat(estradiolMatch[1]);
      labValues.estradiol = {
        value: value,
        unit: 'pg/mL',
        raw: estradiolMatch[0].substring(0, 80),
      };
      console.log(`✅ estradiol: ${value} pg/mL`);
    } else {
      extract(
        'estradiol',
        [/([\d.]+)\s+Estradiol/i, /Estradiol[^0-9]+([\d.]+)/i, /([\d.]+)\s+E2\b/i],
        'pg/mL'
      );
    }

    // Progesterone - multiple formats
    const progesteroneMatch = text.match(/PROGESTERONE,?\s*SERUM[^0-9]+([\d.]+)\s+ng\/mL/i);
    if (progesteroneMatch && progesteroneMatch[1]) {
      const value = parseFloat(progesteroneMatch[1]);
      labValues.progesterone = {
        value: value,
        unit: 'ng/mL',
        raw: progesteroneMatch[0].substring(0, 80),
      };
      console.log(`✅ progesterone: ${value} ng/mL`);
    } else {
      extract(
        'progesterone',
        [
          /([\d.]+)\s+Progesterone,?\s*Serum/i,
          /Progesterone,?\s*Serum[^0-9]+([\d.]+)/i,
          /([\d.]+)\s+Progesterone/i,
        ],
        'ng/mL'
      );
    }

    // ==================== DERIVED VALUES ====================
    this.calculateDerivedValues(labValues);

    logger.info(`✅ Extracted ${Object.keys(labValues).length} lab values`, {
      keys: Object.keys(labValues),
    });

    return labValues;
  }

  calculateDerivedValues(labValues) {
    // LH/FSH Ratio
    if (labValues.lh && labValues.fsh && !labValues.lh_fsh_ratio) {
      labValues.lh_fsh_ratio = {
        value: parseFloat((labValues.lh.value / labValues.fsh.value).toFixed(2)),
        unit: 'ratio',
        raw: `Calculated from LH:${labValues.lh.value} FSH:${labValues.fsh.value}`,
      };
    }

    // HOMA-IR
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

    // Transferrin Saturation
    if (labValues.iron && labValues.tibc && !labValues.transferrin_saturation) {
      const saturation = (labValues.iron.value / labValues.tibc.value) * 100;
      labValues.transferrin_saturation = {
        value: parseFloat(saturation.toFixed(2)),
        unit: '%',
        raw: `Calculated from Iron:${labValues.iron.value} TIBC:${labValues.tibc.value}`,
      };
    }
  }

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

  isValueNormal(labKey, value) {
    const ranges = pcosLabRanges[labKey];
    if (!ranges || !ranges.normal) return null;

    const normal = ranges.normal;
    return value >= normal.min && value <= normal.max;
  }

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
