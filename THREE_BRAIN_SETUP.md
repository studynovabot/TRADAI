# 3-Layer AI Trading System Setup Guide

## Overview

This 3-layer AI trading system provides sophisticated technical analysis for binary options trading using:

- **Layer 1**: Quant Brain (ML predictions using XGBoost, LightGBM, Neural Networks)
- **Layer 2**: Analyst Brain (LLM validation using Groq/Together AI)
- **Layer 3**: Reflex Brain (Lightning-fast execution decisions)

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- API keys for data and AI providers
- Basic understanding of binary options trading

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
# Required: Twelve Data API (for market data)
TWELVE_DATA_API_KEY=your_twelve_data_api_key

# Required: At least one AI provider
GROQ_API_KEY=your_groq_api_key
TOGETHER_API_KEY=your_together_api_key

# Trading Configuration
CURRENCY_PAIR=USD/INR
TRADE_AMOUNT=10
MIN_CONFIDENCE=75
PAPER_TRADING=true
AI_PROVIDER=groq

# Optional: Advanced Configuration
MAX_DAILY_TRADES=50
MAX_CONSECUTIVE_LOSSES=3
USE_ENSEMBLE=true
ENABLE_BACKTEST=true
```

### 4. Start the System

**Paper Trading Mode (Recommended for testing):**
```bash
npm run three-brain-paper
```

**Live Trading Mode:**
```bash
npm run three-brain
```

**Development Mode (with auto-restart):**
```bash
npm run three-brain-dev
```

## System Architecture

### Data Flow
```
Twelve Data API (every 2min) → Market Data Manager
                                      ↓
                                 Quant Brain (ML Analysis)
                                      ↓
                              Analyst Brain (LLM Validation)
                                      ↓
                              Reflex Brain (Execution Decision)
                                      ↓
                                Trade Signal/Execution
```

### Component Details

#### 1. Market Data Manager
- **Purpose**: Real-time data fetching from Twelve Data API
- **Frequency**: Every 2 minutes
- **Timeframes**: 1M, 3M, 5M, 15M, 30M, 1H
- **Features**: Rate limiting, caching, fallback to mock data

#### 2. Quant Brain (Layer 1)
- **Technology**: Simulated XGBoost, LightGBM, Neural Networks
- **Input**: Multi-timeframe OHLCV + 100+ technical features
- **Features**: 
  - RSI (14, 5 periods)
  - EMA (8, 21, 50 periods)
  - MACD with crossovers
  - Bollinger Bands
  - ATR volatility
  - Stochastic oscillator
  - Volume analysis
  - Candlestick patterns
  - Support/resistance detection
- **Output**: Direction (UP/DOWN), Confidence (0-1), Risk Score (0-1)

#### 3. Analyst Brain (Layer 2)
- **Technology**: LLaMA 3 (Groq) or Claude 3 (Together AI)
- **Purpose**: Technical confluence validation using LLM reasoning
- **Analysis**: 
  - Multi-timeframe trend alignment
  - Volume confirmation
  - Technical indicator confluence
  - Candlestick pattern reliability
  - Support/resistance levels
  - Risk factor identification
- **Output**: Validation (YES/NO/HIGH_RISK), Confidence, Reasoning

#### 4. Reflex Brain (Layer 3)
- **Technology**: Ultra-fast Groq inference
- **Purpose**: Final execution decision in < 2 seconds
- **Rules**: 
  - Both brains must agree
  - Volume confirmation required
  - Risk management checks
  - Session limits enforcement
- **Output**: Execute/Reject decision with trade details

## Configuration Options

### Trading Settings
- `CURRENCY_PAIR`: Trading pair (USD/INR, EUR/USD, etc.)
- `TRADE_AMOUNT`: Base trade amount in USD
- `MIN_CONFIDENCE`: Minimum confidence threshold (0-100)
- `PAPER_TRADING`: true/false for demo mode

### System Limits
- `MAX_DAILY_TRADES`: Maximum trades per day
- `MAX_CONSECUTIVE_LOSSES`: Stop after consecutive losses
- `MIN_CONFLUENCE_SCORE`: Minimum technical confluence (0-100)

### AI Providers
- `AI_PROVIDER`: 'groq' or 'together'
- `GROQ_API_KEY`: Groq API key for fast inference
- `TOGETHER_API_KEY`: Together AI API key for fallback

### Advanced Features
- `USE_ENSEMBLE`: Enable ensemble predictions
- `ENABLE_BACKTEST`: Enable rolling backtesting
- `ENABLE_MULTI_TIMEFRAME`: Multi-timeframe analysis
- `ENABLE_ADAPTIVE_INDICATORS`: Dynamic indicator optimization

## API Keys Setup

### 1. Twelve Data API
1. Sign up at [twelvedata.com](https://twelvedata.com)
2. Get free API key (800 requests/day)
3. Add to `.env` as `TWELVE_DATA_API_KEY`

### 2. Groq API (Recommended)
1. Sign up at [console.groq.com](https://console.groq.com)
2. Get API key for LLaMA 3 access
3. Add to `.env` as `GROQ_API_KEY`

### 3. Together AI (Optional Fallback)
1. Sign up at [together.ai](https://together.ai)
2. Get API key for Claude 3 access
3. Add to `.env` as `TOGETHER_API_KEY`

## Usage Examples

### Basic Usage
```javascript
const { ThreeBrainTradingSystem } = require('./start-three-brain-system');

const system = new ThreeBrainTradingSystem();
await system.start();
```

### Change Currency Pair
```javascript
await system.changeCurrencyPair('EUR/USD');
```

### Update Trade Result
```javascript
await system.updateTradeResult('SIGNAL_ID', true, 8.50); // Won, +$8.50
```

### Get System Status
```javascript
const stats = await system.getSystemStatus();
console.log(stats);
```

### Emergency Stop
```javascript
await system.emergencyStop('Manual stop requested');
```

## Signal Processing Flow

### Every 2 Minutes:
1. **Market Data Update**: Fetch latest OHLCV from Twelve Data API
2. **Feature Extraction**: Calculate 100+ technical indicators and patterns
3. **Quant Analysis**: ML models predict direction and confidence
4. **Analyst Validation**: LLM validates using technical confluence
5. **Execution Decision**: Reflex Brain decides to execute or reject
6. **Trade Logging**: Save signal and execution details

### Trade Execution (if approved):
- **Asset**: Configured currency pair
- **Direction**: UP or DOWN
- **Amount**: Calculated based on confidence and risk
- **Duration**: 5 minutes (binary option)
- **Expiry**: Automatic tracking for results

## Monitoring and Logs

### Real-time Monitoring
- System health status
- Processing times per brain
- Success rates and performance metrics
- Market data freshness
- API usage and limits

### Log Files
- `logs/trading.log`: Main system logs
- `data/signals/`: Signal history
- `data/trades/`: Trade execution records
- `data/training/`: ML training data
- `data/reports/`: Performance reports

### Performance Metrics
- Total signals generated
- Execution rate (% of signals executed)
- Success rate (% of winning trades)
- Average processing time
- Brain-specific performance

## Risk Management

### Built-in Safety Features
- Daily trade limits
- Consecutive loss limits
- Risk score thresholds
- Volatility limits
- Volume confirmation requirements
- Market hours restrictions

### Position Sizing
- Kelly Criterion inspired sizing
- Confidence-based adjustments
- Risk-based reductions
- Performance-based scaling

### Emergency Stops
- Automatic stops on system errors
- Manual emergency stop capability
- Graceful shutdown procedures
- Error reporting and logging

## Troubleshooting

### Common Issues

#### No API Keys
```
❌ No AI provider API keys found
```
**Solution**: Add `GROQ_API_KEY` or `TOGETHER_API_KEY` to `.env`

#### Market Data Issues
```
⚠️ Market data is stale
```
**Solution**: Check `TWELVE_DATA_API_KEY` and network connection

#### High Risk Rejection
```
❌ REJECTING TRADE: High risk conditions detected
```
**Solution**: Normal behavior - system protecting from risky trades

#### Rate Limits
```
❌ Daily API request limit reached
```
**Solution**: Upgrade Twelve Data plan or wait for daily reset

### Debug Mode
```bash
LOG_LEVEL=debug npm run three-brain
```

### Health Check
The system automatically performs health checks and displays:
- ✅ Component status
- 📊 Performance metrics
- 🔍 Error diagnostics
- 📈 Success rates

## Advanced Configuration

### Custom Indicators
Modify `src/layers/QuantBrain.js` to add custom technical indicators:

```javascript
// Add custom indicator in extractTechnicalIndicators method
const customIndicator = calculateCustomIndicator(closes);
features[`${prefix}custom_indicator`] = customIndicator;
```

### Custom Patterns
Extend `src/utils/CandlestickPatterns.js` for custom pattern detection:

```javascript
isCustomPattern(candles) {
  // Custom pattern logic
  return true/false;
}
```

### LLM Prompt Tuning
Modify `src/layers/AnalystBrain.js` to customize LLM analysis:

```javascript
generateValidationPrompt(quantPrediction, snapshot) {
  // Customize prompt for better LLM analysis
  return customPrompt;
}
```

## Support

### Documentation
- [Technical Indicators](./docs/TECHNICAL_INDICATORS.md)
- [Candlestick Patterns](./docs/CANDLESTICK_PATTERNS.md)
- [Risk Management](./docs/RISK_MANAGEMENT.md)
- [API Reference](./docs/API_REFERENCE.md)

### Community
- GitHub Issues: Report bugs and feature requests
- Discord: Real-time community support
- Documentation: Comprehensive guides and examples

### Professional Support
- Custom indicator development
- Strategy optimization
- Broker API integration
- Performance tuning

## Disclaimer

This software is for educational and research purposes. Binary options trading involves significant risk. Always:

- Start with paper trading
- Understand the risks involved
- Never trade more than you can afford to lose
- Comply with local trading regulations
- Use proper risk management

The authors are not responsible for any trading losses incurred using this system.

## License

MIT License - See LICENSE file for details.