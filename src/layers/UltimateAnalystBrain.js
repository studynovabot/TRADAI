/**
 * Ultimate Analyst Brain - Advanced LLM Validation Engine
 * 
 * This module implements the enhanced analyst brain using Claude 3 Opus / GPT-4
 * for sophisticated candlestick interpretation, technical indicator alignment,
 * and pattern recognition with market structure analysis
 */

const { Logger } = require('../utils/Logger');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class UltimateAnalystBrain {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // AI Provider configuration
    this.aiProviders = {
      groq: {
        apiKey: config.groqApiKey,
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'llama-3.1-70b-versatile',
        maxTokens: 4000,
        temperature: 0.1,
        active: !!config.groqApiKey
      },
      together: {
        apiKey: config.togetherApiKey,
        baseUrl: 'https://api.together.xyz/v1',
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        maxTokens: 4000,
        temperature: 0.1,
        active: !!config.togetherApiKey
      },
      openrouter: {
        apiKey: config.openrouterApiKey,
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'anthropic/claude-3.5-sonnet',
        maxTokens: 4000,
        temperature: 0.1,
        active: !!config.openrouterApiKey
      }
    };
    
    // Analysis configuration
    this.analysisConfig = {
      confluenceThreshold: 75,
      minIndicatorAgreement: 3,
      patternWeights: {
        reversal: 0.4,
        continuation: 0.3,
        indecision: 0.2,
        breakout: 0.5
      },
      marketStructureWeights: {
        supportResistance: 0.3,
        trendlines: 0.25,
        fibonacci: 0.2,
        volumeProfile: 0.25
      },
      riskFactors: {
        highVolatility: 0.8,
        lowVolume: 0.7,
        newsEvents: 0.9,
        marketHours: 0.6
      }
    };
    
    // Validation criteria
    this.validationCriteria = {
      technicalAlignment: {
        rsi: { weight: 0.2, thresholds: { oversold: 30, overbought: 70 } },
        macd: { weight: 0.25, signalTypes: ['bullish_cross', 'bearish_cross', 'divergence'] },
        ema: { weight: 0.2, alignmentRequired: 3 },
        bollinger: { weight: 0.15, positions: ['squeeze', 'expansion', 'bounce'] },
        volume: { weight: 0.2, confirmationRequired: true }
      },
      candlestickPatterns: {
        reversal: { weight: 0.4, minStrength: 0.7 },
        continuation: { weight: 0.3, minStrength: 0.6 },
        indecision: { weight: -0.2, maxTolerance: 0.3 }
      },
      marketStructure: {
        trend: { weight: 0.3, minStrength: 0.6 },
        supportResistance: { weight: 0.25, proximity: 0.02 },
        breakout: { weight: 0.25, volumeConfirmation: true },
        fibonacci: { weight: 0.2, keyLevels: [0.382, 0.5, 0.618] }
      }
    };
    
    // Performance tracking
    this.performance = {
      validations: 0,
      approvals: 0,
      rejections: 0,
      accuracy: 0,
      avgConfidence: 0,
      avgProcessingTime: 0,
      providerStats: {}
    };
    
    // Initialize provider stats
    Object.keys(this.aiProviders).forEach(provider => {
      this.performance.providerStats[provider] = {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0
      };
    });
    
    this.logger.info('🧠 Ultimate Analyst Brain initialized');
    this.logger.info(`🤖 Active AI providers: ${this.getActiveProviders().join(', ')}`);
  }

  /**
   * Main validation method
   */
  async validate(quantPrediction, marketData) {
    const startTime = Date.now();
    
    try {
      this.logger.info('🔍 Starting comprehensive market analysis...');
      
      // Prepare analysis context
      const analysisContext = await this.prepareAnalysisContext(quantPrediction, marketData);
      
      // Perform multi-layer analysis
      const technicalAnalysis = await this.performTechnicalAnalysis(analysisContext);
      const patternAnalysis = await this.performPatternAnalysis(analysisContext);
      const structureAnalysis = await this.performMarketStructureAnalysis(analysisContext);
      const riskAnalysis = await this.performRiskAnalysis(analysisContext);
      
      // Get AI validation
      const aiValidation = await this.getAIValidation(analysisContext, {
        technical: technicalAnalysis,
        patterns: patternAnalysis,
        structure: structureAnalysis,
        risk: riskAnalysis
      });
      
      // Calculate confluence score
      const confluenceScore = this.calculateConfluenceScore({
        technical: technicalAnalysis,
        patterns: patternAnalysis,
        structure: structureAnalysis,
        ai: aiValidation
      });
      
      // Determine final validation
      const validation = this.determineValidation(quantPrediction, confluenceScore, aiValidation, riskAnalysis);
      
      // Create validation result
      const result = {
        validation: validation.decision,
        confidence: validation.confidence,
        confluenceScore,
        reasoning: validation.reasoning,
        technicalAnalysis,
        patternAnalysis,
        structureAnalysis,
        riskAnalysis,
        aiValidation,
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      };
      
      // Update performance tracking
      this.updatePerformanceTracking(result);
      
      this.logger.info(`✅ Analysis complete: ${validation.decision} (${confluenceScore}/100 confluence, ${(validation.confidence * 100).toFixed(1)}% confidence)`);
      
      return result;
      
    } catch (error) {
      this.logger.error('❌ Analyst validation failed:', error);
      throw error;
    }
  }

  /**
   * Prepare comprehensive analysis context
   */
  async prepareAnalysisContext(quantPrediction, marketData) {
    const context = {
      prediction: quantPrediction,
      marketData: marketData,
      timeframes: {},
      currentPrice: 0,
      timestamp: Date.now()
    };
    
    // Extract timeframe data
    const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '4h'];
    timeframes.forEach(tf => {
      if (marketData.data[tf] && marketData.data[tf].length > 0) {
        const candles = marketData.data[tf];
        context.timeframes[tf] = {
          candles: candles.slice(-100), // Last 100 candles
          latest: candles[candles.length - 1],
          indicators: this.calculateIndicators(candles)
        };
        
        if (tf === '5m') {
          context.currentPrice = candles[candles.length - 1].close;
        }
      }
    });
    
    return context;
  }

  /**
   * Perform comprehensive technical analysis
   */
  async performTechnicalAnalysis(context) {
    const analysis = {
      rsi: {},
      macd: {},
      ema: {},
      bollinger: {},
      volume: {},
      overall: { score: 0, signals: [] }
    };
    
    try {
      // Analyze each timeframe
      Object.entries(context.timeframes).forEach(([tf, data]) => {
        if (data.indicators) {
          const indicators = data.indicators;
          
          // RSI Analysis
          if (indicators.rsi && indicators.rsi.length > 0) {
            const rsi = indicators.rsi[indicators.rsi.length - 1];
            analysis.rsi[tf] = {
              value: rsi,
              signal: this.interpretRSI(rsi),
              strength: this.calculateRSIStrength(rsi)
            };
          }
          
          // MACD Analysis
          if (indicators.macd && indicators.macd.length > 0) {
            const macd = indicators.macd[indicators.macd.length - 1];
            analysis.macd[tf] = {
              macd: macd.MACD,
              signal: macd.signal,
              histogram: macd.histogram,
              interpretation: this.interpretMACD(macd),
              strength: this.calculateMACDStrength(macd)
            };
          }
          
          // EMA Analysis
          if (indicators.ema) {
            analysis.ema[tf] = this.analyzeEMAAlignment(indicators.ema, context.currentPrice);
          }
          
          // Bollinger Bands Analysis
          if (indicators.bollinger && indicators.bollinger.length > 0) {
            const bb = indicators.bollinger[indicators.bollinger.length - 1];
            analysis.bollinger[tf] = this.analyzeBollingerBands(bb, context.currentPrice);
          }
          
          // Volume Analysis
          if (data.candles.length > 20) {
            analysis.volume[tf] = this.analyzeVolume(data.candles);
          }
        }
      });
      
      // Calculate overall technical score
      analysis.overall = this.calculateTechnicalScore(analysis);
      
      return analysis;
      
    } catch (error) {
      this.logger.error('❌ Technical analysis failed:', error);
      return analysis;
    }
  }

  /**
   * Perform candlestick pattern analysis
   */
  async performPatternAnalysis(context) {
    const analysis = {
      patterns: {},
      overall: { score: 0, signals: [], strength: 0 }
    };
    
    try {
      // Analyze patterns in each timeframe
      Object.entries(context.timeframes).forEach(([tf, data]) => {
        const candles = data.candles;
        if (candles.length >= 10) {
          const patterns = this.detectCandlestickPatterns(candles.slice(-10));
          analysis.patterns[tf] = {
            detected: patterns,
            bullish: patterns.filter(p => p.direction === 'bullish'),
            bearish: patterns.filter(p => p.direction === 'bearish'),
            neutral: patterns.filter(p => p.direction === 'neutral')
          };
        }
      });
      
      // Calculate overall pattern score
      analysis.overall = this.calculatePatternScore(analysis.patterns);
      
      return analysis;
      
    } catch (error) {
      this.logger.error('❌ Pattern analysis failed:', error);
      return analysis;
    }
  }

  /**
   * Perform market structure analysis
   */
  async performMarketStructureAnalysis(context) {
    const analysis = {
      trend: {},
      supportResistance: {},
      breakouts: {},
      fibonacci: {},
      overall: { score: 0, signals: [] }
    };
    
    try {
      // Analyze market structure for each timeframe
      Object.entries(context.timeframes).forEach(([tf, data]) => {
        const candles = data.candles;
        if (candles.length >= 50) {
          // Trend analysis
          analysis.trend[tf] = this.analyzeTrend(candles);
          
          // Support/Resistance analysis
          analysis.supportResistance[tf] = this.analyzeSupportResistance(candles, context.currentPrice);
          
          // Breakout analysis
          analysis.breakouts[tf] = this.analyzeBreakouts(candles);
          
          // Fibonacci analysis
          if (candles.length >= 100) {
            analysis.fibonacci[tf] = this.analyzeFibonacci(candles, context.currentPrice);
          }
        }
      });
      
      // Calculate overall structure score
      analysis.overall = this.calculateStructureScore(analysis);
      
      return analysis;
      
    } catch (error) {
      this.logger.error('❌ Market structure analysis failed:', error);
      return analysis;
    }
  }

  /**
   * Perform risk analysis
   */
  async performRiskAnalysis(context) {
    const analysis = {
      volatility: 0,
      volume: 0,
      marketHours: 0,
      news: 0,
      overall: { score: 0, riskLevel: 'MEDIUM', factors: [] }
    };
    
    try {
      // Volatility risk
      const primaryTF = context.timeframes['5m'];
      if (primaryTF && primaryTF.candles.length >= 20) {
        analysis.volatility = this.calculateVolatilityRisk(primaryTF.candles);
      }
      
      // Volume risk
      if (primaryTF && primaryTF.candles.length >= 20) {
        analysis.volume = this.calculateVolumeRisk(primaryTF.candles);
      }
      
      // Market hours risk
      analysis.marketHours = this.calculateMarketHoursRisk();
      
      // News risk (simplified - would integrate with news API in production)
      analysis.news = this.calculateNewsRisk();
      
      // Calculate overall risk
      analysis.overall = this.calculateOverallRisk(analysis);
      
      return analysis;
      
    } catch (error) {
      this.logger.error('❌ Risk analysis failed:', error);
      return analysis;
    }
  }

  /**
   * Get AI validation using LLM
   */
  async getAIValidation(context, analyses) {
    try {
      const prompt = this.buildAnalysisPrompt(context, analyses);
      const providers = this.getActiveProviders();
      
      // Try providers in order of preference
      for (const provider of providers) {
        try {
          const response = await this.queryAIProvider(provider, prompt);
          if (response && response.validation) {
            this.performance.providerStats[provider].successes++;
            return response;
          }
        } catch (error) {
          this.logger.warn(`⚠️ ${provider} AI validation failed:`, error.message);
          this.performance.providerStats[provider].failures++;
        }
      }
      
      // Fallback to rule-based validation
      return this.fallbackValidation(context, analyses);
      
    } catch (error) {
      this.logger.error('❌ AI validation failed:', error);
      return this.fallbackValidation(context, analyses);
    }
  }

  /**
   * Build comprehensive analysis prompt for AI
   */
  buildAnalysisPrompt(context, analyses) {
    const { prediction, currentPrice } = context;
    
    return `You are an expert forex trader analyzing ${context.marketData.pair} for a ${prediction.direction} signal.

CURRENT SITUATION:
- Price: ${currentPrice}
- ML Prediction: ${prediction.direction} (${(prediction.confidence * 100).toFixed(1)}% confidence)
- Prediction Probability: ${(prediction.probability * 100).toFixed(1)}%

TECHNICAL ANALYSIS:
${this.formatTechnicalAnalysis(analyses.technical)}

PATTERN ANALYSIS:
${this.formatPatternAnalysis(analyses.patterns)}

MARKET STRUCTURE:
${this.formatStructureAnalysis(analyses.structure)}

RISK FACTORS:
${this.formatRiskAnalysis(analyses.risk)}

TASK:
Analyze this trading setup and provide:
1. VALIDATION: APPROVE/REJECT/CONDITIONAL
2. CONFIDENCE: 0-100%
3. REASONING: Detailed explanation (max 200 words)
4. KEY_FACTORS: Top 3 supporting/opposing factors
5. RISK_ASSESSMENT: HIGH/MEDIUM/LOW
6. CONFLUENCE_SCORE: 0-100 based on indicator alignment

Respond in JSON format:
{
  "validation": "APPROVE/REJECT/CONDITIONAL",
  "confidence": 85,
  "reasoning": "Detailed analysis...",
  "keyFactors": ["Factor 1", "Factor 2", "Factor 3"],
  "riskAssessment": "MEDIUM",
  "confluenceScore": 78,
  "recommendedAction": "TAKE/SKIP/WAIT"
}`;
  }

  /**
   * Query AI provider
   */
  async queryAIProvider(provider, prompt) {
    const startTime = Date.now();
    const providerConfig = this.aiProviders[provider];
    
    try {
      this.performance.providerStats[provider].requests++;
      
      const response = await axios.post(
        `${providerConfig.baseUrl}/chat/completions`,
        {
          model: providerConfig.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert forex trading analyst. Provide precise, actionable analysis in the requested JSON format.'
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
          timeout: 30000
        }
      );
      
      const responseTime = Date.now() - startTime;
      this.performance.providerStats[provider].avgResponseTime = 
        (this.performance.providerStats[provider].avgResponseTime + responseTime) / 2;
      
      const content = response.data.choices[0].message.content;
      
      // Parse JSON response
      try {
        const parsed = JSON.parse(content);
        return {
          ...parsed,
          provider,
          responseTime
        };
      } catch (parseError) {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return {
            ...JSON.parse(jsonMatch[0]),
            provider,
            responseTime
          };
        }
        throw new Error('Invalid JSON response');
      }
      
    } catch (error) {
      this.logger.error(`❌ ${provider} query failed:`, error.message);
      throw error;
    }
  }

  /**
   * Fallback validation when AI fails
   */
  fallbackValidation(context, analyses) {
    const { technical, patterns, structure, risk } = analyses;
    
    // Rule-based validation logic
    let score = 0;
    const factors = [];
    
    // Technical score contribution
    if (technical.overall.score > 70) {
      score += 30;
      factors.push('Strong technical alignment');
    } else if (technical.overall.score < 30) {
      score -= 20;
      factors.push('Weak technical signals');
    }
    
    // Pattern score contribution
    if (patterns.overall.score > 70) {
      score += 25;
      factors.push('Favorable candlestick patterns');
    }
    
    // Structure score contribution
    if (structure.overall.score > 70) {
      score += 25;
      factors.push('Supportive market structure');
    }
    
    // Risk penalty
    if (risk.overall.score > 70) {
      score -= 30;
      factors.push('High risk environment');
    }
    
    const confidence = Math.max(0, Math.min(100, score + 50)) / 100;
    const validation = score > 20 ? 'APPROVE' : score > -10 ? 'CONDITIONAL' : 'REJECT';
    
    return {
      validation,
      confidence,
      reasoning: `Rule-based analysis: ${factors.join(', ')}`,
      keyFactors: factors.slice(0, 3),
      riskAssessment: risk.overall.riskLevel,
      confluenceScore: Math.max(0, Math.min(100, score + 50)),
      recommendedAction: validation === 'APPROVE' ? 'TAKE' : validation === 'CONDITIONAL' ? 'WAIT' : 'SKIP',
      provider: 'fallback'
    };
  }

  /**
   * Calculate confluence score
   */
  calculateConfluenceScore(analyses) {
    let score = 0;
    let maxScore = 0;
    
    // Technical analysis weight: 40%
    const techWeight = 40;
    score += (analyses.technical.overall.score / 100) * techWeight;
    maxScore += techWeight;
    
    // Pattern analysis weight: 25%
    const patternWeight = 25;
    score += (analyses.patterns.overall.score / 100) * patternWeight;
    maxScore += patternWeight;
    
    // Structure analysis weight: 25%
    const structureWeight = 25;
    score += (analyses.structure.overall.score / 100) * structureWeight;
    maxScore += structureWeight;
    
    // AI validation weight: 10%
    const aiWeight = 10;
    if (analyses.ai && analyses.ai.confluenceScore) {
      score += (analyses.ai.confluenceScore / 100) * aiWeight;
    }
    maxScore += aiWeight;
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Determine final validation decision
   */
  determineValidation(quantPrediction, confluenceScore, aiValidation, riskAnalysis) {
    let decision = 'REJECT';
    let confidence = 0.5;
    let reasoning = '';
    
    // Check minimum confluence threshold
    if (confluenceScore < this.analysisConfig.confluenceThreshold) {
      decision = 'REJECT';
      confidence = 0.3;
      reasoning = `Insufficient confluence (${confluenceScore}/${this.analysisConfig.confluenceThreshold})`;
    }
    // Check AI validation
    else if (aiValidation && aiValidation.validation === 'REJECT') {
      decision = 'REJECT';
      confidence = 0.4;
      reasoning = `AI validation rejected: ${aiValidation.reasoning}`;
    }
    // Check risk factors
    else if (riskAnalysis.overall.riskLevel === 'HIGH') {
      decision = 'CONDITIONAL';
      confidence = 0.6;
      reasoning = `High risk environment detected`;
    }
    // Approve if all conditions met
    else {
      decision = 'APPROVE';
      confidence = Math.min(0.95, (confluenceScore / 100) * (aiValidation?.confidence || 0.8));
      reasoning = `Strong confluence (${confluenceScore}/100) with favorable conditions`;
    }
    
    return { decision, confidence, reasoning };
  }

  // Technical Analysis Helper Methods
  calculateIndicators(candles) {
    if (candles.length < 20) return null;
    
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    
    try {
      return {
        rsi: RSI.calculate({ values: closes, period: 14 }),
        macd: MACD.calculate({
          values: closes,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          SimpleMAOscillator: false,
          SimpleMASignal: false
        }),
        ema: {
          8: EMA.calculate({ values: closes, period: 8 }),
          21: EMA.calculate({ values: closes, period: 21 }),
          50: EMA.calculate({ values: closes, period: 50 }),
          200: EMA.calculate({ values: closes, period: 200 })
        },
        bollinger: BollingerBands.calculate({
          values: closes,
          period: 20,
          stdDev: 2
        }),
        atr: ATR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: 14
        }),
        stochastic: Stochastic.calculate({
          high: highs,
          low: lows,
          close: closes,
          kPeriod: 14,
          dPeriod: 3,
          slowing: 3
        })
      };
    } catch (error) {
      this.logger.error('❌ Indicator calculation failed:', error);
      return null;
    }
  }

  interpretRSI(rsi) {
    if (rsi > 70) return 'OVERBOUGHT';
    if (rsi < 30) return 'OVERSOLD';
    if (rsi > 50) return 'BULLISH';
    return 'BEARISH';
  }

  calculateRSIStrength(rsi) {
    if (rsi > 80 || rsi < 20) return 0.9;
    if (rsi > 70 || rsi < 30) return 0.7;
    if (rsi > 60 || rsi < 40) return 0.5;
    return 0.3;
  }

  interpretMACD(macd) {
    const { MACD: macdLine, signal, histogram } = macd;
    
    if (macdLine > signal && histogram > 0) return 'BULLISH_CROSS';
    if (macdLine < signal && histogram < 0) return 'BEARISH_CROSS';
    if (macdLine > 0 && signal > 0) return 'BULLISH';
    if (macdLine < 0 && signal < 0) return 'BEARISH';
    return 'NEUTRAL';
  }

  calculateMACDStrength(macd) {
    const histogramAbs = Math.abs(macd.histogram);
    if (histogramAbs > 0.001) return 0.8;
    if (histogramAbs > 0.0005) return 0.6;
    return 0.4;
  }

  analyzeEMAAlignment(emas, currentPrice) {
    const alignment = {
      bullish: 0,
      bearish: 0,
      strength: 0,
      signals: []
    };
    
    const periods = [8, 21, 50, 200];
    const values = periods.map(p => emas[p] && emas[p].length > 0 ? emas[p][emas[p].length - 1] : null).filter(v => v !== null);
    
    if (values.length < 2) return alignment;
    
    // Check alignment
    let bullishAlignment = 0;
    let bearishAlignment = 0;
    
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] > values[i + 1]) bullishAlignment++;
      else bearishAlignment++;
    }
    
    alignment.bullish = bullishAlignment / (values.length - 1);
    alignment.bearish = bearishAlignment / (values.length - 1);
    alignment.strength = Math.max(alignment.bullish, alignment.bearish);
    
    // Price relative to EMAs
    const aboveEMAs = values.filter(v => currentPrice > v).length;
    const belowEMAs = values.filter(v => currentPrice < v).length;
    
    if (aboveEMAs > belowEMAs) {
      alignment.signals.push('PRICE_ABOVE_EMAS');
    } else if (belowEMAs > aboveEMAs) {
      alignment.signals.push('PRICE_BELOW_EMAS');
    }
    
    return alignment;
  }

  analyzeBollingerBands(bb, currentPrice) {
    const { upper, middle, lower } = bb;
    const position = (currentPrice - lower) / (upper - lower);
    const width = (upper - lower) / middle;
    
    return {
      position,
      width,
      signal: position > 0.8 ? 'OVERBOUGHT' : position < 0.2 ? 'OVERSOLD' : 'NEUTRAL',
      squeeze: width < 0.1,
      expansion: width > 0.2
    };
  }

  analyzeVolume(candles) {
    const volumes = candles.map(c => c.volume);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];
    
    return {
      ratio: currentVolume / avgVolume,
      trend: this.calculateVolumeTrend(volumes),
      signal: currentVolume > avgVolume * 1.5 ? 'HIGH' : currentVolume < avgVolume * 0.5 ? 'LOW' : 'NORMAL'
    };
  }

  calculateVolumeTrend(volumes) {
    if (volumes.length < 10) return 0;
    
    const recent = volumes.slice(-5);
    const previous = volumes.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const previousAvg = previous.reduce((sum, v) => sum + v, 0) / previous.length;
    
    return (recentAvg - previousAvg) / previousAvg;
  }

  calculateTechnicalScore(analysis) {
    let score = 0;
    let signals = [];
    
    // RSI contribution
    Object.values(analysis.rsi).forEach(rsi => {
      if (rsi.signal === 'OVERSOLD') {
        score += 15 * rsi.strength;
        signals.push('RSI Oversold');
      } else if (rsi.signal === 'OVERBOUGHT') {
        score -= 15 * rsi.strength;
        signals.push('RSI Overbought');
      }
    });
    
    // MACD contribution
    Object.values(analysis.macd).forEach(macd => {
      if (macd.interpretation === 'BULLISH_CROSS') {
        score += 20 * macd.strength;
        signals.push('MACD Bullish Cross');
      } else if (macd.interpretation === 'BEARISH_CROSS') {
        score -= 20 * macd.strength;
        signals.push('MACD Bearish Cross');
      }
    });
    
    // EMA contribution
    Object.values(analysis.ema).forEach(ema => {
      score += (ema.bullish - ema.bearish) * 15;
      if (ema.signals.includes('PRICE_ABOVE_EMAS')) {
        signals.push('Price Above EMAs');
      }
    });
    
    // Volume contribution
    Object.values(analysis.volume).forEach(vol => {
      if (vol.signal === 'HIGH' && vol.trend > 0.2) {
        score += 10;
        signals.push('Volume Breakout');
      }
    });
    
    return {
      score: Math.max(0, Math.min(100, score + 50)),
      signals: signals.slice(0, 5)
    };
  }

  // Pattern Analysis Helper Methods
  detectCandlestickPatterns(candles) {
    const patterns = [];
    
    if (candles.length < 3) return patterns;
    
    // Simple pattern detection (would use more sophisticated library in production)
    const latest = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];
    
    // Doji pattern
    if (this.isDoji(latest)) {
      patterns.push({
        type: 'doji',
        direction: 'neutral',
        strength: 0.6,
        candle: latest
      });
    }
    
    // Hammer pattern
    if (this.isHammer(latest)) {
      patterns.push({
        type: 'hammer',
        direction: 'bullish',
        strength: 0.7,
        candle: latest
      });
    }
    
    // Engulfing patterns
    if (this.isBullishEngulfing(prev, latest)) {
      patterns.push({
        type: 'bullish_engulfing',
        direction: 'bullish',
        strength: 0.8,
        candles: [prev, latest]
      });
    }
    
    if (this.isBearishEngulfing(prev, latest)) {
      patterns.push({
        type: 'bearish_engulfing',
        direction: 'bearish',
        strength: 0.8,
        candles: [prev, latest]
      });
    }
    
    return patterns;
  }

  isDoji(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;
    return totalRange > 0 && (bodySize / totalRange) < 0.1;
  }

  isHammer(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    
    return totalRange > 0 && 
           lowerWick > bodySize * 2 && 
           upperWick < bodySize * 0.5;
  }

  isBullishEngulfing(prev, current) {
    return prev.close < prev.open && // Previous bearish
           current.close > current.open && // Current bullish
           current.open < prev.close && // Current opens below prev close
           current.close > prev.open; // Current closes above prev open
  }

  isBearishEngulfing(prev, current) {
    return prev.close > prev.open && // Previous bullish
           current.close < current.open && // Current bearish
           current.open > prev.close && // Current opens above prev close
           current.close < prev.open; // Current closes below prev open
  }

  calculatePatternScore(patterns) {
    let score = 0;
    let signals = [];
    let totalStrength = 0;
    
    Object.values(patterns).forEach(tfPatterns => {
      tfPatterns.bullish.forEach(pattern => {
        score += pattern.strength * 20;
        signals.push(`Bullish ${pattern.type}`);
        totalStrength += pattern.strength;
      });
      
      tfPatterns.bearish.forEach(pattern => {
        score -= pattern.strength * 20;
        signals.push(`Bearish ${pattern.type}`);
        totalStrength += pattern.strength;
      });
    });
    
    return {
      score: Math.max(0, Math.min(100, score + 50)),
      signals: signals.slice(0, 5),
      strength: totalStrength
    };
  }

  // Market Structure Helper Methods
  analyzeTrend(candles) {
    if (candles.length < 50) return { direction: 'NEUTRAL', strength: 0 };
    
    const closes = candles.map(c => c.close);
    const shortMA = this.calculateSMA(closes.slice(-10));
    const mediumMA = this.calculateSMA(closes.slice(-20));
    const longMA = this.calculateSMA(closes.slice(-50));
    
    let direction = 'NEUTRAL';
    let strength = 0;
    
    if (shortMA > mediumMA && mediumMA > longMA) {
      direction = 'BULLISH';
      strength = (shortMA - longMA) / longMA;
    } else if (shortMA < mediumMA && mediumMA < longMA) {
      direction = 'BEARISH';
      strength = (longMA - shortMA) / longMA;
    }
    
    return { direction, strength: Math.min(1, Math.abs(strength) * 100) };
  }

  analyzeSupportResistance(candles, currentPrice) {
    const levels = this.findSupportResistanceLevels(candles);
    const nearestSupport = this.findNearestLevel(levels.support, currentPrice, 'below');
    const nearestResistance = this.findNearestLevel(levels.resistance, currentPrice, 'above');
    
    return {
      support: nearestSupport,
      resistance: nearestResistance,
      nearSupport: nearestSupport && Math.abs(currentPrice - nearestSupport) / currentPrice < 0.01,
      nearResistance: nearestResistance && Math.abs(currentPrice - nearestResistance) / currentPrice < 0.01
    };
  }

  findSupportResistanceLevels(candles) {
    const support = [];
    const resistance = [];
    const lookback = 10;
    
    for (let i = lookback; i < candles.length - lookback; i++) {
      const current = candles[i];
      const before = candles.slice(i - lookback, i);
      const after = candles.slice(i + 1, i + lookback + 1);
      
      // Support level (local low)
      if (before.every(c => c.low >= current.low) && after.every(c => c.low >= current.low)) {
        support.push(current.low);
      }
      
      // Resistance level (local high)
      if (before.every(c => c.high <= current.high) && after.every(c => c.high <= current.high)) {
        resistance.push(current.high);
      }
    }
    
    return { support, resistance };
  }

  findNearestLevel(levels, price, direction) {
    if (levels.length === 0) return null;
    
    const filtered = direction === 'below' 
      ? levels.filter(l => l < price)
      : levels.filter(l => l > price);
    
    if (filtered.length === 0) return null;
    
    return direction === 'below'
      ? Math.max(...filtered)
      : Math.min(...filtered);
  }

  analyzeBreakouts(candles) {
    // Simplified breakout detection
    if (candles.length < 20) return { detected: false };
    
    const recent = candles.slice(-5);
    const previous = candles.slice(-20, -5);
    
    const recentHigh = Math.max(...recent.map(c => c.high));
    const recentLow = Math.min(...recent.map(c => c.low));
    const previousHigh = Math.max(...previous.map(c => c.high));
    const previousLow = Math.min(...previous.map(c => c.low));
    
    const bullishBreakout = recentHigh > previousHigh * 1.01;
    const bearishBreakout = recentLow < previousLow * 0.99;
    
    return {
      detected: bullishBreakout || bearishBreakout,
      direction: bullishBreakout ? 'BULLISH' : bearishBreakout ? 'BEARISH' : 'NONE',
      strength: bullishBreakout ? (recentHigh - previousHigh) / previousHigh : 
                bearishBreakout ? (previousLow - recentLow) / previousLow : 0
    };
  }

  analyzeFibonacci(candles, currentPrice) {
    if (candles.length < 50) return { levels: [], nearLevel: false };
    
    // Find swing high and low
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const swingHigh = Math.max(...highs);
    const swingLow = Math.min(...lows);
    
    // Calculate Fibonacci levels
    const range = swingHigh - swingLow;
    const levels = [
      { level: 0.236, price: swingHigh - (range * 0.236) },
      { level: 0.382, price: swingHigh - (range * 0.382) },
      { level: 0.5, price: swingHigh - (range * 0.5) },
      { level: 0.618, price: swingHigh - (range * 0.618) },
      { level: 0.786, price: swingHigh - (range * 0.786) }
    ];
    
    // Check if current price is near any level
    const nearLevel = levels.some(l => Math.abs(currentPrice - l.price) / currentPrice < 0.005);
    
    return { levels, nearLevel };
  }

  calculateStructureScore(analysis) {
    let score = 50; // Neutral starting point
    const signals = [];
    
    // Trend contribution
    Object.values(analysis.trend).forEach(trend => {
      if (trend.direction === 'BULLISH') {
        score += trend.strength * 20;
        signals.push('Bullish Trend');
      } else if (trend.direction === 'BEARISH') {
        score -= trend.strength * 20;
        signals.push('Bearish Trend');
      }
    });
    
    // Support/Resistance contribution
    Object.values(analysis.supportResistance).forEach(sr => {
      if (sr.nearSupport) {
        score += 15;
        signals.push('Near Support');
      }
      if (sr.nearResistance) {
        score -= 15;
        signals.push('Near Resistance');
      }
    });
    
    // Breakout contribution
    Object.values(analysis.breakouts).forEach(breakout => {
      if (breakout.detected) {
        const contribution = breakout.strength * 25;
        if (breakout.direction === 'BULLISH') {
          score += contribution;
          signals.push('Bullish Breakout');
        } else if (breakout.direction === 'BEARISH') {
          score -= contribution;
          signals.push('Bearish Breakout');
        }
      }
    });
    
    return {
      score: Math.max(0, Math.min(100, score)),
      signals: signals.slice(0, 5)
    };
  }

  // Risk Analysis Helper Methods
  calculateVolatilityRisk(candles) {
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      returns.push((candles[i].close - candles[i-1].close) / candles[i-1].close);
    }
    
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    
    // Convert to risk score (0-100, higher = more risky)
    return Math.min(100, volatility * 1000);
  }

  calculateVolumeRisk(candles) {
    const volumes = candles.map(c => c.volume);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];
    
    // Low volume = higher risk
    const volumeRatio = currentVolume / avgVolume;
    return volumeRatio < 0.5 ? 80 : volumeRatio < 0.8 ? 50 : 20;
  }

  calculateMarketHoursRisk() {
    const now = new Date();
    const hour = now.getUTCHours();
    
    // Higher risk during off-hours
    const isMainSession = (hour >= 8 && hour <= 16) || (hour >= 13 && hour <= 21);
    return isMainSession ? 20 : 60;
  }

  calculateNewsRisk() {
    // Simplified news risk - would integrate with economic calendar
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    
    // Higher risk around typical news times
    const isNewsTime = (hour === 8 && minute < 30) || (hour === 13 && minute < 30);
    return isNewsTime ? 80 : 30;
  }

  calculateOverallRisk(analysis) {
    const weights = this.analysisConfig.riskFactors;
    
    let weightedRisk = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([factor, weight]) => {
      if (analysis[factor] !== undefined) {
        weightedRisk += analysis[factor] * weight;
        totalWeight += weight;
      }
    });
    
    const overallScore = totalWeight > 0 ? weightedRisk / totalWeight : 50;
    
    let riskLevel = 'MEDIUM';
    const factors = [];
    
    if (overallScore > 70) {
      riskLevel = 'HIGH';
      factors.push('High volatility', 'Unfavorable conditions');
    } else if (overallScore < 30) {
      riskLevel = 'LOW';
      factors.push('Stable conditions', 'Good liquidity');
    } else {
      factors.push('Moderate risk environment');
    }
    
    return {
      score: overallScore,
      riskLevel,
      factors
    };
  }

  // Utility Methods
  calculateSMA(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  getActiveProviders() {
    return Object.keys(this.aiProviders).filter(provider => 
      this.aiProviders[provider].active
    );
  }

  formatTechnicalAnalysis(analysis) {
    const lines = [];
    
    // RSI summary
    const rsiValues = Object.entries(analysis.rsi).map(([tf, rsi]) => 
      `${tf}: ${rsi.value.toFixed(1)} (${rsi.signal})`
    );
    if (rsiValues.length > 0) {
      lines.push(`RSI: ${rsiValues.join(', ')}`);
    }
    
    // MACD summary
    const macdSignals = Object.entries(analysis.macd).map(([tf, macd]) => 
      `${tf}: ${macd.interpretation}`
    );
    if (macdSignals.length > 0) {
      lines.push(`MACD: ${macdSignals.join(', ')}`);
    }
    
    // Overall technical score
    lines.push(`Technical Score: ${analysis.overall.score}/100`);
    if (analysis.overall.signals.length > 0) {
      lines.push(`Key Signals: ${analysis.overall.signals.join(', ')}`);
    }
    
    return lines.join('\n');
  }

  formatPatternAnalysis(analysis) {
    const lines = [];
    
    Object.entries(analysis.patterns).forEach(([tf, patterns]) => {
      if (patterns.detected.length > 0) {
        const patternNames = patterns.detected.map(p => `${p.type} (${p.direction})`);
        lines.push(`${tf}: ${patternNames.join(', ')}`);
      }
    });
    
    lines.push(`Pattern Score: ${analysis.overall.score}/100`);
    if (analysis.overall.signals.length > 0) {
      lines.push(`Key Patterns: ${analysis.overall.signals.join(', ')}`);
    }
    
    return lines.join('\n');
  }

  formatStructureAnalysis(analysis) {
    const lines = [];
    
    // Trend summary
    const trends = Object.entries(analysis.trend).map(([tf, trend]) => 
      `${tf}: ${trend.direction} (${(trend.strength * 100).toFixed(1)}%)`
    );
    if (trends.length > 0) {
      lines.push(`Trends: ${trends.join(', ')}`);
    }
    
    lines.push(`Structure Score: ${analysis.overall.score}/100`);
    if (analysis.overall.signals.length > 0) {
      lines.push(`Key Factors: ${analysis.overall.signals.join(', ')}`);
    }
    
    return lines.join('\n');
  }

  formatRiskAnalysis(analysis) {
    const lines = [];
    
    lines.push(`Volatility Risk: ${analysis.volatility.toFixed(1)}/100`);
    lines.push(`Volume Risk: ${analysis.volume.toFixed(1)}/100`);
    lines.push(`Market Hours Risk: ${analysis.marketHours.toFixed(1)}/100`);
    lines.push(`Overall Risk: ${analysis.overall.riskLevel} (${analysis.overall.score.toFixed(1)}/100)`);
    
    if (analysis.overall.factors.length > 0) {
      lines.push(`Risk Factors: ${analysis.overall.factors.join(', ')}`);
    }
    
    return lines.join('\n');
  }

  updatePerformanceTracking(result) {
    this.performance.validations++;
    
    if (result.validation === 'APPROVE') {
      this.performance.approvals++;
    } else {
      this.performance.rejections++;
    }
    
    this.performance.avgConfidence = 
      (this.performance.avgConfidence + result.confidence) / 2;
    
    this.performance.avgProcessingTime = 
      (this.performance.avgProcessingTime + result.processingTime) / 2;
  }

  getPerformanceStats() {
    return {
      ...this.performance,
      approvalRate: this.performance.validations > 0 ? 
        this.performance.approvals / this.performance.validations : 0,
      lastUpdate: Date.now()
    };
  }
}

module.exports = { UltimateAnalystBrain };