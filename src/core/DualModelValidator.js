/**
 * DualModelValidator - Cross-Validation with Multiple AI Providers
 * 
 * Implements dual-model verification using both Groq and Together.ai
 * Only generates signals when both models agree on direction and confidence
 */

const { Logger } = require('../utils/Logger');

class DualModelValidator {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Dual model configuration
    this.agreementThreshold = config.dualModelAgreementThreshold || 0.8; // 80% agreement required
    this.confidenceDifference = config.dualModelConfidenceDiff || 20; // Max 20% confidence difference
    this.enableDualModel = config.useDualModel !== false; // Default to true
    
    // Initialize both AI providers
    this.groqConfig = {
      ...config,
      aiProvider: 'groq',
      groqApiKey: config.groqApiKey
    };
    
    this.togetherConfig = {
      ...config,
      aiProvider: 'together',
      togetherApiKey: config.togetherApiKey
    };
    
    this.logger.info('🔄 DualModelValidator initialized for cross-validation');
  }

  /**
   * Validate decision using both AI models
   */
  async validateWithDualModels(currencyPair, technicalData, marketData, primaryDecision) {
    try {
      if (!this.enableDualModel) {
        return {
          validated: true,
          decision: primaryDecision,
          reason: 'Dual model validation disabled',
          validation: {
            enabled: false,
            primaryModel: this.config.aiProvider,
            secondaryModel: null,
            agreement: null
          }
        };
      }

      this.logger.info(`🔄 Starting dual-model validation for ${currencyPair}...`);
      
      // Determine secondary model (opposite of primary)
      const primaryModel = this.config.aiProvider || 'groq';
      const secondaryModel = primaryModel === 'groq' ? 'together' : 'groq';
      
      // Check if we have API keys for both models
      if (!this.config.groqApiKey || !this.config.togetherApiKey) {
        this.logger.warn('⚠️ Missing API keys for dual model validation, using single model');
        return {
          validated: true,
          decision: primaryDecision,
          reason: 'Missing API keys for dual model validation',
          validation: {
            enabled: false,
            primaryModel: primaryModel,
            secondaryModel: null,
            agreement: null,
            error: 'Missing API keys'
          }
        };
      }

      // Get decision from secondary model
      const secondaryDecision = await this.getSecondaryModelDecision(
        currencyPair, 
        technicalData, 
        marketData, 
        secondaryModel
      );

      // Analyze agreement between models
      const validation = this.analyzeModelAgreement(
        primaryDecision, 
        secondaryDecision, 
        primaryModel, 
        secondaryModel
      );

      // Determine if validation passes
      const validated = validation.agreement >= this.agreementThreshold && 
                       validation.confidenceDifference <= this.confidenceDifference &&
                       validation.directionMatch;

      if (validated) {
        this.logger.info(`✅ Dual model validation PASSED: ${validation.agreement}% agreement`);
        return {
          validated: true,
          decision: this.createValidatedDecision(primaryDecision, secondaryDecision, validation),
          reason: `Dual model validation passed with ${validation.agreement}% agreement`,
          validation: validation
        };
      } else {
        this.logger.warn(`❌ Dual model validation FAILED: ${validation.agreement}% agreement`);
        return {
          validated: false,
          decision: {
            decision: 'NO_TRADE',
            confidence: 0,
            reason: `Dual model validation failed - models disagree (${validation.agreement}% agreement)`,
            marketSuitability: 'POOR',
            riskLevel: 'HIGH',
            keyFactors: ['Model disagreement', 'Validation failed'],
            timeframe: '5-minute recommendation'
          },
          reason: `Models disagree: ${validation.disagreementReason}`,
          validation: validation
        };
      }

    } catch (error) {
      this.logger.error('❌ Dual model validation error:', error);
      return {
        validated: false,
        decision: {
          decision: 'NO_TRADE',
          confidence: 0,
          reason: 'Dual model validation failed due to error',
          marketSuitability: 'POOR',
          riskLevel: 'HIGH',
          keyFactors: ['Validation error'],
          timeframe: '5-minute recommendation'
        },
        reason: `Validation error: ${error.message}`,
        validation: {
          enabled: true,
          primaryModel: this.config.aiProvider,
          secondaryModel: null,
          agreement: 0,
          error: error.message
        }
      };
    }
  }

  /**
   * Get decision from secondary AI model using direct API call
   */
  async getSecondaryModelDecision(currencyPair, technicalData, marketData, secondaryModel) {
    try {
      // Create prompt for secondary model
      const prompt = this.createAnalysisPrompt(currencyPair, marketData, technicalData);

      // Get decision from secondary model using direct API call
      const decision = await this.querySecondaryModel(prompt, secondaryModel);

      this.logger.info(`🔄 Secondary model (${secondaryModel.toUpperCase()}) decision: ${decision.decision} (${decision.confidence}%)`);

      return decision;

    } catch (error) {
      this.logger.error(`❌ Secondary model (${secondaryModel}) analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Query secondary AI model directly
   */
  async querySecondaryModel(prompt, modelType) {
    const axios = require('axios');

    let apiKey, baseUrl, model;

    if (modelType === 'groq') {
      apiKey = this.config.groqApiKey;
      baseUrl = 'https://api.groq.com/openai/v1';
      model = 'llama3-70b-8192';
    } else if (modelType === 'together') {
      apiKey = this.config.togetherApiKey;
      baseUrl = 'https://api.together.xyz/v1';
      model = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
    } else {
      throw new Error(`Unsupported model type: ${modelType}`);
    }

    const requestData = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert forex trader analyzing market data for binary options trading. Provide precise, actionable trading signals with confidence scores.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    };

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    this.logger.debug(`🔄 Querying ${modelType.toUpperCase()} AI for validation...`);

    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      requestData,
      {
        headers,
        timeout: 30000
      }
    );

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error(`No response from ${modelType} provider`);
    }

    const content = response.data.choices[0].message.content;
    return this.parseAIResponse(content);
  }

  /**
   * Analyze agreement between two model decisions
   */
  analyzeModelAgreement(primaryDecision, secondaryDecision, primaryModel, secondaryModel) {
    const directionMatch = primaryDecision.decision === secondaryDecision.decision;
    const confidenceDifference = Math.abs(primaryDecision.confidence - secondaryDecision.confidence);
    
    // Calculate overall agreement score
    let agreement = 0;
    
    if (directionMatch) {
      agreement += 60; // 60% for direction match
      
      // Add confidence agreement (40% max)
      const confidenceAgreement = Math.max(0, 40 - (confidenceDifference * 2));
      agreement += confidenceAgreement;
    }
    
    // Determine disagreement reason
    let disagreementReason = '';
    if (!directionMatch) {
      disagreementReason = `Direction mismatch: ${primaryModel}=${primaryDecision.decision}, ${secondaryModel}=${secondaryDecision.decision}`;
    } else if (confidenceDifference > this.confidenceDifference) {
      disagreementReason = `Confidence difference too high: ${confidenceDifference}%`;
    }
    
    return {
      enabled: true,
      primaryModel: primaryModel,
      secondaryModel: secondaryModel,
      primaryDecision: {
        decision: primaryDecision.decision,
        confidence: primaryDecision.confidence,
        reason: primaryDecision.reason?.substring(0, 100) + '...'
      },
      secondaryDecision: {
        decision: secondaryDecision.decision,
        confidence: secondaryDecision.confidence,
        reason: secondaryDecision.reason?.substring(0, 100) + '...'
      },
      directionMatch: directionMatch,
      confidenceDifference: confidenceDifference,
      agreement: Math.round(agreement),
      disagreementReason: disagreementReason,
      validationPassed: agreement >= this.agreementThreshold && 
                       confidenceDifference <= this.confidenceDifference && 
                       directionMatch
    };
  }

  /**
   * Create validated decision combining both models
   */
  createValidatedDecision(primaryDecision, secondaryDecision, validation) {
    // Average confidence from both models
    const avgConfidence = Math.round((primaryDecision.confidence + secondaryDecision.confidence) / 2);
    
    // Combine key factors from both models
    const primaryFactors = primaryDecision.keyFactors || [];
    const secondaryFactors = secondaryDecision.keyFactors || [];
    const combinedFactors = [...new Set([...primaryFactors, ...secondaryFactors])];
    
    // Create enhanced reason
    const enhancedReason = `Dual model validation: ${validation.primaryModel.toUpperCase()} and ${validation.secondaryModel.toUpperCase()} agree on ${primaryDecision.decision} with ${validation.agreement}% consensus. ${primaryDecision.reason}`;
    
    // Determine market suitability (use more conservative)
    const suitabilityRank = { 'EXCELLENT': 4, 'GOOD': 3, 'FAIR': 2, 'POOR': 1 };
    const primaryRank = suitabilityRank[primaryDecision.marketSuitability] || 2;
    const secondaryRank = suitabilityRank[secondaryDecision.marketSuitability] || 2;
    const minRank = Math.min(primaryRank, secondaryRank);
    const marketSuitability = Object.keys(suitabilityRank).find(key => suitabilityRank[key] === minRank) || 'FAIR';
    
    // Determine risk level (use more conservative)
    const riskRank = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 };
    const primaryRiskRank = riskRank[primaryDecision.riskLevel] || 2;
    const secondaryRiskRank = riskRank[secondaryDecision.riskLevel] || 2;
    const maxRiskRank = Math.max(primaryRiskRank, secondaryRiskRank);
    const riskLevel = Object.keys(riskRank).find(key => riskRank[key] === maxRiskRank) || 'MEDIUM';
    
    return {
      decision: primaryDecision.decision,
      confidence: avgConfidence,
      reason: enhancedReason,
      marketSuitability: marketSuitability,
      riskLevel: riskLevel,
      keyFactors: combinedFactors.slice(0, 6), // Top 6 factors
      timeframe: '5-minute recommendation',
      dualModelValidation: validation
    };
  }

  /**
   * Create analysis prompt for secondary model
   */
  createAnalysisPrompt(currencyPair, marketData, technicalData) {
    return `You are an expert forex trader analyzing ${currencyPair} for a 5-minute binary options trade.

MARKET DATA:
${this.formatMarketData(marketData)}

TECHNICAL INDICATORS:
${this.formatTechnicalData(technicalData)}

Based on this data, provide a trading recommendation for the next 5 minutes.

Consider:
- Technical indicator signals and convergence
- Market momentum and trend direction
- Risk/reward ratio for binary options
- Current market volatility and conditions

Respond in JSON format:
{
  "decision": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "reason": "Detailed explanation of your analysis",
  "marketSuitability": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "keyFactors": ["list", "of", "key", "factors"],
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
   * Parse AI response
   */
  parseAIResponse(aiResponse) {
    try {
      // Clean response (remove any markdown formatting)
      let cleanResponse = aiResponse.trim();

      // Extract JSON if wrapped in markdown
      const jsonMatch = cleanResponse.match(/```json\n?(.*?)\n?```/s);
      if (jsonMatch) {
        cleanResponse = jsonMatch[1];
      }

      // Remove any non-JSON content before/after
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(cleanResponse);

      // Validate required fields
      if (!parsed.decision || !parsed.confidence || !parsed.reason) {
        throw new Error('Missing required fields in AI response');
      }

      // Validate decision values
      if (!['BUY', 'SELL', 'NO_TRADE'].includes(parsed.decision)) {
        throw new Error(`Invalid decision: ${parsed.decision}`);
      }

      // Ensure confidence is a number between 0-100
      parsed.confidence = Math.max(0, Math.min(100, parseInt(parsed.confidence) || 0));

      // Set defaults for optional fields
      parsed.marketSuitability = parsed.marketSuitability || 'FAIR';
      parsed.riskLevel = parsed.riskLevel || 'MEDIUM';
      parsed.keyFactors = parsed.keyFactors || [];
      parsed.timeframe = parsed.timeframe || '5-minute recommendation';

      return parsed;

    } catch (error) {
      this.logger.error('❌ Failed to parse AI response:', error);

      // Return safe default
      return {
        decision: 'NO_TRADE',
        confidence: 0,
        reason: `Failed to parse AI response: ${error.message}`,
        marketSuitability: 'POOR',
        riskLevel: 'HIGH',
        keyFactors: ['Parse error'],
        timeframe: '5-minute recommendation'
      };
    }
  }
}

module.exports = DualModelValidator;
