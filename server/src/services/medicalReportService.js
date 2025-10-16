/**
 * Medical Report Service
 * Handles storage and retrieval of medical reports in Firestore
 * Enforces single-report-per-user policy
 */

import { db } from '../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { Logger } from '../utils/logger.js';

const logger = new Logger('MedicalReportService');

class MedicalReportService {
  constructor() {
    this.uploadDir = './src/storage/tmpUploads';
  }

  /**
   * Get the user's current medical report (only one per user)
   */
  async getUserReport(userId) {
    try {
      const reportRef = doc(db, 'users', userId, 'medicalReport', 'current');
      const reportDoc = await getDoc(reportRef);

      if (reportDoc.exists()) {
        return {
          success: true,
          data: {
            id: reportDoc.id,
            ...reportDoc.data(),
          },
        };
      }

      return { success: true, data: null };
    } catch (error) {
      logger.error('Failed to get user report', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Sanitize field name to be Firestore-compatible
   * Firestore field names cannot contain: . $ # [ ] /
   */
  sanitizeFieldName(name) {
    if (typeof name !== 'string') return String(name);
    return name.replace(/[.$#[\]/]/g, '_');
  }

  /**
   * Sanitize data to remove undefined, null, and invalid Firestore values
   */
  sanitizeData(data, depth = 0) {
    // Prevent infinite recursion
    if (depth > 10) {
      logger.warn('Max depth reached in sanitizeData');
      return null;
    }

    if (data === null || data === undefined) {
      return null;
    }

    // Handle Date objects
    if (data instanceof Date) {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data
        .map((item) => this.sanitizeData(item, depth + 1))
        .filter((item) => item !== null && item !== undefined);
    }

    // Handle objects
    if (typeof data === 'object') {
      // Check if it's a plain object
      if (Object.prototype.toString.call(data) === '[object Object]') {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
          // Skip functions and symbols
          if (typeof value === 'function' || typeof value === 'symbol') {
            continue;
          }

          // Sanitize the key name
          const cleanKey = this.sanitizeFieldName(key);
          const cleanValue = this.sanitizeData(value, depth + 1);

          if (cleanValue !== null && cleanValue !== undefined) {
            sanitized[cleanKey] = cleanValue;
          }
        }
        return sanitized;
      }

      // For non-plain objects, convert to string
      try {
        return String(data);
      } catch (e) {
        return null;
      }
    }

    // Handle primitives
    if (typeof data === 'string') {
      // Limit string length to prevent document size issues
      return data.length > 50000 ? data.substring(0, 50000) + '...' : data;
    }

    if (typeof data === 'number') {
      // Check for invalid number values
      if (isNaN(data) || !isFinite(data)) {
        return null;
      }
      return data;
    }

    if (typeof data === 'boolean') {
      return data;
    }

    // Skip functions, symbols, undefined
    if (typeof data === 'function' || typeof data === 'symbol') {
      return null;
    }

    return data;
  }

  /**
   * Save a new medical report (replaces any existing report)
   */
  async saveReport(userId, reportData) {
    try {
      // Delete previous report if exists
      await this.deletePreviousReport(userId);

      // Save new report with fixed document ID 'current'
      const reportRef = doc(db, 'users', userId, 'medicalReport', 'current');

      // Sanitize all data before saving
      const sanitizedLabValues = this.sanitizeData(reportData.labValues) || {};
      const sanitizedAnalysis = this.sanitizeData(reportData.analysis) || {};

      logger.info('Sanitized data prepared', {
        labValuesKeys: Object.keys(sanitizedLabValues),
        analysisKeys: Object.keys(sanitizedAnalysis),
      });

      const reportToSave = {
        userId,
        filename: reportData.filename || 'unknown',
        reportType: reportData.reportType || 'lab',
        extractedText: (reportData.extractedText || '').substring(0, 50000), // Limit text size
        labValues: sanitizedLabValues,
        analysis: sanitizedAnalysis,
        uploadedAt: serverTimestamp(),
        fileMetadata: {
          originalName: reportData.filename || 'unknown',
          size: reportData.fileSize || 0,
          mimeType: reportData.mimeType || 'application/octet-stream',
        },
      };

      // Validate the document size (Firestore has 1MB limit)
      const docSize = JSON.stringify(reportToSave).length;
      logger.info('Document size to save', { bytes: docSize, kb: (docSize / 1024).toFixed(2) });

      if (docSize > 900000) {
        // If too large, reduce extractedText further
        reportToSave.extractedText = reportToSave.extractedText.substring(0, 10000) + '...';
        logger.warn('Document too large, reduced extractedText size');
      }

      await setDoc(reportRef, reportToSave);

      logger.info('Medical report saved to Firestore', {
        userId,
        filename: reportData.filename,
      });

      return {
        success: true,
        data: {
          id: 'current',
          ...reportToSave,
          uploadedAt: new Date(),
        },
      };
    } catch (error) {
      logger.error('Failed to save report', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete the user's current medical report
   */
  async deletePreviousReport(userId) {
    try {
      // Get existing report to delete file
      const existingReport = await this.getUserReport(userId);

      if (existingReport.success && existingReport.data) {
        const reportRef = doc(db, 'users', userId, 'medicalReport', 'current');
        await deleteDoc(reportRef);

        // Delete physical file if it exists
        const filePath = path.join(this.uploadDir, `${userId}_${existingReport.data.filename}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info('Deleted previous report file', { filePath });
        }

        logger.info('Previous medical report deleted', { userId });
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete previous report', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a user's medical report
   */
  async deleteReport(userId) {
    try {
      await this.deletePreviousReport(userId);
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete report', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has a medical report
   */
  async hasReport(userId) {
    try {
      const result = await this.getUserReport(userId);
      return {
        success: true,
        hasReport: result.success && result.data !== null,
      };
    } catch (error) {
      logger.error('Failed to check if user has report', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Update report analysis (e.g., after re-analysis)
   */
  async updateReportAnalysis(userId, analysis) {
    try {
      const reportRef = doc(db, 'users', userId, 'medicalReport', 'current');
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        return { success: false, error: 'Report not found' };
      }

      await setDoc(
        reportRef,
        {
          analysis,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      logger.info('Report analysis updated', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to update report analysis', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lab values from report
   */
  async getLabValues(userId) {
    try {
      const result = await this.getUserReport(userId);

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.labValues || {},
        };
      }

      return { success: true, data: {} };
    } catch (error) {
      logger.error('Failed to get lab values', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }
}

export const medicalReportService = new MedicalReportService();
export default medicalReportService;
