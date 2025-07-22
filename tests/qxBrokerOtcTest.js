/**
 * QXBroker OTC Signal Generator Test
 * 
 * Tests the QXBroker OTC Signal Generator implementation
 */

const { QXBrokerOTCSignalGenerator } = require('../src/core/QXBrokerOTCSignalGenerator');
const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Test configuration
const TEST_CONFIG = {
  asset: 'GBP/USD',
  timeframes: ['1H', '30M', '15M', '5M', '3M', '1M'],
  headless: false, // Set to true for headless testing
  testTimeout: 300000, // 5 minutes
  screenshotsDir: path.join(process.cwd(), 'data', 'test-screenshots')
};

// Create test results directory
const testResultsDir = path.join(process.cwd(), 'test-results');
fs.ensureDirSync(testResultsDir);
fs.ensureDirSync(TEST_CONFIG.screenshotsDir);

// Test logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message) => console.log(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`)
};

/**
 * Run the QXBroker OTC Signal Generator test
 */
async function runTest() {
  logger.info('🚀 Starting QXBroker OTC Signal Generator test...');
  
  const startTime = Date.now();
  const testResults = {
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    tests: [],
    success: false,
    error: null
  };
  
  let signalGenerator = null;
  
  try {
    // Check for QXBroker credentials
    if (!process.env.QXBROKER_EMAIL || !process.env.QXBROKER_PASSWORD) {
      throw new Error('QXBroker credentials not found in environment variables');
    }
    
    // Create signal generator instance
    signalGenerator = new QXBrokerOTCSignalGenerator({
      qxBrokerEmail: process.env.QXBROKER_EMAIL,
      qxBrokerPassword: process.env.QXBROKER_PASSWORD,
      headless: TEST_CONFIG.headless,
      screenshotsDir: TEST_CONFIG.screenshotsDir
    });
    
    // Test 1: Initialization
    logger.info('🧪 Test 1: Initialization');
    const initStart = Date.now();
    await signalGenerator.initialize();
    const initDuration = Date.now() - initStart;
    
    testResults.tests.push({
      name: 'Initialization',
      success: true,
      duration: initDuration,
      timestamp: new Date().toISOString()
    });
    
    logger.success(`✅ Initialization successful (${initDuration}ms)`);
    
    // Test 2: Login
    logger.info('🧪 Test 2: Login to QXBroker');
    const loginStart = Date.now();
    await signalGenerator.login();
    const loginDuration = Date.now() - loginStart;
    
    testResults.tests.push({
      name: 'Login',
      success: true,
      duration: loginDuration,
      timestamp: new Date().toISOString()
    });
    
    logger.success(`✅ Login successful (${loginDuration}ms)`);
    
    // Test 3: Asset and Timeframe Selection
    logger.info('🧪 Test 3: Asset and Timeframe Selection');
    const selectionStart = Date.now();
    await signalGenerator.selectAssetAndTimeframe(TEST_CONFIG.asset, '5M');
    const selectionDuration = Date.now() - selectionStart;
    
    testResults.tests.push({
      name: 'Asset and Timeframe Selection',
      success: true,
      duration: selectionDuration,
      timestamp: new Date().toISOString()
    });
    
    logger.success(`✅ Asset and timeframe selection successful (${selectionDuration}ms)`);
    
    // Test 4: Multi-Timeframe Data Collection
    logger.info('🧪 Test 4: Multi-Timeframe Data Collection');
    const dataCollectionStart = Date.now();
    const timeframeData = await signalGenerator.collectMultiTimeframeData(TEST_CONFIG.asset);
    const dataCollectionDuration = Date.now() - dataCollectionStart;
    
    // Check if we have data for all timeframes
    const collectedTimeframes = Array.from(timeframeData.keys());
    const missingTimeframes = TEST_CONFIG.timeframes.filter(tf => !collectedTimeframes.includes(tf));
    
    testResults.tests.push({
      name: 'Multi-Timeframe Data Collection',
      success: missingTimeframes.length === 0,
      duration: dataCollectionDuration,
      timestamp: new Date().toISOString(),
      details: {
        collectedTimeframes,
        missingTimeframes,
        dataPoints: Object.fromEntries(
          Array.from(timeframeData.entries()).map(([tf, data]) => [tf, data.candles ? data.candles.length : 0])
        )
      }
    });
    
    if (missingTimeframes.length === 0) {
      logger.success(`✅ Multi-timeframe data collection successful (${dataCollectionDuration}ms)`);
    } else {
      logger.warn(`⚠️ Multi-timeframe data collection partially successful (${dataCollectionDuration}ms)`);
      logger.warn(`⚠️ Missing timeframes: ${missingTimeframes.join(', ')}`);
    }
    
    // Test 5: Signal Generation
    logger.info('🧪 Test 5: Signal Generation');
    const signalGenerationStart = Date.now();
    const signal = await signalGenerator.analyzeAndGenerateSignal(TEST_CONFIG.asset);
    const signalGenerationDuration = Date.now() - signalGenerationStart;
    
    testResults.tests.push({
      name: 'Signal Generation',
      success: signal && signal.signal !== 'ERROR' && signal.signal !== 'NO_SIGNAL',
      duration: signalGenerationDuration,
      timestamp: new Date().toISOString(),
      details: {
        signal: signal.signal,
        confidence: signal.confidence,
        riskScore: signal.riskScore,
        reasons: signal.reason
      }
    });
    
    if (signal && signal.signal !== 'ERROR' && signal.signal !== 'NO_SIGNAL') {
      logger.success(`✅ Signal generation successful (${signalGenerationDuration}ms)`);
      logger.info(`📊 Signal: ${signal.signal} with ${signal.confidence} confidence`);
      logger.info(`📊 Risk Score: ${signal.riskScore}`);
      logger.info(`📊 Reasons: ${signal.reason.join(', ')}`);
    } else {
      logger.warn(`⚠️ Signal generation returned ${signal.signal} (${signalGenerationDuration}ms)`);
      if (signal.error) {
        logger.error(`❌ Error: ${signal.error}`);
      }
    }
    
    // Test 6: Complete Workflow
    logger.info('🧪 Test 6: Complete Workflow');
    const workflowStart = Date.now();
    const workflowSignal = await signalGenerator.generateOTCSignal(TEST_CONFIG.asset);
    const workflowDuration = Date.now() - workflowStart;
    
    testResults.tests.push({
      name: 'Complete Workflow',
      success: workflowSignal && workflowSignal.signal !== 'ERROR',
      duration: workflowDuration,
      timestamp: new Date().toISOString(),
      details: {
        signal: workflowSignal.signal,
        confidence: workflowSignal.confidence,
        riskScore: workflowSignal.riskScore,
        processingTime: workflowSignal.processingTime
      }
    });
    
    if (workflowSignal && workflowSignal.signal !== 'ERROR') {
      logger.success(`✅ Complete workflow successful (${workflowDuration}ms)`);
      logger.info(`📊 Workflow Signal: ${workflowSignal.signal} with ${workflowSignal.confidence} confidence`);
    } else {
      logger.warn(`⚠️ Complete workflow returned ${workflowSignal.signal} (${workflowDuration}ms)`);
      if (workflowSignal.error) {
        logger.error(`❌ Error: ${workflowSignal.error}`);
      }
    }
    
    // Test 7: Cleanup
    logger.info('🧪 Test 7: Cleanup');
    const cleanupStart = Date.now();
    await signalGenerator.cleanup();
    const cleanupDuration = Date.now() - cleanupStart;
    
    testResults.tests.push({
      name: 'Cleanup',
      success: true,
      duration: cleanupDuration,
      timestamp: new Date().toISOString()
    });
    
    logger.success(`✅ Cleanup successful (${cleanupDuration}ms)`);
    
    // Calculate overall success
    const failedTests = testResults.tests.filter(test => !test.success);
    testResults.success = failedTests.length === 0;
    
    // Log final results
    const totalDuration = Date.now() - startTime;
    testResults.endTime = new Date().toISOString();
    testResults.duration = totalDuration;
    
    if (testResults.success) {
      logger.success(`\n✅ All tests passed! Total duration: ${totalDuration}ms`);
    } else {
      logger.warn(`\n⚠️ ${failedTests.length} tests failed. Total duration: ${totalDuration}ms`);
      failedTests.forEach(test => {
        logger.warn(`⚠️ Failed test: ${test.name}`);
      });
    }
    
  } catch (error) {
    logger.error(`\n❌ Test failed with error: ${error.message}`);
    console.error(error);
    
    testResults.success = false;
    testResults.error = {
      message: error.message,
      stack: error.stack
    };
    
    // Try to clean up if signal generator was initialized
    if (signalGenerator) {
      try {
        await signalGenerator.cleanup();
        logger.info('✅ Cleanup after error successful');
      } catch (cleanupError) {
        logger.error(`❌ Cleanup after error failed: ${cleanupError.message}`);
      }
    }
  } finally {
    // Save test results
    const testResultsPath = path.join(testResultsDir, `qxbroker_otc_test_${Date.now()}.json`);
    await fs.writeJson(testResultsPath, testResults, { spaces: 2 });
    logger.info(`📝 Test results saved to ${testResultsPath}`);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});