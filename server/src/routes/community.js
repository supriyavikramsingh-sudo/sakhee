import express from 'express';
import googleSheetsService from '../../services/googleSheetsService.js';
import { communityJoinLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/community/join
 * Join the Sakhee community - save phone number, optional email, and location to Google Sheets
 * Optimized for instant UI response - validation happens immediately,
 * but duplicate check and sheet write happen asynchronously
 */
router.post('/join', communityJoinLimiter, async (req, res) => {
  try {
    const { email, phoneNumber, countryCode, phoneLength, location, deviceType, consentGiven } =
      req.body;

    // Validate required fields - phone number is now mandatory, email is optional
    if (!phoneNumber || !countryCode || !deviceType || consentGiven !== true) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields. Please provide phone number, country code, device type, and consent.',
      });
    }

    // Validate phone number format based on country-specific rules
    const digitsOnly = phoneNumber.replace(/\s/g, '');

    // Check if it contains only digits
    if (!/^\d+$/.test(digitsOnly)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must contain only digits.',
      });
    }

    // Validate against country-specific phone length if provided
    if (phoneLength) {
      let isValidLength = false;

      if (typeof phoneLength === 'number') {
        // Exact length required
        isValidLength = digitsOnly.length === phoneLength;
      } else if (typeof phoneLength === 'object' && phoneLength.min && phoneLength.max) {
        // Range validation
        isValidLength =
          digitsOnly.length >= phoneLength.min && digitsOnly.length <= phoneLength.max;
      }

      if (!isValidLength) {
        const lengthMsg =
          typeof phoneLength === 'number'
            ? `${phoneLength} digits`
            : `${phoneLength.min}-${phoneLength.max} digits`;

        return res.status(400).json({
          success: false,
          message: `Please provide a valid phone number (${lengthMsg}) for the selected country.`,
        });
      }
    } else {
      // Fallback validation if phoneLength not provided (6-15 digits)
      if (!/^\d{6,15}$/.test(digitsOnly)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid phone number (6-15 digits).',
        });
      }
    }

    // Validate email format if provided (optional)
    let sanitizedEmail = null;
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }
      sanitizedEmail = email.trim().toLowerCase();
    }

    // Sanitize phone number
    const sanitizedPhone = phoneNumber.trim();
    const fullPhoneNumber = `${countryCode}${sanitizedPhone}`;

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
      phoneNumber: sanitizedPhone,
      countryCode: countryCode,
      fullPhoneNumber: fullPhoneNumber,
      email: sanitizedEmail || '', // Empty string if no email provided
      city: location?.city || 'Unknown',
      state: location?.state || 'Unknown',
      country: location?.country || 'Unknown',
      latitude: location?.latitude,
      longitude: location?.longitude,
      deviceType: deviceType || 'Unknown',
      ipAddress,
      userAgent,
    };

    // Immediately return success to the user for seamless UX
    res.status(200).json({
      success: true,
      message: "Successfully joined the community! You'll receive updates soon.",
      data: { processed: true },
    });

    // Process duplicate check and sheet write asynchronously in the background
    // This ensures the user gets immediate feedback
    processUserSignupAsync(fullPhoneNumber, sheetData);
  } catch (error) {
    console.error('Error in /api/community/join:', error);

    // Generic error response for validation failures
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
});

/**
 * Background async processor for user signup
 * Handles duplicate checking and Google Sheets insertion
 */
async function processUserSignupAsync(fullPhoneNumber, sheetData) {
  try {
    // Check for duplicate phone number
    const isDuplicate = await googleSheetsService.checkDuplicatePhone(fullPhoneNumber);

    if (isDuplicate) {
      console.log(`⚠️ Duplicate signup attempt: ${fullPhoneNumber}`);
      // Don't add to sheet, but don't fail the user's experience
      return;
    }

    // Append to Google Sheets
    const result = await googleSheetsService.appendRow(sheetData);

    console.log(
      `✅ New community member: ${fullPhoneNumber} from ${sheetData.city}, ${sheetData.country}`
    );
  } catch (error) {
    console.error(`❌ Background processing failed for ${fullPhoneNumber}:`, error);
    // Log error but don't propagate since user already got success response
    // Could implement retry logic or alert monitoring here
  }
}

/**
 * POST /api/community/update-location
 * Update location data for an existing community member (async after signup)
 */
router.post('/update-location', async (req, res) => {
  try {
    const { email, location } = req.body;

    // Validate required fields
    if (!email || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email and location.',
      });
    }

    // Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();

    // Update location in Google Sheets asynchronously
    updateLocationAsync(sanitizedEmail, location);

    // Return immediate success
    return res.status(200).json({
      success: true,
      message: 'Location update queued successfully.',
    });
  } catch (error) {
    console.error('Error in /api/community/update-location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to queue location update.',
    });
  }
});

/**
 * Background async processor for location updates
 * Finds user by email and updates their location data
 */
async function updateLocationAsync(sanitizedEmail, location) {
  try {
    const updated = await googleSheetsService.updateLocationByEmail(sanitizedEmail, location);

    if (updated) {
      console.log(
        `📍 Location updated for ${sanitizedEmail}: ${location.city}, ${location.country}`
      );
    } else {
      console.log(`⚠️ Could not find user to update location: ${sanitizedEmail}`);
    }
  } catch (error) {
    console.error(`❌ Location update failed for ${sanitizedEmail}:`, error);
  }
}

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
