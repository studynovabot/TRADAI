/**
 * Ultimate Reflex Brain - Real-Time Signal Validation Engine
 * 
 * This module implements the enhanced reflex brain using Groq + Together AI
 * for fast final validation, confidence scoring, and send/reject decisions
 * with real-time context analysis
 */

const { Logger } = require('../utils/Logger');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class UltimateReflexBrain {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Fast AI providers for real-time processing
    this.fastProviders = {
      groq: {
        apiKey: config.groqApiKey,
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'llama-3.1-70b-versatile',
        maxTokens: 1000,
        temperature: 0.05,
        active: !!config.groqApiKey,
        priority: 1
      },
      together: {
        apiKey: config.togetherApiKey,
        baseUrl: 'https://api.together.xyz/v1',
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        maxTokens: 1000,
        temperature: 0.05,
        active: !!config.togetherApiKey,
        priority: 2
      }
    };
    
    // Real-time validation configuration
    this.validationConfig = {
      maxProcessingTime: 3000, // 3 seconds max
      minConfidenceThreshold: parseFloat(config.minSignalConfidence) / 100 || 0.8,
      volatilityThreshold: parseFloat(config.maxVolatilityThreshold) || 2.0,
      volumeThreshold: parseFloat(config.minVolumeRatio) || 0.8,
      wickRatioThreshold: parseFloat(config.maxWickRatio) || 0.7,
      safeZonesOnly: config.safeZonesOnly === 'true',
      rejectConflictingSignals: config.rejectConflictingSignals !== 'false',
      rejectUncertaintyCandles: config.rejectUncertaintyCandles !== 'false',
      rejectSuddenSpikes: config.rejectSuddenSpikes !== 'false'
    };
    
    // Signal rejection filters
    this.rejectionFilters = {
      volatility: {
        enabled: config.avoidHighVolatility !== 'false',
        threshold: this.validationConfig.volatilityThreshold,
        weight: 0.3
      },
      volume: {
        enabled: config.avoidLowVolume !== 'false',
        threshold: this.validationConfig.volumeThreshold,
        weight: 0.25
      },
      marketHours: {
        enabled: config.avoidMarketOpenClose !== 'false',
        bufferMinutes: parseInt(config.marketBufferMinutes) || 15,
        weight: 0.2
      },
      news: {
        enabled: config.avoidNewsEvents !== 'false',
        bufferMinutes: parseInt(config.newsBufferMinutes) || 30,
        weight: 0.25
      }
    };
    
    // Real-time context tracking
    this.realtimeContext = {
      lastSignalTime: 0,
      recentSignals: [],
      marketConditions: {
        volatility: 0,
        volume: 0,
        trend: 'NEUTRAL',
        session: 'UNKNOWN'
      },
      systemHealth: {
        dataFreshness: true,
        providerHealth: true,
        processingSpeed: 0
      }
    };
    
    // Performance tracking
    this.performance = {
      decisions: 0,
      approvals: 0,
      rejections: 0,
      avgProcessingTime: 0,
      avgConfidence: 0,
      filterStats: {},
      providerStats: {}
    };
    
    // Initialize filter stats
    Object.keys(this.rejectionFilters).forEach(filter => {
      this.performance.filterStats[filter] = {
        triggered: 0,
        prevented: 0,
        accuracy: 0
      };
    });
    
    // Initialize provider stats
    Object.keys(this.fastProviders).forEach(provider => {
      this.performance.providerStats[provider] = {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0
      };
    });
    
    this.logger.info('⚡ Ultimate Reflex Brain initialized');
    this.logger.info(`🚀 Fast providers: ${this.getActiveProviders().join(', ')}`);
    this.logger.info(`⏱️ Max processing time: ${this.validationConfig.maxProcessingTime}ms`);
  }

  /**
   * Main evaluation method - fast final validation
   */
  async evaluate(signalId, quantPrediction, analystValidation, marketData) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`⚡ Reflex evaluation for signal ${signalId}...`);
      
      // Update real-time context
      await this.updateRealtimeContext(marketData);
      
      // Pre-validation checks (fast rejection filters)
      const preValidation = await this.runPreValidationChecks(quantPrediction, analystValidation, marketData);
      if (!preValidation.passed) {
        return this.createRejectionResult(signalId, preValidation.reason, preValidation.confidence, startTime);
      }
      
      // Real-time context analysis
      const contextAnalysis = await this.analyzeRealtimeContext(quantPrediction, analystValidation, marketData);
      
      // Fast AI validation
      const aiValidation = await this.getFastAIValidation(signalId, quantPrediction, analystValidation, contextAnalysis);
      
      // Calculate final confidence score
      const finalConfidence = this.calculateFinalConfidence(quantPrediction, analystValidation, contextAnalysis, aiValidation);
      
      // Make final decision
      const decision = this.makeFinalDecision(finalConfidence, contextAnalysis, aiValidation);
      
      // Create evaluation result
      const result = {
        decision: decision.action,
        confidence: finalConfidence,
        reasoning: decision.reasoning,
        contextAnalysis,
        aiValidation,
        preValidation,
        processingTime: Date.now() - startTime,
        timestamp: Date.now(),
        signalId
      };
      
      // Update performance tracking
      this.updatePerformanceTracking(result);
      
      // Store signal in recent history
      this.storeRecentSignal(result);
      
      this.logger.info(`⚡ Reflex decision: ${decision.action} (${(finalConfidence * 100).toFixed(1)}% confidence) in ${result.processingTime}ms`);
      
      return result;
      
    } catch (error) {
      this.logger.error(`❌ Reflex evaluation failed for signal ${signalId}:`, error);
      return this.createErrorResult(signalId, error.message, startTime);
    }
  }

  /**
   * Run pre-validation checks (fast rejection filters)
   */
  async runPreValidationChecks(quantPrediction, analystValidation, marketData) {
    const checks = {
      passed: true,
      reason: '',
      confidence: 0.5,
      failedFilters: []
    };
    
    try {
      // Check minimum confidence threshold
      if (quantPrediction.confidence < this.validationConfig.minConfidenceThreshold) {
        checks.passed = false;
        checks.reason = `Quant confidence too low (${(quantPrediction.confidence * 100).toFixed(1)}% < ${(this.validationConfig.minConfidenceThreshold * 100).toFixed(1)}%)`;
        checks.confidence = 0.2;
        checks.failedFilters.push('min_confidence');
        return checks;
      }
      
      // Check analyst validation
      if (analystValidation.validation === 'REJECT') {
        checks.passed = false;
        checks.reason = `Analyst rejected: ${analystValidation.reasoning}`;
        checks.confidence = 0.3;
        checks.failedFilters.push('analyst_rejection');
        return checks;
      }
      
      // Check confluence score
      if (analystValidation.confluenceScore < this.validationConfig.minConfidenceThreshold * 100) {
        checks.passed = false;
        checks.reason = `Insufficient confluence (${analystValidation.confluenceScore}/100)`;
        checks.confidence = 0.4;
        checks.failedFilters.push('low_confluence');
        return checks;
      }
      
      // Volatility filter
      if (this.rejectionFilters.volatility.enabled) {
        const volatilityRisk = await this.checkVolatilityRisk(marketData);
        if (volatilityRisk.reject) {
          checks.passed = false;
          checks.reason = `High volatility detected (${volatilityRisk.level.toFixed(2)}%)`;
          checks.confidence = 0.3;
          checks.failedFilters.push('high_volatility');
          this.performance.filterStats.volatility.triggered++;
          return checks;
        }
      }
      
      // Volume filter
      if (this.rejectionFilters.volume.enabled) {
        const volumeRisk = await this.checkVolumeRisk(marketData);
        if (volumeRisk.reject) {
          checks.passed = false;
          checks.reason = `Low volume detected (${(volumeRisk.ratio * 100).toFixed(1)}% of average)`;
          checks.confidence = 0.4;
          checks.failedFilters.push('low_volume');
          this.performance.filterStats.volume.triggered++;
          return checks;
        }
      }
      
      // Market hours filter
      if (this.rejectionFilters.marketHours.enabled) {
        const marketHoursRisk = this.checkMarketHoursRisk();
        if (marketHoursRisk.reject) {
          checks.passed = false;
          checks.reason = `Unfavorable market hours: ${marketHoursRisk.reason}`;
          checks.confidence = 0.5;
          checks.failedFilters.push('market_hours');
          this.performance.filterStats.marketHours.triggered++;
          return checks;
        }
      }
      
      // Candle quality filter
      if (this.validationConfig.rejectUncertaintyCandles) {
        const candleQuality = this.checkCandleQuality(marketData);
        if (candleQuality.reject) {
          checks.passed = false;
          checks.reason = `Poor candle quality: ${candleQuality.reason}`;
          checks.confidence = 0.4;
          checks.failedFilters.push('candle_quality');
          return checks;
        }
      }
      
      // Spike detection filter
      if (this.validationConfig.rejectSuddenSpikes) {
        const spikeDetection = this.checkForSuddenSpikes(marketData);
        if (spikeDetection.reject) {
          checks.passed = false;
          checks.reason = `Sudden spike detected: ${spikeDetection.reason}`;
          checks.confidence = 0.3;
          checks.failedFilters.push('sudden_spike');
          return checks;
        }
      }
      
      // Signal conflict filter
      if (this.validationConfig.rejectConflictingSignals) {
        const conflictCheck = this.checkSignalConflicts(quantPrediction, analystValidation);
        if (conflictCheck.reject) {
          checks.passed = false;
          checks.reason = `Signal conflict detected: ${conflictCheck.reason}`;
          checks.confidence = 0.4;
          checks.failedFilters.push('signal_conflict');
          return checks;
        }
      }
      
      checks.confidence = 0.8; // High confidence if all checks passed
      return checks;
      
    } catch (error) {
      this.logger.error('❌ Pre-validation checks failed:', error);
      checks.passed = false;
      checks.reason = `Pre-validation error: ${error.message}`;
      checks.confidence = 0.2;
      return checks;
    }
  }

  /**
   * Analyze real-time context
   */
  async analyzeRealtimeContext(quantPrediction, analystValidation, marketData) {
    const context = {
      marketConditions: this.realtimeContext.marketConditions,
      systemHealth: this.realtimeContext.systemHealth,
      recentActivity: this.analyzeRecentActivity(),
      dataQuality: this.assessDataQuality(marketData),
      timingFactors: this.analyzeTimingFactors(),
      score: 0
    };
    
    // Calculate context score
    let score = 50; // Neutral starting point
    
    // Market conditions contribution
    if (context.marketConditions.volatility < 1.0) score += 10;
    else if (context.marketConditions.volatility > 2.0) score -= 15;
    
    if (context.marketConditions.volume > 1.2) score += 10;
    else if (context.marketConditions.volume < 0.6) score -= 15;
    
    // System health contribution
    if (context.systemHealth.dataFreshness) score += 10;
    else score -= 20;
    
    if (context.systemHealth.providerHealth) score += 5;
    else score -= 10;
    
    // Data quality contribution
    score += (context.dataQuality.overall - 50) * 0.3;
    
    // Timing factors contribution
    score += (context.timingFactors.score - 50) * 0.2;
    
    context.score = Math.max(0, Math.min(100, score));
    
    return context;
  }

  /**
   * Get fast AI validation
   */
  async getFastAIValidation(signalId, quantPrediction, analystValidation, contextAnalysis) {
    const providers = this.getActiveProviders();
    
    // Try fast providers in priority order
    for (const provider of providers) {
      try {
        const startTime = Date.now();
        const prompt = this.buildFastValidationPrompt(signalId, quantPrediction, analystValidation, contextAnalysis);
        
        const response = await this.queryFastProvider(provider, prompt);
        const responseTime = Date.now() - startTime;
        
        if (response && responseTime < this.validationConfig.maxProcessingTime) {
          this.performance.providerStats[provider].successes++;
          this.performance.providerStats[provider].avgResponseTime = 
            (this.performance.providerStats[provider].avgResponseTime + responseTime) / 2;
          
          return {
            ...response,
            provider,
            responseTime
          };
        }
      } catch (error) {
        this.logger.warn(`⚠️ Fast AI provider ${provider} failed:`, error.message);
        this.performance.providerStats[provider].failures++;
      }
    }
    
    // Fallback to rule-based validation
    return this.fastFallbackValidation(quantPrediction, analystValidation, contextAnalysis);
  }

  /**
   * Build fast validation prompt
   */
  buildFastValidationPrompt(signalId, quantPrediction, analystValidation, contextAnalysis) {
    return `FAST SIGNAL VALIDATION - ${signalId}

SIGNAL: ${quantPrediction.direction} (${(quantPrediction.confidence * 100).toFixed(1)}% ML confidence)
ANALYST: ${analystValidation.validation} (${analystValidation.confluenceScore}/100 confluence)
CONTEXT: Market volatility ${contextAnalysis.marketConditions.volatility.toFixed(2)}%, Volume ${(contextAnalysis.marketConditions.volume * 100).toFixed(1)}%

QUICK DECISION NEEDED:
1. APPROVE/REJECT this signal?
2. Final confidence 0-100%?
3. One-line reason?

JSON response only:
{"decision": "APPROVE/REJECT", "confidence": 85, "reason": "Brief reason"}`;
  }

  /**
   * Query fast AI provider
   */
  async queryFastProvider(provider, prompt) {
    const providerConfig = this.fastProviders[provider];
    
    try {
      this.performance.providerStats[provider].requests++;
      
      const response = await axios.post(
        `${providerConfig.baseUrl}/chat/completions`,
        {
          model: providerConfig.model,
          messages: [
            {
              role: 'system',
              content: 'You are a fast trading signal validator. Respond with JSON only. Be decisive and quick.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: providerConfig.maxTokens,
          temperature: providerConfig.temperature
        },
        {
          headers: {
            'Authorization': `Bearer ${providerConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.validationConfig.maxProcessingTime
        }
      );
      
      const content = response.data.choices[0].message.content;
      
      // Parse JSON response
      try {
        return JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Invalid JSON response');
      }
      
    } catch (error) {
      throw new Error(`${provider} query failed: ${error.message}`);
    }
  }

  /**
   * Fast fallback validation
   */
  fastFallbackValidation(quantPrediction, analystValidation, contextAnalysis) {
    let confidence = 0.7;
    let decision = 'APPROVE';
    let reason = 'Rule-based validation';
    
    // Quick rule-based decision
    if (quantPrediction.confidence < 0.8) {
      confidence *= 0.8;
      reason = 'Lower ML confidence';
    }
    
    if (analystValidation.confluenceScore < 75) {
      confidence *= 0.9;
      reason = 'Moderate confluence';
    }
    
    if (contextAnalysis.score < 40) {
      decision = 'REJECT';
      confidence = 0.3;
      reason = 'Poor market context';
    }
    
    return {
      decision,
      confidence: Math.round(confidence * 100),
      reason,
      provider: 'fallback'
    };
  }

  /**
   * Calculate final confidence score
   */
  calculateFinalConfidence(quantPrediction, analystValidation, contextAnalysis, aiValidation) {
    const weights = {
      quant: 0.3,
      analyst: 0.25,
      context: 0.2,
      ai: 0.25
    };
    
    let weightedConfidence = 0;
    
    // Quant confidence contribution
    weightedConfidence += quantPrediction.confidence * weights.quant;
    
    // Analyst confidence contribution
    weightedConfidence += analystValidation.confidence * weights.analyst;
    
    // Context score contribution
    weightedConfidence += (contextAnalysis.score / 100) * weights.context;
    
    // AI validation contribution
    if (aiValidation && aiValidation.confidence) {
      weightedConfidence += (aiValidation.confidence / 100) * weights.ai;
    } else {
      // Redistribute AI weight to other components
      const redistributedWeight = weights.ai / 3;
      weightedConfidence += quantPrediction.confidence * redistributedWeight;
      weightedConfidence += analystValidation.confidence * redistributedWeight;
      weightedConfidence += (contextAnalysis.score / 100) * redistributedWeight;
    }
    
    // Apply real-time adjustments
    if (this.realtimeContext.systemHealth.processingSpeed > this.validationConfig.maxProcessingTime) {
      weightedConfidence *= 0.9; // Reduce confidence for slow processing
    }
    
    if (!this.realtimeContext.systemHealth.dataFreshness) {
      weightedConfidence *= 0.8; // Reduce confidence for stale data
    }
    
    return Math.max(0.1, Math.min(0.95, weightedConfidence));
  }

  /**
   * Make final decision
   */
  makeFinalDecision(finalConfidence, contextAnalysis, aiValidation) {
    let action = 'REJECT';
    let reasoning = '';
    
    // Check minimum confidence threshold
    if (finalConfidence < this.validationConfig.minConfidenceThreshold) {
      action = 'REJECT';
      reasoning = `Final confidence ${(finalConfidence * 100).toFixed(1)}% below threshold ${(this.validationConfig.minConfidenceThreshold * 100).toFixed(1)}%`;
    }
    // Check AI validation decision
    else if (aiValidation && aiValidation.decision === 'REJECT') {
      action = 'REJECT';
      reasoning = `AI validation rejected: ${aiValidation.reason}`;
    }
    // Check context score
    else if (contextAnalysis.score < 30) {
      action = 'REJECT';
      reasoning = `Poor market context (${contextAnalysis.score}/100)`;
    }
    // Approve if all conditions met
    else {
      action = 'APPROVE';
      reasoning = `High confidence signal (${(finalConfidence * 100).toFixed(1)}%) with favorable conditions`;
    }
    
    return { action, reasoning };
  }

  // Real-time context methods
  async updateRealtimeContext(marketData) {
    try {
      // Update market conditions
      if (marketData.data['5m'] && marketData.data['5m'].length > 20) {
        const candles = marketData.data['5m'];
        this.realtimeContext.marketConditions = {
          volatility: this.calculateCurrentVolatility(candles),
          volume: this.calculateCurrentVolumeRatio(candles),
          trend: this.determineCurrentTrend(candles),
          session: this.getCurrentTradingSession()
        };
      }
      
      // Update system health
      this.realtimeContext.systemHealth = {
        dataFreshness: this.checkDataFreshness(marketData),
        providerHealth: this.checkProviderHealth(),
        processingSpeed: this.performance.avgProcessingTime
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to update realtime context:', error);
    }
  }

  analyzeRecentActivity() {
    const recentSignals = this.realtimeContext.recentSignals.slice(-10);
    
    return {
      signalCount: recentSignals.length,
      approvalRate: recentSignals.length > 0 ? 
        recentSignals.filter(s => s.decision === 'APPROVE').length / recentSignals.length : 0,
      avgConfidence: recentSignals.length > 0 ?
        recentSignals.reduce((sum, s) => sum + s.confidence, 0) / recentSignals.length : 0,
      lastSignalTime: this.realtimeContext.lastSignalTime,
      timeSinceLastSignal: Date.now() - this.realtimeContext.lastSignalTime
    };
  }

  assessDataQuality(marketData) {
    let score = 100;
    const issues = [];
    
    // Check data completeness
    const expectedTimeframes = ['1m', '5m', '15m', '1h'];
    const availableTimeframes = Object.keys(marketData.data || {});
    const completeness = availableTimeframes.length / expectedTimeframes.length;
    
    if (completeness < 0.5) {
      score -= 30;
      issues.push('Incomplete timeframe data');
    }
    
    // Check data freshness
    if (marketData.metadata && marketData.metadata.lastUpdate) {
      const age = Date.now() - marketData.metadata.lastUpdate;
      if (age > 5 * 60 * 1000) { // 5 minutes
        score -= 20;
        issues.push('Stale data');
      }
    }
    
    // Check data quality from metadata
    if (marketData.metadata && marketData.metadata.quality) {
      const avgQuality = Object.values(marketData.metadata.quality)
        .reduce((sum, q) => sum + (q.overall || 0), 0) / Object.keys(marketData.metadata.quality).length;
      
      score = (score + avgQuality) / 2;
    }
    
    return {
      overall: Math.max(0, score),
      completeness: completeness * 100,
      issues
    };
  }

  analyzeTimingFactors() {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay();
    
    let score = 50;
    const factors = [];
    
    // Trading session analysis
    const session = this.getCurrentTradingSession();
    switch (session) {
      case 'LONDON':
      case 'NEWYORK':
        score += 20;
        factors.push('Major session active');
        break;
      case 'OVERLAP':
        score += 30;
        factors.push('Session overlap');
        break;
      case 'ASIAN':
        score += 10;
        factors.push('Asian session');
        break;
      default:
        score -= 10;
        factors.push('Off-hours trading');
    }
    
    // Day of week factors
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score -= 20;
      factors.push('Weekend trading');
    } else if (dayOfWeek === 1) {
      score -= 5;
      factors.push('Monday session');
    } else if (dayOfWeek === 5 && hour > 16) {
      score -= 10;
      factors.push('Friday close');
    }
    
    // News time avoidance
    const isNewsTime = (hour === 8 && minute < 30) || 
                      (hour === 13 && minute < 30) ||
                      (hour === 15 && minute < 30);
    
    if (isNewsTime) {
      score -= 15;
      factors.push('Potential news time');
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      session,
      factors
    };
  }

  // Risk check methods
  async checkVolatilityRisk(marketData) {
    try {
      const candles = marketData.data['5m'];
      if (!candles || candles.length < 20) {
        return { reject: false, level: 0 };
      }
      
      const volatility = this.calculateCurrentVolatility(candles);
      const reject = volatility > this.rejectionFilters.volatility.threshold;
      
      return { reject, level: volatility };
      
    } catch (error) {
      this.logger.error('❌ Volatility risk check failed:', error);
      return { reject: false, level: 0 };
    }
  }

  async checkVolumeRisk(marketData) {
    try {
      const candles = marketData.data['5m'];
      if (!candles || candles.length < 20) {
        return { reject: false, ratio: 1 };
      }
      
      const volumeRatio = this.calculateCurrentVolumeRatio(candles);
      const reject = volumeRatio < this.rejectionFilters.volume.threshold;
      
      return { reject, ratio: volumeRatio };
      
    } catch (error) {
      this.logger.error('❌ Volume risk check failed:', error);
      return { reject: false, ratio: 1 };
    }
  }

  checkMarketHoursRisk() {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const bufferMinutes = this.rejectionFilters.marketHours.bufferMinutes;
    
    // Market open/close times (approximate)
    const marketEvents = [
      { hour: 8, minute: 0, event: 'London Open' },
      { hour: 13, minute: 0, event: 'New York Open' },
      { hour: 16, minute: 0, event: 'London Close' },
      { hour: 21, minute: 0, event: 'New York Close' }
    ];
    
    for (const event of marketEvents) {
      const eventTime = event.hour * 60 + event.minute;
      const currentTime = hour * 60 + minute;
      const timeDiff = Math.abs(currentTime - eventTime);
      
      if (timeDiff <= bufferMinutes) {
        return {
          reject: true,
          reason: `Near ${event.event} (${timeDiff}min away)`
        };
      }
    }
    
    return { reject: false, reason: 'Safe trading hours' };
  }

  checkCandleQuality(marketData) {
    try {
      const candles = marketData.data['5m'];
      if (!candles || candles.length === 0) {
        return { reject: true, reason: 'No candle data' };
      }
      
      const latestCandle = candles[candles.length - 1];
      const bodySize = Math.abs(latestCandle.close - latestCandle.open);
      const totalRange = latestCandle.high - latestCandle.low;
      const upperWick = latestCandle.high - Math.max(latestCandle.open, latestCandle.close);
      const lowerWick = Math.min(latestCandle.open, latestCandle.close) - latestCandle.low;
      
      if (totalRange === 0) {
        return { reject: true, reason: 'Zero range candle' };
      }
      
      const wickRatio = (upperWick + lowerWick) / totalRange;
      
      // Reject if too much wick (uncertainty)
      if (wickRatio > this.validationConfig.wickRatioThreshold) {
        return { reject: true, reason: `High wick ratio (${(wickRatio * 100).toFixed(1)}%)` };
      }
      
      // Reject doji-like candles
      const bodyRatio = bodySize / totalRange;
      if (bodyRatio < 0.1) {
        return { reject: true, reason: 'Doji-like indecision candle' };
      }
      
      return { reject: false, reason: 'Good candle quality' };
      
    } catch (error) {
      this.logger.error('❌ Candle quality check failed:', error);
      return { reject: false, reason: 'Quality check failed' };
    }
  }

  checkForSuddenSpikes(marketData) {
    try {
      const candles = marketData.data['5m'];
      if (!candles || candles.length < 5) {
        return { reject: false, reason: 'Insufficient data' };
      }
      
      const recent = candles.slice(-5);
      const latest = recent[recent.length - 1];
      const previous = recent.slice(0, -1);
      
      // Calculate average range of previous candles
      const avgRange = previous.reduce((sum, c) => sum + (c.high - c.low), 0) / previous.length;
      const latestRange = latest.high - latest.low;
      
      // Check for sudden range expansion
      if (latestRange > avgRange * 3) {
        return { reject: true, reason: `Sudden range spike (${(latestRange / avgRange).toFixed(1)}x normal)` };
      }
      
      // Check for sudden price gaps
      const prevClose = previous[previous.length - 1].close;
      const gap = Math.abs(latest.open - prevClose) / prevClose;
      
      if (gap > 0.005) { // 0.5% gap
        return { reject: true, reason: `Large price gap (${(gap * 100).toFixed(2)}%)` };
      }
      
      return { reject: false, reason: 'No spikes detected' };
      
    } catch (error) {
      this.logger.error('❌ Spike detection failed:', error);
      return { reject: false, reason: 'Spike check failed' };
    }
  }

  checkSignalConflicts(quantPrediction, analystValidation) {
    try {
      // Check for direction conflicts
      const quantDirection = quantPrediction.direction;
      const analystDirection = analystValidation.validation === 'APPROVE' ? quantDirection : 
                              analystValidation.validation === 'REJECT' ? (quantDirection === 'BUY' ? 'SELL' : 'BUY') : 'NEUTRAL';
      
      if (analystDirection !== 'NEUTRAL' && quantDirection !== analystDirection) {
        return { reject: true, reason: `Direction conflict: Quant ${quantDirection} vs Analyst ${analystDirection}` };
      }
      
      // Check for confidence conflicts
      const confidenceDiff = Math.abs(quantPrediction.confidence - analystValidation.confidence);
      if (confidenceDiff > 0.3) {
        return { reject: true, reason: `Large confidence difference (${(confidenceDiff * 100).toFixed(1)}%)` };
      }
      
      return { reject: false, reason: 'No conflicts detected' };
      
    } catch (error) {
      this.logger.error('❌ Signal conflict check failed:', error);
      return { reject: false, reason: 'Conflict check failed' };
    }
  }

  // Utility calculation methods
  calculateCurrentVolatility(candles) {
    if (candles.length < 20) return 0;
    
    const recent = candles.slice(-20);
    const returns = [];
    
    for (let i = 1; i < recent.length; i++) {
      const returnValue = (recent[i].close - recent[i-1].close) / recent[i-1].close;
      returns.push(returnValue);
    }
    
    const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
    return Math.sqrt(variance) * 100; // Convert to percentage
  }

  calculateCurrentVolumeRatio(candles) {
    if (candles.length < 20) return 1;
    
    const recent = candles.slice(-20);
    const avgVolume = recent.slice(0, -1).reduce((sum, c) => sum + c.volume, 0) / (recent.length - 1);
    const currentVolume = recent[recent.length - 1].volume;
    
    return avgVolume > 0 ? currentVolume / avgVolume : 1;
  }

  determineCurrentTrend(candles) {
    if (candles.length < 10) return 'NEUTRAL';
    
    const recent = candles.slice(-10);
    const closes = recent.map(c => c.close);
    const firstHalf = closes.slice(0, 5);
    const secondHalf = closes.slice(5);
    
    const firstAvg = firstHalf.reduce((sum, c) => sum + c, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, c) => sum + c, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.001) return 'BULLISH';
    if (change < -0.001) return 'BEARISH';
    return 'NEUTRAL';
  }

  getCurrentTradingSession() {
    const hour = new Date().getUTCHours();
    
    if (hour >= 0 && hour < 8) return 'ASIAN';
    if (hour >= 8 && hour < 13) return 'LONDON';
    if (hour >= 13 && hour < 16) return 'OVERLAP';
    if (hour >= 16 && hour < 21) return 'NEWYORK';
    return 'OFF_HOURS';
  }

  checkDataFreshness(marketData) {
    if (!marketData.metadata || !marketData.metadata.lastUpdate) {
      return false;
    }
    
    const age = Date.now() - marketData.metadata.lastUpdate;
    return age < 5 * 60 * 1000; // 5 minutes
  }

  checkProviderHealth() {
    const providers = this.getActiveProviders();
    const healthyProviders = providers.filter(provider => {
      const stats = this.performance.providerStats[provider];
      const successRate = stats.requests > 0 ? stats.successes / stats.requests : 1;
      return successRate > 0.7; // 70% success rate threshold
    });
    
    return healthyProviders.length >= Math.ceil(providers.length / 2);
  }

  // Result creation methods
  createRejectionResult(signalId, reason, confidence, startTime) {
    return {
      decision: 'REJECT',
      confidence,
      reasoning: reason,
      contextAnalysis: null,
      aiValidation: null,
      preValidation: { passed: false, reason },
      processingTime: Date.now() - startTime,
      timestamp: Date.now(),
      signalId
    };
  }

  createErrorResult(signalId, errorMessage, startTime) {
    return {
      decision: 'REJECT',
      confidence: 0.1,
      reasoning: `Processing error: ${errorMessage}`,
      contextAnalysis: null,
      aiValidation: null,
      preValidation: { passed: false, reason: 'Processing error' },
      processingTime: Date.now() - startTime,
      timestamp: Date.now(),
      signalId,
      error: true
    };
  }

  storeRecentSignal(result) {
    this.realtimeContext.recentSignals.push({
      signalId: result.signalId,
      decision: result.decision,
      confidence: result.confidence,
      timestamp: result.timestamp
    });
    
    // Keep only last 50 signals
    if (this.realtimeContext.recentSignals.length > 50) {
      this.realtimeContext.recentSignals = this.realtimeContext.recentSignals.slice(-50);
    }
    
    this.realtimeContext.lastSignalTime = result.timestamp;
  }

  updatePerformanceTracking(result) {
    this.performance.decisions++;
    
    if (result.decision === 'APPROVE') {
      this.performance.approvals++;
    } else {
      this.performance.rejections++;
    }
    
    this.performance.avgProcessingTime = 
      (this.performance.avgProcessingTime + result.processingTime) / 2;
    
    this.performance.avgConfidence = 
      (this.performance.avgConfidence + result.confidence) / 2;
  }

  getActiveProviders() {
    return Object.keys(this.fastProviders)
      .filter(provider => this.fastProviders[provider].active)
      .sort((a, b) => this.fastProviders[a].priority - this.fastProviders[b].priority);
  }

  getPerformanceStats() {
    return {
      ...this.performance,
      approvalRate: this.performance.decisions > 0 ? 
        this.performance.approvals / this.performance.decisions : 0,
      recentActivity: this.analyzeRecentActivity(),
      systemHealth: this.realtimeContext.systemHealth,
      lastUpdate: Date.now()
    };
  }
}

module.exports = { UltimateReflexBrain };