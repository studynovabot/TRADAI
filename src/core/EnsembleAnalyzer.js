/**
 * EnsembleAnalyzer - Multi-Prompt AI Ensemble System
 * 
 * Implements ensemble voting with multiple AI prompts to reduce prompt noise
 * and increase signal reliability through consensus-based decision making
 */

const { Logger } = require('../utils/Logger');

class EnsembleAnalyzer {
  constructor(aiAnalyzer) {
    this.aiAnalyzer = aiAnalyzer;
    this.logger = Logger.getInstanceSync();
    
    // Ensemble configuration
    this.ensembleSize = 5; // Number of different prompts
    this.consensusThreshold = 0.6; // 60% agreement required
    this.confidenceBoost = 10; // Boost confidence when consensus reached
    
    this.logger.info('🎯 EnsembleAnalyzer initialized with 5-prompt voting system');
  }

  /**
   * Generate ensemble decision using multiple prompt perspectives
   */
  async generateEnsembleDecision(currencyPair, technicalData, marketData) {
    try {
      this.logger.info(`🎯 Generating ensemble decision for ${currencyPair}...`);
      
      // Generate multiple AI decisions with different prompt styles
      const decisions = await Promise.all([
        this.getConservativeDecision(currencyPair, technicalData, marketData),
        this.getAggressiveDecision(currencyPair, technicalData, marketData),
        this.getTechnicalFocusedDecision(currencyPair, technicalData, marketData),
        this.getRiskAwareDecision(currencyPair, technicalData, marketData),
        this.getPatternFocusedDecision(currencyPair, technicalData, marketData)
      ]);

      // Analyze ensemble results
      const ensembleResult = this.analyzeEnsemble(decisions);
      
      this.logger.info(`🎯 Ensemble analysis complete: ${ensembleResult.decision} (${ensembleResult.confidence}% confidence)`);
      
      return ensembleResult;
      
    } catch (error) {
      this.logger.error('❌ Ensemble analysis failed:', error);
      throw error;
    }
  }

  /**
   * Conservative trading perspective - emphasizes risk management
   */
  async getConservativeDecision(currencyPair, technicalData, marketData) {
    const prompt = this.createConservativePrompt(currencyPair, technicalData, marketData);
    return await this.aiAnalyzer.queryAI(prompt, 'conservative');
  }

  /**
   * Aggressive trading perspective - emphasizes profit opportunities
   */
  async getAggressiveDecision(currencyPair, technicalData, marketData) {
    const prompt = this.createAggressivePrompt(currencyPair, technicalData, marketData);
    return await this.aiAnalyzer.queryAI(prompt, 'aggressive');
  }

  /**
   * Technical analysis focused perspective
   */
  async getTechnicalFocusedDecision(currencyPair, technicalData, marketData) {
    const prompt = this.createTechnicalPrompt(currencyPair, technicalData, marketData);
    return await this.aiAnalyzer.queryAI(prompt, 'technical');
  }

  /**
   * Risk-aware perspective - emphasizes market conditions
   */
  async getRiskAwareDecision(currencyPair, technicalData, marketData) {
    const prompt = this.createRiskAwarePrompt(currencyPair, technicalData, marketData);
    return await this.aiAnalyzer.queryAI(prompt, 'risk-aware');
  }

  /**
   * Pattern recognition focused perspective
   */
  async getPatternFocusedDecision(currencyPair, technicalData, marketData) {
    const prompt = this.createPatternPrompt(currencyPair, technicalData, marketData);
    return await this.aiAnalyzer.queryAI(prompt, 'pattern');
  }

  /**
   * Create conservative trading prompt
   */
  createConservativePrompt(currencyPair, technicalData, marketData) {
    return `You are a conservative forex trader analyzing ${currencyPair} for a 5-minute binary options trade.

PRIORITY: Risk management and capital preservation over aggressive profits.

MARKET DATA:
${this.formatMarketData(marketData)}

TECHNICAL INDICATORS:
${this.formatTechnicalData(technicalData)}

CONSERVATIVE TRADING RULES:
- Only trade with 80%+ confidence signals
- Avoid trading during high volatility periods
- Require multiple confirming indicators
- Prefer established trends over reversals
- Exit quickly if market conditions change

Analyze the data with extreme caution. Only recommend trades with strong confirmation from multiple indicators and low risk of significant loss.

Respond in JSON format:
{
  "decision": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "reason": "Conservative analysis focusing on risk management",
  "marketSuitability": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "keyFactors": ["list", "of", "conservative", "factors"],
  "timeframe": "5-minute recommendation"
}`;
  }

  /**
   * Create aggressive trading prompt
   */
  createAggressivePrompt(currencyPair, technicalData, marketData) {
    return `You are an aggressive forex trader analyzing ${currencyPair} for a 5-minute binary options trade.

PRIORITY: Maximizing profit opportunities and capturing market momentum.

MARKET DATA:
${this.formatMarketData(marketData)}

TECHNICAL INDICATORS:
${this.formatTechnicalData(technicalData)}

AGGRESSIVE TRADING RULES:
- Trade on 60%+ confidence signals
- Capitalize on volatility and momentum
- Take advantage of breakouts and reversals
- Act quickly on emerging patterns
- Focus on high-reward opportunities

Analyze the data for profit opportunities. Look for momentum, breakouts, and strong directional moves that could generate significant returns.

Respond in JSON format:
{
  "decision": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "reason": "Aggressive analysis focusing on profit maximization",
  "marketSuitability": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "keyFactors": ["list", "of", "aggressive", "factors"],
  "timeframe": "5-minute recommendation"
}`;
  }

  /**
   * Create technical analysis focused prompt
   */
  createTechnicalPrompt(currencyPair, technicalData, marketData) {
    return `You are a technical analysis expert analyzing ${currencyPair} for a 5-minute binary options trade.

FOCUS: Pure technical indicator analysis and mathematical signals.

MARKET DATA:
${this.formatMarketData(marketData)}

TECHNICAL INDICATORS:
${this.formatTechnicalData(technicalData)}

TECHNICAL ANALYSIS RULES:
- Base decisions purely on indicator signals
- Look for convergence/divergence patterns
- Analyze momentum and trend strength
- Consider overbought/oversold conditions
- Evaluate support/resistance levels

Provide a purely technical analysis based on mathematical indicators. Ignore market sentiment and focus on what the numbers tell you.

Respond in JSON format:
{
  "decision": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "reason": "Technical analysis based on mathematical indicators",
  "marketSuitability": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "keyFactors": ["list", "of", "technical", "factors"],
  "timeframe": "5-minute recommendation"
}`;
  }

  /**
   * Create risk-aware prompt
   */
  createRiskAwarePrompt(currencyPair, technicalData, marketData) {
    return `You are a risk management specialist analyzing ${currencyPair} for a 5-minute binary options trade.

FOCUS: Market conditions, volatility assessment, and risk evaluation.

MARKET DATA:
${this.formatMarketData(marketData)}

TECHNICAL INDICATORS:
${this.formatTechnicalData(technicalData)}

RISK ASSESSMENT RULES:
- Evaluate current market volatility
- Assess liquidity and spread conditions
- Consider time-of-day effects
- Analyze trend stability
- Factor in potential market disruptions

Focus on whether market conditions are suitable for trading. Consider volatility, liquidity, and stability factors that could affect trade outcomes.

Respond in JSON format:
{
  "decision": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "reason": "Risk assessment focusing on market conditions",
  "marketSuitability": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "keyFactors": ["list", "of", "risk", "factors"],
  "timeframe": "5-minute recommendation"
}`;
  }

  /**
   * Create pattern recognition focused prompt
   */
  createPatternPrompt(currencyPair, technicalData, marketData) {
    return `You are a pattern recognition expert analyzing ${currencyPair} for a 5-minute binary options trade.

FOCUS: Candlestick patterns, chart formations, and price action signals.

MARKET DATA:
${this.formatMarketData(marketData)}

TECHNICAL INDICATORS:
${this.formatTechnicalData(technicalData)}

PATTERN ANALYSIS RULES:
- Identify candlestick patterns and their reliability
- Look for chart formations (triangles, flags, etc.)
- Analyze price action and market structure
- Consider pattern completion and confirmation
- Evaluate pattern strength and context

Focus on visual patterns and price action. Look for completed patterns that suggest directional moves in the next 5 minutes.

Respond in JSON format:
{
  "decision": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "reason": "Pattern analysis focusing on price action",
  "marketSuitability": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "keyFactors": ["list", "of", "pattern", "factors"],
  "timeframe": "5-minute recommendation"
}`;
  }

  /**
   * Format market data for prompts
   */
  formatMarketData(marketData) {
    if (!marketData || marketData.length === 0) return 'No market data available';
    
    const latest = marketData[marketData.length - 1];
    const previous = marketData[marketData.length - 2];
    
    if (!latest || !previous) return 'Insufficient market data';
    
    const priceChange = latest.close - previous.close;
    const priceChangePercent = ((priceChange / previous.close) * 100);
    
    return `Current Price: ${latest.close}
Price Change: ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(4)}%
Volume: ${latest.volume}
High: ${latest.high}
Low: ${latest.low}
Open: ${latest.open}`;
  }

  /**
   * Format technical data for prompts
   */
  formatTechnicalData(technicalData) {
    if (!technicalData) return 'No technical data available';
    
    let formatted = '';
    
    if (technicalData.rsi) {
      formatted += `RSI(14): ${technicalData.rsi.current?.toFixed(2)} (${technicalData.rsi.signal})\n`;
    }
    
    if (technicalData.macd) {
      formatted += `MACD: ${technicalData.macd.signal} (Histogram: ${technicalData.macd.histogram?.toFixed(4)})\n`;
    }
    
    if (technicalData.bollingerBands) {
      formatted += `Bollinger Bands: ${technicalData.bollingerBands.position} (Squeeze: ${technicalData.bollingerBands.squeeze})\n`;
    }
    
    if (technicalData.stochastic) {
      formatted += `Stochastic: ${technicalData.stochastic.signal} (K: ${technicalData.stochastic.k?.toFixed(2)}, D: ${technicalData.stochastic.d?.toFixed(2)})\n`;
    }
    
    if (technicalData.volume) {
      formatted += `Volume Analysis: ${technicalData.volume.trend} (${technicalData.volume.strength})\n`;
    }
    
    if (technicalData.patterns && technicalData.patterns.detected.length > 0) {
      formatted += `Patterns: ${technicalData.patterns.detected.join(', ')}\n`;
    }
    
    return formatted;
  }

  /**
   * Analyze ensemble results and determine consensus
   */
  analyzeEnsemble(decisions) {
    try {
      // Filter out failed decisions
      const validDecisions = decisions.filter(d => d && d.decision);

      if (validDecisions.length === 0) {
        return {
          decision: 'NO_TRADE',
          confidence: 0,
          reason: 'No valid decisions from ensemble',
          marketSuitability: 'POOR',
          riskLevel: 'HIGH',
          keyFactors: ['Ensemble analysis failed'],
          ensembleStats: {
            totalPrompts: this.ensembleSize,
            validResponses: 0,
            consensus: false,
            agreement: 0
          }
        };
      }

      // Count votes for each decision
      const votes = {
        BUY: validDecisions.filter(d => d.decision === 'BUY').length,
        SELL: validDecisions.filter(d => d.decision === 'SELL').length,
        NO_TRADE: validDecisions.filter(d => d.decision === 'NO_TRADE').length
      };

      // Determine winning decision
      const totalVotes = validDecisions.length;
      const maxVotes = Math.max(votes.BUY, votes.SELL, votes.NO_TRADE);
      const agreement = maxVotes / totalVotes;

      let winningDecision;
      if (votes.BUY === maxVotes) winningDecision = 'BUY';
      else if (votes.SELL === maxVotes) winningDecision = 'SELL';
      else winningDecision = 'NO_TRADE';

      // Check if consensus threshold is met
      const consensusReached = agreement >= this.consensusThreshold;

      // If no consensus, default to NO_TRADE
      if (!consensusReached && winningDecision !== 'NO_TRADE') {
        winningDecision = 'NO_TRADE';
      }

      // Calculate ensemble confidence
      const avgConfidence = validDecisions
        .filter(d => d.decision === winningDecision)
        .reduce((sum, d) => sum + (d.confidence || 0), 0) /
        validDecisions.filter(d => d.decision === winningDecision).length;

      // Boost confidence if strong consensus
      let finalConfidence = avgConfidence || 0;
      if (consensusReached && agreement > 0.8) {
        finalConfidence = Math.min(100, finalConfidence + this.confidenceBoost);
      }

      // Aggregate other metrics
      const riskLevels = validDecisions.map(d => d.riskLevel).filter(r => r);
      const marketSuitabilities = validDecisions.map(d => d.marketSuitability).filter(m => m);

      const avgRiskLevel = this.getMostCommon(riskLevels) || 'MEDIUM';
      const avgMarketSuitability = this.getMostCommon(marketSuitabilities) || 'FAIR';

      // Combine key factors
      const allFactors = validDecisions.flatMap(d => d.keyFactors || []);
      const uniqueFactors = [...new Set(allFactors)];

      // Create ensemble reasoning
      const ensembleReason = this.createEnsembleReason(validDecisions, votes, agreement, consensusReached);

      return {
        decision: winningDecision,
        confidence: Math.round(finalConfidence),
        reason: ensembleReason,
        marketSuitability: avgMarketSuitability,
        riskLevel: avgRiskLevel,
        keyFactors: uniqueFactors.slice(0, 5), // Top 5 factors
        timeframe: '5-minute recommendation',
        ensembleStats: {
          totalPrompts: this.ensembleSize,
          validResponses: validDecisions.length,
          consensus: consensusReached,
          agreement: Math.round(agreement * 100),
          votes: votes,
          perspectives: validDecisions.map(d => ({
            decision: d.decision,
            confidence: d.confidence,
            reason: d.reason?.substring(0, 100) + '...'
          }))
        }
      };

    } catch (error) {
      this.logger.error('❌ Ensemble analysis error:', error);
      return {
        decision: 'NO_TRADE',
        confidence: 0,
        reason: 'Ensemble analysis failed due to error',
        marketSuitability: 'POOR',
        riskLevel: 'HIGH',
        keyFactors: ['Analysis error'],
        ensembleStats: {
          totalPrompts: this.ensembleSize,
          validResponses: 0,
          consensus: false,
          agreement: 0,
          error: error.message
        }
      };
    }
  }

  /**
   * Get most common value from array
   */
  getMostCommon(arr) {
    if (!arr || arr.length === 0) return null;

    const counts = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  /**
   * Create ensemble reasoning explanation
   */
  createEnsembleReason(decisions, votes, agreement, consensusReached) {
    const totalDecisions = decisions.length;
    const agreementPercent = Math.round(agreement * 100);

    let reason = `Ensemble analysis of ${totalDecisions} AI perspectives: `;

    if (consensusReached) {
      reason += `Strong consensus reached (${agreementPercent}% agreement). `;
    } else {
      reason += `No clear consensus (${agreementPercent}% agreement), defaulting to NO_TRADE for safety. `;
    }

    reason += `Voting breakdown: ${votes.BUY} BUY, ${votes.SELL} SELL, ${votes.NO_TRADE} NO_TRADE. `;

    // Add perspective summary
    const perspectives = ['Conservative', 'Aggressive', 'Technical', 'Risk-Aware', 'Pattern'];
    const perspectiveResults = decisions.map((d, i) => `${perspectives[i]}: ${d.decision}`);
    reason += `Perspectives: ${perspectiveResults.join(', ')}.`;

    return reason;
  }
}

module.exports = EnsembleAnalyzer;
