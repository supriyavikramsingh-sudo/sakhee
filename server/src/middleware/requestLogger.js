export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;
    console.log(`📨 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    res.send = originalSend;
    return res.send(data);
  };

  next();
};

export default requestLogger;