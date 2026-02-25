/**
 * FileUploadInput Component
 * Provides client-side file validation with user-friendly feedback
 */

import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  validateFile,
  getFileValidationErrorMessage,
  getFileValidationWarningMessage,
  formatBytes,
  estimateProcessingTime,
  isLikelyCSV,
} from '@/lib/fileValidation';

export interface FileUploadInputProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  disabled?: boolean;
  maxSizeBytes?: number;
  acceptedFileTypes?: string;
}

export const FileUploadInput: React.FC<FileUploadInputProps> = ({
  onFileSelect,
  isLoading = false,
  disabled = false,
  maxSizeBytes = 50 * 1024 * 1024,
  acceptedFileTypes = '.csv',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    setSelectedFile(file);

    try {
      // Validate file
      const result = {
        ...validateFile(file, { maxSizeBytes }),
        isLikelyCSV: await isLikelyCSV(file),
      };

      setValidationResult(result);

      // If valid, call the callback
      if (result.valid && result.isLikelyCSV) {
        onFileSelect(file);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileChange(file || null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setSelectedFile(null);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isValid = validationResult?.valid && validationResult?.isLikelyCSV;
  const hasWarnings = validationResult?.warnings && validationResult.warnings.length > 0;
  const hasErrors = validationResult?.errors && validationResult.errors.length > 0;

  return (
    <div className="w-full space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        onChange={handleInputChange}
        disabled={disabled || isLoading}
        className="hidden"
        aria-label="Upload CSV file"
      />

      {/* File upload area */}
      {!selectedFile ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging ? 'border-primary bg-primary/5 scale-105' : 'border-border hover:border-primary/50'}
            ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex flex-col items-center gap-3">
            <FileUp className="w-10 h-10 text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">
                {isLoading ? 'Processing...' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                CSV files up to {formatBytes(maxSizeBytes)}
              </p>
            </div>
            {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* File info */}
          <div className="border border-border rounded-lg p-4 bg-card/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{selectedFile.name}</p>
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <p>Size: {formatBytes(selectedFile.size)}</p>
                  {isValid && (
                    <p>Estimated processing time: {estimateProcessingTime(selectedFile.size)}</p>
                  )}
                </div>
              </div>
              <div>
                {isValidating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : hasErrors ? (
                  <XCircle className="w-5 h-5 text-destructive" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
            </div>
          </div>

          {/* Validation errors */}
          {hasErrors && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">
                {getFileValidationErrorMessage(validationResult)}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation warnings */}
          {hasWarnings && !hasErrors && (
            <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/5">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                {getFileValidationWarningMessage(validationResult)}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation success */}
          {isValid && (
            <Alert className="border-green-500/50 bg-green-500/5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                File is ready to upload. Click "Upload" to proceed.
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleClick}
              disabled={disabled || isLoading || !isValid}
              variant={isValid ? 'default' : 'outline'}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 mr-2" />
                  Change File
                </>
              )}
            </Button>
            <Button onClick={handleClear} variant="outline" disabled={isLoading}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadInput;
