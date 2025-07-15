/**
 * Reflex Brain - Layer 3: Lightning-Fast Execution Engine
 * 
 * This module implements the third layer of the 3-layer AI trading system.
 * It makes split-second execution decisions based on Quant Brain predictions
 * and Analyst Brain validations using Groq-hosted inference for speed.
 */

const { Logger } = require('../utils/Logger');
const Groq = require('groq-sdk');
const fs = require('fs-extra');
const path = require('path');

class ReflexBrain {
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
    
    this.logger.info('⚡ ReflexBrain initialized');
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
      this.logger.info(`⚡ ReflexBrain signal quality: ${result.signalQuality} (Score: ${result.tradeScore}/100, ${(result.confidence * 100).toFixed(1)}%) in ${processingTime}ms`);
      
      return result;
      
    } catch (error) {
      this.logger.error('❌ ReflexBrain decision failed:', error);
      
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
      reasoning = 'Signal quality reduced: Low confidence from both AI systems';
      confidence = Math.min(confidence, 0.3);
      tradeScore = Math.min(tradeScore, 30);
    } else if (!quantConfident || !analystConfident) {
      // Only minor reduction if one system has low confidence
      confidence = Math.min(confidence, 0.6);
      tradeScore = Math.min(tradeScore, 60);
      reasoning = 'Signal quality maintained: Mixed AI confidence levels';
    }
    
    // Rule: Check volume confirmation
    if (this.executionRules.requireVolumeConfirmation) {
      const volumeConfirmed = this.checkVolumeConfirmation(quantPrediction.features);
      if (!volumeConfirmed) {
        signalQuality = this.downgradeQuality(signalQuality);
        reasoning = 'Signal quality reduced: Volume confirmation missing';
        confidence = Math.min(confidence, 0.4);
        tradeScore = Math.min(tradeScore, 45);
      }
    }
    
    // Rule: Adjust based on confluence score (more nuanced)
    if (analystValidation.confluenceScore >= 60) {
      // High confluence - boost quality
      confidence = Math.min(1.0, confidence * 1.2);
      tradeScore = Math.min(100, tradeScore + 15);
      reasoning += ' | High technical confluence boost';
    } else if (analystValidation.confluenceScore < 30) {
      // Very low confluence - reduce quality
      signalQuality = this.downgradeQuality(signalQuality);
      reasoning = `Signal quality reduced: Low confluence ${analystValidation.confluenceScore}/100`;
      confidence = Math.min(confidence, 0.4);
      tradeScore = Math.min(tradeScore, 40);
    } else {
      // Moderate confluence - maintain with slight adjustment
      const confluenceFactor = analystValidation.confluenceScore / 50; // 0.6-1.2 range
      confidence = Math.min(1.0, confidence * confluenceFactor);
      tradeScore = Math.min(100, tradeScore * confluenceFactor);
    }
    
    // Rule: Check volatility limits
    const volatility = this.extractVolatility(quantPrediction.features);
    if (volatility > this.executionRules.maxVolatility) {
      signalQuality = this.downgradeQuality(signalQuality);
      reasoning = `Signal quality reduced: High volatility ${(volatility * 100).toFixed(2)}%`;
      confidence = Math.min(confidence, 0.3);
      tradeScore = Math.min(tradeScore, 35);
    }
    
    // Rule: Check for conflicting signals
    const hasConflictingSignals = this.detectConflictingSignals(quantPrediction, analystValidation);
    if (hasConflictingSignals) {
      signalQuality = 'POOR';
      reasoning = 'Signal quality poor: Conflicting signals detected between systems';
      confidence = Math.min(confidence, 0.2);
      tradeScore = Math.min(tradeScore, 25);
    }
    
    // Rule: Risk management assessment
    if (quantPrediction.riskScore > 0.8) {
      signalQuality = 'POOR';
      reasoning = 'Signal quality poor: Excessive risk detected';
      confidence = Math.min(confidence, 0.1);
      tradeScore = Math.min(tradeScore, 20);
    }
    
    return {
      signalQuality,
      reasoning,
      confidence,
      tradeScore,
      rulesApplied: true
    };
  }

  /**
   * Downgrade signal quality
   */
  downgradeQuality(currentQuality) {
    const qualityLevels = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'];
    const currentIndex = qualityLevels.indexOf(currentQuality);
    if (currentIndex > 0) {
      return qualityLevels[currentIndex + 1] || 'POOR';
    }
    return 'POOR';
  }

  /**
   * Generate comprehensive signal result
   */
  generateSignalResult(signalId, finalEvaluation, quantPrediction, analystValidation, startTime) {
    const processingTime = Date.now() - startTime;
    
    // Generate trade recommendation first
    const tradeRecommendation = this.generateTradeRecommendation(signalId, finalEvaluation, quantPrediction, analystValidation);
    
    const result = {
      signalQuality: finalEvaluation.signalQuality || 'FAIR',
      tradeScore: finalEvaluation.tradeScore || 50,
      reasoning: finalEvaluation.reasoning || 'Signal quality assessment completed',
      confidence: finalEvaluation.confidence || 0.5,
      
      // Signal ID from trade recommendation
      signalId: tradeRecommendation.signalId,
      
      // Trade recommendation details
      tradeRecommendation: tradeRecommendation,
      
      // Risk assessment
      riskAssessment: this.generateRiskAssessment(quantPrediction, analystValidation),
      
      // Signal summary
      signalSummary: {
        quantDirection: quantPrediction.direction,
        quantConfidence: quantPrediction.confidence,
        quantRisk: quantPrediction.riskScore,
        analystValidation: analystValidation.validation,
        analystConfidence: analystValidation.confidence,
        confluenceScore: analystValidation.confluenceScore
      },
      
      // Execution metadata
      metadata: {
        processingTime,
        sessionTradeCount: this.sessionState.tradesExecuted,
        consecutiveLosses: this.sessionState.consecutiveLosses,
        dailyRemaining: this.executionRules.maxDailyTrades - this.sessionState.tradesExecuted,
        avgDecisionTime: this.performanceMetrics.avgDecisionTime,
        currencyPair: quantPrediction.currencyPair || this.config.currencyPair
      },
      
      timestamp: new Date().toISOString()
    };
    
    return result;
  }

  /**
   * Generate trade recommendation
   */
  generateTradeRecommendation(signalId, finalEvaluation, quantPrediction, analystValidation) {
    const direction = quantPrediction.direction;
    const combinedConfidence = (quantPrediction.confidence + analystValidation.confidence) / 2;
    
    // Calculate recommended position size based on signal quality
    const baseAmount = this.config.tradeAmount || 10;
    const recommendedAmount = this.calculateRecommendedAmount(baseAmount, finalEvaluation.tradeScore, combinedConfidence, quantPrediction.riskScore);
    
    // 5-minute binary option recommendation
    const entryTime = new Date();
    const expiryTime = new Date(entryTime.getTime() + 5 * 60 * 1000);
    
    return {
      signalId: signalId,
      asset: quantPrediction.currencyPair || this.config.currencyPair,
      direction: direction,
      signalQuality: finalEvaluation.signalQuality,
      tradeScore: finalEvaluation.tradeScore,
      recommendedAmount: Math.round(recommendedAmount * 100) / 100,
      
      // Signal timing
      signalTime: entryTime.toISOString(),
      recommendedExpiry: expiryTime.toISOString(),
      expectedDuration: 300, // 5 minutes in seconds
      
      // Confidence metrics
      quantConfidence: quantPrediction.confidence,
      analystConfidence: analystValidation.confidence,
      combinedConfidence: combinedConfidence,
      confluenceScore: analystValidation.confluenceScore,
      riskScore: quantPrediction.riskScore,
      
      // Trading justification
      technicalReason: analystValidation.reasoning?.substring(0, 200) || 'Technical confluence analysis completed',
      signalStrengths: this.identifySignalStrengths(quantPrediction, analystValidation),
      riskFactors: this.identifyRiskFactors(quantPrediction, analystValidation),
      
      // Manual trading context
      signalId: this.generateSignalId(),
      sessionSignalNumber: this.sessionState.tradesExecuted + 1,
      shouldTrade: this.shouldRecommendTrade(finalEvaluation.signalQuality, finalEvaluation.tradeScore)
    };
  }

  /**
   * Generate trade details for execution (legacy method kept for compatibility)
   */
  generateTradeDetails(quantPrediction, analystValidation) {
    const direction = quantPrediction.direction;
    const combinedConfidence = (quantPrediction.confidence + analystValidation.confidence) / 2;
    
    // Calculate position size based on confidence and risk
    const baseAmount = this.config.tradeAmount || 10;
    const positionSize = this.calculatePositionSize(baseAmount, combinedConfidence, quantPrediction.riskScore);
    
    // 5-minute binary option expiry
    const entryTime = new Date();
    const expiryTime = new Date(entryTime.getTime() + 5 * 60 * 1000);
    
    return {
      asset: quantPrediction.currencyPair || this.config.currencyPair,
      direction: direction,
      amount: Math.round(positionSize * 100) / 100, // Round to 2 decimal places
      entryTime: entryTime.toISOString(),
      expiryTime: expiryTime.toISOString(),
      expectedDuration: 300, // 5 minutes in seconds
      
      // Confidence metrics
      quantConfidence: quantPrediction.confidence,
      analystConfidence: analystValidation.confidence,
      combinedConfidence: combinedConfidence,
      confluenceScore: analystValidation.confluenceScore,
      riskScore: quantPrediction.riskScore,
      
      // Technical justification
      technicalReason: analystValidation.reasoning?.substring(0, 100) || 'Technical confluence confirmed',
      
      // Execution context
      tradeId: this.generateTradeId(),
      sessionTradeNumber: this.sessionState.tradesExecuted + 1
    };
  }

  /**
   * Calculate recommended amount based on signal quality
   */
  calculateRecommendedAmount(baseAmount, tradeScore, confidence, riskScore) {
    // Position sizing based on signal quality
    const maxAmount = baseAmount * 2.0; // Max 2x base amount
    const minAmount = baseAmount * 0.2; // Min 0.2x base amount
    
    // Trade score multiplier (0.2 to 2.0 range)
    const tradeScoreMultiplier = 0.2 + (tradeScore / 100) * 1.8;
    
    // Confidence multiplier (0.5 to 1.5 range)
    const confidenceMultiplier = 0.5 + (confidence * 1.0);
    
    // Risk multiplier (0.3 to 1.0 range)
    const riskMultiplier = 1.0 - (riskScore * 0.7);
    
    const adjustedAmount = baseAmount * tradeScoreMultiplier * confidenceMultiplier * riskMultiplier;
    
    return Math.max(minAmount, Math.min(maxAmount, adjustedAmount));
  }

  /**
   * Identify signal strengths
   */
  identifySignalStrengths(quantPrediction, analystValidation) {
    const strengths = [];
    
    if (quantPrediction.confidence > 0.8) {
      strengths.push('High ML model confidence');
    }
    
    if (analystValidation.confidence > 0.7) {
      strengths.push('Strong LLM technical validation');
    }
    
    if (analystValidation.confluenceScore > 70) {
      strengths.push('Excellent technical confluence');
    }
    
    if (quantPrediction.riskScore < 0.3) {
      strengths.push('Low risk environment');
    }
    
    const features = quantPrediction.features?.normalized || {};
    
    if (features['5m_macd_bullish'] === 1) {
      strengths.push('MACD bullish signal');
    }
    
    if (features['5m_ema8_above_21'] === 1 && features['5m_ema21_above_50'] === 1) {
      strengths.push('Strong trend alignment');
    }
    
    if (features['5m_volume_spike'] === 1) {
      strengths.push('Volume spike confirmation');
    }
    
    if (features['5m_bullish_pattern_count'] > 0) {
      strengths.push('Bullish candlestick patterns');
    }
    
    return strengths.length > 0 ? strengths : ['Basic technical setup'];
  }

  /**
   * Identify risk factors
   */
  identifyRiskFactors(quantPrediction, analystValidation) {
    const risks = [];
    
    if (quantPrediction.confidence < 0.6) {
      risks.push('Lower ML model confidence');
    }
    
    if (analystValidation.confidence < 0.6) {
      risks.push('Moderate LLM validation confidence');
    }
    
    if (analystValidation.confluenceScore < 50) {
      risks.push('Limited technical confluence');
    }
    
    if (quantPrediction.riskScore > 0.6) {
      risks.push('Elevated risk environment');
    }
    
    const features = quantPrediction.features?.normalized || {};
    const volatility = features['5m_atr_normalized'] || 0.01;
    
    if (volatility > 0.025) {
      risks.push('High market volatility');
    }
    
    if (!this.checkVolumeConfirmation(quantPrediction.features)) {
      risks.push('Limited volume confirmation');
    }
    
    if (features['5m_bearish_pattern_count'] > 0) {
      risks.push('Conflicting bearish patterns present');
    }
    
    // Time-based risks
    const currentHour = new Date().getUTCHours();
    if (currentHour < 6 || currentHour > 22) {
      risks.push('Trading outside major market hours');
    }
    
    return risks;
  }

  /**
   * Should recommend trade based on quality and score
   */
  shouldRecommendTrade(signalQuality, tradeScore) {
    if (signalQuality === 'EXCELLENT' && tradeScore >= 80) return 'STRONGLY_RECOMMENDED';
    if (signalQuality === 'GOOD' && tradeScore >= 70) return 'RECOMMENDED';
    if (signalQuality === 'FAIR' && tradeScore >= 60) return 'CONSIDER';
    return 'NOT_RECOMMENDED';
  }

  /**
   * Generate unique signal ID
   */
  generateSignalId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `SIG_${timestamp}_${random}`;
  }

  /**
   * Calculate position size based on confidence and risk (legacy method)
   */
  calculatePositionSize(baseAmount, confidence, riskScore) {
    // Kelly Criterion inspired sizing with safety limits
    const maxAmount = baseAmount * 2.0; // Max 2x base amount
    const minAmount = baseAmount * 0.5; // Min 0.5x base amount
    
    // Confidence multiplier (0.5 to 2.0 range)
    const confidenceMultiplier = 0.5 + (confidence * 1.5);
    
    // Risk multiplier (0.3 to 1.0 range)
    const riskMultiplier = 1.0 - (riskScore * 0.7);
    
    // Session performance adjustment
    const performanceMultiplier = this.calculatePerformanceMultiplier();
    
    const adjustedAmount = baseAmount * confidenceMultiplier * riskMultiplier * performanceMultiplier;
    
    return Math.max(minAmount, Math.min(maxAmount, adjustedAmount));
  }

  /**
   * Calculate performance-based position size multiplier
   */
  calculatePerformanceMultiplier() {
    // Reduce position size after consecutive losses
    if (this.sessionState.consecutiveLosses >= 2) {
      return 0.7; // 30% reduction
    }
    
    // Increase position size after good performance
    if (this.sessionState.successRate > 0.7 && this.sessionState.tradesExecuted >= 5) {
      return 1.2; // 20% increase
    }
    
    return 1.0; // Normal sizing
  }

  /**
   * Generate comprehensive risk assessment
   */
  generateRiskAssessment(quantPrediction, analystValidation) {
    const riskFactors = [];
    let overallRisk = 'LOW';
    let riskScore = 0;
    
    // Market volatility risk
    const volatility = this.extractVolatility(quantPrediction.features);
    if (volatility > 0.02) {
      riskFactors.push(`High market volatility: ${(volatility * 100).toFixed(2)}%`);
      riskScore += 0.3;
      overallRisk = 'MEDIUM';
    }
    
    // Model confidence risk
    if (quantPrediction.confidence < 0.7) {
      riskFactors.push(`Lower ML confidence: ${(quantPrediction.confidence * 100).toFixed(1)}%`);
      riskScore += 0.2;
      overallRisk = overallRisk === 'HIGH' ? 'HIGH' : 'MEDIUM';
    }
    
    // Technical confluence risk
    if (analystValidation.confluenceScore < 60) {
      riskFactors.push(`Low technical confluence: ${analystValidation.confluenceScore}/100`);
      riskScore += 0.2;
      overallRisk = overallRisk === 'HIGH' ? 'HIGH' : 'MEDIUM';
    }
    
    // Session performance risk
    if (this.sessionState.consecutiveLosses >= 2) {
      riskFactors.push(`Recent consecutive losses: ${this.sessionState.consecutiveLosses}`);
      riskScore += 0.15;
      overallRisk = overallRisk === 'HIGH' ? 'HIGH' : 'MEDIUM';
    }
    
    // Volume risk
    const volumeConfirmed = this.checkVolumeConfirmation(quantPrediction.features);
    if (!volumeConfirmed) {
      riskFactors.push('Insufficient volume confirmation');
      riskScore += 0.1;
    }
    
    // Time-based risk
    const currentHour = new Date().getUTCHours();
    if (currentHour < 6 || currentHour > 22) {
      riskFactors.push('Trading outside major market hours');
      riskScore += 0.05;
    }
    
    // Overall risk classification
    if (riskScore > 0.6) overallRisk = 'HIGH';
    else if (riskScore > 0.3) overallRisk = 'MEDIUM';
    
    return {
      overallRisk,
      riskScore: Math.min(1, riskScore),
      riskFactors,
      mitigationStrategies: this.generateMitigationStrategies(riskFactors),
      maxDrawdown: this.calculateMaxDrawdown(),
      riskRewardRatio: this.calculateRiskRewardRatio(quantPrediction.confidence)
    };
  }

  /**
   * Generate risk mitigation strategies
   */
  generateMitigationStrategies(riskFactors) {
    const strategies = [];
    
    if (riskFactors.some(f => f.includes('volatility'))) {
      strategies.push('Reduce position size by 20%');
      strategies.push('Consider shorter expiry times');
    }
    
    if (riskFactors.some(f => f.includes('confidence'))) {
      strategies.push('Wait for stronger signals');
      strategies.push('Require higher confluence threshold');
    }
    
    if (riskFactors.some(f => f.includes('consecutive losses'))) {
      strategies.push('Reduce trade frequency');
      strategies.push('Take break after 3 consecutive losses');
    }
    
    if (riskFactors.some(f => f.includes('volume'))) {
      strategies.push('Wait for volume confirmation');
      strategies.push('Focus on high-volume periods');
    }
    
    if (riskFactors.some(f => f.includes('market hours'))) {
      strategies.push('Prefer major session overlaps');
      strategies.push('Avoid illiquid hours');
    }
    
    return strategies;
  }

  // Helper methods
  
  checkVolumeConfirmation(features) {
    const normalized = features?.normalized || {};
    const volumeRatio = normalized['5m_volume_ratio'] || 1;
    const volumeSpike = normalized['5m_volume_spike'] === 1;
    
    // Require either volume spike or volume 25% above average
    return volumeSpike || volumeRatio > 1.25;
  }

  extractVolatility(features) {
    const normalized = features?.normalized || {};
    return normalized['5m_atr_normalized'] || 0.01;
  }

  detectConflictingSignals(quantPrediction, analystValidation) {
    // Check for major contradictions
    const quantDirection = quantPrediction.direction;
    const analystDecision = analystValidation.validation;
    
    // If analyst says NO but quant has very high confidence
    if (analystDecision === 'NO' && quantPrediction.confidence > 0.85) {
      return true;
    }
    
    // Check for pattern conflicts in features
    const features = quantPrediction.features?.normalized || {};
    const bullishPatterns = features['5m_bullish_pattern_count'] || 0;
    const bearishPatterns = features['5m_bearish_pattern_count'] || 0;
    
    // Strong conflicting patterns
    if (bullishPatterns >= 2 && bearishPatterns >= 2) {
      return true;
    }
    
    // RSI vs MACD divergence
    const rsi = features['5m_rsi14'] || 0.5;
    const macdBullish = features['5m_macd_bullish'] === 1;
    
    if ((rsi > 0.8 && macdBullish) || (rsi < 0.2 && !macdBullish)) {
      return true; // Extreme RSI with contradicting MACD
    }
    
    return false;
  }

  calculateMaxDrawdown() {
    // Simple drawdown calculation based on consecutive losses
    const maxLossAmount = this.config.tradeAmount || 10;
    const consecutiveLosses = Math.max(this.sessionState.consecutiveLosses, 3);
    return maxLossAmount * consecutiveLosses * 0.9; // Assume 90% loss per trade
  }

  calculateRiskRewardRatio(confidence) {
    // Binary options typically have fixed payouts
    const typicalPayout = 0.8; // 80% return
    const riskAmount = 1.0; // 100% of stake at risk
    
    // Adjust for confidence
    const adjustedReward = typicalPayout * confidence;
    
    return adjustedReward / riskAmount;
  }

  generateTradeId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `TRADE_${timestamp}_${random}`;
  }

  updateSessionAndMetrics(result) {
    // Update performance metrics
    this.performanceMetrics.avgDecisionTime = 
      (this.performanceMetrics.avgDecisionTime * (this.performanceMetrics.totalDecisions - 1) + 
       (result.metadata?.processingTime || 0)) / this.performanceMetrics.totalDecisions;
    
    if (result.execute) {
      this.performanceMetrics.executedCount++;
      this.sessionState.tradesExecuted++;
      this.sessionState.lastTradeTime = Date.now();
    } else {
      this.performanceMetrics.rejectedCount++;
    }
  }

  /**
   * Update session state after trade result
   */
  updateTradeResult(tradeId, won, pnl) {
    if (won) {
      this.sessionState.consecutiveLosses = 0;
      this.sessionState.winCount++;
      this.sessionState.dailyPnL += Math.abs(pnl);
    } else {
      this.sessionState.consecutiveLosses++;
      this.sessionState.dailyPnL -= Math.abs(pnl);
    }
    
    // Update success rate
    if (this.sessionState.tradesExecuted > 0) {
      this.sessionState.successRate = this.sessionState.winCount / this.sessionState.tradesExecuted;
    }
    
    this.logger.info(`📊 Trade result ${tradeId}: ${won ? 'WIN' : 'LOSS'} | PnL: ${pnl > 0 ? '+' : ''}${pnl} | Win Rate: ${(this.sessionState.successRate * 100).toFixed(1)}%`);
  }

  /**
   * Create rejection response
   */
  createRejectionResponse(reason, details, startTime) {
    this.performanceMetrics.rejectedCount++;
    
    return {
      signalQuality: 'REJECTED',
      tradeScore: 0,
      reasoning: `${reason}: ${details}`,
      confidence: 0.1,
      signalId: null,
      
      // Trade recommendation for rejected signals
      tradeRecommendation: {
        signalId: null,
        asset: this.config.currencyPair || 'USD/INR',
        direction: 'NONE',
        signalQuality: 'REJECTED',
        tradeScore: 0,
        recommendedAmount: 0,
        signalTime: new Date().toISOString(),
        recommendedExpiry: new Date().toISOString(),
        expectedDuration: 0,
        quantConfidence: 0,
        analystConfidence: 0,
        combinedConfidence: 0,
        confluenceScore: 0,
        riskScore: 1.0,
        reasoning: `Signal rejected: ${reason}`,
        keyFactors: [reason, details],
        recommendation: 'DO_NOT_TRADE'
      },
      
      riskAssessment: { 
        overallRisk: 'HIGH', 
        riskFactors: [reason],
        riskScore: 1.0
      },
      signalSummary: {
        quantDirection: 'UNKNOWN',
        quantConfidence: 0,
        quantRisk: 1,
        analystValidation: 'HIGH_RISK',
        analystConfidence: 0,
        confluenceScore: 0
      },
      metadata: {
        processingTime: Date.now() - startTime,
        sessionTradeCount: this.sessionState.tradesExecuted,
        consecutiveLosses: this.sessionState.consecutiveLosses,
        dailyRemaining: this.executionRules.maxDailyTrades - this.sessionState.tradesExecuted,
        currencyPair: this.config.currencyPair
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current session statistics
   */
  getSessionStats() {
    return {
      ...this.sessionState,
      performanceMetrics: this.performanceMetrics,
      uptime: Date.now() - this.sessionState.sessionStart,
      executionRate: this.performanceMetrics.totalDecisions > 0 ? 
        this.performanceMetrics.executedCount / this.performanceMetrics.totalDecisions : 0,
      avgDecisionTime: this.performanceMetrics.avgDecisionTime
    };
  }

  /**
   * Reset session state (daily reset)
   */
  resetSession() {
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
    
    // Reset daily performance metrics
    this.performanceMetrics.totalDecisions = 0;
    this.performanceMetrics.executedCount = 0;
    this.performanceMetrics.rejectedCount = 0;
    
    this.logger.info('🔄 ReflexBrain session reset for new trading day');
  }

  /**
   * Emergency stop - halt all trading
   */
  emergencyStop(reason) {
    this.executionRules.maxDailyTrades = 0; // Stop all trades
    this.performanceMetrics.emergencyStops++;
    
    this.logger.error(`🚨 EMERGENCY STOP ACTIVATED: ${reason}`);
    
    return {
      stopped: true,
      reason: reason,
      timestamp: new Date().toISOString(),
      sessionStats: this.getSessionStats()
    };
  }

  /**
   * Save execution decision for analysis and training
   */
  async saveExecutionDecision(decision, actualResult = null) {
    try {
      const executionData = {
        decision: decision.execute,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        processingTime: decision.metadata?.processingTime || 0,
        tradeDetails: decision.tradeDetails,
        riskAssessment: decision.riskAssessment,
        signalSummary: decision.signalSummary,
        actualResult: actualResult,
        timestamp: decision.timestamp,
        sessionContext: {
          tradesExecuted: this.sessionState.tradesExecuted,
          consecutiveLosses: this.sessionState.consecutiveLosses,
          successRate: this.sessionState.successRate
        }
      };
      
      const executionFile = path.join(process.cwd(), 'data', 'training', 'reflex_decisions.json');
      await fs.ensureDir(path.dirname(executionFile));
      
      let existingData = [];
      if (await fs.pathExists(executionFile)) {
        existingData = await fs.readJson(executionFile);
      }
      
      existingData.push(executionData);
      
      // Keep only last 5000 records
      if (existingData.length > 5000) {
        existingData = existingData.slice(-5000);
      }
      
      await fs.writeJson(executionFile, existingData);
      
      this.logger.info('💾 Execution decision saved for analysis');
      
    } catch (error) {
      this.logger.error('❌ Failed to save execution decision:', error);
    }
  }
}

module.exports = { ReflexBrain };