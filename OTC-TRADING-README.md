# OTC Trading Signal Generator with Next Candle Prediction

## Overview

This module provides a sophisticated OTC (Over-The-Counter) trading signal generator that uses real market data from multiple sources to generate high-confidence trading signals for binary options trading. It includes advanced next candle prediction capabilities for precise entry timing and improved accuracy.

## Features

- **Real-Time Data Collection**: Uses browser automation to capture real-time market data from broker platforms
- **OCR & Image Processing**: Extracts candlestick and indicator data from chart screenshots
- **Multi-Source Data Fusion**: Combines data from browser automation, historical databases, and external financial APIs
- **Multi-Timeframe Analysis**: Analyzes multiple timeframes for improved signal accuracy
- **Advanced Pattern Matching**: Identifies historical patterns that match current market conditions
- **Technical Indicator Analysis**: Analyzes RSI, MACD, Bollinger Bands, and other indicators
- **Consensus Engine**: Combines pattern and indicator signals for high-confidence predictions
- **Next Candle Prediction**: Predicts the next candle with high accuracy using multiple prediction models
- **Probability Distribution**: Calculates probability distribution for next candle price movements
- **Confidence Intervals**: Provides confidence intervals for next candle predictions
- **Strict Data Quality Controls**: Ensures only high-quality data is used for signal generation
- **Fallback Mechanisms**: Gracefully handles failures with multiple fallback data sources

## Architecture

The system consists of the following key components:

1. **EnhancedOTCSignalGenerator**: Main class that orchestrates the signal generation process
2. **BrowserAutomation**: Handles browser automation for real-time data collection
3. **ChartDataExtractor**: Extracts candlestick and indicator data from chart screenshots
4. **OTCPatternMatcher**: Identifies matching patterns in historical data
5. **NextCandlePredictor**: Predicts the next candle with high accuracy
6. **External API Integrations**: Yahoo Finance, Alpha Vantage, Twelve Data

## Data Collection Strategy

The system uses a sophisticated data collection strategy that prioritizes real market data:

1. **Browser Automation**: Captures real-time data from broker platforms using Playwright
2. **Recent Historical Data**: Uses recent real data from the historical database
3. **External Financial APIs**: Fetches data from Yahoo Finance, Alpha Vantage, and Twelve Data
4. **Any Historical Data**: Uses any available historical data as a fallback
5. **Simulated Data**: Only used as a last resort and if not in strict mode

## Signal Generation Process

1. **Data Collection**: Collects real market data from multiple sources
2. **Multi-Timeframe Analysis**: Analyzes multiple timeframes for improved accuracy
3. **Pattern Matching**: Identifies historical patterns that match current market conditions
4. **Technical Indicator Analysis**: Analyzes RSI, MACD, Bollinger Bands, and other indicators
5. **Consensus Generation**: Combines pattern and indicator signals for high-confidence predictions
6. **Next Candle Prediction**: Predicts the next candle using multiple prediction models
7. **Signal Validation**: Validates the signal against minimum confidence requirements
8. **Signal Finalization**: Adds metadata and finalizes the signal

## Configuration

The system can be configured using environment variables:

```
# Data Collection
STRICT_REAL_DATA_MODE=true       # Only use real market data
FORCE_REAL_DATA=true             # Force using real data (no simulated data)
FORCE_BROWSER_AUTOMATION=true    # Force using browser automation
BROWSER_HEADLESS=false           # Run browser in headless mode
BROKER_PLATFORM=quotex           # Broker platform to use

# API Keys
ALPHA_VANTAGE_API_KEY=your_key   # Alpha Vantage API key
TWELVE_DATA_API_KEY=your_key     # Twelve Data API key

# Analysis
ENABLE_MULTI_TIMEFRAME=true      # Enable multi-timeframe analysis
MIN_SIGNAL_CONFIDENCE=75         # Minimum confidence for signal generation

# Performance
MAX_DATA_COLLECTION_RETRIES=3    # Maximum retries for data collection
DATA_COLLECTION_TIMEOUT=60000    # Timeout for data collection (ms)
```

## Usage

```javascript
const { EnhancedOTCSignalGenerator } = require('./src/core/EnhancedOTCSignalGenerator');

async function generateOTCSignal() {
    // Initialize the signal generator
    const signalGenerator = new EnhancedOTCSignalGenerator({
        strictRealDataMode: true,
        forceRealData: true,
        enableMultiTimeframe: true
    });
    
    // Generate signal
    const signal = await signalGenerator.generateSignal({
        pair: 'EUR/USD OTC',
        timeframe: '5M',
        tradeDuration: '3 minutes',
        platform: 'quotex',
        useRealData: true
    });
    
    console.log(signal);
}

generateOTCSignal();
```

## Signal Output

The signal output includes:

```json
{
  "pair": "EUR/USD OTC",
  "timeframe": "5M",
  "direction": "UP",
  "confidence": 85,
  "riskScore": "LOW",
  "reason": "UP signal with 85% confidence",
  "reasoning": [
    "Pattern analysis: UP (80% confidence)",
    "Indicator analysis: UP (90% confidence)",
    "Full agreement between pattern and indicator analysis"
  ],
  "nextCandle": {
    "prediction": "UP",
    "confidence": 82,
    "expectedMove": 0.00075,
    "details": {
      "open": 1.05620,
      "high": 1.05710,
      "low": 1.05590,
      "close": 1.05695
    },
    "analysis": "RSI: 65 (Neutral)\nMACD: Bullish (Histogram: Positive)\nBollinger Bands: Price near Middle\nDetected Patterns:\n- Bullish Engulfing: UP (80% strength)",
    "probabilityDistribution": {
      "strongUp": 0.15,
      "moderateUp": 0.35,
      "slightUp": 0.30,
      "neutral": 0.15,
      "slightDown": 0.03,
      "moderateDown": 0.02,
      "strongDown": 0.00
    }
  },
  "dataSourcesUsed": {
    "otc": "browser-automation",
    "historical": "pattern-matcher"
  },
  "generatedAt": "2025-07-20T12:34:56.789Z",
  "tradeDuration": "3 minutes",
  "metadata": {
    "patternMatchCount": 5,
    "indicatorCount": 3,
    "predictionAgreement": "full",
    "dataSource": "browser-automation",
    "timestamp": 1721565296789
  }
}
```

## Testing

To run all tests in sequence:

```bash
node run-otc-tests.js
```

Or run individual tests:

```bash
# Test OTC signal generator
node test-enhanced-otc.js

# Test next candle prediction
node test-next-candle-prediction.js
```

## Dependencies

- **Playwright**: Browser automation
- **Tesseract OCR**: OCR for chart data extraction
- **OpenCV**: Image processing for chart data extraction
- **Sharp**: Image enhancement for better OCR
- **Node-Fetch**: HTTP requests for external APIs
- **FS-Extra**: File system operations

## Installation

```bash
npm install playwright dotenv fs-extra node-fetch
```

Optional dependencies for enhanced functionality:

```bash
npm install tesseract.js opencv4nodejs sharp
```

## Troubleshooting

- **Browser Automation Fails**: Check if Playwright is installed and the browser is accessible
- **OCR Fails**: Check if Tesseract OCR is installed and configured correctly
- **External APIs Fail**: Check if API keys are valid and rate limits are not exceeded
- **No Signal Generated**: Check minimum confidence requirements and data quality

## Best Practices

1. **Use Real Data**: Always use real market data for signal generation
2. **Multi-Timeframe Analysis**: Enable multi-timeframe analysis for improved accuracy
3. **Strict Data Quality**: Use strict data quality controls to ensure reliable signals
4. **Regular Testing**: Regularly test the system with different currency pairs and timeframes
5. **Monitor Performance**: Monitor signal performance and adjust parameters as needed

## Limitations

- **Browser Automation**: Requires a browser to be installed and accessible
- **OCR Accuracy**: OCR accuracy depends on chart quality and resolution
- **API Rate Limits**: External APIs may have rate limits
- **Market Conditions**: Signal accuracy depends on market conditions

## Future Improvements

- **Advanced OCR**: Improve OCR accuracy with deep learning models
- **More Data Sources**: Add more data sources for improved reliability
- **Advanced Indicators**: Add more technical indicators for improved analysis
- **Machine Learning**: Use machine learning for pattern recognition and signal generation
- **Real-Time Updates**: Add real-time updates for live trading