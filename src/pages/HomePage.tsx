import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addPDFFiles,
  removePDFFile,
  clearPDFFiles,
  updatePDFFile,
  setIsUploading,
  setUploadProgress,
  setIsMerging,
  setMergeProgress,
  setMergeError,
  setResultFile,
  clearResultFile,
  getPDFDataBuffer,
} from '../store/slices/pdfSlice';
import { v4 as uuidv4 } from 'uuid';
import {
  fileToArrayBuffer,
  generatePDFThumbnail,
  getPDFPageCount,
  createBlobUrl,
  formatFileSize,
  downloadBlob,
} from '../utils/pdfUtils';
import PDFFileList from '../components/PDFFileList';
import FileUploadArea from '../components/FileUploadArea';
import PDFDocumentPreview from '../components/PDFDocumentPreview';
import { Button, ProgressBar } from '../components/ui';
import Card from '../components/ui/Card';
import { useValidationNotifications } from '../services/notificationService';
import { usePDFWorker } from '../hooks/usePDFWorker';
import { RootState } from '../store';

// Helper function to clone ArrayBuffer (to avoid detached buffer errors)
const cloneArrayBuffer = (buffer: ArrayBuffer): ArrayBuffer => {
  const clone = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(clone).set(new Uint8Array(buffer));
  return clone;
};

const isBrowser = typeof window !== 'undefined';

const HomePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { files, isUploading, uploadProgress, isMerging, mergeProgress, mergeError, resultFile } =
    useAppSelector(state => state.pdf);
  const [error, setError] = useState<string | null>(null);
  const notifications = useValidationNotifications();
  const [retryingFileId, setRetryingFileId] = useState<string | null>(null);

  // Initialize PDF worker hook
  const pdfWorker = usePDFWorker();

  // Process uploaded files to generate thumbnails and get page counts
  useEffect(() => {
    const processPendingFiles = async () => {
      // Find files that are in 'loading' state and process them
      const pendingFiles = files.filter(file => file.status === 'loading');
      if (pendingFiles.length === 0) return;

      for (const file of pendingFiles) {
        try {
          const fileData = getPDFDataBuffer(file);
          if (!fileData) continue;

          // Make a copy of the ArrayBuffer to avoid detached buffer issues
          const fileDataCopy = cloneArrayBuffer(fileData);

          // Update file to show processing started
          dispatch(
            updatePDFFile({
              id: file.id,
              updates: {
                processingProgress: 20,
              },
            })
          );

          // Get page count
          const pageCount = await getPDFPageCount(fileDataCopy);

          // Update progress after page count is determined
          dispatch(
            updatePDFFile({
              id: file.id,
              updates: {
                processingProgress: 60,
                pageCount,
              },
            })
          );

          // Make another copy for thumbnail generation
          const thumbnailData = cloneArrayBuffer(fileData);

          // Generate thumbnail
          const thumbnail = await generatePDFThumbnail(thumbnailData);

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
      if (!fileToRetry) {
        notifications.showError('Cannot retry this file. File not found.', 'Retry Failed');
        return;
      }

      const fileData = getPDFDataBuffer(fileToRetry);
      if (!fileData) {
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

      notifications.showInfo(`Retrying ${fileToRetry.name}...`, 'Retrying File');
    },
    [files, dispatch, notifications]
  );

  // Handle clearing error files
  const handleClearErrorFiles = useCallback(() => {
    // Get IDs of error files
    const errorFileIds = files.filter(file => file.status === 'error').map(file => file.id);

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

  // Handle PDF combination
  const handleCombinePDFs = useCallback(() => {
    // Get selected files that are ready to be merged
    const filesToMerge = files.filter(file => file.status === 'ready' && file.selected);

    if (filesToMerge.length < 2) {
      notifications.showWarning(
        'You need at least 2 PDF files selected to combine.',
        'Not Enough Files'
      );
      return;
    }

    // Set merging state
    dispatch(setIsMerging(true));
    dispatch(setMergeError(null));
    dispatch(clearResultFile());
    dispatch(setMergeProgress(0));

    // Prepare files data for the worker
    const pdfFilesData = filesToMerge.map(file => {
      const fileData = getPDFDataBuffer(file);
      if (!fileData) {
        throw new Error(`File data missing for ${file.name}`);
      }

      // Clone the ArrayBuffer to prevent detached buffer issues
      const clonedData = cloneArrayBuffer(fileData);

      return {
        data: clonedData,
        name: file.name,
      };
    });

    // Handle errors from the worker operations
    const handleError = (error: any) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch(setMergeError(errorMessage));
      dispatch(setIsMerging(false));
      notifications.showError(`Error merging PDFs: ${errorMessage}`, 'Merge Failed');
    };

    try {
      // Use the PDF worker to merge files
      const cancelOperation = pdfWorker.mergePDFs(
        pdfFilesData,
        result => {
          try {
            // Handle successful merge
            // Create blob URL for the merged PDF
            const blobUrl = createBlobUrl(result.data);

            // Update Redux state with the result
            dispatch(
              setResultFile({
                url: blobUrl,
                name: result.name,
                size: result.size,
              })
            );

            // Reset merging state
            dispatch(setIsMerging(false));
            dispatch(setMergeProgress(100));

            // Show success notification
            notifications.showSuccess(
              `Successfully combined ${filesToMerge.length} PDFs into "${result.name}"`,
              'PDF Combination Complete'
            );
          } catch (error) {
            handleError(error);
          }
        },
        progress => {
          // Update merge progress
          dispatch(setMergeProgress(progress));
        }
      );

      // Return a cleanup function
      return () => {
        if (cancelOperation) {
          cancelOperation();
          dispatch(setIsMerging(false));
        }
      };
    } catch (error) {
      handleError(error);
    }
  }, [files, dispatch, notifications, pdfWorker]);

  // Handle removing a file
  const handleRemoveFile = useCallback(
    (id: string) => {
      const fileToRemove = files.find(file => file.id === id);

      // Remove the file from the Redux state
      dispatch(removePDFFile(id));

      if (fileToRemove) {
        notifications.showInfo(`Removed "${fileToRemove.name}".`, 'File Removed');
      }
    },
    [files, dispatch, notifications]
  );

  // Handle clearing all files
  const handleClearFiles = useCallback(() => {
    if (files.length === 0) return;

    // First revoke any blob URLs to prevent memory leaks
    if (resultFile.url) {
      URL.revokeObjectURL(resultFile.url);
    }

    // Clear all files from the Redux state
    dispatch(clearPDFFiles());

    notifications.showInfo(
      `Cleared ${files.length} file${files.length !== 1 ? 's' : ''}.`,
      'All Files Cleared'
    );
  }, [files, dispatch, notifications, resultFile.url]);

  // Render document preview section
  const renderDocumentPreview = useCallback(() => {
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
  }, [files, dispatch]);

  // Move the handleViewInNewTab function before resultFileContent
  const handleViewInNewTab = useCallback(() => {
    if (isBrowser && resultFile?.url) {
      window.open(resultFile.url, '_blank');
    }
  }, [resultFile?.url]);

  // Render result section
  const renderResultSection = useCallback(() => {
    if (!resultFile.url) return null;

    return (
      <Card className="mb-6" title="Merged PDF Result">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">{resultFile.name}</h3>
              <p className="text-sm text-gray-500">{formatFileSize(resultFile.size || 0)}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="primary"
                size="small"
                onClick={() => {
                  if (resultFile.url && resultFile.name) {
                    downloadBlob(resultFile.url, resultFile.name);
                    notifications.showSuccess(
                      `Started downloading "${resultFile.name}"`,
                      'Download Started'
                    );
                  }
                }}
              >
                Download
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  handleViewInNewTab();
                }}
              >
                Open
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={() => {
                  if (resultFile.url) {
                    URL.revokeObjectURL(resultFile.url);
                    dispatch(clearResultFile());
                  }
                }}
              >
                Clear
              </Button>
            </div>
          </div>
          {resultFile.url && (
            <div className="border rounded overflow-hidden h-64">
              <iframe src={resultFile.url} className="w-full h-full" title="PDF Preview" />
            </div>
          )}
        </div>
      </Card>
    );
  }, [resultFile, dispatch, notifications, handleViewInNewTab]);

  // Render merge progress
  const renderMergeProgress = useCallback(() => {
    if (!isMerging && !mergeError) return null;

    return (
      <Card className="mb-6" title={mergeError ? 'Error Merging PDFs' : 'Merging PDFs'}>
        <div className="space-y-2">
          {mergeError ? (
            <div className="text-red-600 p-2 bg-red-50 border border-red-200 rounded">
              <p className="font-medium">Error: {mergeError}</p>
              <p className="text-sm mt-1">
                Please check the PDF files and try again. If the issue persists, try with different
                files or smaller files.
              </p>
              <Button
                variant="primary"
                size="small"
                className="mt-2"
                onClick={() => dispatch(setMergeError(null))}
              >
                Dismiss
              </Button>
            </div>
          ) : (
            <>
              <ProgressBar value={mergeProgress} />
              <p className="text-sm text-gray-600">
                {mergeProgress < 100
                  ? `Merging PDFs: ${Math.round(mergeProgress)}%`
                  : 'Processing merged PDF...'}
              </p>
            </>
          )}
        </div>
      </Card>
    );
  }, [isMerging, mergeError, mergeProgress, dispatch]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any blob URLs when component unmounts
      if (resultFile.url) {
        URL.revokeObjectURL(resultFile.url);
      }
    };
  }, [resultFile.url]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">PDF Combiner</h1>

      <Card className="mb-6" title="Upload PDF Files">
        <FileUploadArea
          onFilesSelected={handleFileUpload}
          acceptedFileTypes=".pdf,application/pdf"
          maxFileSize={500 * 1024 * 1024} // 500MB
          isUploading={isUploading}
          disabled={isUploading || isMerging}
          multiple={true}
        />
      </Card>

      {/* Show merging progress */}
      {renderMergeProgress()}

      {/* Show result file if available */}
      {renderResultSection()}

      {files.length > 0 && (
        <Card
          className="mb-6"
          title="Uploaded Files"
          titleAction={
            <Button
              variant="secondary"
              size="small"
              onClick={handleClearFiles}
              disabled={isUploading || isMerging || files.length === 0}
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
            disabled={
              isUploading ||
              isMerging ||
              files.filter(file => file.status === 'ready' && file.selected).length < 2
            }
          >
            Combine PDFs
          </Button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
