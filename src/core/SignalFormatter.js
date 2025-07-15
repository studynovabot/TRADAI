/**
 * SignalFormatter - Professional Trading Signal Output Formatter
 * 
 * Formats AI trading decisions into professional signal output for manual execution
 * Includes comprehensive technical analysis summary and clear action recommendations
 */

const moment = require('moment');
const { Logger } = require('../utils/Logger');

class SignalFormatter {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    this.signalCount = 0;
    
    this.logger.info('📊 SignalFormatter initialized');
  }
  
  /**
   * Format a complete trading signal for output
   */
  formatSignal(signalData) {
    try {
      const {
        currencyPair,
        aiDecision,
        technicalData,
        marketData,
        timestamp = new Date()
      } = signalData;
      
      this.signalCount++;
      
      // Create formatted signal
      const signal = {
        id: this.signalCount,
        timestamp: timestamp,
        pair: currencyPair,
        direction: this.formatDirection(aiDecision.decision),
        confidence: aiDecision.confidence,
        reasoning: aiDecision.reason,
        technicalSummary: this.createTechnicalSummary(technicalData),
        marketContext: this.createMarketContext(marketData),
        recommendation: this.createRecommendation(aiDecision),
        formattedOutput: ''
      };
      
      // Generate formatted output
      signal.formattedOutput = this.generateFormattedOutput(signal);
      
      return signal;
      
    } catch (error) {
      this.logger.error('❌ Error formatting signal:', error);
      throw error;
    }
  }
  
  /**
   * Format direction with emojis and clear text
   */
  formatDirection(decision) {
    const directions = {
      'BUY': { emoji: '📈', text: 'BUY (UP)', color: '\x1b[32m' }, // Green
      'SELL': { emoji: '📉', text: 'SELL (DOWN)', color: '\x1b[31m' }, // Red
      'HOLD': { emoji: '⏸️', text: 'NO TRADE', color: '\x1b[33m' }, // Yellow
      'NO_TRADE': { emoji: '⏸️', text: 'NO TRADE', color: '\x1b[33m' }
    };
    
    return directions[decision] || { emoji: '❓', text: decision, color: '\x1b[37m' };
  }
  
  /**
   * Create technical analysis summary
   */
  createTechnicalSummary(technicalData) {
    if (!technicalData) return 'Technical data unavailable';
    
    const summary = [];
    
    // RSI Analysis
    if (technicalData.rsi) {
      const rsi = technicalData.rsi;
      summary.push(`RSI(14): ${rsi.current?.toFixed(1)} (${rsi.signal})`);
    }
    
    // MACD Analysis
    if (technicalData.macd) {
      const macd = technicalData.macd;
      summary.push(`MACD: ${macd.signal} (${macd.histogram > 0 ? 'Bullish' : 'Bearish'})`);
    }
    
    // Bollinger Bands
    if (technicalData.bollingerBands) {
      const bb = technicalData.bollingerBands;
      summary.push(`BB: ${bb.position} (Squeeze: ${bb.squeeze ? 'Yes' : 'No'})`);
    }
    
    // Stochastic
    if (technicalData.stochastic) {
      const stoch = technicalData.stochastic;
      summary.push(`Stoch: ${stoch.signal} (${stoch.k?.toFixed(1)}/${stoch.d?.toFixed(1)})`);
    }
    
    // Volume Analysis
    if (technicalData.volume) {
      const vol = technicalData.volume;
      summary.push(`Volume: ${vol.trend} (${vol.strength})`);
    }
    
    // Candlestick Patterns
    if (technicalData.patterns && technicalData.patterns.detected.length > 0) {
      summary.push(`Patterns: ${technicalData.patterns.detected.join(', ')}`);
    }
    
    return summary.join(' | ');
  }
  
  /**
   * Create market context summary
   */
  createMarketContext(marketData) {
    if (!marketData || marketData.length === 0) return 'No market context';
    
    const latest = marketData[marketData.length - 1];
    const previous = marketData[marketData.length - 2];
    
    if (!latest || !previous) return 'Insufficient market data';
    
    const priceChange = latest.close - previous.close;
    const priceChangePercent = ((priceChange / previous.close) * 100);
    const trend = priceChange > 0 ? '↗️' : priceChange < 0 ? '↘️' : '➡️';
    
    return `Current: ${latest.close} ${trend} ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(3)}%`;
  }
  
  /**
   * Create recommendation text
   */
  createRecommendation(aiDecision) {
    const confidence = aiDecision.confidence;
    let recommendation = '';
    
    if (aiDecision.decision === 'NO_TRADE' || aiDecision.decision === 'HOLD') {
      recommendation = 'Wait for better market conditions';
    } else {
      if (confidence >= 80) {
        recommendation = 'Strong signal - Consider executing trade';
      } else if (confidence >= 70) {
        recommendation = 'Moderate signal - Use caution';
      } else if (confidence >= 60) {
        recommendation = 'Weak signal - Consider waiting';
      } else {
        recommendation = 'Low confidence - Avoid trading';
      }
    }
    
    return recommendation;
  }
  
  /**
   * Generate the complete formatted output
   */
  generateFormattedOutput(signal) {
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const dim = '\x1b[2m';
    
    const header = `${bold}${signal.direction.emoji} Trade Signal #${signal.id} [${moment(signal.timestamp).format('HH:mm:ss')}]${reset}`;
    const separator = '═'.repeat(60);
    
    const output = `
${separator}
${header}
${separator}
${bold}Pair:${reset} ${signal.pair}
${bold}Direction:${reset} ${signal.direction.color}${signal.direction.text}${reset}
${bold}Confidence:${reset} ${signal.confidence}%
${bold}Recommendation:${reset} ${signal.recommendation}
${bold}Duration:${reset} 5 minutes

${bold}AI Reasoning:${reset}
${signal.reasoning}

${bold}Technical Summary:${reset}
${signal.technicalSummary}

${bold}Market Context:${reset}
${signal.marketContext}

${dim}Generated: ${moment(signal.timestamp).format('YYYY-MM-DD HH:mm:ss')}${reset}
${separator}
`;
    
    return output;
  }
  
  /**
   * Format signal for file logging (without colors)
   */
  formatSignalForFile(signal) {
    const timestamp = moment(signal.timestamp).format('YYYY-MM-DD HH:mm:ss');
    
    return `
[${timestamp}] SIGNAL #${signal.id}
Pair: ${signal.pair}
Direction: ${signal.direction.text}
Confidence: ${signal.confidence}%
Recommendation: ${signal.recommendation}
AI Reasoning: ${signal.reasoning}
Technical: ${signal.technicalSummary}
Market: ${signal.marketContext}
---
`;
  }
  
  /**
   * Create CSV format for signal tracking
   */
  formatSignalForCSV(signal) {
    const timestamp = moment(signal.timestamp).format('YYYY-MM-DD HH:mm:ss');
    
    return [
      signal.id,
      timestamp,
      signal.pair,
      signal.direction.text.replace(/[(),]/g, ''),
      signal.confidence,
      signal.recommendation.replace(/,/g, ';'),
      signal.reasoning.replace(/,/g, ';').replace(/\n/g, ' '),
      signal.technicalSummary.replace(/,/g, ';'),
      signal.marketContext.replace(/,/g, ';')
    ].join(',');
  }
  
  /**
   * Get CSV header
   */
  getCSVHeader() {
    return 'ID,Timestamp,Pair,Direction,Confidence,Recommendation,AI_Reasoning,Technical_Summary,Market_Context';
  }
  
  /**
   * Display signal in terminal (main method called by TradingBot)
   */
  displaySignal(signalData) {
    try {
      // Extract data from the comprehensive signal structure
      const {
        timestamp,
        signalNumber,
        currencyPair,
        direction,
        confidence,
        reasoning,
        marketSuitability,
        riskLevel,
        keyFactors,
        timeframe,
        technicalSummary,
        marketData
      } = signalData;

      // Format the signal for display
      const formattedSignal = this.formatSignalForDisplay({
        id: signalNumber,
        timestamp,
        pair: currencyPair,
        direction,
        confidence,
        reasoning,
        marketSuitability,
        riskLevel,
        keyFactors,
        timeframe,
        technicalSummary,
        marketData
      });

      // Display in terminal
      console.log(formattedSignal);

      this.logger.info(`🎯 Signal #${signalNumber} displayed: ${direction} ${currencyPair} (${confidence}%)`);

    } catch (error) {
      this.logger.error('❌ Error displaying signal:', error);
      console.log('❌ Error displaying signal - check logs for details');
    }
  }

  /**
   * Format signal for terminal display with enhanced structure
   */
  formatSignalForDisplay(signal) {
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const dim = '\x1b[2m';
    const green = '\x1b[32m';
    const red = '\x1b[31m';
    const yellow = '\x1b[33m';
    const blue = '\x1b[34m';
    const cyan = '\x1b[36m';

    // Direction formatting
    const directionInfo = this.formatDirectionEnhanced(signal.direction);

    // Risk level colors
    const riskColors = {
      'LOW': green,
      'MEDIUM': yellow,
      'HIGH': red
    };
    const riskColor = riskColors[signal.riskLevel] || reset;

    // Market suitability colors
    const suitabilityColors = {
      'EXCELLENT': green,
      'GOOD': cyan,
      'FAIR': yellow,
      'POOR': red
    };
    const suitabilityColor = suitabilityColors[signal.marketSuitability] || reset;

    const header = `${bold}${directionInfo.emoji} TRADING SIGNAL #${signal.id} ${directionInfo.emoji}${reset}`;
    const separator = '═'.repeat(70);
    const subSeparator = '─'.repeat(70);

    const output = `
${separator}
${header}
${separator}
${bold}📊 SIGNAL OVERVIEW${reset}
${bold}Currency Pair:${reset} ${blue}${signal.pair}${reset}
${bold}Direction:${reset} ${directionInfo.color}${directionInfo.text}${reset}
${bold}Confidence:${reset} ${this.getConfidenceBar(signal.confidence)} ${bold}${signal.confidence}%${reset}
${bold}Market Suitability:${reset} ${suitabilityColor}${signal.marketSuitability}${reset}
${bold}Risk Level:${reset} ${riskColor}${signal.riskLevel}${reset}
${bold}Timeframe:${reset} ${signal.timeframe || '5-minute recommendation'}

${subSeparator}
${bold}🧠 AI REASONING${reset}
${signal.reasoning}

${subSeparator}
${bold}🔍 KEY FACTORS${reset}
${signal.keyFactors ? signal.keyFactors.map(factor => `• ${factor}`).join('\n') : '• Technical analysis'}

${subSeparator}
${bold}📈 TECHNICAL SUMMARY${reset}
${signal.technicalSummary}

${subSeparator}
${bold}💹 MARKET DATA${reset}
${bold}Current Price:${reset} ${signal.marketData.currentPrice}
${bold}Price Change:${reset} ${signal.marketData.priceChange >= 0 ? green : red}${signal.marketData.priceChange >= 0 ? '+' : ''}${signal.marketData.priceChange}%${reset}
${bold}Volume:${reset} ${signal.marketData.volume}

${subSeparator}
${bold}⏰ EXECUTION GUIDANCE${reset}
${bold}Recommended Action:${reset} ${this.getExecutionGuidance(signal)}
${bold}Generated:${reset} ${dim}${moment(signal.timestamp).format('YYYY-MM-DD HH:mm:ss')}${reset}
${separator}
`;

    return output;
  }

  /**
   * Enhanced direction formatting
   */
  formatDirectionEnhanced(direction) {
    const directions = {
      'BUY': { emoji: '🚀', text: 'BUY (CALL/UP)', color: '\x1b[32m\x1b[1m' }, // Bold Green
      'SELL': { emoji: '📉', text: 'SELL (PUT/DOWN)', color: '\x1b[31m\x1b[1m' }, // Bold Red
      'NO_TRADE': { emoji: '⏸️', text: 'NO TRADE (WAIT)', color: '\x1b[33m\x1b[1m' } // Bold Yellow
    };

    return directions[direction] || { emoji: '❓', text: direction, color: '\x1b[37m' };
  }

  /**
   * Create confidence bar visualization
   */
  getConfidenceBar(confidence) {
    const barLength = 20;
    const filledLength = Math.round((confidence / 100) * barLength);
    const emptyLength = barLength - filledLength;

    let color = '\x1b[31m'; // Red for low confidence
    if (confidence >= 70) color = '\x1b[33m'; // Yellow for medium
    if (confidence >= 80) color = '\x1b[32m'; // Green for high

    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);

    return `${color}${filled}${empty}\x1b[0m`;
  }

  /**
   * Get execution guidance based on signal strength
   */
  getExecutionGuidance(signal) {
    const confidence = signal.confidence;
    const suitability = signal.marketSuitability;
    const risk = signal.riskLevel;

    if (signal.direction === 'NO_TRADE') {
      return '⏳ Wait for better market conditions';
    }

    if (confidence >= 80 && suitability === 'EXCELLENT' && risk === 'LOW') {
      return '✅ Strong signal - Execute with confidence';
    } else if (confidence >= 75 && (suitability === 'GOOD' || suitability === 'EXCELLENT')) {
      return '✅ Good signal - Consider executing';
    } else if (confidence >= 70) {
      return '⚠️ Moderate signal - Use smaller position size';
    } else if (confidence >= 60) {
      return '⚠️ Weak signal - Consider waiting for better setup';
    } else {
      return '❌ Low confidence - Avoid trading';
    }
  }

  /**
   * Get signal statistics
   */
  getStats() {
    return {
      totalSignals: this.signalCount,
      startTime: this.startTime || new Date()
    };
  }
}

module.exports = { SignalFormatter };
