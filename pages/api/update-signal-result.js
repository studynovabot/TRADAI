/**
 * Update Signal Result API Endpoint
 * 
 * Records the outcome of a trading signal for performance tracking and analysis
 */

import { SignalPerformanceTracker } from '../../src/utils/SignalPerformanceTracker';

// Initialize performance tracker
const performanceTracker = new SignalPerformanceTracker();

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract parameters from request with enhanced fields
    const { 
      signal_id, 
      result, 
      profit_loss, 
      exit_price, 
      exit_time,
      trade_duration,
      notes
    } = req.body;
    
    // For backward compatibility
    const signalId = signal_id || req.body.signalId;
    const profitLoss = profit_loss || req.body.profitLoss || 0;
    const exitPrice = exit_price || req.body.exitPrice || 0;
    
    if (!signalId) {
      return res.status(400).json({ error: 'Signal ID is required' });
    }
    
    if (!result) {
      return res.status(400).json({ error: 'Result is required' });
    }
    
    // Enhanced result validation with more options
    const validResults = ['WIN', 'LOSS', 'BREAKEVEN', 'EXPIRED', 'CANCELLED'];
    // Convert to uppercase for case-insensitive comparison
    const normalizedResult = result.toUpperCase();
    
    if (!validResults.includes(normalizedResult)) {
      return res.status(400).json({ 
        error: `Result must be one of: ${validResults.join(', ')}` 
      });
    }
    
    // Update the signal result with enhanced data
    const updatedSignal = await performanceTracker.updateSignalResult({
      signalId,
      result: normalizedResult,
      profitLoss,
      exitPrice,
      exitTime: exit_time || new Date().toISOString(),
      tradeDuration: trade_duration,
      notes
    });
    
    if (!updatedSignal) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    
    // Get updated performance stats
    const performanceStats = await performanceTracker.getPerformanceStats();
    
    // Return success with enhanced data
    return res.status(200).json({ 
      success: true,
      message: 'Signal result updated successfully',
      signal: updatedSignal,
      performance_summary: {
        win_rate: performanceStats.winRate,
        total_signals: performanceStats.totalSignals,
        wins: performanceStats.wins,
        losses: performanceStats.losses,
        average_profit: performanceStats.averageProfit
      }
    });
  } catch (error) {
    console.error(`Error updating signal result: ${error.message}`);
    return res.status(500).json({ 
      error: 'Error updating signal result', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}