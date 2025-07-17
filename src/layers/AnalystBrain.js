/**
 * Analyst Brain - Layer 2: LLM-Based Technical Confluence Validator
 * 
 * This module implements the second layer of the 3-layer AI trading system.
 * It uses LLM reasoning (LLaMA 3 via Groq, Claude 3 via Together) to validate
 * Quant Brain predictions using technical confluence analysis.
 */

const { Logger } = require('../utils/Logger');
const Groq = require('groq-sdk');
const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class AnalystBrain {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Initialize AI providers
    this.groq = config.groqApiKey ? new Groq({ apiKey: config.groqApiKey }) : null;
    this.togetherApiKey = config.togetherApiKey;
    
    // Initialize working providers
    this.fireworks = config.fireworksApiKey ? new OpenAI({
      apiKey: config.fireworksApiKey,
      baseURL: 'https://api.fireworks.ai/inference/v1'
    }) : null;
    
    this.deepinfra = config.deepinfraApiKey ? new OpenAI({
      apiKey: config.deepinfraApiKey,
      baseURL: 'https://api.deepinfra.com/v1/openai'
    }) : null;
    
    // Model configurations
    this.models = {
      groq: {
        model: 'llama3-70b-8192',
        maxTokens: 1024,
        temperature: 0.1
      },
      together: {
        model: 'meta-llama/Llama-3-70b-chat-hf',
        maxTokens: 1024,
        temperature: 0.1,
        baseUrl: 'https://api.together.xyz/v1'
      },
      fireworks: {
        model: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
        maxTokens: 1024,
        temperature: 0.1
      },
      deepinfra: {
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        maxTokens: 1024,
        temperature: 0.1
      }
    };
    
    // Validation criteria weights
    this.validationWeights = {
      multiTimeframeTrend: 0.25,
      volumeConfirmation: 0.20,
      technicalIndicators: 0.20,
      candlestickPatterns: 0.15,
      supportResistance: 0.15,
      riskFactors: 0.05
    };
    
    // Confluence thresholds (adjusted for more realistic scoring)
    this.confluenceThresholds = {
      strong: 60,
      moderate: 40,
      weak: 20
    };
    
    this.logger.info('🧠 AnalystBrain initialized');
  }

  /**
   * Main validation method - analyzes Quant Brain prediction using LLM reasoning
   */
  async validate(quantPrediction, marketData) {
    try {
      const startTime = Date.now();
      
      // Create comprehensive technical snapshot
      const technicalSnapshot = this.createTechnicalSnapshot(quantPrediction, marketData);
      
      // Generate structured LLM prompt
      const prompt = this.generateValidationPrompt(quantPrediction, technicalSnapshot);
      
      // Get LLM analysis with fallback
      const llmAnalysis = await this.getLLMAnalysis(prompt);
      
      // Parse and validate LLM response
      const parsedValidation = this.parseValidationResponse(llmAnalysis);
      
      // Calculate independent confluence score
      const confluenceScore = this.calculateConfluenceScore(technicalSnapshot);
      
      // Generate final validation decision
      const finalValidation = this.generateFinalValidation(parsedValidation, confluenceScore, quantPrediction);
      
      const processingTime = Date.now() - startTime;
      
      const result = {
        validation: finalValidation.decision,
        confidence: finalValidation.confidence,
        reasoning: finalValidation.reasoning,
        confluenceScore: confluenceScore,
        technicalSnapshot: technicalSnapshot,
        llmAnalysis: llmAnalysis,
        parsedValidation: parsedValidation,
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
        currencyPair: quantPrediction.currencyPair || this.config.currencyPair
      };
      
      this.logger.info(`🔍 AnalystBrain validation: ${result.validation} (${(result.confidence * 100).toFixed(1)}% conf, ${result.confluenceScore}/100 confluence)`);
      
      return result;
      
    } catch (error) {
      this.logger.error('❌ AnalystBrain validation failed:', error);
      
      // Return conservative validation on error
      return {
        validation: 'HIGH_RISK',
        confidence: 0.1,
        reasoning: `Technical analysis failed - ${error.message}`,
        confluenceScore: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
        currencyPair: quantPrediction?.currencyPair || this.config.currencyPair
      };
    }
  }

  /**
   * Create comprehensive technical snapshot for LLM analysis
   */
  createTechnicalSnapshot(quantPrediction, marketData) {
    const snapshot = {
      signal: {
        asset: quantPrediction.currencyPair || this.config.currencyPair,
        timeframe: quantPrediction.signal?.regime ? '15M' : '5M', // Use regime timeframe if available
        prediction: quantPrediction.direction,
        confidence: quantPrediction.confidence,
        setupTag: quantPrediction.setupTag || 'GENERIC_SIGNAL',
        regime: quantPrediction.regime || 'UNKNOWN',
        riskScore: quantPrediction.riskScore
      },
      multiTimeframeTrend: this.analyzeMultiTimeframeTrend(quantPrediction.features),
      technicalIndicators: this.analyzeTechnicalIndicators(quantPrediction.features),
      volumeAnalysis: this.analyzeVolumeSignals(quantPrediction.features),
      candlestickPatterns: this.analyzeCandlestickPatterns(quantPrediction.features),
      supportResistance: this.analyzeSupportResistance(quantPrediction.features),
      marketStructure: this.analyzeMarketStructure(quantPrediction.features),
      riskFactors: this.identifyRiskFactors(quantPrediction.features, marketData)
    };
    
    return snapshot;
  }

  /**
   * Generate structured prompt for LLM validation
   */
  generateValidationPrompt(quantPrediction, snapshot) {
    // Include signal engine details if available
    const signalDetails = quantPrediction.signal ? 
      `Setup Type: ${snapshot.signal.setupTag}
Market Regime: ${snapshot.signal.regime}
Key Filters: ${quantPrediction.signal.keyFactors ? quantPrediction.signal.keyFactors.slice(0, 3).join(', ') : 'N/A'}
Signal Reasoning: ${quantPrediction.signal.reasoning || 'N/A'}` : '';
    
    return `You are a highly skilled technical analyst with 20+ years of forex trading experience. Analyze the following trading signal using ONLY technical confluence. No external data allowed.

SIGNAL DETAILS:
Asset: ${snapshot.signal.asset}
Timeframe: ${snapshot.signal.timeframe}
Signal Direction: ${snapshot.signal.prediction}
Signal Confidence: ${(snapshot.signal.confidence * 100).toFixed(1)}%
Risk Score: ${(snapshot.signal.riskScore * 100).toFixed(1)}%
${signalDetails}

MULTI-TIMEFRAME ANALYSIS:
${this.formatMultiTimeframeAnalysis(snapshot.multiTimeframeTrend)}

TECHNICAL INDICATORS:
${this.formatTechnicalIndicators(snapshot.technicalIndicators)}

VOLUME ANALYSIS:
${this.formatVolumeAnalysis(snapshot.volumeAnalysis)}

CANDLESTICK PATTERNS:
${this.formatCandlestickPatterns(snapshot.candlestickPatterns)}

SUPPORT/RESISTANCE LEVELS:
${this.formatSupportResistance(snapshot.supportResistance)}

MARKET STRUCTURE:
${this.formatMarketStructure(snapshot.marketStructure)}

RISK FACTORS:
${this.formatRiskFactors(snapshot.riskFactors)}

ANALYSIS REQUIREMENTS:
1. Evaluate technical confluence across ALL timeframes
2. Assess signal strength and reliability
3. Check for contradicting technical signals
4. Validate volume confirmation
5. Consider support/resistance levels
6. Identify high-risk conditions
7. Provide clear reasoning for decision

Respond in this EXACT format (no additional text):
VALIDATION: [YES/NO/HIGH_RISK]
CONFIDENCE: [LOW/MEDIUM/HIGH]
REASONING: [Detailed technical analysis explaining your decision. Focus on confluence factors, contradictions, and key levels. Max 150 words.]
CONFLUENCE_SCORE: [0-100 integer representing technical signal alignment]
KEY_FACTORS: [List 3 most important factors influencing decision]

Example response format:
VALIDATION: YES
CONFIDENCE: HIGH
REASONING: Strong bullish confluence across multiple timeframes. 5M shows breakout above resistance with volume spike. RSI(14) at 45 shows momentum without overbought. EMA 8>21>50 confirms uptrend. Bullish engulfing pattern with 2x average volume. No contradicting signals detected.
CONFLUENCE_SCORE: 82
KEY_FACTORS: Volume breakout, EMA alignment, bullish pattern`;
  }

  /**
   * Get LLM analysis using configured provider with fallback
   */
  async getLLMAnalysis(prompt) {
    const provider = this.config.aiProvider || 'fireworks';
    
    try {
      // Try primary provider first
      if (provider === 'groq' && this.groq) {
        return await this.getGroqAnalysis(prompt);
      } else if (provider === 'together' && this.togetherApiKey) {
        return await this.getTogetherAnalysis(prompt);
      } else if (provider === 'fireworks' && this.fireworks) {
        return await this.getFireworksAnalysis(prompt);
      } else if (provider === 'deepinfra' && this.deepinfra) {
        return await this.getDeepinfraAnalysis(prompt);
      }
      
      // Fallback to working providers in order of preference
      if (this.fireworks) {
        this.logger.info('📡 Using Fireworks as fallback provider');
        return await this.getFireworksAnalysis(prompt);
      } else if (this.deepinfra) {
        this.logger.info('📡 Using DeepInfra as fallback provider');
        return await this.getDeepinfraAnalysis(prompt);
      } else if (this.groq) {
        this.logger.info('📡 Using Groq as fallback provider');
        return await this.getGroqAnalysis(prompt);
      } else if (this.togetherApiKey) {
        this.logger.info('📡 Using Together AI as fallback provider');
        return await this.getTogetherAnalysis(prompt);
      }
      
      throw new Error('No AI provider available for analysis');
      
    } catch (error) {
      this.logger.error(`❌ LLM analysis failed with ${provider}:`, error);
      
      // Try fallback providers in order
      const fallbackProviders = [
        { name: 'fireworks', client: this.fireworks, method: this.getFireworksAnalysis.bind(this) },
        { name: 'deepinfra', client: this.deepinfra, method: this.getDeepinfraAnalysis.bind(this) },
        { name: 'groq', client: this.groq, method: this.getGroqAnalysis.bind(this) },
        { name: 'together', client: this.togetherApiKey, method: this.getTogetherAnalysis.bind(this) }
      ];
      
      for (const fallback of fallbackProviders) {
        if (fallback.name !== provider && fallback.client) {
          try {
            this.logger.info(`📡 Trying ${fallback.name} as fallback`);
            return await fallback.method(prompt);
          } catch (fallbackError) {
            this.logger.warn(`⚠️ ${fallback.name} fallback failed:`, fallbackError.message);
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Get analysis from Groq (LLaMA 3)
   */
  async getGroqAnalysis(prompt) {
    if (!this.groq) {
      throw new Error('Groq client not initialized');
    }
    
    const response = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: this.models.groq.model,
      max_tokens: this.models.groq.maxTokens,
      temperature: this.models.groq.temperature
    });
    
    return {
      provider: 'groq',
      model: this.models.groq.model,
      content: response.choices[0]?.message?.content || '',
      usage: response.usage,
      responseTime: Date.now()
    };
  }

  /**
   * Get analysis from Together AI
   */
  async getTogetherAnalysis(prompt) {
    if (!this.togetherApiKey) {
      throw new Error('Together AI API key not configured');
    }
    
    const response = await axios.post(
      `${this.models.together.baseUrl}/chat/completions`,
      {
        model: this.models.together.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.models.together.maxTokens,
        temperature: this.models.together.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${this.togetherApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    return {
      provider: 'together',
      model: this.models.together.model,
      content: response.data.choices[0]?.message?.content || '',
      usage: response.data.usage,
      responseTime: Date.now()
    };
  }

  /**
   * Get analysis from Fireworks AI
   */
  async getFireworksAnalysis(prompt) {
    if (!this.fireworks) {
      throw new Error('Fireworks AI client not initialized');
    }
    
    const response = await this.fireworks.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: this.models.fireworks.model,
      max_tokens: this.models.fireworks.maxTokens,
      temperature: this.models.fireworks.temperature
    });
    
    return {
      provider: 'fireworks',
      model: this.models.fireworks.model,
      content: response.choices[0]?.message?.content || '',
      usage: response.usage,
      responseTime: Date.now()
    };
  }

  /**
   * Get analysis from DeepInfra AI
   */
  async getDeepinfraAnalysis(prompt) {
    if (!this.deepinfra) {
      throw new Error('DeepInfra AI client not initialized');
    }
    
    const response = await this.deepinfra.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: this.models.deepinfra.model,
      max_tokens: this.models.deepinfra.maxTokens,
      temperature: this.models.deepinfra.temperature
    });
    
    return {
      provider: 'deepinfra',
      model: this.models.deepinfra.model,
      content: response.choices[0]?.message?.content || '',
      usage: response.usage,
      responseTime: Date.now()
    };
  }

  /**
   * Parse and validate LLM response
   */
  parseValidationResponse(llmAnalysis) {
    // Handle different response formats
    const content = llmAnalysis.content || llmAnalysis.message || JSON.stringify(llmAnalysis);
    
    // If it's already a structured object (from mock), return it directly
    if (llmAnalysis.validation && llmAnalysis.confidence && llmAnalysis.reasoning) {
      return {
        validation: llmAnalysis.validation.toUpperCase(),
        confidence: llmAnalysis.confidence.toUpperCase(),
        reasoning: llmAnalysis.reasoning,
        keyFactors: llmAnalysis.keyFactors || []
      };
    }
    
    try {
      // Extract structured response using regex
      const validationMatch = content.match(/VALIDATION:\s*(YES|NO|HIGH_RISK)/i);
      const confidenceMatch = content.match(/CONFIDENCE:\s*(LOW|MEDIUM|HIGH)/i);
      const reasoningMatch = content.match(/REASONING:\s*(.+?)(?=\nCONFLUENCE_SCORE:|$)/is);
      const confluenceMatch = content.match(/CONFLUENCE_SCORE:\s*(\d+)/i);
      const keyFactorsMatch = content.match(/KEY_FACTORS:\s*(.+?)(?=\n|$)/is);
      
      const validation = validationMatch ? validationMatch[1].toUpperCase() : 'HIGH_RISK';
      const confidence = confidenceMatch ? confidenceMatch[1].toUpperCase() : 'LOW';
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'Unable to parse reasoning from LLM response';
      const confluenceScore = confluenceMatch ? parseInt(confluenceMatch[1]) : 0;
      const keyFactors = keyFactorsMatch ? keyFactorsMatch[1].trim() : 'Unable to parse key factors';
      
      // Validate parsed values
      if (!['YES', 'NO', 'HIGH_RISK'].includes(validation)) {
        throw new Error(`Invalid validation value: ${validation}`);
      }
      
      if (!['LOW', 'MEDIUM', 'HIGH'].includes(confidence)) {
        throw new Error(`Invalid confidence value: ${confidence}`);
      }
      
      if (isNaN(confluenceScore) || confluenceScore < 0 || confluenceScore > 100) {
        throw new Error(`Invalid confluence score: ${confluenceScore}`);
      }
      
      return {
        validation,
        confidence,
        reasoning,
        confluenceScore,
        keyFactors,
        rawResponse: content,
        provider: llmAnalysis.provider
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to parse LLM response:', error);
      
      // Return conservative parsing
      return {
        validation: 'HIGH_RISK',
        confidence: 'LOW',
        reasoning: `Failed to parse LLM analysis: ${error.message}`,
        confluenceScore: 0,
        keyFactors: 'Parsing error',
        rawResponse: content,
        provider: llmAnalysis.provider,
        parseError: error.message
      };
    }
  }

  /**
   * Calculate independent confluence score based on technical factors
   */
  calculateConfluenceScore(snapshot) {
    let score = 0;
    
    try {
      // Multi-timeframe trend alignment (25%)
      const trendScore = this.scoreTrendAlignment(snapshot.multiTimeframeTrend);
      score += trendScore * this.validationWeights.multiTimeframeTrend;
      
      // Volume confirmation (20%)
      const volumeScore = this.scoreVolumeConfirmation(snapshot.volumeAnalysis);
      score += volumeScore * this.validationWeights.volumeConfirmation;
      
      // Technical indicators (20%)
      const indicatorScore = this.scoreTechnicalIndicators(snapshot.technicalIndicators);
      score += indicatorScore * this.validationWeights.technicalIndicators;
      
      // Candlestick patterns (15%)
      const patternScore = this.scoreCandlestickPatterns(snapshot.candlestickPatterns);
      score += patternScore * this.validationWeights.candlestickPatterns;
      
      // Support/Resistance (15%)
      const srScore = this.scoreSupportResistance(snapshot.supportResistance);
      score += srScore * this.validationWeights.supportResistance;
      
      // Risk factors penalty (5%)
      const riskPenalty = this.scoreRiskFactors(snapshot.riskFactors);
      score -= riskPenalty * this.validationWeights.riskFactors;
      
      return Math.max(0, Math.min(100, Math.round(score * 100)));
      
    } catch (error) {
      this.logger.error('❌ Confluence score calculation failed:', error);
      return 0;
    }
  }

  /**
   * Generate final validation decision combining LLM and confluence analysis
   */
  generateFinalValidation(llmValidation, confluenceScore, quantPrediction) {
    let decision = llmValidation.validation;
    let confidence = this.mapConfidenceToNumber(llmValidation.confidence);
    let reasoning = llmValidation.reasoning;
    
    // Apply confluence score override (more balanced approach)
    if (confluenceScore >= this.confluenceThresholds.strong) {
      // Strong confluence - boost confidence
      confidence = Math.min(1.0, confidence * 1.2);
      decision = decision === 'NO' ? 'YES' : decision;
      reasoning += ` | Strong technical confluence (${confluenceScore}/100).`;
    } else if (confluenceScore >= this.confluenceThresholds.moderate) {
      // Moderate confluence - maintain decision
      reasoning += ` | Moderate technical confluence (${confluenceScore}/100).`;
    } else if (confluenceScore >= this.confluenceThresholds.weak) {
      // Weak confluence - reduce confidence but don't reject
      confidence = Math.min(confidence, 0.6);
      reasoning += ` | Weak technical confluence (${confluenceScore}/100).`;
    } else {
      // Very low confluence - high risk
      decision = 'HIGH_RISK';
      confidence = Math.min(confidence, 0.3);
      reasoning += ` | Very low technical confluence (${confluenceScore}/100).`;
    }
    
    // Apply Quant Brain confidence override (more lenient)
    if (quantPrediction.confidence < 0.4) {
      decision = 'HIGH_RISK';
      confidence = Math.min(confidence, 0.3);
      reasoning += ` | Very low ML confidence (${(quantPrediction.confidence * 100).toFixed(1)}%).`;
    } else if (quantPrediction.confidence < 0.6) {
      confidence = Math.min(confidence, 0.7);
      reasoning += ` | Moderate ML confidence (${(quantPrediction.confidence * 100).toFixed(1)}%).`;
    }
    
    // Apply risk score override (more lenient)
    if (quantPrediction.riskScore > 0.8) {
      decision = 'HIGH_RISK';
      confidence = Math.min(confidence, 0.3);
      reasoning += ` | Very high risk conditions (${(quantPrediction.riskScore * 100).toFixed(1)}%).`;
    } else if (quantPrediction.riskScore > 0.6) {
      confidence = Math.min(confidence, 0.7);
      reasoning += ` | Elevated risk conditions (${(quantPrediction.riskScore * 100).toFixed(1)}%).`;
    }
    
    // Final confidence adjustment based on confluence
    if (confluenceScore > this.confluenceThresholds.strong) {
      confidence = Math.min(1.0, confidence + 0.1);
    } else if (confluenceScore < this.confluenceThresholds.moderate) {
      confidence = Math.max(0.1, confidence - 0.1);
    }
    
    return {
      decision,
      confidence,
      reasoning: reasoning.trim()
    };
  }

  // Analysis helper methods
  
  analyzeMultiTimeframeTrend(features) {
    const trends = {};
    const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h'];
    const normalized = features.normalized || {};
    
    for (const tf of timeframes) {
      const ema8Above21 = normalized[`${tf}_ema8_above_21`];
      const ema21Above50 = normalized[`${tf}_ema21_above_50`];
      const priceChange = normalized[`${tf}_price_change`] || 0;
      
      if (ema8Above21 !== undefined && ema21Above50 !== undefined) {
        if (ema8Above21 && ema21Above50 && priceChange > 0) {
          trends[tf] = 'STRONG_BULLISH';
        } else if (ema8Above21 && ema21Above50) {
          trends[tf] = 'BULLISH';
        } else if (!ema8Above21 && !ema21Above50 && priceChange < 0) {
          trends[tf] = 'STRONG_BEARISH';
        } else if (!ema8Above21 && !ema21Above50) {
          trends[tf] = 'BEARISH';
        } else {
          trends[tf] = 'MIXED';
        }
      }
    }
    
    return {
      trends,
      alignment: features.crossTimeframe?.trend_alignment || 0,
      strength: features.crossTimeframe?.trend_strength || 0,
      agreement: features.crossTimeframe?.trend_agreement || 0
    };
  }

  analyzeTechnicalIndicators(features) {
    const normalized = features.normalized || {};
    
    return {
      rsi: {
        '5m': {
          value: (normalized['5m_rsi14'] || 0.5) * 100,
          overbought: normalized['5m_rsi14_overbought'] === 1,
          oversold: normalized['5m_rsi14_oversold'] === 1,
          divergence: normalized['5m_rsi14_divergence'] || 0
        },
        '15m': {
          value: (normalized['15m_rsi14'] || 0.5) * 100,
          overbought: normalized['15m_rsi14_overbought'] === 1,
          oversold: normalized['15m_rsi14_oversold'] === 1
        }
      },
      macd: {
        '5m': {
          line: normalized['5m_macd_line'] || 0,
          signal: normalized['5m_macd_signal'] || 0,
          histogram: normalized['5m_macd_histogram'] || 0,
          bullish: normalized['5m_macd_bullish'] === 1,
          bullishCross: normalized['5m_macd_bullish_cross'] === 1,
          bearishCross: normalized['5m_macd_bearish_cross'] === 1
        }
      },
      bollinger: {
        '5m': {
          position: (normalized['5m_bb_position'] || 0.5) * 100,
          width: normalized['5m_bb_width'] || 0,
          squeeze: normalized['5m_bb_squeeze'] === 1,
          expansion: normalized['5m_bb_expansion'] === 1
        }
      },
      stochastic: {
        '5m': {
          k: (normalized['5m_stoch_k'] || 0.5) * 100,
          d: (normalized['5m_stoch_d'] || 0.5) * 100,
          overbought: normalized['5m_stoch_overbought'] === 1,
          oversold: normalized['5m_stoch_oversold'] === 1,
          bullishCross: normalized['5m_stoch_bullish_cross'] === 1,
          bearishCross: normalized['5m_stoch_bearish_cross'] === 1
        }
      },
      atr: {
        '5m': {
          value: normalized['5m_atr'] || 0,
          normalized: (normalized['5m_atr_normalized'] || 0.01) * 100,
          trend: normalized['5m_atr_trend'] || 0
        }
      }
    };
  }

  analyzeVolumeSignals(features) {
    const normalized = features.normalized || {};
    
    return {
      current: {
        ratio: normalized['5m_volume_ratio'] || 1,
        spike: normalized['5m_volume_spike'] === 1,
        dry: normalized['5m_volume_dry'] === 1,
        trend: normalized['5m_volume_trend'] || 0
      },
      confirmation: {
        priceVolumeCorr: normalized['5m_price_volume_correlation'] || 0,
        obvTrend: normalized['5m_obv_trend'] || 0,
        highVolumeAtHigh: normalized['5m_high_volume_at_high'] === 1,
        highVolumeAtLow: normalized['5m_high_volume_at_low'] === 1
      }
    };
  }

  analyzeCandlestickPatterns(features) {
    const normalized = features.normalized || {};
    
    return {
      bullish: {
        hammer: normalized['5m_hammer'] === 1,
        bullishEngulfing: normalized['5m_bullish_engulfing'] === 1,
        morningStar: normalized['5m_morning_star'] === 1,
        piercingLine: normalized['5m_piercing_line'] === 1,
        threeWhiteSoldiers: normalized['5m_three_white_soldiers'] === 1,
        count: normalized['5m_bullish_pattern_count'] || 0
      },
      bearish: {
        shootingStar: normalized['5m_shooting_star'] === 1,
        bearishEngulfing: normalized['5m_bearish_engulfing'] === 1,
        eveningStar: normalized['5m_evening_star'] === 1,
        darkCloud: normalized['5m_dark_cloud'] === 1,
        threeBlackCrows: normalized['5m_three_black_crows'] === 1,
        count: normalized['5m_bearish_pattern_count'] || 0
      },
      neutral: {
        doji: normalized['5m_is_doji'] === 1,
        spinningTop: normalized['5m_spinning_top'] === 1,
        harami: normalized['5m_harami'] === 1
      },
      structure: {
        bodyRatio: normalized['5m_body'] || 0,
        upperWickRatio: normalized['5m_upper_wick'] || 0,
        lowerWickRatio: normalized['5m_lower_wick'] || 0
      }
    };
  }

  analyzeSupportResistance(features) {
    const ms5m = features.marketStructure?.market_structure_5m || {};
    const ms15m = features.marketStructure?.market_structure_15m || {};
    const normalized = features.normalized || {};
    
    return {
      levels: {
        nearSupport5m: ms5m.near_support || false,
        nearResistance5m: ms5m.near_resistance || false,
        nearSupport15m: ms15m.near_support || false,
        nearResistance15m: ms15m.near_resistance || false
      },
      priceAction: {
        higherHighs5m: ms5m.higher_highs || false,
        lowerLows5m: ms5m.lower_lows || false,
        higherHighs15m: ms15m.higher_highs || false,
        lowerLows15m: ms15m.lower_lows || false
      },
      strength: {
        trendDirection5m: ms5m.trend_direction || 0,
        trendStrength5m: ms5m.trend_strength_value || 0,
        momentum5m: ms5m.momentum || 0
      }
    };
  }

  analyzeMarketStructure(features) {
    const ms5m = features.marketStructure?.market_structure_5m || {};
    const ms15m = features.marketStructure?.market_structure_15m || {};
    
    return {
      volatility: {
        '5m': ms5m.volatility || 0,
        '15m': ms15m.volatility || 0
      },
      trend: {
        direction5m: ms5m.trend_direction || 0,
        strength5m: ms5m.trend_strength_value || 0,
        direction15m: ms15m.trend_direction || 0,
        strength15m: ms15m.trend_strength_value || 0
      },
      momentum: {
        '5m': ms5m.momentum || 0,
        '15m': ms15m.momentum || 0
      }
    };
  }

  identifyRiskFactors(features, marketData) {
    const risks = [];
    const normalized = features.normalized || {};
    
    // High volatility
    const atrNorm = (normalized['5m_atr_normalized'] || 0.01) * 100;
    if (atrNorm > 2) {
      risks.push(`High volatility (ATR: ${atrNorm.toFixed(2)}%)`);
    }
    
    // Low volume
    const volumeRatio = normalized['5m_volume_ratio'] || 1;
    if (volumeRatio < 0.5) {
      risks.push(`Low volume (${(volumeRatio * 100).toFixed(0)}% of average)`);
    }
    
    // Extreme RSI
    const rsi = (normalized['5m_rsi14'] || 0.5) * 100;
    if (rsi > 85) risks.push(`Extremely overbought (RSI: ${rsi.toFixed(1)})`);
    if (rsi < 15) risks.push(`Extremely oversold (RSI: ${rsi.toFixed(1)})`);
    
    // Conflicting patterns
    const bullishCount = normalized['5m_bullish_pattern_count'] || 0;
    const bearishCount = normalized['5m_bearish_pattern_count'] || 0;
    if (bullishCount > 0 && bearishCount > 0) {
      risks.push('Conflicting candlestick patterns detected');
    }
    
    // MACD divergence
    if (normalized['5m_macd_bullish_cross'] && rsi > 70) {
      risks.push('MACD bullish cross at overbought levels');
    }
    if (normalized['5m_macd_bearish_cross'] && rsi < 30) {
      risks.push('MACD bearish cross at oversold levels');
    }
    
    // Data freshness
    if (marketData && marketData.lastUpdate) {
      const now = Date.now();
      const lastUpdate5m = marketData.lastUpdate['5m'] || 0;
      const dataAge = (now - lastUpdate5m) / (1000 * 60); // minutes
      
      if (dataAge > 10) {
        risks.push(`Stale market data (${dataAge.toFixed(1)} minutes old)`);
      }
    }
    
    return risks;
  }

  // Formatting methods for LLM prompt
  
  formatMultiTimeframeAnalysis(trend) {
    let analysis = `Trend Alignment: ${trend.alignment || 0}/6 timeframes agree\n`;
    analysis += `Overall Strength: ${((trend.strength || 0) * 100).toFixed(1)}%\n`;
    analysis += `Agreement Level: ${((trend.agreement || 0) * 100).toFixed(1)}%\n\n`;
    
    for (const [tf, direction] of Object.entries(trend.trends || {})) {
      analysis += `- ${tf.toUpperCase()}: ${direction}\n`;
    }
    
    return analysis;
  }

  formatTechnicalIndicators(indicators) {
    let analysis = '';
    
    // RSI
    analysis += `RSI Analysis:\n`;
    analysis += `- 5M RSI(14): ${indicators.rsi['5m'].value.toFixed(1)}`;
    if (indicators.rsi['5m'].overbought) analysis += ' (OVERBOUGHT)';
    if (indicators.rsi['5m'].oversold) analysis += ' (OVERSOLD)';
    if (indicators.rsi['5m'].divergence !== 0) analysis += ` | Divergence: ${indicators.rsi['5m'].divergence > 0 ? 'Bullish' : 'Bearish'}`;
    analysis += '\n';
    
    analysis += `- 15M RSI(14): ${indicators.rsi['15m'].value.toFixed(1)}`;
    if (indicators.rsi['15m'].overbought) analysis += ' (OVERBOUGHT)';
    if (indicators.rsi['15m'].oversold) analysis += ' (OVERSOLD)';
    analysis += '\n\n';
    
    // MACD
    analysis += `MACD Analysis (5M):\n`;
    analysis += `- MACD Line: ${indicators.macd['5m'].line.toFixed(4)}\n`;
    analysis += `- Signal Line: ${indicators.macd['5m'].signal.toFixed(4)}\n`;
    analysis += `- Histogram: ${indicators.macd['5m'].histogram.toFixed(4)}\n`;
    analysis += `- Status: ${indicators.macd['5m'].bullish ? 'BULLISH' : 'BEARISH'}`;
    if (indicators.macd['5m'].bullishCross) analysis += ' (BULLISH CROSSOVER)';
    if (indicators.macd['5m'].bearishCross) analysis += ' (BEARISH CROSSOVER)';
    analysis += '\n\n';
    
    // Bollinger Bands
    analysis += `Bollinger Bands (5M):\n`;
    analysis += `- Position: ${indicators.bollinger['5m'].position.toFixed(1)}% (0%=lower band, 100%=upper band)\n`;
    analysis += `- Width: ${(indicators.bollinger['5m'].width * 100).toFixed(2)}%\n`;
    if (indicators.bollinger['5m'].squeeze) analysis += '- STATUS: SQUEEZE DETECTED\n';
    if (indicators.bollinger['5m'].expansion) analysis += '- STATUS: EXPANSION DETECTED\n';
    analysis += '\n';
    
    // Stochastic
    analysis += `Stochastic (5M):\n`;
    analysis += `- %K: ${indicators.stochastic['5m'].k.toFixed(1)}\n`;
    analysis += `- %D: ${indicators.stochastic['5m'].d.toFixed(1)}`;
    if (indicators.stochastic['5m'].overbought) analysis += ' (OVERBOUGHT)';
    if (indicators.stochastic['5m'].oversold) analysis += ' (OVERSOLD)';
    if (indicators.stochastic['5m'].bullishCross) analysis += ' | BULLISH CROSS';
    if (indicators.stochastic['5m'].bearishCross) analysis += ' | BEARISH CROSS';
    analysis += '\n\n';
    
    // ATR
    analysis += `Volatility (ATR 5M):\n`;
    analysis += `- Normalized ATR: ${indicators.atr['5m'].normalized.toFixed(2)}%\n`;
    analysis += `- Trend: ${indicators.atr['5m'].trend > 0 ? 'INCREASING' : 'DECREASING'} volatility\n`;
    
    return analysis;
  }

  formatVolumeAnalysis(volume) {
    let analysis = '';
    
    analysis += `Volume Metrics:\n`;
    analysis += `- Volume Ratio: ${volume.current.ratio.toFixed(2)}x average\n`;
    if (volume.current.spike) analysis += '- STATUS: VOLUME SPIKE DETECTED\n';
    if (volume.current.dry) analysis += '- STATUS: LOW VOLUME WARNING\n';
    analysis += `- Volume Trend: ${volume.current.trend > 0 ? 'INCREASING' : 'DECREASING'} (${(volume.current.trend * 100).toFixed(1)}%)\n\n`;
    
    analysis += `Volume Confirmation:\n`;
    analysis += `- Price-Volume Correlation: ${volume.confirmation.priceVolumeCorr.toFixed(3)}\n`;
    analysis += `- OBV Trend: ${volume.confirmation.obvTrend > 0 ? 'BULLISH' : 'BEARISH'}\n`;
    if (volume.confirmation.highVolumeAtHigh) analysis += '- High volume at price highs\n';
    if (volume.confirmation.highVolumeAtLow) analysis += '- High volume at price lows\n';
    
    return analysis;
  }

  formatCandlestickPatterns(patterns) {
    let analysis = '';
    
    analysis += `Bullish Patterns (Count: ${patterns.bullish.count}):\n`;
    if (patterns.bullish.hammer) analysis += '- Hammer detected\n';
    if (patterns.bullish.bullishEngulfing) analysis += '- Bullish Engulfing detected\n';
    if (patterns.bullish.morningStar) analysis += '- Morning Star detected\n';
    if (patterns.bullish.piercingLine) analysis += '- Piercing Line detected\n';
    if (patterns.bullish.threeWhiteSoldiers) analysis += '- Three White Soldiers detected\n';
    
    analysis += `\nBearish Patterns (Count: ${patterns.bearish.count}):\n`;
    if (patterns.bearish.shootingStar) analysis += '- Shooting Star detected\n';
    if (patterns.bearish.bearishEngulfing) analysis += '- Bearish Engulfing detected\n';
    if (patterns.bearish.eveningStar) analysis += '- Evening Star detected\n';
    if (patterns.bearish.darkCloud) analysis += '- Dark Cloud Cover detected\n';
    if (patterns.bearish.threeBlackCrows) analysis += '- Three Black Crows detected\n';
    
    analysis += `\nNeutral Patterns:\n`;
    if (patterns.neutral.doji) analysis += '- Doji detected\n';
    if (patterns.neutral.spinningTop) analysis += '- Spinning Top detected\n';
    if (patterns.neutral.harami) analysis += '- Harami detected\n';
    
    analysis += `\nCandle Structure:\n`;
    analysis += `- Body/Range Ratio: ${(patterns.structure.bodyRatio * 100).toFixed(1)}%\n`;
    analysis += `- Upper Wick Ratio: ${(patterns.structure.upperWickRatio * 100).toFixed(1)}%\n`;
    analysis += `- Lower Wick Ratio: ${(patterns.structure.lowerWickRatio * 100).toFixed(1)}%\n`;
    
    return analysis;
  }

  formatSupportResistance(sr) {
    let analysis = '';
    
    analysis += `Key Levels:\n`;
    analysis += `- Near Support (5M): ${sr.levels.nearSupport5m ? 'YES' : 'NO'}\n`;
    analysis += `- Near Resistance (5M): ${sr.levels.nearResistance5m ? 'YES' : 'NO'}\n`;
    analysis += `- Near Support (15M): ${sr.levels.nearSupport15m ? 'YES' : 'NO'}\n`;
    analysis += `- Near Resistance (15M): ${sr.levels.nearResistance15m ? 'YES' : 'NO'}\n\n`;
    
    analysis += `Price Action Structure:\n`;
    analysis += `- Higher Highs (5M): ${sr.priceAction.higherHighs5m ? 'YES' : 'NO'}\n`;
    analysis += `- Lower Lows (5M): ${sr.priceAction.lowerLows5m ? 'YES' : 'NO'}\n`;
    analysis += `- Higher Highs (15M): ${sr.priceAction.higherHighs15m ? 'YES' : 'NO'}\n`;
    analysis += `- Lower Lows (15M): ${sr.priceAction.lowerLows15m ? 'YES' : 'NO'}\n\n`;
    
    analysis += `Trend Metrics:\n`;
    analysis += `- Trend Direction (5M): ${sr.strength.trendDirection5m > 0 ? 'BULLISH' : 'BEARISH'} (${(sr.strength.trendDirection5m * 100).toFixed(1)}%)\n`;
    analysis += `- Trend Strength (5M): ${(sr.strength.trendStrength5m * 100).toFixed(1)}%\n`;
    analysis += `- Momentum (5M): ${sr.strength.momentum5m > 0 ? 'POSITIVE' : 'NEGATIVE'} (${(sr.strength.momentum5m * 100).toFixed(2)}%)\n`;
    
    return analysis;
  }

  formatMarketStructure(ms) {
    let analysis = '';
    
    analysis += `Market Volatility:\n`;
    analysis += `- 5M Volatility: ${(ms.volatility['5m'] * 100).toFixed(2)}%\n`;
    analysis += `- 15M Volatility: ${(ms.volatility['15m'] * 100).toFixed(2)}%\n\n`;
    
    analysis += `Trend Analysis:\n`;
    analysis += `- 5M Direction: ${ms.trend.direction5m > 0 ? 'BULLISH' : 'BEARISH'} | Strength: ${(ms.trend.strength5m * 100).toFixed(1)}%\n`;
    analysis += `- 15M Direction: ${ms.trend.direction15m > 0 ? 'BULLISH' : 'BEARISH'} | Strength: ${(ms.trend.strength15m * 100).toFixed(1)}%\n\n`;
    
    analysis += `Momentum:\n`;
    analysis += `- 5M: ${ms.momentum['5m'] > 0 ? 'POSITIVE' : 'NEGATIVE'} (${(ms.momentum['5m'] * 100).toFixed(2)}%)\n`;
    analysis += `- 15M: ${ms.momentum['15m'] > 0 ? 'POSITIVE' : 'NEGATIVE'} (${(ms.momentum['15m'] * 100).toFixed(2)}%)\n`;
    
    return analysis;
  }

  formatRiskFactors(risks) {
    if (risks.length === 0) return 'No significant risk factors identified.\n';
    
    let analysis = '';
    risks.forEach((risk, index) => {
      analysis += `${index + 1}. ${risk}\n`;
    });
    
    return analysis;
  }

  // Scoring methods for confluence calculation
  
  scoreTrendAlignment(trend) {
    const alignment = Math.abs(trend.alignment || 0);
    const strength = trend.strength || 0.5; // Default to neutral
    const agreement = trend.agreement || 0.5; // Default to neutral
    
    // More forgiving scoring with baseline
    let score = 0.3; // Base score
    
    // Alignment bonus (max 0.3)
    score += Math.min(0.3, (alignment / 6) * 0.3);
    
    // Strength bonus (max 0.2)
    score += strength * 0.2;
    
    // Agreement bonus (max 0.2)
    score += agreement * 0.2;
    
    return Math.max(0.2, Math.min(1.0, score));
  }

  scoreVolumeConfirmation(volume) {
    let score = 0.4; // Base score for volume analysis
    
    try {
      // Volume spike bonus
      if (volume?.current?.spike) score += 0.2;
      
      // Volume ratio
      const ratio = volume?.current?.ratio || 1.0;
      if (ratio > 1.2) score += 0.2;
      else if (ratio > 1.0) score += 0.1;
      else if (ratio < 0.8) score -= 0.1;
      
      // Price-volume correlation
      const corr = Math.abs(volume?.confirmation?.priceVolumeCorr || 0);
      score += corr * 0.2;
      
      // OBV trend
      const obvTrend = Math.abs(volume?.confirmation?.obvTrend || 0);
      if (obvTrend > 0.1) score += 0.1;
      
    } catch (error) {
      // If volume analysis fails, return neutral score
      score = 0.5;
    }
    
    return Math.max(0.2, Math.min(1.0, score));
  }

  scoreTechnicalIndicators(indicators) {
    let score = 0.3; // Base score for technical analysis
    
    try {
      // RSI scoring
      const rsi5m = indicators?.rsi?.['5m']?.value || 50;
      if (rsi5m > 30 && rsi5m < 70) score += 0.2; // Healthy range
      if (rsi5m > 20 && rsi5m < 80) score += 0.1; // Acceptable range
      if (Math.abs(indicators?.rsi?.['5m']?.divergence || 0) > 0) score += 0.1;
    
      // MACD scoring
      if (indicators?.macd?.['5m']?.bullishCross || indicators?.macd?.['5m']?.bearishCross) {
        score += 0.2; // Clear signal
      }
      if (indicators?.macd?.['5m']?.bullish && (indicators?.macd?.['5m']?.histogram || 0) > 0) {
        score += 0.15; // Confirming momentum
      }
      
      // Stochastic scoring
      if (indicators?.stochastic?.['5m']?.bullishCross || indicators?.stochastic?.['5m']?.bearishCross) {
        score += 0.15;
      }
      
    } catch (error) {
      // If technical analysis fails, return neutral score
      score = 0.5;
    }
    
    // Bollinger Bands
    const bbPos = indicators.bollinger['5m'].position;
    if (bbPos > 20 && bbPos < 80) score += 0.15; // Not at extremes
    if (indicators.bollinger['5m'].expansion) score += 0.1; // Volatility expansion
    
    return Math.max(0, Math.min(1, score));
  }

  scoreCandlestickPatterns(patterns) {
    let score = 0;
    
    // Strong reversal patterns
    if (patterns.bullish.bullishEngulfing || patterns.bearish.bearishEngulfing) score += 0.4;
    if (patterns.bullish.hammer || patterns.bearish.shootingStar) score += 0.3;
    
    // Multi-candle patterns
    if (patterns.bullish.morningStar || patterns.bearish.eveningStar) score += 0.5;
    if (patterns.bullish.threeWhiteSoldiers || patterns.bearish.threeBlackCrows) score += 0.4;
    
    // Pattern count bonus
    const netPatterns = patterns.bullish.count - patterns.bearish.count;
    score += Math.abs(netPatterns) * 0.1;
    
    // Body strength
    if (patterns.structure.bodyRatio > 0.6) score += 0.2; // Strong candles
    
    // Penalty for conflicting patterns
    if (patterns.bullish.count > 0 && patterns.bearish.count > 0) {
      score -= 0.3;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  scoreSupportResistance(sr) {
    let score = 0;
    
    // Key level proximity
    if (sr.levels.nearSupport5m || sr.levels.nearSupport15m) score += 0.3;
    if (sr.levels.nearResistance5m || sr.levels.nearResistance15m) score += 0.3;
    
    // Price action structure
    if (sr.priceAction.higherHighs5m && sr.priceAction.higherHighs15m) score += 0.2;
    if (sr.priceAction.lowerLows5m && sr.priceAction.lowerLows15m) score += 0.2;
    
    // Trend strength
    score += Math.abs(sr.strength.trendDirection5m) * 0.2;
    score += sr.strength.trendStrength5m * 0.2;
    
    // Momentum
    if (Math.abs(sr.strength.momentum5m) > 0.01) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  scoreRiskFactors(risks) {
    // Each risk factor reduces score
    return Math.min(1, risks.length * 0.2);
  }

  mapConfidenceToNumber(confidence) {
    switch (confidence) {
      case 'HIGH': return 0.85;
      case 'MEDIUM': return 0.65;
      case 'LOW': return 0.35;
      default: return 0.35;
    }
  }

  /**
   * Save validation results for prompt optimization
   */
  async saveValidationForOptimization(validation, actualResult = null) {
    try {
      const validationData = {
        llmAnalysis: validation.llmAnalysis,
        confluenceScore: validation.confluenceScore,
        decision: validation.validation,
        confidence: validation.confidence,
        reasoning: validation.reasoning,
        actualResult: actualResult,
        timestamp: validation.timestamp,
        currencyPair: validation.currencyPair
      };
      
      const validationFile = path.join(process.cwd(), 'data', 'training', 'analyst_validations.json');
      await fs.ensureDir(path.dirname(validationFile));
      
      let existingData = [];
      if (await fs.pathExists(validationFile)) {
        existingData = await fs.readJson(validationFile);
      }
      
      existingData.push(validationData);
      
      // Keep only last 5000 records
      if (existingData.length > 5000) {
        existingData = existingData.slice(-5000);
      }
      
      await fs.writeJson(validationFile, existingData);
      
      this.logger.info('💾 Validation saved for optimization');
      
    } catch (error) {
      this.logger.error('❌ Failed to save validation for optimization:', error);
    }
  }
}

module.exports = { AnalystBrain };