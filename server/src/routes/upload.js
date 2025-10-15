import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ocrService } from '../services/ocrService.js';
import { parserService } from '../services/parserService.js';
import { reportChain } from '../langchain/chains/reportChain.js';
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

// In-memory storage for parsed reports
const parsedReports = new Map();

/**
 * POST /api/upload/report
 * Upload and parse medical report
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

    // Store parsed report
    const reportId = 'report_' + Date.now();
    const reportData = {
      id: reportId,
      userId,
      filename: req.file.originalname,
      reportType,
      extractedText,
      labValues,
      analysis,
      uploadedAt: new Date(),
      filePath,
    };
    console.log('Storing report data:', reportData);
    parsedReports.set(reportId, reportData);
    logger.info('Report parsed and analyzed', { reportId });

    // Clean up file after processing (optional - keep for debugging)
    // fs.unlinkSync(filePath)

    res.json({
      success: true,
      data: {
        reportId,
        filename: req.file.originalname,
        labValues,
        analysis,
        uploadedAt: new Date(),
      },
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
 * GET /api/upload/report/:reportId
 * Get parsed report details
 */
router.get('/report/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;
    const report = parsedReports.get(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found' },
      });
    }

    // Don't send file path in response
    const { filePath, ...reportData } = report;

    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    logger.error('Get report failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve report' },
    });
  }
});

/**
 * GET /api/upload/user/:userId/reports
 * Get all reports for a user
 */
router.get('/user/:userId/reports', (req, res) => {
  try {
    const { userId } = req.params;
    const userReports = Array.from(parsedReports.values())
      .filter((report) => report.userId === userId)
      .map(({ filePath, ...report }) => report);

    res.json({
      success: true,
      data: {
        reports: userReports,
        count: userReports.length,
      },
    });
  } catch (error) {
    logger.error('Get user reports failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve reports' },
    });
  }
});

/**
 * DELETE /api/upload/report/:reportId
 * Delete a report
 */
router.delete('/report/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;
    const report = parsedReports.get(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found' },
      });
    }

    // Delete file from disk
    if (fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }

    parsedReports.delete(reportId);
    logger.info('Report deleted', { reportId });

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
