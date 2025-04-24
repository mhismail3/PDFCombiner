// Import commands.js using ES2015 syntax:
import './commands';
import 'cypress-file-upload';

// Prevent TypeScript from showing error when Cypress adds cy.task
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to upload a PDF file
       * @example cy.uploadPdf('sample.pdf')
       */
      uploadPdf(fileName: string): Chainable<Element>;
      
      /**
       * Custom command to select specific pages in a PDF
       * @example cy.selectPdfPages([1, 3, 5])
       */
      selectPdfPages(pageNumbers: number[]): Chainable<Element>;
      
      /**
       * Custom command to combine selected PDFs
       * @example cy.combinePdfs()
       */
      combinePdfs(): Chainable<Element>;
      
      /**
       * Custom command to validate PDF metadata
       * @example cy.validatePdfMetadata({ pageCount: 5, fileName: 'test.pdf' })
       */
      validatePdfMetadata(metadata: { pageCount?: number, fileName?: string }): Chainable<Element>;
      
      /**
       * Custom command to attach a file
       * @example cy.get('input[type="file"]').attachFile('example.pdf')
       */
      attachFile(filePath: string, options?: AttachFileOptions): Chainable<Element>;
    }

    interface AttachFileOptions {
      subjectType?: string;
      force?: boolean;
      allowEmpty?: boolean;
      encoding?: string;
      filePath?: string;
    }
  }
} 