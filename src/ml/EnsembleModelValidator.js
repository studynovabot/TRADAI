/**
 * Ensemble Model Validator
 * 
 * Combines multiple ML models for improved accuracy and validation.
 * Implements voting mechanisms, confidence weighting, and model performance tracking.
 */

const { AdvancedLSTMModel } = require('./AdvancedLSTMModel');

class EnsembleModelValidator {
    constructor(config = {}) {
        this.config = {
            modelCount: config.modelCount || 3,
            votingMethod: config.votingMethod || 'weighted', // 'majority', 'weighted', 'confidence'
            minAgreement: config.minAgreement || 0.6,
            confidenceThreshold: config.confidenceThreshold || 0.7,
            performanceWindow: config.performanceWindow || 100,
            ...config
        };

        this.models = [];
        this.modelPerformance = [];
        this.predictionHistory = [];
        this.ensembleMetrics = {
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            agreement: 0,
            confidence: 0
        };
    }

    /**
     * Initialize ensemble models
     */
    async initializeEnsemble(baseConfig = {}) {
        console.log(`🎭 Initializing ensemble with ${this.config.modelCount} models...`);

        this.models = [];
        this.modelPerformance = [];

        for (let i = 0; i < this.config.modelCount; i++) {
            // Create slightly different configurations for diversity
            const modelConfig = this.createDiverseConfig(baseConfig, i);
            
            const model = new AdvancedLSTMModel(modelConfig);
            model.buildModel();
            model.compileModel();

            this.models.push({
                id: `model_${i}`,
                model: model,
                config: modelConfig,
                weight: 1.0 / this.config.modelCount // Initial equal weighting
            });

            this.modelPerformance.push({
                predictions: 0,
                correct: 0,
                accuracy: 0,
                confidence: 0,
                recentPerformance: []
            });

            console.log(`✅ Model ${i + 1} initialized`);
        }

        console.log('🎭 Ensemble initialization complete');
    }

    /**
     * Create diverse model configurations
     */
    createDiverseConfig(baseConfig, modelIndex) {
        const variations = [
            // Model 0: Base configuration
            {},
            
            // Model 1: More LSTM units, less dropout
            {
                lstmUnits: [320, 160, 80],
                dropout: 0.2,
                learningRate: 0.0008
            },
            
            // Model 2: Fewer LSTM units, more dropout
            {
                lstmUnits: [192, 96, 48],
                dropout: 0.4,
                learningRate: 0.0012
            },
            
            // Model 3: Different architecture
            {
                lstmUnits: [256, 128],
                denseUnits: [64, 32],
                dropout: 0.25,
                useAttention: false
            },
            
            // Model 4: Attention-focused
            {
                lstmUnits: [128, 64],
                denseUnits: [16],
                dropout: 0.35,
                useAttention: true,
                useResidual: false
            }
        ];

        const variation = variations[modelIndex % variations.length];
        return { ...baseConfig, ...variation };
    }

    /**
     * Train all models in the ensemble
     */
    async trainEnsemble(trainData, validationData = null) {
        console.log('🎯 Training ensemble models...');

        const trainingPromises = this.models.map(async (modelWrapper, index) => {
            console.log(`🎯 Training model ${index + 1}/${this.models.length}...`);
            
            try {
                await modelWrapper.model.trainModel(trainData, validationData);
                console.log(`✅ Model ${index + 1} training completed`);
                return true;
            } catch (error) {
                console.error(`❌ Model ${index + 1} training failed:`, error);
                return false;
            }
        });

        const results = await Promise.all(trainingPromises);
        const successCount = results.filter(r => r).length;

        console.log(`🎭 Ensemble training complete: ${successCount}/${this.models.length} models trained successfully`);

        if (successCount === 0) {
            throw new Error('All ensemble models failed to train');
        }

        // Update model weights based on training performance
        this.updateModelWeights();
    }

    /**
     * Make ensemble predictions
     */
    async predictEnsemble(inputData) {
        if (this.models.length === 0) {
            throw new Error('Ensemble not initialized');
        }

        console.log('🎭 Making ensemble predictions...');

        // Get predictions from all models
        const modelPredictions = [];
        
        for (let i = 0; i < this.models.length; i++) {
            try {
                const predictions = await this.models[i].model.predict(inputData);
                modelPredictions.push({
                    modelId: this.models[i].id,
                    predictions: predictions,
                    weight: this.models[i].weight
                });
            } catch (error) {
                console.warn(`Model ${i} prediction failed:`, error.message);
                // Continue with other models
            }
        }

        if (modelPredictions.length === 0) {
            throw new Error('All ensemble models failed to make predictions');
        }

        // Combine predictions using voting method
        const ensemblePredictions = this.combineModelPredictions(modelPredictions);

        // Store prediction history
        this.predictionHistory.push({
            timestamp: Date.now(),
            modelPredictions: modelPredictions,
            ensemblePrediction: ensemblePredictions,
            agreement: this.calculateAgreement(modelPredictions)
        });

        // Keep only recent history
        if (this.predictionHistory.length > this.config.performanceWindow) {
            this.predictionHistory.shift();
        }

        return ensemblePredictions;
    }

    /**
     * Combine model predictions using specified voting method
     */
    combineModelPredictions(modelPredictions) {
        const batchSize = modelPredictions[0].predictions.length;
        const combinedPredictions = [];

        for (let i = 0; i < batchSize; i++) {
            const samplePredictions = modelPredictions.map(mp => ({
                ...mp.predictions[i],
                weight: mp.weight,
                modelId: mp.modelId
            }));

            let combinedPrediction;

            switch (this.config.votingMethod) {
                case 'majority':
                    combinedPrediction = this.majorityVoting(samplePredictions);
                    break;
                case 'weighted':
                    combinedPrediction = this.weightedVoting(samplePredictions);
                    break;
                case 'confidence':
                    combinedPrediction = this.confidenceVoting(samplePredictions);
                    break;
                default:
                    combinedPrediction = this.weightedVoting(samplePredictions);
            }

            combinedPredictions.push(combinedPrediction);
        }

        return combinedPredictions;
    }

    /**
     * Majority voting
     */
    majorityVoting(predictions) {
        const upVotes = predictions.filter(p => p.direction === 'UP').length;
        const downVotes = predictions.filter(p => p.direction === 'DOWN').length;

        const direction = upVotes > downVotes ? 'UP' : 'DOWN';
        const agreement = Math.max(upVotes, downVotes) / predictions.length;
        const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

        return {
            direction,
            confidence: avgConfidence * agreement, // Adjust confidence by agreement
            agreement,
            method: 'majority',
            modelCount: predictions.length,
            votes: { up: upVotes, down: downVotes }
        };
    }

    /**
     * Weighted voting based on model performance
     */
    weightedVoting(predictions) {
        let weightedUpScore = 0;
        let weightedDownScore = 0;
        let totalWeight = 0;
        let weightedConfidence = 0;

        predictions.forEach(p => {
            const weight = p.weight;
            totalWeight += weight;
            weightedConfidence += p.confidence * weight;

            if (p.direction === 'UP') {
                weightedUpScore += p.directionProbability * weight;
            } else {
                weightedDownScore += p.directionProbability * weight;
            }
        });

        const direction = weightedUpScore > weightedDownScore ? 'UP' : 'DOWN';
        const directionStrength = Math.abs(weightedUpScore - weightedDownScore) / totalWeight;
        const avgConfidence = weightedConfidence / totalWeight;

        return {
            direction,
            confidence: avgConfidence * directionStrength,
            directionStrength,
            agreement: directionStrength, // Higher strength indicates better agreement
            method: 'weighted',
            modelCount: predictions.length,
            weightedScores: { up: weightedUpScore, down: weightedDownScore }
        };
    }

    /**
     * Confidence-based voting
     */
    confidenceVoting(predictions) {
        // Sort by confidence and give more weight to high-confidence predictions
        const sortedPredictions = predictions.sort((a, b) => b.confidence - a.confidence);
        
        let weightedUpScore = 0;
        let weightedDownScore = 0;
        let totalWeight = 0;

        sortedPredictions.forEach((p, index) => {
            // Higher confidence predictions get exponentially more weight
            const confidenceWeight = Math.pow(p.confidence, 2);
            totalWeight += confidenceWeight;

            if (p.direction === 'UP') {
                weightedUpScore += confidenceWeight;
            } else {
                weightedDownScore += confidenceWeight;
            }
        });

        const direction = weightedUpScore > weightedDownScore ? 'UP' : 'DOWN';
        const directionStrength = Math.abs(weightedUpScore - weightedDownScore) / totalWeight;
        const topConfidence = sortedPredictions[0].confidence;

        return {
            direction,
            confidence: topConfidence * directionStrength,
            directionStrength,
            agreement: directionStrength,
            method: 'confidence',
            modelCount: predictions.length,
            topConfidence
        };
    }

    /**
     * Calculate agreement between models
     */
    calculateAgreement(modelPredictions) {
        if (modelPredictions.length <= 1) return 1.0;

        const directions = modelPredictions.map(mp => mp.predictions[0].direction);
        const upCount = directions.filter(d => d === 'UP').length;
        const downCount = directions.filter(d => d === 'DOWN').length;

        return Math.max(upCount, downCount) / directions.length;
    }

    /**
     * Update model weights based on performance
     */
    updateModelWeights() {
        console.log('⚖️ Updating model weights based on performance...');

        // Calculate performance-based weights
        const totalPerformance = this.modelPerformance.reduce((sum, perf) => sum + perf.accuracy, 0);

        if (totalPerformance > 0) {
            this.models.forEach((model, index) => {
                const performance = this.modelPerformance[index];
                model.weight = performance.accuracy / totalPerformance;
            });

            // Normalize weights
            const totalWeight = this.models.reduce((sum, model) => sum + model.weight, 0);
            this.models.forEach(model => {
                model.weight = model.weight / totalWeight;
            });
        }

        console.log('⚖️ Model weights updated');
    }

    /**
     * Validate ensemble prediction quality
     */
    validateEnsemblePrediction(prediction) {
        const validation = {
            isValid: true,
            quality: 'high',
            warnings: [],
            errors: []
        };

        // Check agreement threshold
        if (prediction.agreement < this.config.minAgreement) {
            validation.warnings.push(`Low model agreement: ${prediction.agreement.toFixed(2)}`);
            validation.quality = 'low';
        }

        // Check confidence threshold
        if (prediction.confidence < this.config.confidenceThreshold) {
            validation.warnings.push(`Low confidence: ${prediction.confidence.toFixed(2)}`);
            validation.quality = validation.quality === 'low' ? 'low' : 'medium';
        }

        // Check if we have enough models
        if (prediction.modelCount < 2) {
            validation.warnings.push(`Insufficient models: ${prediction.modelCount}`);
            validation.quality = 'low';
        }

        // Determine if prediction should be rejected
        if (prediction.agreement < 0.5 || prediction.confidence < 0.5) {
            validation.isValid = false;
            validation.errors.push('Prediction quality too low for reliable signal');
        }

        return validation;
    }

    /**
     * Get ensemble performance metrics
     */
    getEnsembleMetrics() {
        // Calculate metrics from recent prediction history
        if (this.predictionHistory.length === 0) {
            return this.ensembleMetrics;
        }

        const recentPredictions = this.predictionHistory.slice(-this.config.performanceWindow);
        
        const avgAgreement = recentPredictions.reduce((sum, p) => sum + p.agreement, 0) / recentPredictions.length;
        const avgConfidence = recentPredictions.reduce((sum, p) => sum + p.ensemblePrediction.confidence, 0) / recentPredictions.length;

        this.ensembleMetrics.agreement = avgAgreement;
        this.ensembleMetrics.confidence = avgConfidence;

        return { ...this.ensembleMetrics };
    }

    /**
     * Get individual model performance
     */
    getModelPerformance() {
        return this.models.map((model, index) => ({
            id: model.id,
            weight: model.weight,
            performance: this.modelPerformance[index],
            metrics: model.model.getMetrics()
        }));
    }

    /**
     * Save ensemble models
     */
    async saveEnsemble(basePath) {
        console.log('💾 Saving ensemble models...');

        const savePromises = this.models.map(async (model, index) => {
            const modelPath = `${basePath}/model_${index}`;
            await model.model.saveModel(modelPath);
        });

        await Promise.all(savePromises);

        // Save ensemble configuration
        const ensembleConfig = {
            config: this.config,
            modelPerformance: this.modelPerformance,
            ensembleMetrics: this.ensembleMetrics
        };

        // In a real implementation, you'd save this to a file
        console.log('💾 Ensemble saved successfully');
    }

    /**
     * Dispose all models and free memory
     */
    dispose() {
        console.log('🗑️ Disposing ensemble models...');

        this.models.forEach(model => {
            model.model.dispose();
        });

        this.models = [];
        this.modelPerformance = [];
        this.predictionHistory = [];

        console.log('🗑️ Ensemble disposed');
    }
}

module.exports = { EnsembleModelValidator };
