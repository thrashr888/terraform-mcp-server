import debug from "debug";
import { LOG_LEVELS, LOG_LEVEL, SERVER_NAME } from "../../config.js";

// Namespace for the debug loggers
const BASE_NAMESPACE = SERVER_NAME.replace(/[^a-zA-Z0-9_-]/g, "-");

// Create loggers for different levels
const errorLogger = debug(`${BASE_NAMESPACE}:error`);
const warnLogger = debug(`${BASE_NAMESPACE}:warn`);
const infoLogger = debug(`${BASE_NAMESPACE}:info`);
const debugLogger = debug(`${BASE_NAMESPACE}:debug`);

// By default, send error and warning logs to stderr
errorLogger.log = (message: string, ...args: any[]) => {
  console.error(JSON.stringify({ level: "error", message, metadata: args[0] || {} }));
};
warnLogger.log = (message: string, ...args: any[]) => {
  console.error(JSON.stringify({ level: "warn", message, metadata: args[0] || {} }));
};
infoLogger.log = (message: string, ...args: any[]) => {
  console.error(JSON.stringify({ level: "info", message, metadata: args[0] || {} }));
};
debugLogger.log = (message: string, ...args: any[]) => {
  console.error(JSON.stringify({ level: "debug", message, metadata: args[0] || {} }));
};

// Initialize loggers based on configured log level
// The environment variable DEBUG takes precedence over LOG_LEVEL
// To enable via DEBUG: DEBUG=terraform-mcp:* node dist/index.js
// For specific levels: DEBUG=terraform-mcp:error,terraform-mcp:warn node dist/index.js

// Enable appropriate log levels based on LOG_LEVEL if DEBUG is not set
if (!process.env.DEBUG) {
  const enableDebug = (namespace: string) => {
    debug.enable(`${BASE_NAMESPACE}:${namespace}`);
  };

  // Enable levels based on the configured log level
  switch (LOG_LEVEL) {
    case LOG_LEVELS.ERROR:
      enableDebug("error");
      break;
    case LOG_LEVELS.WARN:
      enableDebug("error,warn");
      break;
    case LOG_LEVELS.INFO:
      enableDebug("error,warn,info");
      break;
    case LOG_LEVELS.DEBUG:
      enableDebug("error,warn,info,debug");
      break;
    default:
      // Default to INFO level
      enableDebug("error,warn,info");
  }
}

/**
 * Log a message at the specified level
 * @param level The log level (error, warn, info, debug)
 * @param message The message to log
 * @param metadata Optional metadata to include
 */
export function log(level: string, message: string, metadata?: any): void {
  switch (level) {
    case LOG_LEVELS.ERROR:
      errorLogger(message, metadata);
      break;
    case LOG_LEVELS.WARN:
      warnLogger(message, metadata);
      break;
    case LOG_LEVELS.INFO:
      infoLogger(message, metadata);
      break;
    case LOG_LEVELS.DEBUG:
      debugLogger(message, metadata);
      break;
    default:
      infoLogger(message, metadata);
  }
}

// Convenience methods for specific log levels
export const logError = (message: string, metadata?: any) => log(LOG_LEVELS.ERROR, message, metadata);
export const logWarn = (message: string, metadata?: any) => log(LOG_LEVELS.WARN, message, metadata);
export const logInfo = (message: string, metadata?: any) => log(LOG_LEVELS.INFO, message, metadata);
export const logDebug = (message: string, metadata?: any) => log(LOG_LEVELS.DEBUG, message, metadata);

export default {
  log,
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug
};
