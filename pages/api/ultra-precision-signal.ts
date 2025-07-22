// Ultra-Precision Trading Signal API
import { NextApiRequest, NextApiResponse } from 'next';
import { UltraPrecisionSignalGenerator } from '../../src/core/UltraPrecisionSignalGenerator';

// Initialize the signal generator
const signalGenerator = new UltraPrecisionSignalGenerator();

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

interface UltraPrecisionSignalRequest {
  symbol: string;
  timeframe?: string;
  includeRiskManagement?: boolean;
  confidenceThreshold?: number;
}

interface UltraPrecisionSignalResponse {
  success: boolean;
  signal?: {
    symbol: string;
    direction: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
    confidenceLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
    timeframe: string;
    reasons: string[];
    timestamp: number;
    expiryTime: number;
    indicators: {
      rsi: number;
      macd: any;
      ema: { ema9: number; ema20: number };
      currentPrice: number;
    };
    patterns: any;
    confluence: {
      agreement: number;
      bullishSignals: number;
      bearishSignals: number;
    };
    riskManagement?: {
      entryPrice: number;
      stopLoss: number | null;
      takeProfit: number | null;
      riskRewardRatio: number;
      atr: number;
      positionSize: string;
    };
  };
  error?: string;
  metadata?: {
    processingTime: number;
    dataSource: string;
    apiVersion: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UltraPrecisionSignalResponse>
) {
  const startTime = Date.now();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST or GET.'
    });
  }

  try {
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const clientRequests = rateLimitMap.get(clientIP) || [];
    
    // Clean old requests
    const recentRequests = clientRequests.filter((timestamp: number) => now - timestamp < RATE_LIMIT_WINDOW);
    
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Maximum 10 requests per minute.'
      });
    }
    
    // Add current request
    recentRequests.push(now);
    rateLimitMap.set(clientIP, recentRequests);

    // Parse request parameters
    let params: UltraPrecisionSignalRequest;
    
    if (req.method === 'POST') {
      params = req.body;
    } else {
      params = {
        symbol: req.query.symbol as string,
        timeframe: req.query.timeframe as string,
        includeRiskManagement: req.query.includeRiskManagement === 'true',
        confidenceThreshold: req.query.confidenceThreshold ? parseInt(req.query.confidenceThreshold as string) : undefined
      };
    }

    // Validate required parameters
    if (!params.symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol parameter is required'
      });
    }

    // Set defaults
    const symbol = params.symbol.toUpperCase();
    const timeframe = params.timeframe || '2M';
    const includeRiskManagement = params.includeRiskManagement !== false;
    const confidenceThreshold = params.confidenceThreshold || 50;

    console.log(`🎯 Ultra-precision signal request: ${symbol} ${timeframe}`);

    // Generate ultra-precision signal
    const signal = await signalGenerator.generateUltraPrecisionSignal(symbol, timeframe);

    // Filter by confidence threshold
    if (signal.confidence < confidenceThreshold) {
      return res.status(200).json({
        success: true,
        signal: {
          ...signal,
          direction: 'NEUTRAL',
          reasons: [`Signal confidence ${signal.confidence}% below threshold ${confidenceThreshold}%`]
        },
        metadata: {
          processingTime: Date.now() - startTime,
          dataSource: 'multi-source',
          apiVersion: '2.0'
        }
      });
    }

    // Remove risk management if not requested
    if (!includeRiskManagement && signal.riskManagement) {
      delete signal.riskManagement;
    }

    const response: UltraPrecisionSignalResponse = {
      success: true,
      signal: signal,
      metadata: {
        processingTime: Date.now() - startTime,
        dataSource: 'multi-source',
        apiVersion: '2.0'
      }
    };

    console.log(`✅ Ultra-precision signal generated: ${signal.direction} ${signal.confidence}% (${Date.now() - startTime}ms)`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Ultra-precision signal generation error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      metadata: {
        processingTime: Date.now() - startTime,
        dataSource: 'error',
        apiVersion: '2.0'
      }
    });
  }
}

// Health check endpoint
export async function healthCheck() {
  try {
    const testSignal = await signalGenerator.generateUltraPrecisionSignal('EURUSD', '2M');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      testSignal: {
        symbol: testSignal.symbol,
        direction: testSignal.direction,
        confidence: testSignal.confidence,
        processingTime: 'OK'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}