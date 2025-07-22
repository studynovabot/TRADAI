import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { TwelveDataService } from '../services/twelveDataService';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('TwelveDataService', () => {
  let service: TwelveDataService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new TwelveDataService();
  });

  test('should fetch OHLCV data successfully', async () => {
    // Mock successful API response
    const mockResponse = {
      meta: {
        symbol: 'EUR/USD',
        interval: '5min',
        currency_base: 'Euro',
        currency_quote: 'US Dollar',
        type: 'Physical Currency'
      },
      values: [
        { datetime: '2023-01-15 00:00:00', open: '1.34', high: '1.35', low: '1.30', close: '1.31', volume: '2500' },
        { datetime: '2023-01-14 00:00:00', open: '1.33', high: '1.35', low: '1.32', close: '1.34', volume: '2400' },
        { datetime: '2023-01-13 00:00:00', open: '1.32', high: '1.34', low: '1.31', close: '1.33', volume: '2300' },
      ],
      status: 'ok'
    };

    (fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse))
    );

    const result = await service.getOHLCV('EUR/USD', '5M', 3);
    
    // Check that fetch was called with the correct URL
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.twelvedata.com/time_series'),
      expect.any(Object)
    );
    
    // Check that the result is correctly formatted
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('datetime');
    expect(result[0]).toHaveProperty('open');
    expect(result[0]).toHaveProperty('high');
    expect(result[0]).toHaveProperty('low');
    expect(result[0]).toHaveProperty('close');
    expect(result[0]).toHaveProperty('volume');
    
    // Check that the values are converted to numbers
    expect(typeof result[0].open).toBe('number');
    expect(typeof result[0].high).toBe('number');
    expect(typeof result[0].low).toBe('number');
    expect(typeof result[0].close).toBe('number');
    expect(typeof result[0].volume).toBe('number');
  });

  test('should handle API errors gracefully', async () => {
    // Mock API error response
    const mockErrorResponse = {
      status: 'error',
      code: 400,
      message: 'Invalid symbol'
    };

    (fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify(mockErrorResponse), { status: 400 })
    );

    // The service should return an empty array on error
    const result = await service.getOHLCV('INVALID/PAIR', '5M', 3);
    expect(result).toEqual([]);
  });

  test('should handle network errors gracefully', async () => {
    // Mock network error
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // The service should return an empty array on error
    const result = await service.getOHLCV('EUR/USD', '5M', 3);
    expect(result).toEqual([]);
  });

  test('should convert timeframe format correctly', async () => {
    // Mock successful API response
    const mockResponse = {
      meta: { symbol: 'EUR/USD' },
      values: [],
      status: 'ok'
    };

    (fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse))
    );

    await service.getOHLCV('EUR/USD', '1M', 3);
    
    // Check that the timeframe was converted correctly (1M -> 1min)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('interval=1min'),
      expect.any(Object)
    );
  });

  test('should use the correct API key', async () => {
    // Mock successful API response
    const mockResponse = {
      meta: { symbol: 'EUR/USD' },
      values: [],
      status: 'ok'
    };

    (fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse))
    );

    await service.getOHLCV('EUR/USD', '5M', 3);
    
    // Check that the API key is included in the request
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('apikey='),
      expect.any(Object)
    );
  });
});