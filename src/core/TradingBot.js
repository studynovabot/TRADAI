/**
 * TradingBot - Main orchestrator for AI-powered binary trading
 * 
 * This class coordinates all components:
 * - Data collection every 1 minute
 * - AI analysis every 5 minutes
 * - Trade execution when signals align
 * - Logging and monitoring
 */

const cron = require('node-cron');
const { DataCollector } = require('./DataCollector');
const { TechnicalAnalyzer } = require('./TechnicalAnalyzer');
const { AIAnalyzer } = require('./AIAnalyzer');
const { TradeExecutor } = require('./TradeExecutor');
const { SignalFormatter } = require('./SignalFormatter');
const RollingBacktestEngine = require('./RollingBacktestEngine');
const MultiTimeframeAnalyzer = require('./MultiTimeframeAnalyzer');
const PreSignalValidator = require('./PreSignalValidator');

// Enhanced TRADAI components
const { WebSocketServer } = require('./WebSocketServer');
const { DualAIAnalyzer } = require('./DualAIAnalyzer');
const { EnhancedTechnicalAnalyzer } = require('./EnhancedTechnicalAnalyzer');
const { TradeManager } = require('./TradeManager');
const { AILearningSystem } = require('./AILearningSystem');
const { RiskManagementSystem } = require('./RiskManagementSystem');

const { Logger } = require('../utils/Logger');
const { DatabaseManager } = require('../utils/DatabaseManager');
const fs = require('fs-extra');
const path = require('path');

class TradingBot {
  constructor(config) {
    this.config = config;
    this.logger = config.logger || Logger.getInstanceSync();
    this.isRunning = false;
    this.marketData = [];
    this.signalOnly = config.signalOnly || false;
    this.enhancedMode = config.enhancedMode || false; // New enhanced TRADAI mode

    // Initialize database first
    this.database = new DatabaseManager(config);

    // Initialize core components
    this.dataCollector = new DataCollector(config);

    // Choose analyzer based on mode
    if (this.enhancedMode) {
      // Enhanced TRADAI components
      this.technicalAnalyzer = new EnhancedTechnicalAnalyzer(config, this.logger);
      this.aiAnalyzer = new DualAIAnalyzer(config, this.logger);
      this.tradeManager = new TradeManager(config, this.logger, this.database);
      this.webSocketServer = new WebSocketServer(config, this.logger);
      this.aiLearningSystem = new AILearningSystem({ ...config, logger: this.logger });
      this.riskManagementSystem = new RiskManagementSystem({ ...config, logger: this.logger });

      // Enhanced signal formatting
      this.signalFormatter = new SignalFormatter(config);
      this.setupEnhancedSignalLogging();

      this.logger.info('🚀 Enhanced TRADAI mode activated with dual AI analysis');
    } else {
      // Legacy components
      this.technicalAnalyzer = new TechnicalAnalyzer(config);
      this.aiAnalyzer = new AIAnalyzer(config, this.dataCollector);

      // Initialize SignalFormatter for signal-only mode
      if (this.signalOnly) {
        this.signalFormatter = new SignalFormatter(config);
        this.signalCount = 0;
        this.setupSignalLogging();
      }
    }

    // Only initialize TradeExecutor if not in signal-only mode
    if (!this.signalOnly && !this.enhancedMode) {
      this.tradeExecutor = new TradeExecutor(config);
    }

    // Initialize Multi-Timeframe Analyzer
    this.multiTimeframeAnalyzer = new MultiTimeframeAnalyzer(config, this.dataCollector);

    // Initialize Pre-Signal Validator
    this.preSignalValidator = new PreSignalValidator(config);

    // Initialize Rolling Backtest Engine
    this.backtestEngine = new RollingBacktestEngine(
      config,
      this.dataCollector,
      this.aiAnalyzer,
      this.technicalAnalyzer
    );

    // Adaptive indicator optimization state
    this.lastOptimization = null;
    this.optimizationInterval = config.reoptimizationInterval || 24 * 60 * 60 * 1000; // 24 hours

    // Cron jobs
    this.dataCollectionJob = null;
    this.tradingDecisionJob = null;

    const mode = this.signalOnly ? 'Signal-Only' : (config.paperTrading ? 'Paper Trading' : 'Live Trading');
    this.logger.info(`🤖 TradingBot initialized in ${mode} mode`);
  }
  
  setupSignalLogging() {
    // Create signals directory if it doesn't exist
    this.signalsDir = path.join(process.cwd(), 'signals');
    fs.ensureDirSync(this.signalsDir);

    // Create daily signal log file
    const today = new Date().toISOString().split('T')[0];
    this.signalLogFile = path.join(this.signalsDir, `signals_${today}.log`);
    this.signalCsvFile = path.join(this.signalsDir, `signals_${today}.csv`);

    this.logger.info(`📁 Signal logs will be saved to: ${this.signalsDir}`);
  }

  setupEnhancedSignalLogging() {
    // Create enhanced signals directory structure
    this.signalsDir = path.join(process.cwd(), 'signals');
    this.enhancedSignalsDir = path.join(this.signalsDir, 'enhanced');
    this.tradesDir = path.join(this.signalsDir, 'trades');

    fs.ensureDirSync(this.enhancedSignalsDir);
    fs.ensureDirSync(this.tradesDir);

    // Create daily files
    const today = new Date().toISOString().split('T')[0];
    this.signalLogFile = path.join(this.enhancedSignalsDir, `enhanced_signals_${today}.log`);
    this.signalCsvFile = path.join(this.enhancedSignalsDir, `enhanced_signals_${today}.csv`);
    this.tradeLogFile = path.join(this.tradesDir, `trades_${today}.log`);
    this.tradeCsvFile = path.join(this.tradesDir, `trades_${today}.csv`);

    // Initialize CSV headers for enhanced logging
    this.initializeEnhancedCsvHeaders();

    this.logger.info(`📁 Enhanced signal logs will be saved to: ${this.enhancedSignalsDir}`);
    this.logger.info(`📁 Trade logs will be saved to: ${this.tradesDir}`);
  }

  async initializeEnhancedCsvHeaders() {
    const signalHeaders = [
      'Timestamp', 'Currency_Pair', 'Timeframe', 'Decision', 'Confidence',
      'Groq_Decision', 'Groq_Confidence', 'Together_Decision', 'Together_Confidence',
      'Consensus_Reached', 'RSI', 'MACD', 'Bollinger_Position', 'Market_Regime',
      'Patterns', 'Support_Level', 'Resistance_Level', 'Kelly_Position_Size',
      'Risk_Amount', 'Potential_Profit', 'Risk_Reward_Ratio'
    ].join(',');

    const tradeHeaders = [
      'Trade_ID', 'Timestamp', 'Currency_Pair', 'Direction', 'Entry_Price',
      'Position_Size', 'Risk_Amount', 'Stop_Loss', 'Take_Profit', 'Confidence',
      'Execution_Time', 'Status', 'Outcome', 'Actual_Profit', 'Win_Loss'
    ].join(',');

    // Write headers if files don't exist
    if (!fs.existsSync(this.signalCsvFile)) {
      await fs.writeFile(this.signalCsvFile, signalHeaders + '\n');
    }
    if (!fs.existsSync(this.tradeCsvFile)) {
      await fs.writeFile(this.tradeCsvFile, tradeHeaders + '\n');
    }
  }

  async start() {
    try {
      this.logger.info('🚀 Starting TradingBot...');

      // Initialize database
      await this.database.initialize();

      // Initialize AI Learning System for enhanced mode
      if (this.enhancedMode && this.aiLearningSystem) {
        await this.aiLearningSystem.initialize();
        this.logger.info('🧠 AI Learning System initialized');
      }

      // Initialize WebSocket server for enhanced mode
      if (this.enhancedMode && this.webSocketServer) {
        const wsStarted = await this.webSocketServer.start();
        if (wsStarted) {
          this.setupWebSocketEventHandlers();
          this.logger.info('🌐 WebSocket server started for real-time signal delivery');
        } else {
          this.logger.warn('⚠️ WebSocket server failed to start - continuing without real-time features');
        }
      }

      // Initialize trade executor (Selenium setup) - only if not signal-only mode and not enhanced mode
      if (!this.signalOnly && !this.config.paperTrading && !this.enhancedMode) {
        await this.tradeExecutor.initialize();
      }

      // Start data collection (every 1 minute)
      this.startDataCollection();

      // Start trading decisions based on mode
      if (this.enhancedMode) {
        this.startEnhancedSignalGeneration();
      } else if (this.signalOnly) {
        this.startSignalGeneration();
      } else {
        this.startTradingDecisions();
      }

      this.isRunning = true;

      // Log startup mode
      if (this.enhancedMode) {
        this.logger.info('✅ Enhanced TRADAI Bot started - dual AI analysis with real-time WebSocket delivery');
        this.logger.info('🎯 Signals will be delivered via WebSocket to Chrome extension');
        this.logger.info('🧠 Using Groq AI + Together AI consensus validation');
      } else if (this.signalOnly) {
        this.logger.info('✅ TradingBot started in Signal-Only mode - generating signals every minute');
        this.logger.info('🎯 Signals will be displayed in terminal and saved to files');
      } else {
        this.logger.info('✅ TradingBot started successfully in trading mode');
      }

      // Keep the process alive
      this.keepAlive();

    } catch (error) {
      this.logger.error('❌ Failed to start TradingBot:', error);
      throw error;
    }
  }
  
  setupWebSocketEventHandlers() {
    if (!this.webSocketServer) return;

    // Handle trade execution notifications from clients
    this.webSocketServer.on('trade-executed', (tradeData) => {
      this.logger.info(`📈 Client executed trade: ${tradeData.signalId}`);
      this.handleClientTradeExecution(tradeData);
    });

    // Handle trade skip notifications from clients
    this.webSocketServer.on('trade-skipped', (skipData) => {
      this.logger.info(`⏭️ Client skipped trade: ${skipData.signalId}`);
      this.handleClientTradeSkip(skipData);
    });
  }

  async handleClientTradeExecution(tradeData) {
    try {
      // Store trade execution for learning and analytics
      await this.database.storeTradeExecution({
        ...tradeData,
        source: 'chrome_extension',
        timestamp: new Date()
      });

      // Update performance metrics
      if (this.tradeManager) {
        // This would be called when trade outcome is known
        // For now, just log the execution
        this.logger.info(`💾 Trade execution stored: ${tradeData.signalId}`);
      }
    } catch (error) {
      this.logger.error('❌ Error handling client trade execution:', error);
    }
  }

  async handleClientTradeSkip(skipData) {
    try {
      // Store skip data for analysis
      await this.database.storeTradeSkip({
        ...skipData,
        source: 'chrome_extension',
        timestamp: new Date()
      });

      this.logger.info(`💾 Trade skip stored: ${skipData.signalId}`);
    } catch (error) {
      this.logger.error('❌ Error handling client trade skip:', error);
    }
  }

  startDataCollection() {
    // Collect data every minute at :00 seconds
    this.dataCollectionJob = cron.schedule('0 * * * * *', async () => {
      if (!this.isRunning) return;

      try {
        this.logger.info('📊 Collecting market data...');

        // Use enhanced data collection for enhanced mode or signal-only mode
        let newCandle;
        if (this.enhancedMode || this.signalOnly) {
          const candleData = await this.dataCollector.fetchSignalAnalysisData(
            this.config.currencyPair
          );
          newCandle = candleData[candleData.length - 1]; // Get latest candle

          // Update market data with all fetched candles
          this.marketData = candleData;
        } else {
          newCandle = await this.dataCollector.fetchLatestCandle(
            this.config.currencyPair
          );

          if (newCandle) {
            this.marketData.push(newCandle);

            // Keep only last 20 candles (20 minutes of data)
            if (this.marketData.length > 20) {
              this.marketData = this.marketData.slice(-20);
            }
          }
        }

        if (newCandle) {
          this.logger.info(`📈 New candle: ${newCandle.close} (${this.config.currencyPair})`);

          // Store in database
          await this.database.storeCandle(newCandle);
        }

      } catch (error) {
        this.logger.error('❌ Data collection error:', error);
      }
    });

    this.logger.info('⏰ Data collection scheduled (every 1 minute)');
  }
  
  startSignalGeneration() {
    // Generate signals every 1 minute at :30 seconds (30 seconds after data collection)
    this.tradingDecisionJob = cron.schedule('30 * * * * *', async () => {
      if (!this.isRunning) return;

      try {
        await this.generateSignal();
      } catch (error) {
        this.logger.error('❌ Signal generation error:', error);
      }
    });

    this.logger.info('⏰ Signal generation scheduled (every 1 minute at :30 seconds)');
  }

  startTradingDecisions() {
    // Make trading decisions every 5 minutes at :00 seconds
    this.tradingDecisionJob = cron.schedule('0 */5 * * * *', async () => {
      if (!this.isRunning) return;

      try {
        await this.makeTradeDecision();
      } catch (error) {
        this.logger.error('❌ Trading decision error:', error);
      }
    });

    this.logger.info('⏰ Trading decisions scheduled (every 5 minutes)');
  }

  async generateSignal() {
    // Check if adaptive indicator optimization is needed
    await this.checkAndOptimizeIndicators();

    if (this.marketData.length < 5) {
      this.logger.warn('⚠️ Insufficient market data for signal generation');
      return;
    }

    this.signalCount++;
    this.logger.info(`🎯 Generating signal #${this.signalCount}...`);

    try {
      // 1. Technical Analysis
      const technicalData = await this.technicalAnalyzer.analyze(this.marketData);

      // 2. Pre-Signal Validation
      const validationResult = await this.preSignalValidator.validateMarketConditions(
        this.marketData,
        technicalData,
        this.config.currencyPair
      );

      if (!validationResult.valid) {
        this.logger.warn(`🔍 Signal validation failed: ${validationResult.reason}`);
        this.logger.info(`📊 Validation score: ${(validationResult.score * 100).toFixed(1)}%`);
        return; // Skip signal generation
      }

      this.logger.info(`✅ Pre-signal validation passed (Score: ${(validationResult.score * 100).toFixed(1)}%)`);

      // 3. AI Analysis for Signal Generation
      const aiDecision = await this.aiAnalyzer.analyze({
        currencyPair: this.config.currencyPair,
        marketData: this.marketData.slice(-10), // Last 10 candles for better context
        technicalData: technicalData,
        validationResult: validationResult
      });

      // 3. Create comprehensive signal data
      const signalData = {
        timestamp: new Date(),
        signalNumber: this.signalCount,
        currencyPair: this.config.currencyPair,
        direction: aiDecision.decision,
        confidence: aiDecision.confidence,
        reasoning: aiDecision.reason,
        marketSuitability: aiDecision.marketSuitability,
        riskLevel: aiDecision.riskLevel,
        keyFactors: aiDecision.keyFactors,
        timeframe: aiDecision.timeframe,
        technicalSummary: this.createTechnicalSummary(technicalData),
        marketData: {
          currentPrice: this.marketData[this.marketData.length - 1].close,
          priceChange: this.calculatePriceChange(),
          volume: this.marketData[this.marketData.length - 1].volume
        }
      };

      // 4. Format and display signal
      this.signalFormatter.displaySignal(signalData);

      // 5. Log signal to files
      await this.logSignalToFile(signalData);
      await this.logSignalToCsv(signalData);

      // 6. Store in database
      await this.database.storeDecision({
        timestamp: signalData.timestamp,
        currencyPair: this.config.currencyPair,
        decision: aiDecision.decision,
        confidence: aiDecision.confidence,
        reason: aiDecision.reason,
        technicalData: technicalData,
        marketData: this.marketData.slice(-5),
        signalMode: true
      });

      this.logger.info(`✅ Signal #${this.signalCount} generated and logged`);

    } catch (error) {
      this.logger.error('❌ Error in signal generation process:', error);
    }
  }

  startEnhancedSignalGeneration() {
    // Generate enhanced signals every 2 minutes for 2-minute timeframe
    // and every 5 minutes for 5-minute timeframe
    const timeframe = this.config.timeframe || '2min';
    const interval = timeframe === '2min' ? '*/2 * * * *' : '*/5 * * * *';

    this.tradingDecisionJob = cron.schedule(interval, async () => {
      if (!this.isRunning) return;
      await this.generateEnhancedSignal();
    });

    this.logger.info(`📡 Enhanced signal generation started (${timeframe} intervals)`);
  }

  async generateEnhancedSignal() {
    if (this.marketData.length < 50) {
      this.logger.warn('⚠️ Insufficient market data for enhanced analysis');
      return;
    }

    try {
      this.logger.info('🧠 Generating enhanced AI signal...');

      // 1. Enhanced Technical Analysis
      const technicalAnalysis = await this.technicalAnalyzer.analyzeMarket(
        this.marketData,
        this.config.currencyPair,
        this.config.timeframe || '2min'
      );

      // 2. Dual AI Analysis with consensus validation
      const aiAnalysis = await this.aiAnalyzer.analyzeMarket(
        this.marketData,
        technicalAnalysis,
        this.config.currencyPair,
        this.config.timeframe || '2min'
      );

      // 3. Skip if no trade decision or low confidence
      if (aiAnalysis.decision === 'NO_TRADE' || aiAnalysis.confidence < 70) {
        this.logger.info(`⏭️ Skipping signal: ${aiAnalysis.decision} (${aiAnalysis.confidence}% confidence)`);

        // Still broadcast the no-trade decision for transparency
        if (this.webSocketServer) {
          this.webSocketServer.broadcastSignal({
            decision: 'NO_TRADE',
            confidence: aiAnalysis.confidence,
            reasoning: aiAnalysis.reasoning,
            currencyPair: this.config.currencyPair,
            timeframe: this.config.timeframe || '2min',
            technicalAnalysis: this.createTechnicalSummary(technicalAnalysis),
            aiAnalysis: {
              consensusReached: aiAnalysis.consensusReached,
              groqAnalysis: aiAnalysis.groqAnalysis,
              togetherAnalysis: aiAnalysis.togetherAnalysis
            }
          });
        }
        return;
      }

      // 4. Process signal through trade manager
      const tradeRecommendation = await this.tradeManager.processSignal(
        {
          decision: aiAnalysis.decision,
          confidence: aiAnalysis.confidence,
          currencyPair: this.config.currencyPair,
          timeframe: this.config.timeframe || '2min',
          currentPrice: this.marketData[this.marketData.length - 1].close,
          timestamp: new Date()
        },
        technicalAnalysis,
        aiAnalysis
      );

      // 5. Broadcast signal via WebSocket
      if (this.webSocketServer && tradeRecommendation.type === 'TRADE_RECOMMENDATION') {
        const signalId = this.webSocketServer.broadcastSignal({
          ...tradeRecommendation.recommendation,
          technicalSummary: this.createEnhancedTechnicalSummary(technicalAnalysis),
          aiSummary: this.createAISummary(aiAnalysis),
          sessionStats: tradeRecommendation.sessionStats
        });

        this.logger.info(`📡 Enhanced signal broadcasted: ${signalId}`);
      }

      // 6. Log enhanced signal
      await this.logEnhancedSignal(tradeRecommendation, technicalAnalysis, aiAnalysis);

      // 7. Display in terminal
      this.displayEnhancedSignal(tradeRecommendation, technicalAnalysis, aiAnalysis);

    } catch (error) {
      this.logger.error('❌ Error in enhanced signal generation:', error);
    }
  }

  async makeTradeDecision() {
    if (this.marketData.length < 5) {
      this.logger.warn('⚠️ Insufficient market data for analysis');
      return;
    }
    
    this.logger.info('🧠 Making trading decision...');
    
    try {
      // 1. Technical Analysis
      const technicalData = await this.technicalAnalyzer.analyze(this.marketData);
      
      // 2. AI Analysis
      const aiDecision = await this.aiAnalyzer.analyze({
        currencyPair: this.config.currencyPair,
        marketData: this.marketData.slice(-5), // Last 5 candles
        technicalData: technicalData
      });
      
      // 3. Log the decision
      await this.database.storeDecision({
        timestamp: new Date(),
        currencyPair: this.config.currencyPair,
        decision: aiDecision.decision,
        confidence: aiDecision.confidence,
        reason: aiDecision.reason,
        technicalData: technicalData,
        marketData: this.marketData.slice(-5)
      });
      
      this.logger.info(`🎯 AI Decision: ${aiDecision.decision} (${aiDecision.confidence}%)`);
      this.logger.info(`💭 Reason: ${aiDecision.reason}`);
      
      // 4. Execute trade if decision is BUY or SELL
      if (aiDecision.decision !== 'NO_TRADE' && aiDecision.confidence >= this.config.minConfidence) {
        await this.executeTrade(aiDecision);
      } else {
        this.logger.info('⏸️ No trade executed (low confidence or no signal)');
      }
      
    } catch (error) {
      this.logger.error('❌ Error in trading decision process:', error);
    }
  }
  
  async executeTrade(aiDecision) {
    try {
      const tradeParams = {
        currencyPair: this.config.currencyPair,
        direction: aiDecision.decision, // 'BUY' or 'SELL'
        amount: this.config.tradeAmount,
        duration: 5, // 5 minutes
        confidence: aiDecision.confidence,
        reason: aiDecision.reason
      };
      
      if (this.config.paperTrading) {
        this.logger.info('📝 PAPER TRADE:', tradeParams);
        await this.database.storeTrade({
          ...tradeParams,
          timestamp: new Date(),
          type: 'PAPER',
          status: 'EXECUTED'
        });
      } else {
        this.logger.info('💰 EXECUTING REAL TRADE:', tradeParams);
        const result = await this.tradeExecutor.executeTrade(tradeParams);
        
        await this.database.storeTrade({
          ...tradeParams,
          ...result,
          timestamp: new Date(),
          type: 'REAL'
        });
      }
      
    } catch (error) {
      this.logger.error('❌ Trade execution error:', error);
    }
  }
  
  keepAlive() {
    // Keep the process running
    setInterval(() => {
      if (this.isRunning) {
        this.logger.debug('💓 Bot heartbeat - still running...');
      }
    }, 60000); // Every minute
  }
  
  createTechnicalSummary(technicalData) {
    const summary = [];

    if (technicalData.rsi) {
      summary.push(`RSI: ${technicalData.rsi.current?.toFixed(1)} (${technicalData.rsi.signal})`);
    }
    if (technicalData.macd) {
      summary.push(`MACD: ${technicalData.macd.signal}`);
    }
    if (technicalData.bollingerBands) {
      summary.push(`BB: ${technicalData.bollingerBands.position}`);
    }
    if (technicalData.stochastic) {
      summary.push(`Stoch: ${technicalData.stochastic.signal}`);
    }
    if (technicalData.volume) {
      summary.push(`Volume: ${technicalData.volume.signal}`);
    }

    return summary.join(' | ');
  }

  calculatePriceChange() {
    if (this.marketData.length < 2) return 0;

    const current = this.marketData[this.marketData.length - 1].close;
    const previous = this.marketData[this.marketData.length - 2].close;

    return ((current - previous) / previous * 100).toFixed(3);
  }

  async logSignalToFile(signalData) {
    const logEntry = `[${signalData.timestamp.toISOString()}] Signal #${signalData.signalNumber} - ${signalData.direction} ${signalData.currencyPair} (${signalData.confidence}%) - ${signalData.reasoning}\n`;

    try {
      await fs.appendFile(this.signalLogFile, logEntry);
    } catch (error) {
      this.logger.error('Failed to write signal log:', error);
    }
  }

  async logSignalToCsv(signalData) {
    const csvRow = [
      signalData.timestamp.toISOString(),
      signalData.signalNumber,
      signalData.currencyPair,
      signalData.direction,
      signalData.confidence,
      signalData.marketSuitability,
      signalData.riskLevel,
      signalData.marketData.currentPrice,
      signalData.marketData.priceChange,
      `"${signalData.reasoning.replace(/"/g, '""')}"`,
      `"${signalData.technicalSummary}"`
    ].join(',') + '\n';

    try {
      // Add header if file doesn't exist
      const fileExists = await fs.pathExists(this.signalCsvFile);
      if (!fileExists) {
        const header = 'Timestamp,Signal_Number,Currency_Pair,Direction,Confidence,Market_Suitability,Risk_Level,Current_Price,Price_Change_Percent,Reasoning,Technical_Summary\n';
        await fs.writeFile(this.signalCsvFile, header);
      }

      await fs.appendFile(this.signalCsvFile, csvRow);
    } catch (error) {
      this.logger.error('Failed to write signal CSV:', error);
    }
  }

  async shutdown() {
    this.logger.info('🛑 Shutting down TradingBot...');

    this.isRunning = false;

    // Stop cron jobs
    if (this.dataCollectionJob) {
      this.dataCollectionJob.stop();
    }
    if (this.tradingDecisionJob) {
      this.tradingDecisionJob.stop();
    }

    // Cleanup trade executor (only if initialized)
    if (this.tradeExecutor) {
      await this.tradeExecutor.cleanup();
    }

    // Close database
    if (this.database) {
      await this.database.close();
    }

    if (this.signalOnly) {
      this.logger.info(`📊 Total signals generated: ${this.signalCount}`);
      this.logger.info(`📁 Signal logs saved to: ${this.signalsDir}`);
    }

    this.logger.info('✅ TradingBot shutdown complete');
  }

  /**
   * Check if adaptive indicator optimization is needed and perform it
   */
  async checkAndOptimizeIndicators() {
    try {
      // Check if optimization is needed
      if (!this.technicalAnalyzer.needsOptimization()) {
        return;
      }

      // Check if enough time has passed since last optimization
      const now = Date.now();
      if (this.lastOptimization && (now - this.lastOptimization) < this.optimizationInterval) {
        return;
      }

      // Ensure we have enough historical data
      if (this.marketData.length < 50) {
        this.logger.info('🔧 Insufficient data for indicator optimization (need 50+ candles)');
        return;
      }

      this.logger.info('🔧 Starting adaptive indicator optimization...');

      // Perform optimization
      const result = await this.technicalAnalyzer.optimizeIndicators(this.marketData);

      if (result.optimized) {
        this.lastOptimization = now;
        this.logger.info('✅ Adaptive indicator optimization completed successfully');
        this.logger.info(`🎯 New parameters: RSI(${result.newParameters.rsi.period}), MACD(${result.newParameters.macd.fastPeriod},${result.newParameters.macd.slowPeriod},${result.newParameters.macd.signalPeriod})`);
      } else {
        this.logger.info(`⚠️ Indicator optimization skipped: ${result.reason}`);
      }

    } catch (error) {
      this.logger.error('❌ Adaptive indicator optimization failed:', error);
    }
  }

  // Enhanced TRADAI helper methods
  createEnhancedTechnicalSummary(technicalAnalysis) {
    const latest = technicalAnalysis.indicators?.latest || {};

    return {
      rsi: latest.rsi?.toFixed(2) || 'N/A',
      macd: {
        macd: latest.macd?.macd?.toFixed(4) || 'N/A',
        signal: latest.macd?.signal?.toFixed(4) || 'N/A',
        histogram: latest.macd?.histogram?.toFixed(4) || 'N/A'
      },
      bollinger: {
        upper: latest.bollinger?.upper?.toFixed(4) || 'N/A',
        middle: latest.bollinger?.middle?.toFixed(4) || 'N/A',
        lower: latest.bollinger?.lower?.toFixed(4) || 'N/A',
        position: this.calculateBollingerPosition(technicalAnalysis)
      },
      stochastic: {
        k: latest.stochastic?.k?.toFixed(2) || 'N/A',
        d: latest.stochastic?.d?.toFixed(2) || 'N/A'
      },
      marketRegime: technicalAnalysis.marketRegime || { regime: 'UNKNOWN' },
      patterns: technicalAnalysis.patterns || [],
      supportResistance: technicalAnalysis.supportResistance || [],
      sentiment: technicalAnalysis.sentiment || { sentiment: 'NEUTRAL' },
      volatility: technicalAnalysis.volatilityAnalysis || { volatility: 'NORMAL' }
    };
  }

  createAISummary(aiAnalysis) {
    return {
      decision: aiAnalysis.decision,
      confidence: aiAnalysis.confidence,
      consensusReached: aiAnalysis.consensusReached,
      reasoning: aiAnalysis.reasoning,
      keyFactors: aiAnalysis.keyFactors || [],
      riskLevel: aiAnalysis.riskLevel || 'MEDIUM',
      groqAnalysis: aiAnalysis.groqAnalysis ? {
        decision: aiAnalysis.groqAnalysis.decision,
        confidence: aiAnalysis.groqAnalysis.confidence,
        reasoning: aiAnalysis.groqAnalysis.reasoning?.substring(0, 200) + '...'
      } : null,
      togetherAnalysis: aiAnalysis.togetherAnalysis ? {
        decision: aiAnalysis.togetherAnalysis.decision,
        confidence: aiAnalysis.togetherAnalysis.confidence,
        reasoning: aiAnalysis.togetherAnalysis.reasoning?.substring(0, 200) + '...'
      } : null
    };
  }

  calculateBollingerPosition(technicalAnalysis) {
    const latest = technicalAnalysis.indicators?.latest || {};
    const currentPrice = this.marketData[this.marketData.length - 1]?.close;

    if (!latest.bollinger || !currentPrice) return 'UNKNOWN';

    const { upper, middle, lower } = latest.bollinger;

    if (currentPrice > upper) return 'ABOVE_UPPER';
    if (currentPrice < lower) return 'BELOW_LOWER';
    if (currentPrice > middle) return 'UPPER_HALF';
    return 'LOWER_HALF';
  }

  async logEnhancedSignal(tradeRecommendation, technicalAnalysis, aiAnalysis) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'ENHANCED_SIGNAL',
        recommendation: tradeRecommendation,
        technicalAnalysis: this.createEnhancedTechnicalSummary(technicalAnalysis),
        aiAnalysis: this.createAISummary(aiAnalysis)
      };

      // Log to file
      await fs.appendFile(this.signalLogFile, JSON.stringify(logEntry) + '\n');

      // Log to CSV
      if (tradeRecommendation.type === 'TRADE_RECOMMENDATION') {
        const csvRow = this.createEnhancedCsvRow(tradeRecommendation.recommendation, technicalAnalysis, aiAnalysis);
        await fs.appendFile(this.signalCsvFile, csvRow + '\n');
      }

    } catch (error) {
      this.logger.error('❌ Error logging enhanced signal:', error);
    }
  }

  createEnhancedCsvRow(recommendation, technicalAnalysis, aiAnalysis) {
    const latest = technicalAnalysis.indicators?.latest || {};
    const patterns = technicalAnalysis.patterns?.map(p => p.name).join(';') || '';
    const supportLevel = technicalAnalysis.supportResistance?.find(l => l.type === 'SUPPORT')?.price || '';
    const resistanceLevel = technicalAnalysis.supportResistance?.find(l => l.type === 'RESISTANCE')?.price || '';

    return [
      new Date().toISOString(),
      recommendation.signal.currencyPair,
      recommendation.signal.timeframe,
      recommendation.signal.decision,
      recommendation.confidence,
      aiAnalysis.groqAnalysis?.decision || '',
      aiAnalysis.groqAnalysis?.confidence || '',
      aiAnalysis.togetherAnalysis?.decision || '',
      aiAnalysis.togetherAnalysis?.confidence || '',
      aiAnalysis.consensusReached,
      latest.rsi?.toFixed(2) || '',
      latest.macd?.histogram?.toFixed(4) || '',
      this.calculateBollingerPosition(technicalAnalysis),
      technicalAnalysis.marketRegime?.regime || '',
      patterns,
      supportLevel,
      resistanceLevel,
      recommendation.positionSize?.kellyPercentage || '',
      recommendation.riskAmount?.toFixed(2) || '',
      recommendation.potentialProfit?.toFixed(2) || '',
      recommendation.riskRewardRatio || ''
    ].join(',');
  }

  displayEnhancedSignal(tradeRecommendation, technicalAnalysis, aiAnalysis) {
    if (tradeRecommendation.type !== 'TRADE_RECOMMENDATION') return;

    const rec = tradeRecommendation.recommendation;

    console.log('\n' + '='.repeat(80));
    console.log(`🚀 ENHANCED TRADAI SIGNAL #${Date.now()}`);
    console.log('='.repeat(80));

    console.log(`📊 ${rec.signal.currencyPair} (${rec.signal.timeframe}) - ${rec.signal.decision}`);
    console.log(`🎯 Confidence: ${rec.confidence}% | Consensus: ${aiAnalysis.consensusReached ? '✅' : '❌'}`);
    console.log(`💰 Position Size: $${rec.riskAmount.toFixed(2)} (${rec.positionSize.kellyPercentage}% Kelly)`);
    console.log(`📈 Risk/Reward: 1:${rec.riskRewardRatio} | Potential Profit: $${rec.potentialProfit.toFixed(2)}`);

    if (aiAnalysis.consensusReached) {
      console.log(`\n🧠 AI CONSENSUS:`);
      console.log(`   Groq AI: ${aiAnalysis.groqAnalysis.decision} (${aiAnalysis.groqAnalysis.confidence}%)`);
      console.log(`   Together AI: ${aiAnalysis.togetherAnalysis.decision} (${aiAnalysis.togetherAnalysis.confidence}%)`);
    }

    console.log(`\n📊 TECHNICAL SUMMARY:`);
    console.log(`   RSI: ${technicalAnalysis.indicators?.latest?.rsi?.toFixed(2) || 'N/A'}`);
    console.log(`   Market Regime: ${technicalAnalysis.marketRegime?.regime || 'UNKNOWN'}`);
    console.log(`   Patterns: ${technicalAnalysis.patterns?.map(p => p.name).join(', ') || 'None'}`);

    console.log(`\n💡 RATIONALE:`);
    console.log(rec.tradingRationale.split('\n\n')[0]); // First paragraph only

    console.log('='.repeat(80) + '\n');
  }

  async stop() {
    this.logger.info('🛑 Stopping TradingBot...');

    this.isRunning = false;

    // Stop cron jobs
    if (this.dataCollectionJob) {
      this.dataCollectionJob.destroy();
    }
    if (this.tradingDecisionJob) {
      this.tradingDecisionJob.destroy();
    }

    // Stop WebSocket server
    if (this.webSocketServer) {
      await this.webSocketServer.stop();
    }

    // Close trade executor
    if (this.tradeExecutor) {
      await this.tradeExecutor.close();
    }

    // Close database
    if (this.database) {
      await this.database.close();
    }

    this.logger.info('✅ TradingBot stopped successfully');
  }
}

module.exports = { TradingBot };
