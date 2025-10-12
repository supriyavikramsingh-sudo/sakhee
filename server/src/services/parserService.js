/**
 * Document Parser Service
 * Extracts text from PDF and DOCX files
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
      // pdfjs expects a Uint8Array for binary PDF data in Node
      const uint8 = new Uint8Array(dataBuffer);

      // Resolve getDocument robustly (some builds expose under default)
      let getDocumentFn = pdfjsLib.getDocument ?? pdfjsLib.default?.getDocument;
      if (!getDocumentFn) {
        // As a last resort try dynamic import of the legacy build
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

      // Disable worker in Node.js to avoid attempting to load a browser worker
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
      // Log full error and rethrow with original message so client can see cause
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
   * Extract lab values from text
   */
  extractLabValues(text) {
    const labValues = {};

    // Log extracted text in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 Extracted Text Sample:', text.substring(0, 500));
    }

    // Common patterns for lab values
    const patterns = {
      insulin_fasting:
        /(?:fasting\s+insulin|insulin\s+fasting)[\s:]+(\d+\.?\d*)\s*(miu\/l|μiu\/ml)?/i,
      glucose_fasting: /(?:fasting\s+glucose|glucose\s+fasting|fbs)[\s:]+(\d+\.?\d*)\s*(mg\/dl)?/i,
      testosterone_total:
        /(?:total\s+testosterone|testosterone\s+total)[\s:]+(\d+\.?\d*)\s*(ng\/dl)?/i,
      testosterone_free: /(?:free\s+testosterone)[\s:]+(\d+\.?\d*)\s*(pg\/ml|ng\/dl)?/i,
      lh: /(?:lh|luteinizing\s+hormone)[\s:]+(\d+\.?\d*)\s*(miu\/ml)?/i,
      fsh: /(?:fsh|follicle\s+stimulating\s+hormone)[\s:]+(\d+\.?\d*)\s*(miu\/ml)?/i,
      amh: /(?:amh|anti[- ]?m[uü]llerian\s+hormone)[\s:]+(\d+\.?\d*)\s*(ng\/ml)?/i,
      vitamin_d: /(?:vitamin\s+d|25[- ]?oh\s+d)[\s:]+(\d+\.?\d*)\s*(ng\/ml)?/i,
      hba1c: /(?:hba1c|a1c|glycated\s+hemoglobin)[\s:]+(\d+\.?\d*)\s*(%)?/i,
      thyroid_tsh: /(?:tsh|thyroid\s+stimulating\s+hormone)[\s:]+(\d+\.?\d*)\s*(μiu\/ml|miu\/l)?/i,
      dheas: /(?:dhea[- ]?s|dehydroepiandrosterone\s+sulfate)[\s:]+(\d+\.?\d*)\s*(μg\/dl)?/i,
    };

    // Extract values
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        labValues[key] = {
          value: parseFloat(match[1]),
          unit: match[2] || this.getDefaultUnit(key),
          raw: match[0],
        };
      }
    }

    // Calculate LH/FSH ratio if both present
    if (labValues.lh && labValues.fsh) {
      labValues.lh_fsh_ratio = {
        value: (labValues.lh.value / labValues.fsh.value).toFixed(2),
        unit: 'ratio',
        raw: `LH:${labValues.lh.value} FSH:${labValues.fsh.value}`,
      };
    }

    logger.info('Lab values extracted', {
      count: Object.keys(labValues).length,
      keys: Object.keys(labValues),
    });

    return labValues;
  }

  /**
   * Get default unit for lab value
   */
  getDefaultUnit(labKey) {
    const units = {
      insulin_fasting: 'mIU/L',
      glucose_fasting: 'mg/dL',
      testosterone_total: 'ng/dL',
      testosterone_free: 'pg/mL',
      lh: 'mIU/mL',
      fsh: 'mIU/mL',
      amh: 'ng/mL',
      vitamin_d: 'ng/mL',
      hba1c: '%',
      thyroid_tsh: 'μIU/mL',
      dheas: 'μg/dL',
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

    return 'abnormal';
  }
}

export const parserService = new ParserService();
export default parserService;
