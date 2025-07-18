/**
 * Debug script to test signal generation components
 */

console.log('🔍 Debugging signal generation...');

async function debugSignalGeneration() {
  try {
    console.log('1. Testing ProductionMarketDataFetcher...');
    
    // Test if we can import the fetcher
    const { ProductionMarketDataFetcher } = require('./src/utils/ProductionMarketDataFetcher');
    console.log('✅ ProductionMarketDataFetcher imported successfully');
    
    // Test basic configuration
    const config = {
      finnhubApiKey: 'd1t566pr01qh0t04t32gd1t566pr01qh0t04t330',
      alphaVantageApiKey: 'B5V6LID8ZMLCB8I',
      polygonApiKey: 'fjT4pb2VnomVKkkPay5dpXhMq3qtsLZp'
    };
    
    const fetcher = new ProductionMarketDataFetcher(config);
    console.log('✅ ProductionMarketDataFetcher initialized');
    
    console.log('2. Testing basic data fetch...');
    const data = await fetcher.fetchRealTimeData('EUR/USD', '5m', 5);
    
    if (data && data.length > 0) {
      console.log(`✅ Data fetched successfully: ${data.length} candles`);
      console.log('Sample candle:', data[0]);
    } else {
      console.log('❌ No data returned');
    }
    
    console.log('3. Testing ProductionSignalGenerator...');
    const { ProductionSignalGenerator } = require('./src/core/ProductionSignalGenerator');
    console.log('✅ ProductionSignalGenerator imported successfully');
    
    const signalGenerator = new ProductionSignalGenerator(config);
    console.log('✅ ProductionSignalGenerator initialized');
    
    console.log('4. Testing simple signal generation (this may take a few minutes)...');
    const signal = await signalGenerator.generateSignal('EUR/USD', '5m');
    
    console.log('✅ Signal generated:', {
      direction: signal.direction,
      confidence: signal.confidence,
      riskScore: signal.riskScore,
      dataSourcesUsed: signal.dataSourcesUsed
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugSignalGeneration();