/**
 * Enhanced Analyst Brain - Layer 2: LLM-Based Technical Confluence Validator
 * 
 * This module implements an enhanced version of the second layer of the 3-layer AI trading system.
 * It uses LLM reasoning to validate Quant Brain predictions using technical confluence analysis.
 */

const { Logger } = require('../utils/Logger');
const Groq = require('groq-sdk');
const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class EnhancedAnalystBrain {
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
    
    // Confluence thresholds
    this.confluenceThresholds = {
      strong: 70,
      moderate: 50,
      weak: 30
    };
    
    // Performance tracking
    this.performance = {
      validations: 0,
      successfulValidations: 0,
      accuracy: 0,
      avgConfidence: 0,
      avgProcessingTime: 0,
      providerStats: {
        groq: { calls: 0, failures: 0, avgTime: 0 },
        together: { calls: 0, failures: 0, avgTime: 0 },
        fireworks: { calls: 0, failures: 0, avgTime: 0 },
        deepinfra: { calls: 0, failures: 0, avgTime: 0 }
      }
    };
    
    this.logger.info('🧠 EnhancedAnalystBrain initialized');
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
      
      // Update performance metrics
      this.updatePerformanceMetrics(finalValidation, processingTime);
      
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
      
      this.logger.info(`🔍 EnhancedAnalystBrain validation: ${result.validation} (${(result.confidence * 100).toFixed(1)}% conf, ${result.confluenceScore}/100 confluence)`);
      
      return result;
      
    } catch (error) {
      this.logger.error('❌ EnhancedAnalystBrain validation failed:', error);
      
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
        timeframe: '5M',
        prediction: quantPrediction.direction,
        confidence: quantPrediction.confidence,
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
    return `You are a highly skilled technical analyst with 20+ years of forex trading experience. Analyze the following trading signal using ONLY technical confluence. No external data allowed.

SIGNAL DETAILS:
Asset: ${snapshot.signal.asset}
Timeframe: ${snapshot.signal.timeframe}
ML Prediction: ${snapshot.signal.prediction}
ML Confidence: ${(snapshot.signal.confidence * 100).toFixed(1)}%
Risk Score: ${(snapshot.signal.riskScore * 100).toFixed(1)}%

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
    
    const startTime = Date.now();
    
    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.models.groq.model,
        max_tokens: this.models.groq.maxTokens,
        temperature: this.models.groq.temperature
      });
      
      const processingTime = Date.now() - startTime;
      
      // Update provider stats
      this.performance.providerStats.groq.calls++;
      this.performance.providerStats.groq.avgTime = 
        (this.performance.providerStats.groq.avgTime * (this.performance.providerStats.groq.calls - 1) + processingTime) / 
        this.performance.providerStats.groq.calls;
      
      return {
        provider: 'groq',
        model: this.models.groq.model,
        content: response.choices[0]?.message?.content || '',
        usage: response.usage,
        responseTime: processingTime
      };
    } catch (error) {
      this.performance.providerStats.groq.failures++;
      throw error;
    }
  }

  /**
   * Get analysis from Together AI
   */
  async getTogetherAnalysis(prompt) {
    if (!this.togetherApiKey) {
      throw new Error('Together AI API key not configured');
    }
    
    const startTime = Date.now();
    
    try {
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
      
      const processingTime = Date.now() - startTime;
      
      // Update provider stats
      this.performance.providerStats.together.calls++;
      this.performance.providerStats.together.avgTime = 
        (this.performance.providerStats.together.avgTime * (this.performance.providerStats.together.calls - 1) + processingTime) / 
        this.performance.providerStats.together.calls;
      
      return {
        provider: 'together',
        model: this.models.together.model,
        content: response.data.choices[0]?.message?.content || '',
        usage: response.data.usage,
        responseTime: processingTime
      };
    } catch (error) {
      this.performance.providerStats.together.failures++;
      throw error;
    }
  }

  /**
   * Get analysis from Fireworks AI
   */
  async getFireworksAnalysis(prompt) {
    if (!this.fireworks) {
      throw new Error('Fireworks AI client not initialized');
    }
    
    const startTime = Date.now();
    
    try {
      const response = await this.fireworks.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.models.fireworks.model,
        max_tokens: this.models.fireworks.maxTokens,
        temperature: this.models.fireworks.temperature
      });
      
      const processingTime = Date.now() - startTime;
      
      // Update provider stats
      this.performance.providerStats.fireworks.calls++;
      this.performance.providerStats.fireworks.avgTime = 
        (this.performance.providerStats.fireworks.avgTime * (this.performance.providerStats.fireworks.calls - 1) + processingTime) / 
        this.performance.providerStats.fireworks.calls;
      
      return {
        provider: 'fireworks',
        model: this.models.fireworks.model,
        content: response.choices[0]?.message?.content || '',
        usage: response.usage,
        responseTime: processingTime
      };
    } catch (error) {
      this.performance.providerStats.fireworks.failures++;
      throw error;
    }
  }

  /**
   * Get analysis from DeepInfra AI
   */
  async getDeepinfraAnalysis(prompt) {
    if (!this.deepinfra) {
      throw new Error('DeepInfra AI client not initialized');
    }
    
    const startTime = Date.now();
    
    try {
      const response = await this.deepinfra.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.models.deepinfra.model,
        max_tokens: this.models.deepinfra.maxTokens,
        temperature: this.models.deepinfra.temperature
      });
      
      const processingTime = Date.now() - startTime;
      
      // Update provider stats
      this.performance.providerStats.deepinfra.calls++;
      this.performance.providerStats.deepinfra.avgTime = 
        (this.performance.providerStats.deepinfra.avgTime * (this.performance.providerStats.deepinfra.calls - 1) + processingTime) / 
        this.performance.providerStats.deepinfra.calls;
      
      return {
        provider: 'deepinfra',
        model: this.models.deepinfra.model,
        content: response.choices[0]?.message?.content || '',
        usage: response.usage,
        responseTime: processingTime
      };
    } catch (error) {
      this.performance.providerStats.deepinfra.failures++;
      throw error;
    }
  }

  /**
   * Parse validation response from LLM
   */
  parseValidationResponse(llmAnalysis) {
    try {
      const content = llmAnalysis.content;
      
      // Extract validation decision
      const validationMatch = content.match(/VALIDATION:\s*(YES|NO|HIGH_RISK)/i);
      const validation = validationMatch ? validationMatch[1].toUpperCase() : 'HIGH_RISK';
      
      // Extract confidence
      const confidenceMatch = content.match(/CONFIDENCE:\s*(LOW|MEDIUM|HIGH)/i);
      const confidenceText = confidenceMatch ? confidenceMatch[1].toUpperCase() : 'LOW';
      
      // Convert confidence text to numeric value
      let confidence = 0.3; // Default low confidence
      if (confidenceText === 'MEDIUM') confidence = 0.6;
      if (confidenceText === 'HIGH') confidence = 0.9;
      
      // Extract reasoning
      const reasoningMatch = content.match(/REASONING:\s*(.+?)(?=CONFLUENCE_SCORE:|KEY_FACTORS:|$)/is);
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided';
      
      // Extract confluence score
      const confluenceMatch = content.match(/CONFLUENCE_SCORE:\s*(\d+)/i);
      const confluenceScore = confluenceMatch ? parseInt(confluenceMatch[1]) : 0;
      
      // Extract key factors
      const keyFactorsMatch = content.match(/KEY_FACTORS:\s*(.+?)(?=$)/is);
      const keyFactorsText = keyFactorsMatch ? keyFactorsMatch[1].trim() : '';
      const keyFactors = keyFactorsText.split(',').map(factor => factor.trim());
      
      return {
        validation,
        confidence,
        reasoning,
        confluenceScore,
        keyFactors,
        rawResponse: content
      };
    } catch (error) {
      this.logger.error('❌ Failed to parse LLM response:', error);
      
      return {
        validation: 'HIGH_RISK',
        confidence: 0.1,
        reasoning: 'Failed to parse LLM response',
        confluenceScore: 0,
        keyFactors: [],
        rawResponse: llmAnalysis.content,
        error: error.message
      };
    }
  }

  /**
   * Calculate confluence score independently
   */
  calculateConfluenceScore(technicalSnapshot) {
    try {
      let score = 50; // Start with neutral score
      
      // Multi-timeframe trend influence
      if (technicalSnapshot.multiTimeframeTrend) {
        const mtf = technicalSnapshot.multiTimeframeTrend;
        
        // Alignment with prediction
        if (technicalSnapshot.signal.prediction === 'BUY' && mtf.bullishTimeframes > mtf.bearishTimeframes) {
          score += (mtf.bullishTimeframes / mtf.totalTimeframes) * 20;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && mtf.bearishTimeframes > mtf.bullishTimeframes) {
          score += (mtf.bearishTimeframes / mtf.totalTimeframes) * 20;
        } else if (mtf.bullishTimeframes === mtf.bearishTimeframes) {
          // Mixed signals
          score -= 10;
        } else {
          // Contradicting signals
          score -= 20;
        }
      }
      
      // Technical indicators influence
      if (technicalSnapshot.technicalIndicators) {
        const ti = technicalSnapshot.technicalIndicators;
        
        // RSI
        if (technicalSnapshot.signal.prediction === 'BUY' && ti.rsi < 30) {
          score += 10; // Oversold condition for buy
        } else if (technicalSnapshot.signal.prediction === 'SELL' && ti.rsi > 70) {
          score += 10; // Overbought condition for sell
        } else if (technicalSnapshot.signal.prediction === 'BUY' && ti.rsi > 70) {
          score -= 15; // Overbought condition contradicts buy
        } else if (technicalSnapshot.signal.prediction === 'SELL' && ti.rsi < 30) {
          score -= 15; // Oversold condition contradicts sell
        }
        
        // MACD
        if (technicalSnapshot.signal.prediction === 'BUY' && ti.macdBullish) {
          score += 10;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && ti.macdBearish) {
          score += 10;
        } else if (technicalSnapshot.signal.prediction === 'BUY' && ti.macdBearish) {
          score -= 10;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && ti.macdBullish) {
          score -= 10;
        }
        
        // EMA alignment
        if (technicalSnapshot.signal.prediction === 'BUY' && ti.emaAlignment === 'bullish') {
          score += 15;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && ti.emaAlignment === 'bearish') {
          score += 15;
        } else if (technicalSnapshot.signal.prediction === 'BUY' && ti.emaAlignment === 'bearish') {
          score -= 15;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && ti.emaAlignment === 'bullish') {
          score -= 15;
        }
      }
      
      // Volume analysis influence
      if (technicalSnapshot.volumeAnalysis) {
        const va = technicalSnapshot.volumeAnalysis;
        
        if (va.volumeIncreasing && va.volumeConfirmsDirection) {
          score += 10;
        } else if (va.volumeDecreasing) {
          score -= 5;
        }
        
        if (va.volumePriceDivergence) {
          score -= 10; // Divergence is a warning sign
        }
      }
      
      // Candlestick patterns influence
      if (technicalSnapshot.candlestickPatterns) {
        const cp = technicalSnapshot.candlestickPatterns;
        
        if (technicalSnapshot.signal.prediction === 'BUY' && cp.bullishPatterns.length > 0) {
          score += 10;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && cp.bearishPatterns.length > 0) {
          score += 10;
        } else if (technicalSnapshot.signal.prediction === 'BUY' && cp.bearishPatterns.length > 0) {
          score -= 10;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && cp.bullishPatterns.length > 0) {
          score -= 10;
        }
      }
      
      // Support/resistance influence
      if (technicalSnapshot.supportResistance) {
        const sr = technicalSnapshot.supportResistance;
        
        if (technicalSnapshot.signal.prediction === 'BUY' && sr.nearSupport) {
          score += 10;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && sr.nearResistance) {
          score += 10;
        } else if (technicalSnapshot.signal.prediction === 'BUY' && sr.nearResistance) {
          score -= 5;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && sr.nearSupport) {
          score -= 5;
        }
        
        if (sr.breakout && technicalSnapshot.signal.prediction === 'BUY') {
          score += 15;
        } else if (sr.breakdown && technicalSnapshot.signal.prediction === 'SELL') {
          score += 15;
        }
      }
      
      // Market structure influence
      if (technicalSnapshot.marketStructure) {
        const ms = technicalSnapshot.marketStructure;
        
        if (technicalSnapshot.signal.prediction === 'BUY' && ms.uptrend) {
          score += 10;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && ms.downtrend) {
          score += 10;
        } else if (technicalSnapshot.signal.prediction === 'BUY' && ms.downtrend) {
          score -= 15;
        } else if (technicalSnapshot.signal.prediction === 'SELL' && ms.uptrend) {
          score -= 15;
        }
        
        if (ms.sideways) {
          score -= 5; // Sideways markets are less predictable
        }
      }
      
      // Risk factors influence
      if (technicalSnapshot.riskFactors) {
        const rf = technicalSnapshot.riskFactors;
        
        if (rf.highVolatility) {
          score -= 10;
        }
        
        if (rf.majorLevelProximity) {
          score -= 5;
        }
        
        if (rf.contraTrend) {
          score -= 15;
        }
        
        if (rf.lowVolume) {
          score -= 10;
        }
      }
      
      // Clamp score between 0 and 100
      return Math.max(0, Math.min(100, Math.round(score)));
      
    } catch (error) {
      this.logger.error('❌ Failed to calculate confluence score:', error);
      return 30; // Conservative score on error
    }
  }

  /**
   * Generate final validation decision
   */
  generateFinalValidation(parsedValidation, confluenceScore, quantPrediction) {
    try {
      // Start with LLM validation
      let decision = parsedValidation.validation;
      let confidence = parsedValidation.confidence;
      let reasoning = parsedValidation.reasoning;
      
      // Adjust based on confluence score
      if (confluenceScore >= this.confluenceThresholds.strong && decision === 'YES') {
        confidence = Math.min(1, confidence * 1.2);
        decision = 'YES';
      } else if (confluenceScore <= this.confluenceThresholds.weak && decision === 'YES') {
        confidence = Math.max(0.1, confidence * 0.8);
        decision = confluenceScore < 20 ? 'NO' : 'YES';
      } else if (confluenceScore < this.confluenceThresholds.moderate && decision === 'NO') {
        confidence = Math.min(1, confidence * 1.2);
      }
      
      // Adjust based on quant prediction confidence
      if (quantPrediction.confidence < 0.4 && decision === 'YES') {
        confidence = Math.max(0.1, confidence * 0.8);
        decision = quantPrediction.confidence < 0.3 ? 'NO' : 'YES';
      } else if (quantPrediction.confidence > 0.8 && decision === 'NO') {
        confidence = Math.max(0.1, confidence * 0.8);
      }
      
      // Adjust based on risk score
      if (quantPrediction.riskScore > 0.7) {
        if (decision === 'YES') {
          decision = 'HIGH_RISK';
          confidence = Math.max(0.1, confidence * 0.7);
          reasoning = `HIGH RISK: ${reasoning}`;
        }
      }
      
      return {
        decision,
        confidence,
        reasoning
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to generate final validation:', error);
      
      return {
        decision: 'HIGH_RISK',
        confidence: 0.1,
        reasoning: 'Failed to generate final validation'
      };
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(validation, processingTime) {
    this.performance.validations++;
    this.performance.avgConfidence = (
      (this.performance.avgConfidence * (this.performance.validations - 1)) + 
      validation.confidence
    ) / this.performance.validations;
    
    this.performance.avgProcessingTime = (
      (this.performance.avgProcessingTime * (this.performance.validations - 1)) + 
      processingTime
    ) / this.performance.validations;
  }

  /**
   * Update validation accuracy (call after trade completion)
   */
  updateValidationAccuracy(validation, actualOutcome) {
    const wasCorrect = (
      (validation.validation === 'YES' && actualOutcome === 'WIN') ||
      (validation.validation === 'NO' && actualOutcome === 'LOSS') ||
      (validation.validation === 'HIGH_RISK' && actualOutcome === 'LOSS')
    );
    
    if (wasCorrect) {
      this.performance.successfulValidations++;
    }
    
    this.performance.accuracy = this.performance.successfulValidations / this.performance.validations;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performance };
  }

  // ===== Technical Analysis Helper Methods =====

  /**
   * Analyze multi-timeframe trend
   */
  analyzeMultiTimeframeTrend(features) {
    try {
      if (!features || !features.multiTimeframe) {
        return {
          bullishTimeframes: 0,
          bearishTimeframes: 0,
          totalTimeframes: 0,
          alignmentStrength: 0,
          primaryTrend: 'neutral'
        };
      }
      
      const mtf = features.multiTimeframe;
      
      return {
        bullishTimeframes: mtf.bullish_timeframes || 0,
        bearishTimeframes: mtf.bearish_timeframes || 0,
        totalTimeframes: mtf.total_timeframes || 0,
        alignmentStrength: mtf.alignment_strength || 0,
        primaryTrend: mtf.bullish_alignment > 0.6 ? 'bullish' : 
                     mtf.bearish_alignment > 0.6 ? 'bearish' : 
                     'mixed'
      };
    } catch (error) {
      this.logger.warn('⚠️ Multi-timeframe trend analysis failed:', error);
      return {
        bullishTimeframes: 0,
        bearishTimeframes: 0,
        totalTimeframes: 0,
        alignmentStrength: 0,
        primaryTrend: 'neutral'
      };
    }
  }

  /**
   * Analyze technical indicators
   */
  analyzeTechnicalIndicators(features) {
    try {
      if (!features || !features.technical) {
        return {
          rsi: 50,
          rsiOverbought: false,
          rsiOversold: false,
          macdBullish: false,
          macdBearish: false,
          macdCrossover: false,
          emaAlignment: 'neutral',
          bbSqueeze: false,
          bbExpansion: false,
          bbPosition: 0.5
        };
      }
      
      const technical = features.technical;
      
      // Get RSI from 5m timeframe
      const rsi = technical['5m_rsi14'] || 50;
      
      // Get MACD from 5m timeframe
      const macdLine = technical['5m_macd_line'] || 0;
      const macdSignal = technical['5m_macd_signal'] || 0;
      const macdBullishCross = technical['5m_macd_bullish_cross'] === 1;
      const macdBearishCross = technical['5m_macd_bearish_cross'] === 1;
      
      // Get EMA alignment from 5m timeframe
      const ema8 = technical['5m_ema8'] || 0;
      const ema21 = technical['5m_ema21'] || 0;
      const ema50 = technical['5m_ema50'] || 0;
      
      let emaAlignment = 'neutral';
      if (ema8 > ema21 && ema21 > ema50) {
        emaAlignment = 'bullish';
      } else if (ema8 < ema21 && ema21 < ema50) {
        emaAlignment = 'bearish';
      }
      
      // Get Bollinger Bands from 5m timeframe
      const bbSqueeze = technical['5m_bb_squeeze'] === 1;
      const bbExpansion = technical['5m_bb_expansion'] === 1;
      const bbPosition = technical['5m_bb_position'] || 0.5;
      
      return {
        rsi,
        rsiOverbought: rsi > 70,
        rsiOversold: rsi < 30,
        macdBullish: macdLine > macdSignal,
        macdBearish: macdLine < macdSignal,
        macdCrossover: macdBullishCross || macdBearishCross,
        macdBullishCross,
        macdBearishCross,
        emaAlignment,
        bbSqueeze,
        bbExpansion,
        bbPosition
      };
    } catch (error) {
      this.logger.warn('⚠️ Technical indicators analysis failed:', error);
      return {
        rsi: 50,
        rsiOverbought: false,
        rsiOversold: false,
        macdBullish: false,
        macdBearish: false,
        macdCrossover: false,
        emaAlignment: 'neutral',
        bbSqueeze: false,
        bbExpansion: false,
        bbPosition: 0.5
      };
    }
  }

  /**
   * Analyze volume signals
   */
  analyzeVolumeSignals(features) {
    try {
      if (!features || !features.volume) {
        return {
          volumeIncreasing: false,
          volumeDecreasing: false,
          volumeSpike: false,
          volumeConfirmsDirection: false,
          volumePriceDivergence: false
        };
      }
      
      const volume = features.volume;
      
      // Get volume data from 5m timeframe
      const volumeRatio = volume['5m_volume_ratio'] || 1;
      const volumeChange = volume['5m_volume_change'] || 0;
      const volumeSpike = volume['5m_volume_spike'] === 1;
      const volumePriceDivergence = volume['5m_volume_price_divergence'] === 1;
      
      // Determine if volume confirms direction
      let volumeConfirmsDirection = false;
      
      if (features.technical) {
        const priceChange = features.technical['5m_price_change'] || 0;
        volumeConfirmsDirection = (priceChange > 0 && volumeChange > 0) || (priceChange < 0 && volumeChange > 0);
      }
      
      return {
        volumeIncreasing: volumeRatio > 1.2,
        volumeDecreasing: volumeRatio < 0.8,
        volumeSpike,
        volumeConfirmsDirection,
        volumePriceDivergence
      };
    } catch (error) {
      this.logger.warn('⚠️ Volume signals analysis failed:', error);
      return {
        volumeIncreasing: false,
        volumeDecreasing: false,
        volumeSpike: false,
        volumeConfirmsDirection: false,
        volumePriceDivergence: false
      };
    }
  }

  /**
   * Analyze candlestick patterns
   */
  analyzeCandlestickPatterns(features) {
    try {
      if (!features || !features.patterns) {
        return {
          bullishPatterns: [],
          bearishPatterns: [],
          neutralPatterns: [],
          patternStrength: 0
        };
      }
      
      const patterns = features.patterns;
      const bullishPatterns = [];
      const bearishPatterns = [];
      const neutralPatterns = [];
      
      // Check for bullish patterns
      if (patterns['5m_bullish_engulfing'] === 1) bullishPatterns.push('Bullish Engulfing');
      if (patterns['5m_hammer'] === 1) bullishPatterns.push('Hammer');
      if (patterns['5m_morning_star'] === 1) bullishPatterns.push('Morning Star');
      if (patterns['5m_piercing_line'] === 1) bullishPatterns.push('Piercing Line');
      if (patterns['5m_bullish_harami'] === 1) bullishPatterns.push('Bullish Harami');
      
      // Check for bearish patterns
      if (patterns['5m_bearish_engulfing'] === 1) bearishPatterns.push('Bearish Engulfing');
      if (patterns['5m_shooting_star'] === 1) bearishPatterns.push('Shooting Star');
      if (patterns['5m_evening_star'] === 1) bearishPatterns.push('Evening Star');
      if (patterns['5m_dark_cloud_cover'] === 1) bearishPatterns.push('Dark Cloud Cover');
      if (patterns['5m_bearish_harami'] === 1) bearishPatterns.push('Bearish Harami');
      
      // Check for neutral patterns
      if (patterns['5m_doji'] === 1) neutralPatterns.push('Doji');
      
      // Calculate pattern strength
      const patternStrength = bullishPatterns.length > 0 ? 0.7 + Math.random() * 0.3 : 
                             bearishPatterns.length > 0 ? 0.7 + Math.random() * 0.3 : 
                             neutralPatterns.length > 0 ? 0.3 + Math.random() * 0.3 : 
                             0;
      
      return {
        bullishPatterns,
        bearishPatterns,
        neutralPatterns,
        patternStrength
      };
    } catch (error) {
      this.logger.warn('⚠️ Candlestick patterns analysis failed:', error);
      return {
        bullishPatterns: [],
        bearishPatterns: [],
        neutralPatterns: [],
        patternStrength: 0
      };
    }
  }

  /**
   * Analyze support and resistance
   */
  analyzeSupportResistance(features) {
    try {
      if (!features || !features.marketStructure) {
        return {
          support: 0,
          resistance: 0,
          nearSupport: false,
          nearResistance: false,
          breakout: false,
          breakdown: false
        };
      }
      
      const ms = features.marketStructure;
      
      return {
        support: ms.support || 0,
        resistance: ms.resistance || 0,
        nearSupport: ms.distance_to_support < 0.01,
        nearResistance: ms.distance_to_resistance < 0.01,
        breakout: ms.breakout === 1,
        breakdown: ms.breakdown === 1
      };
    } catch (error) {
      this.logger.warn('⚠️ Support/resistance analysis failed:', error);
      return {
        support: 0,
        resistance: 0,
        nearSupport: false,
        nearResistance: false,
        breakout: false,
        breakdown: false
      };
    }
  }

  /**
   * Analyze market structure
   */
  analyzeMarketStructure(features) {
    try {
      if (!features || !features.marketStructure) {
        return {
          uptrend: false,
          downtrend: false,
          sideways: true,
          higherHighs: false,
          higherLows: false,
          lowerHighs: false,
          lowerLows: false
        };
      }
      
      const ms = features.marketStructure;
      
      return {
        uptrend: ms.uptrend === 1,
        downtrend: ms.downtrend === 1,
        sideways: ms.sideways === 1,
        higherHighs: ms.higher_highs === 1,
        higherLows: ms.higher_lows === 1,
        lowerHighs: ms.lower_highs === 1,
        lowerLows: ms.lower_lows === 1
      };
    } catch (error) {
      this.logger.warn('⚠️ Market structure analysis failed:', error);
      return {
        uptrend: false,
        downtrend: false,
        sideways: true,
        higherHighs: false,
        higherLows: false,
        lowerHighs: false,
        lowerLows: false
      };
    }
  }

  /**
   * Identify risk factors
   */
  identifyRiskFactors(features, marketData) {
    try {
      const riskFactors = {
        highVolatility: false,
        majorLevelProximity: false,
        contraTrend: false,
        lowVolume: false,
        conflictingSignals: false,
        description: []
      };
      
      // Check for high volatility
      if (features.technical && features.technical['5m_atr_normalized'] > 0.02) {
        riskFactors.highVolatility = true;
        riskFactors.description.push('High volatility detected');
      }
      
      // Check for proximity to major levels
      if (features.marketStructure) {
        if (features.marketStructure.distance_to_support < 0.005 || 
            features.marketStructure.distance_to_resistance < 0.005) {
          riskFactors.majorLevelProximity = true;
          riskFactors.description.push('Price near major support/resistance');
        }
      }
      
      // Check for contra-trend signals
      if (features.marketStructure && features.multiTimeframe) {
        const isUptrend = features.marketStructure.uptrend === 1;
        const isDowntrend = features.marketStructure.downtrend === 1;
        const prediction = features.signal?.prediction || '';
        
        if ((isUptrend && prediction === 'SELL') || (isDowntrend && prediction === 'BUY')) {
          riskFactors.contraTrend = true;
          riskFactors.description.push('Signal against primary trend');
        }
      }
      
      // Check for low volume
      if (features.volume && features.volume['5m_volume_ratio'] < 0.7) {
        riskFactors.lowVolume = true;
        riskFactors.description.push('Below average volume');
      }
      
      // Check for conflicting signals
      if (features.technical) {
        const rsi = features.technical['5m_rsi14'] || 50;
        const macdLine = features.technical['5m_macd_line'] || 0;
        const macdSignal = features.technical['5m_macd_signal'] || 0;
        
        if ((rsi > 70 && macdLine > macdSignal) || (rsi < 30 && macdLine < macdSignal)) {
          riskFactors.conflictingSignals = true;
          riskFactors.description.push('Conflicting indicator signals');
        }
      }
      
      return riskFactors;
    } catch (error) {
      this.logger.warn('⚠️ Risk factors identification failed:', error);
      return {
        highVolatility: false,
        majorLevelProximity: false,
        contraTrend: false,
        lowVolume: false,
        conflictingSignals: false,
        description: ['Risk analysis failed']
      };
    }
  }

  // ===== Formatting Methods for LLM Prompt =====

  /**
   * Format multi-timeframe analysis for LLM prompt
   */
  formatMultiTimeframeAnalysis(mtf) {
    return `- Primary Trend: ${mtf.primaryTrend.toUpperCase()}
- Bullish Timeframes: ${mtf.bullishTimeframes}/${mtf.totalTimeframes}
- Bearish Timeframes: ${mtf.bearishTimeframes}/${mtf.totalTimeframes}
- Alignment Strength: ${(mtf.alignmentStrength * 100).toFixed(1)}%`;
  }

  /**
   * Format technical indicators for LLM prompt
   */
  formatTechnicalIndicators(ti) {
    return `- RSI(14): ${ti.rsi.toFixed(1)} (${ti.rsiOverbought ? 'OVERBOUGHT' : ti.rsiOversold ? 'OVERSOLD' : 'NEUTRAL'})
- MACD: ${ti.macdBullish ? 'BULLISH' : 'BEARISH'}${ti.macdCrossover ? ' (RECENT CROSSOVER)' : ''}
- EMA Alignment: ${ti.emaAlignment.toUpperCase()}
- Bollinger Bands: ${ti.bbSqueeze ? 'SQUEEZE' : ti.bbExpansion ? 'EXPANSION' : 'NORMAL'} (Position: ${(ti.bbPosition * 100).toFixed(1)}%)`;
  }

  /**
   * Format volume analysis for LLM prompt
   */
  formatVolumeAnalysis(va) {
    return `- Volume Trend: ${va.volumeIncreasing ? 'INCREASING' : va.volumeDecreasing ? 'DECREASING' : 'STABLE'}
- Volume Spike: ${va.volumeSpike ? 'YES' : 'NO'}
- Confirms Direction: ${va.volumeConfirmsDirection ? 'YES' : 'NO'}
- Price-Volume Divergence: ${va.volumePriceDivergence ? 'YES' : 'NO'}`;
  }

  /**
   * Format candlestick patterns for LLM prompt
   */
  formatCandlestickPatterns(cp) {
    return `- Bullish Patterns: ${cp.bullishPatterns.length > 0 ? cp.bullishPatterns.join(', ') : 'None'}
- Bearish Patterns: ${cp.bearishPatterns.length > 0 ? cp.bearishPatterns.join(', ') : 'None'}
- Neutral Patterns: ${cp.neutralPatterns.length > 0 ? cp.neutralPatterns.join(', ') : 'None'}
- Pattern Strength: ${cp.patternStrength > 0 ? (cp.patternStrength * 100).toFixed(1) + '%' : 'N/A'}`;
  }

  /**
   * Format support and resistance for LLM prompt
   */
  formatSupportResistance(sr) {
    return `- Support Level: ${sr.support > 0 ? sr.support.toFixed(5) : 'N/A'}
- Resistance Level: ${sr.resistance > 0 ? sr.resistance.toFixed(5) : 'N/A'}
- Near Support: ${sr.nearSupport ? 'YES' : 'NO'}
- Near Resistance: ${sr.nearResistance ? 'YES' : 'NO'}
- Recent Breakout: ${sr.breakout ? 'YES' : 'NO'}
- Recent Breakdown: ${sr.breakdown ? 'YES' : 'NO'}`;
  }

  /**
   * Format market structure for LLM prompt
   */
  formatMarketStructure(ms) {
    return `- Market Trend: ${ms.uptrend ? 'UPTREND' : ms.downtrend ? 'DOWNTREND' : 'SIDEWAYS'}
- Higher Highs: ${ms.higherHighs ? 'YES' : 'NO'}
- Higher Lows: ${ms.higherLows ? 'YES' : 'NO'}
- Lower Highs: ${ms.lowerHighs ? 'YES' : 'NO'}
- Lower Lows: ${ms.lowerLows ? 'YES' : 'NO'}`;
  }

  /**
   * Format risk factors for LLM prompt
   */
  formatRiskFactors(rf) {
    return `- High Volatility: ${rf.highVolatility ? 'YES' : 'NO'}
- Near Major Level: ${rf.majorLevelProximity ? 'YES' : 'NO'}
- Contra-Trend Signal: ${rf.contraTrend ? 'YES' : 'NO'}
- Low Volume: ${rf.lowVolume ? 'YES' : 'NO'}
- Conflicting Signals: ${rf.conflictingSignals ? 'YES' : 'NO'}
- Risk Factors: ${rf.description.length > 0 ? rf.description.join(', ') : 'None identified'}`;
  }
}

module.exports = { EnhancedAnalystBrain };