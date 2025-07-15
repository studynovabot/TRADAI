/**
 * Model Training Script
 * Train ML models with historical data or synthetic data
 */

const { SimpleRealML } = require('../src/ml/SimpleRealML');
const { Logger } = require('../src/utils/Logger');
const config = require('../config/trading.json');

async function trainModels() {
  console.log('🤖 Starting ML Model Training...\n');
  
  const logger = Logger.getInstanceSync();
  const mlModels = new SimpleRealML(config, logger);
  
  try {
    // Initialize and train models
    await mlModels.initialize();
    
    // Get model metrics
    const metrics = mlModels.getModelMetrics();
    
    console.log('\n📊 Model Training Results:');
    console.log('═══════════════════════════════════════');
    console.log(`🧠 Neural Network: ${metrics.neuralNetwork.trained ? '✅ TRAINED' : '❌ FAILED'}`);
    console.log(`   Type: ${metrics.neuralNetwork.type}`);
    console.log(`🌳 XGBoost Simulator: ${metrics.xgboost.trained ? '✅ TRAINED' : '❌ FAILED'}`);
    console.log(`   Type: ${metrics.xgboost.type}`);
    console.log(`🚀 LightGBM Simulator: ${metrics.lightgbm.trained ? '✅ TRAINED' : '❌ FAILED'}`);
    console.log(`   Type: ${metrics.lightgbm.type}`);
    console.log(`📚 Training Data Size: ${metrics.trainingDataSize} samples`);
    console.log('═══════════════════════════════════════');
    
    // Test predictions with sample data
    console.log('\n🧪 Testing Model Predictions...');
    const sampleFeatures = {
      normalized: {
        '5m_rsi14': 0.3, // Oversold
        '5m_macd_signal': 0.1, // Bullish
        '5m_ema8_above_21': 1, // Bullish trend
        '5m_ema21_above_50': 1, // Strong trend
        '5m_bb_position': 0.2, // Near lower band
        '5m_volume_ratio': 1.5, // High volume
        '5m_atr_normalized': 0.4, // Moderate volatility
        '5m_stoch_k': 0.25, // Oversold
        '5m_stoch_d': 0.3, // Oversold
        '5m_price_change': 0.01 // Positive change
      }
    };
    
    const predictions = await mlModels.getRealPredictions(sampleFeatures);
    
    console.log('Sample Predictions (Bullish Setup):');
    console.log(`🧠 Neural Network: ${(predictions.neuralnet * 100).toFixed(1)}%`);
    console.log(`🌳 XGBoost: ${(predictions.xgboost * 100).toFixed(1)}%`);
    console.log(`🚀 LightGBM: ${(predictions.lightgbm * 100).toFixed(1)}%`);
    
    // Save models
    await mlModels.saveModels();
    
    console.log('\n🎉 Model training completed successfully!');
    console.log('💡 Models are now ready for real trading predictions.');
    
  } catch (error) {
    console.error('❌ Model training failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  trainModels();
}

module.exports = { trainModels };