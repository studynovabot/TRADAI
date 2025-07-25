/**
 * Enhanced LSTM Model Architecture for Binary Options Trading
 *
 * Implements a state-of-the-art LSTM neural network with:
 * - Transformer-style multi-head attention
 * - Bidirectional LSTM layers
 * - Advanced regularization techniques
 * - Ensemble-ready architecture
 * - Optimized for 65-70% win rate target
 */

const tf = require('@tensorflow/tfjs-node');

class AdvancedLSTMModel {
    constructor(config = {}) {
        this.config = {
            // Model architecture
            sequenceLength: config.sequenceLength || 60,
            features: config.features || 24,
            lstmUnits: config.lstmUnits || [512, 256, 128],
            denseUnits: config.denseUnits || [128, 64, 32],

            // Attention configuration
            attentionHeads: config.attentionHeads || 12,
            attentionDim: config.attentionDim || 64,

            // Regularization
            dropout: config.dropout || 0.4,
            recurrentDropout: config.recurrentDropout || 0.3,
            l1Reg: config.l1Reg || 0.001,
            l2Reg: config.l2Reg || 0.001,

            // Training parameters
            learningRate: config.learningRate || 0.0005,
            batchSize: config.batchSize || 32,
            epochs: config.epochs || 200,
            validationSplit: config.validationSplit || 0.2,

            // Advanced features
            useBidirectional: config.useBidirectional !== false,
            useAttention: config.useAttention !== false,
            useResidual: config.useResidual !== false,
            useLayerNorm: config.useLayerNorm !== false,
            useScheduledDropout: config.useScheduledDropout !== false,

            // Performance optimization
            mixedPrecision: config.mixedPrecision || false,
            gradientClipping: config.gradientClipping || 1.0,

            ...config
        };

        this.model = null;
        this.isCompiled = false;
        this.trainingHistory = null;
        this.currentEpoch = 0;

        this.metrics = {
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            loss: 0,
            winRate: 0,
            sharpeRatio: 0,
            maxDrawdown: 0
        };

        // Performance tracking
        this.predictionHistory = [];
        this.performanceMetrics = {
            totalPredictions: 0,
            correctPredictions: 0,
            consecutiveWins: 0,
            consecutiveLosses: 0,
            maxConsecutiveWins: 0,
            maxConsecutiveLosses: 0
        };
    }

    /**
     * Build the advanced LSTM model architecture
     */
    buildModel() {
        console.log('🏗️ Building advanced LSTM model architecture...');

        // Input layer
        const input = tf.input({ 
            shape: [this.config.sequenceLength, this.config.features],
            name: 'sequence_input'
        });

        let x = input;

        // Add attention mechanism if enabled
        if (this.config.useAttention) {
            x = this.addAttentionLayer(x);
        }

        // LSTM layers with residual connections
        x = this.addLSTMLayers(x);

        // Dense layers
        x = this.addDenseLayers(x);

        // Output layers
        const outputs = this.addOutputLayers(x);

        // Create model
        this.model = tf.model({
            inputs: input,
            outputs: outputs,
            name: 'advanced_lstm_trading_model'
        });

        console.log('✅ Model architecture built successfully');
        this.printModelSummary();

        return this.model;
    }

    /**
     * Add enhanced transformer-style attention mechanism
     */
    addAttentionLayer(input) {
        console.log('🔍 Adding enhanced multi-head attention mechanism...');

        // Multi-head attention with enhanced configuration
        const attention = tf.layers.multiHeadAttention({
            numHeads: this.config.attentionHeads,
            keyDim: this.config.attentionDim,
            valueDim: this.config.attentionDim,
            dropout: this.config.dropout * 0.5,
            name: 'enhanced_multi_head_attention'
        }).apply([input, input]);

        // Dropout for attention
        const attentionDropout = tf.layers.dropout({
            rate: this.config.dropout * 0.3,
            name: 'attention_dropout'
        }).apply(attention);

        // Add & Norm (residual connection)
        const addNorm = tf.layers.add({
            name: 'attention_residual'
        }).apply([input, attentionDropout]);

        const normalized = tf.layers.layerNormalization({
            name: 'attention_layer_norm'
        }).apply(addNorm);

        // Feed-forward network within attention block
        const ffn1 = tf.layers.dense({
            units: this.config.attentionDim * 4,
            activation: 'relu',
            name: 'attention_ffn_1'
        }).apply(normalized);

        const ffnDropout = tf.layers.dropout({
            rate: this.config.dropout * 0.5,
            name: 'attention_ffn_dropout'
        }).apply(ffn1);

        const ffn2 = tf.layers.dense({
            units: this.config.features,
            name: 'attention_ffn_2'
        }).apply(ffnDropout);

        // Second residual connection
        const ffnAdd = tf.layers.add({
            name: 'attention_ffn_residual'
        }).apply([normalized, ffn2]);

        return tf.layers.layerNormalization({
            name: 'attention_final_norm'
        }).apply(ffnAdd);
    }

    /**
     * Add enhanced LSTM layers with bidirectional processing and advanced regularization
     */
    addLSTMLayers(input) {
        console.log('🔄 Adding enhanced bidirectional LSTM layers...');

        let x = input;
        let previousOutput = null;

        this.config.lstmUnits.forEach((units, index) => {
            const isLast = index === this.config.lstmUnits.length - 1;

            // Create LSTM layer with enhanced configuration
            const lstmConfig = {
                units: units,
                returnSequences: !isLast,
                dropout: this.config.dropout,
                recurrentDropout: this.config.recurrentDropout,
                kernelRegularizer: tf.regularizers.l1l2({
                    l1: this.config.l1Reg,
                    l2: this.config.l2Reg
                }),
                recurrentRegularizer: tf.regularizers.l2({ l2: this.config.l2Reg * 0.5 }),
                name: `lstm_${index + 1}`
            };

            // Use bidirectional LSTM if enabled
            let lstm;
            if (this.config.useBidirectional && !isLast) {
                lstm = tf.layers.bidirectional({
                    layer: tf.layers.lstm(lstmConfig),
                    mergeMode: 'concat',
                    name: `bidirectional_lstm_${index + 1}`
                }).apply(x);
            } else {
                lstm = tf.layers.lstm(lstmConfig).apply(x);
            }

            // Layer normalization (if enabled)
            let normalized = lstm;
            if (this.config.useLayerNorm) {
                normalized = tf.layers.layerNormalization({
                    name: `lstm_layer_norm_${index + 1}`
                }).apply(lstm);
            }

            // Scheduled dropout (varies by epoch)
            const dropoutRate = this.config.useScheduledDropout ?
                this.getScheduledDropoutRate(index) : this.config.dropout;

            const dropout = tf.layers.dropout({
                rate: dropoutRate,
                name: `lstm_dropout_${index + 1}`
            }).apply(normalized);

            // Enhanced residual connection with projection if needed
            if (this.config.useResidual && previousOutput && !isLast) {
                try {
                    // Project previous output to match current dimensions if needed
                    let projectedPrevious = previousOutput;

                    // For bidirectional layers, we need to handle dimension mismatch
                    if (this.config.useBidirectional) {
                        const projectionUnits = this.config.useBidirectional ? units * 2 : units;
                        projectedPrevious = tf.layers.dense({
                            units: projectionUnits,
                            name: `residual_projection_${index + 1}`
                        }).apply(previousOutput);
                    }

                    const residual = tf.layers.add({
                        name: `lstm_residual_${index + 1}`
                    }).apply([projectedPrevious, dropout]);

                    x = residual;
                } catch (error) {
                    console.warn(`Skipping residual connection for LSTM layer ${index + 1}: ${error.message}`);
                    x = dropout;
                }
            } else {
                x = dropout;
            }

            if (!isLast) {
                previousOutput = x;
            }
        });

        return x;
    }

    /**
     * Get scheduled dropout rate based on current epoch
     */
    getScheduledDropoutRate(layerIndex) {
        if (!this.config.useScheduledDropout) {
            return this.config.dropout;
        }

        // Start with higher dropout and reduce over time
        const epochProgress = this.currentEpoch / this.config.epochs;
        const baseDropout = this.config.dropout;
        const minDropout = baseDropout * 0.3;

        // Exponential decay
        const scheduledRate = baseDropout * Math.exp(-epochProgress * 2) + minDropout;

        return Math.max(scheduledRate, minDropout);
    }

    /**
     * Add dense layers
     */
    addDenseLayers(input) {
        console.log('🔗 Adding dense layers...');

        let x = input;

        this.config.denseUnits.forEach((units, index) => {
            x = tf.layers.dense({
                units: units,
                activation: 'relu',
                name: `dense_${index + 1}`
            }).apply(x);

            x = tf.layers.dropout({
                rate: this.config.dropout * 0.5,
                name: `dense_dropout_${index + 1}`
            }).apply(x);
        });

        return x;
    }

    /**
     * Add enhanced output layers with multiple prediction heads
     */
    addOutputLayers(input) {
        console.log('📤 Adding enhanced multi-head output layers...');

        // Shared dense layer for feature extraction
        const sharedFeatures = tf.layers.dense({
            units: 64,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: this.config.l2Reg }),
            name: 'shared_features'
        }).apply(input);

        const sharedDropout = tf.layers.dropout({
            rate: this.config.dropout * 0.5,
            name: 'shared_dropout'
        }).apply(sharedFeatures);

        // Direction prediction (binary classification) - Main output
        const directionHidden = tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'direction_hidden'
        }).apply(sharedDropout);

        const directionOutput = tf.layers.dense({
            units: 2,
            activation: 'softmax',
            name: 'direction_output'
        }).apply(directionHidden);

        // Confidence prediction (regression) - How confident we are
        const confidenceHidden = tf.layers.dense({
            units: 16,
            activation: 'relu',
            name: 'confidence_hidden'
        }).apply(sharedDropout);

        const confidenceOutput = tf.layers.dense({
            units: 1,
            activation: 'sigmoid',
            name: 'confidence_output'
        }).apply(confidenceHidden);

        // Volatility prediction - Market volatility estimate
        const volatilityHidden = tf.layers.dense({
            units: 16,
            activation: 'relu',
            name: 'volatility_hidden'
        }).apply(sharedDropout);

        const volatilityOutput = tf.layers.dense({
            units: 1,
            activation: 'sigmoid',
            name: 'volatility_output'
        }).apply(volatilityHidden);

        // Trend strength prediction - How strong the trend is
        const trendStrengthHidden = tf.layers.dense({
            units: 16,
            activation: 'relu',
            name: 'trend_strength_hidden'
        }).apply(sharedDropout);

        const trendStrengthOutput = tf.layers.dense({
            units: 1,
            activation: 'sigmoid',
            name: 'trend_strength_output'
        }).apply(trendStrengthHidden);

        return [directionOutput, confidenceOutput, volatilityOutput, trendStrengthOutput];
    }

    /**
     * Compile the enhanced model with multiple output heads
     */
    compileModel() {
        if (!this.model) {
            throw new Error('Model must be built before compilation');
        }

        console.log('⚙️ Compiling enhanced multi-head model...');

        // Create advanced optimizer with gradient clipping
        const optimizer = tf.train.adam({
            learningRate: this.config.learningRate,
            beta1: 0.9,
            beta2: 0.999,
            epsilon: 1e-8
        });

        // Apply gradient clipping if enabled
        if (this.config.gradientClipping > 0) {
            optimizer.clipNorm = this.config.gradientClipping;
        }

        this.model.compile({
            optimizer: optimizer,
            loss: {
                direction_output: 'categoricalCrossentropy',
                confidence_output: 'meanSquaredError',
                volatility_output: 'meanSquaredError',
                trend_strength_output: 'meanSquaredError'
            },
            metrics: {
                direction_output: ['accuracy', 'precision', 'recall'],
                confidence_output: ['meanAbsoluteError'],
                volatility_output: ['meanAbsoluteError'],
                trend_strength_output: ['meanAbsoluteError']
            },
            lossWeights: {
                direction_output: 0.5,      // Main prediction
                confidence_output: 0.25,    // Confidence estimation
                volatility_output: 0.15,    // Market volatility
                trend_strength_output: 0.1  // Trend strength
            }
        });

        this.isCompiled = true;
        console.log('✅ Enhanced model compiled successfully');
        console.log(`   - Optimizer: Adam with LR=${this.config.learningRate}`);
        console.log(`   - Gradient Clipping: ${this.config.gradientClipping}`);
        console.log(`   - Output Heads: 4 (Direction, Confidence, Volatility, Trend)`);
    }

    /**
     * Train the model
     */
    async trainModel(trainData, validationData = null) {
        if (!this.isCompiled) {
            throw new Error('Model must be compiled before training');
        }

        console.log('🎯 Starting model training...');
        console.log(`Training samples: ${trainData.x.shape[0]}`);
        console.log(`Sequence length: ${trainData.x.shape[1]}`);
        console.log(`Features: ${trainData.x.shape[2]}`);

        const callbacks = this.createTrainingCallbacks();

        try {
            this.trainingHistory = await this.model.fit(trainData.x, trainData.y, {
                epochs: this.config.epochs,
                batchSize: this.config.batchSize,
                validationData: validationData ? [validationData.x, validationData.y] : null,
                validationSplit: validationData ? 0 : this.config.validationSplit,
                callbacks: callbacks,
                verbose: 1
            });

            console.log('✅ Model training completed');
            this.updateMetrics();
            return this.trainingHistory;

        } catch (error) {
            console.error('❌ Training failed:', error);
            throw error;
        }
    }

    /**
     * Create training callbacks
     */
    createTrainingCallbacks() {
        const callbacks = [];

        // Early stopping
        callbacks.push(tf.callbacks.earlyStopping({
            monitor: 'val_direction_output_accuracy',
            patience: 15,
            restoreBestWeights: true
        }));

        // Reduce learning rate on plateau
        callbacks.push(tf.callbacks.reduceLROnPlateau({
            monitor: 'val_loss',
            factor: 0.5,
            patience: 8,
            minLr: 1e-7
        }));

        // Custom callback for logging
        callbacks.push({
            onEpochEnd: async (epoch, logs) => {
                if (epoch % 10 === 0) {
                    console.log(`Epoch ${epoch + 1}:`);
                    console.log(`  Loss: ${logs.loss.toFixed(4)}`);
                    console.log(`  Direction Accuracy: ${logs.direction_output_accuracy.toFixed(4)}`);
                    console.log(`  Confidence MAE: ${logs.confidence_output_meanAbsoluteError.toFixed(4)}`);
                    
                    if (logs.val_loss) {
                        console.log(`  Val Loss: ${logs.val_loss.toFixed(4)}`);
                        console.log(`  Val Direction Accuracy: ${logs.val_direction_output_accuracy.toFixed(4)}`);
                    }
                }
            }
        });

        return callbacks;
    }

    /**
     * Make predictions
     */
    async predict(inputData) {
        if (!this.model) {
            throw new Error('Model must be built and trained before making predictions');
        }

        try {
            const predictions = this.model.predict(inputData);
            
            // Extract direction and confidence predictions
            const directionProbs = await predictions[0].data();
            const confidenceScores = await predictions[1].data();

            // Clean up tensors
            predictions[0].dispose();
            predictions[1].dispose();

            // Process predictions
            const results = [];
            const batchSize = inputData.shape[0];

            for (let i = 0; i < batchSize; i++) {
                const directionIndex = i * 2;
                const upProb = directionProbs[directionIndex];
                const downProb = directionProbs[directionIndex + 1];
                
                results.push({
                    direction: upProb > downProb ? 'UP' : 'DOWN',
                    directionProbability: Math.max(upProb, downProb),
                    upProbability: upProb,
                    downProbability: downProb,
                    confidence: confidenceScores[i],
                    timestamp: Date.now()
                });
            }

            return results;

        } catch (error) {
            console.error('❌ Prediction failed:', error);
            throw error;
        }
    }

    /**
     * Update model metrics
     */
    updateMetrics() {
        if (!this.trainingHistory) return;

        const history = this.trainingHistory.history;
        const lastEpoch = history.direction_output_accuracy.length - 1;

        this.metrics = {
            accuracy: history.direction_output_accuracy[lastEpoch] || 0,
            precision: history.direction_output_precision[lastEpoch] || 0,
            recall: history.direction_output_recall[lastEpoch] || 0,
            loss: history.loss[lastEpoch] || 0,
            confidenceMAE: history.confidence_output_meanAbsoluteError[lastEpoch] || 0
        };

        // Calculate F1 score
        if (this.metrics.precision > 0 && this.metrics.recall > 0) {
            this.metrics.f1Score = 2 * (this.metrics.precision * this.metrics.recall) / 
                                  (this.metrics.precision + this.metrics.recall);
        }
    }

    /**
     * Save model
     */
    async saveModel(path) {
        if (!this.model) {
            throw new Error('No model to save');
        }

        try {
            await this.model.save(`file://${path}`);
            console.log(`✅ Model saved to ${path}`);
        } catch (error) {
            console.error('❌ Failed to save model:', error);
            throw error;
        }
    }

    /**
     * Load model
     */
    async loadModel(path) {
        try {
            this.model = await tf.loadLayersModel(`file://${path}`);
            this.isCompiled = true;
            console.log(`✅ Model loaded from ${path}`);
        } catch (error) {
            console.error('❌ Failed to load model:', error);
            throw error;
        }
    }

    /**
     * Print model summary
     */
    printModelSummary() {
        if (this.model) {
            console.log('\n📊 Model Summary:');
            this.model.summary();
            
            console.log('\n🔧 Model Configuration:');
            console.log(`  Sequence Length: ${this.config.sequenceLength}`);
            console.log(`  Features: ${this.config.features}`);
            console.log(`  LSTM Units: ${this.config.lstmUnits.join(', ')}`);
            console.log(`  Dense Units: ${this.config.denseUnits.join(', ')}`);
            console.log(`  Dropout: ${this.config.dropout}`);
            console.log(`  Learning Rate: ${this.config.learningRate}`);
            console.log(`  Attention: ${this.config.useAttention ? 'Enabled' : 'Disabled'}`);
            console.log(`  Residual Connections: ${this.config.useResidual ? 'Enabled' : 'Disabled'}`);
        }
    }

    /**
     * Get model metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get training history
     */
    getTrainingHistory() {
        return this.trainingHistory;
    }

    /**
     * Dispose model and free memory
     */
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.isCompiled = false;
            console.log('🗑️ Model disposed and memory freed');
        }
    }
}

module.exports = { AdvancedLSTMModel };
