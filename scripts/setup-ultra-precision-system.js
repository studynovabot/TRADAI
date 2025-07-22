/**
 * Ultra-Precision Trading Signal System Setup Script
 * 
 * Sets up and validates the complete ultra-precision trading signal system
 * including data sources, indicators, patterns, and API endpoints
 */

const fs = require('fs');
const path = require('path');
const { UltraPrecisionSignalTest } = require('../tests/ultraPrecisionSignalTest');

class UltraPrecisionSystemSetup {
  constructor() {
    this.setupSteps = [
      'validateEnvironment',
      'checkDependencies',
      'validateDataSources',
      'testIndicatorCalculations',
      'testPatternDetection',
      'testSignalGeneration',
      'validateAPIEndpoints',
      'runComprehensiveTests',
      'generateSetupReport'
    ];
    
    this.results = {
      environment: {},
      dependencies: {},
      dataSources: {},
      indicators: {},
      patterns: {},
      signals: {},
      api: {},
      tests: {},
      overall: { status: 'pending', issues: [] }
    };
  }

  /**
   * Run complete system setup
   */
  async runSetup() {
    console.log('🚀 Ultra-Precision Trading Signal System Setup');
    console.log('=' .repeat(60));
    console.log('Setting up the most advanced trading signal system...\n');

    try {
      for (const step of this.setupSteps) {
        console.log(`📋 Running: ${step}`);
        await this[step]();
        console.log('');
      }

      this.determineOverallStatus();
      this.displayFinalReport();

    } catch (error) {
      console.error('❌ Setup failed:', error);
      this.results.overall.status = 'failed';
      this.results.overall.issues.push(`Setup error: ${error.message}`);
    }
  }

  /**
   * Validate environment setup
   */
  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const nodeVersionValid = this.compareVersions(nodeVersion, 'v18.0.0') >= 0;
    
    this.results.environment.nodeVersion = {
      version: nodeVersion,
      valid: nodeVersionValid,
      requirement: '>=18.0.0'
    };
    
    if (nodeVersionValid) {
      console.log(`✅ Node.js version: ${nodeVersion}`);
    } else {
      console.log(`❌ Node.js version: ${nodeVersion} (requires >=18.0.0)`);
      this.results.overall.issues.push('Node.js version too old');
    }

    // Check environment variables
    const requiredEnvVars = [
      'ALPHA_VANTAGE_API_KEY',
      'TWELVE_DATA_API_KEY'
    ];
    
    const optionalEnvVars = [
      'MARKET_DATA_API_KEY',
      'STRICT_REAL_DATA_MODE',
      'LOG_DATA_SOURCE'
    ];

    this.results.environment.variables = {};
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      const isSet = !!value;
      
      this.results.environment.variables[envVar] = {
        set: isSet,
        required: true,
        masked: isSet ? `${value.substring(0, 8)}...` : 'Not set'
      };
      
      if (isSet) {
        console.log(`✅ ${envVar}: Set`);
      } else {
        console.log(`⚠️  ${envVar}: Not set (optional but recommended)`);
      }
    }
    
    for (const envVar of optionalEnvVars) {
      const value = process.env[envVar];
      const isSet = !!value;
      
      this.results.environment.variables[envVar] = {
        set: isSet,
        required: false,
        value: isSet ? value : 'Not set'
      };
      
      console.log(`${isSet ? '✅' : '⚪'} ${envVar}: ${isSet ? value : 'Not set'}`);
    }

    // Check file system permissions
    try {
      const testFile = path.join(__dirname, '../temp_test_file.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      this.results.environment.fileSystem = { writable: true };
      console.log('✅ File system: Writable');
    } catch (error) {
      this.results.environment.fileSystem = { writable: false, error: error.message };
      console.log('❌ File system: Not writable');
      this.results.overall.issues.push('File system not writable');
    }
  }

  /**
   * Check required dependencies
   */
  async checkDependencies() {
    console.log('📦 Checking dependencies...');
    
    const requiredDependencies = [
      'axios',
      'technicalindicators',
      'tulind',
      'yahoo-finance2',
      'simple-statistics',
      'ml-matrix',
      'ml-regression'
    ];

    this.results.dependencies = {};

    for (const dep of requiredDependencies) {
      try {
        const packageInfo = require(`${dep}/package.json`);
        this.results.dependencies[dep] = {
          installed: true,
          version: packageInfo.version
        };
        console.log(`✅ ${dep}: v${packageInfo.version}`);
      } catch (error) {
        this.results.dependencies[dep] = {
          installed: false,
          error: error.message
        };
        console.log(`❌ ${dep}: Not installed`);
        this.results.overall.issues.push(`Missing dependency: ${dep}`);
      }
    }

    // Check if core files exist
    const coreFiles = [
      '../src/core/UltraPrecisionSignalGenerator.js',
      '../src/core/MultiSourceDataFetcher.js',
      '../src/utils/TechnicalIndicators.js',
      '../src/utils/CandlestickPatterns.js',
      '../services/alphaVantageService.ts',
      '../services/twelveDataService.ts'
    ];

    this.results.dependencies.coreFiles = {};

    for (const file of coreFiles) {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      
      this.results.dependencies.coreFiles[file] = { exists };
      
      if (exists) {
        console.log(`✅ Core file: ${path.basename(file)}`);
      } else {
        console.log(`❌ Core file missing: ${path.basename(file)}`);
        this.results.overall.issues.push(`Missing core file: ${file}`);
      }
    }
  }

  /**
   * Validate data sources
   */
  async validateDataSources() {
    console.log('📡 Validating data sources...');
    
    try {
      const { MultiSourceDataFetcher } = require('../src/core/MultiSourceDataFetcher');
      const dataFetcher = new MultiSourceDataFetcher();
      
      // Test data source health
      const health = await dataFetcher.getDataSourceHealth();
      this.results.dataSources = health;
      
      for (const [source, status] of Object.entries(health)) {
        if (status.status === 'healthy') {
          console.log(`✅ ${source}: ${status.reason}`);
        } else if (status.status === 'unavailable') {
          console.log(`⚠️  ${source}: ${status.reason}`);
        } else {
          console.log(`❌ ${source}: ${status.reason}`);
        }
      }
      
      // Test actual data fetching
      try {
        console.log('🔄 Testing data fetching...');
        const testData = await dataFetcher.fetchMarketData('EURUSD', '1M', 10);
        
        if (testData && testData.length > 0) {
          console.log(`✅ Data fetching: ${testData.length} candles retrieved`);
          this.results.dataSources.testFetch = { success: true, candles: testData.length };
        } else {
          console.log('❌ Data fetching: No data retrieved');
          this.results.dataSources.testFetch = { success: false, error: 'No data' };
        }
      } catch (error) {
        console.log(`❌ Data fetching: ${error.message}`);
        this.results.dataSources.testFetch = { success: false, error: error.message };
      }
      
    } catch (error) {
      console.log(`❌ Data source validation failed: ${error.message}`);
      this.results.dataSources.error = error.message;
      this.results.overall.issues.push(`Data source validation failed: ${error.message}`);
    }
  }

  /**
   * Test indicator calculations
   */
  async testIndicatorCalculations() {
    console.log('📈 Testing indicator calculations...');
    
    try {
      const { TechnicalIndicators } = require('../src/utils/TechnicalIndicators');
      
      // Generate test data
      const testData = this.generateTestData(100);
      const closes = testData.map(c => c.close);
      
      const indicators = [
        { name: 'RSI', func: () => TechnicalIndicators.calculateRSI(closes, 14) },
        { name: 'MACD', func: () => TechnicalIndicators.calculateMACD(closes) },
        { name: 'EMA', func: () => TechnicalIndicators.calculateEMA(closes, 20) },
        { name: 'Bollinger Bands', func: () => TechnicalIndicators.calculateBollingerBands(closes) },
        { name: 'Stochastic RSI', func: () => TechnicalIndicators.calculateStochasticRSI(closes) },
        { name: 'ATR', func: () => TechnicalIndicators.calculateATR(testData) }
      ];
      
      this.results.indicators = {};
      
      for (const indicator of indicators) {
        try {
          const result = indicator.func();
          const isValid = result !== null && result !== undefined;
          
          this.results.indicators[indicator.name] = {
            working: isValid,
            result: isValid ? 'Valid calculation' : 'Invalid result'
          };
          
          if (isValid) {
            console.log(`✅ ${indicator.name}: Working`);
          } else {
            console.log(`❌ ${indicator.name}: Not working`);
            this.results.overall.issues.push(`${indicator.name} calculation failed`);
          }
        } catch (error) {
          this.results.indicators[indicator.name] = {
            working: false,
            error: error.message
          };
          console.log(`❌ ${indicator.name}: ${error.message}`);
          this.results.overall.issues.push(`${indicator.name}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Indicator testing failed: ${error.message}`);
      this.results.indicators.error = error.message;
      this.results.overall.issues.push(`Indicator testing failed: ${error.message}`);
    }
  }

  /**
   * Test pattern detection
   */
  async testPatternDetection() {
    console.log('🕯️ Testing pattern detection...');
    
    try {
      const { CandlestickPatterns } = require('../src/utils/CandlestickPatterns');
      const patternDetector = new CandlestickPatterns();
      
      // Test with sample patterns
      const testPatterns = [
        this.createBullishEngulfingPattern(),
        this.createBearishEngulfingPattern(),
        this.createHammerPattern()
      ];
      
      this.results.patterns = {};
      
      for (const [patternName, candles] of testPatterns) {
        try {
          const detected = patternDetector.detectPatterns(candles);
          const hasPatterns = detected && Object.keys(detected).length > 0;
          
          this.results.patterns[patternName] = {
            detected: hasPatterns,
            patterns: hasPatterns ? Object.keys(detected) : []
          };
          
          if (hasPatterns) {
            console.log(`✅ ${patternName}: Detected ${Object.keys(detected).join(', ')}`);
          } else {
            console.log(`⚠️  ${patternName}: No patterns detected (may be normal)`);
          }
        } catch (error) {
          this.results.patterns[patternName] = {
            detected: false,
            error: error.message
          };
          console.log(`❌ ${patternName}: ${error.message}`);
          this.results.overall.issues.push(`Pattern detection error: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Pattern detection testing failed: ${error.message}`);
      this.results.patterns.error = error.message;
      this.results.overall.issues.push(`Pattern detection failed: ${error.message}`);
    }
  }

  /**
   * Test signal generation
   */
  async testSignalGeneration() {
    console.log('🎯 Testing signal generation...');
    
    try {
      const { UltraPrecisionSignalGenerator } = require('../src/core/UltraPrecisionSignalGenerator');
      const signalGenerator = new UltraPrecisionSignalGenerator();
      
      const testSymbols = ['EURUSD', 'GBPUSD'];
      this.results.signals = {};
      
      for (const symbol of testSymbols) {
        try {
          console.log(`🔄 Testing ${symbol}...`);
          const startTime = Date.now();
          const signal = await signalGenerator.generateUltraPrecisionSignal(symbol, '2M');
          const generationTime = Date.now() - startTime;
          
          const isValid = this.validateSignal(signal);
          
          this.results.signals[symbol] = {
            generated: isValid,
            confidence: signal.confidence,
            direction: signal.direction,
            generationTime,
            reasons: signal.reasons.length
          };
          
          if (isValid) {
            console.log(`✅ ${symbol}: ${signal.direction} ${signal.confidence}% (${generationTime}ms)`);
          } else {
            console.log(`❌ ${symbol}: Invalid signal structure`);
            this.results.overall.issues.push(`Invalid signal for ${symbol}`);
          }
        } catch (error) {
          this.results.signals[symbol] = {
            generated: false,
            error: error.message
          };
          console.log(`❌ ${symbol}: ${error.message}`);
          this.results.overall.issues.push(`Signal generation failed for ${symbol}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Signal generation testing failed: ${error.message}`);
      this.results.signals.error = error.message;
      this.results.overall.issues.push(`Signal generation failed: ${error.message}`);
    }
  }

  /**
   * Validate API endpoints
   */
  async validateAPIEndpoints() {
    console.log('🌐 Validating API endpoints...');
    
    // Check if API files exist
    const apiFiles = [
      '../pages/api/ultra-precision-signal.ts'
    ];
    
    this.results.api = {};
    
    for (const file of apiFiles) {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      
      this.results.api[path.basename(file)] = { exists };
      
      if (exists) {
        console.log(`✅ API file: ${path.basename(file)}`);
      } else {
        console.log(`❌ API file missing: ${path.basename(file)}`);
        this.results.overall.issues.push(`Missing API file: ${file}`);
      }
    }
    
    // Check component files
    const componentFiles = [
      '../components/UltraPrecisionSignalDashboard.tsx',
      '../pages/ultra-precision-signals.tsx'
    ];
    
    for (const file of componentFiles) {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      
      this.results.api[path.basename(file)] = { exists };
      
      if (exists) {
        console.log(`✅ Component: ${path.basename(file)}`);
      } else {
        console.log(`❌ Component missing: ${path.basename(file)}`);
        this.results.overall.issues.push(`Missing component: ${file}`);
      }
    }
  }

  /**
   * Run comprehensive tests
   */
  async runComprehensiveTests() {
    console.log('🧪 Running comprehensive tests...');
    
    try {
      const tester = new UltraPrecisionSignalTest();
      
      // Run a subset of tests for setup validation
      console.log('🔄 Running data source connectivity tests...');
      await tester.testDataSourceConnectivity();
      
      console.log('🔄 Running indicator calculation tests...');
      await tester.testIndicatorCalculations();
      
      console.log('🔄 Running signal generation tests...');
      await tester.testSignalGeneration();
      
      this.results.tests = {
        passed: tester.testResults.passed,
        failed: tester.testResults.failed,
        total: tester.testResults.total,
        passRate: (tester.testResults.passed / tester.testResults.total * 100).toFixed(1)
      };
      
      console.log(`✅ Tests completed: ${this.results.tests.passRate}% pass rate`);
      
      if (this.results.tests.failed > 0) {
        this.results.overall.issues.push(`${this.results.tests.failed} tests failed`);
      }
      
    } catch (error) {
      console.log(`❌ Comprehensive testing failed: ${error.message}`);
      this.results.tests.error = error.message;
      this.results.overall.issues.push(`Testing failed: ${error.message}`);
    }
  }

  /**
   * Generate setup report
   */
  async generateSetupReport() {
    console.log('📊 Generating setup report...');
    
    const reportPath = path.join(__dirname, '../setup-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      system: 'Ultra-Precision Trading Signal System',
      results: this.results
    };
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`✅ Setup report saved: ${reportPath}`);
    } catch (error) {
      console.log(`❌ Failed to save setup report: ${error.message}`);
    }
  }

  /**
   * Determine overall system status
   */
  determineOverallStatus() {
    const criticalIssues = this.results.overall.issues.filter(issue => 
      issue.includes('Missing dependency') || 
      issue.includes('Node.js version') ||
      issue.includes('Signal generation failed')
    );
    
    if (criticalIssues.length > 0) {
      this.results.overall.status = 'critical';
    } else if (this.results.overall.issues.length > 0) {
      this.results.overall.status = 'warning';
    } else {
      this.results.overall.status = 'healthy';
    }
  }

  /**
   * Display final setup report
   */
  displayFinalReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ULTRA-PRECISION SYSTEM SETUP REPORT');
    console.log('='.repeat(60));
    
    const statusEmoji = {
      'healthy': '✅',
      'warning': '⚠️',
      'critical': '❌',
      'failed': '💥'
    };
    
    console.log(`\n${statusEmoji[this.results.overall.status]} Overall Status: ${this.results.overall.status.toUpperCase()}`);
    
    if (this.results.overall.issues.length > 0) {
      console.log(`\n⚠️  Issues Found (${this.results.overall.issues.length}):`);
      this.results.overall.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    // Environment summary
    console.log(`\n🔧 Environment:`);
    console.log(`   Node.js: ${this.results.environment.nodeVersion?.version} ${this.results.environment.nodeVersion?.valid ? '✅' : '❌'}`);
    console.log(`   File System: ${this.results.environment.fileSystem?.writable ? '✅' : '❌'}`);
    
    // Dependencies summary
    const depCount = Object.keys(this.results.dependencies).length;
    const workingDeps = Object.values(this.results.dependencies).filter(dep => dep.installed).length;
    console.log(`\n📦 Dependencies: ${workingDeps}/${depCount} installed`);
    
    // Data sources summary
    if (this.results.dataSources.testFetch) {
      console.log(`\n📡 Data Sources: ${this.results.dataSources.testFetch.success ? '✅' : '❌'} Fetching working`);
    }
    
    // Tests summary
    if (this.results.tests.total) {
      console.log(`\n🧪 Tests: ${this.results.tests.passed}/${this.results.tests.total} passed (${this.results.tests.passRate}%)`);
    }
    
    // Next steps
    console.log(`\n🚀 Next Steps:`);
    if (this.results.overall.status === 'healthy') {
      console.log('   1. System is ready for production use');
      console.log('   2. Access the dashboard at: /ultra-precision-signals');
      console.log('   3. API endpoint available at: /api/ultra-precision-signal');
      console.log('   4. Monitor system performance and accuracy');
    } else if (this.results.overall.status === 'warning') {
      console.log('   1. Review and resolve warnings above');
      console.log('   2. System can run but may have reduced functionality');
      console.log('   3. Consider adding missing API keys for better data');
    } else {
      console.log('   1. Fix critical issues listed above');
      console.log('   2. Re-run setup script after fixes');
      console.log('   3. System cannot run reliably until issues are resolved');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Ultra-Precision Trading Signal System Setup Complete');
    console.log('='.repeat(60));
  }

  /**
   * Helper methods
   */
  
  compareVersions(version1, version2) {
    const v1parts = version1.replace('v', '').split('.').map(Number);
    const v2parts = version2.replace('v', '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  }

  generateTestData(length) {
    const data = [];
    let basePrice = 1.0500;
    
    for (let i = 0; i < length; i++) {
      const volatility = 0.001;
      const change = (Math.random() - 0.5) * volatility;
      
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.3;
      const low = Math.min(open, close) - Math.random() * volatility * 0.3;
      
      data.push({
        timestamp: Date.now() - (length - i) * 60000,
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
        volume: Math.random() * 1000000 + 500000
      });
      
      basePrice = close;
    }
    
    return data;
  }

  createBullishEngulfingPattern() {
    return ['Bullish Engulfing', [
      { timestamp: Date.now() - 120000, open: 1.0500, high: 1.0510, low: 1.0490, close: 1.0495, volume: 1000000 },
      { timestamp: Date.now() - 60000, open: 1.0490, high: 1.0520, low: 1.0485, close: 1.0515, volume: 1500000 }
    ]];
  }

  createBearishEngulfingPattern() {
    return ['Bearish Engulfing', [
      { timestamp: Date.now() - 120000, open: 1.0500, high: 1.0520, low: 1.0495, close: 1.0515, volume: 1000000 },
      { timestamp: Date.now() - 60000, open: 1.0520, high: 1.0525, low: 1.0485, close: 1.0490, volume: 1500000 }
    ]];
  }

  createHammerPattern() {
    return ['Hammer', [
      { timestamp: Date.now() - 60000, open: 1.0510, high: 1.0515, low: 1.0480, close: 1.0505, volume: 1200000 }
    ]];
  }

  validateSignal(signal) {
    return signal &&
           ['BUY', 'SELL', 'NEUTRAL'].includes(signal.direction) &&
           typeof signal.confidence === 'number' &&
           signal.confidence >= 0 && signal.confidence <= 100 &&
           Array.isArray(signal.reasons) &&
           signal.indicators &&
           typeof signal.indicators.currentPrice === 'number';
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new UltraPrecisionSystemSetup();
  setup.runSetup().catch(console.error);
}

module.exports = { UltraPrecisionSystemSetup };