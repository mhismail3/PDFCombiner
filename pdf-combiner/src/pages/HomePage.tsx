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
import { showNotification } from '../store/slices/uiSlice';
import { v4 as uuidv4 } from 'uuid';
import {
  isPdfFile,
  fileToArrayBuffer,
  generatePDFThumbnail,
  getPDFPageCount,
} from '../utils/pdfUtils';
import PDFFileList from '../components/PDFFileList';
import FileUploadArea from '../components/FileUploadArea';
import { Card, Button, ProgressBar } from '../components/ui';

const HomePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { files, isUploading, uploadProgress } = useAppSelector(state => state.pdf);
  const [error, setError] = useState<string | null>(null);

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
          console.error(`Error processing file ${file.name}:`, err);
          dispatch(
            updatePDFFile({
              id: file.id,
              updates: {
                status: 'error',
                error: err instanceof Error ? err.message : 'Unknown error',
              },
            })
          );

          dispatch(
            showNotification({
              message: `Error processing ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`,
              type: 'error',
            })
          );
        }
      }
    };

    processPendingFiles();
  }, [files, dispatch]);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (uploadedFiles: FileList) => {
      if (uploadedFiles.length === 0) return;

      // Filter for PDF files
      const pdfFiles = Array.from(uploadedFiles).filter(isPdfFile);

      if (pdfFiles.length === 0) {
        setError('Please upload only PDF files.');
        dispatch(
          showNotification({
            message: 'Please upload only PDF files.',
            type: 'error',
          })
        );
        return;
      }

      try {
        // Set uploading state
        dispatch(setIsUploading(true));

        // Process each PDF file
        const totalFiles = pdfFiles.length;
        const newFiles = [];

        for (let i = 0; i < totalFiles; i++) {
          const file = pdfFiles[i];

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

        // Show success notification
        dispatch(
          showNotification({
            message: `Successfully uploaded ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}.`,
            type: 'success',
          })
        );
      } catch (err) {
        dispatch(setIsUploading(false));
        setError('Error processing PDF files. Please try again.');
        dispatch(
          showNotification({
            message: 'Error processing PDF files. Please try again.',
            type: 'error',
          })
        );
        console.error('Error uploading files:', err);
      }
    },
    [dispatch]
  );

  // Handle PDF combination (placeholder)
  const handleCombinePDFs = () => {
    // This will be implemented when we integrate PDF-lib.js
    dispatch(
      showNotification({
        message: 'PDF combination functionality will be implemented in a future task.',
        type: 'info',
      })
    );
  };

  // Handle removing a file
  const handleRemoveFile = useCallback(
    (id: string) => {
      dispatch(removePDFFile(id));
      dispatch(
        showNotification({
          message: 'File removed successfully.',
          type: 'info',
        })
      );
    },
    [dispatch]
  );

  // Handle clearing all files
  const handleClearAllFiles = useCallback(() => {
    dispatch(clearPDFFiles());
    dispatch(
      showNotification({
        message: 'All files cleared successfully.',
        type: 'info',
      })
    );
  }, [dispatch]);

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
        <Card title="Uploaded Files" className="mb-4">
          <PDFFileList
            files={files}
            onRemove={handleRemoveFile}
            onClearAll={handleClearAllFiles}
            onCombine={handleCombinePDFs}
          />

          <div className="mt-4 flex justify-end">
            <Button variant="danger" onClick={handleClearAllFiles} className="mr-2">
              Clear All
            </Button>
            <Button
              variant="success"
              onClick={handleCombinePDFs}
              disabled={files.length < 2 || files.some(file => file.status === 'loading')}
            >
              Combine PDFs
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default HomePage;
