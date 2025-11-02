const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

export class Logger {
  constructor(name) {
    this.name = name;
    this.requestMap = new Map(); // Track active requests
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.name}]`;

    if (data && Object.keys(data).length > 0) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  // Enhanced logging methods with request context
  debug(message, data) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  info(message, data) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  warn(message, data) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  error(message, data) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  // Request lifecycle tracking methods
  startRequest(requestId, method, url, userAgent = null) {
    const startTime = Date.now();
    this.requestMap.set(requestId, { startTime, method, url });

    this.info(`REQUEST_START`, {
      requestId,
      method,
      url,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return requestId;
  }

  endRequest(requestId, statusCode, responseSize = null) {
    const requestData = this.requestMap.get(requestId);
    if (!requestData) {
      this.warn(`REQUEST_END - No start data found for requestId: ${requestId}`);
      return;
    }

    const duration = Date.now() - requestData.startTime;
    this.requestMap.delete(requestId);

    this.info(`REQUEST_END`, {
      requestId,
      method: requestData.method,
      url: requestData.url,
      statusCode,
      duration: `${duration}ms`,
      responseSize,
      timestamp: new Date().toISOString(),
    });
  }

  // Function entry/exit tracking
  functionEntry(functionName, params = {}, requestId = null) {
    this.debug(`FUNCTION_ENTRY: ${functionName}`, {
      functionName,
      params,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  functionExit(functionName, result = null, requestId = null) {
    this.debug(`FUNCTION_EXIT: ${functionName}`, {
      functionName,
      result: result ? 'success' : 'completed',
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Performance tracking
  performanceLog(operation, duration, metadata = {}) {
    this.info(`PERFORMANCE`, {
      operation,
      duration: `${duration}ms`,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // Database operation tracking
  dbQuery(query, params = {}, requestId = null) {
    this.debug(`DB_QUERY`, {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      params,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  dbResult(query, resultCount, duration, requestId = null) {
    this.debug(`DB_RESULT`, {
      query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
      resultCount,
      duration: `${duration}ms`,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}

export default Logger;
