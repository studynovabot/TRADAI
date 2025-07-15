/**
 * Create a demo TensorFlow.js model for immediate testing
 * This creates a basic model structure that can be used while training a real model
 */

async function createDemoModel() {
    console.log('🏗️ Creating demo TensorFlow.js model...');
    
    // Load TensorFlow.js
    if (typeof tf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
            script.onload = resolve;
        });
    }
    
    // Create a simple sequential model
    const model = tf.sequential({
        layers: [
            // Input layer - flattened features
            tf.layers.dense({
                inputShape: [288], // 24 candles * 12 features
                units: 128,
                activation: 'relu',
                kernelInitializer: 'glorotUniform'
            }),
            
            // Dropout for regularization
            tf.layers.dropout({ rate: 0.3 }),
            
            // Hidden layer 1
            tf.layers.dense({
                units: 64,
                activation: 'relu',
                kernelInitializer: 'glorotUniform'
            }),
            
            // Dropout
            tf.layers.dropout({ rate: 0.2 }),
            
            // Hidden layer 2
            tf.layers.dense({
                units: 32,
                activation: 'relu',
                kernelInitializer: 'glorotUniform'
            }),
            
            // Output layer - binary classification
            tf.layers.dense({
                units: 2,
                activation: 'softmax'
            })
        ]
    });
    
    // Compile the model
    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });
    
    console.log('✅ Demo model created');
    model.summary();
    
    // Save the model with the correct filename
    await model.save('downloads://trading-model');
    
    console.log('💾 Demo model saved to downloads');
    
    // Create scaling parameters
    const scalingParams = {
        mean: Array(288).fill(0).map(() => Math.random() * 2 - 1),
        std: Array(288).fill(1).map(() => 0.5 + Math.random() * 0.5),
        feature_columns: [
            'open', 'high', 'low', 'close', 'volume',
            'rsi', 'ema9', 'ema21', 'macd', 'atr', 'bb_middle', 'volume_norm'
        ]
    };
    
    // Download scaling parameters
    const blob = new Blob([JSON.stringify(scalingParams, null, 2)], 
                         { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scaling-params.json';
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📊 Scaling parameters downloaded');
    
    return model;
}

// Test the model creation
if (typeof window !== 'undefined') {
    // Browser environment
    window.createDemoModel = createDemoModel;
    
    // Auto-create on load
    document.addEventListener('DOMContentLoaded', () => {
        const button = document.createElement('button');
        button.textContent = 'Create Demo Model';
        button.onclick = createDemoModel;
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            padding: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        `;
        document.body.appendChild(button);
    });
}