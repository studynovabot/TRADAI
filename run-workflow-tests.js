/**
 * Run Workflow Accuracy Tests
 * 
 * This script runs the workflow accuracy tests with proper error handling and logging.
 * It respects the Twelve Data API rate limit of 8 requests per minute.
 */

const { runWorkflowAccuracyTests } = require('./tests/workflow-accuracy-test');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const LOG_FILE = path.join(__dirname, 'test-results', 'workflow-test-log.txt');

/**
 * Log message to console and file
 */
async function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  // Log to console
  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
  
  // Log to file
  try {
    await fs.appendFile(LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.error(`Failed to write to log file: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Ensure log directory exists
    await fs.ensureDir(path.dirname(LOG_FILE));
    
    // Start with a separator in the log
    await log('\n' + '='.repeat(80));
    await log('Starting Workflow Accuracy Tests');
    await log('='.repeat(80) + '\n');
    
    // Run the tests
    const results = await runWorkflowAccuracyTests();
    
    // Log summary
    await log('\nTest Summary:');
    await log(`Total Tests: ${results.summary.totalTests}`);
    await log(`Successful: ${results.summary.successfulTests}`);
    await log(`Failed: ${results.summary.failedTests}`);
    await log(`Average Accuracy: ${(results.summary.averageAccuracy * 100).toFixed(2)}%`);
    await log(`Pattern Detected: ${results.summary.patternDetected ? 'YES ⚠️' : 'NO ✅'}`);
    
    if (results.summary.patternDetected) {
      await log('\n⚠️ PATTERN DETECTED: This suggests fallback accuracy is occurring instead of proper analysis');
      await log(`Pattern Details: ${JSON.stringify(results.summary.patternDetails, null, 2)}`);
    }
    
    await log('\nTest completed successfully');
    
  } catch (error) {
    await log(`Error running tests: ${error.message}`, true);
    await log(error.stack || 'No stack trace available', true);
    process.exit(1);
  }
}

// Run the main function
main()
  .then(() => {
    console.log('✅ Tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });