/**
 * Real Market Data Validation Script
 * 
 * This script validates that the system is using REAL market data from APIs
 * and NOT synthetic/mock data that could show fake accuracy
 */

const { Config } = require('./src/config/Config');
const { EnhancedMarketDataManager } = require('./src/layers/EnhancedMarketDataManager');
const axios = require('axios');

class RealDataValidator {
  constructor() {
    this.results = {
      apiTests: {},
      dataQuality: {},
      realDataConfirmed: false,
      warnings: [],
      errors: []
    };
  }

  async validateRealData() {
    console.log('🔍 REAL MARKET DATA VALIDATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Purpose: Ensure system uses REAL market data, not synthetic data');
    console.log('⚠️  Warning: Synthetic data can show fake high accuracy!\n');

    try {
      // Load configuration
      const config = await Config.load();
      
      // Test 1: Validate API keys are present
      await this.validateApiKeys(config);
      
      // Test 2: Test direct API connections
      await this.testDirectApiConnections(config);
      
      // Test 3: Validate data manager uses real APIs
      await this.validateDataManagerRealData(config);
      
      // Test 4: Check for synthetic data patterns
      await this.checkForSyntheticDataPatterns(config);
      
      // Test 5: Validate data freshness and real-time updates
      await this.validateDataFreshness(config);
      
      // Generate final report
      this.generateValidationReport();
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      this.results.errors.push(`Validation failed: ${error.message}`);
      this.generateValidationReport();
    }
  }

  async validateApiKeys(config) {
    console.log('🔑 Step 1: Validating API Keys...');
    
    const apiKeys = {
      'Twelve Data': config.twelveDataApiKey,
      'Finnhub': config.finnhubApiKey,
      'Alpha Vantage': config.alphaVantageApiKey,
      'Polygon.io': config.polygonApiKey,
      'Groq': config.groqApiKey,
      'Together AI': config.togetherApiKey
    };
    
    let validKeys = 0;
    let marketDataKeys = 0;
    
    for (const [provider, key] of Object.entries(apiKeys)) {
      if (key && key.length > 10 && !key.includes('your_') && !key.includes('_here')) {
        console.log(`✅ ${provider}: Valid key present`);
        validKeys++;
        
        if (['Twelve Data', 'Finnhub', 'Alpha Vantage', 'Polygon.io'].includes(provider)) {
          marketDataKeys++;
        }
      } else {
        console.log(`❌ ${provider}: Missing or invalid key`);
        if (['Twelve Data', 'Finnhub'].includes(provider)) {
          this.results.warnings.push(`${provider} API key missing - system may use synthetic data`);
        }
      }
    }
    
    if (marketDataKeys === 0) {
      this.results.errors.push('❌ CRITICAL: No market data API keys found - system will use SYNTHETIC DATA');
    } else {
      console.log(`✅ Found ${marketDataKeys} market data providers`);
    }
    
    console.log(`📊 Total valid keys: ${validKeys}/${Object.keys(apiKeys).length}\n`);
  }

  async testDirectApiConnections(config) {
    console.log('🌐 Step 2: Testing Direct API Connections...');
    
    // Test Twelve Data
    if (config.twelveDataApiKey) {
      await this.testTwelveDataApi(config.twelveDataApiKey);
    }
    
    // Test Finnhub
    if (config.finnhubApiKey) {
      await this.testFinnhubApi(config.finnhubApiKey);
    }
    
    // Test Alpha Vantage
    if (config.alphaVantageApiKey) {
      await this.testAlphaVantageApi(config.alphaVantageApiKey);
    }
    
    // Test Polygon
    if (config.polygonApiKey) {
      await this.testPolygonApi(config.polygonApiKey);
    }
    
    console.log('');
  }

  async testTwelveDataApi(apiKey) {
    try {
      console.log('📊 Testing Twelve Data API...');
      
      const response = await axios.get('https://api.twelvedata.com/time_series', {
        params: {
          symbol: 'EUR/USD',
          interval: '5min',
          outputsize: 5,
          apikey: apiKey
        },
        timeout: 10000
      });
      
      if (response.data && response.data.values && response.data.values.length > 0) {
        const latestCandle = response.data.values[0];
        const timestamp = new Date(latestCandle.datetime);
        const age = Date.now() - timestamp.getTime();
        
        console.log(`✅ Twelve Data: Real data received`);
        console.log(`   📅 Latest candle: ${timestamp.toISOString()}`);
        console.log(`   ⏰ Data age: ${Math.round(age / 60000)} minutes`);
        console.log(`   💰 Price: ${latestCandle.close}`);
        
        this.results.apiTests.twelveData = {
          success: true,
          latestPrice: parseFloat(latestCandle.close),
          timestamp: timestamp.toISOString(),
          ageMinutes: Math.round(age / 60000)
        };
        
        // Validate this looks like real EUR/USD data
        const price = parseFloat(latestCandle.close);
        if (price < 0.8 || price > 1.5) {
          this.results.warnings.push('Twelve Data EUR/USD price seems unusual');
        }
        
      } else {
        throw new Error('No data returned from Twelve Data API');
      }
      
    } catch (error) {
      console.log(`❌ Twelve Data API failed: ${error.message}`);
      this.results.apiTests.twelveData = { success: false, error: error.message };
      this.results.warnings.push('Twelve Data API connection failed');
    }
  }

  async testFinnhubApi(apiKey) {
    try {
      console.log('📈 Testing Finnhub API...');
      
      const to = Math.floor(Date.now() / 1000);
      const from = to - (5 * 5 * 60); // 5 candles of 5 minutes
      
      const response = await axios.get('https://finnhub.io/api/v1/forex/candle', {
        params: {
          symbol: 'OANDA:EUR_USD',
          resolution: '5',
          from: from,
          to: to,
          token: apiKey
        },
        timeout: 10000
      });
      
      if (response.data && response.data.s === 'ok' && response.data.c && response.data.c.length > 0) {
        const latestPrice = response.data.c[response.data.c.length - 1];
        const latestTime = response.data.t[response.data.t.length - 1];
        const timestamp = new Date(latestTime * 1000);
        const age = Date.now() - timestamp.getTime();
        
        console.log(`✅ Finnhub: Real data received`);
        console.log(`   📅 Latest candle: ${timestamp.toISOString()}`);
        console.log(`   ⏰ Data age: ${Math.round(age / 60000)} minutes`);
        console.log(`   💰 Price: ${latestPrice}`);
        
        this.results.apiTests.finnhub = {
          success: true,
          latestPrice: latestPrice,
          timestamp: timestamp.toISOString(),
          ageMinutes: Math.round(age / 60000)
        };
        
        // Validate this looks like real EUR/USD data
        if (latestPrice < 0.8 || latestPrice > 1.5) {
          this.results.warnings.push('Finnhub EUR/USD price seems unusual');
        }
        
      } else {
        throw new Error('No data returned from Finnhub API');
      }
      
    } catch (error) {
      console.log(`❌ Finnhub API failed: ${error.message}`);
      this.results.apiTests.finnhub = { success: false, error: error.message };
      this.results.warnings.push('Finnhub API connection failed');
    }
  }

  async testAlphaVantageApi(apiKey) {
    try {
      console.log('📉 Testing Alpha Vantage API...');
      
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'FX_INTRADAY',
          from_symbol: 'EUR',
          to_symbol: 'USD',
          interval: '5min',
          apikey: apiKey
        },
        timeout: 15000
      });
      
      if (response.data && response.data['Time Series FX (5min)']) {
        const timeSeries = response.data['Time Series FX (5min)'];
        const latestTime = Object.keys(timeSeries)[0];
        const latestData = timeSeries[latestTime];
        const latestPrice = parseFloat(latestData['4. close']);
        const timestamp = new Date(latestTime);
        const age = Date.now() - timestamp.getTime();
        
        console.log(`✅ Alpha Vantage: Real data received`);
        console.log(`   📅 Latest candle: ${timestamp.toISOString()}`);
        console.log(`   ⏰ Data age: ${Math.round(age / 60000)} minutes`);
        console.log(`   💰 Price: ${latestPrice}`);
        
        this.results.apiTests.alphaVantage = {
          success: true,
          latestPrice: latestPrice,
          timestamp: timestamp.toISOString(),
          ageMinutes: Math.round(age / 60000)
        };
        
        // Validate this looks like real EUR/USD data
        if (latestPrice < 0.8 || latestPrice > 1.5) {
          this.results.warnings.push('Alpha Vantage EUR/USD price seems unusual');
        }
        
      } else {
        throw new Error('No data returned from Alpha Vantage API');
      }
      
    } catch (error) {
      console.log(`❌ Alpha Vantage API failed: ${error.message}`);
      this.results.apiTests.alphaVantage = { success: false, error: error.message };
      this.results.warnings.push('Alpha Vantage API connection failed');
    }
  }

  async testPolygonApi(apiKey) {
    try {
      console.log('🔺 Testing Polygon.io API...');
      
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/C:EURUSD/range/5/minute/${from}/${to}`, {
        params: { apikey: apiKey },
        timeout: 10000
      });
      
      if (response.data && response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
        const latestCandle = response.data.results[response.data.results.length - 1];
        const latestPrice = latestCandle.c;
        const timestamp = new Date(latestCandle.t);
        const age = Date.now() - timestamp.getTime();
        
        console.log(`✅ Polygon.io: Real data received`);
        console.log(`   📅 Latest candle: ${timestamp.toISOString()}`);
        console.log(`   ⏰ Data age: ${Math.round(age / 60000)} minutes`);
        console.log(`   💰 Price: ${latestPrice}`);
        
        this.results.apiTests.polygon = {
          success: true,
          latestPrice: latestPrice,
          timestamp: timestamp.toISOString(),
          ageMinutes: Math.round(age / 60000)
        };
        
        // Validate this looks like real EUR/USD data
        if (latestPrice < 0.8 || latestPrice > 1.5) {
          this.results.warnings.push('Polygon EUR/USD price seems unusual');
        }
        
      } else {
        throw new Error('No data returned from Polygon API');
      }
      
    } catch (error) {
      console.log(`❌ Polygon API failed: ${error.message}`);
      this.results.apiTests.polygon = { success: false, error: error.message };
      this.results.warnings.push('Polygon API connection failed');
    }
  }

  async validateDataManagerRealData(config) {
    console.log('🔧 Step 3: Validating Data Manager Uses Real APIs...');
    
    try {
      const dataManager = new EnhancedMarketDataManager(config);
      
      // Check active providers
      const activeProviders = dataManager.getActiveProviders();
      console.log(`📊 Active providers: ${activeProviders.join(', ')}`);
      
      if (activeProviders.length === 0) {
        this.results.errors.push('❌ CRITICAL: No active data providers - system will use synthetic data');
        return;
      }
      
      // Test data fetching
      console.log('🔄 Testing data manager fetch...');
      const fetchResult = await dataManager.fetchAllTimeframes();
      
      if (fetchResult.successful > 0) {
        console.log(`✅ Data manager successfully fetched from ${fetchResult.successful} timeframes`);
        
        // Get sample data to validate
        const sampleData = dataManager.getLatestMarketData();
        if (sampleData && sampleData['5m'] && sampleData['5m'].length > 0) {
          const latestCandle = sampleData['5m'][sampleData['5m'].length - 1];
          console.log(`📊 Sample data - Price: ${latestCandle.close}, Time: ${new Date(latestCandle.timestamp).toISOString()}`);
          
          this.results.dataQuality.dataManagerTest = {
            success: true,
            timeframes: Object.keys(sampleData).length,
            latestPrice: latestCandle.close,
            timestamp: new Date(latestCandle.timestamp).toISOString()
          };
        }
      } else {
        this.results.warnings.push('Data manager failed to fetch real data');
      }
      
    } catch (error) {
      console.log(`❌ Data manager test failed: ${error.message}`);
      this.results.errors.push(`Data manager validation failed: ${error.message}`);
    }
    
    console.log('');
  }

  async checkForSyntheticDataPatterns(config) {
    console.log('🔍 Step 4: Checking for Synthetic Data Patterns...');
    
    try {
      const dataManager = new EnhancedMarketDataManager(config);
      await dataManager.fetchAllTimeframes();
      
      const marketData = dataManager.getLatestMarketData();
      
      if (marketData && marketData['5m'] && marketData['5m'].length > 10) {
        const candles = marketData['5m'];
        
        // Check for synthetic patterns
        const patterns = this.analyzeSyntheticPatterns(candles);
        
        if (patterns.isSynthetic) {
          this.results.errors.push('❌ CRITICAL: Data appears to be SYNTHETIC/MOCK');
          console.log('❌ SYNTHETIC DATA DETECTED:');
          patterns.reasons.forEach(reason => {
            console.log(`   • ${reason}`);
          });
        } else {
          console.log('✅ Data patterns appear to be from real market');
          this.results.dataQuality.syntheticCheck = { passed: true };
        }
        
      } else {
        this.results.warnings.push('Insufficient data to check for synthetic patterns');
      }
      
    } catch (error) {
      console.log(`❌ Synthetic pattern check failed: ${error.message}`);
    }
    
    console.log('');
  }

  analyzeSyntheticPatterns(candles) {
    const reasons = [];
    let suspiciousCount = 0;
    
    // Check for perfect mathematical progressions
    const prices = candles.map(c => c.close);
    let perfectProgression = true;
    for (let i = 1; i < Math.min(10, prices.length); i++) {
      const diff1 = Math.abs(prices[i] - prices[i-1]);
      const diff2 = Math.abs(prices[i+1] - prices[i]);
      if (Math.abs(diff1 - diff2) > 0.0001) {
        perfectProgression = false;
        break;
      }
    }
    
    if (perfectProgression) {
      reasons.push('Perfect mathematical price progression detected');
      suspiciousCount++;
    }
    
    // Check for unrealistic price ranges
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    if (avgPrice > 10000 || avgPrice < 0.1) {
      reasons.push(`Unrealistic average price: ${avgPrice}`);
      suspiciousCount++;
    }
    
    // Check for identical timestamps intervals
    const intervals = [];
    for (let i = 1; i < candles.length; i++) {
      intervals.push(candles[i].timestamp - candles[i-1].timestamp);
    }
    
    const uniqueIntervals = [...new Set(intervals)];
    if (uniqueIntervals.length === 1 && intervals.length > 5) {
      reasons.push('Perfect timestamp intervals (synthetic pattern)');
      suspiciousCount++;
    }
    
    // Check for round numbers
    const roundPrices = prices.filter(p => p === Math.round(p * 10000) / 10000);
    if (roundPrices.length > prices.length * 0.8) {
      reasons.push('Too many round number prices');
      suspiciousCount++;
    }
    
    return {
      isSynthetic: suspiciousCount >= 2,
      reasons: reasons,
      suspiciousCount: suspiciousCount
    };
  }

  async validateDataFreshness(config) {
    console.log('⏰ Step 5: Validating Data Freshness...');
    
    const successfulTests = Object.values(this.results.apiTests).filter(test => test.success);
    
    if (successfulTests.length === 0) {
      this.results.errors.push('❌ No successful API tests - cannot validate data freshness');
      return;
    }
    
    let freshDataCount = 0;
    const maxAgeMinutes = 60; // Data should be less than 1 hour old
    
    successfulTests.forEach(test => {
      if (test.ageMinutes <= maxAgeMinutes) {
        freshDataCount++;
        console.log(`✅ Fresh data from API (${test.ageMinutes} minutes old)`);
      } else {
        console.log(`⚠️ Stale data from API (${test.ageMinutes} minutes old)`);
        this.results.warnings.push(`Data is ${test.ageMinutes} minutes old`);
      }
    });
    
    if (freshDataCount > 0) {
      console.log(`✅ ${freshDataCount}/${successfulTests.length} APIs providing fresh data`);
    } else {
      this.results.warnings.push('All API data appears stale');
    }
    
    console.log('');
  }

  generateValidationReport() {
    console.log('📋 REAL DATA VALIDATION REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Count successful API tests
    const successfulApis = Object.values(this.results.apiTests).filter(test => test.success).length;
    const totalApis = Object.keys(this.results.apiTests).length;
    
    console.log(`📊 API Connection Results: ${successfulApis}/${totalApis} successful`);
    
    // Determine if real data is confirmed
    this.results.realDataConfirmed = successfulApis > 0 && this.results.errors.length === 0;
    
    if (this.results.realDataConfirmed) {
      console.log('✅ REAL MARKET DATA CONFIRMED');
      console.log('🎯 System is using authentic market data from live APIs');
      console.log('📈 Accuracy measurements will be based on real market conditions');
    } else {
      console.log('❌ REAL DATA NOT CONFIRMED');
      console.log('⚠️  WARNING: System may be using synthetic/mock data');
      console.log('🚨 ACCURACY CLAIMS MAY BE INFLATED/FAKE');
    }
    
    // Show errors
    if (this.results.errors.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      this.results.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    // Show warnings
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (!this.results.realDataConfirmed) {
      console.log('   1. ❗ CRITICAL: Configure valid API keys in .env file');
      console.log('   2. ❗ Test API connections before trusting accuracy claims');
      console.log('   3. ❗ Verify data is real-time and not cached/synthetic');
    } else {
      console.log('   1. ✅ Continue with real data validation');
      console.log('   2. ✅ Monitor data freshness regularly');
      console.log('   3. ✅ Cross-verify accuracy claims with live trading');
    }
    
    console.log('\n🎯 CONCLUSION:');
    if (this.results.realDataConfirmed) {
      console.log('✅ System is properly configured for REAL market data');
      console.log('📊 Accuracy measurements should be trustworthy');
    } else {
      console.log('❌ System is NOT properly configured for real data');
      console.log('🚨 DO NOT TRUST ACCURACY CLAIMS WITHOUT REAL API KEYS');
      console.log('⚠️  Configure proper API keys before using this system');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Save report
    this.saveValidationReport();
  }

  async saveValidationReport() {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      
      const reportDir = path.join(process.cwd(), 'test-results');
      await fs.ensureDir(reportDir);
      
      const reportFile = path.join(reportDir, `real-data-validation-${Date.now()}.json`);
      await fs.writeJson(reportFile, {
        timestamp: new Date().toISOString(),
        realDataConfirmed: this.results.realDataConfirmed,
        results: this.results
      }, { spaces: 2 });
      
      console.log(`📄 Validation report saved to: ${reportFile}`);
      
    } catch (error) {
      console.error('❌ Failed to save validation report:', error.message);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new RealDataValidator();
  validator.validateRealData().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { RealDataValidator };