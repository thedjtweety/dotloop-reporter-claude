/**
 * Client-Side File Validation
 * Validates files before upload to reduce server load and improve UX
 */

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

const DEFAULT_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  allowedExtensions: ['.csv'],
};

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate single file
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = DEFAULT_OPTIONS
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file exists
  if (!file) {
    return {
      valid: false,
      errors: ['No file provided'],
    };
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    errors.push('File name is required');
  }

  // Check file size
  const maxSize = options.maxSizeBytes || DEFAULT_OPTIONS.maxSizeBytes!;
  if (file.size > maxSize) {
    errors.push(
      `File size (${formatBytes(file.size)}) exceeds maximum (${formatBytes(maxSize)})`
    );
  }

  // Warn if file is very small (might be empty or corrupted)
  if (file.size < 100) {
    warnings.push('File is very small. It may be empty or corrupted.');
  }

  // Check file type
  const allowedTypes = options.allowedTypes || DEFAULT_OPTIONS.allowedTypes!;
  const allowedExtensions = options.allowedExtensions || DEFAULT_OPTIONS.allowedExtensions!;

  const hasValidType = allowedTypes.includes(file.type);
  const hasValidExtension = allowedExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidType && !hasValidExtension) {
    errors.push(
      `File type not supported. Please upload a CSV file. (Detected: ${file.type || 'unknown'})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  options: FileValidationOptions = DEFAULT_OPTIONS
): FileValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  if (!files || files.length === 0) {
    return {
      valid: false,
      errors: ['No files provided'],
    };
  }

  files.forEach((file, index) => {
    const result = validateFile(file, options);
    if (!result.valid) {
      result.errors.forEach(error => {
        allErrors.push(`File ${index + 1} (${file.name}): ${error}`);
      });
    }
    if (result.warnings) {
      result.warnings.forEach(warning => {
        allWarnings.push(`File ${index + 1} (${file.name}): ${warning}`);
      });
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
  };
}

/**
 * Get file validation error message for UI
 */
export function getFileValidationErrorMessage(result: FileValidationResult): string {
  if (result.valid) {
    return '';
  }

  if (result.errors.length === 1) {
    return result.errors[0];
  }

  return `${result.errors.length} validation errors:\n${result.errors.map(e => `• ${e}`).join('\n')}`;
}

/**
 * Get file validation warning message for UI
 */
export function getFileValidationWarningMessage(result: FileValidationResult): string {
  if (!result.warnings || result.warnings.length === 0) {
    return '';
  }

  if (result.warnings.length === 1) {
    return result.warnings[0];
  }

  return `${result.warnings.length} warnings:\n${result.warnings.map(w => `• ${w}`).join('\n')}`;
}

/**
 * Check if file is likely a CSV based on content
 */
export async function isLikelyCSV(file: File): Promise<boolean> {
  try {
    // Read first 1KB to check for CSV-like content
    const chunk = await file.slice(0, 1024).text();
    
    // CSV files typically have commas or tabs
    const hasCommas = chunk.includes(',');
    const hasTabs = chunk.includes('\t');
    const hasNewlines = chunk.includes('\n');
    
    return (hasCommas || hasTabs) && hasNewlines;
  } catch {
    return false;
  }
}

/**
 * Get estimated processing time based on file size
 */
export function estimateProcessingTime(fileSizeBytes: number): string {
  // Rough estimate: 1MB takes ~1 second
  const estimatedSeconds = Math.ceil(fileSizeBytes / (1024 * 1024));
  
  if (estimatedSeconds < 1) {
    return 'Less than 1 second';
  } else if (estimatedSeconds < 60) {
    return `About ${estimatedSeconds} second${estimatedSeconds > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.ceil(estimatedSeconds / 60);
    return `About ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}
