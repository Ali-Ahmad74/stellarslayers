/**
 * Environment-gated logger that only outputs in development mode.
 * Prevents information leakage in production while preserving dev experience.
 */
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) console.log(...args);
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) console.error(...args);
    // In production, you could optionally send to an error tracking service
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) console.warn(...args);
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) console.info(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) console.debug(...args);
  },
};
