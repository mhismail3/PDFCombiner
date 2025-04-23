import * as pdfjs from 'pdfjs-dist';

// Define types for page extraction
export interface PDFPageData {
  pageNumber: number;
  dimensions: {
    width: number;
    height: number;
  };
  textContent?: string;
  metadata?: Record<string, any>;
}

export interface PDFDocumentInfo {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
}

// Define interface for PDF metadata info
interface PDFMetadataInfo {
  Title?: string;
  Author?: string;
  Subject?: string;
  Keywords?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  [key: string]: any;
}

/**
 * Extract information about a PDF document
 */
export const extractPDFInfo = async (
  document: pdfjs.PDFDocumentProxy
): Promise<PDFDocumentInfo> => {
  try {
    // Get metadata
    const metadata = await document.getMetadata();
    const info = metadata.info as PDFMetadataInfo || {};
    
    // Get page count
    const pageCount = document.numPages;
    
    // Parse dates if they exist
    let creationDate: Date | undefined;
    let modificationDate: Date | undefined;
    
    if (info.CreationDate) {
      try {
        // PDF dates format: D:YYYYMMDDHHmmSSOHH'mm'
        creationDate = new Date(info.CreationDate);
      } catch (e) {
        console.warn('Could not parse creation date:', e);
      }
    }
    
    if (info.ModDate) {
      try {
        modificationDate = new Date(info.ModDate);
      } catch (e) {
        console.warn('Could not parse modification date:', e);
      }
    }
    
    return {
      title: info.Title,
      author: info.Author,
      subject: info.Subject,
      keywords: info.Keywords,
      creator: info.Creator,
      producer: info.Producer,
      creationDate,
      modificationDate,
      pageCount
    };
  } catch (error) {
    console.error('Error extracting PDF info:', error);
    throw new Error(`Failed to extract PDF info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract data from a specific PDF page
 */
export const extractPageData = async (
  document: pdfjs.PDFDocumentProxy,
  pageNumber: number,
  includeTextContent: boolean = false
): Promise<PDFPageData> => {
  try {
    // Get the page
    const page = await document.getPage(pageNumber);
    
    // Get viewport to determine dimensions
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Initialize page data
    const pageData: PDFPageData = {
      pageNumber,
      dimensions: {
        width: viewport.width,
        height: viewport.height
      }
    };
    
    // Extract text content if requested
    if (includeTextContent) {
      const textContent = await page.getTextContent();
      let fullText = '';
      
      // Combine text items with spaces
      for (const item of textContent.items) {
        if ('str' in item) {
          fullText += item.str + ' ';
        }
      }
      
      pageData.textContent = fullText.trim();
    }
    
    return pageData;
  } catch (error) {
    console.error(`Error extracting data from page ${pageNumber}:`, error);
    throw new Error(`Failed to extract page data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract data from all pages in a PDF document
 */
export const extractAllPagesData = async (
  document: pdfjs.PDFDocumentProxy,
  includeTextContent: boolean = false,
  progressCallback?: (current: number, total: number) => void
): Promise<PDFPageData[]> => {
  try {
    const pageCount = document.numPages;
    const pagesData: PDFPageData[] = [];
    
    for (let i = 1; i <= pageCount; i++) {
      // Extract data for this page
      const pageData = await extractPageData(document, i, includeTextContent);
      pagesData.push(pageData);
      
      // Report progress
      if (progressCallback) {
        progressCallback(i, pageCount);
      }
    }
    
    return pagesData;
  } catch (error) {
    console.error('Error extracting all pages data:', error);
    throw new Error(`Failed to extract all pages data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Analyze text content of a PDF page to determine its type or category
 * This is a basic implementation that can be expanded with more sophisticated analysis
 */
export const analyzePDFPageContent = (pageData: PDFPageData): string => {
  if (!pageData.textContent) {
    return 'unknown';
  }
  
  const text = pageData.textContent.toLowerCase();
  
  // Check for common page types
  if (text.includes('table of contents') || text.includes('toc')) {
    return 'table-of-contents';
  } else if (text.includes('chapter') && pageData.pageNumber < 20) {
    return 'chapter-start';
  } else if (text.includes('reference') || text.includes('bibliography')) {
    return 'references';
  } else if (text.includes('appendix')) {
    return 'appendix';
  } else if (text.includes('index') && pageData.pageNumber > 20) {
    return 'index';
  } else if (pageData.textContent.length < 50 && pageData.pageNumber === 1) {
    return 'cover';
  }
  
  return 'content';
}; 