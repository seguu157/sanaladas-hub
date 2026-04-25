import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onWebhookUpload: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onWebhookUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setUploadError(null);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (!pdfFile) {
      setUploadError('Por favor, sube solo archivos PDF');
      return;
    }

    if (pdfFile.size > 10 * 1024 * 1024) { // 10MB limit
      setUploadError('El archivo es demasiado grande. Máximo 10MB');
      return;
    }

    onWebhookUpload(pdfFile);
  }, [onWebhookUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Por favor, sube solo archivos PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande. Máximo 10MB');
      return;
    }

    onWebhookUpload(file);
  }, [onWebhookUpload]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-6 sm:p-12 text-center transition-all duration-300
          ${isDragOver
            ? 'border-blue-400 bg-blue-50 scale-105'
            : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50'
          }
          ${uploadError ? 'border-red-400 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4 sm:space-y-6">
          <div className={`mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-colors ${
            uploadError ? 'bg-red-100' :
            isDragOver ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            {uploadError ? (
              <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
            ) : (
              <Upload className={`h-8 w-8 sm:h-10 sm:w-10 ${isDragOver ? 'text-blue-500' : 'text-slate-400'}`} />
            )}
          </div>
          
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">
              {uploadError ? 'Error al subir archivo' : 'Sube tu PDF de catering'}
            </h3>
            <p className={`text-sm sm:text-base ${uploadError ? 'text-red-600' : 'text-slate-500'} px-2`}>
              {uploadError || 'Arrastra y suelta tu archivo aquí o haz clic para seleccionar'}
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
            <FileText className="h-4 w-4" />
            <span>Solo archivos PDF • Máximo 10MB • Procesamiento automático</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;