import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Process-level safety net for failures that escape Express.
 *
 * Express 4 never sees a rejected promise returned by a route handler, so an
 * unhandled rejection is left to Node's default behaviour: terminate the
 * process. This portal serves every student from a single process, so one bad
 * request must degrade to a logged error instead of taking the service down.
 *
 * An uncaught exception is different: the process may have been left in an
 * unknown state, so it is logged and the process exits non-zero to let the
 * platform restart it cleanly.
 */

interface FailureSummary {
  reason: string;
  stack?: string;
  valueType?: string;
}

let guardsInstalled = false;

function isTestProcess(): boolean {
  return env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

// A rejection reason can be any value (an Axios config with auth headers, a
// request payload, a provider SDK error). Only the message/stack is extracted so
// request data and credentials never reach the logs.
function summariseFailure(failure: unknown): FailureSummary {
  if (failure instanceof Error) {
    return { reason: failure.message, stack: failure.stack };
  }
  if (typeof failure === 'string' || typeof failure === 'number' || typeof failure === 'boolean') {
    return { reason: String(failure) };
  }
  return {
    reason: 'Non-error value rejected',
    valueType: failure === null ? 'null' : typeof failure,
  };
}

export function handleUnhandledRejection(reason: unknown): void {
  logger.error(
    'Unhandled promise rejection; keeping the process alive to serve other requests',
    { ...summariseFailure(reason) },
  );
}

export function handleUncaughtException(error: unknown): void {
  logger.error('Uncaught exception; process state is unknown, shutting down', {
    ...summariseFailure(error),
  });

  // A test that drives this handler directly must not kill the vitest worker.
  if (isTestProcess()) {
    return;
  }

  process.exit(1);
}

export function installProcessGuards(): void {
  if (guardsInstalled) {
    return;
  }
  guardsInstalled = true;
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);
}

export function removeProcessGuards(): void {
  if (!guardsInstalled) {
    return;
  }
  guardsInstalled = false;
  process.off('unhandledRejection', handleUnhandledRejection);
  process.off('uncaughtException', handleUncaughtException);
}
