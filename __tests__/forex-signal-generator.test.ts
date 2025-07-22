import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../pages/api/forex-signal-generator';
import { TwelveDataService } from '../services/twelveDataService';
import { TechnicalAnalyzer } from '../services/technicalAnalyzer';

// Mock the services
jest.mock('../services/twelveDataService');
jest.mock('../services/technicalAnalyzer');

// Mock response object
const mockResponse = () => {
  const res: Partial<NextApiResponse> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res as NextApiResponse;
};

// Sample market data for testing
const mockMarketData = [
  { datetime: '2023-01-01 00:00:00', open: 1.1, high: 1.15, low: 1.05, close: 1.12, volume: 1000 },
  { datetime: '2023-01-02 00:00:00', open: 1.12, high: 1.18, low: 1.10, close: 1.15, volume: 1200 },
  { datetime: '2023-01-03 00:00:00', open: 1.15, high: 1.20, low: 1.14, close: 1.19, volume: 1500 },
  // Add more candles to make a realistic dataset
  { datetime: '2023-01-04 00:00:00', open: 1.19, high: 1.22, low: 1.17, close: 1.21, volume: 1300 },
  { datetime: '2023-01-05 00:00:00', open: 1.21, high: 1.25, low: 1.20, close: 1.23, volume: 1400 },
];

// Sample technical indicators for testing
const mockIndicators = {
  rsi: 65,
  macd: {
    macd: 0.002,
    signal: 0.001,
    histogram: 0.001
  },
  ema: {
    ema20: 1.18,
    ema50: 1.15,
    ema200: 1.10
  },
  pattern: {
    type: 'bullish_engulfing',
    strength: 0.8
  },
  volume: {
    trend: 'increasing',
    average: 1200
  }
};

describe('Forex Signal Generator API', () => {
  let req: Partial<NextApiRequest>;
  let res: NextApiResponse;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request and response
    req = {
      method: 'POST',
      body: {
        pair: 'EUR/USD',
        trade_mode: 'scalping',
        risk: '1'
      }
    };
    res = mockResponse();

    // Mock TwelveDataService getOHLCV method
    (TwelveDataService.prototype.getOHLCV as jest.Mock).mockResolvedValue(mockMarketData);
    
    // Mock TechnicalAnalyzer analyzeMarket method
    (TechnicalAnalyzer.prototype.analyzeMarket as jest.Mock).mockResolvedValue(mockIndicators);
  });

  test('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req as NextApiRequest, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  test('should return 400 if required fields are missing', async () => {
    req.body = { pair: 'EUR/USD' }; // Missing trade_mode
    await handler(req as NextApiRequest, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('Missing required fields') });
  });

  test('should return 400 if market data cannot be fetched', async () => {
    (TwelveDataService.prototype.getOHLCV as jest.Mock).mockResolvedValue([]);
    await handler(req as NextApiRequest, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('Unable to fetch market data') });
  });

  test('should return 500 if an error occurs during processing', async () => {
    (TwelveDataService.prototype.getOHLCV as jest.Mock).mockRejectedValue(new Error('API error'));
    await handler(req as NextApiRequest, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ 
      error: expect.stringContaining('Internal server error'),
      message: expect.stringContaining('API error')
    });
  });

  test('should generate a valid signal for sniper mode', async () => {
    req.body.trade_mode = 'sniper';
    await handler(req as NextApiRequest, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      pair: 'EUR/USD',
      trade_mode: 'sniper',
      timeframe: '1M'
    }));
  });

  test('should generate a valid signal for scalping mode', async () => {
    req.body.trade_mode = 'scalping';
    await handler(req as NextApiRequest, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      pair: 'EUR/USD',
      trade_mode: 'scalping',
      timeframe: '5M'
    }));
  });

  test('should generate a valid signal for swing mode', async () => {
    req.body.trade_mode = 'swing';
    await handler(req as NextApiRequest, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      pair: 'EUR/USD',
      trade_mode: 'swing',
      timeframe: '1H'
    }));
  });

  test('should include proper risk-reward values in the response', async () => {
    await handler(req as NextApiRequest, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      entry: expect.any(Number),
      stop_loss: expect.any(Number),
      take_profit: expect.any(Number),
      rr_ratio: expect.any(Number)
    }));
  });

  test('should include confidence and reason in the response', async () => {
    await handler(req as NextApiRequest, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      confidence: expect.any(Number),
      reason: expect.any(String)
    }));
  });
});