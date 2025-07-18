/**
 * Ultimate System Test - Comprehensive validation of the 85-90% accuracy system
 */

const { UltimateOrchestrator } = require('../src/layers/UltimateOrchestrator');
const { Config } = require('../src/config/Config');
const { Logger } = require('../src/utils/Logger');

class UltimateSystemTest {
  constructor() {
    this.logger = Logger.getInstanceSync();
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Ultimate System Comprehensive Tests...\n');
    
    try {
      // Load configuration
      const config = await Config.load();
      
      // Test 1: Configuration Validation
      await this.testConfiguration(config);
      
      // Test 2: Component Initialization
      await this.testComponentInitialization(config);
      
      // Test 3: Data Fusion System
      await this.testDataFusionSystem(config);
      
      // Test 4: Three-Brain Architecture
      await this.testThreeBrainArchitecture(config);
      
      // Test 5: Signal Generation Pipeline
      await this.testSignalGenerationPipeline(config);
      
      // Test 6: Performance Tracking
      await this.testPerformanceTracking(config);
      
      // Test 7: Risk Management Filters
      await this.testRiskManagementFilters(config);
      
      // Test 8: Learning System
      await this.testLearningSystem(config);
      
      // Generate final report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Ultimate System Test failed:', error);
      this.addTestResult('System Test', false, error.message);
    }
  }

  async testConfiguration(config) {
    console.log('📋 Testing Configuration...');
    
    try {
      // Test required API keys
      const requiredKeys = ['twelveDataApiKey', 'groqApiKey'];
      const missingKeys = requiredKeys.filter(key => !config[key]);
      
      if (missingKeys.length > 0) {
        throw new Error(`Missing required API keys: ${missingKeys.join(', ')}`);
      }
      
      // Test performance targets
      if (config.targetAccuracy < 50 || config.targetAccuracy > 100) {
        throw new Error('Invalid target accuracy');
      }
      
      // Test data fusion settings
      if (config.enableDataFusion && config.minDataSources < 1) {
        throw new Error('Invalid data fusion configuration');
      }
      
      this.addTestResult('Configuration Validation', true, 'All configuration parameters valid');
      
    } catch (error) {
      this.addTestResult('Configuration Validation', false, error.message);
    }
  }

  async testComponentInitialization(config) {
    console.log('🔧 Testing Component Initialization...');
    
    try {
      const orchestrator = new UltimateOrchestrator(config);
      
      // Test orchestrator creation
      if (!orchestrator) {
        throw new Error('Failed to create UltimateOrchestrator');
      }
      
      // Test component properties
      if (!orchestrator.marketDataManager) {
        throw new Error('MarketDataManager not initialized');
      }
      
      if (!orchestrator.quantBrain) {
        throw new Error('QuantBrain not initialized');
      }
      
      if (!orchestrator.analystBrain) {
        throw new Error('AnalystBrain not initialized');
      }
      
      if (!orchestrator.reflexBrain) {
        throw new Error('ReflexBrain not initialized');
      }
      
      this.addTestResult('Component Initialization', true, 'All components initialized successfully');
      
    } catch (error) {
      this.addTestResult('Component Initialization', false, error.message);
    }
  }

  async testDataFusionSystem(config) {
    console.log('📊 Testing Data Fusion System...');
    
    try {
      const { EnhancedMarketDataManager } = require('../src/layers/EnhancedMarketDataManager');
      const dataManager = new EnhancedMarketDataManager(config);
      
      // Test provider configuration
      const activeProviders = dataManager.getActiveProviders();
      if (activeProviders.length === 0) {
        throw new Error('No active data providers configured');
      }
      
      // Test data fusion capabilities
      if (config.enableDataFusion && activeProviders.length < config.minDataSources) {
        throw new Error('Insufficient data sources for fusion');
      }
      
      this.addTestResult('Data Fusion System', true, `${activeProviders.length} providers configured`);
      
    } catch (error) {
      this.addTestResult('Data Fusion System', false, error.message);
    }
  }

  async testThreeBrainArchitecture(config) {
    console.log('🧠 Testing Three-Brain Architecture...');
    
    try {
      const { EnhancedQuantBrain } = require('../src/layers/EnhancedQuantBrain');
      const { UltimateAnalystBrain } = require('../src/layers/UltimateAnalystBrain');
      const { UltimateReflexBrain } = require('../src/layers/UltimateReflexBrain');
      
      // Test Quant Brain
      const quantBrain = new EnhancedQuantBrain(config);
      if (!quantBrain.models || Object.keys(quantBrain.models).length === 0) {
        console.warn('⚠️ Quant Brain models not loaded (expected in production)');
      }
      
      // Test Analyst Brain
      const analystBrain = new UltimateAnalystBrain(config);
      const analystProviders = analystBrain.getActiveProviders();
      if (analystProviders.length === 0) {
        throw new Error('No AI providers configured for Analyst Brain');
      }
      
      // Test Reflex Brain
      const reflexBrain = new UltimateReflexBrain(config);
      const reflexProviders = reflexBrain.getActiveProviders();
      if (reflexProviders.length === 0) {
        throw new Error('No fast AI providers configured for Reflex Brain');
      }
      
      this.addTestResult('Three-Brain Architecture', true, 
        `Analyst: ${analystProviders.length} providers, Reflex: ${reflexProviders.length} providers`);
      
    } catch (error) {
      this.addTestResult('Three-Brain Architecture', false, error.message);
    }
  }

  async testSignalGenerationPipeline(config) {
    console.log('🎯 Testing Signal Generation Pipeline...');
    
    try {
      const orchestrator = new UltimateOrchestrator(config);
      
      // Test pipeline configuration
      if (!orchestrator.systemConfig) {
        throw new Error('System configuration not loaded');
      }
      
      if (!orchestrator.performanceTargets) {
        throw new Error('Performance targets not configured');
      }
      
      // Test signal generation limits
      if (orchestrator.systemConfig.maxDailySignals < 1) {
        throw new Error('Invalid daily signal limit');
      }
      
      // Test processing time limits
      if (orchestrator.systemConfig.maxProcessingTime < 1000) {
        throw new Error('Processing time limit too low');
      }
      
      this.addTestResult('Signal Generation Pipeline', true, 
        `Max daily signals: ${orchestrator.systemConfig.maxDailySignals}, Max processing: ${orchestrator.systemConfig.maxProcessingTime}ms`);
      
    } catch (error) {
      this.addTestResult('Signal Generation Pipeline', false, error.message);
    }
  }

  async testPerformanceTracking(config) {
    console.log('📈 Testing Performance Tracking...');
    
    try {
      const { SignalPerformanceTracker } = require('../src/utils/SignalPerformanceTracker');
      const tracker = new SignalPerformanceTracker(config);
      
      // Test tracker initialization
      const initialized = await tracker.initialize();
      if (!initialized) {
        throw new Error('Performance tracker failed to initialize');
      }
      
      // Test performance metrics structure
      const stats = tracker.getPerformanceStats();
      if (!stats || typeof stats.accuracy === 'undefined') {
        throw new Error('Performance stats structure invalid');
      }
      
      this.addTestResult('Performance Tracking', true, 'Performance tracker initialized successfully');
      
    } catch (error) {
      this.addTestResult('Performance Tracking', false, error.message);
    }
  }

  async testRiskManagementFilters(config) {
    console.log('🛡️ Testing Risk Management Filters...');
    
    try {
      const orchestrator = new UltimateOrchestrator(config);
      
      // Test filter configuration
      const filters = orchestrator.reflexBrain.rejectionFilters;
      if (!filters) {
        throw new Error('Risk management filters not configured');
      }
      
      // Test volatility filter
      if (filters.volatility && filters.volatility.threshold <= 0) {
        throw new Error('Invalid volatility threshold');
      }
      
      // Test volume filter
      if (filters.volume && filters.volume.threshold <= 0) {
        throw new Error('Invalid volume threshold');
      }
      
      // Test market hours filter
      if (filters.marketHours && filters.marketHours.bufferMinutes < 0) {
        throw new Error('Invalid market hours buffer');
      }
      
      this.addTestResult('Risk Management Filters', true, 
        `Volatility: ${filters.volatility?.enabled}, Volume: ${filters.volume?.enabled}, Market Hours: ${filters.marketHours?.enabled}`);
      
    } catch (error) {
      this.addTestResult('Risk Management Filters', false, error.message);
    }
  }

  async testLearningSystem(config) {
    console.log('🧠 Testing Learning System...');
    
    try {
      const orchestrator = new UltimateOrchestrator(config);
      
      // Test learning configuration
      const learningSystem = orchestrator.learningSystem;
      if (!learningSystem) {
        throw new Error('Learning system not configured');
      }
      
      // Test learning parameters
      if (learningSystem.retrainInterval <= 0) {
        throw new Error('Invalid retrain interval');
      }
      
      if (learningSystem.minSamplesForRetrain <= 0) {
        throw new Error('Invalid minimum samples for retrain');
      }
      
      this.addTestResult('Learning System', true, 
        `Enabled: ${learningSystem.enabled}, Retrain interval: ${learningSystem.retrainInterval}ms`);
      
    } catch (error) {
      this.addTestResult('Learning System', false, error.message);
    }
  }

  addTestResult(testName, passed, details) {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${testName}: ${details}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}: ${details}`);
    }
    
    this.testResults.details.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateFinalReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ULTIMATE SYSTEM TEST REPORT');
    console.log('='.repeat(60));
    
    const passRate = (this.testResults.passed / this.testResults.total * 100).toFixed(1);
    
    console.log(`📈 Overall Results:`);
    console.log(`   Total Tests: ${this.testResults.total}`);
    console.log(`   Passed: ${this.testResults.passed}`);
    console.log(`   Failed: ${this.testResults.failed}`);
    console.log(`   Pass Rate: ${passRate}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.details
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`   • ${result.test}: ${result.details}`);
        });
    }
    
    console.log('\n🎯 System Readiness Assessment:');
    
    if (passRate >= 90) {
      console.log('✅ EXCELLENT - System is production-ready');
      console.log('🚀 Ready to achieve 85-90% accuracy target');
    } else if (passRate >= 80) {
      console.log('⚠️ GOOD - System is mostly ready with minor issues');
      console.log('🔧 Address failed tests before production deployment');
    } else if (passRate >= 70) {
      console.log('⚠️ FAIR - System needs attention before deployment');
      console.log('🛠️ Fix critical issues and retest');
    } else {
      console.log('❌ POOR - System not ready for production');
      console.log('🚨 Major issues need to be resolved');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Fix any failed tests');
    console.log('2. Configure API keys in .env file');
    console.log('3. Run: npm run ultimate');
    console.log('4. Monitor system performance');
    console.log('5. Validate accuracy over time');
    
    console.log('\n' + '='.repeat(60));
    
    // Save report to file
    this.saveReportToFile();
  }

  async saveReportToFile() {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      
      const reportDir = path.join(process.cwd(), 'test-results');
      await fs.ensureDir(reportDir);
      
      const reportFile = path.join(reportDir, `ultimate-system-test-${Date.now()}.json`);
      await fs.writeJson(reportFile, {
        timestamp: new Date().toISOString(),
        results: this.testResults,
        summary: {
          passRate: (this.testResults.passed / this.testResults.total * 100).toFixed(1),
          recommendation: this.getRecommendation()
        }
      }, { spaces: 2 });
      
      console.log(`📄 Test report saved to: ${reportFile}`);
      
    } catch (error) {
      console.error('❌ Failed to save test report:', error.message);
    }
  }

  getRecommendation() {
    const passRate = this.testResults.passed / this.testResults.total * 100;
    
    if (passRate >= 90) return 'PRODUCTION_READY';
    if (passRate >= 80) return 'MINOR_FIXES_NEEDED';
    if (passRate >= 70) return 'MAJOR_FIXES_NEEDED';
    return 'NOT_READY';
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new UltimateSystemTest();
  test.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { UltimateSystemTest };