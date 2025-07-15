/**
 * AIAnalyzer - AI-Powered Trading Decision Engine
 * 
 * Uses Groq or Together AI to analyze market data and technical indicators
 * to make intelligent trading decisions with confidence scores
 */

const axios = require('axios');
const { Logger } = require('../utils/Logger');
const EnsembleAnalyzer = require('./EnsembleAnalyzer');
const DualModelValidator = require('./DualModelValidator');
const NewsSentimentAnalyzer = require('./NewsSentimentAnalyzer');
const SessionContextAnalyzer = require('./SessionContextAnalyzer');
const MultiTimeframeAnalyzer = require('./MultiTimeframeAnalyzer');

class AIAnalyzer {
  constructor(config, dataCollector = null) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    this.dataCollector = dataCollector;
    this.provider = config.aiProvider || 'groq';

    // Initialize AI client based on provider
    this.initializeAIClient();

    // Initialize ensemble analyzer if enabled
    this.useEnsemble = config.useEnsemble !== false; // Default to true
    if (this.useEnsemble) {
      this.ensembleAnalyzer = new EnsembleAnalyzer(this);
    }

    // Initialize dual model validator if enabled
    this.useDualModel = config.useDualModel !== false; // Default to true
    if (this.useDualModel) {
      this.dualModelValidator = new DualModelValidator(config);
    }

    // Initialize News Sentiment Analyzer
    this.sentimentAnalyzer = new NewsSentimentAnalyzer(config);
    this.useSentiment = config.enableNewsSentiment !== false; // Default to true

    // Initialize Session Context Analyzer
    this.sessionAnalyzer = new SessionContextAnalyzer(config);
    this.useSessionContext = config.enableSessionAnalysis !== false; // Default to true

    // Initialize Multi-Timeframe Analyzer
    if (this.dataCollector) {
      this.multiTimeframeAnalyzer = new MultiTimeframeAnalyzer(config, this.dataCollector);
      this.useMultiTimeframe = config.enableMultiTimeframe !== false; // Default to true
    } else {
      this.useMultiTimeframe = false;
    }

    // Log initialization status
    const features = [];
    if (this.useEnsemble) features.push('Ensemble');
    if (this.useDualModel) features.push('Dual-Model');
    if (this.useSentiment) features.push('News-Sentiment');
    if (this.useSessionContext) features.push('Session-Context');
    if (this.useMultiTimeframe) features.push('Multi-Timeframe');

    if (features.length > 0) {
      this.logger.info(`🧠 AIAnalyzer initialized with ${this.provider.toUpperCase()} provider + ${features.join(' + ')} System`);
    } else {
      this.logger.info(`🧠 AIAnalyzer initialized with ${this.provider.toUpperCase()} provider (Basic mode)`);
    }
  }
  
  initializeAIClient() {
    if (this.provider === 'groq') {
      this.apiKey = this.config.groqApiKey;
      this.baseUrl = 'https://api.groq.com/openai/v1';
      this.model = 'llama3-70b-8192'; // Fast and accurate model
    } else if (this.provider === 'together') {
      this.apiKey = this.config.togetherApiKey;
      this.baseUrl = 'https://api.together.xyz/v1';
      this.model = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
    } else {
      throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
    
    if (!this.apiKey) {
      throw new Error(`API key not found for ${this.provider} provider`);
    }
  }
  
  /**
   * Analyze market data and make trading decision
   */
  async analyze(analysisData) {
    try {
      const { currencyPair, marketData, technicalData } = analysisData;

      this.logger.info(`🤖 AI analyzing ${currencyPair}...`);

      let decision;

      // Use ensemble analysis if enabled
      if (this.useEnsemble && this.ensembleAnalyzer) {
        try {
          decision = await this.ensembleAnalyzer.generateEnsembleDecision(
            currencyPair,
            technicalData,
            marketData
          );
        } catch (error) {
          this.logger.warn(`⚠️ Ensemble analysis failed, falling back to single model: ${error.message}`);
          // Fallback to single prompt analysis
          const prompt = await this.createAnalysisPrompt(currencyPair, marketData, technicalData);
          const aiResponse = await this.queryAI(prompt);
          decision = this.parseAIResponse(aiResponse);
        }
      } else {
        // Single prompt analysis (original method)
        const prompt = await this.createAnalysisPrompt(currencyPair, marketData, technicalData);
        const aiResponse = await this.queryAI(prompt);
        decision = this.parseAIResponse(aiResponse);
      }

      // Apply dual model validation if enabled
      if (this.useDualModel && this.dualModelValidator) {
        const validation = await this.dualModelValidator.validateWithDualModels(
          currencyPair,
          technicalData,
          marketData,
          decision
        );

        if (validation.validated) {
          decision = validation.decision;
          this.logger.info(`✅ Dual model validation passed: ${validation.reason}`);
        } else {
          decision = validation.decision; // NO_TRADE decision
          this.logger.warn(`❌ Dual model validation failed: ${validation.reason}`);
        }
      }

      this.logger.logDecision({
        currencyPair,
        decision: decision.decision,
        confidence: decision.confidence,
        reason: decision.reason,
        ensemble: this.useEnsemble ? decision.ensembleStats : null
      });

      return decision;
      
    } catch (error) {
      this.logger.logError('AI Analysis', error);
      
      // Return safe default on error
      return {
        decision: 'NO_TRADE',
        confidence: 0,
        reason: 'AI analysis failed - system error',
        error: error.message
      };
    }
  }
  
  /**
   * Create comprehensive analysis prompt for AI signal generation
   */
  async createAnalysisPrompt(currencyPair, marketData, technicalData) {
    const lastCandle = marketData[marketData.length - 1];
    const previousCandle = marketData[marketData.length - 2];

    // Format patterns
    const patterns = technicalData.patterns.detected.map(p =>
      `${p.pattern} (${p.type}, ${p.strength})`
    ).join(', ') || 'None detected';

    // Create market context
    const priceChange = lastCandle.close - previousCandle.close;
    const priceChangePercent = ((priceChange / previousCandle.close) * 100).toFixed(3);
    const trend = priceChange > 0 ? 'UP' : priceChange < 0 ? 'DOWN' : 'SIDEWAYS';

    // Format technical indicators
    const rsi = technicalData.rsi;
    const macd = technicalData.macd;
    const bb = technicalData.bollingerBands;
    const stoch = technicalData.stochastic;
    const volume = technicalData.volume;

    // Get sentiment analysis if enabled
    let sentimentSection = '';
    if (this.useSentiment && this.sentimentAnalyzer) {
      const sentimentData = this.sentimentAnalyzer.formatSentimentForAI(currencyPair);
      sentimentSection = `\n\n${sentimentData}\n`;
    }

    // Get session context if enabled
    let sessionSection = '';
    if (this.useSessionContext && this.sessionAnalyzer) {
      const sessionData = this.sessionAnalyzer.formatSessionContextForAI(currencyPair);
      sessionSection = `\n\n${sessionData}\n`;
    }

    // Get multi-timeframe analysis if enabled
    let multiTimeframeSection = '';
    if (this.useMultiTimeframe && this.multiTimeframeAnalyzer) {
      const multiTimeframeData = await this.multiTimeframeAnalyzer.analyzeMultiTimeframes(currencyPair, data);
      const formattedData = this.multiTimeframeAnalyzer.formatMultiTimeframeForAI(multiTimeframeData);
      multiTimeframeSection = `\n\n${formattedData}\n`;
    }

    // Get adaptive indicators status if enabled
    let adaptiveSection = '';
    if (this.technicalAnalyzer && this.technicalAnalyzer.getAdaptiveStatusForAI) {
      adaptiveSection = `\n\n${this.technicalAnalyzer.getAdaptiveStatusForAI()}\n`;
    }

    // Get validation status if provided
    let validationSection = '';
    if (data.validationResult) {
      validationSection = `\n\n${data.validationResult.summary}\n`;
    }

    return `You are an expert binary options trader and signal analyst with 20+ years of experience. Analyze the following comprehensive market data for ${currencyPair} and generate a detailed trading signal for the next 5-minute candle.

SIGNAL GENERATION MODE: This analysis is for manual execution - provide detailed reasoning and market suitability assessment.

CURRENT MARKET CONTEXT:
- Currency Pair: ${currencyPair}
- Current Price: ${lastCandle.close}
- Price Change: ${priceChangePercent}% (${trend})
- Candle Analysis: O:${lastCandle.open} H:${lastCandle.high} L:${lastCandle.low} C:${lastCandle.close}
- Volume: ${lastCandle.volume} (${volume.signal})

TECHNICAL ANALYSIS SUMMARY:
1. RSI(14): ${rsi.current?.toFixed(1)} - ${rsi.signal} (${rsi.strength})
2. MACD: ${macd.signal} - Histogram: ${macd.histogram > 0 ? 'Bullish' : 'Bearish'}
3. Bollinger Bands: ${bb.position} - Squeeze: ${bb.squeeze ? 'Yes' : 'No'} - Signal: ${bb.signal}
4. Stochastic: K:${stoch.k?.toFixed(1)} D:${stoch.d?.toFixed(1)} - ${stoch.signal} - Crossover: ${stoch.crossover}
5. Volume Analysis: ${volume.signal} (${volume.strength}) - Trend: ${volume.trend}
6. Market State: ${technicalData.marketState}
7. Volatility: ${technicalData.volatility.level} (${technicalData.volatility.current?.toFixed(2)}%)

CANDLESTICK PATTERNS:
${patterns}${sentimentSection}${sessionSection}${multiTimeframeSection}${adaptiveSection}${validationSection}
MARKET DATA (Last 5 candles):
${marketData.slice(-5).map((candle, i) =>
  `${i+1}. O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} V:${candle.volume}`
).join('\n')}

ANALYSIS REQUIREMENTS:
1. Provide a clear direction: BUY (expecting price UP), SELL (expecting price DOWN), or NO_TRADE
2. Assign confidence percentage (0-100) based on signal strength and confluence
3. Give detailed reasoning explaining your decision
4. Assess market suitability for manual execution
5. Consider risk factors and market conditions

TRADING RULES FOR SIGNAL GENERATION:
1. Only trade when multiple indicators align (confluence)
2. Avoid trading during high volatility unless very strong signals
3. Consider volume confirmation for entries
4. Respect overbought/oversold conditions
5. Pattern confirmation is crucial
6. If signals are mixed or weak, choose NO_TRADE
7. Provide detailed reasoning for manual execution confidence

RESPONSE FORMAT (JSON only):
{
  "decision": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "reason": "Detailed explanation of your decision including which indicators influenced it and why this is suitable for manual execution",
  "marketSuitability": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "keyFactors": ["list", "of", "main", "factors", "influencing", "decision"],
  "timeframe": "5-minute recommendation"
}`;
  }
  
  /**
   * Query AI provider (public method for ensemble use)
   */
  async queryAI(prompt, context = 'default', retries = 3) {
    const requestData = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert binary options trader. Always respond with valid JSON only. Be precise and analytical.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for consistent, logical responses
      top_p: 0.9
    };

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    this.logger.debug(`🔄 Querying ${this.provider.toUpperCase()} AI (${context})...`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          requestData,
          {
            headers,
            timeout: 30000 // 30 second timeout
          }
        );

        if (!response.data.choices || response.data.choices.length === 0) {
          throw new Error('No response from AI provider');
        }

        const content = response.data.choices[0].message.content;

        // For ensemble use, return parsed response directly
        if (context !== 'default') {
          return this.parseAIResponse(content);
        }

        return content; // Success, return the content

      } catch (error) {
        const isRateLimit = error.response?.status === 503 || error.response?.status === 429;
        const isLastAttempt = attempt === retries;

        if (isRateLimit && !isLastAttempt) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          this.logger.warn(`⚠️ API rate limit hit (attempt ${attempt}/${retries}), retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If it's the last attempt or not a rate limit error, throw
        throw error;
      }
    }

    return content;
  }
  
  /**
   * Parse enhanced AI response for signal generation
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
      const validDecisions = ['BUY', 'SELL', 'NO_TRADE'];
      if (!validDecisions.includes(parsed.decision)) {
        throw new Error(`Invalid decision: ${parsed.decision}`);
      }

      // Validate confidence range
      const confidence = parseInt(parsed.confidence);
      if (isNaN(confidence) || confidence < 0 || confidence > 100) {
        throw new Error(`Invalid confidence: ${parsed.confidence}`);
      }

      // Validate optional enhanced fields
      const validSuitability = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'];
      const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH'];

      return {
        decision: parsed.decision,
        confidence: confidence,
        reason: parsed.reason.substring(0, 800), // Increased limit for detailed reasoning
        marketSuitability: validSuitability.includes(parsed.marketSuitability) ?
          parsed.marketSuitability : 'FAIR',
        riskLevel: validRiskLevels.includes(parsed.riskLevel) ?
          parsed.riskLevel : 'MEDIUM',
        keyFactors: Array.isArray(parsed.keyFactors) ?
          parsed.keyFactors.slice(0, 5) : ['Technical analysis'],
        timeframe: parsed.timeframe || '5-minute recommendation',
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      this.logger.debug('Raw AI response:', aiResponse);

      // Return safe fallback with enhanced structure
      return {
        decision: 'NO_TRADE',
        confidence: 0,
        reason: `Failed to parse AI response: ${error.message}`,
        marketSuitability: 'POOR',
        riskLevel: 'HIGH',
        keyFactors: ['System error'],
        timeframe: '5-minute recommendation',
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Test AI connection and response with fallback
   */
  async testConnection() {
    try {
      this.logger.info(`🔍 Testing ${this.provider.toUpperCase()} AI connection...`);

      // Test current provider
      const success = await this.testSingleProvider();
      if (success) {
        this.logger.info(`✅ ${this.provider.toUpperCase()} AI connection successful`);
        return true;
      }

      // Try fallback provider if available
      const fallbackProvider = this.provider === 'groq' ? 'together' : 'groq';
      const fallbackKey = fallbackProvider === 'groq' ? this.config.groqApiKey : this.config.togetherApiKey;

      if (fallbackKey) {
        this.logger.warn(`⚠️ ${this.provider.toUpperCase()} failed, testing ${fallbackProvider.toUpperCase()} fallback...`);

        // Temporarily switch to fallback
        const originalProvider = this.provider;
        const originalApiKey = this.apiKey;
        const originalModel = this.model;
        const originalBaseUrl = this.baseUrl;

        this.provider = fallbackProvider;
        this.setupProvider();

        const fallbackSuccess = await this.testSingleProvider();
        if (fallbackSuccess) {
          this.logger.info(`✅ Switched to ${fallbackProvider.toUpperCase()} API successfully`);
          return true;
        } else {
          // Restore original provider
          this.provider = originalProvider;
          this.apiKey = originalApiKey;
          this.model = originalModel;
          this.baseUrl = originalBaseUrl;
        }
      }

      this.logger.error('❌ All AI providers failed connection test');
      return false;

    } catch (error) {
      this.logger.logError('AI Connection Test', error);
      return false;
    }
  }

  /**
   * Test a single provider
   */
  async testSingleProvider() {
    try {
      const testPrompt = `Test prompt: What is 2+2? Respond in JSON format: {"answer": "your_answer", "confidence": 100}`;

      const response = await this.queryAI(testPrompt);
      const parsed = this.parseAIResponse(response);

      return parsed && parsed.confidence > 0;

    } catch (error) {
      this.logger.warn(`${this.provider.toUpperCase()} test failed:`, error.message);
      return false;
    }
  }
  
  /**
   * Get AI provider statistics
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      model: this.model,
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey
    };
  }
}

module.exports = { AIAnalyzer };
