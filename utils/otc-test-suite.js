/**
 * AI Candle Sniper - OTC Test Suite
 * 
 * Comprehensive testing system for OTC mode:
 * - Tests all OTC components
 * - Validates data flow
 * - Ensures error handling works
 * - Provides performance metrics
 */

class OTCTestSuite {
  constructor() {
    this.testResults = [];
    this.testStats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    
    this.testData = {
      validOTCData: {
        asset: 'EUR/USD (OTC)',
        timeframe: '5M',
        candles: [
          { timestamp: 1640995200000, open: 1.1300, high: 1.1320, low: 1.1290, close: 1.1310, volume: 1000 },
          { timestamp: 1640995500000, open: 1.1310, high: 1.1330, low: 1.1300, close: 1.1315, volume: 1200 },
          { timestamp: 1640995800000, open: 1.1315, high: 1.1325, low: 1.1305, close: 1.1320, volume: 800 }
        ],
        timestamp: Date.now(),
        broker: 'Test Broker',
        isOTC: true
      },
      
      invalidOTCData: {
        asset: '',
        timeframe: 'INVALID',
        candles: [
          { timestamp: 'invalid', open: 'invalid', high: 1.1320, low: 1.1290, close: 1.1310 }
        ],
        timestamp: Date.now(),
        broker: 'Test Broker',
        isOTC: true
      },
      
      malformedOTCData: {
        // Missing required fields
        candles: null
      }
    };
  }
  
  /**
   * Run all OTC tests
   * @returns {Promise<Object>} - Test results
   */
  async runAllTests() {
    console.log('[OTC Test Suite] Starting comprehensive OTC tests...');
    
    this.resetTestStats();
    
    try {
      // Component tests
      await this.testDataValidator();
      await this.testErrorHandler();
      await this.testOTCHandler();
      await this.testExtractors();
      
      // Integration tests
      await this.testDataFlow();
      await this.testErrorRecovery();
      await this.testPerformance();
      
      // Browser compatibility tests
      await this.testBrowserCompatibility();
      
      console.log('[OTC Test Suite] All tests completed');
      return this.getTestSummary();
    } catch (error) {
      console.error('[OTC Test Suite] Error running tests:', error);
      this.addTestResult('Test Suite Error', false, error.message);
      return this.getTestSummary();
    }
  }
  
  /**
   * Test data validator
   */
  async testDataValidator() {
    console.log('[OTC Test Suite] Testing data validator...');
    
    try {
      // Test 1: Valid data validation
      if (window.otcDataValidator) {
        const validResult = window.otcDataValidator.validateOTCData(this.testData.validOTCData);
        this.addTestResult(
          'Data Validator - Valid Data',
          validResult.isValid && validResult.cleanedData !== null,
          validResult.isValid ? 'Valid data passed validation' : `Validation failed: ${validResult.errors.join(', ')}`
        );
        
        // Test 2: Invalid data validation
        const invalidResult = window.otcDataValidator.validateOTCData(this.testData.invalidOTCData);
        this.addTestResult(
          'Data Validator - Invalid Data',
          !invalidResult.isValid && invalidResult.errors.length > 0,
          !invalidResult.isValid ? 'Invalid data correctly rejected' : 'Invalid data incorrectly accepted'
        );
        
        // Test 3: Malformed data validation
        const malformedResult = window.otcDataValidator.validateOTCData(this.testData.malformedOTCData);
        this.addTestResult(
          'Data Validator - Malformed Data',
          !malformedResult.isValid && malformedResult.errors.length > 0,
          !malformedResult.isValid ? 'Malformed data correctly rejected' : 'Malformed data incorrectly accepted'
        );
        
        // Test 4: Statistics
        const stats = window.otcDataValidator.getValidationStats();
        this.addTestResult(
          'Data Validator - Statistics',
          typeof stats === 'object' && stats.totalValidated >= 0,
          'Statistics retrieved successfully'
        );
      } else {
        this.addTestResult('Data Validator - Availability', false, 'Data validator not available');
      }
    } catch (error) {
      this.addTestResult('Data Validator - Error', false, error.message);
    }
  }
  
  /**
   * Test error handler
   */
  async testErrorHandler() {
    console.log('[OTC Test Suite] Testing error handler...');
    
    try {
      if (window.otcErrorHandler) {
        // Test 1: Error handling
        const testError = new Error('Test error');
        const handled = await window.otcErrorHandler.handleError(testError, 'SYSTEM', { test: true });
        this.addTestResult(
          'Error Handler - Basic Error Handling',
          typeof handled === 'boolean',
          'Error handling completed'
        );
        
        // Test 2: Error statistics
        const stats = window.otcErrorHandler.getErrorStats();
        this.addTestResult(
          'Error Handler - Statistics',
          typeof stats === 'object' && stats.total >= 0,
          'Error statistics retrieved successfully'
        );
        
        // Test 3: Recent errors
        const recentErrors = window.otcErrorHandler.getRecentErrors(5);
        this.addTestResult(
          'Error Handler - Recent Errors',
          Array.isArray(recentErrors),
          'Recent errors retrieved successfully'
        );
      } else {
        this.addTestResult('Error Handler - Availability', false, 'Error handler not available');
      }
    } catch (error) {
      this.addTestResult('Error Handler - Error', false, error.message);
    }
  }
  
  /**
   * Test OTC handler
   */
  async testOTCHandler() {
    console.log('[OTC Test Suite] Testing OTC handler...');
    
    try {
      // Test 1: Check if background script is available
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Test activation
        const activationResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'getOTCExtractionStatus'
          }, resolve);
        });
        
        this.addTestResult(
          'OTC Handler - Status Check',
          activationResponse && typeof activationResponse === 'object',
          'OTC handler status retrieved'
        );
        
        // Test available pairs
        const pairsResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'getAvailableOTCPairs'
          }, resolve);
        });
        
        this.addTestResult(
          'OTC Handler - Available Pairs',
          pairsResponse && typeof pairsResponse === 'object',
          'Available pairs retrieved'
        );
      } else {
        this.addTestResult('OTC Handler - Chrome Runtime', false, 'Chrome runtime not available');
      }
    } catch (error) {
      this.addTestResult('OTC Handler - Error', false, error.message);
    }
  }
  
  /**
   * Test extractors
   */
  async testExtractors() {
    console.log('[OTC Test Suite] Testing extractors...');
    
    try {
      // Test Pocket Option extractor
      if (window.PocketOptionExtractor) {
        const poExtractor = new window.PocketOptionExtractor({ debug: false });
        this.addTestResult(
          'Pocket Option Extractor - Initialization',
          poExtractor && typeof poExtractor.getStatus === 'function',
          'Pocket Option extractor initialized successfully'
        );
        
        const poStatus = poExtractor.getStatus();
        this.addTestResult(
          'Pocket Option Extractor - Status',
          typeof poStatus === 'object',
          'Pocket Option extractor status retrieved'
        );
      } else {
        this.addTestResult('Pocket Option Extractor - Availability', false, 'Pocket Option extractor not available');
      }
      
      // Test Quotex extractor
      if (window.QuotexDataExtractor) {
        const qxExtractor = new window.QuotexDataExtractor();
        this.addTestResult(
          'Quotex Extractor - Initialization',
          qxExtractor && typeof qxExtractor.getExtractionStatus === 'function',
          'Quotex extractor initialized successfully'
        );
      } else {
        this.addTestResult('Quotex Extractor - Availability', false, 'Quotex extractor not available');
      }
      
      // Test generic OTC extractor
      if (window.OTCDataExtractor) {
        const otcExtractor = new window.OTCDataExtractor({ debug: false });
        this.addTestResult(
          'Generic OTC Extractor - Initialization',
          otcExtractor && typeof otcExtractor.startExtraction === 'function',
          'Generic OTC extractor initialized successfully'
        );
      } else {
        this.addTestResult('Generic OTC Extractor - Availability', false, 'Generic OTC extractor not available');
      }
    } catch (error) {
      this.addTestResult('Extractors - Error', false, error.message);
    }
  }
  
  /**
   * Test data flow
   */
  async testDataFlow() {
    console.log('[OTC Test Suite] Testing data flow...');
    
    try {
      // Test 1: Event dispatching
      let eventReceived = false;
      const eventListener = (event) => {
        if (event.detail && event.detail.test === true) {
          eventReceived = true;
        }
      };
      
      document.addEventListener('OTC_DATA_EXTRACTED', eventListener);
      
      // Dispatch test event
      const testEvent = new CustomEvent('OTC_DATA_EXTRACTED', {
        detail: { ...this.testData.validOTCData, test: true }
      });
      document.dispatchEvent(testEvent);
      
      // Wait a moment for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      document.removeEventListener('OTC_DATA_EXTRACTED', eventListener);
      
      this.addTestResult(
        'Data Flow - Event Dispatching',
        eventReceived,
        eventReceived ? 'Event dispatched and received successfully' : 'Event not received'
      );
      
      // Test 2: Data processing
      if (typeof processOTCData === 'function') {
        try {
          processOTCData(this.testData.validOTCData);
          this.addTestResult(
            'Data Flow - Data Processing',
            true,
            'Data processing completed without errors'
          );
        } catch (error) {
          this.addTestResult(
            'Data Flow - Data Processing',
            false,
            `Data processing failed: ${error.message}`
          );
        }
      } else {
        this.addTestResult('Data Flow - Data Processing', false, 'processOTCData function not available');
      }
    } catch (error) {
      this.addTestResult('Data Flow - Error', false, error.message);
    }
  }
  
  /**
   * Test error recovery
   */
  async testErrorRecovery() {
    console.log('[OTC Test Suite] Testing error recovery...');
    
    try {
      if (window.otcErrorHandler) {
        // Test network error recovery
        const networkError = new Error('Network connection failed');
        const networkRecovery = await window.otcErrorHandler.handleError(
          networkError, 
          'NETWORK', 
          { test: true }
        );
        
        this.addTestResult(
          'Error Recovery - Network Error',
          typeof networkRecovery === 'boolean',
          'Network error recovery attempted'
        );
        
        // Test data error recovery
        const dataError = new Error('Invalid data format');
        const dataRecovery = await window.otcErrorHandler.handleError(
          dataError, 
          'DATA', 
          { test: true }
        );
        
        this.addTestResult(
          'Error Recovery - Data Error',
          typeof dataRecovery === 'boolean',
          'Data error recovery attempted'
        );
      } else {
        this.addTestResult('Error Recovery - Handler Availability', false, 'Error handler not available');
      }
    } catch (error) {
      this.addTestResult('Error Recovery - Error', false, error.message);
    }
  }
  
  /**
   * Test performance
   */
  async testPerformance() {
    console.log('[OTC Test Suite] Testing performance...');
    
    try {
      // Test data validation performance
      if (window.otcDataValidator) {
        const startTime = performance.now();
        
        // Validate data multiple times
        for (let i = 0; i < 100; i++) {
          window.otcDataValidator.validateOTCData(this.testData.validOTCData);
        }
        
        const endTime = performance.now();
        const avgTime = (endTime - startTime) / 100;
        
        this.addTestResult(
          'Performance - Data Validation',
          avgTime < 10, // Should be less than 10ms per validation
          `Average validation time: ${avgTime.toFixed(2)}ms`
        );
      }
      
      // Test memory usage
      if (performance.memory) {
        const memoryBefore = performance.memory.usedJSHeapSize;
        
        // Create and destroy some test objects
        const testObjects = [];
        for (let i = 0; i < 1000; i++) {
          testObjects.push({ ...this.testData.validOTCData });
        }
        
        const memoryAfter = performance.memory.usedJSHeapSize;
        const memoryIncrease = memoryAfter - memoryBefore;
        
        this.addTestResult(
          'Performance - Memory Usage',
          memoryIncrease < 10 * 1024 * 1024, // Should be less than 10MB
          `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
        );
      }
    } catch (error) {
      this.addTestResult('Performance - Error', false, error.message);
    }
  }
  
  /**
   * Test browser compatibility
   */
  async testBrowserCompatibility() {
    console.log('[OTC Test Suite] Testing browser compatibility...');
    
    try {
      // Test Chrome extension APIs
      this.addTestResult(
        'Browser Compatibility - Chrome Runtime',
        typeof chrome !== 'undefined' && chrome.runtime,
        'Chrome runtime API available'
      );
      
      this.addTestResult(
        'Browser Compatibility - Chrome Storage',
        typeof chrome !== 'undefined' && chrome.storage,
        'Chrome storage API available'
      );
      
      // Test modern JavaScript features
      this.addTestResult(
        'Browser Compatibility - Promises',
        typeof Promise !== 'undefined',
        'Promise support available'
      );
      
      this.addTestResult(
        'Browser Compatibility - Async/Await',
        (async () => true)().constructor.name === 'Promise',
        'Async/await support available'
      );
      
      this.addTestResult(
        'Browser Compatibility - Custom Events',
        typeof CustomEvent !== 'undefined',
        'CustomEvent support available'
      );
      
      this.addTestResult(
        'Browser Compatibility - Performance API',
        typeof performance !== 'undefined' && performance.now,
        'Performance API available'
      );
      
      // Test DOM APIs
      this.addTestResult(
        'Browser Compatibility - MutationObserver',
        typeof MutationObserver !== 'undefined',
        'MutationObserver support available'
      );
      
      this.addTestResult(
        'Browser Compatibility - Fetch API',
        typeof fetch !== 'undefined',
        'Fetch API available'
      );
    } catch (error) {
      this.addTestResult('Browser Compatibility - Error', false, error.message);
    }
  }
  
  /**
   * Add test result
   * @param {string} testName - Test name
   * @param {boolean} passed - Whether test passed
   * @param {string} message - Test message
   */
  addTestResult(testName, passed, message) {
    const result = {
      name: testName,
      passed,
      message,
      timestamp: Date.now()
    };
    
    this.testResults.push(result);
    this.testStats.total++;
    
    if (passed) {
      this.testStats.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.testStats.failed++;
      console.error(`❌ ${testName}: ${message}`);
    }
  }
  
  /**
   * Reset test statistics
   */
  resetTestStats() {
    this.testResults = [];
    this.testStats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }
  
  /**
   * Get test summary
   * @returns {Object} - Test summary
   */
  getTestSummary() {
    const summary = {
      stats: { ...this.testStats },
      results: [...this.testResults],
      successRate: this.testStats.total > 0 ? (this.testStats.passed / this.testStats.total) * 100 : 0,
      timestamp: Date.now()
    };
    
    console.log('[OTC Test Suite] Test Summary:', summary);
    return summary;
  }
  
  /**
   * Generate test report
   * @returns {string} - HTML test report
   */
  generateTestReport() {
    const summary = this.getTestSummary();
    
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1>OTC Mode Test Report</h1>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2>Summary</h2>
          <p><strong>Total Tests:</strong> ${summary.stats.total}</p>
          <p><strong>Passed:</strong> <span style="color: green;">${summary.stats.passed}</span></p>
          <p><strong>Failed:</strong> <span style="color: red;">${summary.stats.failed}</span></p>
          <p><strong>Success Rate:</strong> ${summary.successRate.toFixed(1)}%</p>
          <p><strong>Generated:</strong> ${new Date(summary.timestamp).toLocaleString()}</p>
        </div>
        <h2>Test Results</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #e0e0e0;">
              <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Test Name</th>
              <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">Status</th>
              <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Message</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    summary.results.forEach(result => {
      const statusColor = result.passed ? 'green' : 'red';
      const statusText = result.passed ? '✅ PASS' : '❌ FAIL';
      
      html += `
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px;">${result.name}</td>
          <td style="border: 1px solid #ccc; padding: 8px; text-align: center; color: ${statusColor};">${statusText}</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${result.message}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    return html;
  }
}

// Create global instance
const otcTestSuite = new OTCTestSuite();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OTCTestSuite, otcTestSuite };
} else {
  window.OTCTestSuite = OTCTestSuite;
  window.otcTestSuite = otcTestSuite;
}

// Auto-run tests if in development mode
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
  console.log('[OTC Test Suite] Development mode detected, running tests...');
  setTimeout(() => {
    otcTestSuite.runAllTests();
  }, 2000);
}