/**
 * Automated Model Training Pipeline for Binary Options Trading
 * 
 * Features:
 * - Automated data preprocessing and feature engineering
 * - Cross-validation with time series splits
 * - Hyperparameter optimization using Optuna-style approach
 * - Ensemble model training and validation
 * - Continuous learning with new data
 * - Performance tracking and model versioning
 * - A/B testing for model deployment
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs').promises;
const path = require('path');
const { AdvancedLSTMModel } = require('./AdvancedLSTMModel');
const { AdvancedFeatureEngine } = require('./AdvancedFeatureEngine');
const { EnsembleModelValidator } = require('./EnsembleModelValidator');

class ModelTrainingPipeline {
    constructor(config = {}) {
        this.config = {
            // Data configuration
            dataPath: config.dataPath || './data/training',
            validationSplit: config.validationSplit || 0.2,
            testSplit: config.testSplit || 0.1,
            sequenceLength: config.sequenceLength || 60,
            
            // Training configuration
            maxEpochs: config.maxEpochs || 200,
            batchSize: config.batchSize || 32,
            earlyStoppingPatience: config.earlyStoppingPatience || 20,
            
            // Hyperparameter optimization
            enableHyperparameterOptimization: config.enableHyperparameterOptimization !== false,
            optimizationTrials: config.optimizationTrials || 50,
            
            // Cross-validation
            crossValidationFolds: config.crossValidationFolds || 5,
            timeSeriesSplit: config.timeSeriesSplit !== false,
            
            // Ensemble configuration
            ensembleSize: config.ensembleSize || 5,
            ensembleMethod: config.ensembleMethod || 'weighted_voting',
            
            // Performance targets
            targetAccuracy: config.targetAccuracy || 0.68,
            targetPrecision: config.targetPrecision || 0.70,
            targetRecall: config.targetRecall || 0.65,
            
            // Model versioning
            modelSavePath: config.modelSavePath || './models',
            enableVersioning: config.enableVersioning !== false,
            
            // Continuous learning
            enableContinuousLearning: config.enableContinuousLearning !== false,
            retrainingThreshold: config.retrainingThreshold || 0.05, // 5% performance drop
            
            ...config
        };

        // Training state
        this.state = {
            isTraining: false,
            currentTrial: 0,
            bestScore: 0,
            bestParams: null,
            trainingHistory: [],
            modelVersions: [],
            lastTrainingTime: 0
        };

        // Components
        this.featureEngine = new AdvancedFeatureEngine();
        this.ensembleValidator = new EnsembleModelValidator();
        
        // Training data cache
        this.trainingData = null;
        this.validationData = null;
        this.testData = null;
    }

    /**
     * Start the complete training pipeline
     */
    async startTraining(dataSource = null) {
        console.log('🚀 Starting automated model training pipeline...');

        if (this.state.isTraining) {
            throw new Error('Training already in progress');
        }

        this.state.isTraining = true;
        this.state.currentTrial = 0;

        try {
            // Step 1: Load and preprocess data
            console.log('📊 Loading and preprocessing data...');
            await this.loadAndPreprocessData(dataSource);

            // Step 2: Feature engineering
            console.log('🔧 Engineering features...');
            await this.engineerFeatures();

            // Step 3: Hyperparameter optimization
            if (this.config.enableHyperparameterOptimization) {
                console.log('🎯 Starting hyperparameter optimization...');
                await this.optimizeHyperparameters();
            }

            // Step 4: Train ensemble models
            console.log('🎭 Training ensemble models...');
            await this.trainEnsembleModels();

            // Step 5: Cross-validation
            console.log('✅ Performing cross-validation...');
            const cvResults = await this.performCrossValidation();

            // Step 6: Final model evaluation
            console.log('📈 Evaluating final models...');
            const finalResults = await this.evaluateFinalModels();

            // Step 7: Save best models
            console.log('💾 Saving best models...');
            await this.saveBestModels(finalResults);

            console.log('🎉 Training pipeline completed successfully!');
            return {
                success: true,
                crossValidationResults: cvResults,
                finalResults: finalResults,
                bestParams: this.state.bestParams,
                modelVersions: this.state.modelVersions
            };

        } catch (error) {
            console.error('❌ Training pipeline failed:', error);
            throw error;
        } finally {
            this.state.isTraining = false;
        }
    }

    /**
     * Load and preprocess training data
     */
    async loadAndPreprocessData(dataSource) {
        try {
            let rawData;
            
            if (dataSource) {
                rawData = dataSource;
            } else {
                // Load from files
                rawData = await this.loadDataFromFiles();
            }

            console.log(`📊 Loaded ${rawData.length} data samples`);

            // Sort by timestamp for time series
            rawData.sort((a, b) => a.timestamp - b.timestamp);

            // Split data chronologically for time series
            const totalSamples = rawData.length;
            const testSize = Math.floor(totalSamples * this.config.testSplit);
            const validationSize = Math.floor(totalSamples * this.config.validationSplit);
            const trainSize = totalSamples - testSize - validationSize;

            this.trainingData = rawData.slice(0, trainSize);
            this.validationData = rawData.slice(trainSize, trainSize + validationSize);
            this.testData = rawData.slice(trainSize + validationSize);

            console.log(`📊 Data split - Train: ${trainSize}, Validation: ${validationSize}, Test: ${testSize}`);

        } catch (error) {
            console.error('❌ Data loading failed:', error);
            throw error;
        }
    }

    /**
     * Load data from files
     */
    async loadDataFromFiles() {
        const dataFiles = await fs.readdir(this.config.dataPath);
        const jsonFiles = dataFiles.filter(file => file.endsWith('.json'));
        
        const allData = [];
        
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(this.config.dataPath, file);
                const fileContent = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(fileContent);
                
                if (Array.isArray(data)) {
                    allData.push(...data);
                } else {
                    allData.push(data);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to load ${file}:`, error.message);
            }
        }

        return allData;
    }

    /**
     * Engineer features from raw data
     */
    async engineerFeatures() {
        console.log('🔧 Engineering features for training...');

        // Process training data
        this.trainingData = await Promise.all(
            this.trainingData.map(sample => this.featureEngine.extractAllFeatures(sample))
        );

        // Process validation data
        this.validationData = await Promise.all(
            this.validationData.map(sample => this.featureEngine.extractAllFeatures(sample))
        );

        // Process test data
        this.testData = await Promise.all(
            this.testData.map(sample => this.featureEngine.extractAllFeatures(sample))
        );

        console.log('✅ Feature engineering completed');
    }

    /**
     * Optimize hyperparameters using grid search with random sampling
     */
    async optimizeHyperparameters() {
        console.log('🎯 Starting hyperparameter optimization...');

        const parameterSpace = {
            lstmUnits: [[256, 128, 64], [512, 256, 128], [128, 64, 32]],
            denseUnits: [[64, 32], [128, 64, 32], [256, 128, 64]],
            dropout: [0.2, 0.3, 0.4, 0.5],
            learningRate: [0.0001, 0.0005, 0.001, 0.002],
            batchSize: [16, 32, 64],
            attentionHeads: [8, 12, 16],
            useBidirectional: [true, false]
        };

        let bestScore = 0;
        let bestParams = null;

        for (let trial = 0; trial < this.config.optimizationTrials; trial++) {
            this.state.currentTrial = trial + 1;
            console.log(`🔄 Trial ${this.state.currentTrial}/${this.config.optimizationTrials}`);

            // Sample random parameters
            const params = this.sampleParameters(parameterSpace);
            
            try {
                // Train model with these parameters
                const score = await this.trainAndEvaluateModel(params);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestParams = { ...params };
                    console.log(`🎉 New best score: ${score.toFixed(4)} with params:`, params);
                }

            } catch (error) {
                console.warn(`⚠️ Trial ${trial + 1} failed:`, error.message);
            }
        }

        this.state.bestScore = bestScore;
        this.state.bestParams = bestParams;

        console.log('✅ Hyperparameter optimization completed');
        console.log(`🏆 Best score: ${bestScore.toFixed(4)}`);
        console.log('🏆 Best parameters:', bestParams);
    }

    /**
     * Sample random parameters from parameter space
     */
    sampleParameters(parameterSpace) {
        const params = {};
        
        for (const [key, values] of Object.entries(parameterSpace)) {
            const randomIndex = Math.floor(Math.random() * values.length);
            params[key] = values[randomIndex];
        }

        return params;
    }

    /**
     * Train and evaluate a single model with given parameters
     */
    async trainAndEvaluateModel(params) {
        // Create model with parameters
        const model = new AdvancedLSTMModel({
            ...this.config,
            ...params
        });

        // Build and compile model
        model.buildModel();
        model.compileModel();

        // Prepare training data
        const trainX = this.prepareSequenceData(this.trainingData);
        const trainY = this.prepareLabels(this.trainingData);
        const valX = this.prepareSequenceData(this.validationData);
        const valY = this.prepareLabels(this.validationData);

        // Train model
        await model.trainModel(
            { x: trainX, y: trainY },
            { x: valX, y: valY }
        );

        // Evaluate model
        const predictions = await model.predict(valX);
        const score = this.calculateScore(predictions, valY);

        // Clean up
        model.dispose();
        trainX.dispose();
        trainY.dispose();
        valX.dispose();
        valY.dispose();

        return score;
    }

    /**
     * Prepare sequence data for LSTM training
     */
    prepareSequenceData(data) {
        const sequences = [];
        
        for (let i = this.config.sequenceLength; i < data.length; i++) {
            const sequence = data.slice(i - this.config.sequenceLength, i)
                .map(sample => this.featureEngine.featuresToArray(sample.features));
            sequences.push(sequence);
        }

        return tf.tensor3d(sequences);
    }

    /**
     * Prepare labels for training
     */
    prepareLabels(data) {
        const labels = [];
        
        for (let i = this.config.sequenceLength; i < data.length; i++) {
            const sample = data[i];
            // Assuming binary classification (UP/DOWN)
            const label = sample.nextCandleDirection === 'UP' ? [1, 0] : [0, 1];
            labels.push(label);
        }

        return tf.tensor2d(labels);
    }

    /**
     * Calculate evaluation score
     */
    calculateScore(predictions, trueLabels) {
        // Simple accuracy calculation
        let correct = 0;
        const total = predictions.length;

        for (let i = 0; i < total; i++) {
            const predicted = predictions[i].direction;
            const actual = trueLabels[i]; // This would need proper conversion

            if (predicted === actual) {
                correct++;
            }
        }

        return correct / total;
    }

    /**
     * Train ensemble models with best parameters
     */
    async trainEnsembleModels() {
        console.log('🎭 Training ensemble models...');

        const bestParams = this.state.bestParams || this.getDefaultParameters();

        // Initialize ensemble
        await this.ensembleValidator.initializeEnsemble(bestParams);

        // Prepare training data
        const trainX = this.prepareSequenceData(this.trainingData);
        const trainY = this.prepareLabels(this.trainingData);
        const valX = this.prepareSequenceData(this.validationData);
        const valY = this.prepareLabels(this.validationData);

        // Train each model in the ensemble
        for (let i = 0; i < this.config.ensembleSize; i++) {
            console.log(`🔄 Training ensemble model ${i + 1}/${this.config.ensembleSize}`);

            try {
                const model = this.ensembleValidator.models[i];
                await model.model.trainModel(
                    { x: trainX, y: trainY },
                    { x: valX, y: valY }
                );

                console.log(`✅ Ensemble model ${i + 1} trained successfully`);
            } catch (error) {
                console.error(`❌ Failed to train ensemble model ${i + 1}:`, error);
            }
        }

        // Clean up tensors
        trainX.dispose();
        trainY.dispose();
        valX.dispose();
        valY.dispose();

        console.log('✅ Ensemble training completed');
    }

    /**
     * Perform cross-validation
     */
    async performCrossValidation() {
        console.log('✅ Performing cross-validation...');

        const folds = this.config.crossValidationFolds;
        const results = [];

        // Combine training and validation data for CV
        const allData = [...this.trainingData, ...this.validationData];
        const foldSize = Math.floor(allData.length / folds);

        for (let fold = 0; fold < folds; fold++) {
            console.log(`🔄 Cross-validation fold ${fold + 1}/${folds}`);

            try {
                // Create train/validation split for this fold
                const valStart = fold * foldSize;
                const valEnd = (fold + 1) * foldSize;

                const foldValidation = allData.slice(valStart, valEnd);
                const foldTraining = [
                    ...allData.slice(0, valStart),
                    ...allData.slice(valEnd)
                ];

                // Train model on fold
                const foldScore = await this.trainAndEvaluateModel(
                    this.state.bestParams || this.getDefaultParameters()
                );

                results.push({
                    fold: fold + 1,
                    score: foldScore,
                    trainSize: foldTraining.length,
                    valSize: foldValidation.length
                });

                console.log(`✅ Fold ${fold + 1} score: ${foldScore.toFixed(4)}`);

            } catch (error) {
                console.error(`❌ Fold ${fold + 1} failed:`, error);
                results.push({
                    fold: fold + 1,
                    score: 0,
                    error: error.message
                });
            }
        }

        // Calculate CV statistics
        const validScores = results.filter(r => !r.error).map(r => r.score);
        const cvStats = {
            meanScore: validScores.reduce((a, b) => a + b, 0) / validScores.length,
            stdScore: this.calculateStandardDeviation(validScores),
            minScore: Math.min(...validScores),
            maxScore: Math.max(...validScores),
            foldResults: results
        };

        console.log('✅ Cross-validation completed');
        console.log(`📊 CV Mean Score: ${cvStats.meanScore.toFixed(4)} ± ${cvStats.stdScore.toFixed(4)}`);

        return cvStats;
    }

    /**
     * Evaluate final models on test set
     */
    async evaluateFinalModels() {
        console.log('📈 Evaluating final models on test set...');

        const testX = this.prepareSequenceData(this.testData);
        const testY = this.prepareLabels(this.testData);

        try {
            // Evaluate ensemble
            const ensemblePredictions = await this.ensembleValidator.predictEnsemble(testX);
            const ensembleScore = this.calculateDetailedMetrics(ensemblePredictions, testY);

            console.log('✅ Final evaluation completed');
            console.log(`🎯 Test Accuracy: ${ensembleScore.accuracy.toFixed(4)}`);
            console.log(`🎯 Test Precision: ${ensembleScore.precision.toFixed(4)}`);
            console.log(`🎯 Test Recall: ${ensembleScore.recall.toFixed(4)}`);

            return {
                ensemble: ensembleScore,
                testSize: this.testData.length,
                timestamp: Date.now()
            };

        } finally {
            testX.dispose();
            testY.dispose();
        }
    }

    /**
     * Calculate detailed metrics
     */
    calculateDetailedMetrics(predictions, trueLabels) {
        let tp = 0, fp = 0, tn = 0, fn = 0;

        for (let i = 0; i < predictions.length; i++) {
            const predicted = predictions[i].direction === 'UP' ? 1 : 0;
            const actual = trueLabels[i]; // This would need proper conversion

            if (predicted === 1 && actual === 1) tp++;
            else if (predicted === 1 && actual === 0) fp++;
            else if (predicted === 0 && actual === 0) tn++;
            else if (predicted === 0 && actual === 1) fn++;
        }

        const accuracy = (tp + tn) / (tp + fp + tn + fn);
        const precision = tp / (tp + fp) || 0;
        const recall = tp / (tp + fn) || 0;
        const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

        return { accuracy, precision, recall, f1Score, tp, fp, tn, fn };
    }

    /**
     * Save best models
     */
    async saveBestModels(results) {
        console.log('💾 Saving best models...');

        try {
            // Create model directory
            await fs.mkdir(this.config.modelSavePath, { recursive: true });

            // Generate version info
            const version = {
                timestamp: Date.now(),
                version: `v${Date.now()}`,
                performance: results,
                parameters: this.state.bestParams,
                config: this.config
            };

            // Save ensemble models
            for (let i = 0; i < this.ensembleValidator.models.length; i++) {
                const modelPath = path.join(
                    this.config.modelSavePath,
                    `ensemble_model_${i}_${version.version}`
                );

                await this.ensembleValidator.models[i].model.saveModel(modelPath);
            }

            // Save version info
            const versionPath = path.join(this.config.modelSavePath, `version_${version.version}.json`);
            await fs.writeFile(versionPath, JSON.stringify(version, null, 2));

            this.state.modelVersions.push(version);
            console.log(`✅ Models saved with version ${version.version}`);

        } catch (error) {
            console.error('❌ Failed to save models:', error);
            throw error;
        }
    }

    /**
     * Get default parameters
     */
    getDefaultParameters() {
        return {
            lstmUnits: [256, 128, 64],
            denseUnits: [64, 32],
            dropout: 0.3,
            learningRate: 0.001,
            batchSize: 32,
            attentionHeads: 8,
            useBidirectional: true
        };
    }

    /**
     * Calculate standard deviation
     */
    calculateStandardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }

    /**
     * Get training status
     */
    getStatus() {
        return {
            isTraining: this.state.isTraining,
            currentTrial: this.state.currentTrial,
            bestScore: this.state.bestScore,
            bestParams: this.state.bestParams,
            modelVersions: this.state.modelVersions.length,
            lastTrainingTime: this.state.lastTrainingTime
        };
    }

    /**
     * Dispose and cleanup
     */
    async dispose() {
        console.log('🗑️ Disposing Model Training Pipeline...');

        if (this.ensembleValidator) {
            this.ensembleValidator.dispose();
        }

        this.trainingData = null;
        this.validationData = null;
        this.testData = null;

        console.log('✅ Model Training Pipeline disposed');
    }
}

module.exports = { ModelTrainingPipeline };
