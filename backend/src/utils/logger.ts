/* eslint-disable no-console */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  module?: string;
  operation?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === 'production';

function formatLog(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();

  if (isProduction) {
    // Structured JSON logging in production
    const entry = {
      timestamp,
      level,
      message,
      ...context,
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  } else {
    // Human-readable in development
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const ctxStr = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    if (level === 'error') {
      console.error(`${prefix} ${message}${ctxStr}`);
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}${ctxStr}`);
    } else if (level === 'debug') {
      console.debug(`${prefix} ${message}${ctxStr}`);
    } else {
      console.log(`${prefix} ${message}${ctxStr}`);
    }
  }
}

export const logger = {
  error(message: string, context?: LogContext): void {
    formatLog('error', message, context);
  },
  warn(message: string, context?: LogContext): void {
    formatLog('warn', message, context);
  },
  info(message: string, context?: LogContext): void {
    formatLog('info', message, context);
  },
  debug(message: string, context?: LogContext): void {
    formatLog('debug', message, context);
  },
};
