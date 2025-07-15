/**
 * Three-Brain Orchestrator - Main Coordination Layer
 * 
 * This module orchestrates the complete 3-layer AI trading system with real-time
 * Twelve Data API integration. It manages the data flow between layers and 
 * handles the complete signal lifecycle every 2 minutes.
 */

const { Logger } = require('../utils/Logger');
const { MarketDataManager } = require('./MarketDataManager');
const { QuantBrain } = require('./QuantBrain');
const { AnalystBrain } = require('./AnalystBrain');
const { ReflexBrain } = require('./ReflexBrain');
const { TradeLogger } = require('./TradeLogger');
const fs = require('fs-extra');
const path = require('path');

class ThreeBrainOrchestrator {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Initialize all components
    this.marketDataManager = new MarketDataManager(config);
    this.quantBrain = new QuantBrain(config);
    this.analystBrain = new AnalystBrain(config);
    this.reflexBrain = new ReflexBrain(config);
    this.tradeLogger = new TradeLogger(config);
    
    // Orchestrator configuration
    this.orchestratorConfig = {
      signalInterval: 2 * 60 * 1000, // 2 minutes signal generation
      maxProcessingTime: 10000, // 10 seconds max total processing time
      enableParallelProcessing: false, // Sequential processing for reliability
      signalOnlyMode: true, // Signal generation only - no auto trading
      saveAllSignals: true,
      enablePerformanceTracking: true,
      maxSignalsPerDay: 200, // Increased for signal-only mode
      signalCooldown: 30000, // 30 seconds cooldown between signals
      enableManualTradeLogging: true
    };
    
    // System state
    this.systemState = {
      isRunning: false,
      signalOnlyMode: true,
      signalInterval: null,
      lastSignalTime: 0,
      currentSignalId: null,
      systemHealth: 'UNKNOWN'
    };
    
    // Performance tracking
    this.performance = {
      totalSignals: 0,
      executedTrades: 0,
      successfulTrades: 0,
      averageProcessingTime: 0,
      signalsToday: 0,
      lastResetDate: new Date().toDateString(),
      brainPerformance: {
        quant: { avgTime: 0, failures: 0, predictions: 0 },
        analyst: { avgTime: 0, failures: 0, validations: 0 },
        reflex: { avgTime: 0, failures: 0, decisions: 0 },
        dataManager: { avgTime: 0, failures: 0, updates: 0 }
      }
    };
    
    // Signal history
    this.signalHistory = [];
    this.maxHistorySize = 100;
    
    this.logger.info('🧠🧠🧠 ThreeBrainOrchestrator initialized');
  }

  /**
   * Start the complete trading system
   */
  async start() {
    try {
      this.logger.info('🚀 Starting ThreeBrainOrchestrator...');
      
      // Health check all components
      const healthCheck = await this.performSystemHealthCheck();
      if (!healthCheck.healthy) {
        throw new Error(`System health check failed: ${healthCheck.issues.join(', ')}`);
      }
      
      // Load models and initialize components
      await this.initializeComponents();
      
      // Start market data updates (every 2 minutes)
      this.marketDataManager.startRealTimeUpdates();
      
      // Start signal generation cycle
      this.startSignalGeneration();
      
      // Start daily reset scheduler
      this.startDailyReset();
      
      this.systemState.isRunning = true;
      this.systemState.systemHealth = 'HEALTHY';
      
      this.logger.info('✅ ThreeBrainOrchestrator started successfully in SIGNAL-ONLY mode');
      this.logger.info('📊 Market data updates: Every 2 minutes');
      this.logger.info('🎯 Signal generation: Every 2 minutes for 5-minute binary options');
      this.logger.info('📝 Manual trade logging enabled for AI training');
      
      return { 
        started: true, 
        health: healthCheck,
        config: this.orchestratorConfig
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to start ThreeBrainOrchestrator:', error);
      await this.emergencyShutdown(error.message);
      throw error;
    }
  }

  /**
   * Stop the trading system
   */
  async stop() {
    try {
      this.logger.info('⏹️ Stopping ThreeBrainOrchestrator...');
      
      // Stop signal generation
      if (this.systemState.signalInterval) {
        clearInterval(this.systemState.signalInterval);
        this.systemState.signalInterval = null;
      }
      
      // Stop market data updates
      this.marketDataManager.stopRealTimeUpdates();
      
      // Stop daily reset
      if (this.dailyResetInterval) {
        clearInterval(this.dailyResetInterval);
      }
      
      // Save final performance report
      await this.savePerformanceReport();
      
      this.systemState.isRunning = false;
      this.systemState.systemHealth = 'STOPPED';
      
      this.logger.info('✅ ThreeBrainOrchestrator stopped successfully');
      
      return { stopped: true, finalStats: this.getSystemStats() };
      
    } catch (error) {
      this.logger.error('❌ Error stopping ThreeBrainOrchestrator:', error);
      throw error;
    }
  }

  /**
   * Initialize all components
   */
  async initializeComponents() {
    this.logger.info('🔧 Initializing system components...');
    
    // Load Quant Brain models
    await this.quantBrain.loadModels();
    
    // Initialize market data (load mock data if API not available)
    if (!this.config.twelveDataApiKey) {
      this.logger.warn('⚠️ No Twelve Data API key found, loading mock data');
      this.marketDataManager.loadMockData();
    }
    
    this.logger.info('✅ All components initialized');
  }

  /**
   * Start signal generation cycle
   */
  startSignalGeneration() {
    this.logger.info('🎯 Starting signal generation cycle...');
    
    // Generate initial signal
    setTimeout(() => this.generateSignalCycle(), 5000); // 5 second delay for initial data
    
    // Set up regular signal generation every 2 minutes
    this.systemState.signalInterval = setInterval(() => {
      this.generateSignalCycle();
    }, this.orchestratorConfig.signalInterval);
  }

  /**
   * Generate signal cycle - main orchestration logic
   */
  async generateSignalCycle() {
    const cycleStartTime = Date.now();
    
    try {
      // Check if we should skip this cycle
      if (this.shouldSkipCycle()) {
        return;
      }
      
      // Check daily limits
      if (!this.checkDailyLimits()) {
        this.logger.warn('⚠️ Daily signal limit reached, skipping cycle');
        return;
      }
      
      // Generate unique signal ID
      const signalId = this.generateSignalId();
      this.systemState.currentSignalId = signalId;
      
      this.logger.info(`🎯 Starting signal cycle ${signalId}`);
      
      // Get latest market data
      const marketData = await this.getMarketDataForAnalysis();
      if (!marketData || !this.validateMarketData(marketData)) {
        this.logger.warn('⚠️ Invalid or insufficient market data, skipping cycle');
        return;
      }
      
      // Process signal through all three brains
      const signalResult = await this.processSignal(signalId, marketData);
      
      // Handle signal result
      await this.handleSignalResult(signalResult);
      
      // Update performance metrics
      this.updatePerformanceMetrics(signalResult, cycleStartTime);
      
      // Save signal for analysis
      if (this.orchestratorConfig.saveAllSignals) {
        await this.saveSignalResult(signalResult);
      }
      
      const cycleTime = Date.now() - cycleStartTime;
      this.logger.info(`✅ Signal cycle ${signalId} completed in ${cycleTime}ms`);
      
    } catch (error) {
      this.logger.error('❌ Signal cycle failed:', error);
      this.performance.brainPerformance.dataManager.failures++;
      
      // Emergency stop if too many failures
      if (this.getRecentFailureCount() > 5) {
        await this.emergencyShutdown('Too many consecutive signal failures');
      }
    }
  }

  /**
   * Get market data for analysis
   */
  async getMarketDataForAnalysis() {
    const dataStartTime = Date.now();
    
    try {
      // Check if market data is fresh
      if (!this.marketDataManager.isDataFresh()) {
        this.logger.warn('⚠️ Market data is not fresh, forcing update...');
        await this.marketDataManager.fetchAllTimeframes();
      }
      
      // Get latest market data
      const marketData = this.marketDataManager.getLatestData();
      
      // Check data quality
      if (!marketData.data || Object.keys(marketData.data).length === 0) {
        throw new Error('No market data available');
      }
      
      const dataTime = Date.now() - dataStartTime;
      this.performance.brainPerformance.dataManager.avgTime = 
        (this.performance.brainPerformance.dataManager.avgTime + dataTime) / 2;
      
      return marketData;
      
    } catch (error) {
      this.performance.brainPerformance.dataManager.failures++;
      this.logger.error('❌ Failed to get market data:', error);
      throw error;
    }
  }

  /**
   * Process signal through all three brains
   */
  async processSignal(signalId, marketData) {
    const signalTracker = {
      signalId,
      startTime: Date.now(),
      marketData,
      stages: {
        quant: { completed: false },
        analyst: { completed: false },
        reflex: { completed: false }
      }
    };
    
    try {
      this.logger.info(`🧠 Processing signal ${signalId} through three brains...`);
      
      // Stage 1: Quant Brain - ML Prediction
      const quantResult = await this.runQuantBrain(marketData, signalTracker);
      if (!quantResult.success) {
        return this.createFailedSignalResult(signalId, 'QUANT_FAILED', quantResult.error, signalTracker);
      }
      
      // Stage 2: Analyst Brain - LLM Validation
      const analystResult = await this.runAnalystBrain(quantResult.prediction, marketData, signalTracker);
      if (!analystResult.success) {
        return this.createFailedSignalResult(signalId, 'ANALYST_FAILED', analystResult.error, signalTracker);
      }
      
      // Stage 3: Reflex Brain - Signal Quality Evaluation
      const reflexResult = await this.runReflexBrain(signalId, quantResult.prediction, analystResult.validation, marketData, signalTracker);
      if (!reflexResult.success) {
        return this.createFailedSignalResult(signalId, 'REFLEX_FAILED', reflexResult.error, signalTracker);
      }
      
      // Create final signal result
      const finalResult = this.createSuccessfulSignalResult(
        signalId, 
        quantResult.prediction, 
        analystResult.validation, 
        reflexResult.evaluation, 
        signalTracker
      );
      
      return finalResult;
      
    } catch (error) {
      this.logger.error(`❌ Fatal error processing signal ${signalId}:`, error);
      return this.createFailedSignalResult(signalId, 'FATAL_ERROR', error.message, signalTracker);
    }
  }

  /**
   * Run Quant Brain (Stage 1)
   */
  async runQuantBrain(marketData, signalTracker) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🧠 Stage 1: Running Quant Brain...`);
      
      const prediction = await this.quantBrain.predict(marketData);
      
      const processingTime = Date.now() - startTime;
      signalTracker.stages.quant = {
        completed: true,
        processingTime,
        result: prediction
      };
      
      this.performance.brainPerformance.quant.predictions++;
      this.performance.brainPerformance.quant.avgTime = 
        (this.performance.brainPerformance.quant.avgTime + processingTime) / 2;
      
      this.logger.info(`✅ Quant Brain: ${prediction.direction} (${(prediction.confidence * 100).toFixed(1)}%) in ${processingTime}ms`);
      
      return { success: true, prediction, processingTime };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      signalTracker.stages.quant = {
        completed: false,
        processingTime,
        error: error.message
      };
      
      this.performance.brainPerformance.quant.failures++;
      this.logger.error(`❌ Quant Brain failed in ${processingTime}ms:`, error);
      
      return { success: false, error: error.message, processingTime };
    }
  }

  /**
   * Run Analyst Brain (Stage 2)
   */
  async runAnalystBrain(quantPrediction, marketData, signalTracker) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🧠 Stage 2: Running Analyst Brain...`);
      
      const validation = await this.analystBrain.validate(quantPrediction, marketData);
      
      const processingTime = Date.now() - startTime;
      signalTracker.stages.analyst = {
        completed: true,
        processingTime,
        result: validation
      };
      
      this.performance.brainPerformance.analyst.validations++;
      this.performance.brainPerformance.analyst.avgTime = 
        (this.performance.brainPerformance.analyst.avgTime + processingTime) / 2;
      
      this.logger.info(`✅ Analyst Brain: ${validation.validation} (${(validation.confidence * 100).toFixed(1)}%, ${validation.confluenceScore}/100) in ${processingTime}ms`);
      
      return { success: true, validation, processingTime };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      signalTracker.stages.analyst = {
        completed: false,
        processingTime,
        error: error.message
      };
      
      this.performance.brainPerformance.analyst.failures++;
      this.logger.error(`❌ Analyst Brain failed in ${processingTime}ms:`, error);
      
      return { success: false, error: error.message, processingTime };
    }
  }

  /**
   * Run Reflex Brain (Stage 3)
   */
  async runReflexBrain(signalId, quantPrediction, analystValidation, marketData, signalTracker) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`⚡ Stage 3: Running Reflex Brain...`);
      
      const evaluation = await this.reflexBrain.evaluateSignal(signalId, quantPrediction, analystValidation, marketData);
      
      const processingTime = Date.now() - startTime;
      signalTracker.stages.reflex = {
        completed: true,
        processingTime,
        result: evaluation
      };
      
      this.performance.brainPerformance.reflex.decisions++;
      this.performance.brainPerformance.reflex.avgTime = 
        (this.performance.brainPerformance.reflex.avgTime + processingTime) / 2;
      
      this.logger.info(`✅ Reflex Brain: ${evaluation.signalQuality} (Score: ${evaluation.tradeScore}/100, ${(evaluation.confidence * 100).toFixed(1)}%) in ${processingTime}ms`);
      
      return { success: true, evaluation, processingTime };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      signalTracker.stages.reflex = {
        completed: false,
        processingTime,
        error: error.message
      };
      
      this.performance.brainPerformance.reflex.failures++;
      this.logger.error(`❌ Reflex Brain failed in ${processingTime}ms:`, error);
      
      return { success: false, error: error.message, processingTime };
    }
  }

  /**
   * Handle signal result (display signal for manual trading)
   */
  async handleSignalResult(signalResult) {
    try {
      // Display signal for manual trading decision
      await this.displaySignalForManualTrading(signalResult);
      
      // Add to signal history
      this.addToSignalHistory(signalResult);
      
    } catch (error) {
      this.logger.error('❌ Failed to handle signal result:', error);
    }
  }

  /**
   * Display signal for manual trading decision
   */
  async displaySignalForManualTrading(signalResult) {
    try {
      // Debug logging
      this.logger.debug('🔍 Signal result structure:', JSON.stringify(signalResult, null, 2));
      
      const quality = signalResult.signalQuality;
      const score = signalResult.tradeScore;
      const recommendation = signalResult.tradeRecommendation;
      
      if (!recommendation) {
        this.logger.error('❌ Trade recommendation is undefined in signal result');
        console.log('\n🎯 SIGNAL GENERATED BUT INCOMPLETE');
        console.log('═════════════════════════════════════════════');
        console.log(`📊 Signal ID: ${signalResult.signalId}`);
        console.log(`🌟 Quality: ${quality} (Score: ${score}/100)`);
        console.log(`💪 Confidence: ${(signalResult.confidence * 100).toFixed(1)}%`);
        console.log('❌ Trade recommendation missing - signal incomplete');
        return;
      }
      
      // Display signal with quality and recommendation
      console.log('\n🎯 NEW TRADING SIGNAL GENERATED');
      console.log('═════════════════════════════════════════════');
      console.log(`📊 Signal ID: ${signalResult.signalId}`);
      console.log(`📈 Asset: ${recommendation.asset}`);
      console.log(`⬆️ Direction: ${recommendation.direction}`);
      console.log(`🌟 Quality: ${quality} (Score: ${score}/100)`);
      console.log(`💪 Confidence: ${(signalResult.confidence * 100).toFixed(1)}%`);
      console.log(`💰 Recommended Amount: $${recommendation.recommendedAmount}`);
      console.log(`⏰ Signal Time: ${new Date(recommendation.signalTime).toLocaleTimeString()}`);
      console.log(`⏳ Expiry: ${new Date(recommendation.recommendedExpiry).toLocaleTimeString()}`);
      console.log(`🎯 Recommendation: ${recommendation.shouldTrade}`);
      
      // Display AI analysis
      console.log('\n🧠 AI ANALYSIS:');
      console.log(`   • ML Confidence: ${(recommendation.quantConfidence * 100).toFixed(1)}%`);
      console.log(`   • LLM Confidence: ${(recommendation.analystConfidence * 100).toFixed(1)}%`);
      console.log(`   • Technical Confluence: ${recommendation.confluenceScore}/100`);
      console.log(`   • Risk Score: ${(recommendation.riskScore * 100).toFixed(1)}%`);
      
      // Display reasoning
      console.log('\n💡 REASONING:');
      console.log(`   ${signalResult.reasoning}`);
      
      // Display technical analysis
      if (recommendation.technicalReason) {
        console.log('\n📊 TECHNICAL ANALYSIS:');
        console.log(`   ${recommendation.technicalReason}`);
      }
      
      // Display signal strengths
      if (recommendation.signalStrengths && recommendation.signalStrengths.length > 0) {
        console.log('\n✅ SIGNAL STRENGTHS:');
        recommendation.signalStrengths.forEach((strength, i) => {
          console.log(`   ${i + 1}. ${strength}`);
        });
      }
      
      // Display risk factors
      if (recommendation.riskFactors && recommendation.riskFactors.length > 0) {
        console.log('\n⚠️  RISK FACTORS:');
        recommendation.riskFactors.forEach((risk, i) => {
          console.log(`   ${i + 1}. ${risk}`);
        });
      }
      
      console.log('\n📝 MANUAL TRADING DECISION REQUIRED');
      console.log('═════════════════════════════════════════════');
      
      // Update counters
      this.performance.signalsToday++;
      this.systemState.lastSignalTime = Date.now();
      
      // Save signal for manual review
      await this.saveSignalForManualReview(signalResult);
      
    } catch (error) {
      this.logger.error('❌ Failed to display signal:', error);
      throw error;
    }
  }

  /**
   * Save signal for manual review
   */
  async saveSignalForManualReview(signalResult) {
    try {
      const signalFile = path.join(process.cwd(), 'data', 'signals', 'manual_review_signals.json');
      await fs.ensureDir(path.dirname(signalFile));
      
      let existingSignals = [];
      if (await fs.pathExists(signalFile)) {
        existingSignals = await fs.readJson(signalFile);
      }
      
      existingSignals.push({
        signalId: signalResult.signalId,
        timestamp: signalResult.timestamp,
        signalQuality: signalResult.signalQuality,
        tradeScore: signalResult.tradeScore,
        tradeRecommendation: signalResult.tradeRecommendation,
        reasoning: signalResult.reasoning,
        needsManualDecision: true,
        status: 'PENDING_MANUAL_REVIEW'
      });
      
      // Keep only last 200 signals
      if (existingSignals.length > 200) {
        existingSignals = existingSignals.slice(-200);
      }
      
      await fs.writeJson(signalFile, existingSignals);
      
      this.logger.info(`💾 Signal saved for manual review: ${signalResult.signalId}`);
      
    } catch (error) {
      this.logger.error('❌ Failed to save signal for manual review:', error);
    }
  }

  /**
   * Validate market data quality
   */
  validateMarketData(marketData) {
    if (!marketData || !marketData.data) return false;
    
    // Check required timeframes
    const requiredTimeframes = ['1m', '5m', '15m'];
    for (const tf of requiredTimeframes) {
      const data = marketData.data[tf];
      if (!data || !Array.isArray(data) || data.length < 20) {
        this.logger.warn(`⚠️ Insufficient data for ${tf}: ${data ? data.length : 0} candles`);
        return false;
      }
    }
    
    // Check data freshness
    if (!this.marketDataManager.isDataFresh(5)) {
      this.logger.warn('⚠️ Market data is stale');
      return false;
    }
    
    return true;
  }

  /**
   * Create successful signal result
   */
  createSuccessfulSignalResult(signalId, quantPrediction, analystValidation, reflexEvaluation, signalTracker) {
    const totalProcessingTime = Date.now() - signalTracker.startTime;
    
    return {
      signalId,
      success: true,
      signalQuality: reflexEvaluation.signalQuality,
      tradeScore: reflexEvaluation.tradeScore,
      reasoning: reflexEvaluation.reasoning,
      confidence: reflexEvaluation.confidence,
      
      // Individual brain outputs
      quantBrain: {
        direction: quantPrediction.direction,
        confidence: quantPrediction.confidence,
        riskScore: quantPrediction.riskScore,
        uncertainty: quantPrediction.uncertainty,
        processingTime: quantPrediction.processingTime
      },
      
      analystBrain: {
        validation: analystValidation.validation,
        confidence: analystValidation.confidence,
        confluenceScore: analystValidation.confluenceScore,
        reasoning: analystValidation.reasoning,
        processingTime: analystValidation.processingTime
      },
      
      reflexBrain: {
        signalQuality: reflexEvaluation.signalQuality,
        tradeScore: reflexEvaluation.tradeScore,
        confidence: reflexEvaluation.confidence,
        reasoning: reflexEvaluation.reasoning,
        riskAssessment: reflexEvaluation.riskAssessment,
        processingTime: reflexEvaluation.processingTime
      },
      
      // Trade recommendation for manual trading
      tradeRecommendation: reflexEvaluation.tradeRecommendation,
      
      // System metadata
      metadata: {
        totalProcessingTime,
        stages: signalTracker.stages,
        marketDataAge: Date.now() - signalTracker.marketData.timestamp,
        currencyPair: this.config.currencyPair,
        systemHealth: this.systemState.systemHealth,
        mode: 'SIGNAL_ONLY'
      },
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create failed signal result
   */
  createFailedSignalResult(signalId, failureType, errorMessage, signalTracker) {
    const totalProcessingTime = Date.now() - signalTracker.startTime;
    
    return {
      signalId,
      success: false,
      execute: false,
      reasoning: `Signal processing failed: ${failureType} - ${errorMessage}`,
      confidence: 0,
      
      failureDetails: {
        type: failureType,
        message: errorMessage,
        stages: signalTracker.stages
      },
      
      metadata: {
        totalProcessingTime,
        currencyPair: this.config.currencyPair,
        systemHealth: this.systemState.systemHealth
      },
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Perform system health check
   */
  async performSystemHealthCheck() {
    const health = {
      healthy: true,
      issues: [],
      components: {
        marketData: 'UNKNOWN',
        quantBrain: 'UNKNOWN',
        analystBrain: 'UNKNOWN',
        reflexBrain: 'UNKNOWN',
        config: 'UNKNOWN'
      }
    };
    
    try {
      // Check market data manager
      const marketHealth = this.marketDataManager.getHealthStatus();
      health.components.marketData = marketHealth.isHealthy ? 'HEALTHY' : 'DEGRADED';
      if (!marketHealth.isHealthy) {
        health.issues.push('Market data manager unhealthy');
        health.healthy = false;
      }
      
      // Check API keys
      if (!this.config.twelveDataApiKey) {
        health.issues.push('Twelve Data API key missing');
        health.components.config = 'WARNING';
      }
      
      if (!this.config.groqApiKey && !this.config.togetherApiKey) {
        health.issues.push('No AI provider API keys available');
        health.components.analystBrain = 'FAILED';
        health.components.reflexBrain = 'FAILED';
        health.healthy = false;
      } else {
        health.components.analystBrain = 'HEALTHY';
        health.components.reflexBrain = 'HEALTHY';
      }
      
      // Check Quant Brain
      health.components.quantBrain = 'HEALTHY'; // Quant brain uses simulated models
      
      // Overall config check
      if (health.components.config !== 'WARNING') {
        health.components.config = 'HEALTHY';
      }
      
      return health;
      
    } catch (error) {
      this.logger.error('❌ Health check failed:', error);
      health.healthy = false;
      health.issues.push(`Health check error: ${error.message}`);
      return health;
    }
  }

  /**
   * Check if we should skip this signal cycle
   */
  shouldSkipCycle() {
    // Check cooldown period
    const timeSinceLastSignal = Date.now() - this.systemState.lastSignalTime;
    if (timeSinceLastSignal < this.orchestratorConfig.signalCooldown) {
      return true;
    }
    
    // Check if system is unhealthy
    if (this.systemState.systemHealth === 'DEGRADED' || this.systemState.systemHealth === 'FAILED') {
      this.logger.warn('⚠️ Skipping cycle due to system health issues');
      return true;
    }
    
    // Check if market is closed (basic check)
    const currentHour = new Date().getUTCHours();
    if (currentHour < 6 || currentHour > 22) {
      this.logger.debug('💤 Skipping cycle - outside major trading hours');
      return true;
    }
    
    return false;
  }

  /**
   * Check daily limits
   */
  checkDailyLimits() {
    // Reset counters if new day
    const today = new Date().toDateString();
    if (today !== this.performance.lastResetDate) {
      this.resetDailyCounters();
    }
    
    return this.performance.signalsToday < this.orchestratorConfig.maxSignalsPerDay;
  }

  /**
   * Reset daily counters
   */
  resetDailyCounters() {
    const today = new Date().toDateString();
    this.logger.info('🔄 Resetting daily counters for new trading day');
    
    this.performance.signalsToday = 0;
    this.performance.lastResetDate = today;
    
    // Reset brain sessions
    this.reflexBrain.resetSession();
    this.marketDataManager.resetDailyCounters();
  }

  /**
   * Start daily reset scheduler
   */
  startDailyReset() {
    // Schedule daily reset at midnight UTC
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(now.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyCounters();
      
      // Set up daily interval
      this.dailyResetInterval = setInterval(() => {
        this.resetDailyCounters();
      }, 24 * 60 * 60 * 1000);
      
    }, timeUntilMidnight);
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(signalResult, cycleStartTime) {
    this.performance.totalSignals++;
    
    if (signalResult.execute) {
      this.performance.executedTrades++;
    }
    
    const cycleTime = Date.now() - cycleStartTime;
    this.performance.averageProcessingTime = 
      (this.performance.averageProcessingTime * (this.performance.totalSignals - 1) + cycleTime) / this.performance.totalSignals;
  }

  /**
   * Add signal to history
   */
  addToSignalHistory(signalResult) {
    this.signalHistory.unshift(signalResult);
    
    // Keep only recent history
    if (this.signalHistory.length > this.maxHistorySize) {
      this.signalHistory = this.signalHistory.slice(0, this.maxHistorySize);
    }
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
   * Get system statistics
   */
  getSystemStats() {
    const manualSuccessRate = this.performance.totalTrades > 0 ? 
      this.performance.successfulTrades / this.performance.totalTrades : 0;
    
    return {
      system: {
        isRunning: this.systemState.isRunning,
        mode: 'SIGNAL_ONLY',
        health: this.systemState.systemHealth,
        uptime: Date.now() - (this.systemState.sessionStart || Date.now()),
        currentSignal: this.systemState.currentSignalId
      },
      performance: {
        ...this.performance,
        manualSuccessRate,
        signalGeneration: {
          totalSignals: this.performance.totalSignals,
          signalsToday: this.performance.signalsToday,
          averageProcessingTime: this.performance.averageProcessingTime
        },
        manualTrades: {
          totalTrades: this.performance.totalTrades,
          successfulTrades: this.performance.successfulTrades,
          successRate: manualSuccessRate,
          totalProfit: this.performance.totalProfit,
          totalLoss: this.performance.totalLoss,
          netPnL: this.performance.totalProfit - this.performance.totalLoss
        }
      },
      marketData: this.marketDataManager.getHealthStatus(),
      reflexBrain: this.reflexBrain.getSessionStats(),
      recentSignals: this.signalHistory.slice(0, 10)
    };
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(reason) {
    this.logger.error(`🚨 EMERGENCY SHUTDOWN: ${reason}`);
    
    this.systemState.systemHealth = 'EMERGENCY_STOP';
    
    // Stop all operations
    if (this.systemState.signalInterval) {
      clearInterval(this.systemState.signalInterval);
      this.systemState.signalInterval = null;
    }
    
    this.marketDataManager.stopRealTimeUpdates();
    this.reflexBrain.emergencyStop(reason);
    
    // Save emergency report
    await this.saveEmergencyReport(reason);
    
    this.systemState.isRunning = false;
    
    return {
      shutdown: true,
      reason,
      timestamp: new Date().toISOString(),
      finalStats: this.getSystemStats()
    };
  }

  /**
   * Save signal result for analysis
   */
  async saveSignalResult(signalResult) {
    try {
      const signalFile = path.join(process.cwd(), 'data', 'signals', 'orchestrator_signals.json');
      await fs.ensureDir(path.dirname(signalFile));
      
      let existingData = [];
      if (await fs.pathExists(signalFile)) {
        existingData = await fs.readJson(signalFile);
      }
      
      existingData.push(signalResult);
      
      // Keep only last 1000 signals
      if (existingData.length > 1000) {
        existingData = existingData.slice(-1000);
      }
      
      await fs.writeJson(signalFile, existingData);
      
    } catch (error) {
      this.logger.error('❌ Failed to save signal result:', error);
    }
  }

  /**
   * Save trade for execution (demo/manual mode)
   */
  async saveTradeForExecution(signalResult) {
    try {
      const tradeFile = path.join(process.cwd(), 'data', 'trades', 'pending_trades.json');
      await fs.ensureDir(path.dirname(tradeFile));
      
      let existingTrades = [];
      if (await fs.pathExists(tradeFile)) {
        existingTrades = await fs.readJson(tradeFile);
      }
      
      existingTrades.push({
        signalId: signalResult.signalId,
        tradeDetails: signalResult.tradeDetails,
        signalSummary: {
          direction: signalResult.quantBrain.direction,
          confidence: signalResult.quantBrain.confidence,
          confluenceScore: signalResult.analystBrain.confluenceScore,
          reasoning: signalResult.reasoning
        },
        timestamp: signalResult.timestamp
      });
      
      await fs.writeJson(tradeFile, existingTrades);
      
      this.logger.info('💾 Trade saved for execution');
      
    } catch (error) {
      this.logger.error('❌ Failed to save trade for execution:', error);
    }
  }

  /**
   * Schedule trade result check (for demo tracking)
   */
  scheduleTradeResultCheck(signalResult) {
    if (!signalResult.tradeDetails) return;
    
    const expiryTime = new Date(signalResult.tradeDetails.expiryTime).getTime();
    const checkDelay = expiryTime - Date.now() + 30000; // 30 seconds after expiry
    
    if (checkDelay > 0) {
      setTimeout(async () => {
        await this.checkTradeResult(signalResult);
      }, checkDelay);
    }
  }

  /**
   * Check trade result (placeholder for actual result tracking)
   */
  async checkTradeResult(signalResult) {
    try {
      // In a real implementation, this would check with the broker API
      // For now, we'll simulate or require manual input
      
      this.logger.info(`⏰ Trade ${signalResult.signalId} expired - Result tracking needed`);
      
      // Save for manual result entry
      const resultFile = path.join(process.cwd(), 'data', 'trades', 'result_tracking.json');
      await fs.ensureDir(path.dirname(resultFile));
      
      let existingResults = [];
      if (await fs.pathExists(resultFile)) {
        existingResults = await fs.readJson(resultFile);
      }
      
      existingResults.push({
        signalId: signalResult.signalId,
        tradeDetails: signalResult.tradeDetails,
        expiryTime: signalResult.tradeDetails.expiryTime,
        needsResult: true,
        timestamp: new Date().toISOString()
      });
      
      await fs.writeJson(resultFile, existingResults);
      
    } catch (error) {
      this.logger.error('❌ Failed to track trade result:', error);
    }
  }

  /**
   * Save performance report
   */
  async savePerformanceReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        systemStats: this.getSystemStats(),
        configuration: this.orchestratorConfig,
        recentSignals: this.signalHistory.slice(0, 20)
      };
      
      const reportFile = path.join(process.cwd(), 'data', 'reports', `performance_${Date.now()}.json`);
      await fs.ensureDir(path.dirname(reportFile));
      await fs.writeJson(reportFile, report);
      
      this.logger.info('📊 Performance report saved');
      
    } catch (error) {
      this.logger.error('❌ Failed to save performance report:', error);
    }
  }

  /**
   * Save emergency report
   */
  async saveEmergencyReport(reason) {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        reason,
        systemStats: this.getSystemStats(),
        recentSignals: this.signalHistory.slice(0, 10),
        recentErrors: this.getRecentErrors()
      };
      
      const reportFile = path.join(process.cwd(), 'data', 'reports', `emergency_${Date.now()}.json`);
      await fs.ensureDir(path.dirname(reportFile));
      await fs.writeJson(reportFile, report);
      
      this.logger.error('🚨 Emergency report saved');
      
    } catch (error) {
      this.logger.error('❌ Failed to save emergency report:', error);
    }
  }

  getRecentFailureCount() {
    return this.signalHistory.slice(0, 10).filter(s => !s.success).length;
  }

  getRecentErrors() {
    return this.signalHistory
      .slice(0, 20)
      .filter(s => !s.success)
      .map(s => ({
        signalId: s.signalId,
        error: s.failureDetails,
        timestamp: s.timestamp
      }));
  }

  categorizeRejectionReason(reasoning) {
    if (reasoning.includes('confidence')) return 'LOW_CONFIDENCE';
    if (reasoning.includes('risk')) return 'HIGH_RISK';
    if (reasoning.includes('confluence')) return 'LOW_CONFLUENCE';
    if (reasoning.includes('volume')) return 'VOLUME_ISSUES';
    if (reasoning.includes('limit')) return 'LIMITS_REACHED';
    return 'OTHER';
  }

  logRejectionReason(reason) {
    // Simple rejection reason tracking
    if (!this.rejectionStats) this.rejectionStats = {};
    this.rejectionStats[reason] = (this.rejectionStats[reason] || 0) + 1;
  }

  /**
   * Log manual trade result for AI training
   */
  async logManualTradeResult(signalId, tradeOutcome) {
    try {
      // Find the original signal
      const signalFile = path.join(process.cwd(), 'data', 'signals', 'manual_review_signals.json');
      
      if (!await fs.pathExists(signalFile)) {
        throw new Error('No signals found for manual review');
      }
      
      const signals = await fs.readJson(signalFile);
      const originalSignal = signals.find(s => s.signalId === signalId);
      
      if (!originalSignal) {
        throw new Error(`Signal ${signalId} not found`);
      }
      
      // Create complete signal data for logging
      const signalData = {
        signalQuality: originalSignal.signalQuality,
        tradeScore: originalSignal.tradeScore,
        reasoning: originalSignal.reasoning,
        confidence: originalSignal.confidence || 0.5,
        tradeRecommendation: originalSignal.tradeRecommendation
      };
      
      // Log the trade result
      const logResult = await this.tradeLogger.logTradeResult(signalId, signalData, tradeOutcome);
      
      // Update performance tracking
      if (tradeOutcome.executed) {
        this.performance.totalTrades++;
        
        if (tradeOutcome.won) {
          this.performance.successfulTrades++;
          this.performance.totalProfit += tradeOutcome.pnl;
        } else {
          this.performance.losingTrades++;
          this.performance.totalLoss += Math.abs(tradeOutcome.pnl);
        }
        
        // Update success rate
        this.performance.successRate = this.performance.totalTrades > 0 ? 
          this.performance.successfulTrades / this.performance.totalTrades : 0;
      }
      
      this.logger.info(`📊 Manual trade result logged: ${signalId} - ${tradeOutcome.won ? 'WIN' : 'LOSS'} (PnL: ${tradeOutcome.pnl})`);
      
      return logResult;
      
    } catch (error) {
      this.logger.error('❌ Failed to log manual trade result:', error);
      throw error;
    }
  }

  /**
   * Update trade result (legacy method for compatibility)
   */
  updateTradeResult(signalId, won, pnl) {
    // Convert to new format and log
    const tradeOutcome = {
      executed: true,
      won,
      pnl,
      actualAmount: this.config.tradeAmount || 10,
      executionTime: new Date().toISOString(),
      expiryTime: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };
    
    return this.logManualTradeResult(signalId, tradeOutcome);
  }

  /**
   * Enable/disable auto-trading
   */
  setAutoTrading(enabled) {
    this.systemState.isAutoTrading = enabled;
    this.orchestratorConfig.enableAutoTrading = enabled;
    
    this.logger.info(`🔄 Auto-trading ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get trade statistics
   */
  getTradeStatistics() {
    return this.tradeLogger.getStatistics();
  }

  /**
   * Get successful patterns for AI training
   */
  async getSuccessfulPatterns(limit = 50) {
    return await this.tradeLogger.getSuccessfulPatterns(limit);
  }

  /**
   * Get pending signals for manual review
   */
  async getPendingSignals() {
    try {
      const signalFile = path.join(process.cwd(), 'data', 'signals', 'manual_review_signals.json');
      
      if (!await fs.pathExists(signalFile)) {
        return [];
      }
      
      const signals = await fs.readJson(signalFile);
      return signals.filter(s => s.status === 'PENDING_MANUAL_REVIEW');
      
    } catch (error) {
      this.logger.error('❌ Failed to get pending signals:', error);
      return [];
    }
  }

  /**
   * Change currency pair
   */
  changeCurrencyPair(newPair) {
    const oldPair = this.config.currencyPair;
    this.config.currencyPair = newPair;
    
    // Update market data manager
    this.marketDataManager.changeCurrencyPair(newPair);
    
    this.logger.info(`🔄 Currency pair changed from ${oldPair} to ${newPair}`);
  }
}

module.exports = { ThreeBrainOrchestrator };