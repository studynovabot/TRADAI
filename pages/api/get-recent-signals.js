/**
 * Get Recent Signals API Endpoint
 * 
 * Retrieves recent trading signals with comprehensive filtering and pagination options
 */

import { SignalPerformanceTracker } from '../../src/utils/SignalPerformanceTracker';

// Initialize performance tracker
const performanceTracker = new SignalPerformanceTracker();

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract query parameters with enhanced filtering options
    const { 
      limit = 20, 
      offset = 0,
      symbol,
      timeframe,
      min_confidence,
      max_confidence,
      result,
      start_date,
      end_date,
      sort_by = 'timestamp',
      sort_order = 'desc',
      include_indicators = 'false',
      pattern
    } = req.query;
    
    // Build filter options
    const filterOptions = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      symbol,
      timeframe,
      minConfidence: min_confidence ? parseInt(min_confidence) : undefined,
      maxConfidence: max_confidence ? parseInt(max_confidence) : undefined,
      result: result ? result.toUpperCase() : undefined,
      startDate: start_date,
      endDate: end_date,
      sortBy: sort_by,
      sortOrder: sort_order,
      pattern
    };
    
    // Get signals with enhanced filters
    const signals = await performanceTracker.getRecentSignals(filterOptions);
    
    // Get total count for pagination
    const totalCount = await performanceTracker.getSignalCount(filterOptions);
    
    // Remove technical indicators data if not requested to reduce payload size
    if (include_indicators !== 'true') {
      signals.forEach(signal => {
        if (signal.technical_analysis) {
          delete signal.technical_analysis;
        }
        if (signal.indicators) {
          delete signal.indicators;
        }
      });
    }
    
    // Return signals with pagination info
    return res.status(200).json({
      signals,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: totalCount > (parseInt(offset) + parseInt(limit)),
        page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        total_pages: Math.ceil(totalCount / parseInt(limit))
      },
      filters_applied: Object.entries(filterOptions)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
    });
  } catch (error) {
    console.error(`Error getting recent signals: ${error.message}`);
    return res.status(500).json({ 
      error: 'Error getting recent signals', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}