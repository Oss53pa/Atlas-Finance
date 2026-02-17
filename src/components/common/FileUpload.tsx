import React, { useRef, useState } from 'react';
import { Upload, FileUp, X } from 'lucide-react';
import { Button } from '../ui';
import { toast } from 'react-hot-toast';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  onFilesSelect: (files: File[]) => void;
  maxSize?: number; // en MB
  className?: string;
  showPreview?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '.csv,.xlsx,.xls,.json,.xml',
  multiple = true,
  onFilesSelect,
  maxSize = 10,
  className = '',
  showPreview = true
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const filesArray = Array.from(files);
    const validFiles: File[] = [];

    filesArray.forEach(file => {
      // Vérifier la taille
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`${file.name} dépasse la taille maximale de ${maxSize}MB`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setSelectedFiles(multiple ? [...selectedFiles, ...validFiles] : validFiles);
      onFilesSelect(multiple ? [...selectedFiles, ...validFiles] : validFiles);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-[var(--color-info)] bg-[var(--color-info-light)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-info)]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <FileUp className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
          Glissez vos fichiers ici ou
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          className="hidden"
          onChange={handleInputChange}
          accept={accept}
        />
        <Button
          variant="outline"
          className="mb-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Parcourir les fichiers
        </Button>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Formats supportés: {accept.replace(/\./g, '').toUpperCase()}
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Taille max: {maxSize}MB
        </p>
      </div>

      {showPreview && selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Fichiers sélectionnés:</h4>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-[var(--color-surface-hover)] rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
