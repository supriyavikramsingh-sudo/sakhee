import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ocrService } from '../services/ocrService.js';
import { parserService } from '../services/parserService.js';
import { reportChain } from '../langchain/chains/reportChain.js';
import { medicalReportService } from '../services/medicalReportService.js';
import { Logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const router = express.Router();
const logger = new Logger('UploadRoutes');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './src/storage/tmpUploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, JPEG, JPG, PNG allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  },
});

/**
 * POST /api/upload/report
 * Upload and parse medical report (single file per user - replaces previous)
 */
router.post('/report', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded' },
      });
    }

    const { userId, reportType = 'lab' } = req.body;
    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();

    logger.info('File uploaded', {
      userId,
      filename: req.file.originalname,
      type: fileType,
    });

    let extractedText = '';

    // Extract text based on file type
    if (fileType === '.pdf') {
      extractedText = await parserService.parsePDF(filePath);
    } else if (fileType === '.docx') {
      extractedText = await parserService.parseDOCX(filePath);
    } else if (['.jpg', '.jpeg', '.png'].includes(fileType)) {
      extractedText = await ocrService.performOCR(filePath);
    }

    logger.info('Text extracted', { length: extractedText.length });

    // Parse lab values
    const labValues = parserService.extractLabValues(extractedText);

    // Analyze report with AI
    const analysis = await reportChain.analyzeReport({
      labValues,
      age: req.body.age,
      diagnosedPCOS: req.body.diagnosedPCOS === 'true',
      reportDate: req.body.reportDate || new Date().toISOString(),
    });

    // Prepare response data
    const responseData = {
      reportId: 'current',
      filename: req.file.originalname,
      labValues,
      analysis,
      extractedText,
      uploadedAt: new Date(),
    };

    // Try to save to Firestore (non-blocking - won't fail the request)
    logger.info('Saving report to Firestore...', { userId });
    try {
      const saveResult = await medicalReportService.saveReport(userId, {
        filename: req.file.originalname,
        reportType,
        extractedText,
        labValues,
        analysis,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      if (saveResult.success) {
        logger.info('Report saved to Firestore successfully', { userId });
      } else {
        logger.warn('Failed to save to Firestore (non-critical)', {
          error: saveResult.error,
          userId,
        });
      }
    } catch (firestoreError) {
      // Log the error but don't fail the request
      logger.warn('Firestore save error (non-critical)', {
        error: firestoreError.message,
        userId,
      });
    }

    logger.info('Report parsed and analyzed', { userId });

    // Clean up temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Return success even if Firestore save failed
    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('Report upload failed', { error: error.message });

    // Clean up file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to process report' },
    });
  }
});

/**
 * GET /api/upload/user/:userId/report
 * Get user's current medical report
 */
router.get('/user/:userId/report', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('Fetching report for user', { userId });

    const result = await medicalReportService.getUserReport(userId);

    // If Firestore fails, return 404 (no report) instead of error
    if (!result.success) {
      logger.warn('Failed to get report from Firestore', {
        userId,
        error: result.error,
      });
      return res.status(404).json({
        success: false,
        error: { message: 'No report found for this user' },
      });
    }

    if (!result.data) {
      logger.info('No report found for user', { userId });
      return res.status(404).json({
        success: false,
        error: { message: 'No report found for this user' },
      });
    }

    logger.info('Report retrieved successfully', { userId });
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Get report failed', { error: error.message, stack: error.stack });
    res.status(404).json({
      success: false,
      error: { message: 'No report found for this user' },
    });
  }
});

/**
 * GET /api/upload/user/:userId/has-report
 * Check if user has a medical report
 */
router.get('/user/:userId/has-report', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await medicalReportService.hasReport(userId);

    res.json({
      success: true,
      hasReport: result.hasReport || false,
    });
  } catch (error) {
    logger.error('Check report existence failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to check report existence' },
    });
  }
});

/**
 * DELETE /api/upload/user/:userId/report
 * Delete user's medical report
 */
router.delete('/user/:userId/report', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await medicalReportService.deleteReport(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { message: result.error || 'Failed to delete report' },
      });
    }

    logger.info('Report deleted', { userId });

    res.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    logger.error('Delete report failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete report' },
    });
  }
});

export default router;
