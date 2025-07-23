/**
 * Advanced LSTM Model Architecture
 * 
 * Implements a sophisticated LSTM neural network with attention mechanisms,
 * residual connections, and proper sequence processing for time series data.
 */

const tf = require('@tensorflow/tfjs-node');

class AdvancedLSTMModel {
    constructor(config = {}) {
        this.config = {
            sequenceLength: config.sequenceLength || 60,
            features: config.features || 24,
            lstmUnits: config.lstmUnits || [256, 128, 64],
            denseUnits: config.denseUnits || [32],
            dropout: config.dropout || 0.3,
            learningRate: config.learningRate || 0.001,
            batchSize: config.batchSize || 64,
            epochs: config.epochs || 100,
            validationSplit: config.validationSplit || 0.2,
            useAttention: config.useAttention || true,
            useResidual: config.useResidual || true,
            ...config
        };

        this.model = null;
        this.isCompiled = false;
        this.trainingHistory = null;
        this.metrics = {
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            loss: 0
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
     * Add attention mechanism
     */
    addAttentionLayer(input) {
        console.log('🔍 Adding attention mechanism...');

        // Multi-head attention
        const attention = tf.layers.multiHeadAttention({
            numHeads: 8,
            keyDim: this.config.features,
            name: 'multi_head_attention'
        }).apply([input, input]);

        // Add & Norm
        const addNorm = tf.layers.add({ name: 'attention_add' }).apply([input, attention]);
        return tf.layers.layerNormalization({ name: 'attention_norm' }).apply(addNorm);
    }

    /**
     * Add LSTM layers with residual connections
     */
    addLSTMLayers(input) {
        console.log('🔄 Adding LSTM layers...');

        let x = input;
        let previousOutput = null;

        this.config.lstmUnits.forEach((units, index) => {
            const isLast = index === this.config.lstmUnits.length - 1;
            
            // LSTM layer
            const lstm = tf.layers.lstm({
                units: units,
                returnSequences: !isLast,
                dropout: this.config.dropout,
                recurrentDropout: this.config.dropout * 0.5,
                name: `lstm_${index + 1}`
            }).apply(x);

            // Batch normalization
            const batchNorm = tf.layers.batchNormalization({
                name: `lstm_batch_norm_${index + 1}`
            }).apply(lstm);

            // Dropout
            const dropout = tf.layers.dropout({
                rate: this.config.dropout,
                name: `lstm_dropout_${index + 1}`
            }).apply(batchNorm);

            // Residual connection (if dimensions match and not first layer)
            if (this.config.useResidual && previousOutput && !isLast) {
                try {
                    // Check if we can add residual connection
                    const residual = tf.layers.add({
                        name: `lstm_residual_${index + 1}`
                    }).apply([previousOutput, dropout]);
                    x = residual;
                } catch (error) {
                    // If dimensions don't match, skip residual connection
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
     * Add output layers
     */
    addOutputLayers(input) {
        console.log('📤 Adding output layers...');

        // Direction prediction (binary classification)
        const directionOutput = tf.layers.dense({
            units: 2,
            activation: 'softmax',
            name: 'direction_output'
        }).apply(input);

        // Confidence prediction (regression)
        const confidenceOutput = tf.layers.dense({
            units: 1,
            activation: 'sigmoid',
            name: 'confidence_output'
        }).apply(input);

        return [directionOutput, confidenceOutput];
    }

    /**
     * Compile the model
     */
    compileModel() {
        if (!this.model) {
            throw new Error('Model must be built before compilation');
        }

        console.log('⚙️ Compiling model...');

        this.model.compile({
            optimizer: tf.train.adam(this.config.learningRate),
            loss: {
                direction_output: 'categoricalCrossentropy',
                confidence_output: 'meanSquaredError'
            },
            metrics: {
                direction_output: ['accuracy', 'precision', 'recall'],
                confidence_output: ['meanAbsoluteError']
            },
            lossWeights: {
                direction_output: 0.7,
                confidence_output: 0.3
            }
        });

        this.isCompiled = true;
        console.log('✅ Model compiled successfully');
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
