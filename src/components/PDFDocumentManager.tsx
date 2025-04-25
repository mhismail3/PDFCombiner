import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { PDFFile, removePDFFile } from '../store/slices/pdfSlice';
import PDFViewer from './PDFViewer';
import PDFProgressiveView from './PDFProgressiveView';
import Button from './ui/Button';
import PDFThumbnailGrid from './PDFThumbnailGrid';
import { pdfThumbnailService } from '../services/PDFThumbnailService';

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────
interface PDFDocumentManagerProps {
  pdfData?: ArrayBuffer;
  fileName?: string;
  onPagesSelected?: (selectedPages: number[]) => void;
  className?: string;
  initialSelectedPages?: number[];
}

interface SelectedPagesState {
  [fileId: string]: number[];
}

// ────────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────────
const PDFDocumentManager: React.FC<PDFDocumentManagerProps> = ({
  pdfData,
  fileName = '',
  onPagesSelected,
  className = '',
  initialSelectedPages = []
}) => {
  const dispatch = useDispatch();
  const { files } = useSelector((state: RootState) => state.pdf);

  // ───── Local state ───────────────────────────────────────────────────────────
  const [selectedPages, setSelectedPages] = useState<SelectedPagesState>({});
  const [currentPdfIndex, setCurrentPdfIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [useProgressiveLoading, setUseProgressiveLoading] = useState<boolean>(false);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [localSelectedPages, setLocalSelectedPages] = useState<number[]>([]);
  const [isContentVisible, setIsContentVisible] = useState<boolean>(false);

  const [standaloneFile, setStandaloneFile] = useState<PDFFile | null>(
    pdfData
      ? {
          id: fileName || 'standalone-pdf',
          name: fileName || 'document.pdf',
          size: pdfData.byteLength,
          type: 'application/pdf',
          lastModified: Date.now(),
          data: pdfData,
          preview: null,
          pageCount: 0,
          selected: true,
          status: 'ready'
        }
      : null
  );

  // ───── Derived values ────────────────────────────────────────────────────────
  const isStandaloneMode = !!pdfData;

  const currentPdf = useMemo(() => {
    return isStandaloneMode
      ? standaloneFile
      : currentPdfIndex !== null && files.length > currentPdfIndex
      ? files[currentPdfIndex]
      : null;
  }, [isStandaloneMode, standaloneFile, currentPdfIndex, files]);

  const memoizedSelectedPages = useMemo(() => {
    return currentPdf ? selectedPages[currentPdf.id] || [] : [];
  }, [currentPdf?.id, selectedPages]);

  // Using ref ensures we never create a brand-new ArrayBuffer on each render
  const pdfDataRef = useRef<ArrayBuffer | null>(null);

  // ──────────────────────────────────────────────────────────────────────────────
  // Effects
  // ──────────────────────────────────────────────────────────────────────────────
  // 1️⃣ Initialize standalone file & initial selection
  useEffect(() => {
    if (isStandaloneMode && pdfData) {
      setStandaloneFile(prevState => {
        // Only update if the file has changed (based on content length or name)
        const fileChanged = 
          !prevState || 
          prevState.size !== pdfData.byteLength || 
          prevState.name !== fileName;
          
        if (!fileChanged) return prevState;
        
        return {
          id: 'standalone',
          name: fileName,
          data: pdfData,
          size: pdfData.byteLength,
          type: 'application/pdf',
          lastModified: Date.now(),
          preview: null,
          pageCount: 0,
          selected: true,
          status: 'ready'
        };
      });

      if (initialSelectedPages.length) {
        setSelectedPages(prevState => {
          if (JSON.stringify(prevState['standalone']) === JSON.stringify(initialSelectedPages)) {
            return prevState;
          }
          return { ...prevState, standalone: initialSelectedPages };
        });
      }
    }
  }, [isStandaloneMode, pdfData?.byteLength, fileName, initialSelectedPages]);

  // 2️⃣ Keep the current index valid (Redux mode only)
  useEffect(() => {
    if (isStandaloneMode) return;

    if (files.length && currentPdfIndex === null) {
      setCurrentPdfIndex(0);
    } else if (!files.length) {
      setCurrentPdfIndex(null);
    } else if (
      currentPdfIndex !== null &&
      currentPdfIndex >= files.length
    ) {
      setCurrentPdfIndex(files.length - 1);
    }
  }, [files.length, currentPdfIndex, isStandaloneMode]);

  // 3️⃣ Decide when to use progressive loading (guarded setter ⇒ avoids loop)
  useEffect(() => {
    const computeShouldUseProgressive = (): boolean => {
      if (isStandaloneMode && standaloneFile) {
        return standaloneFile.size > 5 * 1024 * 1024;
      }
      const f = currentPdfIndex !== null && files.length > currentPdfIndex ? files[currentPdfIndex] : undefined;
      return !f
        ? false
        : f.size > 5 * 1024 * 1024 || (f.pageCount ?? 0) > 50;
    };

    setUseProgressiveLoading(prev => {
      const next = computeShouldUseProgressive();
      return prev === next ? prev : next;
    });
  }, [isStandaloneMode, standaloneFile?.size, files, currentPdfIndex]);

  // 4️⃣ Keep a stable ref to the PDF data
  useEffect(() => {
    if (currentPdf?.data) {
      pdfDataRef.current = currentPdf.data;
    }
  }, [currentPdf?.id]);
  
  // 5️⃣ Get page count for the current PDF
  useEffect(() => {
    const fetchPageCount = async () => {
      if (!pdfDataRef.current) return;
      
      try {
        const count = await pdfThumbnailService.getPageCount(pdfDataRef.current);
        setPdfPageCount(count);
        
        // Also update the file object if we're in standalone mode
        if (isStandaloneMode && standaloneFile && standaloneFile.pageCount !== count) {
          setStandaloneFile(prev => prev ? { ...prev, pageCount: count } : null);
        }
      } catch (error) {
        console.error('Error getting page count:', error);
      }
    };
    
    fetchPageCount();
  }, [currentPdf?.id]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────────────
  const handleSelectFile = useCallback(
    (index: number) => {
      if (!isStandaloneMode) {
        setCurrentPdfIndex(index);
        setPreviewMode(false);
      }
    },
    [isStandaloneMode]
  );

  const handlePreview = useCallback((pageNumber: number) => {
    setPreviewPage(pageNumber);
    setPreviewMode(true);
  }, []);

  const handleExitPreview = useCallback(() => setPreviewMode(false), []);

  const updateSelectedPages = useCallback((fileId: string, pages: number[]) => {
    setSelectedPages(prev => ({
      ...prev,
      [fileId]: pages
    }));

    if (isStandaloneMode && fileId === 'standalone' && onPagesSelected) {
      onPagesSelected(pages);
    }
  }, [isStandaloneMode, onPagesSelected]);

  const handlePageToggle = useCallback(
    (file: PDFFile, pageNumber: number, selected: boolean) => {
      const current = selectedPages[file.id] || [];
      const next = selected
        ? [...current, pageNumber]
        : current.filter(p => p !== pageNumber);

      updateSelectedPages(file.id, next.sort((a, b) => a - b));
    },
    [selectedPages, updateSelectedPages]
  );

  const handleSelectAllPages = useCallback((file: PDFFile) => {
    const actualPageCount = file.pageCount || pdfPageCount;
    if (actualPageCount) {
      const all = Array.from({ length: actualPageCount }, (_, i) => i + 1);
      updateSelectedPages(file.id, all);
    }
  }, [updateSelectedPages, pdfPageCount]);

  const handleDeselectAllPages = useCallback((file: PDFFile) => {
    updateSelectedPages(file.id, []);
  }, [updateSelectedPages]);

  const handleRemovePDF = useCallback((fileId: string) => {
    if (!isStandaloneMode) {
      dispatch(removePDFFile(fileId));
      setSelectedPages(prev => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
    }
  }, [dispatch, isStandaloneMode]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Rendering helpers
  // ──────────────────────────────────────────────────────────────────────────────
  const renderContent = useCallback(() => {
    if (!currentPdf || !pdfDataRef.current) {
      return (
        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
          No PDF selected or data unavailable
        </div>
      );
    }

    const pdfData = pdfDataRef.current;
    const actualPageCount = currentPdf.pageCount || pdfPageCount;

    if (previewMode) {
      return <PDFViewer pdfData={pdfData} className="h-full" />;
    }

    if (useProgressiveLoading) {
      return (
        <div className="relative h-full">
          <PDFProgressiveView
            pdfData={pdfData}
            fileName={currentPdf.name}
            thumbnailWidth={150}
            className="h-full"
            selectedPages={memoizedSelectedPages}
            onPageSelect={(pageNumber, selected) => {
              handlePageToggle(currentPdf, pageNumber, selected);
            }}
            onPreview={handlePreview}
          />
        </div>
      );
    }

    // Use the new PDFThumbnailGrid for regular (non-progressive) rendering
    return (
      <div className="relative h-full overflow-auto p-4" style={{ maxHeight: '65vh' }}>
        <PDFThumbnailGrid
          pdfData={pdfData}
          pageCount={actualPageCount}
          thumbnailWidth={150}
          selectedPages={memoizedSelectedPages}
          onPageSelect={(pageNumber, selected) => {
            handlePageToggle(currentPdf, pageNumber, selected);
          }}
          onPagePreview={handlePreview}
          className="mb-4"
        />
      </div>
    );
  }, [
    currentPdf, 
    handlePageToggle, 
    handlePreview, 
    memoizedSelectedPages, 
    pdfPageCount, 
    previewMode, 
    useProgressiveLoading
  ]);

  // ──────────────────────────────────────────────────────────────────────────────
  // JSX
  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {!isStandaloneMode && (
        <div className="border-b dark:border-gray-700 p-2 overflow-x-auto">
          <div className="flex space-x-2">
            {files.map((file, index) => (
              <button
                key={file.id}
                onClick={() => handleSelectFile(index)}
                className={`px-3 py-1 text-sm truncate max-w-xs rounded ${
                  currentPdfIndex === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {currentPdf ? (
          <div className="h-full flex flex-col">
            {/* ─── Actions bar ─────────────────────────────────────────────── */}
            <div className="p-2 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{currentPdf.name}</span>
                {(currentPdf.pageCount || pdfPageCount) ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {currentPdf.pageCount || pdfPageCount} pages
                  </span>
                ) : null}
              </div>

              <div className="flex space-x-2">
                {!previewMode && (
                  <>
                    <Button size="small" variant="secondary" onClick={() => handleSelectAllPages(currentPdf)}>
                      Select All
                    </Button>
                    <Button size="small" variant="secondary" onClick={() => handleDeselectAllPages(currentPdf)}>
                      Deselect All
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setUseProgressiveLoading(p => !p)}
                    >
                      {useProgressiveLoading ? 'Standard View' : 'Progressive View'}
                    </Button>
                  </>
                )}

                {previewMode && (
                  <Button size="small" variant="secondary" onClick={handleExitPreview}>
                    Back to Thumbnails
                  </Button>
                )}

                {!isStandaloneMode && (
                  <Button size="small" variant="danger" onClick={() => handleRemovePDF(currentPdf.id)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* ─── Document area ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">{renderContent()}</div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            No PDF selected
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFDocumentManager;
