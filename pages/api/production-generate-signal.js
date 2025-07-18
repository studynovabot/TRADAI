/**
 * Production Trading Signal API Endpoint
 * 
 * Generates ultra-accurate trading signals using:
 * - Real-time data from multiple providers with failover
 * - Historical context from Yahoo Finance
 * - 3-brain AI architecture with deep analysis
 * - 2-3 minute processing time for maximum accuracy
 */

const { ProductionSignalGenerator } = require('../../src/core/ProductionSignalGenerator');
const { Logger } = require('../../src/utils/Logger');

// Initialize logger and signal generator
let logger;
let signalGenerator;

// Initialize components
async function initializeComponents() {
  if (!logger) {
    logger = Logger.getInstanceSync();
  }
  
  if (!signalGenerator) {
    const config = {
      twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
      finnhubApiKey: process.env.FINNHUB_API_KEY || 'd1t566pr01qh0t04t32gd1t566pr01qh0t04t330',
      alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || 'B5V6LID8ZMLCB8I',
      polygonApiKey: process.env.POLYGON_API_KEY || 'fjT4pb2VnomVKkkPay5dpXhMq3qtsLZp',
      groqApiKey: process.env.GROQ_API_KEY,
      togetherApiKey: process.env.TOGETHER_API_KEY,
      targetAccuracy: 87,
      minSignalConfidence: 80,
      enableDeepAnalysis: true,
      strictRealDataMode: true
    };
    
    signalGenerator = new ProductionSignalGenerator(config);
    logger.info('Production Signal Generator initialized');
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }
  
  try {
    // Initialize components
    await initializeComponents();
    
    // Extract parameters
    const { 
      pair = 'EUR/USD', 
      timeframe = '5m',
      enableDeepAnalysis = true,
      maxProcessingTime = 180000 // 3 minutes
    } = req.body;
    
    // Validate inputs
    if (!pair || !timeframe) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'pair and timeframe are required'
      });
    }
    
    // Supported pairs and timeframes
    const supportedPairs = [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD',
      'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'BTC/USD', 'ETH/USD'
    ];
    
    const supportedTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h'];
    
    if (!supportedPairs.includes(pair)) {
      return res.status(400).json({
        error: 'Unsupported pair',
        message: `Supported pairs: ${supportedPairs.join(', ')}`
      });
    }
    
    if (!supportedTimeframes.includes(timeframe)) {
      return res.status(400).json({
        error: 'Unsupported timeframe',
        message: `Supported timeframes: ${supportedTimeframes.join(', ')}`
      });
    }
    
    logger.info(`🚀 Production signal request: ${pair} ${timeframe}`);
    
    // Set timeout for the request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Signal generation timeout')), maxProcessingTime);
    });
    
    // Generate signal with timeout
    const signalPromise = signalGenerator.generateSignal(pair, timeframe, {
      enableDeepAnalysis,
      maxProcessingTime
    });
    
    const signal = await Promise.race([signalPromise, timeoutPromise]);
    
    // Log the result
    if (signal.direction !== 'NO_SIGNAL') {
      logger.info(`✅ Signal generated: ${signal.direction} ${signal.confidence}% for ${pair} ${timeframe}`);
    } else {
      logger.warn(`⚠️ No signal generated for ${pair} ${timeframe}: ${signal.reason}`);
    }
    
    // Add system performance stats
    const performanceStats = signalGenerator.getPerformanceStats();
    
    // Return the complete signal
    return res.status(200).json({
      success: true,
      signal: {
        ...signal,
        systemPerformance: {
          totalSignals: performanceStats.totalSignals,
          successRate: performanceStats.successRate,
          avgProcessingTime: performanceStats.avgProcessingTimeFormatted,
          systemHealth: performanceStats.systemHealth
        }
      },
      metadata: {
        apiVersion: '2.0.0',
        processingMode: 'PRODUCTION',
        deepAnalysisEnabled: enableDeepAnalysis,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error(`❌ Production signal generation failed: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: 'Signal generation failed',
      message: error.message,
      signal: {
        pair: req.body.pair || 'UNKNOWN',
        timeframe: req.body.timeframe || 'UNKNOWN',
        direction: 'NO_SIGNAL',
        confidence: 0,
        riskScore: 'HIGH',
        reason: `System error: ${error.message}`,
        dataSourcesUsed: {
          realtime: 'FAILED',
          fallback: 'FAILED',
          historical: 'FAILED'
        },
        generatedAt: new Date().toISOString(),
        error: true
      },
      metadata: {
        apiVersion: '2.0.0',
        processingMode: 'PRODUCTION',
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Health check endpoint
export async function healthCheck() {
  try {
    await initializeComponents();
    
    // Perform system health check
    const healthResult = await signalGenerator.dataFetcher.performHealthCheck();
    const performanceStats = signalGenerator.getPerformanceStats();
    
    return {
      status: healthResult.overallHealth,
      providers: healthResult.providers,
      performance: performanceStats,
      recommendations: healthResult.recommendations,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'CRITICAL',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export configuration for Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '8mb',
  },
  maxDuration: 300, // 5 minutes max duration
};