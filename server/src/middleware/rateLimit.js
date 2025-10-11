import rateLimit from 'express-rate-limit';
import { appConfig } from '../config/appConfig.js';

export const rateLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: appConfig.rateLimit.skipSuccessfulRequests,
  skipFailedRequests: false
});

export default rateLimiter;