/**
 * Get Performance Statistics API Endpoint
 * 
 * Retrieves comprehensive performance statistics for trading signals
 * with filtering options for detailed analysis
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
      days,
      symbol, 
      timeframe, 
      start_date, 
      end_date,
      min_confidence,
      max_confidence,
      pattern,
      result
    } = req.query;
    
    // For backward compatibility
    const period = days ? parseInt(days) : 30;
    
    // Build filter options
    const filterOptions = {
      period,
      symbol,
      timeframe,
      startDate: start_date,
      endDate: end_date,
      minConfidence: min_confidence ? parseInt(min_confidence) : undefined,
      maxConfidence: max_confidence ? parseInt(max_confidence) : undefined,
      pattern,
      result: result ? result.toUpperCase() : undefined
    };
    
    // Get enhanced performance statistics with filters
    const stats = await performanceTracker.getPerformanceStats(filterOptions);
    
    // Format response with detailed statistics
    const response = {
      overall_stats: {
        total_signals: stats.totalSignals,
        win_rate: stats.winRate,
        profit_factor: stats.profitFactor,
        wins: stats.wins,
        losses: stats.losses,
        breakeven: stats.breakeven,
        cancelled: stats.cancelled,
        average_profit: stats.averageProfit,
        total_profit: stats.totalProfit,
        largest_win: stats.largestWin,
        largest_loss: stats.largestLoss,
        average_win: stats.averageWin,
        average_loss: stats.averageLoss,
        expectancy: stats.expectancy
      },
      by_symbol: stats.bySymbol || {},
      by_timeframe: stats.byTimeframe || {},
      by_confidence: stats.byConfidence || {},
      by_pattern: stats.byPattern || {},
      by_day_of_week: stats.byDayOfWeek || {},
      by_hour_of_day: stats.byHourOfDay || {},
      recent_performance: stats.recentPerformance || [],
      
      // Include filter information
      filters_applied: Object.entries(filterOptions)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
    };
    
    // Return enhanced statistics
    return res.status(200).json(response);
  } catch (error) {
    console.error(`Error getting performance statistics: ${error.message}`);
    return res.status(500).json({ 
      error: 'Error getting performance statistics', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}