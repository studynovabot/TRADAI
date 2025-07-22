# QXBroker OTC Signal Generator

## Overview

The QXBroker OTC Signal Generator is a comprehensive system for generating high-quality trading signals for OTC (Over-The-Counter) markets on QXBroker. It combines browser automation, OCR (Optical Character Recognition), multi-timeframe analysis, pattern recognition, and AI-powered signal generation to provide reliable trading signals.

## Features

- **Browser Automation**: Automatically logs in to QXBroker and navigates to the trading interface
- **Multi-Timeframe Analysis**: Analyzes data across multiple timeframes (1H, 30M, 15M, 5M, 3M, 1M)
- **OCR Technology**: Extracts candlestick data directly from QXBroker charts
- **Pattern Recognition**: Identifies candlestick patterns and technical setups
- **Indicator Analysis**: Calculates and analyzes multiple technical indicators:
  - EMA (9, 21, 50)
  - MACD
  - RSI
  - Bollinger Bands
  - Stochastic Oscillator
  - Support/Resistance levels
- **Historical Validation**: Validates signals against historical data
- **Confluence Scoring**: Calculates confidence scores based on multiple factors
- **Detailed Reasoning**: Provides comprehensive explanations for each signal
- **Self-Diagnostics**: Includes self-monitoring and error recovery mechanisms

## Setup

### Prerequisites

- Node.js 18 or higher
- QXBroker account credentials
- Chrome browser installed

### Installation

1. Run the setup script:

```bash
npm run setup:qxbroker-otc
```

This script will:
- Create necessary directories
- Install required dependencies
- Set up environment variables
- Test the connection to QXBroker

2. Ensure your QXBroker credentials are set in the `.env` file:

```
QXBROKER_EMAIL=your_email@example.com
QXBROKER_PASSWORD=your_password
```

### Running the Signal Generator

1. Start the development server:

```bash
npm run dev
```

2. Navigate to the QXBroker OTC Signal Generator page:

```
http://localhost:3000/qxbroker-otc-signals
```

Alternatively, use the convenience script:

```bash
npm run qxbroker-otc
```

## Usage

1. Select the asset (default: GBP/USD)
2. Choose the timeframes to analyze
3. Set the trade duration
4. Click "Generate Signal"

The system will:
1. Log in to QXBroker
2. Navigate to the selected asset
3. Capture chart data across all selected timeframes
4. Analyze the data using multiple technical approaches
5. Generate a signal with confidence score and detailed reasoning

## API Endpoints

### Generate Signal

```
POST /api/qxbroker-otc-signal
```

Request body:
```json
{
  "asset": "GBP/USD",
  "timeframes": ["1H", "30M", "15M", "5M", "3M", "1M"],
  "tradeDuration": "5 minutes"
}
```

Response:
```json
{
  "success": true,
  "requestId": "API_1627384950000_abc123",
  "processingTime": 15000,
  "asset": "GBP/USD",
  "signal": "UP",
  "confidence": "85%",
  "confidenceNumeric": 85,
  "riskScore": "LOW",
  "reason": [
    "Strong bullish momentum across multiple timeframes",
    "Price breaking above key resistance level at 1.2450",
    "RSI showing bullish divergence on 5M timeframe",
    "Historical pattern match with 87% accuracy"
  ],
  "timestamp": "2023-07-27T12:34:56.789Z",
  "analysis": {
    "multiTimeframe": { ... },
    "pattern": { ... },
    "historical": { ... }
  },
  "metadata": {
    "source": "qxbroker_otc",
    "timeframes": ["1H", "30M", "15M", "5M", "3M", "1M"],
    "dataQuality": {
      "overall": 92,
      "timeframes": { ... }
    }
  }
}
```

### Health Check

```
GET /api/qxbroker-otc-signal/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2023-07-27T12:34:56.789Z",
  "signalGenerator": {
    "status": "healthy",
    "initialized": true,
    "loggedIn": true,
    "currentAsset": "GBP/USD",
    "currentTimeframe": "5M",
    "timeframeDataAvailable": ["1H", "30M", "15M", "5M", "3M", "1M"],
    "errors": 0
  }
}
```

## Troubleshooting

### Common Issues

1. **Browser Automation Fails**
   - Ensure Chrome is installed and up to date
   - Check that your QXBroker credentials are correct
   - Verify your internet connection

2. **OCR Data Extraction Issues**
   - The system will automatically fall back to historical data if OCR fails
   - Check the diagnostics logs for specific errors

3. **No Signal Generated**
   - Ensure you have selected valid timeframes
   - Check the error message for specific issues
   - Verify that QXBroker is accessible

### Diagnostic Logs

Diagnostic logs are stored in the `data/diagnostics` directory. Each signal generation attempt creates a log file with detailed information about the process.

## Architecture

The QXBroker OTC Signal Generator consists of several components:

1. **QXBrokerOTCSignalGenerator**: Core class that orchestrates the entire process
2. **BrowserAutomation**: Handles browser interaction with QXBroker
3. **ChartDataExtractor**: Extracts candlestick data from chart screenshots
4. **MultiTimeframeAnalyzer**: Analyzes data across multiple timeframes
5. **OTCPatternMatcher**: Identifies candlestick patterns
6. **HistoricalDataMatcher**: Validates signals against historical data
7. **SignalConsensusEngine**: Combines all analyses to generate the final signal

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Support

For support, please contact the development team or create an issue in the repository.