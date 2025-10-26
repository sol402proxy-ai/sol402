export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }
  return ` ${JSON.stringify(context)}`;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext, error?: unknown): void;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const formatted = `[sol402] ${message}${formatContext(context)}`;
  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      if (error instanceof Error) {
        console.error(formatted, error);
      } else if (error) {
        console.error(formatted, { error });
      } else {
        console.error(formatted);
      }
      break;
    default:
      console.log(formatted);
  }
}

export function createLogger(): Logger {
  return {
    debug(message, context) {
      log('debug', message, context);
    },
    info(message, context) {
      log('info', message, context);
    },
    warn(message, context) {
      log('warn', message, context);
    },
    error(message, context, error) {
      log('error', message, context, error);
    },
  };
}
