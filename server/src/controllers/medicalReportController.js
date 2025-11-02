// server/src/controllers/medicalReportController.js
// Medical Report Controller - MVC Pattern Implementation

import { medicalReportService } from '../services/medicalReportService.js';
import { Logger } from '../utils/logger.js';

export class MedicalReportController {
  constructor() {
    this.logger = new Logger('MedicalReportController');
  }

  /**
   * Get user's medical report
   * GET /api/medical-report/:userId
   */
  async getUserReport(req, res) {
    const requestId = this.logger.generateRequestId();
    const startTime = Date.now();

    try {
      const { userId } = req.params;

      this.logger.logEntry('getUserReport', {
        requestId,
        userId,
        method: req.method,
        url: req.url
      });

      if (!userId) {
        this.logger.logExit('getUserReport', {
          requestId,
          status: 'error',
          error: 'User ID is required',
          duration: Date.now() - startTime
        });
        return res.status(400).json({
          success: false,
          error: { message: 'User ID is required' }
        });
      }

      const result = await medicalReportService.getUserReport(userId);

      if (!result.success) {
        this.logger.logExit('getUserReport', {
          requestId,
          userId,
          status: 'error',
          error: result.error,
          duration: Date.now() - startTime
        });
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to retrieve medical report', details: result.error }
        });
      }

      this.logger.logExit('getUserReport', {
        requestId,
        userId,
        status: 'success',
        hasReport: !!result.data,
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      this.logger.logExit('getUserReport', {
        requestId,
        status: 'error',
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: { message: 'Internal server error', details: error.message }
      });
    }
  }

  /**
   * Save medical report
   * POST /api/medical-report
   */
  async saveReport(req, res) {
    const requestId = this.logger.generateRequestId();
    const startTime = Date.now();

    try {
      const { userId, reportData } = req.body;

      this.logger.logEntry('saveReport', {
        requestId,
        userId,
        method: req.method,
        url: req.url,
        hasReportData: !!reportData,
        reportType: reportData?.reportType
      });

      if (!userId || !reportData) {
        this.logger.logExit('saveReport', {
          requestId,
          status: 'error',
          error: 'User ID and report data are required',
          duration: Date.now() - startTime
        });
        return res.status(400).json({
          success: false,
          error: { message: 'User ID and report data are required' }
        });
      }

      const result = await medicalReportService.saveReport(userId, reportData);

      if (!result.success) {
        this.logger.logExit('saveReport', {
          requestId,
          userId,
          status: 'error',
          error: result.error,
          duration: Date.now() - startTime
        });
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to save medical report', details: result.error }
        });
      }

      this.logger.logExit('saveReport', {
        requestId,
        userId,
        status: 'success',
        reportId: result.data?.id,
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      this.logger.logExit('saveReport', {
        requestId,
        status: 'error',
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: { message: 'Internal server error', details: error.message }
      });
    }
  }

  /**
   * Delete medical report
   * DELETE /api/medical-report/:userId
   */
  async deleteReport(req, res) {
    const requestId = this.logger.generateRequestId();
    const startTime = Date.now();

    try {
      const { userId } = req.params;

      this.logger.logEntry('deleteReport', {
        requestId,
        userId,
        method: req.method,
        url: req.url
      });

      if (!userId) {
        this.logger.logExit('deleteReport', {
          requestId,
          status: 'error',
          error: 'User ID is required',
          duration: Date.now() - startTime
        });
        return res.status(400).json({
          success: false,
          error: { message: 'User ID is required' }
        });
      }

      const result = await medicalReportService.deleteReport(userId);

      if (!result.success) {
        this.logger.logExit('deleteReport', {
          requestId,
          userId,
          status: 'error',
          error: result.error,
          duration: Date.now() - startTime
        });
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to delete medical report', details: result.error }
        });
      }

      this.logger.logExit('deleteReport', {
        requestId,
        userId,
        status: 'success',
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        data: { message: 'Medical report deleted successfully' }
      });

    } catch (error) {
      this.logger.logExit('deleteReport', {
        requestId,
        status: 'error',
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: { message: 'Internal server error', details: error.message }
      });
    }
  }

  /**
   * Check if user has a medical report
   * GET /api/medical-report/:userId/exists
   */
  async hasReport(req, res) {
    const requestId = this.logger.generateRequestId();
    const startTime = Date.now();

    try {
      const { userId } = req.params;

      this.logger.logEntry('hasReport', {
        requestId,
        userId,
        method: req.method,
        url: req.url
      });

      if (!userId) {
        this.logger.logExit('hasReport', {
          requestId,
          status: 'error',
          error: 'User ID is required',
          duration: Date.now() - startTime
        });
        return res.status(400).json({
          success: false,
          error: { message: 'User ID is required' }
        });
      }

      const result = await medicalReportService.hasReport(userId);

      if (!result.success) {
        this.logger.logExit('hasReport', {
          requestId,
          userId,
          status: 'error',
          error: result.error,
          duration: Date.now() - startTime
        });
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to check report existence', details: result.error }
        });
      }

      this.logger.logExit('hasReport', {
        requestId,
        userId,
        status: 'success',
        hasReport: result.hasReport,
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        data: { hasReport: result.hasReport }
      });

    } catch (error) {
      this.logger.logExit('hasReport', {
        requestId,
        status: 'error',
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: { message: 'Internal server error', details: error.message }
      });
    }
  }

  /**
   * Get lab values from report
   * GET /api/medical-report/:userId/lab-values
   */
  async getLabValues(req, res) {
    const requestId = this.logger.generateRequestId();
    const startTime = Date.now();

    try {
      const { userId } = req.params;

      this.logger.logEntry('getLabValues', {
        requestId,
        userId,
        method: req.method,
        url: req.url
      });

      if (!userId) {
        this.logger.logExit('getLabValues', {
          requestId,
          status: 'error',
          error: 'User ID is required',
          duration: Date.now() - startTime
        });
        return res.status(400).json({
          success: false,
          error: { message: 'User ID is required' }
        });
      }

      const result = await medicalReportService.getLabValues(userId);

      if (!result.success) {
        this.logger.logExit('getLabValues', {
          requestId,
          userId,
          status: 'error',
          error: result.error,
          duration: Date.now() - startTime
        });
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to retrieve lab values', details: result.error }
        });
      }

      this.logger.logExit('getLabValues', {
        requestId,
        userId,
        status: 'success',
        labValuesCount: Object.keys(result.data || {}).length,
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      this.logger.logExit('getLabValues', {
        requestId,
        status: 'error',
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: { message: 'Internal server error', details: error.message }
      });
    }
  }

  /**
   * Update report analysis
   * PUT /api/medical-report/:userId/analysis
   */
  async updateReportAnalysis(req, res) {
    const requestId = this.logger.generateRequestId();
    const startTime = Date.now();

    try {
      const { userId } = req.params;
      const { analysis } = req.body;

      this.logger.logEntry('updateReportAnalysis', {
        requestId,
        userId,
        method: req.method,
        url: req.url,
        hasAnalysis: !!analysis
      });

      if (!userId || !analysis) {
        this.logger.logExit('updateReportAnalysis', {
          requestId,
          status: 'error',
          error: 'User ID and analysis data are required',
          duration: Date.now() - startTime
        });
        return res.status(400).json({
          success: false,
          error: { message: 'User ID and analysis data are required' }
        });
      }

      const result = await medicalReportService.updateReportAnalysis(userId, analysis);

      if (!result.success) {
        this.logger.logExit('updateReportAnalysis', {
          requestId,
          userId,
          status: 'error',
          error: result.error,
          duration: Date.now() - startTime
        });
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to update report analysis', details: result.error }
        });
      }

      this.logger.logExit('updateReportAnalysis', {
        requestId,
        userId,
        status: 'success',
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        data: { message: 'Report analysis updated successfully' }
      });

    } catch (error) {
      this.logger.logExit('updateReportAnalysis', {
        requestId,
        status: 'error',
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: { message: 'Internal server error', details: error.message }
      });
    }
  }
}
