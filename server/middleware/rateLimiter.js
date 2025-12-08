import rateLimit from 'express-rate-limit';

// Rate limiter for community join endpoint
// Limit: 15 submissions per IP per hour (TEMPORARY FOR TESTING - CHANGE BACK TO 3)
export const communityJoinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
  max: 15, // Limit each IP to 15 requests per windowMs (TEMPORARY - CHANGE BACK TO 3)
  message: {
    success: false,
    message: 'Too many signup attempts. Please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use a custom handler to return JSON response
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many signup attempts. Please try again later.',
    });
  },
});
