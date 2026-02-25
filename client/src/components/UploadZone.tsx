/**
 * UploadZone Component
 * Drag-and-drop area for CSV file uploads with visual feedback
 * Redesigned with a modern, exciting real estate theme
 */

import { useState, useRef } from 'react';
import { Upload, CheckCircle, FileSpreadsheet, ArrowRight, Play, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { validateFile, formatBytes, estimateProcessingTime } from '@/lib/fileValidation';

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  onDemoClick?: () => void;
  isLoading?: boolean;
  onValidationError?: (error: string) => void;
}

export default function UploadZone({ onFileUpload, onDemoClick, isLoading = false, onValidationError }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileValidation = async (file: File) => {
    setIsValidating(true);
    setValidationError(null);
    
    try {
      const result = validateFile(file, { maxSizeBytes: 50 * 1024 * 1024 });
      
      if (!result.valid) {
        const errorMsg = result.errors.join('; ');
        setValidationError(errorMsg);
        onValidationError?.(errorMsg);
        setIsValidating(false);
        return;
      }
      
      setFileName(file.name);
      setValidationError(null);
      onFileUpload(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate file';
      setValidationError(errorMessage);
      onValidationError?.(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileValidation(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileValidation(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-2xl shadow-2xl">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url("https://files.manuscdn.com/user_upload_by_module/session_file/310519663283621115/SFhnYZOwluOkhsOj.jpg")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/70 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 p-8 md:p-16 flex flex-col items-center text-center">
        <div className="mb-8 space-y-4 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight drop-shadow-lg">
            Transform Your Data into <span className="text-emerald-400">Actionable Insights</span>
          </h2>
          <p className="text-lg text-slate-200 font-light leading-relaxed">
            Upload your Dotloop export to instantly generate professional commission reports, agent leaderboards, and financial analytics.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />
        
        {validationError && (
          <Card className="w-full max-w-xl p-6 mb-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">Upload Failed</h4>
                <p className="text-sm text-red-800 dark:text-red-200">{validationError}</p>
              </div>
            </div>
          </Card>
        )}
        
        <Card
          className={`w-full max-w-xl p-10 border-2 border-dashed transition-all duration-300 cursor-pointer group backdrop-blur-sm ${
            isDragActive
              ? 'border-emerald-400 bg-emerald-500/10 scale-105 shadow-[0_0_30px_rgba(52,211,153,0.3)]'
              : 'border-white/20 bg-white/5 hover:border-emerald-400/50 hover:bg-white/10 hover:shadow-xl'
          }`}
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-6">
            {isValidating ? (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Validating Your File...
                  </h3>
                  <p className="text-slate-300">
                    Checking file size and format
                  </p>
                </div>
              </>
            ) : isLoading ? (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Analyzing Your Data...
                  </h3>
                  <p className="text-slate-300">
                    Crunching the numbers to build your dashboard
                  </p>
                </div>
              </>
            ) : fileName ? (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center ring-4 ring-emerald-500/10 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Upload Complete!
                  </h3>
                  <p className="text-emerald-300 font-medium bg-emerald-500/10 px-4 py-1 rounded-full inline-block">
                    {fileName}
                  </p>
                  <p className="text-slate-300 pt-2">
                    Scroll down to explore your interactive report
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center ring-4 ring-white/5 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:ring-emerald-500/10 transition-all duration-300">
                  <Upload className="w-10 h-10 text-white group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-white">
                    Drop your CSV file here
                  </h3>
                  <p className="text-slate-300">
                    or click to browse your computer
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <Button 
                    size="lg" 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300 font-semibold text-lg px-8 py-6 h-auto"
                  >
                    <span className="flex items-center gap-2">
                      Select File <ArrowRight className="w-5 h-5" />
                    </span>
                  </Button>
                  
                  {onDemoClick && (
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDemoClick();
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 backdrop-blur-sm transition-all duration-300 font-semibold text-lg px-8 py-6 h-auto"
                    >
                      <span className="flex items-center gap-2">
                        <Play className="w-5 h-5 fill-current" />
                        Try Demo
                      </span>
                    </Button>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-4 font-medium tracking-wide uppercase space-y-2">
                  <p>Supports Dotloop Broker Exports</p>
                  <p className="text-slate-500 normal-case text-[11px]">Maximum file size: 50MB</p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
