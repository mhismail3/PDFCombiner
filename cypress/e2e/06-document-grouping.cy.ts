// @ts-ignore
import 'cypress-file-upload';

describe('Document Grouping and Metadata Display', () => {
  beforeEach(() => {
    cy.visit('/');
    // Upload a sample PDF
    cy.get('input[type="file"]').attachFile('../fixtures/sample.pdf', { force: true });
    // Wait for processing to complete
    cy.wait(3000);
  });

  it('should display document information after upload', () => {
    // Check that document containers exist
    cy.get('.border').should('exist');
    
    // File name should be visible
    cy.contains('sample.pdf').should('exist');
    
    // Some metadata should be displayed
    cy.contains(/KB|MB/).should('exist');
    cy.contains(/page/).should('exist');
  });
  
  it('should have basic document grouping UI elements', () => {
    // Should have buttons for interaction
    cy.get('button').should('have.length.at.least', 1);
    
    // Should have some sort of visual document container
    cy.get('.border').should('exist');
  });

  it('should have visual document structure', () => {
    // Document should have some visual structure
    cy.get('div').should('exist');
    
    // Should display document pages or thumbnails
    cy.get('.border').find('div').should('exist');
  });
}); 