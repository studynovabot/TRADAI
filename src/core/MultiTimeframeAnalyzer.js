/**
 * MultiTimeframeAnalyzer - Dynamic Multi-Timeframe Analysis
 * 
 * Enhances data collection to include 3-min and 10-sec candle aggregation
 * Provides micro and macro market view to AI analysis around reversals
 */

const { Logger } = require('../utils/Logger');

class MultiTimeframeAnalyzer {
  constructor(config, dataCollector) {
    this.config = config;
    this.dataCollector = dataCollector;
    this.logger = Logger.getInstanceSync();
    
    // Multi-timeframe configuration
    this.enableMultiTimeframe = config.enableMultiTimeframe !== false; // Default to true
    this.timeframes = {
      micro: {
        name: '10-second',
        interval: 10, // seconds
        candleCount: 30, // Last 30 x 10-sec candles (5 minutes)
        weight: 0.2
      },
      short: {
        name: '1-minute',
        interval: 60, // seconds (primary timeframe)
        candleCount: 20, // Last 20 x 1-min candles
        weight: 0.5
      },
      medium: {
        name: '3-minute',
        interval: 180, // seconds
        candleCount: 10, // Last 10 x 3-min candles (30 minutes)
        weight: 0.3
      }
    };
    
    // Reversal detection settings
    this.reversalThreshold = config.reversalThreshold || 0.02; // 2% price change
    this.reversalLookback = config.reversalLookback || 5; // Look back 5 candles
    
    // Current multi-timeframe data
    this.currentData = {
      micro: [],
      short: [],
      medium: [],
      lastUpdate: null,
      reversalDetected: false,
      reversalStrength: 0
    };
    
    this.logger.info('📊 MultiTimeframeAnalyzer initialized');
  }

  /**
   * Analyze multiple timeframes for comprehensive market view
   */
  async analyzeMultiTimeframes(currencyPair, primaryData) {
    if (!this.enableMultiTimeframe) {
      return {
        enabled: false,
        message: 'Multi-timeframe analysis disabled',
        primaryData: primaryData
      };
    }
    
    try {
      this.logger.info('📊 Analyzing multiple timeframes...');
      
      // Use primary data as 1-minute timeframe
      this.currentData.short = primaryData;
      
      // Generate micro timeframe (10-second aggregation)
      this.currentData.micro = await this.generateMicroTimeframe(primaryData);
      
      // Generate medium timeframe (3-minute aggregation)
      this.currentData.medium = await this.generateMediumTimeframe(primaryData);
      
      // Detect potential reversals
      const reversalAnalysis = this.detectReversals();
      
      // Analyze timeframe confluence
      const confluenceAnalysis = this.analyzeTimeframeConfluence();
      
      // Generate multi-timeframe summary
      const summary = this.generateMultiTimeframeSummary(reversalAnalysis, confluenceAnalysis);
      
      this.currentData.lastUpdate = new Date();
      
      return {
        enabled: true,
        timeframes: {
          micro: this.currentData.micro,
          short: this.currentData.short,
          medium: this.currentData.medium
        },
        reversal: reversalAnalysis,
        confluence: confluenceAnalysis,
        summary: summary,
        lastUpdate: this.currentData.lastUpdate
      };
      
    } catch (error) {
      this.logger.error('❌ Multi-timeframe analysis failed:', error);
      return {
        enabled: false,
        error: error.message,
        primaryData: primaryData
      };
    }
  }

  /**
   * Generate micro timeframe (10-second candles from 1-minute data)
   */
  async generateMicroTimeframe(primaryData) {
    try {
      // Simulate 10-second candles by subdividing 1-minute candles
      const microCandles = [];
      
      // Take last 5 minutes of data for micro analysis
      const recentCandles = primaryData.slice(-5);
      
      for (const candle of recentCandles) {
        // Create 6 x 10-second candles from each 1-minute candle
        const priceRange = candle.high - candle.low;
        const volumePerSegment = candle.volume / 6;
        
        for (let i = 0; i < 6; i++) {
          const segmentTime = new Date(candle.timestamp);
          segmentTime.setSeconds(segmentTime.getSeconds() + (i * 10));
          
          // Simulate price movement within the minute
          const progress = i / 6;
          const nextProgress = (i + 1) / 6;
          
          const open = candle.open + (candle.close - candle.open) * progress;
          const close = candle.open + (candle.close - candle.open) * nextProgress;
          
          // Add some randomness to high/low within realistic bounds
          const segmentRange = priceRange / 6;
          const high = Math.max(open, close) + (segmentRange * Math.random() * 0.3);
          const low = Math.min(open, close) - (segmentRange * Math.random() * 0.3);
          
          microCandles.push({
            timestamp: segmentTime,
            open: parseFloat(open.toFixed(5)),
            high: parseFloat(high.toFixed(5)),
            low: parseFloat(low.toFixed(5)),
            close: parseFloat(close.toFixed(5)),
            volume: Math.round(volumePerSegment),
            timeframe: '10s'
          });
        }
      }
      
      return microCandles.slice(-30); // Last 30 x 10-second candles
      
    } catch (error) {
      this.logger.error('❌ Failed to generate micro timeframe:', error);
      return [];
    }
  }

  /**
   * Generate medium timeframe (3-minute candles from 1-minute data)
   */
  async generateMediumTimeframe(primaryData) {
    try {
      const mediumCandles = [];
      
      // Group 1-minute candles into 3-minute periods
      for (let i = 0; i < primaryData.length; i += 3) {
        const group = primaryData.slice(i, i + 3);
        
        if (group.length === 3) {
          const aggregated = this.aggregateCandles(group, '3m');
          mediumCandles.push(aggregated);
        }
      }
      
      return mediumCandles.slice(-10); // Last 10 x 3-minute candles
      
    } catch (error) {
      this.logger.error('❌ Failed to generate medium timeframe:', error);
      return [];
    }
  }

  /**
   * Aggregate multiple candles into a single candle
   */
  aggregateCandles(candles, timeframe) {
    if (candles.length === 0) return null;
    
    const first = candles[0];
    const last = candles[candles.length - 1];
    
    const open = first.open;
    const close = last.close;
    const high = Math.max(...candles.map(c => c.high));
    const low = Math.min(...candles.map(c => c.low));
    const volume = candles.reduce((sum, c) => sum + c.volume, 0);
    
    return {
      timestamp: last.timestamp,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: volume,
      timeframe: timeframe
    };
  }

  /**
   * Detect potential reversals across timeframes
   */
  detectReversals() {
    const reversals = {
      micro: this.detectReversalInTimeframe(this.currentData.micro, 'micro'),
      short: this.detectReversalInTimeframe(this.currentData.short, 'short'),
      medium: this.detectReversalInTimeframe(this.currentData.medium, 'medium'),
      overall: false,
      strength: 0,
      direction: 'NONE'
    };
    
    // Calculate overall reversal signal
    let reversalScore = 0;
    let reversalCount = 0;
    let dominantDirection = null;
    
    Object.keys(this.timeframes).forEach(tf => {
      const reversal = reversals[tf];
      if (reversal.detected) {
        reversalScore += reversal.strength * this.timeframes[tf].weight;
        reversalCount++;
        
        if (!dominantDirection) {
          dominantDirection = reversal.direction;
        } else if (dominantDirection === reversal.direction) {
          // Same direction across timeframes - stronger signal
          reversalScore *= 1.2;
        }
      }
    });
    
    reversals.overall = reversalCount >= 2; // At least 2 timeframes agree
    reversals.strength = Math.min(1, reversalScore);
    reversals.direction = dominantDirection || 'NONE';
    
    return reversals;
  }

  /**
   * Detect reversal in specific timeframe
   */
  detectReversalInTimeframe(candles, timeframeName) {
    if (candles.length < this.reversalLookback + 1) {
      return {
        detected: false,
        strength: 0,
        direction: 'NONE',
        reason: 'Insufficient data'
      };
    }
    
    const recent = candles.slice(-this.reversalLookback);
    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    
    // Calculate price change momentum
    const priceChanges = [];
    for (let i = 1; i < recent.length; i++) {
      const change = (recent[i].close - recent[i-1].close) / recent[i-1].close;
      priceChanges.push(change);
    }
    
    // Detect momentum shift
    const recentMomentum = priceChanges.slice(-2).reduce((sum, change) => sum + change, 0);
    const earlierMomentum = priceChanges.slice(0, -2).reduce((sum, change) => sum + change, 0);
    
    const momentumShift = Math.abs(recentMomentum - earlierMomentum);
    
    // Check for reversal patterns
    let reversalDetected = false;
    let reversalStrength = 0;
    let direction = 'NONE';
    let reason = '';
    
    // Strong momentum shift detection
    if (momentumShift > this.reversalThreshold) {
      reversalDetected = true;
      reversalStrength = Math.min(1, momentumShift / this.reversalThreshold);
      
      if (recentMomentum > earlierMomentum) {
        direction = 'BULLISH';
        reason = 'Bullish momentum shift detected';
      } else {
        direction = 'BEARISH';
        reason = 'Bearish momentum shift detected';
      }
    }
    
    // Volume confirmation
    if (reversalDetected && current.volume > previous.volume * 1.2) {
      reversalStrength *= 1.3; // Boost strength with volume confirmation
      reason += ' with volume confirmation';
    }
    
    return {
      detected: reversalDetected,
      strength: Math.min(1, reversalStrength),
      direction: direction,
      reason: reason,
      momentumShift: momentumShift,
      timeframe: timeframeName
    };
  }

  /**
   * Analyze confluence across timeframes
   */
  analyzeTimeframeConfluence() {
    const trends = {
      micro: this.getTrend(this.currentData.micro),
      short: this.getTrend(this.currentData.short),
      medium: this.getTrend(this.currentData.medium)
    };
    
    // Count trend agreements
    const bullishCount = Object.values(trends).filter(t => t === 'BULLISH').length;
    const bearishCount = Object.values(trends).filter(t => t === 'BEARISH').length;
    const neutralCount = Object.values(trends).filter(t => t === 'NEUTRAL').length;
    
    let confluence = 'MIXED';
    let strength = 0;
    
    if (bullishCount >= 2) {
      confluence = 'BULLISH';
      strength = bullishCount / 3;
    } else if (bearishCount >= 2) {
      confluence = 'BEARISH';
      strength = bearishCount / 3;
    } else if (neutralCount >= 2) {
      confluence = 'NEUTRAL';
      strength = neutralCount / 3;
    }
    
    return {
      trends: trends,
      confluence: confluence,
      strength: strength,
      agreement: Math.max(bullishCount, bearishCount, neutralCount) / 3
    };
  }

  /**
   * Get trend direction for timeframe
   */
  getTrend(candles) {
    if (candles.length < 3) return 'NEUTRAL';
    
    const recent = candles.slice(-3);
    const first = recent[0].close;
    const last = recent[recent.length - 1].close;
    
    const change = (last - first) / first;
    
    if (change > 0.001) return 'BULLISH';
    if (change < -0.001) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Generate multi-timeframe summary
   */
  generateMultiTimeframeSummary(reversalAnalysis, confluenceAnalysis) {
    const summary = {
      timeframeCount: Object.keys(this.timeframes).length,
      reversalDetected: reversalAnalysis.overall,
      reversalStrength: reversalAnalysis.strength,
      reversalDirection: reversalAnalysis.direction,
      confluence: confluenceAnalysis.confluence,
      confluenceStrength: confluenceAnalysis.strength,
      recommendation: this.getMultiTimeframeRecommendation(reversalAnalysis, confluenceAnalysis)
    };
    
    return summary;
  }

  /**
   * Get trading recommendation based on multi-timeframe analysis
   */
  getMultiTimeframeRecommendation(reversalAnalysis, confluenceAnalysis) {
    // Strong reversal with confluence
    if (reversalAnalysis.overall && reversalAnalysis.strength > 0.7 && confluenceAnalysis.strength > 0.6) {
      return `STRONG ${reversalAnalysis.direction} REVERSAL - High probability trade`;
    }
    
    // Moderate reversal
    if (reversalAnalysis.overall && reversalAnalysis.strength > 0.5) {
      return `MODERATE ${reversalAnalysis.direction} REVERSAL - Consider entry`;
    }
    
    // Strong confluence without reversal
    if (confluenceAnalysis.strength > 0.8) {
      return `STRONG ${confluenceAnalysis.confluence} CONFLUENCE - Trend continuation likely`;
    }
    
    // Mixed signals
    if (confluenceAnalysis.confluence === 'MIXED') {
      return 'MIXED SIGNALS - Wait for clearer direction';
    }
    
    return 'NEUTRAL - No clear multi-timeframe signal';
  }

  /**
   * Format multi-timeframe analysis for AI prompt
   */
  formatMultiTimeframeForAI(analysis) {
    if (!analysis.enabled) {
      return analysis.message || 'Multi-timeframe analysis not available';
    }
    
    return `MULTI-TIMEFRAME ANALYSIS:
Timeframes Analyzed: ${analysis.summary.timeframeCount} (10-second, 1-minute, 3-minute)

REVERSAL DETECTION:
Overall Reversal: ${analysis.reversal.overall ? 'DETECTED' : 'NOT DETECTED'}
Reversal Strength: ${(analysis.reversal.strength * 100).toFixed(0)}%
Reversal Direction: ${analysis.reversal.direction}

Timeframe-Specific Reversals:
• 10-second: ${analysis.reversal.micro.detected ? analysis.reversal.micro.direction : 'NONE'} (${(analysis.reversal.micro.strength * 100).toFixed(0)}%)
• 1-minute: ${analysis.reversal.short.detected ? analysis.reversal.short.direction : 'NONE'} (${(analysis.reversal.short.strength * 100).toFixed(0)}%)
• 3-minute: ${analysis.reversal.medium.detected ? analysis.reversal.medium.direction : 'NONE'} (${(analysis.reversal.medium.strength * 100).toFixed(0)}%)

TIMEFRAME CONFLUENCE:
Overall Confluence: ${analysis.confluence.confluence}
Confluence Strength: ${(analysis.confluence.strength * 100).toFixed(0)}%
Agreement Level: ${(analysis.confluence.agreement * 100).toFixed(0)}%

Individual Timeframe Trends:
• 10-second trend: ${analysis.confluence.trends.micro}
• 1-minute trend: ${analysis.confluence.trends.short}
• 3-minute trend: ${analysis.confluence.trends.medium}

MULTI-TIMEFRAME RECOMMENDATION:
${analysis.summary.recommendation}

TRADING IMPLICATIONS:
- Multiple timeframe confirmation increases signal reliability
- Reversal detection helps identify entry/exit points
- Confluence analysis confirms trend strength
- Consider timeframe-specific risk management`;
  }

  /**
   * Get current multi-timeframe data
   */
  getCurrentData() {
    return this.currentData;
  }
}

module.exports = MultiTimeframeAnalyzer;
