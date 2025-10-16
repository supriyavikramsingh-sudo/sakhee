/**
 * File Upload Component
 * Upload medical reports
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserProfileStore } from '../../store';
import apiClient from '../../services/apiClient';
import { Upload, File, X, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const FileUpload = ({ userId, onUploadComplete }) => {
  const { t } = useTranslation();
  const { profile } = useUserProfileStore();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please upload PDF, DOCX, or image files.');
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB.');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress (since we don't have real progress tracking)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await apiClient.uploadFile(file, userId);

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        if (response.success && response.data) {
          onUploadComplete(response.data);
        }
        setFile(null);
        setProgress(0);
      }, 500);
    } catch (err) {
      setError(err.message || 'Failed to upload file');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-bold text-lg mb-4">{t('reports.upload')}</h3>

      {/* File Input */}
      {!file && (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-surface rounded-lg p-8 text-center hover:border-primary transition">
            <Upload className="mx-auto mb-3 text-muted" size={48} />
            <p className="text-sm font-medium text-gray-700 mb-1">{t('reports.dropFile')}</p>
            <p className="text-xs text-muted">PDF, DOCX, JPEG, JPG, PNG (Max 10MB)</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.jpeg,.jpg,.png"
            onChange={handleFileSelect}
          />
        </label>
      )}

      {/* Selected File */}
      {file && !uploading && (
        <div className="border border-surface rounded-lg p-4">
          <div className="flex items-center gap-3">
            <File className="text-primary flex-shrink-0" size={32} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={handleRemove} className="p-2 hover:bg-surface rounded transition">
              <X size={20} />
            </button>
          </div>

          <button
            onClick={handleUpload}
            className="w-full mt-4 btn-primary flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            {t('reports.uploadAndAnalyze')}
          </button>
        </div>
      )}

      {/* Uploading */}
      {uploading && (
        <div className="border border-surface rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Loader className="animate-spin text-primary" size={24} />
            <div className="flex-1">
              <p className="font-medium text-sm">{t('reports.uploading')}</p>
              <p className="text-xs text-muted">{file.name}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted text-right mt-1">{progress}%</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-danger bg-opacity-10 border-l-4 border-danger rounded flex items-start gap-3">
          <AlertCircle className="text-danger flex-shrink-0" size={20} />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Success */}
      {progress === 100 && !uploading && (
        <div className="mt-4 p-4 bg-success bg-opacity-10 border-l-4 border-success rounded flex items-center gap-3">
          <CheckCircle className="text-success" size={20} />
          <p className="text-sm text-success font-medium">{t('reports.uploadSuccess')}</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
