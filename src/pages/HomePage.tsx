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
import PDFDocumentPreview from '../components/PDFDocumentPreview';
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

          // Update file to show processing started
          dispatch(
            updatePDFFile({
              id: file.id,
              updates: {
                processingProgress: 10,
              },
            })
          );

          // Get page count
          const pageCount = await getPDFPageCount(file.data);
          
          // Update progress after page count is determined
          dispatch(
            updatePDFFile({
              id: file.id,
              updates: {
                processingProgress: 50,
                pageCount,
              },
            })
          );

          // Generate thumbnail
          const thumbnail = await generatePDFThumbnail(file.data);

          // Update progress after thumbnail is generated
          dispatch(
            updatePDFFile({
              id: file.id,
              updates: {
                processingProgress: 90,
              },
            })
          );

          // Short delay to show the progress completing
          setTimeout(() => {
            // Update file with thumbnail and page count
            dispatch(
              updatePDFFile({
                id: file.id,
                updates: {
                  preview: thumbnail,
                  pageCount,
                  status: 'ready',
                  processingProgress: 100,
                },
              })
            );
          }, 300);
        } catch (err) {
          // Log error details without using console.log directly
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          
          dispatch(
            updatePDFFile({
              id: file.id,
              updates: {
                status: 'error',
                error: errorMessage,
                processingProgress: 0,
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
            selected: true, // Default to selected
            processingProgress: 0, // Start at 0% progress
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
  const handleClearFiles = useCallback(() => {
    if (files.length === 0) return;
    
    dispatch(clearPDFFiles());
    notifications.showInfo(
      `Cleared ${files.length} file${files.length !== 1 ? 's' : ''}.`,
      'All Files Cleared'
    );
  }, [files, dispatch, notifications]);

  // Render document preview section
  const renderDocumentPreview = () => {
    const readyFiles = files.filter(file => file.status === 'ready');
    
    if (readyFiles.length === 0) return null;
    
    return (
      <Card className="mb-6" title="Document Preview">
        <PDFDocumentPreview 
          pdfFiles={readyFiles}
          onFileSelect={(fileId, selected) => {
            dispatch(
              updatePDFFile({
                id: fileId,
                updates: {
                  selected,
                },
              })
            );
          }}
          selectedFiles={readyFiles.filter(f => f.selected).map(f => f.id)}
        />
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">PDF Combiner</h1>
      
      <Card className="mb-6" title="Upload PDF Files">
        <FileUploadArea 
          onFilesSelected={handleFileUpload}
          acceptedFileTypes=".pdf,application/pdf"
          maxFileSize={500 * 1024 * 1024} // 500MB
          isUploading={isUploading}
          disabled={isUploading}
          multiple={true}
        />
      </Card>
      
      {files.length > 0 && (
        <Card 
          className="mb-6" 
          title="Uploaded Files"
          titleAction={
            <Button 
              variant="secondary" 
              size="small" 
              onClick={handleClearFiles}
              disabled={isUploading || files.length === 0}
            >
              Clear All
            </Button>
          }
        >
          <PDFFileList 
            files={files}
            onRemove={handleRemoveFile}
            onRetry={handleRetryFile}
            onClearAll={handleClearFiles}
            onCombine={handleCombinePDFs}
          />
        </Card>
      )}
      
      {/* Add the document preview section */}
      {renderDocumentPreview()}
      
      {files.filter(file => file.status === 'ready' && file.selected).length > 0 && (
        <div className="flex justify-center">
          <Button 
            variant="primary" 
            size="large" 
            onClick={handleCombinePDFs}
            disabled={isUploading || files.filter(file => file.status === 'ready' && file.selected).length === 0}
          >
            Combine PDFs
          </Button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
