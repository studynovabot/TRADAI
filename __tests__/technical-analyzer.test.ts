import { describe, expect, test } from '@jest/globals';
import { TechnicalAnalyzer } from '../services/technicalAnalyzer';

// Sample market data for testing
const mockMarketData = [
  { datetime: '2023-01-01 00:00:00', open: 1.1, high: 1.15, low: 1.05, close: 1.12, volume: 1000 },
  { datetime: '2023-01-02 00:00:00', open: 1.12, high: 1.18, low: 1.10, close: 1.15, volume: 1200 },
  { datetime: '2023-01-03 00:00:00', open: 1.15, high: 1.20, low: 1.14, close: 1.19, volume: 1500 },
  { datetime: '2023-01-04 00:00:00', open: 1.19, high: 1.22, low: 1.17, close: 1.21, volume: 1300 },
  { datetime: '2023-01-05 00:00:00', open: 1.21, high: 1.25, low: 1.20, close: 1.23, volume: 1400 },
  { datetime: '2023-01-06 00:00:00', open: 1.23, high: 1.26, low: 1.22, close: 1.25, volume: 1600 },
  { datetime: '2023-01-07 00:00:00', open: 1.25, high: 1.28, low: 1.24, close: 1.27, volume: 1700 },
  { datetime: '2023-01-08 00:00:00', open: 1.27, high: 1.29, low: 1.26, close: 1.28, volume: 1800 },
  { datetime: '2023-01-09 00:00:00', open: 1.28, high: 1.30, low: 1.27, close: 1.29, volume: 1900 },
  { datetime: '2023-01-10 00:00:00', open: 1.29, high: 1.31, low: 1.28, close: 1.30, volume: 2000 },
  { datetime: '2023-01-11 00:00:00', open: 1.30, high: 1.32, low: 1.29, close: 1.31, volume: 2100 },
  { datetime: '2023-01-12 00:00:00', open: 1.31, high: 1.33, low: 1.30, close: 1.32, volume: 2200 },
  { datetime: '2023-01-13 00:00:00', open: 1.32, high: 1.34, low: 1.31, close: 1.33, volume: 2300 },
  { datetime: '2023-01-14 00:00:00', open: 1.33, high: 1.35, low: 1.32, close: 1.34, volume: 2400 },
  // Add a bearish candle
  { datetime: '2023-01-15 00:00:00', open: 1.34, high: 1.35, low: 1.30, close: 1.31, volume: 2500 },
];

// Create a downtrend dataset
const mockDowntrendData = [
  { datetime: '2023-01-01 00:00:00', open: 1.35, high: 1.36, low: 1.34, close: 1.35, volume: 1000 },
  { datetime: '2023-01-02 00:00:00', open: 1.35, high: 1.35, low: 1.33, close: 1.34, volume: 1200 },
  { datetime: '2023-01-03 00:00:00', open: 1.34, high: 1.34, low: 1.32, close: 1.33, volume: 1500 },
  { datetime: '2023-01-04 00:00:00', open: 1.33, high: 1.33, low: 1.31, close: 1.32, volume: 1300 },
  { datetime: '2023-01-05 00:00:00', open: 1.32, high: 1.32, low: 1.30, close: 1.31, volume: 1400 },
  { datetime: '2023-01-06 00:00:00', open: 1.31, high: 1.31, low: 1.29, close: 1.30, volume: 1600 },
  { datetime: '2023-01-07 00:00:00', open: 1.30, high: 1.30, low: 1.28, close: 1.29, volume: 1700 },
  { datetime: '2023-01-08 00:00:00', open: 1.29, high: 1.29, low: 1.27, close: 1.28, volume: 1800 },
  { datetime: '2023-01-09 00:00:00', open: 1.28, high: 1.28, low: 1.26, close: 1.27, volume: 1900 },
  { datetime: '2023-01-10 00:00:00', open: 1.27, high: 1.27, low: 1.25, close: 1.26, volume: 2000 },
  { datetime: '2023-01-11 00:00:00', open: 1.26, high: 1.26, low: 1.24, close: 1.25, volume: 2100 },
  { datetime: '2023-01-12 00:00:00', open: 1.25, high: 1.25, low: 1.23, close: 1.24, volume: 2200 },
  { datetime: '2023-01-13 00:00:00', open: 1.24, high: 1.24, low: 1.22, close: 1.23, volume: 2300 },
  { datetime: '2023-01-14 00:00:00', open: 1.23, high: 1.23, low: 1.21, close: 1.22, volume: 2400 },
  // Add a bullish candle
  { datetime: '2023-01-15 00:00:00', open: 1.22, high: 1.25, low: 1.22, close: 1.24, volume: 2500 },
];

describe('TechnicalAnalyzer', () => {
  let analyzer: TechnicalAnalyzer;

  beforeEach(() => {
    analyzer = new TechnicalAnalyzer();
  });

  test('should analyze market data and return technical indicators', async () => {
    const indicators = await analyzer.analyzeMarket(mockMarketData);
    
    // Check that all expected indicators are present
    expect(indicators).toHaveProperty('rsi');
    expect(indicators).toHaveProperty('macd');
    expect(indicators).toHaveProperty('ema');
    expect(indicators).toHaveProperty('pattern');
    expect(indicators).toHaveProperty('volume');
  });

  test('should calculate RSI correctly', async () => {
    const indicators = await analyzer.analyzeMarket(mockMarketData);
    
    // RSI should be a number between 0 and 100
    expect(indicators.rsi).toBeGreaterThanOrEqual(0);
    expect(indicators.rsi).toBeLessThanOrEqual(100);
    
    // For an uptrend, RSI should be high
    expect(indicators.rsi).toBeGreaterThan(50);
  });

  test('should calculate MACD correctly', async () => {
    const indicators = await analyzer.analyzeMarket(mockMarketData);
    
    // MACD components should be present
    expect(indicators.macd).toHaveProperty('macd');
    expect(indicators.macd).toHaveProperty('signal');
    expect(indicators.macd).toHaveProperty('histogram');
    
    // For an uptrend, MACD should be above signal line
    expect(indicators.macd.macd).toBeGreaterThan(indicators.macd.signal);
  });

  test('should calculate EMAs correctly', async () => {
    const indicators = await analyzer.analyzeMarket(mockMarketData);
    
    // EMA components should be present
    expect(indicators.ema).toHaveProperty('ema20');
    expect(indicators.ema).toHaveProperty('ema50');
    expect(indicators.ema).toHaveProperty('ema200');
    
    // For an uptrend, shorter EMAs should be above longer EMAs
    expect(indicators.ema.ema20).toBeGreaterThan(indicators.ema.ema50);
    expect(indicators.ema.ema50).toBeGreaterThan(indicators.ema.ema200);
  });

  test('should detect patterns correctly', async () => {
    const indicators = await analyzer.analyzeMarket(mockMarketData);
    
    // Pattern should have type and strength
    expect(indicators.pattern).toHaveProperty('type');
    expect(indicators.pattern).toHaveProperty('strength');
    
    // Pattern strength should be between 0 and 1
    expect(indicators.pattern.strength).toBeGreaterThanOrEqual(0);
    expect(indicators.pattern.strength).toBeLessThanOrEqual(1);
  });

  test('should analyze volume correctly', async () => {
    const indicators = await analyzer.analyzeMarket(mockMarketData);
    
    // Volume should have trend and average
    expect(indicators.volume).toHaveProperty('trend');
    expect(indicators.volume).toHaveProperty('average');
    
    // Volume trend should be a string
    expect(typeof indicators.volume.trend).toBe('string');
    
    // Volume average should be a number
    expect(typeof indicators.volume.average).toBe('number');
  });

  test('should detect downtrend correctly', async () => {
    const indicators = await analyzer.analyzeMarket(mockDowntrendData);
    
    // For a downtrend, RSI should be low
    expect(indicators.rsi).toBeLessThan(50);
    
    // For a downtrend, MACD should be below signal line
    expect(indicators.macd.macd).toBeLessThan(indicators.macd.signal);
    
    // For a downtrend, shorter EMAs should be below longer EMAs
    expect(indicators.ema.ema20).toBeLessThan(indicators.ema.ema50);
  });
});