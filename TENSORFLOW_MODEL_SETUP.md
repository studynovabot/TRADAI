# TensorFlow.js Model Setup for TRADAI

This guide explains how to set up and use the local TensorFlow.js model for real-time binary options prediction.

## Overview

The TRADAI extension uses a local TensorFlow.js model for real-time prediction of binary options price movements. The model:

- Runs entirely in the browser (no external API calls)
- Predicts next candle direction (Up/Down) with confidence score
- Uses real-time DOM-scraped OHLCV and indicator data
- Works across multiple timeframes
- Is optimized for speed (inference in <200ms)

## Setup Instructions

### 1. Generate Demo Model (Quick Start)

For quick testing, you can generate a demo model:

1. Open `assets/models/generate-model.html` in your browser
2. Click the "Generate Demo Model" button
3. Two files will be downloaded:
   - `trading-model.json` - The model architecture
   - `scaling-params.json` - Scaling parameters for data normalization
4. Move these files to the `assets/models/` directory

### 2. Train Custom Model (Recommended)

For better prediction accuracy, train a custom model:

1. Set up the Python environment:
   ```
   cd assets/models
   .\setup-training.ps1
   ```

2. Activate the virtual environment:
   ```
   .\trading-model-env\Scripts\Activate.ps1
   ```

3. Run the training script:
   ```
   python model-trainer.py
   ```

4. The trained model will be exported to `assets/models/tfjs-model/`
5. Rename the model files:
   - Rename `model.json` to `trading-model.json`
   - Move all `.bin` files to the `assets/models/` directory

## Testing the Model

To test the model's performance:

1. Open `test-tensorflow-model.html` in your browser
2. Click "Load Model" to initialize the TensorFlow.js model
3. Select a sample dataset or enter custom data
4. Click "Test Model" to run a prediction
5. View the results and performance metrics

## Input Data Format

The model expects input data in the following format:

```json
{
  "asset": "EUR/USD",
  "timeframe": "5m",
  "ohlcv": [
    [timestamp, open, high, low, close, volume],
    ...
  ],
  "indicators": {
    "RSI": [...],
    "EMA": [...],
    "MACD": [...],
    "BollingerBands": [...],
    "ATR": [...]
  },
  "patterns": {
    "engulfing": true,
    "pinbar": false,
    "double_top": false
  },
  "market_conditions": {
    "volatility": "high",
    "trend_direction": "up",
    "consolidation": false
  }
}
```

## Output Format

The model returns predictions in the following format:

```json
{
  "direction": "up", // or "down"
  "confidence": 87.2,
  "explanation": [
    "Detected RSI divergence on 5m",
    "MACD crossover confirmed",
    "Bullish engulfing at EMA support"
  ],
  "signal_strength": "strong",
  "inference_time": 45.23,
  "model_version": "tfjs-local-v1.0",
  "probabilities": {
    "up": 87.20,
    "down": 12.80
  },
  "timestamp": 1621234567890,
  "asset": "EUR/USD",
  "timeframe": "5m",
  "patterns_detected": ["engulfing"],
  "market_conditions": {
    "volatility": "medium",
    "trend": "up",
    "consolidation": false
  }
}
```

## Integration with Signal Engine

The TensorFlow.js model is integrated with the AI Signal Engine:

1. The Signal Engine collects market data from DOM scraping
2. Data is formatted and passed to the TensorFlow.js model
3. The model generates a prediction with confidence score
4. If confidence is ≥85%, the prediction is used for trading signals
5. The Signal Engine combines the AI prediction with technical analysis
6. The final signal is displayed in the UI and used for auto-trading

## Performance Optimization

For optimal performance:

- The model uses caching to avoid redundant predictions
- Inference is performed using `tf.tidy()` for memory management
- The model is optimized to complete inference in <200ms
- Only high-confidence predictions (≥85%) are used for trading signals

## Troubleshooting

If you encounter issues:

1. Check the browser console for error messages
2. Verify that the model files are in the correct location
3. Ensure TensorFlow.js is loading correctly
4. Try regenerating the demo model
5. Check that input data matches the expected format

For persistent issues, try clearing the browser cache and reloading the extension.