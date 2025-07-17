/**
 * Enhanced Three-Brain Orchestrator - Main Coordination Layer
 * 
 * This module orchestrates the complete 3-layer AI trading system with real-time
 * Twelve Data API integration. It manages the data flow between layers and 
 * handles the complete signal lifecycle every 2 minutes.
 */

const { Logger } = require('../utils/Logger');
const { MarketDataManager } = require('./MarketDataManager');
const { EnhancedQuantBrain } = require('./EnhancedQuantBrain');
const { EnhancedAnalystBrain } = require('./EnhancedAnalystBrain');
const { EnhancedReflexBrain } = require('./EnhancedReflexBrain');
const { TradeLogger } = require('./TradeLogger');
const { config } = require('../config/TradingConfig');
const fs = require('fs-extra');
const path = require('path');

class EnhancedOrchestrator {
  constructor(customConfig = null) {
    this.config = customConfig || config;
    this.logger = Logger.getInstanceSync();
    
    // Initialize all components
    this.marketDataManager = new MarketDataManager(this.config);
    this.quantBrain = new EnhancedQuantBrain(this.config);
    this.analystBrain = new EnhancedAnalystBrain(this.config);
    this.reflexBrain = new EnhancedReflexBrain(this.config);
    this.tradeLogger = new TradeLogger(this.config);
    
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
    
    this.logger.info('🧠🧠🧠 EnhancedOrchestrator initialized');
  }

  /**
   * Start the complete trading system
   */
  async start() {
    try {
      this.logger.info('🚀 Starting EnhancedOrchestrator...');
      
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
      
      this.logger.info('✅ EnhancedOrchestrator started successfully in SIGNAL-ONLY mode');
      this.logger.info('📊 Market data updates: Every 2 minutes');
      this.logger.info('🎯 Signal generation: Every 2 minutes for 5-minute binary options');
      this.logger.info('📝 Manual trade logging enabled for AI training');
      
      return { 
        started: true, 
        health: healthCheck,
        config: this.orchestratorConfig
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to start EnhancedOrchestrator:', error);
      await this.emergencyShutdown(error.message);
      throw error;
    }
  }

  /**
   * Stop the trading system
   */
  async stop() {
    try {
      this.logger.info('⏹️ Stopping EnhancedOrchestrator...');
      
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
      
      this.logger.info('✅ EnhancedOrchestrator stopped successfully');
      
      return { stopped: true, finalStats: this.getSystemStats() };
      
    } catch (error) {
      this.logger.error('❌ Error stopping EnhancedOrchestrator:', error);
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
      await this.loadMockData();
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
      this.logger.info(`🧠 Stage 3: Running Reflex Brain...`);
      
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
      
      this.logger.info(`✅ Reflex Brain: ${evaluation.signalQuality} (${(evaluation.confidence * 100).toFixed(1)}%, Score: ${evaluation.tradeScore}/100) in ${processingTime}ms`);
      
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
   * Create successful signal result
   */
  createSuccessfulSignalResult(signalId, quantPrediction, analystValidation, reflexEvaluation, signalTracker) {
    const totalProcessingTime = Date.now() - signalTracker.startTime;
    
    return {
      signalId,
      timestamp: new Date().toISOString(),
      currencyPair: this.config.currencyPair,
      direction: quantPrediction.direction,
      confidence: reflexEvaluation.confidence,
      signalQuality: reflexEvaluation.signalQuality,
      tradeScore: reflexEvaluation.tradeScore,
      reasoning: reflexEvaluation.reasoning,
      status: 'SUCCESS',
      stages: {
        quant: {
          direction: quantPrediction.direction,
          confidence: quantPrediction.confidence,
          riskScore: quantPrediction.riskScore,
          processingTime: signalTracker.stages.quant.processingTime
        },
        analyst: {
          validation: analystValidation.validation,
          confidence: analystValidation.confidence,
          confluenceScore: analystValidation.confluenceScore,
          reasoning: analystValidation.reasoning,
          processingTime: signalTracker.stages.analyst.processingTime
        },
        reflex: {
          signalQuality: reflexEvaluation.signalQuality,
          confidence: reflexEvaluation.confidence,
          tradeScore: reflexEvaluation.tradeScore,
          reasoning: reflexEvaluation.reasoning,
          processingTime: signalTracker.stages.reflex.processingTime
        }
      },
      totalProcessingTime
    };
  }

  /**
   * Create failed signal result
   */
  createFailedSignalResult(signalId, failureStage, errorMessage, signalTracker) {
    const totalProcessingTime = Date.now() - signalTracker.startTime;
    
    return {
      signalId,
      timestamp: new Date().toISOString(),
      currencyPair: this.config.currencyPair,
      status: 'FAILED',
      failureStage,
      error: errorMessage,
      stages: signalTracker.stages,
      totalProcessingTime
    };
  }

  /**
   * Handle signal result
   */
  async handleSignalResult(signalResult) {
    try {
      // Add to signal history
      this.addToSignalHistory(signalResult);
      
      // Emit signal event for UI
      this.emitSignalEvent(signalResult);
      
      // Update last signal time
      this.systemState.lastSignalTime = Date.now();
      
      // Update signals today count
      this.performance.signalsToday++;
      this.performance.totalSignals++;
      
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to handle signal result:', error);
      return false;
    }
  }

  /**
   * Add signal to history
   */
  addToSignalHistory(signal) {
    this.signalHistory.unshift(signal);
    
    // Trim history to max size
    if (this.signalHistory.length > this.maxHistorySize) {
      this.signalHistory = this.signalHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Emit signal event for UI
   */
  emitSignalEvent(signal) {
    // In a real implementation, this would emit an event to the UI
    // For now, we'll just log it
    this.logger.info(`📢 Signal event emitted: ${signal.signalId}`);
    
    // Save to signals directory for UI to pick up
    this.saveSignalToFile(signal);
  }

  /**
   * Save signal to file
   */
  async saveSignalToFile(signal) {
    try {
      const signalsDir = path.join(process.cwd(), 'data', 'signals');
      await fs.ensureDir(signalsDir);
      
      const filePath = path.join(signalsDir, `${signal.signalId}.json`);
      await fs.writeJson(filePath, signal, { spaces: 2 });
      
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to save signal to file:', error);
      return false;
    }
  }

  /**
   * Save signal result for analysis
   */
  async saveSignalResult(signal) {
    try {
      const signalsDir = path.join(process.cwd(), 'data', 'signals');
      await fs.ensureDir(signalsDir);
      
      const filePath = path.join(signalsDir, `${signal.signalId}.json`);
      await fs.writeJson(filePath, signal, { spaces: 2 });
      
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to save signal result:', error);
      return false;
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(signalResult, cycleStartTime) {
    const cycleTime = Date.now() - cycleStartTime;
    
    // Update average processing time
    this.performance.averageProcessingTime = (
      (this.performance.averageProcessingTime * (this.performance.totalSignals - 1)) + 
      cycleTime
    ) / this.performance.totalSignals;
    
    // Update executed trades count if signal was successful and high quality
    if (
      signalResult.status === 'SUCCESS' && 
      (signalResult.signalQuality === 'EXCELLENT' || signalResult.signalQuality === 'GOOD')
    ) {
      this.performance.executedTrades++;
    }
  }

  /**
   * Check if we should skip this cycle
   */
  shouldSkipCycle() {
    // Skip if system is not running
    if (!this.systemState.isRunning) {
      return true;
    }
    
    // Skip if cooldown period hasn't elapsed
    const timeSinceLastSignal = Date.now() - this.systemState.lastSignalTime;
    if (timeSinceLastSignal < this.orchestratorConfig.signalCooldown) {
      return true;
    }
    
    return false;
  }

  /**
   * Check daily limits
   */
  checkDailyLimits() {
    // Reset counters if it's a new day
    const today = new Date().toDateString();
    if (today !== this.performance.lastResetDate) {
      this.resetDailyCounters();
    }
    
    // Check if we've reached the daily signal limit
    return this.performance.signalsToday < this.orchestratorConfig.maxSignalsPerDay;
  }

  /**
   * Reset daily counters
   */
  resetDailyCounters() {
    this.performance.signalsToday = 0;
    this.performance.lastResetDate = new Date().toDateString();
    
    // Reset reflex brain counters
    this.reflexBrain.resetDailyCounters();
    
    this.logger.info('🔄 Daily counters reset');
  }

  /**
   * Start daily reset scheduler
   */
  startDailyReset() {
    // Calculate time until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight.getTime() - now.getTime();
    
    // Schedule first reset at midnight
    setTimeout(() => {
      this.resetDailyCounters();
      
      // Then schedule daily resets
      this.dailyResetInterval = setInterval(() => {
        this.resetDailyCounters();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilMidnight);
    
    this.logger.info(`🔄 Daily reset scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);
  }

  /**
   * Generate unique signal ID
   */
  generateSignalId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `sig_${timestamp}_${random}`;
  }

  /**
   * Validate market data
   */
  validateMarketData(marketData) {
    // Check if we have data for key timeframes
    const requiredTimeframes = ['5m', '15m'];
    
    for (const tf of requiredTimeframes) {
      if (!marketData.data[tf] || marketData.data[tf].length < 20) {
        this.logger.warn(`⚠️ Insufficient data for ${tf} timeframe`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get recent failure count
   */
  getRecentFailureCount() {
    return (
      this.performance.brainPerformance.quant.failures +
      this.performance.brainPerformance.analyst.failures +
      this.performance.brainPerformance.reflex.failures +
      this.performance.brainPerformance.dataManager.failures
    );
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(reason) {
    this.logger.error(`🚨 EMERGENCY SHUTDOWN: ${reason}`);
    
    // Stop all processes
    if (this.systemState.signalInterval) {
      clearInterval(this.systemState.signalInterval);
      this.systemState.signalInterval = null;
    }
    
    if (this.dailyResetInterval) {
      clearInterval(this.dailyResetInterval);
    }
    
    this.marketDataManager.stopRealTimeUpdates();
    
    // Update system state
    this.systemState.isRunning = false;
    this.systemState.systemHealth = 'EMERGENCY_SHUTDOWN';
    
    // Save emergency report
    await this.saveEmergencyReport(reason);
    
    this.performanceMetrics.emergencyStops++;
    
    return { shutdown: true, reason };
  }

  /**
   * Save emergency report
   */
  async saveEmergencyReport(reason) {
    try {
      const reportsDir = path.join(process.cwd(), 'data', 'reports');
      await fs.ensureDir(reportsDir);
      
      const report = {
        timestamp: new Date().toISOString(),
        reason,
        systemState: { ...this.systemState },
        performance: { ...this.performance },
        lastSignals: this.signalHistory.slice(0, 5)
      };
      
      const filePath = path.join(reportsDir, `emergency_${Date.now()}.json`);
      await fs.writeJson(filePath, report, { spaces: 2 });
      
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to save emergency report:', error);
      return false;
    }
  }

  /**
   * Save performance report
   */
  async savePerformanceReport() {
    try {
      const reportsDir = path.join(process.cwd(), 'data', 'reports');
      await fs.ensureDir(reportsDir);
      
      const report = {
        timestamp: new Date().toISOString(),
        systemState: { ...this.systemState },
        performance: { ...this.performance },
        quantPerformance: this.quantBrain.getPerformanceMetrics(),
        analystPerformance: this.analystBrain.getPerformanceMetrics(),
        reflexPerformance: this.reflexBrain.getSessionStats()
      };
      
      const filePath = path.join(reportsDir, `performance_${Date.now()}.json`);
      await fs.writeJson(filePath, report, { spaces: 2 });
      
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to save performance report:', error);
      return false;
    }
  }

  /**
   * Get system stats
   */
  getSystemStats() {
    return {
      systemState: { ...this.systemState },
      performance: { ...this.performance },
      signalHistory: this.signalHistory.length,
      uptime: Date.now() - this.systemState.sessionStart
    };
  }

  /**
   * Perform system health check
   */
  async performSystemHealthCheck() {
    const issues = [];
    
    // Check config
    const configValidation = this.config.validateConfig();
    if (!configValidation.valid) {
      issues.push(...configValidation.issues);
    }
    
    // Check market data manager
    if (!this.marketDataManager) {
      issues.push('Market data manager not initialized');
    }
    
    // Check quant brain
    if (!this.quantBrain) {
      issues.push('Quant brain not initialized');
    }
    
    // Check analyst brain
    if (!this.analystBrain) {
      issues.push('Analyst brain not initialized');
    }
    
    // Check reflex brain
    if (!this.reflexBrain) {
      issues.push('Reflex brain not initialized');
    }
    
    // Check data directories
    try {
      const dataDir = path.join(process.cwd(), 'data');
      await fs.ensureDir(dataDir);
      await fs.ensureDir(path.join(dataDir, 'signals'));
      await fs.ensureDir(path.join(dataDir, 'reports'));
    } catch (error) {
      issues.push(`Data directory error: ${error.message}`);
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Load mock data for testing
   */
  async loadMockData() {
    try {
      this.logger.info('📊 Loading mock market data...');
      
      // Create mock data for different timeframes
      const mockData = {
        '1m': this.generateMockCandles(100, 1),
        '5m': this.generateMockCandles(100, 5),
        '15m': this.generateMockCandles(100, 15),
        '30m': this.generateMockCandles(100, 30),
        '1h': this.generateMockCandles(100, 60)
      };
      
      // Set mock data in market data manager
      for (const [timeframe, candles] of Object.entries(mockData)) {
        this.marketDataManager.updateMarketData(timeframe, candles);
      }
      
      // Update last update times
      for (const timeframe of Object.keys(mockData)) {
        this.marketDataManager.lastUpdate[timeframe] = Date.now();
      }
      
      this.logger.info('✅ Mock market data loaded successfully');
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to load mock data:', error);
      return false;
    }
  }

  /**
   * Generate mock candles for testing
   */
  generateMockCandles(count, minutesPerCandle) {
    const candles = [];
    let price = 1.0 + Math.random() * 0.1; // Starting price between 1.0 and 1.1
    
    const now = Date.now();
    
    for (let i = count - 1; i >= 0; i--) {
      // Calculate timestamp for this candle
      const timestamp = now - (i * minutesPerCandle * 60 * 1000);
      
      // Generate random price movement
      const movement = (Math.random() - 0.5) * 0.002; // -0.1% to +0.1%
      price += price * movement;
      
      // Generate candle
      const open = price;
      const close = price * (1 + (Math.random() - 0.5) * 0.001);
      const high = Math.max(open, close) * (1 + Math.random() * 0.001);
      const low = Math.min(open, close) * (1 - Math.random() * 0.001);
      const volume = 1000 + Math.random() * 9000;
      
      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
      
      // Update price for next candle
      price = close;
    }
    
    return candles;
  }
}

module.exports = { EnhancedOrchestrator };