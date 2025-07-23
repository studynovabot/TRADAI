/**
 * TRADAI System Integrator
 * 
 * Main integration point that combines all upgraded components:
 * - Strict mode configuration
 * - Data quality validation
 * - Advanced ML models
 * - Signal quality validation
 * - Multi-timeframe confluence analysis
 * - Real-time performance tracking
 */

const { strictModeConfig } = require('../config/strict-mode');
const { DataQualityValidator } = require('./DataQualityValidator');
const { DataSourceVerifier } = require('./DataSourceVerifier');
const { DataFreshnessValidator } = require('./DataFreshnessValidator');
const { ProviderHealthMonitor } = require('./ProviderHealthMonitor');
const { SignalQualityValidator } = require('./SignalQualityValidator');
const { MultiTimeframeConfluenceAnalyzer } = require('./MultiTimeframeConfluenceAnalyzer');
const { AdvancedFeatureEngine } = require('../ml/AdvancedFeatureEngine');
const { AdvancedLSTMModel } = require('../ml/AdvancedLSTMModel');
const { EnsembleModelValidator } = require('../ml/EnsembleModelValidator');
const { RealTimePerformanceTracker } = require('../ml/RealTimePerformanceTracker');

class TradAISystemIntegrator {
    constructor(config = {}) {
        this.config = {
            strictMode: true,
            enablePerformanceTracking: true,
            enableHealthMonitoring: true,
            autoFailover: true,
            ...config
        };

        this.isInitialized = false;
        this.components = {};
        this.systemHealth = {
            status: 'unknown',
            components: {},
            lastCheck: null
        };
    }

    /**
     * Initialize the complete TRADAI system
     */
    async initialize() {
        console.log('🚀 Initializing TRADAI System v2.0...');
        console.log(`🔒 Strict Mode: ${this.config.strictMode ? 'ENABLED' : 'DISABLED'}`);

        try {
            // Initialize core validation components
            await this.initializeValidationComponents();

            // Initialize ML components
            await this.initializeMLComponents();

            // Initialize monitoring components
            await this.initializeMonitoringComponents();

            // Perform system health check
            await this.performSystemHealthCheck();

            this.isInitialized = true;
            console.log('✅ TRADAI System initialization complete');

            return {
                success: true,
                message: 'System initialized successfully',
                components: Object.keys(this.components),
                strictMode: this.config.strictMode,
                systemHealth: this.systemHealth
            };

        } catch (error) {
            console.error('❌ TRADAI System initialization failed:', error);
            throw new Error(`System initialization failed: ${error.message}`);
        }
    }

    /**
     * Initialize validation components
     */
    async initializeValidationComponents() {
        console.log('🔧 Initializing validation components...');

        // Data quality validator
        this.components.dataQualityValidator = new DataQualityValidator();
        
        // Data source verifier
        this.components.dataSourceVerifier = new DataSourceVerifier();
        
        // Data freshness validator
        this.components.dataFreshnessValidator = new DataFreshnessValidator();
        
        // Signal quality validator
        this.components.signalQualityValidator = new SignalQualityValidator({
            minQualityScore: 0.8,
            minConfluence: 0.75,
            minConfidence: 0.7
        });
        
        // Multi-timeframe confluence analyzer
        this.components.confluenceAnalyzer = new MultiTimeframeConfluenceAnalyzer({
            timeframes: ['1m', '5m', '15m', '30m', '1h', '4h'],
            minConfluence: 0.75
        });

        console.log('✅ Validation components initialized');
    }

    /**
     * Initialize ML components
     */
    async initializeMLComponents() {
        console.log('🧠 Initializing ML components...');

        // Advanced feature engine
        this.components.featureEngine = new AdvancedFeatureEngine();
        
        // Ensemble model validator
        this.components.ensembleModel = new EnsembleModelValidator({
            modelCount: 3,
            votingMethod: 'weighted',
            minAgreement: 0.6
        });

        // Initialize ensemble models
        await this.components.ensembleModel.initializeEnsemble({
            sequenceLength: 60,
            features: 24,
            lstmUnits: [256, 128, 64],
            dropout: 0.3,
            learningRate: 0.001
        });

        console.log('✅ ML components initialized');
    }

    /**
     * Initialize monitoring components
     */
    async initializeMonitoringComponents() {
        console.log('📊 Initializing monitoring components...');

        if (this.config.enableHealthMonitoring) {
            // Provider health monitor
            this.components.healthMonitor = new ProviderHealthMonitor();
            this.components.healthMonitor.startMonitoring(60000); // 1 minute intervals
        }

        if (this.config.enablePerformanceTracking) {
            // Real-time performance tracker
            this.components.performanceTracker = new RealTimePerformanceTracker({
                windowSize: 100,
                updateInterval: 60000,
                alertThresholds: {
                    accuracy: 0.7,
                    precision: 0.7,
                    recall: 0.7,
                    sharpeRatio: 1.0
                }
            });
            this.components.performanceTracker.startTracking();
        }

        console.log('✅ Monitoring components initialized');
    }

    /**
     * Generate trading signal with full validation pipeline
     */
    async generateValidatedSignal(marketData, options = {}) {
        if (!this.isInitialized) {
            throw new Error('System not initialized. Call initialize() first.');
        }

        const signalId = `SIGNAL_${Date.now()}_${Buffer.from(Date.now().toString()).toString('base64').substr(0, 8)}`;
        
        console.log(`🎯 Generating validated signal ${signalId}...`);

        try {
            // Step 1: Validate data quality
            const dataValidation = await this.validateMarketData(marketData, options.dataSource);
            if (!dataValidation.passed) {
                throw new Error(`Data validation failed: ${dataValidation.errors.join(', ')}`);
            }

            // Step 2: Multi-timeframe confluence analysis
            const confluenceAnalysis = await this.analyzeMultiTimeframeConfluence(marketData);
            if (!confluenceAnalysis.passed) {
                throw new Error(`Confluence analysis failed: ${confluenceAnalysis.warnings.join(', ')}`);
            }

            // Step 3: Extract features for ML prediction
            const features = this.extractMLFeatures(marketData);

            // Step 4: Generate ML prediction
            const mlPrediction = await this.generateMLPrediction(features);

            // Step 5: Create preliminary signal
            const preliminarySignal = this.createPreliminarySignal(
                mlPrediction, 
                confluenceAnalysis, 
                marketData, 
                signalId
            );

            // Step 6: Validate signal quality
            const signalValidation = await this.validateSignalQuality(
                preliminarySignal, 
                marketData, 
                confluenceAnalysis.details
            );

            if (!signalValidation.passed) {
                throw new Error(`Signal quality validation failed: ${signalValidation.errors.join(', ')}`);
            }

            // Step 7: Create final validated signal
            const validatedSignal = this.createFinalSignal(
                preliminarySignal,
                signalValidation,
                dataValidation,
                confluenceAnalysis
            );

            // Step 8: Record prediction for performance tracking
            if (this.components.performanceTracker) {
                this.components.performanceTracker.recordPrediction(signalId, validatedSignal, marketData);
            }

            console.log(`✅ Signal ${signalId} generated successfully`);
            return validatedSignal;

        } catch (error) {
            console.error(`❌ Signal generation failed for ${signalId}:`, error.message);
            
            // In strict mode, we don't generate fallback signals
            if (strictModeConfig.isStrictModeEnabled()) {
                throw error;
            }
            
            throw error; // Always throw in this implementation
        }
    }

    /**
     * Validate market data quality
     */
    async validateMarketData(marketData, dataSource = 'unknown') {
        const validation = this.components.dataQualityValidator.validateMarketData(marketData, dataSource);
        
        // Also verify data source
        const sourceVerification = this.components.dataSourceVerifier.verifyDataSource(dataSource, marketData);
        
        // And check freshness
        const freshnessValidation = this.components.dataFreshnessValidator.validateFreshness(
            marketData, 
            marketData.timeframe || '5m', 
            dataSource
        );

        return {
            passed: validation.passed && sourceVerification.isTrusted && freshnessValidation.isFresh,
            qualityScore: validation.qualityScore,
            sourceVerification,
            freshnessValidation,
            errors: [
                ...validation.errors,
                ...sourceVerification.errors,
                ...freshnessValidation.errors
            ],
            warnings: [
                ...validation.warnings,
                ...sourceVerification.warnings,
                ...freshnessValidation.warnings
            ]
        };
    }

    /**
     * Analyze multi-timeframe confluence
     */
    async analyzeMultiTimeframeConfluence(marketData) {
        // For this implementation, we'll use the main timeframe data
        // In a full implementation, you'd fetch data for multiple timeframes
        const timeframeData = {
            [marketData.timeframe || '5m']: marketData.candles || [marketData]
        };

        return await this.components.confluenceAnalyzer.analyzeConfluence(timeframeData);
    }

    /**
     * Extract ML features
     */
    extractMLFeatures(marketData) {
        const ohlcvData = marketData.candles || [marketData];
        const indicators = marketData.indicators || {};
        
        return this.components.featureEngine.extractFeatures(ohlcvData, indicators);
    }

    /**
     * Generate ML prediction
     */
    async generateMLPrediction(features) {
        // Normalize features
        const normalizedFeatures = this.components.featureEngine.normalizeFeatures(features);
        
        // Convert to array format
        const featureArray = this.components.featureEngine.featuresToArray(normalizedFeatures);
        
        // Create tensor for prediction (batch size 1)
        const inputTensor = require('@tensorflow/tfjs-node').tensor3d([featureArray], [1, 1, 24]);
        
        try {
            // Get ensemble prediction
            const predictions = await this.components.ensembleModel.predictEnsemble(inputTensor);
            return predictions[0]; // Return first (and only) prediction
        } finally {
            inputTensor.dispose();
        }
    }

    /**
     * Create preliminary signal
     */
    createPreliminarySignal(mlPrediction, confluenceAnalysis, marketData, signalId) {
        return {
            id: signalId,
            direction: mlPrediction.direction,
            confidence: mlPrediction.confidence,
            timestamp: Date.now(),
            
            // ML prediction details
            mlPrediction: {
                direction: mlPrediction.direction,
                confidence: mlPrediction.confidence,
                agreement: mlPrediction.agreement,
                method: mlPrediction.method
            },
            
            // Confluence details
            confluence: {
                score: confluenceAnalysis.confluenceScore,
                agreement: confluenceAnalysis.agreement,
                strength: confluenceAnalysis.strength
            },
            
            // Market data reference
            marketData: {
                symbol: marketData.symbol,
                timeframe: marketData.timeframe,
                price: marketData.close || marketData.price,
                timestamp: marketData.timestamp
            },
            
            // Data source
            dataSource: marketData.source || 'unknown'
        };
    }

    /**
     * Validate signal quality
     */
    async validateSignalQuality(signal, marketData, timeframeAnalysis) {
        return this.components.signalQualityValidator.validateSignal(
            signal, 
            marketData, 
            timeframeAnalysis
        );
    }

    /**
     * Create final validated signal
     */
    createFinalSignal(preliminarySignal, signalValidation, dataValidation, confluenceAnalysis) {
        return {
            ...preliminarySignal,
            
            // Quality metrics
            qualityScore: signalValidation.qualityScore,
            qualityGrade: this.components.signalQualityValidator.getQualityGrade(signalValidation.qualityScore),
            
            // Validation results
            validation: {
                passed: signalValidation.passed,
                dataQuality: dataValidation.qualityScore,
                confluence: confluenceAnalysis.confluenceScore,
                components: signalValidation.components
            },
            
            // Metadata
            metadata: {
                systemVersion: '2.0',
                strictMode: strictModeConfig.isStrictModeEnabled(),
                generatedAt: Date.now(),
                validationTime: Date.now() - preliminarySignal.timestamp
            },
            
            // Recommendations
            recommendations: signalValidation.recommendations
        };
    }

    /**
     * Record signal outcome for performance tracking
     */
    recordSignalOutcome(signalId, outcome, profit = 0) {
        if (this.components.performanceTracker) {
            this.components.performanceTracker.recordOutcome(signalId, outcome, profit);
        }
    }

    /**
     * Perform system health check
     */
    async performSystemHealthCheck() {
        console.log('🏥 Performing system health check...');

        const healthCheck = {
            timestamp: Date.now(),
            status: 'healthy',
            components: {},
            issues: []
        };

        // Check each component
        for (const [name, component] of Object.entries(this.components)) {
            try {
                if (component.getHealthStatus) {
                    healthCheck.components[name] = await component.getHealthStatus();
                } else {
                    healthCheck.components[name] = { status: 'unknown' };
                }
            } catch (error) {
                healthCheck.components[name] = { status: 'error', error: error.message };
                healthCheck.issues.push(`${name}: ${error.message}`);
            }
        }

        // Check provider health
        if (this.components.healthMonitor) {
            const providerHealth = await this.components.healthMonitor.getHealthReport();
            healthCheck.providers = providerHealth;
            
            if (providerHealth.summary.criticalAlerts > 0) {
                healthCheck.status = 'degraded';
                healthCheck.issues.push(`${providerHealth.summary.criticalAlerts} critical provider alerts`);
            }
        }

        // Overall status
        if (healthCheck.issues.length > 0) {
            healthCheck.status = healthCheck.issues.length > 3 ? 'critical' : 'degraded';
        }

        this.systemHealth = healthCheck;
        console.log(`🏥 System health: ${healthCheck.status.toUpperCase()}`);

        return healthCheck;
    }

    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            strictMode: strictModeConfig.isStrictModeEnabled(),
            components: Object.keys(this.components),
            health: this.systemHealth,
            config: this.config
        };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        if (!this.components.performanceTracker) {
            return { message: 'Performance tracking not enabled' };
        }

        return this.components.performanceTracker.getPerformanceReport();
    }

    /**
     * Shutdown system gracefully
     */
    async shutdown() {
        console.log('🔄 Shutting down TRADAI system...');

        // Stop monitoring components
        if (this.components.healthMonitor) {
            this.components.healthMonitor.stopMonitoring();
        }

        if (this.components.performanceTracker) {
            this.components.performanceTracker.stopTracking();
        }

        // Dispose ML models
        if (this.components.ensembleModel) {
            this.components.ensembleModel.dispose();
        }

        this.isInitialized = false;
        console.log('✅ TRADAI system shutdown complete');
    }
}

module.exports = { TradAISystemIntegrator };
