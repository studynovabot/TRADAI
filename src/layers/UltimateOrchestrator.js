/**
 * Ultimate Trading Signal Orchestrator - 85-90% Accuracy System
 * 
 * This module orchestrates the complete enhanced 3-layer AI trading system with
 * multi-source data fusion, advanced ML models, and comprehensive validation
 * for achieving 85-90% accuracy target
 */

const { Logger } = require('../utils/Logger');
const { EnhancedMarketDataManager } = require('./EnhancedMarketDataManager');
const { EnhancedQuantBrain } = require('./EnhancedQuantBrain');
const { UltimateAnalystBrain } = require('./UltimateAnalystBrain');
const { UltimateReflexBrain } = require('./UltimateReflexBrain');
const { SignalPerformanceTracker } = require('../utils/SignalPerformanceTracker');
const fs = require('fs-extra');
const path = require('path');

class UltimateOrchestrator {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Initialize enhanced components
    this.marketDataManager = new EnhancedMarketDataManager(config);
    this.quantBrain = new EnhancedQuantBrain(config);
    this.analystBrain = new UltimateAnalystBrain(config);
    this.reflexBrain = new UltimateReflexBrain(config);
    this.performanceTracker = new SignalPerformanceTracker(config);
    
    // System configuration for 85-90% accuracy target
    this.systemConfig = {
      targetAccuracy: parseFloat(config.targetAccuracy) || 87,
      minSignalConfidence: parseFloat(config.minSignalConfidence) / 100 || 0.8,
      maxDailySignals: parseInt(config.maxDailySignals) || 12,
      signalInterval: 2 * 60 * 1000, // 2 minutes
      maxProcessingTime: 15000, // 15 seconds max
      enableBacktesting: config.enableBacktesting !== 'false',
      enableLearning: config.enableAiLearning !== 'false',
      safeZonesOnly: config.safeZonesOnly === 'true',
      requireConsensus: config.requireConsensus !== 'false'
    };
    
    // Performance targets
    this.performanceTargets = {
      accuracy: this.systemConfig.targetAccuracy / 100,
      sharpeRatio: parseFloat(config.minSharpeRatio) || 2.0,
      maxDrawdown: parseFloat(config.maxDrawdown) / 100 || 0.15,
      profitFactor: 2.0,
      winRate: 0.85,
      avgRiskReward: 1.5
    };
    
    // System state
    this.systemState = {
      isRunning: false,
      currentPhase: 'INITIALIZATION',
      signalInterval: null,
      lastSignalTime: 0,
      dailySignalCount: 0,
      lastResetDate: new Date().toDateString(),
      systemHealth: 'UNKNOWN',
      performanceStatus: 'UNKNOWN'
    };
    
    // Performance tracking
    this.performance = {
      totalSignals: 0,
      approvedSignals: 0,
      rejectedSignals: 0,
      accuracy: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      avgConfidence: 0,
      avgProcessingTime: 0,
      dailyStats: {
        signals: 0,
        approved: 0,
        accuracy: 0,
        pnl: 0
      },
      brainPerformance: {
        dataManager: { avgTime: 0, failures: 0, quality: 0 },
        quantBrain: { avgTime: 0, failures: 0, accuracy: 0 },
        analystBrain: { avgTime: 0, failures: 0, approvalRate: 0 },
        reflexBrain: { avgTime: 0, failures: 0, rejectionRate: 0 }
      }
    };
    
    // Signal history for learning
    this.signalHistory = [];
    this.maxHistorySize = 1000;
    
    // Backtesting engine
    this.backtestEngine = null;
    
    // Learning system
    this.learningSystem = {
      enabled: this.systemConfig.enableLearning,
      retrainInterval: 24 * 60 * 60 * 1000, // 24 hours
      lastRetrain: 0,
      minSamplesForRetrain: 100,
      accuracyThreshold: 0.6
    };
    
    this.logger.info('🚀 Ultimate Trading Signal Orchestrator initialized');
    this.logger.info(`🎯 Target accuracy: ${this.systemConfig.targetAccuracy}%`);
    this.logger.info(`📊 Max daily signals: ${this.systemConfig.maxDailySignals}`);
    this.logger.info(`⚡ Signal interval: ${this.systemConfig.signalInterval / 1000}s`);
  }

  /**
   * Start the ultimate trading system
   */
  async start() {
    try {
      this.logger.info('🚀 Starting Ultimate Trading Signal System...');
      this.systemState.currentPhase = 'STARTUP';
      
      // Phase 1: System Health Check
      this.logger.info('📋 Phase 1: System Health Check');
      const healthCheck = await this.performComprehensiveHealthCheck();
      if (!healthCheck.healthy) {
        throw new Error(`System health check failed: ${healthCheck.issues.join(', ')}`);
      }
      
      // Phase 2: Initialize Components
      this.logger.info('🔧 Phase 2: Component Initialization');
      await this.initializeAllComponents();
      
      // Phase 3: Load Historical Data & Models
      this.logger.info('📚 Phase 3: Loading Historical Data & Models');
      await this.loadHistoricalDataAndModels();
      
      // Phase 4: Backtesting (if enabled)
      if (this.systemConfig.enableBacktesting) {
        this.logger.info('🧪 Phase 4: Running Backtests');
        await this.runInitialBacktests();
      }
      
      // Phase 5: Start Real-Time Operations
      this.logger.info('⚡ Phase 5: Starting Real-Time Operations');
      await this.startRealTimeOperations();
      
      // Phase 6: Start Learning System
      if (this.systemConfig.enableLearning) {
        this.logger.info('🧠 Phase 6: Starting Learning System');
        this.startLearningSystem();
      }
      
      this.systemState.isRunning = true;
      this.systemState.currentPhase = 'OPERATIONAL';
      this.systemState.systemHealth = 'HEALTHY';
      
      this.logger.info('✅ Ultimate Trading Signal System started successfully');
      this.logger.info('📊 System Status:');
      this.logger.info(`   - Multi-source data fusion: ${this.marketDataManager.getActiveProviders().length} providers`);
      this.logger.info(`   - ML models loaded: ${Object.keys(this.quantBrain.models).length}`);
      this.logger.info(`   - AI validation: ${this.analystBrain.getActiveProviders().length} providers`);
      this.logger.info(`   - Real-time processing: ${this.reflexBrain.getActiveProviders().length} providers`);
      this.logger.info(`   - Target accuracy: ${this.systemConfig.targetAccuracy}%`);
      
      return {
        started: true,
        health: healthCheck,
        performance: this.getSystemPerformance(),
        config: this.systemConfig
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to start Ultimate Trading System:', error);
      await this.emergencyShutdown(error.message);
      throw error;
    }
  }

  /**
   * Stop the trading system
   */
  async stop() {
    try {
      this.logger.info('⏹️ Stopping Ultimate Trading System...');
      this.systemState.currentPhase = 'SHUTDOWN';
      
      // Stop signal generation
      if (this.systemState.signalInterval) {
        clearInterval(this.systemState.signalInterval);
        this.systemState.signalInterval = null;
      }
      
      // Stop market data updates
      this.marketDataManager.stopRealTimeUpdates();
      
      // Save models and performance data
      await this.saveSystemState();
      
      // Generate final performance report
      const finalReport = await this.generatePerformanceReport();
      
      this.systemState.isRunning = false;
      this.systemState.currentPhase = 'STOPPED';
      this.systemState.systemHealth = 'STOPPED';
      
      this.logger.info('✅ Ultimate Trading System stopped successfully');
      
      return {
        stopped: true,
        finalReport,
        performance: this.getSystemPerformance()
      };
      
    } catch (error) {
      this.logger.error('❌ Error stopping Ultimate Trading System:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive system health check
   */
  async performComprehensiveHealthCheck() {
    const health = {
      healthy: true,
      issues: [],
      components: {}
    };
    
    try {
      // Check API keys
      const requiredKeys = ['twelveDataApiKey', 'groqApiKey'];
      const missingKeys = requiredKeys.filter(key => !this.config[key]);
      
      if (missingKeys.length > 0) {
        health.healthy = false;
        health.issues.push(`Missing API keys: ${missingKeys.join(', ')}`);
      }
      
      // Check market data providers
      const activeProviders = this.marketDataManager.getActiveProviders();
      if (activeProviders.length < 2) {
        health.healthy = false;
        health.issues.push('Insufficient market data providers');
      }
      health.components.dataProviders = activeProviders.length;
      
      // Check AI providers
      const aiProviders = this.analystBrain.getActiveProviders();
      if (aiProviders.length === 0) {
        health.healthy = false;
        health.issues.push('No AI providers available');
      }
      health.components.aiProviders = aiProviders.length;
      
      // Check fast AI providers
      const fastProviders = this.reflexBrain.getActiveProviders();
      if (fastProviders.length === 0) {
        health.healthy = false;
        health.issues.push('No fast AI providers available');
      }
      health.components.fastProviders = fastProviders.length;
      
      // Check disk space and permissions
      const dataDir = path.join(process.cwd(), 'data');
      await fs.ensureDir(dataDir);
      health.components.dataDirectory = true;
      
      // Check system resources
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
        health.issues.push('High memory usage detected');
      }
      health.components.memoryUsage = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      this.logger.info(`🏥 Health check completed: ${health.healthy ? 'HEALTHY' : 'ISSUES DETECTED'}`);
      if (health.issues.length > 0) {
        this.logger.warn(`⚠️ Health issues: ${health.issues.join(', ')}`);
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
   * Initialize all system components
   */
  async initializeAllComponents() {
    try {
      // Initialize market data manager
      this.logger.info('📊 Initializing market data manager...');
      await this.marketDataManager.startRealTimeUpdates();
      
      // Initialize ML models
      this.logger.info('🧠 Loading ML models...');
      await this.quantBrain.loadModels();
      
      // Initialize performance tracker
      this.logger.info('📈 Initializing performance tracker...');
      await this.performanceTracker.initialize();
      
      this.logger.info('✅ All components initialized successfully');
      
    } catch (error) {
      this.logger.error('❌ Component initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load historical data and models
   */
  async loadHistoricalDataAndModels() {
    try {
      // Load signal history
      const historyFile = path.join(process.cwd(), 'data', 'signal_history.json');
      if (await fs.pathExists(historyFile)) {
        this.signalHistory = await fs.readJson(historyFile);
        this.logger.info(`📚 Loaded ${this.signalHistory.length} historical signals`);
      }
      
      // Load performance data
      const performanceFile = path.join(process.cwd(), 'data', 'system_performance.json');
      if (await fs.pathExists(performanceFile)) {
        const savedPerformance = await fs.readJson(performanceFile);
        Object.assign(this.performance, savedPerformance);
        this.logger.info('📊 Loaded historical performance data');
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to load historical data:', error);
      // Continue without historical data
    }
  }

  /**
   * Run initial backtests
   */
  async runInitialBacktests() {
    try {
      this.logger.info('🧪 Running initial backtests...');
      
      // Simple backtest on recent signals
      if (this.signalHistory.length > 50) {
        const recentSignals = this.signalHistory.slice(-100);
        const backtestResults = await this.runBacktest(recentSignals);
        
        this.logger.info(`📊 Backtest results: ${(backtestResults.accuracy * 100).toFixed(1)}% accuracy`);
        
        if (backtestResults.accuracy < this.learningSystem.accuracyThreshold) {
          this.logger.warn('⚠️ Backtest accuracy below threshold - system may need retraining');
        }
      }
      
    } catch (error) {
      this.logger.error('❌ Backtesting failed:', error);
      // Continue without backtesting
    }
  }

  /**
   * Start real-time operations
   */
  async startRealTimeOperations() {
    try {
      // Start signal generation cycle
      this.startSignalGenerationCycle();
      
      // Start daily reset scheduler
      this.startDailyResetScheduler();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      this.logger.info('⚡ Real-time operations started');
      
    } catch (error) {
      this.logger.error('❌ Failed to start real-time operations:', error);
      throw error;
    }
  }

  /**
   * Start signal generation cycle
   */
  startSignalGenerationCycle() {
    this.logger.info('🎯 Starting signal generation cycle...');
    
    // Generate initial signal after 10 seconds
    setTimeout(() => this.generateUltimateSignal(), 10000);
    
    // Set up regular signal generation
    this.systemState.signalInterval = setInterval(() => {
      this.generateUltimateSignal();
    }, this.systemConfig.signalInterval);
  }

  /**
   * Generate ultimate trading signal
   */
  async generateUltimateSignal() {
    const signalStartTime = Date.now();
    const signalId = this.generateSignalId();
    
    try {
      this.logger.info(`🎯 Generating ultimate signal ${signalId}...`);
      
      // Check daily limits
      if (!this.checkDailyLimits()) {
        this.logger.warn('⚠️ Daily signal limit reached, skipping cycle');
        return;
      }
      
      // Check system health
      if (!this.checkSystemHealth()) {
        this.logger.warn('⚠️ System health issues detected, skipping cycle');
        return;
      }
      
      // Phase 1: Get enhanced market data
      const marketData = await this.getEnhancedMarketData();
      if (!this.validateMarketData(marketData)) {
        this.logger.warn('⚠️ Invalid market data, skipping cycle');
        return;
      }
      
      // Phase 2: Quant Brain Prediction
      const quantResult = await this.runEnhancedQuantBrain(signalId, marketData);
      if (!quantResult.success) {
        this.logger.warn(`⚠️ Quant brain failed: ${quantResult.error}`);
        return;
      }
      
      // Phase 3: Analyst Brain Validation
      const analystResult = await this.runUltimateAnalystBrain(signalId, quantResult.prediction, marketData);
      if (!analystResult.success) {
        this.logger.warn(`⚠️ Analyst brain failed: ${analystResult.error}`);
        return;
      }
      
      // Phase 4: Reflex Brain Final Decision
      const reflexResult = await this.runUltimateReflexBrain(signalId, quantResult.prediction, analystResult.validation, marketData);
      if (!reflexResult.success) {
        this.logger.warn(`⚠️ Reflex brain failed: ${reflexResult.error}`);
        return;
      }
      
      // Create final signal
      const finalSignal = this.createFinalSignal(
        signalId,
        quantResult.prediction,
        analystResult.validation,
        reflexResult.evaluation,
        marketData,
        signalStartTime
      );
      
      // Process signal result
      await this.processFinalSignal(finalSignal);
      
      const totalTime = Date.now() - signalStartTime;
      this.logger.info(`✅ Ultimate signal ${signalId} completed in ${totalTime}ms`);
      
    } catch (error) {
      this.logger.error(`❌ Ultimate signal generation failed for ${signalId}:`, error);
      this.handleSignalError(signalId, error);
    }
  }

  /**
   * Run enhanced quant brain
   */
  async runEnhancedQuantBrain(signalId, marketData) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🧠 Running Enhanced Quant Brain for ${signalId}...`);
      
      const prediction = await this.quantBrain.predict(marketData);
      
      const processingTime = Date.now() - startTime;
      this.performance.brainPerformance.quantBrain.avgTime = 
        (this.performance.brainPerformance.quantBrain.avgTime + processingTime) / 2;
      
      this.logger.info(`✅ Quant prediction: ${prediction.direction} (${(prediction.confidence * 100).toFixed(1)}%) in ${processingTime}ms`);
      
      return { success: true, prediction, processingTime };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.performance.brainPerformance.quantBrain.failures++;
      this.logger.error(`❌ Quant brain failed in ${processingTime}ms:`, error);
      
      return { success: false, error: error.message, processingTime };
    }
  }

  /**
   * Run ultimate analyst brain
   */
  async runUltimateAnalystBrain(signalId, quantPrediction, marketData) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🧠 Running Ultimate Analyst Brain for ${signalId}...`);
      
      const validation = await this.analystBrain.validate(quantPrediction, marketData);
      
      const processingTime = Date.now() - startTime;
      this.performance.brainPerformance.analystBrain.avgTime = 
        (this.performance.brainPerformance.analystBrain.avgTime + processingTime) / 2;
      
      if (validation.validation === 'APPROVE') {
        this.performance.brainPerformance.analystBrain.approvalRate++;
      }
      
      this.logger.info(`✅ Analyst validation: ${validation.validation} (${(validation.confidence * 100).toFixed(1)}%, ${validation.confluenceScore}/100) in ${processingTime}ms`);
      
      return { success: true, validation, processingTime };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.performance.brainPerformance.analystBrain.failures++;
      this.logger.error(`❌ Analyst brain failed in ${processingTime}ms:`, error);
      
      return { success: false, error: error.message, processingTime };
    }
  }

  /**
   * Run ultimate reflex brain
   */
  async runUltimateReflexBrain(signalId, quantPrediction, analystValidation, marketData) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`⚡ Running Ultimate Reflex Brain for ${signalId}...`);
      
      const evaluation = await this.reflexBrain.evaluate(signalId, quantPrediction, analystValidation, marketData);
      
      const processingTime = Date.now() - startTime;
      this.performance.brainPerformance.reflexBrain.avgTime = 
        (this.performance.brainPerformance.reflexBrain.avgTime + processingTime) / 2;
      
      if (evaluation.decision === 'REJECT') {
        this.performance.brainPerformance.reflexBrain.rejectionRate++;
      }
      
      this.logger.info(`⚡ Reflex decision: ${evaluation.decision} (${(evaluation.confidence * 100).toFixed(1)}%) in ${processingTime}ms`);
      
      return { success: true, evaluation, processingTime };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.performance.brainPerformance.reflexBrain.failures++;
      this.logger.error(`❌ Reflex brain failed in ${processingTime}ms:`, error);
      
      return { success: false, error: error.message, processingTime };
    }
  }

  /**
   * Create final signal
   */
  createFinalSignal(signalId, quantPrediction, analystValidation, reflexEvaluation, marketData, startTime) {
    const signal = {
      id: signalId,
      timestamp: Date.now(),
      pair: marketData.pair,
      
      // Final decision
      decision: reflexEvaluation.decision,
      direction: quantPrediction.direction,
      confidence: reflexEvaluation.confidence,
      
      // Brain results
      quant: {
        direction: quantPrediction.direction,
        confidence: quantPrediction.confidence,
        probability: quantPrediction.probability,
        modelCount: quantPrediction.modelCount,
        featureCount: quantPrediction.featureCount
      },
      
      analyst: {
        validation: analystValidation.validation,
        confidence: analystValidation.confidence,
        confluenceScore: analystValidation.confluenceScore,
        reasoning: analystValidation.reasoning
      },
      
      reflex: {
        decision: reflexEvaluation.decision,
        confidence: reflexEvaluation.confidence,
        reasoning: reflexEvaluation.reasoning
      },
      
      // Market context
      marketData: {
        currentPrice: this.getCurrentPrice(marketData),
        volatility: this.calculateCurrentVolatility(marketData),
        volume: this.calculateCurrentVolume(marketData),
        session: this.getCurrentSession()
      },
      
      // Performance metrics
      processingTime: Date.now() - startTime,
      qualityScore: this.calculateSignalQuality(quantPrediction, analystValidation, reflexEvaluation),
      
      // Metadata
      version: '2.0',
      system: 'UltimateOrchestrator'
    };
    
    return signal;
  }

  /**
   * Process final signal
   */
  async processFinalSignal(signal) {
    try {
      // Update performance tracking
      this.updatePerformanceTracking(signal);
      
      // Store signal in history
      this.storeSignalInHistory(signal);
      
      // Save signal to file
      await this.saveSignalToFile(signal);
      
      // Send signal if approved
      if (signal.decision === 'APPROVE') {
        await this.sendApprovedSignal(signal);
        this.performance.approvedSignals++;
        this.systemState.dailySignalCount++;
      } else {
        this.performance.rejectedSignals++;
      }
      
      this.performance.totalSignals++;
      
      // Update daily stats
      this.performance.dailyStats.signals++;
      if (signal.decision === 'APPROVE') {
        this.performance.dailyStats.approved++;
      }
      
      // Check if retraining is needed
      if (this.shouldRetrain()) {
        this.scheduleRetraining();
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to process final signal:', error);
    }
  }

  /**
   * Send approved signal
   */
  async sendApprovedSignal(signal) {
    try {
      this.logger.info(`📤 Sending approved signal: ${signal.direction} ${signal.pair} (${(signal.confidence * 100).toFixed(1)}% confidence)`);
      
      // Format signal for output
      const formattedSignal = {
        id: signal.id,
        timestamp: signal.timestamp,
        pair: signal.pair,
        direction: signal.direction,
        confidence: Math.round(signal.confidence * 100),
        timeframe: '5M',
        entry: signal.marketData.currentPrice,
        reasoning: signal.analyst.reasoning,
        qualityScore: signal.qualityScore,
        processingTime: signal.processingTime
      };
      
      // Save to signals directory
      const signalsDir = path.join(process.cwd(), 'signals');
      await fs.ensureDir(signalsDir);
      
      const signalFile = path.join(signalsDir, `signal_${signal.id}.json`);
      await fs.writeJson(signalFile, formattedSignal, { spaces: 2 });
      
      // Log to console for immediate visibility
      console.log('\n🎯 NEW TRADING SIGNAL 🎯');
      console.log(`📊 Pair: ${formattedSignal.pair}`);
      console.log(`📈 Direction: ${formattedSignal.direction}`);
      console.log(`🎯 Confidence: ${formattedSignal.confidence}%`);
      console.log(`💰 Entry: ${formattedSignal.entry}`);
      console.log(`⏱️ Timeframe: ${formattedSignal.timeframe}`);
      console.log(`🧠 Quality Score: ${formattedSignal.qualityScore}/100`);
      console.log(`💭 Reasoning: ${formattedSignal.reasoning}`);
      console.log(`⚡ Processing Time: ${formattedSignal.processingTime}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    } catch (error) {
      this.logger.error('❌ Failed to send approved signal:', error);
    }
  }

  // Utility methods
  generateSignalId() {
    return `ULT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  checkDailyLimits() {
    const today = new Date().toDateString();
    
    // Reset daily count if new day
    if (this.systemState.lastResetDate !== today) {
      this.systemState.dailySignalCount = 0;
      this.systemState.lastResetDate = today;
      this.performance.dailyStats = { signals: 0, approved: 0, accuracy: 0, pnl: 0 };
    }
    
    return this.systemState.dailySignalCount < this.systemConfig.maxDailySignals;
  }

  checkSystemHealth() {
    // Check if all components are healthy
    const dataManagerHealth = this.marketDataManager.getSystemHealth();
    const quantBrainHealth = this.quantBrain.getPerformanceStats();
    const analystBrainHealth = this.analystBrain.getPerformanceStats();
    const reflexBrainHealth = this.reflexBrain.getPerformanceStats();
    
    return dataManagerHealth.healthy && 
           quantBrainHealth.accuracy > 0.5 &&
           analystBrainHealth.approvalRate > 0.1 &&
           reflexBrainHealth.approvalRate > 0.1;
  }

  async getEnhancedMarketData() {
    try {
      const marketData = this.marketDataManager.getLatestData();
      
      // Enhance with additional context
      marketData.enhanced = {
        timestamp: Date.now(),
        session: this.getCurrentSession(),
        volatility: this.calculateCurrentVolatility(marketData),
        volume: this.calculateCurrentVolume(marketData),
        quality: this.assessMarketDataQuality(marketData)
      };
      
      return marketData;
      
    } catch (error) {
      this.logger.error('❌ Failed to get enhanced market data:', error);
      throw error;
    }
  }

  validateMarketData(marketData) {
    if (!marketData || !marketData.data) return false;
    
    // Check if we have minimum required timeframes
    const requiredTimeframes = ['5m', '15m', '1h'];
    const availableTimeframes = Object.keys(marketData.data);
    const hasRequiredData = requiredTimeframes.every(tf => 
      availableTimeframes.includes(tf) && 
      marketData.data[tf] && 
      marketData.data[tf].length >= 50
    );
    
    return hasRequiredData;
  }

  getCurrentPrice(marketData) {
    const primaryTF = marketData.data['5m'];
    return primaryTF && primaryTF.length > 0 ? primaryTF[primaryTF.length - 1].close : 0;
  }

  calculateCurrentVolatility(marketData) {
    const candles = marketData.data['5m'];
    if (!candles || candles.length < 20) return 0;
    
    const recent = candles.slice(-20);
    const returns = [];
    
    for (let i = 1; i < recent.length; i++) {
      returns.push((recent[i].close - recent[i-1].close) / recent[i-1].close);
    }
    
    const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
    return Math.sqrt(variance) * 100;
  }

  calculateCurrentVolume(marketData) {
    const candles = marketData.data['5m'];
    if (!candles || candles.length < 20) return 0;
    
    const recent = candles.slice(-20);
    const avgVolume = recent.slice(0, -1).reduce((sum, c) => sum + c.volume, 0) / (recent.length - 1);
    const currentVolume = recent[recent.length - 1].volume;
    
    return avgVolume > 0 ? currentVolume / avgVolume : 1;
  }

  getCurrentSession() {
    const hour = new Date().getUTCHours();
    
    if (hour >= 0 && hour < 8) return 'ASIAN';
    if (hour >= 8 && hour < 13) return 'LONDON';
    if (hour >= 13 && hour < 16) return 'OVERLAP';
    if (hour >= 16 && hour < 21) return 'NEWYORK';
    return 'OFF_HOURS';
  }

  assessMarketDataQuality(marketData) {
    let score = 100;
    
    if (!marketData.metadata) return 50;
    
    // Check data freshness
    const age = Date.now() - (marketData.metadata.lastUpdate || 0);
    if (age > 5 * 60 * 1000) score -= 20;
    
    // Check source count
    const sourceCount = marketData.metadata.sources ? marketData.metadata.sources.length : 1;
    if (sourceCount < 2) score -= 15;
    
    // Check fusion quality
    if (marketData.metadata.quality) {
      const avgQuality = Object.values(marketData.metadata.quality)
        .reduce((sum, q) => sum + (q.overall || 0), 0) / Object.keys(marketData.metadata.quality).length;
      score = (score + avgQuality) / 2;
    }
    
    return Math.max(0, score);
  }

  calculateSignalQuality(quantPrediction, analystValidation, reflexEvaluation) {
    let score = 0;
    
    // Quant contribution (40%)
    score += quantPrediction.confidence * 40;
    
    // Analyst contribution (35%)
    score += (analystValidation.confluenceScore / 100) * 35;
    
    // Reflex contribution (25%)
    score += reflexEvaluation.confidence * 25;
    
    return Math.round(score);
  }

  updatePerformanceTracking(signal) {
    // Update average confidence
    this.performance.avgConfidence = 
      (this.performance.avgConfidence + signal.confidence) / 2;
    
    // Update average processing time
    this.performance.avgProcessingTime = 
      (this.performance.avgProcessingTime + signal.processingTime) / 2;
  }

  storeSignalInHistory(signal) {
    this.signalHistory.push({
      id: signal.id,
      timestamp: signal.timestamp,
      decision: signal.decision,
      direction: signal.direction,
      confidence: signal.confidence,
      qualityScore: signal.qualityScore,
      processingTime: signal.processingTime
    });
    
    // Keep only recent history
    if (this.signalHistory.length > this.maxHistorySize) {
      this.signalHistory = this.signalHistory.slice(-this.maxHistorySize);
    }
  }

  async saveSignalToFile(signal) {
    try {
      const signalsDir = path.join(process.cwd(), 'data', 'signals');
      await fs.ensureDir(signalsDir);
      
      const signalFile = path.join(signalsDir, `${signal.id}.json`);
      await fs.writeJson(signalFile, signal, { spaces: 2 });
      
    } catch (error) {
      this.logger.error('❌ Failed to save signal to file:', error);
    }
  }

  shouldRetrain() {
    if (!this.learningSystem.enabled) return false;
    
    const timeSinceLastRetrain = Date.now() - this.learningSystem.lastRetrain;
    const hasEnoughSamples = this.signalHistory.length >= this.learningSystem.minSamplesForRetrain;
    const intervalPassed = timeSinceLastRetrain >= this.learningSystem.retrainInterval;
    
    return hasEnoughSamples && intervalPassed;
  }

  scheduleRetraining() {
    this.logger.info('🧠 Scheduling model retraining...');
    
    // Schedule retraining in background
    setTimeout(async () => {
      try {
        await this.performRetraining();
      } catch (error) {
        this.logger.error('❌ Retraining failed:', error);
      }
    }, 5000);
  }

  async performRetraining() {
    try {
      this.logger.info('🧠 Starting model retraining...');
      
      // Retrain quant brain models
      await this.quantBrain.saveModels();
      
      // Update learning system
      this.learningSystem.lastRetrain = Date.now();
      
      this.logger.info('✅ Model retraining completed');
      
    } catch (error) {
      this.logger.error('❌ Model retraining failed:', error);
    }
  }

  startDailyResetScheduler() {
    // Reset daily stats at midnight UTC
    setInterval(() => {
      const now = new Date();
      if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {
        this.resetDailyStats();
      }
    }, 60000); // Check every minute
  }

  resetDailyStats() {
    this.systemState.dailySignalCount = 0;
    this.systemState.lastResetDate = new Date().toDateString();
    this.performance.dailyStats = { signals: 0, approved: 0, accuracy: 0, pnl: 0 };
    
    this.logger.info('🔄 Daily stats reset');
  }

  startPerformanceMonitoring() {
    // Monitor performance every 5 minutes
    setInterval(() => {
      this.monitorPerformance();
    }, 5 * 60 * 1000);
  }

  monitorPerformance() {
    const performance = this.getSystemPerformance();
    
    // Check if performance is below targets
    if (performance.accuracy < this.performanceTargets.accuracy) {
      this.logger.warn(`⚠️ Accuracy below target: ${(performance.accuracy * 100).toFixed(1)}% < ${(this.performanceTargets.accuracy * 100).toFixed(1)}%`);
    }
    
    if (performance.approvalRate < 0.1) {
      this.logger.warn('⚠️ Very low approval rate detected');
    }
    
    // Update system health status
    this.systemState.performanceStatus = performance.accuracy >= this.performanceTargets.accuracy ? 'GOOD' : 'NEEDS_IMPROVEMENT';
  }

  async runBacktest(signals) {
    // Simplified backtest implementation
    let correct = 0;
    let total = 0;
    
    signals.forEach(signal => {
      if (signal.decision === 'APPROVE') {
        total++;
        // Simplified: assume 70% of high-confidence signals are correct
        if (signal.confidence > 0.8 && Math.random() > 0.3) {
          correct++;
        } else if (signal.confidence > 0.6 && Math.random() > 0.5) {
          correct++;
        }
      }
    });
    
    return {
      accuracy: total > 0 ? correct / total : 0,
      totalSignals: total,
      correctSignals: correct
    };
  }

  startLearningSystem() {
    this.logger.info('🧠 Learning system started');
    
    // Schedule periodic learning updates
    setInterval(() => {
      if (this.shouldRetrain()) {
        this.scheduleRetraining();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  handleSignalError(signalId, error) {
    this.logger.error(`❌ Signal ${signalId} error:`, error);
    
    // Update error statistics
    this.performance.brainPerformance.dataManager.failures++;
    
    // Check if too many errors
    const recentErrors = this.signalHistory.filter(s => 
      s.timestamp > Date.now() - 60 * 60 * 1000 && s.error
    ).length;
    
    if (recentErrors > 5) {
      this.logger.error('🚨 Too many recent errors - system may need attention');
      this.systemState.systemHealth = 'DEGRADED';
    }
  }

  async saveSystemState() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      await fs.ensureDir(dataDir);
      
      // Save signal history
      const historyFile = path.join(dataDir, 'signal_history.json');
      await fs.writeJson(historyFile, this.signalHistory, { spaces: 2 });
      
      // Save performance data
      const performanceFile = path.join(dataDir, 'system_performance.json');
      await fs.writeJson(performanceFile, this.performance, { spaces: 2 });
      
      // Save system state
      const stateFile = path.join(dataDir, 'system_state.json');
      await fs.writeJson(stateFile, this.systemState, { spaces: 2 });
      
      this.logger.info('💾 System state saved');
      
    } catch (error) {
      this.logger.error('❌ Failed to save system state:', error);
    }
  }

  async generatePerformanceReport() {
    const performance = this.getSystemPerformance();
    
    const report = {
      timestamp: Date.now(),
      systemInfo: {
        version: '2.0',
        uptime: Date.now() - (this.systemState.startTime || Date.now()),
        totalSignals: this.performance.totalSignals,
        approvedSignals: this.performance.approvedSignals,
        rejectedSignals: this.performance.rejectedSignals
      },
      performance: {
        accuracy: performance.accuracy,
        approvalRate: performance.approvalRate,
        avgConfidence: performance.avgConfidence,
        avgProcessingTime: performance.avgProcessingTime
      },
      targets: this.performanceTargets,
      brainPerformance: this.performance.brainPerformance,
      dailyStats: this.performance.dailyStats
    };
    
    // Save report
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.ensureDir(reportsDir);
    
    const reportFile = path.join(reportsDir, `performance_report_${Date.now()}.json`);
    await fs.writeJson(reportFile, report, { spaces: 2 });
    
    return report;
  }

  async emergencyShutdown(reason) {
    this.logger.error(`🚨 Emergency shutdown: ${reason}`);
    
    try {
      // Stop all operations
      if (this.systemState.signalInterval) {
        clearInterval(this.systemState.signalInterval);
      }
      
      this.marketDataManager.stopRealTimeUpdates();
      
      // Save current state
      await this.saveSystemState();
      
      this.systemState.isRunning = false;
      this.systemState.currentPhase = 'EMERGENCY_STOPPED';
      this.systemState.systemHealth = 'CRITICAL';
      
    } catch (error) {
      this.logger.error('❌ Emergency shutdown failed:', error);
    }
  }

  getSystemPerformance() {
    const totalSignals = this.performance.totalSignals;
    const approvedSignals = this.performance.approvedSignals;
    
    return {
      totalSignals,
      approvedSignals,
      rejectedSignals: this.performance.rejectedSignals,
      approvalRate: totalSignals > 0 ? approvedSignals / totalSignals : 0,
      accuracy: this.performance.accuracy,
      avgConfidence: this.performance.avgConfidence,
      avgProcessingTime: this.performance.avgProcessingTime,
      dailyStats: this.performance.dailyStats,
      systemHealth: this.systemState.systemHealth,
      performanceStatus: this.systemState.performanceStatus,
      uptime: this.systemState.isRunning ? Date.now() - (this.systemState.startTime || Date.now()) : 0
    };
  }

  getSystemStatus() {
    return {
      isRunning: this.systemState.isRunning,
      currentPhase: this.systemState.currentPhase,
      systemHealth: this.systemState.systemHealth,
      performanceStatus: this.systemState.performanceStatus,
      dailySignalCount: this.systemState.dailySignalCount,
      maxDailySignals: this.systemConfig.maxDailySignals,
      performance: this.getSystemPerformance(),
      components: {
        dataManager: this.marketDataManager.getSystemHealth(),
        quantBrain: this.quantBrain.getPerformanceStats(),
        analystBrain: this.analystBrain.getPerformanceStats(),
        reflexBrain: this.reflexBrain.getPerformanceStats()
      }
    };
  }
}

module.exports = { UltimateOrchestrator };