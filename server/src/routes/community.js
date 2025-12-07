import express from 'express';
import googleSheetsService from '../../services/googleSheetsService.js';
import { communityJoinLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/community/join
 * Join the Sakhee community - save email and location to Google Sheets
 */
router.post('/join', communityJoinLimiter, async (req, res) => {
  try {
    const { email, location, deviceType, consentGiven } = req.body;

    // Validate required fields
    if (!email || !location || !deviceType || consentGiven !== true) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields. Please provide email, location, device type, and consent.',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();

    // Check for duplicate email
    const isDuplicate = await googleSheetsService.checkDuplicateEmail(sanitizedEmail);
    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    // Get IP address (handle proxies)
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'Unknown';

    // Get user agent
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Prepare data for Google Sheets
    const sheetData = {
      email: sanitizedEmail,
      city: location.city || 'Unknown',
      state: location.state || 'Unknown',
      country: location.country || 'Unknown',
      latitude: location.latitude,
      longitude: location.longitude,
      deviceType: deviceType || 'Unknown',
      ipAddress,
      userAgent,
    };

    // Append to Google Sheets
    const result = await googleSheetsService.appendRow(sheetData);

    console.log(
      `✅ New community member: ${sanitizedEmail} from ${location.city}, ${location.country}`
    );

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Successfully joined the community! You'll receive updates soon.",
      data: result,
    });
  } catch (error) {
    console.error('Error in /api/community/join:', error);

    // Check if it's a Google Sheets specific error
    if (
      error.message.includes('Failed to save data') ||
      error.message.includes('Failed to verify email')
    ) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again in a few moments.',
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
});

/**
 * GET /api/community/health
 * Health check endpoint for the community service
 */
router.get('/health', async (req, res) => {
  try {
    await googleSheetsService.initialize();
    res.status(200).json({
      success: true,
      message: 'Community service is healthy',
      sheetsConnected: googleSheetsService.initialized,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      error: error.message,
    });
  }
});

export default router;
