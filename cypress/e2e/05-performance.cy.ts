import { createEntriesReport } from '../support/performance-utils';

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    cy.visit('/');
    // Clear performance entries before each test
    cy.window().then(win => {
      win.performance.clearMarks();
      win.performance.clearMeasures();
    });
  });

  it('Homepage should load within 3 seconds', () => {
    cy.measurePerformance('homepage-load', () => {
      cy.visit('/');
      cy.get('input[type="file"]').should('exist');
    }, 3000);
  });

  it('DOM interactions should be responsive', () => {
    cy.measurePerformance('dom-interaction', () => {
      cy.get('button').first().click({ force: true });
      // Use force:true since file inputs are often hidden
      cy.get('input[type="file"]').click({ force: true });
    }, 1000);
  });

  it('UI rendering should be efficient', () => {
    cy.measurePerformance('ui-rendering', () => {
      cy.get('body').should('be.visible');
      cy.get('button').should('exist');
    }, 1000);
  });

  it('File upload mechanism should initialize quickly', () => {
    cy.measurePerformance('file-upload-init', () => {
      cy.get('input[type="file"]').should('exist');
    }, 1000);
  });

  it('Memory usage should be reasonable during page load', () => {
    cy.monitorMemory(() => {
      cy.reload();
      cy.get('body').should('be.visible');
    }, 100); // Maximum 100MB of memory usage for page load
  });

  afterEach(() => {
    // Generate performance report after each test
    const testTitle = Cypress.currentTest.title;
    createEntriesReport(testTitle);
  });
}); 