import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    setupNodeEvents(on, config) {
      // Register custom tasks here
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
  },
  
  env: {
    // Sample PDF files for testing
    testPdfPath: 'cypress/fixtures/sample.pdf',
    testPdfPath2: 'cypress/fixtures/sample2.pdf',
    testPdfPathLarge: 'cypress/fixtures/large-sample.pdf',
  },
}); 