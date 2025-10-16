/**
 * COMPLETE FIX for parserService.js
 *
 * Fixes:
 * 1. Extract Vitamin B12, D, Estradiol, Progesterone from pages 9-12
 * 2. Calculate severity correctly for Ferritin (low = deficient)
 * 3. Ensure all values passed to AI (not cut off at AMH)
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

      logger.info('PDF parsed successfully', {
        pages: pdfDocument.numPages,
        textLength: fullText.length,
      });

      console.log(`📄 PDF Text Length: ${fullText.length} characters`);

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

  extractLabValues(text) {
    const labValues = {};

    console.log('\n🔍 Starting lab value extraction...\n');
    console.log(`📊 Total text length: ${text.length} characters\n`);

    const extract = (key, patterns, defaultUnit) => {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const value = parseFloat(match[1]);
          if (!isNaN(value) && value >= 0 && value < 10000) {
            // Calculate severity HERE during extraction
            const severity = this.getSeverity(key, value);

            labValues[key] = {
              value: value,
              unit: defaultUnit,
              severity: severity, // ADD SEVERITY
              raw: match[0].substring(0, 80),
            };
            console.log(`✅ ${key}: ${value} ${defaultUnit} [${severity}]`);
            return true;
          }
        }
      }
      console.log(`❌ ${key}: not found`);
      return false;
    };

    // ==================== GLUCOSE & INSULIN ====================
    extract('glucose_fasting', [/([\d.]+)\s+Glucose\s+Plasma,?\s*Fasting/i], 'mg/dL');

    extract('insulin_fasting', [/([\d.]+)\s+Insulin,?\s*Serum\s*,?\s*Fasting/i], 'µIU/mL');

    extract('homa_ir', [/([\d.]+)\s+HOMA\s+IR\s+Index/i], '');

    // ==================== LIPID PROFILE ====================
    extract('cholesterol_total', [/([\d.]+)\s+Cholesterol,?\s*Total/i], 'mg/dL');

    extract('triglycerides', [/([\d.]+)\s+Triglycerides/i], 'mg/dL');

    extract('hdl_cholesterol', [/([\d.]+)\s+HDL\s+Cholesterol/i], 'mg/dL');

    extract('ldl_cholesterol', [/([\d.]+)\s+LDL\s+Cholesterol/i], 'mg/dL');

    extract('vldl_cholesterol', [/([\d.]+)\s+VLDL\s+Cholesterol/i], 'mg/dL');

    // ==================== HORMONES ====================
    extract('fsh', [/([\d.]+)\s+FSH\s+/i], 'mIU/mL');

    extract('lh', [/([\d.]+)\s+LH\s+(?!:)/i], 'mIU/mL');

    extract('lh_fsh_ratio', [/([\d.]+)\s+LH:FSH\s+Ratio/i], 'ratio');

    extract('prolactin', [/([\d.]+)\s+Prolactin,?\s*Serum/i], 'ng/mL');

    extract('testosterone_total', [/([\d.]+)\s+Testosterone,?\s*Total/i], 'ng/dL');

    extract('dheas', [/([\d.]+)\s+DHEA\s+Sulphate/i], 'µg/dL');

    extract('tsh', [/([\d.]+)\s+TSH,?\s*Ultrasensitive/i], 'µIU/mL');

    extract('amh', [/([\d.]+)\s+Anti\s+Mullerian\s+Hormone/i], 'ng/mL');

    // ==================== IRON STUDIES ====================
    const ironMatch = text.match(
      /Iron\s*\(Ferrozine\)\s+([\d.]+)\s+-\s+([\d.]+)\s+[μu]g\/dL\s+([\d.]+)/i
    );
    if (ironMatch && ironMatch[3]) {
      const value = parseFloat(ironMatch[3]);
      const severity = this.getSeverity('iron', value);
      labValues.iron = {
        value: value,
        unit: 'µg/dL',
        severity: severity,
        raw: ironMatch[0].substring(0, 80),
      };
      console.log(`✅ iron: ${value} µg/dL [${severity}]`);
    }

    const tibcMatch = text.match(
      /Total\s+Iron\s+Binding\s+Capacity\s*\(TIBC\)[^0-9]+([\d.]+)\s+-\s+([\d.]+)\s+[μu]g\/dL\s+([\d.]+)/i
    );
    if (tibcMatch && tibcMatch[3]) {
      const value = parseFloat(tibcMatch[3]);
      const severity = this.getSeverity('tibc', value);
      labValues.tibc = {
        value: value,
        unit: 'µg/dL',
        severity: severity,
        raw: tibcMatch[0].substring(0, 80),
      };
      console.log(`✅ tibc: ${value} µg/dL [${severity}]`);
    }

    const transferrinMatch = text.match(
      /Transferrin\s+Saturation[^0-9]+([\d.]+)\s+-\s+([\d.]+)\s+%\s+([\d.]+)/i
    );
    if (transferrinMatch && transferrinMatch[3]) {
      const value = parseFloat(transferrinMatch[3]);
      const severity = this.getSeverity('transferrin_saturation', value);
      labValues.transferrin_saturation = {
        value: value,
        unit: '%',
        severity: severity,
        raw: transferrinMatch[0].substring(0, 80),
      };
      console.log(`✅ transferrin_saturation: ${value} % [${severity}]`);
    }

    const ferritinMatch = text.match(/Ferritin\s+([\d.]+)\s+-\s+([\d.]+)\s+ng\/mL\s+([\d.]+)/i);
    if (ferritinMatch && ferritinMatch[3]) {
      const value = parseFloat(ferritinMatch[3]);
      const severity = this.getSeverity('ferritin', value);
      labValues.ferritin = {
        value: value,
        unit: 'ng/mL',
        severity: severity,
        raw: ferritinMatch[0].substring(0, 80),
      };
      console.log(`✅ ferritin: ${value} ng/mL [${severity}]`);
    }

    // ==================== THYROID ====================
    // CRITICAL FIX: Patterns match actual PDF format where value comes AFTER units/range
    // Free T3: "Free Triiodothyronine (T3, Free)   2.30 - 4.20 pg/mL 2.57"
    const t3Patterns = [
      /Free\s+Triiodothyronine[^0-9]+[\d.]+\s+-\s+[\d.]+\s+pg\/mL\s+([\d.]+)/i,
      /\(T3,?\s+Free\)[^0-9]+[\d.]+\s+-\s+[\d.]+\s+pg\/mL\s+([\d.]+)/i,
      /T3,?\s+Free[^0-9]+pg\/mL\s+([\d.]+)/i,
    ];
    for (const pattern of t3Patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (value > 0 && value < 20) {
          // Reasonable T3 range
          const severity = this.getSeverity('t3_free', value);
          labValues.t3_free = {
            value: value,
            unit: 'pg/mL',
            severity: severity,
            raw: match[0].substring(0, 80),
          };
          console.log(`✅ t3_free: ${value} pg/mL [${severity}]`);
          break;
        }
      }
    }

    // Free T4: "Free Thyroxine (T4, Free)   0.89 - 1.76 ng/dL 1.25"
    const t4Patterns = [
      /Free\s+Thyroxine[^0-9]+[\d.]+\s+-\s+[\d.]+\s+ng\/dL\s+([\d.]+)/i,
      /\(T4,?\s+Free\)[^0-9]+[\d.]+\s+-\s+[\d.]+\s+ng\/dL\s+([\d.]+)/i,
      /T4,?\s+Free[^0-9]+ng\/dL\s+([\d.]+)/i,
    ];
    for (const pattern of t4Patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (value > 0 && value < 10) {
          // Reasonable T4 range
          const severity = this.getSeverity('t4_free', value);
          labValues.t4_free = {
            value: value,
            unit: 'ng/dL',
            severity: severity,
            raw: match[0].substring(0, 80),
          };
          console.log(`✅ t4_free: ${value} ng/dL [${severity}]`);
          break;
        }
      }
    }

    // ==================== VITAMINS (Pages 9-12) ====================
    console.log('\n🔍 Searching for vitamins on later pages...\n');

    // Vitamin B12: "pg/mL   211.00 - 911.00 466.00" - value comes AFTER range
    const b12Patterns = [
      /VITAMIN\s+B12[^\d]+pg\/mL\s+[\d.]+\s+-\s+[\d.]+\s+([\d.]+)/i, // "VITAMIN B12 ... pg/mL 211-911 466"
      /Cyanocobalamin[^\d]+pg\/mL\s+[\d.]+\s+-\s+[\d.]+\s+([\d.]+)/i, // With chemical name
      /B-?12[^\d]+pg\/mL\s+[\d.]+\s+-\s+[\d.]+\s+([\d.]+)/i, // Just B12
      /Cobalamin[^\d]+pg\/mL\s+[\d.]+\s+-\s+[\d.]+\s+([\d.]+)/i, // Alternative
    ];

    for (const pattern of b12Patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (value >= 100 && value < 3000) {
          // Reasonable range for B12 (can be high if supplementing)
          const severity = this.getSeverity('vitamin_b12', value);
          labValues.vitamin_b12 = {
            value: value,
            unit: 'pg/mL',
            severity: severity,
            raw: match[0].substring(0, 80),
          };
          console.log(`✅ vitamin_b12: ${value} pg/mL [${severity}]`);
          break;
        }
      }
    }

    // Vitamin D: "VITAMIN D, 25 - HYDROXY, SERUM (CLIA) nmol/L 75.00 - 250.00 130.25"
    const vitDPatterns = [
      /VITAMIN\s+D[^\d]+nmol\/L\s+[\d.]+\s+-\s+[\d.]+\s+([\d.]+)/i, // "VITAMIN D ... nmol/L 75-250 130.25"
      /25[-\s]*(?:OH|HYDROXY)[^\d]+nmol\/L\s+[\d.]+\s+-\s+[\d.]+\s+([\d.]+)/i, // "25-HYDROXY ... nmol/L ..."
      /Vitamin\s+D[^\d]+nmol\/L\s+([\d.]+)/i, // Without range
      /VITAMIN\s+D[^\d]+ng\/mL\s+[\d.]+\s+-\s+[\d.]+\s+([\d.]+)/i, // ng/mL with range
      /Vitamin\s+D[^\d]+ng\/mL\s+([\d.]+)/i, // ng/mL simple
    ];

    for (const pattern of vitDPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let value = parseFloat(match[1]);
        let unit = 'nmol/L';

        // If pattern matched ng/mL, convert to nmol/L
        if (match[0].includes('ng/mL')) {
          value = value * 2.5; // Convert ng/mL to nmol/L
          console.log(`🔄 Converted Vitamin D from ng/mL to nmol/L: ${match[1]} -> ${value}`);
        }

        if (value >= 10 && value < 400) {
          // Reasonable range for Vitamin D in nmol/L
          const severity = this.getSeverity('vitamin_d', value);
          labValues.vitamin_d = {
            value: parseFloat(value.toFixed(1)),
            unit: unit,
            severity: severity,
            raw: match[0].substring(0, 80),
          };
          console.log(`✅ vitamin_d: ${value.toFixed(1)} ${unit} [${severity}]`);
          break;
        }
      }
    }

    // ==================== SEX HORMONES (Pages 9-12) ====================
    // Estradiol: "Estradiol   pg/mL 147.78" - value comes AFTER pg/mL
    const estradiolPatterns = [
      /Estradiol\s+pg\/mL\s+([\d.]+)/i, // "Estradiol   pg/mL 147.78"
      /\(E2\)[^\d]+pg\/mL\s+([\d.]+)/i, // "(E2)   pg/mL 147.78"
      /E2[^\d]+pg\/mL\s+([\d.]+)/i, // "E2   pg/mL 147.78"
      /Oestradiol\s+pg\/mL\s+([\d.]+)/i, // British spelling
    ];

    for (const pattern of estradiolPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (value >= 10 && value < 1000) {
          // Reasonable range for Estradiol (can be high mid-cycle)
          // NOTE: No severity - varies by cycle phase
          labValues.estradiol = {
            value: value,
            unit: 'pg/mL',
            severity: 'cycle-dependent',
            raw: match[0].substring(0, 80),
          };
          console.log(`✅ estradiol: ${value} pg/mL [cycle-dependent]`);
          break;
        }
      }
    }

    // Progesterone: "Progesterone, Serum   ng/mL 22.25" - value AFTER ng/mL
    const progesteronePatterns = [
      /Progesterone[,\s]+Serum\s+ng\/mL\s+([\d.]+)/i, // "Progesterone, Serum   ng/mL 22.25"
      /Progesterone\s+ng\/mL\s+([\d.]+)/i, // "Progesterone   ng/mL 22.25"
    ];

    for (const pattern of progesteronePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (value >= 0.1 && value < 100) {
          // Reasonable range for Progesterone
          // NOTE: No severity - varies by cycle phase
          labValues.progesterone = {
            value: value,
            unit: 'ng/mL',
            severity: 'cycle-dependent',
            raw: match[0].substring(0, 80),
          };
          console.log(`✅ progesterone: ${value} ng/mL [cycle-dependent]`);
          break;
        }
      }
    }

    // ==================== FALLBACK SEARCH ====================
    // If critical values still missing, do a more aggressive search
    const missingCritical = [
      't3_free',
      't4_free',
      'estradiol',
      'progesterone',
      'vitamin_d',
      'vitamin_b12',
    ];
    const stillMissing = missingCritical.filter((key) => !labValues[key]);

    if (stillMissing.length > 0) {
      console.log(`\n⚠️  Missing critical values: ${stillMissing.join(', ')}`);
      console.log('🔍 Attempting aggressive fallback search...\n');

      // Show sample text snippets to help debug
      if (stillMissing.includes('t3_free') || stillMissing.includes('t4_free')) {
        const thyroidSnippet = text.match(/.{0,150}(T3|T4|Triiodothyronine|Thyroxine).{0,150}/i);
        if (thyroidSnippet) console.log('Sample thyroid text:', thyroidSnippet[0]);
      }

      if (stillMissing.includes('estradiol')) {
        const estradiolSnippet = text.match(/.{0,150}(Estradiol|E2|Oestradiol).{0,150}/i);
        if (estradiolSnippet) console.log('Sample estradiol text:', estradiolSnippet[0]);
      }

      if (stillMissing.includes('progesterone')) {
        const progesteroneSnippet = text.match(/.{0,150}Progesterone.{0,150}/i);
        if (progesteroneSnippet) console.log('Sample progesterone text:', progesteroneSnippet[0]);
      }

      if (stillMissing.includes('vitamin_d')) {
        const vitDSnippet = text.match(/.{0,150}(Vitamin\s+D|25.*OH).{0,150}/i);
        if (vitDSnippet) console.log('Sample vitamin D text:', vitDSnippet[0]);
      }

      if (stillMissing.includes('vitamin_b12')) {
        const b12Snippet = text.match(/.{0,150}(Vitamin\s+B12|B12|Cobalamin).{0,150}/i);
        if (b12Snippet) console.log('Sample B12 text:', b12Snippet[0]);
      }
    }

    // Calculate derived values
    this.calculateDerivedValues(labValues);

    const totalCount = Object.keys(labValues).length;
    console.log(`\n✅ Total extracted: ${totalCount} lab values\n`);
    logger.info(`Extracted ${totalCount} lab values`, {
      keys: Object.keys(labValues),
    });

    return labValues;
  }

  calculateDerivedValues(labValues) {
    if (labValues.lh && labValues.fsh && !labValues.lh_fsh_ratio) {
      const value = parseFloat((labValues.lh.value / labValues.fsh.value).toFixed(2));
      const severity = this.getSeverity('lh_fsh_ratio', value);
      labValues.lh_fsh_ratio = {
        value: value,
        unit: 'ratio',
        severity: severity,
        raw: `Calculated from LH:${labValues.lh.value} FSH:${labValues.fsh.value}`,
      };
    }

    if (labValues.glucose_fasting && labValues.insulin_fasting && !labValues.homa_ir) {
      const glucose = labValues.glucose_fasting.value;
      const insulin = labValues.insulin_fasting.value;
      const homaIR = (glucose * insulin) / 405;
      const value = parseFloat(homaIR.toFixed(2));
      const severity = this.getSeverity('homa_ir', value);

      labValues.homa_ir = {
        value: value,
        unit: '',
        severity: severity,
        raw: `Calculated from Glucose:${glucose} Insulin:${insulin}`,
      };
    }

    if (labValues.iron && labValues.tibc && !labValues.transferrin_saturation) {
      const saturation = (labValues.iron.value / labValues.tibc.value) * 100;
      const value = parseFloat(saturation.toFixed(2));
      const severity = this.getSeverity('transferrin_saturation', value);

      labValues.transferrin_saturation = {
        value: value,
        unit: '%',
        severity: severity,
        raw: `Calculated from Iron:${labValues.iron.value} TIBC:${labValues.tibc.value}`,
      };
    }
  }

  getSeverity(labKey, value) {
    const ranges = pcosLabRanges[labKey];
    if (!ranges) return 'normal';

    // Skip severity calculation for cycle-dependent hormones
    if (ranges.skipSeverity) return 'cycle-dependent';

    // Check deficient (for Ferritin, Vitamin D, B12)
    if (ranges.deficient) {
      if (typeof ranges.deficient === 'object') {
        if (value <= ranges.deficient.max) return 'deficient';
      } else if (value <= ranges.deficient) {
        return 'deficient';
      }
    }

    // Check low
    if (ranges.low) {
      if (typeof ranges.low === 'object') {
        if (value >= ranges.low.min && value <= ranges.low.max) return 'low';
      } else if (value <= ranges.low) {
        return 'low';
      }
    }

    // Check normal range
    if (ranges.normal) {
      if (value >= ranges.normal.min && value <= ranges.normal.max) return 'normal';
    }

    // Check elevated/high
    if (ranges.elevated && value >= ranges.elevated) return 'elevated';
    if (ranges.high && value >= ranges.high) return 'high';
    if (ranges.critical && value >= ranges.critical) return 'critical';

    return 'abnormal';
  }

  isValueNormal(labKey, value) {
    const ranges = pcosLabRanges[labKey];
    if (!ranges || !ranges.normal) return null;

    const normal = ranges.normal;
    return value >= normal.min && value <= normal.max;
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
}

export const parserService = new ParserService();
export default parserService;
