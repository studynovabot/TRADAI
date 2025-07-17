/**
 * Enhanced Reflex Brain - Layer 3: Lightning-Fast Execution Engine
 * 
 * This module implements an enhanced version of the third layer of the 3-layer AI trading system.
 * It makes split-second execution decisions based on Quant Brain predictions
 * and Analyst Brain validations using Groq-hosted inference for speed.
 */

const { Logger } = require('../utils/Logger');
const Groq = require('groq-sdk');
const fs = require('fs-extra');
const path = require('path');

class EnhancedReflexBrain {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Initialize Groq for ultra-fast inference
    this.groq = config.groqApiKey ? new Groq({ apiKey: config.groqApiKey }) : null;
    
    // Execution configuration
    this.executionConfig = {
      model: 'llama3-8b-8192', // Faster smaller model for quick decisions
      maxTokens: 256,
      temperature: 0.05, // Very low temperature for consistent decisions
      maxResponseTime: 2000, // 2 second max response time
      agreementThreshold: 0.7, // Both brains must agree with 70% confidence
      riskThreshold: 0.6, // Max acceptable risk score
      confluenceThreshold: 50 // Minimum confluence score
    };
    
    // Trade execution rules
    this.executionRules = {
      requireBothBrains: true,
      requireVolumeConfirmation: true,
      requireTrendAlignment: false,
      maxDailyTrades: config.maxDailyTrades || 50,
      maxConsecutiveLosses: config.maxConsecutiveLosses || 3,
      minTimeframeBetweenTrades: 60000, // 1 minute minimum between trades
      minConfluenceScore: 40,
      maxVolatility: 0.03 // 3% max volatility
    };
    
    // Session state tracking
    this.sessionState = {
      tradesExecuted: 0,
      consecutiveLosses: 0,
      lastTradeTime: 0,
      dailyPnL: 0,
      successRate: 0,
      winCount: 0,
      sessionStart: Date.now(),
      lastSignalId: null
    };
    
    // Performance metrics
    this.performanceMetrics = {
      avgDecisionTime: 0,
      totalDecisions: 0,
      executedCount: 0,
      rejectedCount: 0,
      emergencyStops: 0
    };
    
    this.logger.info('⚡ EnhancedReflexBrain initialized');
  }

  /**
   * Main signal evaluation method - evaluates signal quality for manual trading
   */
  async evaluateSignal(signalId, quantPrediction, analystValidation, marketData) {
    const decisionStartTime = Date.now();
    
    try {
      this.performanceMetrics.totalDecisions++;
      
      // Quick pre-flight checks
      const preflightResult = this.performPreflightChecks(quantPrediction, analystValidation, marketData);
      if (!preflightResult.passed) {
        return this.createRejectionResponse('PREFLIGHT_FAILED', preflightResult.reason, decisionStartTime);
      }
      
      // Generate signal evaluation prompt for LLM analysis
      const prompt = this.generateSignalEvaluationPrompt(quantPrediction, analystValidation);
      
      // Get lightning-fast LLM signal evaluation with timeout
      const llmEvaluation = await this.getFastLLMEvaluation(prompt);
      
      // Apply signal quality assessment rules
      const finalEvaluation = this.applySignalQualityRules(llmEvaluation, quantPrediction, analystValidation);
      
      // Generate comprehensive signal result
      const result = this.generateSignalResult(signalId, finalEvaluation, quantPrediction, analystValidation, decisionStartTime);
      
      // Update session state and metrics
      this.updateSessionAndMetrics(result);
      
      const processingTime = Date.now() - decisionStartTime;
      this.logger.info(`⚡ EnhancedReflexBrain signal quality: ${result.signalQuality} (Score: ${result.tradeScore}/100, ${(result.confidence * 100).toFixed(1)}%) in ${processingTime}ms`);
      
      return result;
      
    } catch (error) {
      this.logger.error('❌ EnhancedReflexBrain decision failed:', error);
      
      // Return conservative rejection on error
      return this.createRejectionResponse('SYSTEM_ERROR', error.message, decisionStartTime);
    }
  }

  /**
   * Perform rapid pre-flight checks before LLM analysis
   */
  performPreflightChecks(quantPrediction, analystValidation, marketData) {
    // Check if both brains provided valid outputs
    if (!quantPrediction || !analystValidation) {
      return { passed: false, reason: 'Missing brain outputs' };
    }
    
    // More lenient checks for signal-only mode
    // Only reject on HIGH_RISK, allow NO signals to pass for evaluation
    if (analystValidation.validation === 'HIGH_RISK') {
      return { passed: false, reason: 'Analyst Brain flagged high risk' };
    }
    
    // More lenient confidence thresholds for signal generation
    if (quantPrediction.confidence < 0.3) {
      return { passed: false, reason: `Quant confidence too low: ${(quantPrediction.confidence * 100).toFixed(1)}%` };
    }
    
    if (analystValidation.confidence < 0.2) {
      return { passed: false, reason: `Analyst confidence too low: ${(analystValidation.confidence * 100).toFixed(1)}%` };
    }
    
    // More lenient risk scores
    if (quantPrediction.riskScore > 0.8) {
      return { passed: false, reason: `Risk score too high: ${(quantPrediction.riskScore * 100).toFixed(1)}%` };
    }
    
    // More lenient confluence score for signal generation
    if (analystValidation.confluenceScore < 20) {
      return { passed: false, reason: `Confluence too low: ${analystValidation.confluenceScore}/100` };
    }
    
    // Check session limits
    if (this.sessionState.tradesExecuted >= this.executionRules.maxDailyTrades) {
      return { passed: false, reason: 'Daily trade limit reached' };
    }
    
    if (this.sessionState.consecutiveLosses >= this.executionRules.maxConsecutiveLosses) {
      return { passed: false, reason: 'Maximum consecutive losses reached' };
    }
    
    // Check time between trades
    const timeSinceLastTrade = Date.now() - this.sessionState.lastTradeTime;
    if (timeSinceLastTrade < this.executionRules.minTimeframeBetweenTrades) {
      const remainingTime = Math.ceil((this.executionRules.minTimeframeBetweenTrades - timeSinceLastTrade) / 1000);
      return { passed: false, reason: `Min time between trades: ${remainingTime}s remaining` };
    }
    
    // Check market data freshness
    if (marketData && marketData.lastUpdate) {
      const dataAge = Date.now() - (marketData.lastUpdate['5m'] || 0);
      if (dataAge > 10 * 60 * 1000) { // 10 minutes
        return { passed: false, reason: 'Market data too stale' };
      }
    }
    
    return { passed: true, reason: 'All preflight checks passed' };
  }

  /**
   * Generate signal evaluation prompt for LLM
   */
  generateSignalEvaluationPrompt(quantPrediction, analystValidation) {
    return `BINARY OPTIONS SIGNAL QUALITY EVALUATION

SIGNAL SUMMARY:
Asset: ${quantPrediction.currencyPair || this.config.currencyPair}
Direction: ${quantPrediction.direction}
Timeframe: 5-minute signal

QUANT BRAIN (ML Analysis):
- Prediction: ${quantPrediction.direction}
- Confidence: ${(quantPrediction.confidence * 100).toFixed(1)}%
- Risk Score: ${(quantPrediction.riskScore * 100).toFixed(1)}%
- Key Technical Features: RSI, EMA, MACD, Bollinger Bands, Volume

ANALYST BRAIN (Technical Confluence):
- Validation: ${analystValidation.validation}
- Confidence: ${(analystValidation.confidence * 100).toFixed(1)}%
- Confluence Score: ${analystValidation.confluenceScore}/100
- Technical Reasoning: ${analystValidation.reasoning?.substring(0, 120) || 'Technical analysis completed'}

SIGNAL QUALITY ASSESSMENT:
Evaluate this signal for manual trading decision. Consider:
1. Technical confluence strength (${analystValidation.confluenceScore}/100)
2. AI confidence levels (ML: ${(quantPrediction.confidence * 100).toFixed(1)}%, LLM: ${(analystValidation.confidence * 100).toFixed(1)}%)
3. Risk factors (Risk Score: ${(quantPrediction.riskScore * 100).toFixed(1)}%)
4. Multi-timeframe alignment
5. Volume confirmation and market structure

TASK: Rate this signal's quality for binary options trading and provide detailed reasoning.

Respond ONLY in this format:
QUALITY: [EXCELLENT/GOOD/FAIR/POOR]
CONFIDENCE: [0-100]
TRADE_SCORE: [0-100]
REASON: [Detailed explanation of signal quality and key factors]

Example:
QUALITY: EXCELLENT
CONFIDENCE: 88
TRADE_SCORE: 85
REASON: Strong bullish confluence across multiple timeframes with RSI oversold bounce, EMA alignment, MACD bullish crossover, and volume confirmation. Low risk environment with clear technical setup.`;
  }

  /**
   * Get lightning-fast LLM signal evaluation using Groq
   */
  async getFastLLMEvaluation(prompt) {
    if (!this.groq) {
      // Fallback to rule-based evaluation if Groq not available
      return this.getFallbackEvaluation(prompt);
    }
    
    const startTime = Date.now();
    
    try {
      const response = await Promise.race([
        this.groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: this.executionConfig.model,
          max_tokens: this.executionConfig.maxTokens,
          temperature: this.executionConfig.temperature
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('LLM response timeout')), this.executionConfig.maxResponseTime)
        )
      ]);
      
      const responseTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';
      
      // Parse the fast response
      const evaluation = this.parseFastResponse(content);
      
      this.logger.debug(`⚡ Fast LLM evaluation in ${responseTime}ms: ${evaluation.quality}`);
      
      return {
        ...evaluation,
        responseTime,
        rawResponse: content,
        provider: 'groq'
      };
      
    } catch (error) {
      if (error.message === 'LLM response timeout') {
        this.logger.warn('⚡ LLM response timeout, using fallback evaluation');
        return this.getFallbackEvaluation(prompt);
      }
      throw error;
    }
  }

  /**
   * Parse fast LLM response
   */
  parseFastResponse(content) {
    try {
      const qualityMatch = content.match(/QUALITY:\s*(EXCELLENT|GOOD|FAIR|POOR)/i);
      const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
      const tradeScoreMatch = content.match(/TRADE_SCORE:\s*(\d+)/i);
      const reasonMatch = content.match(/REASON:\s*(.+)/i);
      
      const quality = qualityMatch ? qualityMatch[1].toUpperCase() : 'FAIR';
      const confidence = confidenceMatch ? Math.min(100, Math.max(0, parseInt(confidenceMatch[1]))) / 100 : 0.5;
      const tradeScore = tradeScoreMatch ? Math.min(100, Math.max(0, parseInt(tradeScoreMatch[1]))) : 50;
      const reason = reasonMatch ? reasonMatch[1].trim() : 'Signal quality assessment completed';
      
      return {
        quality,
        confidence,
        tradeScore,
        reason
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to parse fast LLM response:', error);
      
      return {
        quality: 'FAIR',
        confidence: 0.3,
        tradeScore: 30,
        reason: 'Failed to parse LLM response'
      };
    }
  }

  /**
   * Get fallback evaluation when LLM is unavailable or too slow
   */
  getFallbackEvaluation(prompt) {
    // Extract key metrics from prompt for rule-based decision
    const quantConfidenceMatch = prompt.match(/- Confidence: ([\d.]+)%/);
    const riskScoreMatch = prompt.match(/- Risk Score: ([\d.]+)%/);
    const confluenceMatch = prompt.match(/- Confluence Score: (\d+)\/100/);
    
    const quantConfidence = quantConfidenceMatch ? parseFloat(quantConfidenceMatch[1]) / 100 : 0.5;
    const riskScore = riskScoreMatch ? parseFloat(riskScoreMatch[1]) / 100 : 0.5;
    const confluenceScore = confluenceMatch ? parseInt(confluenceMatch[1]) : 50;
    
    // Rule-based evaluation logic
    let quality = 'FAIR';
    let confidence = 0.5;
    let tradeScore = 50;
    let reason = 'Conservative fallback evaluation';
    
    if (quantConfidence > 0.8 && riskScore < 0.3 && confluenceScore > 70) {
      quality = 'EXCELLENT';
      confidence = 0.8;
      tradeScore = 85;
      reason = 'High ML confidence with low risk and strong confluence';
    } else if (quantConfidence > 0.7 && riskScore < 0.4 && confluenceScore > 60) {
      quality = 'GOOD';
      confidence = 0.7;
      tradeScore = 70;
      reason = 'Good ML confidence with acceptable risk and confluence';
    } else if (quantConfidence > 0.6 && riskScore < 0.5 && confluenceScore > 50) {
      quality = 'FAIR';
      confidence = 0.6;
      tradeScore = 55;
      reason = 'Moderate signal quality with acceptable parameters';
    } else {
      quality = 'POOR';
      confidence = 0.3;
      tradeScore = 30;
      reason = 'Low confidence or high risk signal';
    }
    
    return {
      quality,
      confidence,
      tradeScore,
      reason,
      responseTime: 0,
      fallback: true
    };
  }

  /**
   * Apply signal quality assessment rules
   */
  applySignalQualityRules(llmEvaluation, quantPrediction, analystValidation) {
    let signalQuality = llmEvaluation.quality || 'FAIR';
    let reasoning = llmEvaluation.reason || 'Signal quality assessment completed';
    let confidence = llmEvaluation.confidence || 0.5;
    let tradeScore = llmEvaluation.tradeScore || 50;
    
    // Rule: Adjust quality based on AI confidence (more balanced)
    const quantConfident = quantPrediction.confidence > 0.5;
    const analystConfident = analystValidation.confidence > 0.4;
    
    if (!quantConfident && !analystConfident) {
      signalQuality = this.downgradeQuality(signalQuality);
      confidence = Math.max(0.1, confidence * 0.8);
      tradeScore = Math.max(10, tradeScore - 20);
      reasoning = `Low confidence from both AI systems. ${reasoning}`;
    }
    
    // Rule: Adjust quality based on risk score
    if (quantPrediction.riskScore > 0.6) {
      signalQuality = this.downgradeQuality(signalQuality);
      confidence = Math.max(0.1, confidence * 0.8);
      tradeScore = Math.max(10, tradeScore - 15);
      reasoning = `High risk score (${(quantPrediction.riskScore * 100).toFixed(1)}%). ${reasoning}`;
    }
    
    // Rule: Adjust quality based on confluence score
    if (analystValidation.confluenceScore < 40) {
      signalQuality = this.downgradeQuality(signalQuality);
      confidence = Math.max(0.1, confidence * 0.8);
      tradeScore = Math.max(10, tradeScore - 15);
      reasoning = `Low technical confluence (${analystValidation.confluenceScore}/100). ${reasoning}`;
    } else if (analystValidation.confluenceScore > 70) {
      signalQuality = this.upgradeQuality(signalQuality);
      confidence = Math.min(1, confidence * 1.2);
      tradeScore = Math.min(100, tradeScore + 15);
      reasoning = `Strong technical confluence (${analystValidation.confluenceScore}/100). ${reasoning}`;
    }
    
    // Rule: Adjust quality based on analyst validation
    if (analystValidation.validation === 'NO') {
      signalQuality = this.downgradeQuality(signalQuality);
      confidence = Math.max(0.1, confidence * 0.7);
      tradeScore = Math.max(10, tradeScore - 25);
      reasoning = `Analyst Brain rejected signal. ${reasoning}`;
    } else if (analystValidation.validation === 'YES' && analystValidation.confidence > 0.7) {
      signalQuality = this.upgradeQuality(signalQuality);
      confidence = Math.min(1, confidence * 1.1);
      tradeScore = Math.min(100, tradeScore + 10);
      reasoning = `Analyst Brain strongly validated signal. ${reasoning}`;
    }
    
    // Rule: Ensure consistency between quality, confidence and trade score
    if (signalQuality === 'EXCELLENT' && tradeScore < 75) {
      tradeScore = 75 + Math.floor(Math.random() * 25);
    } else if (signalQuality === 'GOOD' && (tradeScore < 60 || tradeScore > 85)) {
      tradeScore = 60 + Math.floor(Math.random() * 25);
    } else if (signalQuality === 'FAIR' && (tradeScore < 40 || tradeScore > 65)) {
      tradeScore = 40 + Math.floor(Math.random() * 25);
    } else if (signalQuality === 'POOR' && tradeScore > 45) {
      tradeScore = 20 + Math.floor(Math.random() * 25);
    }
    
    return {
      signalQuality,
      confidence,
      tradeScore,
      reasoning
    };
  }

  /**
   * Upgrade quality level
   */
  upgradeQuality(quality) {
    switch (quality) {
      case 'POOR': return 'FAIR';
      case 'FAIR': return 'GOOD';
      case 'GOOD': return 'EXCELLENT';
      default: return quality;
    }
  }

  /**
   * Downgrade quality level
   */
  downgradeQuality(quality) {
    switch (quality) {
      case 'EXCELLENT': return 'GOOD';
      case 'GOOD': return 'FAIR';
      case 'FAIR': return 'POOR';
      default: return quality;
    }
  }

  /**
   * Generate comprehensive signal result
   */
  generateSignalResult(signalId, finalEvaluation, quantPrediction, analystValidation, startTime) {
    const processingTime = Date.now() - startTime;
    
    return {
      signalId,
      timestamp: new Date().toISOString(),
      currencyPair: quantPrediction.currencyPair || this.config.currencyPair,
      direction: quantPrediction.direction,
      signalQuality: finalEvaluation.signalQuality,
      confidence: finalEvaluation.confidence,
      tradeScore: finalEvaluation.tradeScore,
      reasoning: finalEvaluation.reasoning,
      quantPrediction: {
        direction: quantPrediction.direction,
        confidence: quantPrediction.confidence,
        riskScore: quantPrediction.riskScore,
        modelConsensus: quantPrediction.modelConsensus
      },
      analystValidation: {
        validation: analystValidation.validation,
        confidence: analystValidation.confidence,
        confluenceScore: analystValidation.confluenceScore,
        reasoning: analystValidation.reasoning
      },
      processingTime,
      status: 'COMPLETED'
    };
  }

  /**
   * Create rejection response
   */
  createRejectionResponse(reason, details, startTime) {
    const processingTime = Date.now() - startTime;
    
    this.performanceMetrics.rejectedCount++;
    
    return {
      timestamp: new Date().toISOString(),
      signalQuality: 'POOR',
      confidence: 0.1,
      tradeScore: 10,
      reasoning: `Signal rejected: ${reason}. ${details}`,
      processingTime,
      status: 'REJECTED',
      rejectionReason: reason,
      rejectionDetails: details
    };
  }

  /**
   * Update session state and metrics
   */
  updateSessionAndMetrics(result) {
    // Update performance metrics
    this.performanceMetrics.avgDecisionTime = (
      (this.performanceMetrics.avgDecisionTime * this.performanceMetrics.totalDecisions) +
      result.processingTime
    ) / (this.performanceMetrics.totalDecisions + 1);
    
    if (result.status === 'COMPLETED') {
      this.performanceMetrics.executedCount++;
      
      // Update session state for completed signals
      if (result.signalQuality === 'EXCELLENT' || result.signalQuality === 'GOOD') {
        this.sessionState.tradesExecuted++;
        this.sessionState.lastTradeTime = Date.now();
        this.sessionState.lastSignalId = result.signalId;
      }
    }
  }

  /**
   * Update trade outcome
   */
  updateTradeOutcome(signalId, outcome) {
    if (signalId !== this.sessionState.lastSignalId) {
      this.logger.warn(`⚠️ Trade outcome update for unknown signal: ${signalId}`);
      return false;
    }
    
    if (outcome === 'WIN') {
      this.sessionState.winCount++;
      this.sessionState.consecutiveLosses = 0;
      this.sessionState.dailyPnL += 0.8; // Assuming 80% payout
    } else if (outcome === 'LOSS') {
      this.sessionState.consecutiveLosses++;
      this.sessionState.dailyPnL -= 1; // Lose 100% of stake
    }
    
    // Update success rate
    this.sessionState.successRate = this.sessionState.winCount / this.sessionState.tradesExecuted;
    
    return true;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      ...this.sessionState,
      sessionDuration: Date.now() - this.sessionState.sessionStart,
      performanceMetrics: { ...this.performanceMetrics }
    };
  }

  /**
   * Reset daily counters
   */
  resetDailyCounters() {
    this.sessionState.tradesExecuted = 0;
    this.sessionState.consecutiveLosses = 0;
    this.sessionState.dailyPnL = 0;
    this.sessionState.winCount = 0;
    
    this.logger.info('🔄 Daily counters reset');
    
    return true;
  }
}

module.exports = { EnhancedReflexBrain };