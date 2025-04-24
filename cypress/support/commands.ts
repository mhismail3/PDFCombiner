// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// This function is called when a file is attached to a form element
Cypress.Commands.add('uploadPdf', (fileName: string) => {
  // Get the fixture file
  cy.fixture(fileName, 'binary')
    .then(Cypress.Blob.binaryStringToBlob)
    .then((fileContent) => {
      // Create a File object from the Blob
      const file = new File([fileContent], fileName, { type: 'application/pdf' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Find the file input and attach the file
      cy.get('input[type="file"]').first()
        .trigger('change', { 
          force: true,
          bubbles: true, 
          cancelable: true,
          dataTransfer 
        });
      
      // Wait for the file to be processed
      cy.wait(500); // Short wait for UI to update
      cy.contains('Processing').should('not.exist', { timeout: 10000 });
    });
});

// Command to select specific pages in a PDF
Cypress.Commands.add('selectPdfPages', (pageNumbers: number[]) => {
  // Wait for PDF previews to load
  cy.get('.pdf-page-thumbnail-container').should('be.visible');
  
  // Click on each page to select it
  pageNumbers.forEach(pageNumber => {
    cy.get(`.pdf-page-thumbnail-container:nth-child(${pageNumber})`)
      .click({ force: true });
      
    // Verify page is selected
    cy.get(`.pdf-page-thumbnail-container:nth-child(${pageNumber})`)
      .should('have.class', 'selected');
  });
});

// Command to combine PDFs
Cypress.Commands.add('combinePdfs', () => {
  cy.contains('button', 'Combine Selected PDFs').click();
  
  // Wait for the combine operation to complete
  cy.contains('Combining PDFs', { timeout: 10000 }).should('not.exist');
  cy.contains('Download Combined PDF').should('be.visible');
});

// Command to validate PDF metadata
Cypress.Commands.add('validatePdfMetadata', (metadata: { pageCount?: number, fileName?: string }) => {
  if (metadata.pageCount) {
    cy.contains(`${metadata.pageCount} pages`).should('be.visible');
  }
  
  if (metadata.fileName) {
    cy.contains(metadata.fileName).should('be.visible');
  }
}); 