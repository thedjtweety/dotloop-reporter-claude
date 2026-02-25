/**
 * Error Handler - Centralized error handling and logging
 * 
 * Provides structured error handling, logging, and recovery mechanisms
 * for all server operations.
 */

interface ErrorContext {
  procedure?: string;
  userId?: number;
  tenantId?: number;
  timestamp: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context: ErrorContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format error for logging
 */
function formatError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Log an entry
 */
export function logEntry(entry: LogEntry): void {
  const timestamp = entry.context.timestamp;
  const level = entry.level.toUpperCase();
  const prefix = `[${timestamp}] [${level}]`;

  const logData = {
    message: entry.message,
    context: entry.context,
    ...(entry.error && { error: entry.error }),
    ...(entry.duration && { duration: `${entry.duration}ms` }),
  };

  switch (entry.level) {
    case 'debug':
      console.debug(prefix, logData);
      break;
    case 'info':
      console.info(prefix, logData);
      break;
    case 'warn':
      console.warn(prefix, logData);
      break;
    case 'error':
      console.error(prefix, logData);
      break;
    case 'fatal':
      console.error(prefix, 'FATAL:', logData);
      break;
  }
}

/**
 * Create a procedure error handler
 */
export function createProcedureErrorHandler(procedureName: string) {
  return {
    /**
     * Handle an error in a procedure
     */
    handle(
      error: unknown,
      context: Omit<ErrorContext, 'timestamp' | 'procedure'>
    ): never {
      const errorInfo = formatError(error);
      const fullContext: ErrorContext = {
        ...context,
        procedure: procedureName,
        timestamp: new Date().toISOString(),
      };

      logEntry({
        level: 'error',
        message: `Error in procedure "${procedureName}"`,
        context: fullContext,
        error: errorInfo,
      });

      // Re-throw with additional context
      throw new Error(
        `[${procedureName}] ${errorInfo.message}`
      );
    },

    /**
     * Log a warning
     */
    warn(
      message: string,
      context: Omit<ErrorContext, 'timestamp' | 'procedure'> = {}
    ): void {
      const fullContext: ErrorContext = {
        ...context,
        procedure: procedureName,
        timestamp: new Date().toISOString(),
      };

      logEntry({
        level: 'warn',
        message,
        context: fullContext,
      });
    },

    /**
     * Log info
     */
    info(
      message: string,
      context: Omit<ErrorContext, 'timestamp' | 'procedure'> = {}
    ): void {
      const fullContext: ErrorContext = {
        ...context,
        procedure: procedureName,
        timestamp: new Date().toISOString(),
      };

      logEntry({
        level: 'info',
        message,
        context: fullContext,
      });
    },

    /**
     * Log debug
     */
    debug(
      message: string,
      context: Omit<ErrorContext, 'timestamp' | 'procedure'> = {}
    ): void {
      const fullContext: ErrorContext = {
        ...context,
        procedure: procedureName,
        timestamp: new Date().toISOString(),
      };

      logEntry({
        level: 'debug',
        message,
        context: fullContext,
      });
    },
  };
}

/**
 * Wrap a procedure with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  procedureName: string,
  fn: T
): T {
  const handler = createProcedureErrorHandler(procedureName);

  return (async (...args: any[]) => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      handler.debug('Procedure started', { requestId });

      const result = await fn(...args);

      const duration = Date.now() - startTime;
      handler.info('Procedure completed successfully', { requestId, metadata: { duration } });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorInfo = formatError(error);

      logEntry({
        level: 'error',
        message: `Procedure failed: ${errorInfo.message}`,
        context: {
          procedure: procedureName,
          timestamp: new Date().toISOString(),
          requestId,
        },
        error: errorInfo,
      });

      throw error;
    }
  }) as T;
}

/**
 * Create a safe procedure wrapper that catches and logs errors
 */
export function createSafeProcedureWrapper<T extends (...args: any[]) => Promise<any>>(
  procedureName: string,
  fn: T,
  fallbackValue?: any
): T {
  const handler = createProcedureErrorHandler(procedureName);

  return (async (...args: any[]) => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      handler.debug('Procedure started', { requestId });

      const result = await fn(...args);

      const duration = Date.now() - startTime;
      handler.info('Procedure completed successfully', { requestId, metadata: { duration } });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorInfo = formatError(error);

      logEntry({
        level: 'error',
        message: `Procedure failed (caught): ${errorInfo.message}`,
        context: {
          procedure: procedureName,
          timestamp: new Date().toISOString(),
          requestId,
        },
        error: errorInfo,
      });

      // Return fallback value instead of throwing
      if (fallbackValue !== undefined) {
        handler.warn('Returning fallback value', { requestId });
        return fallbackValue;
      }

      throw error;
    }
  }) as T;
}

/**
 * Log database operation
 */
export function logDatabaseOperation(
  operation: string,
  table: string,
  duration: number,
  success: boolean,
  error?: Error
): void {
  const level = success ? 'info' : 'error';

  logEntry({
    level,
    message: `Database ${operation} on ${table}`,
    context: {
      timestamp: new Date().toISOString(),
      metadata: {
        operation,
        table,
        success,
      },
    },
    ...(error && { error: formatError(error) }),
    duration,
  });
}

/**
 * Log API call
 */
export function logApiCall(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  error?: Error
): void {
  const level = statusCode >= 400 ? 'warn' : 'info';

  logEntry({
    level,
    message: `API ${method} ${endpoint}`,
    context: {
      timestamp: new Date().toISOString(),
      metadata: {
        endpoint,
        method,
        statusCode,
      },
    },
    ...(error && { error: formatError(error) }),
    duration,
  });
}


/**
 * Validation utilities for data integrity
 */

/**
 * Validate CSV file before processing
 */
export function validateCSVFile(file: { size: number; name: string; type: string }): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum (50MB)`,
    };
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.csv')) {
    return {
      valid: false,
      error: 'File must be a CSV file (text/csv)',
    };
  }

  return { valid: true };
}

/**
 * Validate transaction data for integrity
 */
export function validateTransactionData(transaction: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!transaction.loopName || typeof transaction.loopName !== 'string' || transaction.loopName.trim().length === 0) {
    errors.push('Loop name is required');
  }

  if (!transaction.closingDate || isNaN(new Date(transaction.closingDate).getTime())) {
    errors.push('Valid closing date is required');
  }

  if (typeof transaction.salePrice !== 'number' || transaction.salePrice < 0) {
    errors.push('Sale price must be a non-negative number');
  }

  if (typeof transaction.commissionRate !== 'number' || transaction.commissionRate < 0 || transaction.commissionRate > 100) {
    errors.push('Commission rate must be between 0 and 100');
  }

  if (!transaction.agents || typeof transaction.agents !== 'string' || transaction.agents.trim().length === 0) {
    errors.push('At least one agent is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate commission calculation result (sanity checks)
 */
export function validateCommissionResult(result: any, salePrice: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof result.agentNetCommission !== 'number') {
    errors.push('Commission must be a number');
  } else if (isNaN(result.agentNetCommission)) {
    errors.push('Commission calculation resulted in invalid number (NaN)');
  } else if (result.agentNetCommission < 0) {
    errors.push('Commission cannot be negative');
  } else if (result.agentNetCommission > salePrice) {
    errors.push(`Commission ($${result.agentNetCommission}) exceeds sale price ($${salePrice})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate commission plan data
 */
export function validateCommissionPlan(plan: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!plan.name || typeof plan.name !== 'string') {
    errors.push('Plan name is required');
  }

  if (typeof plan.splitPercentage !== 'number' || plan.splitPercentage < 0 || plan.splitPercentage > 100) {
    errors.push('Split percentage must be between 0 and 100');
  }

  if (typeof plan.capAmount !== 'number' || plan.capAmount < 0) {
    errors.push('Cap amount must be non-negative');
  }

  if (plan.postCapSplit !== undefined && (typeof plan.postCapSplit !== 'number' || plan.postCapSplit < 0 || plan.postCapSplit > 100)) {
    errors.push('Post-cap split must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate agent assignment data
 */
export function validateAgentAssignment(assignment: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!assignment.agentName || typeof assignment.agentName !== 'string' || assignment.agentName.trim().length === 0) {
    errors.push('Agent name is required');
  }

  if (!assignment.planId || typeof assignment.planId !== 'string') {
    errors.push('Commission plan ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
