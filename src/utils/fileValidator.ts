/**
 * File validation utilities for ensuring uploaded files meet requirements
 */
import { validatePDFContent, isPDFPasswordProtected, formatFileSize } from './pdfUtils';

export interface ValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  details?: Record<string, unknown>; // Additional details about the validation
}

export class FileValidator {
  /**
   * The maximum file size (500MB by default)
   */
  static readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB in bytes

  /**
   * Common file size limits for reference (in bytes)
   */
  static readonly SIZE_LIMITS = {
    SMALL: 5 * 1024 * 1024, // 5MB
    MEDIUM: 25 * 1024 * 1024, // 25MB
    LARGE: 100 * 1024 * 1024, // 100MB
    VERY_LARGE: 250 * 1024 * 1024, // 250MB
    MAX: 500 * 1024 * 1024, // 500MB
  };

  /**
   * Validate that a file is a PDF document
   * Checks both file extension and MIME type
   */
  static validateFileType(file: File): ValidationResult {
    // Check MIME type
    if (file.type !== 'application/pdf') {
      return {
        isValid: false,
        errorCode: 'INVALID_FILE_TYPE',
        errorMessage: `File "${file.name}" is not a PDF. Only PDF files are accepted.`,
      };
    }

    // Check file extension
    const fileNameParts = file.name.split('.');
    const extension =
      fileNameParts.length > 1 ? fileNameParts[fileNameParts.length - 1].toLowerCase() : '';

    if (extension !== 'pdf') {
      return {
        isValid: false,
        errorCode: 'INVALID_FILE_EXTENSION',
        errorMessage: `File "${file.name}" does not have a .pdf extension. Only PDF files are accepted.`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate file size against a maximum size limit
   * Returns detailed information about the file size and how it compares to the limit
   */
  static validateFileSize(
    file: File,
    maxSize: number = this.MAX_FILE_SIZE
  ): ValidationResult {
    if (file.size > maxSize) {
      // Create a human-readable size representation for better user feedback
      const fileSizeFormatted = formatFileSize(file.size);
      const maxSizeFormatted = formatFileSize(maxSize);
      const overageBytes = file.size - maxSize;
      const overageFormatted = formatFileSize(overageBytes);
      const overagePercentage = Math.round((overageBytes / maxSize) * 100);

      return {
        isValid: false,
        errorCode: 'FILE_TOO_LARGE',
        errorMessage: `File "${file.name}" (${fileSizeFormatted}) exceeds the maximum size limit of ${maxSizeFormatted}.`,
        details: {
          fileName: file.name,
          fileSize: file.size,
          maxSize: maxSize,
          overage: overageBytes,
          overageFormatted,
          overagePercentage,
          fileSizeFormatted,
          maxSizeFormatted,
        },
      };
    }

    // File is within size limits
    const sizeCategory = this.getFileSizeCategory(file.size);
    const fileSizeFormatted = formatFileSize(file.size);
    const percentOfLimit = Math.round((file.size / maxSize) * 100);

    return {
      isValid: true,
      details: {
        fileName: file.name,
        fileSize: file.size,
        fileSizeFormatted,
        percentOfLimit,
        sizeCategory,
      },
    };
  }

  /**
   * Categorize a file size into a descriptive category
   */
  static getFileSizeCategory(sizeInBytes: number): string {
    const { SMALL, MEDIUM, LARGE, VERY_LARGE, MAX } = this.SIZE_LIMITS;

    if (sizeInBytes <= SMALL) return 'small';
    if (sizeInBytes <= MEDIUM) return 'medium';
    if (sizeInBytes <= LARGE) return 'large';
    if (sizeInBytes <= VERY_LARGE) return 'very_large';
    if (sizeInBytes <= MAX) return 'maximum';
    return 'exceeds_limit';
  }

  /**
   * Validate file integrity by attempting to read a portion of the file
   * This can catch corrupted PDF files or non-PDF files with PDF extension
   */
  static async validateFileIntegrity(file: File): Promise<ValidationResult> {
    try {
      // Read the first 5 bytes of the file to check for PDF signature
      const slice = file.slice(0, 5);
      const buffer = await slice.arrayBuffer();
      const signature = new Uint8Array(buffer);

      // PDF files start with "%PDF-"
      const isPDF =
        signature[0] === 0x25 && // %
        signature[1] === 0x50 && // P
        signature[2] === 0x44 && // D
        signature[3] === 0x46 && // F
        signature[4] === 0x2d; // -

      if (!isPDF) {
        return {
          isValid: false,
          errorCode: 'INVALID_PDF_SIGNATURE',
          errorMessage: `File "${file.name}" does not appear to be a valid PDF document.`,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errorCode: 'FILE_READ_ERROR',
        errorMessage: `Error reading file "${file.name}". The file may be corrupted.`,
      };
    }
  }

  /**
   * Performs a deeper PDF validation by checking for both signature and PDF structure markers
   * This catches files that have the correct signature but are not valid PDFs
   */
  static async validateDeepPDFDetection(file: File): Promise<ValidationResult> {
    try {
      // For small files, we can read the entire file
      // For larger files, read just enough to check header and verify key structural elements
      const bytesToRead = Math.min(file.size, 8192); // Read up to 8KB
      const slice = file.slice(0, bytesToRead);
      const buffer = await slice.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Check for PDF signature (%PDF-)
      if (!(
        bytes[0] === 0x25 && // %
        bytes[1] === 0x50 && // P
        bytes[2] === 0x44 && // D
        bytes[3] === 0x46 && // F
        bytes[4] === 0x2d    // -
      )) {
        return {
          isValid: false,
          errorCode: 'INVALID_PDF_SIGNATURE',
          errorMessage: `File "${file.name}" does not have a valid PDF signature.`,
        };
      }
      
      // Convert bytes to string for text-based checks
      const headerText = new TextDecoder().decode(bytes);
      
      // Check for key PDF structural markers
      const hasVersionMarker = /^%PDF-\d+\.\d+/.test(headerText);
      const hasObjectMarker = /\d+\s+\d+\s+obj/.test(headerText);
      const hasXrefMarker = /xref/.test(headerText) || /\/Root/.test(headerText);
      
      // If the PDF has the signature but is missing other key structural elements
      if (!hasVersionMarker || (!hasObjectMarker && !hasXrefMarker)) {
        return {
          isValid: false,
          errorCode: 'INVALID_PDF_STRUCTURE',
          errorMessage: `File "${file.name}" has a PDF signature but appears to be malformed.`,
        };
      }
      
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errorCode: 'FILE_READ_ERROR',
        errorMessage: `Error validating PDF structure for "${file.name}". The file may be corrupted.`,
      };
    }
  }

  /**
   * Check if the PDF is password protected
   */
  static async validateNotPasswordProtected(file: File): Promise<ValidationResult> {
    try {
      const buffer = await file.arrayBuffer();
      const isProtected = await isPDFPasswordProtected(buffer);

      if (isProtected) {
        return {
          isValid: false,
          errorCode: 'PASSWORD_PROTECTED',
          errorMessage: `File "${file.name}" is password protected. Please remove the password protection before uploading.`,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errorCode: 'FILE_READ_ERROR',
        errorMessage: `Error reading file "${file.name}". The file may be corrupted.`,
      };
    }
  }

  /**
   * Validate the content of a PDF file to ensure it can be processed
   */
  static async validatePDFContent(file: File): Promise<ValidationResult> {
    try {
      const buffer = await file.arrayBuffer();
      return await validatePDFContent(buffer);
    } catch (error) {
      return {
        isValid: false,
        errorCode: 'FILE_READ_ERROR',
        errorMessage: `Error validating content of "${file.name}". The file may be corrupted.`,
      };
    }
  }

  /**
   * Run all PDF validation checks
   */
  static async validatePdfFile(
    file: File,
    maxSize: number = this.MAX_FILE_SIZE
  ): Promise<ValidationResult> {
    // First check file size
    const sizeResult = this.validateFileSize(file, maxSize);
    if (!sizeResult.isValid) {
      return sizeResult;
    }

    // Then check basic file type
    const typeResult = this.validateFileType(file);
    if (!typeResult.isValid) {
      return typeResult;
    }

    // Then check PDF signature and structure
    const integrityResult = await this.validateDeepPDFDetection(file);
    if (!integrityResult.isValid) {
      return integrityResult;
    }

    // Check if password protected
    const passwordResult = await this.validateNotPasswordProtected(file);
    if (!passwordResult.isValid) {
      return passwordResult;
    }

    // Finally validate PDF content
    return await this.validatePDFContent(file);
  }
}
