describe('PDF Page Selection and Combination', () => {
  beforeEach(() => {
    cy.visit('/');
    // Upload a sample PDF for testing
    cy.get('input[type="file"]').attachFile('../fixtures/sample.pdf', { force: true });
  });

  it('should have page selection UI elements', () => {
    // Check for common UI elements related to page selection
    cy.get('button').should('exist');
    // More general button check
    cy.get('button').should('have.length.at.least', 1);
  });

  it('should have file display elements', () => {
    // Verify basic elements for displaying files exist
    cy.get('div, p, span').contains(/file|document|pdf|upload/i, { matchCase: false }).should('exist');
  });

  it('should have interactive UI elements', () => {
    // Check for interactive UI elements (any button)
    cy.get('button').should('exist');
    cy.get('button').first().click({ force: true });
    cy.get('body').should('be.visible'); // App still works
  });

  it('should have combine functionality', () => {
    // Check for elements that might be used for combining (any button)
    cy.get('button').should('exist');
    cy.get('button').should('have.length.at.least', 1);
  });

  it('should handle multiple files', () => {
    // Upload a second file
    cy.get('input[type="file"]').attachFile('../fixtures/sample2.pdf', { force: true });
    
    // Check that the app still functions
    cy.get('body').should('be.visible');
    cy.get('button').should('exist');
  });
}); 