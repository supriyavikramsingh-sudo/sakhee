export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = {};

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || {};
  }

  if (err.name === 'AuthenticationError') {
    statusCode = 401;
    message = 'Authentication Failed';
  }

  if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource Not Found';
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      details,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

export default errorHandler;