/**
 * Script to run tests for the Forex Signal Generator
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running tests for Forex Signal Generator...');

// Check if Jest is installed
try {
  console.log('✅ Checking Jest installation...');
  execSync('npx jest --version', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Jest is not installed. Installing Jest...');
  execSync('npm install --save-dev jest @jest/globals ts-jest', { stdio: 'inherit' });
}

// Run the tests
try {
  console.log('🧪 Running tests...');
  execSync('npx jest', { stdio: 'inherit' });
  console.log('✅ All tests passed!');
} catch (error) {
  console.error('❌ Some tests failed:', error.message);
  process.exit(1);
}

// Run a real data test
console.log('🧪 Testing with real market data...');

try {
  // Create a temporary test file
  const testFile = path.join(__dirname, 'real-data-test.js');
  
  fs.writeFileSync(testFile, `
    const { TwelveDataService } = require('./services/twelveDataService');
    const { TechnicalAnalyzer } = require('./services/technicalAnalyzer');
    
    async function testRealData() {
      console.log('🧪 Testing TwelveDataService with real market data...');
      
      const twelveData = new TwelveDataService();
      const marketData = await twelveData.getOHLCV('EUR/USD', '5M', 20);
      
      if (!marketData || marketData.length === 0) {
        console.error('❌ Failed to fetch real market data');
        return false;
      }
      
      console.log(\`✅ Successfully fetched \${marketData.length} candles of real market data\`);
      console.log('📊 Latest candle:', marketData[marketData.length - 1]);
      
      console.log('🧪 Testing TechnicalAnalyzer with real market data...');
      
      const technicalAnalyzer = new TechnicalAnalyzer();
      const indicators = await technicalAnalyzer.analyzeMarket(marketData);
      
      if (!indicators) {
        console.error('❌ Failed to analyze market data');
        return false;
      }
      
      console.log('✅ Successfully analyzed market data');
      console.log('📊 Technical indicators:', JSON.stringify(indicators, null, 2));
      
      return true;
    }
    
    testRealData()
      .then(success => {
        if (success) {
          console.log('✅ Real data test passed!');
          process.exit(0);
        } else {
          console.error('❌ Real data test failed!');
          process.exit(1);
        }
      })
      .catch(error => {
        console.error('❌ Error during real data test:', error);
        process.exit(1);
      });
  `);
  
  // Run the test
  execSync('node real-data-test.js', { stdio: 'inherit' });
  
  // Clean up
  fs.unlinkSync(testFile);
  
} catch (error) {
  console.error('❌ Real data test failed:', error.message);
  // Don't exit with error code, as this is just an additional test
}

console.log('✅ All tests completed!');