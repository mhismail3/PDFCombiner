import React, { useCallback, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addPDFFiles,
  removePDFFile,
  clearPDFFiles,
  updatePDFFile,
  setIsUploading,
  setUploadProgress,
} from '../store/slices/pdfSlice';
import { v4 as uuidv4 } from 'uuid';
import { fileToArrayBuffer, generatePDFThumbnail, getPDFPageCount } from '../utils/pdfUtils';
import PDFFileList from '../components/PDFFileList';
import FileUploadArea from '../components/FileUploadArea';
import { Button, ProgressBar } from '../components/ui';
import Card from '../components/ui/Card';
import { useValidationNotifications } from '../services/notificationService';

const HomePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { files, isUploading, uploadProgress } = useAppSelector(state => state.pdf);
  const [error, setError] = useState<string | null>(null);
  const notifications = useValidationNotifications();
  const [retryingFileId, setRetryingFileId] = useState<string | null>(null);

  // Process uploaded files to generate thumbnails and get page counts
  useEffect(() => {
    const processPendingFiles = async () => {
      const pendingFiles = files.filter(file => file.status === 'loading');

      if (pendingFiles.length === 0) return;

      for (const file of pendingFiles) {
        try {
          if (!file.data) continue;

          // Get page count
          const pageCount = await getPDFPageCount(file.data);

          // Generate thumbnail
          const thumbnail = await generatePDFThumbnail(file.data);

          // Update file with thumbnail and page count
          dispatch(
            updatePDFFile({
              id: file.id,
              updates: {
                preview: thumbnail,
                pageCount,
                status: 'ready',
              },
            })
          );
        } catch (err) {
          // Log error details without using console.log directly
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          
          dispatch(
            updatePDFFile({
              id: file.id,
              updates: {
                status: 'error',
                error: errorMessage,
              },
            })
          );

          // Only show notification if it's not during a retry operation
          if (file.id !== retryingFileId) {
            notifications.showError(
              `Error processing ${file.name}: ${errorMessage}`,
              'File Processing Error'
            );
          }
        }
      }

      // Reset retrying state when processing is complete
      setRetryingFileId(null);
    };

    processPendingFiles();
  }, [files, dispatch, notifications, retryingFileId]);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (uploadedFiles: FileList) => {
      if (uploadedFiles.length === 0) return;

      try {
        // Set uploading state
        dispatch(setIsUploading(true));

        // Process each PDF file
        const totalFiles = uploadedFiles.length;
        const newFiles = [];

        for (let i = 0; i < totalFiles; i++) {
          const file = uploadedFiles[i];

          // Update progress
          dispatch(setUploadProgress(Math.round((i / totalFiles) * 100)));

          // Read file as array buffer
          const arrayBuffer = await fileToArrayBuffer(file);

          newFiles.push({
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            data: arrayBuffer,
            preview: null, // We'll generate thumbnails in the useEffect
            pageCount: 0, // We'll get this from PDF.js in the useEffect
            status: 'loading' as const,
          });
        }

        // Complete upload
        dispatch(setUploadProgress(100));
        dispatch(addPDFFiles(newFiles));
        dispatch(setIsUploading(false));
        setError(null);

        // Notification is now handled by the FileUploadArea component
      } catch (err) {
        dispatch(setIsUploading(false));
        setError('Error processing PDF files. Please try again.');
        
        const errorMessage = err instanceof Error ? err.message : String(err);
        notifications.showError('Error processing PDF files. Please try again.', 'Upload Error');
      }
    },
    [dispatch, notifications]
  );

  // Handle retrying a failed file
  const handleRetryFile = useCallback(
    (id: string) => {
      const fileToRetry = files.find(file => file.id === id);
      if (!fileToRetry || !fileToRetry.data) {
        notifications.showError(
          'Cannot retry this file. The file data is missing.',
          'Retry Failed'
        );
        return;
      }

      // Set retrying state to avoid duplicate error notifications
      setRetryingFileId(id);

      // Update file status to loading
      dispatch(
        updatePDFFile({
          id,
          updates: {
            status: 'loading',
            error: undefined,
          },
        })
      );

      notifications.showInfo(
        `Retrying ${fileToRetry.name}...`,
        'Retrying File'
      );
    },
    [files, dispatch, notifications]
  );

  // Handle clearing error files
  const handleClearErrorFiles = useCallback(() => {
    // Get IDs of error files
    const errorFileIds = files
      .filter(file => file.status === 'error')
      .map(file => file.id);

    // Remove each error file
    errorFileIds.forEach(id => {
      dispatch(removePDFFile(id));
    });

    if (errorFileIds.length > 0) {
      notifications.showInfo(
        `Removed ${errorFileIds.length} file${errorFileIds.length !== 1 ? 's' : ''} with errors.`,
        'Cleared Errors'
      );
    }
  }, [files, dispatch, notifications]);

  // Handle PDF combination (placeholder)
  const handleCombinePDFs = () => {
    // This will be implemented when we integrate PDF-lib.js
    notifications.showInfo(
      'PDF combination functionality will be implemented in a future task.',
      'Coming Soon'
    );
  };

  // Handle removing a file
  const handleRemoveFile = useCallback(
    (id: string) => {
      const fileToRemove = files.find(file => file.id === id);
      dispatch(removePDFFile(id));
      
      if (fileToRemove) {
        notifications.showInfo(
          `Removed "${fileToRemove.name}".`,
          'File Removed'
        );
      }
    },
    [files, dispatch, notifications]
  );

  // Handle clearing all files
  const handleClearAllFiles = useCallback(() => {
    if (files.length === 0) return;
    
    dispatch(clearPDFFiles());
    notifications.showInfo(
      `Cleared ${files.length} file${files.length !== 1 ? 's' : ''}.`,
      'All Files Cleared'
    );
  }, [files, dispatch, notifications]);

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4 dark:text-white">Welcome to PDF Combiner</h2>
      <p className="mb-6 dark:text-gray-300">
        Upload your PDF files to combine them into a single document.
      </p>

      {/* Error message */}
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* File upload card */}
      <Card className="mb-8">
        <FileUploadArea
          onFilesSelected={handleFileUpload}
          acceptedFileTypes="application/pdf"
          multiple={true}
          isUploading={isUploading}
          disabled={isUploading}
        />

        {isUploading && (
          <div className="mt-4">
            <ProgressBar
              value={uploadProgress}
              max={100}
              size="sm"
              showValue
              label="Uploading files..."
            />
          </div>
        )}

        {files.length === 0 && !isUploading && (
          <div className="mt-4 text-gray-500 dark:text-gray-400">
            <p>Uploaded PDF files will appear here</p>
          </div>
        )}
      </Card>

      {/* PDF File List Component */}
      {files.length > 0 && (
        <Card 
          title="Uploaded Files" 
          className="mb-4"
          titleAction={
            files.some(file => file.status === 'error') ? (
              <Button 
                variant="text" 
                size="small" 
                onClick={handleClearErrorFiles} 
                className="text-red-600 dark:text-red-400"
              >
                Clear Errors
              </Button>
            ) : undefined
          }
        >
          <PDFFileList
            files={files}
            onRemove={handleRemoveFile}
            onRetry={handleRetryFile}
            onClearAll={handleClearAllFiles}
            onClearErrors={handleClearErrorFiles}
            onCombine={handleCombinePDFs}
          />
        </Card>
      )}
      
      {/* Help text for handling errors */}
      {files.some(file => file.status === 'error') && (
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">Troubleshooting Tips</h3>
          <ul className="list-disc list-inside space-y-1 text-left">
            <li>Make sure your PDF files are not password protected</li>
            <li>Try a different PDF file if a specific file consistently fails</li>
            <li>PDF files should be valid and not corrupted</li>
            <li>Files must be under 500MB in size</li>
            <li>Use the "Retry" button to attempt processing the file again</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default HomePage;
