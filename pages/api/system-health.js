/**
 * System Health Check API Endpoint
 * 
 * Provides comprehensive health status of the production trading system
 */

const { ProductionMarketDataFetcher } = require('../../src/utils/ProductionMarketDataFetcher');
const { Logger } = require('../../src/utils/Logger');

let logger;
let dataFetcher;

// Initialize components
async function initializeComponents() {
  if (!logger) {
    logger = Logger.getInstanceSync();
  }
  
  if (!dataFetcher) {
    const config = {
      twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
      finnhubApiKey: process.env.FINNHUB_API_KEY || 'd1t566pr01qh0t04t32gd1t566pr01qh0t04t330',
      alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || 'B5V6LID8ZMLCB8I',
      polygonApiKey: process.env.POLYGON_API_KEY || 'fjT4pb2VnomVKkkPay5dpXhMq3qtsLZp'
    };
    
    dataFetcher = new ProductionMarketDataFetcher(config);
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }
  
  try {
    await initializeComponents();
    
    logger.info('Performing system health check...');
    
    // Perform comprehensive health check
    const healthResult = await dataFetcher.performHealthCheck();
    const performanceStats = dataFetcher.getPerformanceStats();
    
    // Check API key availability
    const apiKeyStatus = {
      twelveData: !!process.env.TWELVE_DATA_API_KEY,
      finnhub: !!process.env.FINNHUB_API_KEY,
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      polygon: !!process.env.POLYGON_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      together: !!process.env.TOGETHER_API_KEY
    };
    
    // Test data availability
    const dataAvailabilityTest = await testDataAvailability();
    
    // Calculate overall system score
    const systemScore = calculateSystemScore(healthResult, performanceStats, apiKeyStatus, dataAvailabilityTest);
    
    const response = {
      status: healthResult.overallHealth,
      score: systemScore,
      timestamp: new Date().toISOString(),
      components: {
        dataProviders: healthResult.providers,
        apiKeys: apiKeyStatus,
        dataAvailability: dataAvailabilityTest,
        performance: {
          totalRequests: performanceStats.totalRequests,
          successRate: performanceStats.successfulRequests / Math.max(performanceStats.totalRequests, 1) * 100,
          avgResponseTime: performanceStats.avgResponseTime,
          cacheSize: performanceStats.cacheSize,
          activeProviders: performanceStats.activeProviders
        }
      },
      recommendations: healthResult.recommendations || [],
      lastHealthCheck: performanceStats.lastHealthCheck
    };
    
    logger.info(`System health check completed: ${response.status} (Score: ${systemScore}/100)`);
    
    return res.status(200).json(response);
    
  } catch (error) {
    logger.error(`System health check failed: ${error.message}`);
    
    return res.status(500).json({
      status: 'CRITICAL',
      score: 0,
      error: error.message,
      timestamp: new Date().toISOString(),
      components: {
        dataProviders: {},
        apiKeys: {},
        dataAvailability: {},
        performance: {}
      },
      recommendations: ['System health check failed - investigate immediately']
    });
  }
}

// Test data availability from different sources
async function testDataAvailability() {
  const testResults = {
    realTimeData: false,
    historicalData: false,
    multiTimeframe: false,
    dataFreshness: false
  };
  
  try {
    // Test real-time data
    const realtimeTest = await dataFetcher.fetchRealTimeData('EUR/USD', '5m', 5);
    testResults.realTimeData = realtimeTest !== null && realtimeTest.length > 0;
    
    // Test historical data
    const historicalTest = await dataFetcher.fetchHistoricalData('EUR/USD', '1mo', '1d');
    testResults.historicalData = historicalTest !== null && historicalTest.length > 0;
    
    // Test multi-timeframe data
    const multiTimeframeTest = await dataFetcher.fetchMultiTimeframeData('EUR/USD', ['5m', '15m'], 5);
    testResults.multiTimeframe = multiTimeframeTest !== null && 
      Object.values(multiTimeframeTest).some(data => data !== null);
    
    // Test data freshness
    if (realtimeTest && realtimeTest.length > 0) {
      const lastCandle = realtimeTest[realtimeTest.length - 1];
      const age = Date.now() - lastCandle.timestamp;
      testResults.dataFreshness = age < 10 * 60 * 1000; // Less than 10 minutes old
    }
    
  } catch (error) {
    logger.warn(`Data availability test failed: ${error.message}`);
  }
  
  return testResults;
}

// Calculate overall system health score
function calculateSystemScore(healthResult, performanceStats, apiKeyStatus, dataAvailability) {
  let score = 0;
  
  // Data provider health (40 points)
  const healthyProviders = Object.values(healthResult.providers || {})
    .filter(p => p.status === 'HEALTHY').length;
  const totalProviders = Object.keys(healthResult.providers || {}).length;
  
  if (totalProviders > 0) {
    score += (healthyProviders / totalProviders) * 40;
  }
  
  // API key availability (20 points)
  const availableKeys = Object.values(apiKeyStatus).filter(Boolean).length;
  const totalKeys = Object.keys(apiKeyStatus).length;
  score += (availableKeys / totalKeys) * 20;
  
  // Data availability (25 points)
  const availableData = Object.values(dataAvailability).filter(Boolean).length;
  const totalDataTests = Object.keys(dataAvailability).length;
  score += (availableData / totalDataTests) * 25;
  
  // Performance metrics (15 points)
  if (performanceStats.totalRequests > 0) {
    const successRate = performanceStats.successfulRequests / performanceStats.totalRequests;
    score += successRate * 15;
  } else {
    score += 10; // Default score if no requests yet
  }
  
  return Math.round(score);
}

export const config = {
  api: {
    responseLimit: '2mb',
  },
};