/**
 * Utility functions for performance testing in Cypress
 */

/**
 * Measures the time taken for an operation and validates against a threshold
 * @param startMarkName - Name for the performance start mark
 * @param endMarkName - Name for the performance end mark
 * @param measureName - Name for the performance measure
 * @param operation - Function that performs the operation to measure
 * @param thresholdMs - Maximum acceptable duration in milliseconds
 */
export const measureOperation = (
  startMarkName: string,
  endMarkName: string, 
  measureName: string,
  operation: () => void,
  thresholdMs: number
): Cypress.Chainable => {
  return cy.window().then(win => {
    // Set start mark
    win.performance.mark(startMarkName);
    
    // Execute the operation
    operation();
    
    // Return a chainable that sets the end mark and measures
    return cy.window().then(win => {
      win.performance.mark(endMarkName);
      win.performance.measure(measureName, startMarkName, endMarkName);
      
      const measure = win.performance.getEntriesByName(measureName)[0];
      expect(measure.duration).to.be.lessThan(thresholdMs);
      
      return cy.wrap(measure.duration);
    });
  });
};

/**
 * Monitors memory usage during an operation
 * @param operation - Function that performs the operation to monitor
 * @param thresholdMb - Maximum acceptable memory usage in MB
 */
export const monitorMemoryUsage = (
  operation: () => void,
  thresholdMb: number
): Cypress.Chainable => {
  return cy.window().then(win => {
    // Check if memory API is available
    if (!win.performance.memory) {
      cy.log('Memory API not available - skipping memory test');
      return cy.wrap(null);
    }
    
    // Get initial memory usage
    const initialMemory = win.performance.memory.usedJSHeapSize;
    
    // Execute the operation
    operation();
    
    // Return a chainable that checks the memory usage
    return cy.window().then(win => {
      const finalMemory = win.performance.memory.usedJSHeapSize;
      const memoryUsed = (finalMemory - initialMemory) / (1024 * 1024); // Convert to MB
      
      cy.log(`Memory used: ${memoryUsed.toFixed(2)} MB`);
      expect(memoryUsed).to.be.lessThan(thresholdMb);
      
      return cy.wrap(memoryUsed);
    });
  });
};

/**
 * Creates a performance report with timing information
 * @param testName - Name of the test for reporting
 * @param measures - Array of performance mark names to report
 */
export const createPerformanceReport = (
  testName: string,
  measures: string[]
): Cypress.Chainable => {
  return cy.window().then(win => {
    const report = {
      test: testName,
      timestamp: new Date().toISOString(),
      measures: {} as Record<string, number>
    };
    
    measures.forEach(measureName => {
      const entries = win.performance.getEntriesByName(measureName);
      if (entries.length > 0) {
        report.measures[measureName] = entries[0].duration;
      }
    });
    
    cy.log(`Performance Report for ${testName}`);
    cy.log(JSON.stringify(report, null, 2));
    
    return cy.wrap(report);
  });
};

/**
 * Creates a performance report based on collected performance entries
 * @param title Title of the test for the report
 */
export function createEntriesReport(title: string): void {
  cy.window().then((win) => {
    if (!win.performanceEntries) {
      cy.log('No performance entries found');
      return;
    }
    
    const entries = win.performanceEntries;
    const totalTests = entries.length;
    const passedTests = entries.filter(entry => entry.passed).length;
    
    cy.log(`Performance Report for: ${title}`);
    cy.log(`Tests: ${passedTests}/${totalTests} passed`);
    
    entries.forEach(entry => {
      const status = entry.passed ? '✅' : '❌';
      cy.log(`${status} ${entry.name}: ${entry.duration.toFixed(2)}ms (threshold: ${entry.threshold}ms)`);
    });
    
    // Clear entries for next test
    win.performanceEntries = [];
  });
}

// Clear performance entries before tests
export function clearPerformanceEntries(): void {
  cy.window().then((win) => {
    win.performanceEntries = [];
  });
}

// Add the types to the global Cypress namespace
declare global {
  interface Window {
    performanceEntries?: Array<{
      name: string;
      duration: number;
      threshold: number;
      passed: boolean;
    }>;
    
    performance: Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
  }
  
  namespace Cypress {
    interface Chainable {
      /**
       * Measures performance of an operation and validates against threshold
       */
      measurePerformance(
        name: string, 
        operation: () => void, 
        thresholdMs: number
      ): Chainable<number>;
      
      /**
       * Monitors memory usage during an operation
       */
      monitorMemory(
        operation: () => void, 
        thresholdMb: number
      ): Chainable<number | null>;
    }
  }
}

// Register custom commands
Cypress.Commands.add('measurePerformance', (name: string, operation: () => void, thresholdMs: number) => {
  // First record for custom reporting
  const startTime = performance.now();
  operation();
  const endTime = performance.now();
  const duration = endTime - startTime;

  cy.log(`${name}: ${duration.toFixed(2)}ms`);
  expect(duration).to.be.lessThan(
    thresholdMs,
    `${name} should complete within ${thresholdMs}ms but took ${duration.toFixed(2)}ms`
  );
  
  // Add to performance entries for reporting
  cy.window().then((win) => {
    const entry = {
      name,
      duration,
      threshold: thresholdMs,
      passed: duration < thresholdMs
    };
    
    if (!win.performanceEntries) {
      win.performanceEntries = [];
    }
    
    win.performanceEntries.push(entry);
  });
  
  // Also use the performance API measurement for more accurate metrics
  return measureOperation(
    `${name}-start`,
    `${name}-end`,
    name,
    () => {}, // Operation already executed above
    thresholdMs
  );
});

Cypress.Commands.add('monitorMemory', (operation: () => void, thresholdMb: number) => {
  return monitorMemoryUsage(operation, thresholdMb);
}); 