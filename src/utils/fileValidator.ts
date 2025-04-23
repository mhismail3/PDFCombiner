/**
 * File validation utilities for ensuring uploaded files meet requirements
 */
import { validatePDFContent, isPDFPasswordProtected } from './pdfUtils';

export interface ValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export class FileValidator {
  /**
   * The maximum file size (500MB by default)
   */
  static readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB in bytes

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
   * Validate file size
   */
  static validateFileSize(file: File, maxSize: number = this.MAX_FILE_SIZE): ValidationResult {
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return {
        isValid: false,
        errorCode: 'FILE_TOO_LARGE',
        errorMessage: `File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${maxSizeMB}MB.`,
      };
    }
    return { isValid: true };
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

    // Then check PDF signature
    const integrityResult = await this.validateFileIntegrity(file);
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
