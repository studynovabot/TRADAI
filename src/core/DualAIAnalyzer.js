/**
 * TRADAI Dual AI Analysis Pipeline
 * Sends identical market data to both Groq and Together AI
 * Only generates signals when both models agree on direction
 */

const Groq = require('groq-sdk');
const Together = require('together-ai').default;

class DualAIAnalyzer {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize AI clients
    this.groqClient = new Groq({
      apiKey: config.groq?.apiKey || process.env.GROQ_API_KEY
    });
    
    this.togetherClient = new Together({
      apiKey: config.together?.apiKey || process.env.TOGETHER_API_KEY
    });
    
    // Analysis settings
    this.consensusRequired = config.ai?.consensusRequired !== false; // Default true
    this.confidenceThreshold = config.ai?.confidenceThreshold || 70;
    this.maxRetries = 3;
    
    // Model configurations
    this.groqModel = config.groq?.model || 'llama-3.1-70b-versatile';
    this.togetherModel = config.together?.model || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
    
    // Analysis tracking
    this.analysisHistory = [];
    this.consensusStats = {
      total: 0,
      agreements: 0,
      disagreements: 0,
      groqWins: 0,
      togetherWins: 0
    };
  }

  /**
   * Analyze market data with both AI models
   */
  async analyzeMarket(marketData, technicalData, currencyPair, timeframe) {
    try {
      this.logger.info(`🧠 Starting dual AI analysis for ${currencyPair} (${timeframe})`);
      
      // Prepare identical prompt for both models
      const analysisPrompt = this.createAnalysisPrompt(marketData, technicalData, currencyPair, timeframe);
      
      // Run both analyses in parallel
      const [groqResult, togetherResult] = await Promise.allSettled([
        this.analyzeWithGroq(analysisPrompt),
        this.analyzeWithTogether(analysisPrompt)
      ]);
      
      // Process results
      const groqAnalysis = groqResult.status === 'fulfilled' ? groqResult.value : null;
      const togetherAnalysis = togetherResult.status === 'fulfilled' ? togetherResult.value : null;
      
      // Log any failures
      if (groqResult.status === 'rejected') {
        this.logger.error('❌ Groq analysis failed:', groqResult.reason);
      }
      if (togetherResult.status === 'rejected') {
        this.logger.error('❌ Together AI analysis failed:', togetherResult.reason);
      }
      
      // Generate consensus decision
      const consensusResult = this.generateConsensus(groqAnalysis, togetherAnalysis, currencyPair);
      
      // Store analysis for tracking
      this.storeAnalysis({
        timestamp: new Date(),
        currencyPair,
        timeframe,
        groqAnalysis,
        togetherAnalysis,
        consensusResult,
        marketData: marketData.slice(-5), // Store last 5 candles
        technicalData
      });
      
      return consensusResult;
      
    } catch (error) {
      this.logger.error('❌ Dual AI analysis error:', error);
      return this.createErrorResult(error);
    }
  }

  /**
   * Create standardized analysis prompt for both AI models
   */
  createAnalysisPrompt(marketData, technicalData, currencyPair, timeframe) {
    const latestCandle = marketData[marketData.length - 1];
    const previousCandle = marketData[marketData.length - 2];
    
    return `You are a professional forex trading AI analyzing ${currencyPair} on ${timeframe} timeframe.

CURRENT MARKET DATA:
- Current Price: ${latestCandle.close}
- Previous Close: ${previousCandle.close}
- Price Change: ${((latestCandle.close - previousCandle.close) / previousCandle.close * 100).toFixed(3)}%
- High: ${latestCandle.high}
- Low: ${latestCandle.low}
- Volume: ${latestCandle.volume || 'N/A'}

TECHNICAL INDICATORS:
- RSI (14): ${technicalData.rsi?.toFixed(2) || 'N/A'}
- MACD: ${technicalData.macd?.macd?.toFixed(4) || 'N/A'}
- MACD Signal: ${technicalData.macd?.signal?.toFixed(4) || 'N/A'}
- MACD Histogram: ${technicalData.macd?.histogram?.toFixed(4) || 'N/A'}
- Bollinger Upper: ${technicalData.bollinger?.upper?.toFixed(4) || 'N/A'}
- Bollinger Middle: ${technicalData.bollinger?.middle?.toFixed(4) || 'N/A'}
- Bollinger Lower: ${technicalData.bollinger?.lower?.toFixed(4) || 'N/A'}
- Stochastic %K: ${technicalData.stochastic?.k?.toFixed(2) || 'N/A'}
- Stochastic %D: ${technicalData.stochastic?.d?.toFixed(2) || 'N/A'}
- EMA 21: ${technicalData.ema21?.toFixed(4) || 'N/A'}
- SMA 50: ${technicalData.sma50?.toFixed(4) || 'N/A'}

CANDLESTICK PATTERNS:
${technicalData.patterns ? technicalData.patterns.map(p => `- ${p.name}: ${p.strength}`).join('\n') : '- No significant patterns detected'}

MARKET CONTEXT:
- Volatility: ${technicalData.volatility || 'Normal'}
- Trend Direction: ${technicalData.trend || 'Sideways'}
- Support Level: ${technicalData.support?.toFixed(4) || 'N/A'}
- Resistance Level: ${technicalData.resistance?.toFixed(4) || 'N/A'}

TASK: Analyze this data and provide a trading recommendation for the NEXT ${timeframe} candle.

RESPONSE FORMAT (JSON only):
{
  "decision": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "reasoning": "Detailed explanation of your analysis and decision",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "targetProbability": 0-100,
  "stopLossLevel": number,
  "takeProfitLevel": number
}

IMPORTANT: 
- Only recommend BUY/SELL if confidence is above 70%
- Consider multiple timeframe confluence
- Factor in risk management principles
- Provide educational reasoning for learning`;
  }

  /**
   * Analyze with Groq AI
   */
  async analyzeWithGroq(prompt) {
    try {
      const response = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a professional forex trading AI. Respond only with valid JSON format as specified.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: this.groqModel,
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');

      const analysis = JSON.parse(content);
      
      return {
        provider: 'groq',
        model: this.groqModel,
        success: true,
        ...analysis,
        responseTime: Date.now()
      };
      
    } catch (error) {
      this.logger.error('❌ Groq analysis error:', error);
      throw error;
    }
  }

  /**
   * Analyze with Together AI
   */
  async analyzeWithTogether(prompt) {
    try {
      const response = await this.togetherClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a professional forex trading AI. Respond only with valid JSON format as specified.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: this.togetherModel,
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from Together AI');

      // Clean and parse JSON response
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanContent);
      
      return {
        provider: 'together',
        model: this.togetherModel,
        success: true,
        ...analysis,
        responseTime: Date.now()
      };
      
    } catch (error) {
      this.logger.error('❌ Together AI analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate consensus decision from both AI analyses
   */
  generateConsensus(groqAnalysis, togetherAnalysis, currencyPair) {
    this.consensusStats.total++;
    
    // Handle cases where one or both analyses failed
    if (!groqAnalysis && !togetherAnalysis) {
      return this.createNoTradeResult('Both AI analyses failed', 0);
    }
    
    if (!groqAnalysis) {
      this.logger.warn('⚠️ Using only Together AI analysis (Groq failed)');
      return this.formatSingleAnalysis(togetherAnalysis, 'together-only');
    }
    
    if (!togetherAnalysis) {
      this.logger.warn('⚠️ Using only Groq analysis (Together AI failed)');
      return this.formatSingleAnalysis(groqAnalysis, 'groq-only');
    }
    
    // Both analyses successful - check for consensus
    const groqDecision = groqAnalysis.decision;
    const togetherDecision = togetherAnalysis.decision;
    
    if (groqDecision === togetherDecision) {
      // AI models agree
      this.consensusStats.agreements++;
      
      const avgConfidence = Math.round((groqAnalysis.confidence + togetherAnalysis.confidence) / 2);
      
      // Only proceed if consensus meets confidence threshold
      if (avgConfidence >= this.confidenceThreshold) {
        this.logger.info(`✅ AI Consensus: ${groqDecision} (${avgConfidence}%)`);
        
        return {
          decision: groqDecision,
          confidence: avgConfidence,
          consensusReached: true,
          reasoning: this.combineReasoning(groqAnalysis, togetherAnalysis),
          keyFactors: this.combineKeyFactors(groqAnalysis, togetherAnalysis),
          riskLevel: this.determineConsensusRisk(groqAnalysis, togetherAnalysis),
          groqAnalysis: {
            decision: groqAnalysis.decision,
            confidence: groqAnalysis.confidence,
            reasoning: groqAnalysis.reasoning
          },
          togetherAnalysis: {
            decision: togetherAnalysis.decision,
            confidence: togetherAnalysis.confidence,
            reasoning: togetherAnalysis.reasoning
          },
          targetProbability: Math.round((groqAnalysis.targetProbability + togetherAnalysis.targetProbability) / 2),
          stopLossLevel: (groqAnalysis.stopLossLevel + togetherAnalysis.stopLossLevel) / 2,
          takeProfitLevel: (groqAnalysis.takeProfitLevel + togetherAnalysis.takeProfitLevel) / 2
        };
      } else {
        return this.createNoTradeResult(`Consensus confidence too low: ${avgConfidence}%`, avgConfidence);
      }
    } else {
      // AI models disagree
      this.consensusStats.disagreements++;
      this.logger.warn(`⚠️ AI Disagreement: Groq=${groqDecision} (${groqAnalysis.confidence}%), Together=${togetherDecision} (${togetherAnalysis.confidence}%)`);
      
      if (this.consensusRequired) {
        return this.createNoTradeResult('AI models disagree - no consensus', 0, {
          groqDecision: groqDecision,
          togetherDecision: togetherDecision,
          groqConfidence: groqAnalysis.confidence,
          togetherConfidence: togetherAnalysis.confidence
        });
      } else {
        // Use higher confidence analysis
        const winningAnalysis = groqAnalysis.confidence > togetherAnalysis.confidence ? groqAnalysis : togetherAnalysis;
        const winner = winningAnalysis === groqAnalysis ? 'groq' : 'together';
        
        if (winner === 'groq') this.consensusStats.groqWins++;
        else this.consensusStats.togetherWins++;
        
        this.logger.info(`🏆 Using ${winner} analysis (higher confidence: ${winningAnalysis.confidence}%)`);
        return this.formatSingleAnalysis(winningAnalysis, `${winner}-winner`);
      }
    }
  }

  /**
   * Combine reasoning from both analyses
   */
  combineReasoning(groqAnalysis, togetherAnalysis) {
    return `CONSENSUS ANALYSIS:

🧠 GROQ AI PERSPECTIVE:
${groqAnalysis.reasoning}

🤖 TOGETHER AI PERSPECTIVE:
${togetherAnalysis.reasoning}

🎯 UNIFIED CONCLUSION:
Both AI models agree on the ${groqAnalysis.decision} direction, providing high confidence in this trading opportunity. The convergence of independent analyses strengthens the signal reliability.`;
  }

  /**
   * Combine key factors from both analyses
   */
  combineKeyFactors(groqAnalysis, togetherAnalysis) {
    const allFactors = [...(groqAnalysis.keyFactors || []), ...(togetherAnalysis.keyFactors || [])];
    // Remove duplicates and return top factors
    return [...new Set(allFactors)].slice(0, 5);
  }

  /**
   * Determine consensus risk level
   */
  determineConsensusRisk(groqAnalysis, togetherAnalysis) {
    const riskLevels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 };
    const groqRisk = riskLevels[groqAnalysis.riskLevel] || 2;
    const togetherRisk = riskLevels[togetherAnalysis.riskLevel] || 2;
    const avgRisk = Math.round((groqRisk + togetherRisk) / 2);
    
    const riskNames = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH' };
    return riskNames[avgRisk] || 'MEDIUM';
  }

  /**
   * Format single analysis result
   */
  formatSingleAnalysis(analysis, source) {
    return {
      ...analysis,
      consensusReached: false,
      consensusSource: source,
      reasoning: `${analysis.reasoning}\n\n⚠️ Note: This signal is based on ${source} analysis only.`
    };
  }

  /**
   * Create NO_TRADE result
   */
  createNoTradeResult(reason, confidence = 0, additionalData = {}) {
    return {
      decision: 'NO_TRADE',
      confidence: confidence,
      consensusReached: false,
      reasoning: reason,
      keyFactors: ['Market conditions unfavorable', 'AI consensus not reached'],
      riskLevel: 'HIGH',
      ...additionalData
    };
  }

  /**
   * Create error result
   */
  createErrorResult(error) {
    return {
      decision: 'NO_TRADE',
      confidence: 0,
      consensusReached: false,
      reasoning: `Analysis error: ${error.message}`,
      keyFactors: ['Technical analysis failed'],
      riskLevel: 'HIGH',
      error: true
    };
  }

  /**
   * Store analysis for tracking and learning
   */
  storeAnalysis(analysisData) {
    this.analysisHistory.push(analysisData);
    
    // Keep only last 100 analyses in memory
    if (this.analysisHistory.length > 100) {
      this.analysisHistory = this.analysisHistory.slice(-100);
    }
  }

  /**
   * Get consensus statistics
   */
  getConsensusStats() {
    const total = this.consensusStats.total;
    return {
      ...this.consensusStats,
      agreementRate: total > 0 ? (this.consensusStats.agreements / total * 100).toFixed(1) : 0,
      disagreementRate: total > 0 ? (this.consensusStats.disagreements / total * 100).toFixed(1) : 0
    };
  }

  /**
   * Get recent analysis history
   */
  getRecentAnalyses(limit = 10) {
    return this.analysisHistory.slice(-limit);
  }
}

module.exports = { DualAIAnalyzer };
