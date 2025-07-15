# 🔧 AI Candle Sniper - Technical Documentation

## Architecture Overview

### Component Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│  Popup UI (popup.html/js/css)                             │
│  ├── Signal Display                                        │
│  ├── Analysis Controls                                     │
│  ├── Settings Panel                                        │
│  └── Trade Logging                                         │
├─────────────────────────────────────────────────────────────┤
│  Background Service Worker (background.js)                 │
│  ├── Analysis Engine                                       │
│  ├── Data Orchestrator                                     │
│  ├── AI Communication                                      │
│  └── Signal Generation                                     │
├─────────────────────────────────────────────────────────────┤
│  Content Script (content.js)                              │
│  ├── Platform Detection                                    │
│  ├── Asset Monitoring                                      │
│  ├── DOM Interaction                                       │
│  └── Local Data Extraction                                 │
├─────────────────────────────────────────────────────────────┤
│  Utility Modules (utils/)                                 │
│  ├── OHLCV Fetcher                                        │
│  ├── Technical Indicators                                  │
│  └── Pattern Recognition                                   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### 1. Asset Detection Flow
```
Trading Platform → Content Script → Background Script → Popup UI
                        ↓
                   DOM Monitoring
                        ↓
              Asset Change Detection
                        ↓
                Message Broadcasting
```

### 2. Analysis Pipeline
```
Start Analysis Request
        ↓
Multi-timeframe Data Fetch
        ↓
Technical Indicators Calculation
        ↓
Pattern Recognition
        ↓
AI Model Prediction
        ↓
Signal Validation & Filtering
        ↓
Signal Display & Alerts
```

### 3. Data Sources Priority
```
Primary: Binance API (Crypto pairs)
    ↓ (fallback)
Secondary: TwelveData API (Forex/Stocks)
    ↓ (fallback)
Tertiary: Yahoo Finance (Major pairs)
    ↓ (fallback)
Quaternary: Local mock data (Development)
```

## Module Documentation

### 1. Popup Controller (`popup.js`)

#### Class: `CandleSniperUI`
**Purpose**: Manages the user interface and user interactions

**Key Methods**:
- `init()`: Initialize UI components and event listeners
- `startAnalysis()`: Begin AI analysis process
- `displaySignal()`: Show prediction results
- `playVoiceAlert()`: Text-to-speech notifications
- `logSignal()`: Store trade outcomes

**Event Handling**:
```javascript
// Message listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch(message.type) {
        case 'ANALYSIS_RESULT': this.displaySignal(message.data);
        case 'MARKET_DATA': this.updateMarketData(message.data);
        case 'ERROR': this.showError(message.data);
    }
});
```

### 2. Background Engine (`background.js`)

#### Class: `CandleSniperEngine`
**Purpose**: Core analysis engine and data orchestration

**Key Components**:
- **Analysis Manager**: Coordinates multi-timeframe analysis
- **Data Fetcher**: Retrieves OHLCV data from multiple sources
- **AI Communicator**: Interfaces with prediction models
- **Signal Validator**: Applies quality filters

**Analysis Cycle** (30-second intervals):
```javascript
async performAnalysis() {
    const marketData = await this.gatherMarketData();
    const candleData = await this.fetchMultiTimeframeData(marketData.asset);
    const indicators = this.calculateIndicators(candleData);
    const patterns = this.detectPatterns(candleData);
    const prediction = await this.getAIPrediction({candleData, indicators, patterns});
    
    if (this.validatePrediction(prediction)) {
        this.sendSignalToPopup(prediction);
    }
}
```

### 3. Content Script (`content.js`)

#### Class: `PlatformDetector`
**Purpose**: Platform-specific DOM interaction and data extraction

**Platform Support Matrix**:
| Platform | Asset Detection | Candle Extraction | Status |
|----------|----------------|-------------------|---------|
| Quotex | ✅ Advanced | 🔄 Partial | Active |
| Olymp Trade | ✅ Basic | 🔄 Partial | Active |
| IQ Option | ✅ Basic | 🔄 Partial | Active |
| Binomo | ✅ Basic | 🔄 Partial | Active |

**Asset Detection Strategy**:
```javascript
// Multiple selector approach for robustness
const selectors = [
    '.asset-select__selected .asset-select__name',
    '.asset-name',
    '.selected-asset .asset-name',
    '[class*="asset"] [class*="name"]'
];
```

### 4. OHLCV Fetcher (`utils/fetchOHLCV.js`)

#### Class: `OHLCVFetcher`
**Purpose**: Multi-source financial data aggregation

**Data Source Configuration**:
```javascript
this.dataSources = {
    binance: {
        baseUrl: 'https://api.binance.com/api/v3',
        rateLimit: 1200, // requests per minute
        supports: ['crypto']
    },
    twelvedata: {
        baseUrl: 'https://api.twelvedata.com/v1',
        rateLimit: 800,
        supports: ['forex', 'stocks', 'crypto']
    }
};
```

**Rate Limiting Strategy**:
- Request counting per source
- Automatic fallback on limits
- Exponential backoff on errors
- Cache-first approach

### 5. Technical Indicators (`utils/indicators.js`)

#### Class: `TechnicalIndicators`
**Purpose**: Professional-grade technical analysis calculations

**Supported Indicators**:
| Indicator | Formula | Purpose | Sensitivity |
|-----------|---------|---------|-------------|
| RSI | RS = AvgGain/AvgLoss | Momentum | High |
| EMA | EMA = Price×k + EMA×(1-k) | Trend | Medium |
| MACD | MACD = EMA12 - EMA26 | Trend Change | Medium |
| Bollinger | BB = SMA ± (StdDev × 2) | Volatility | Low |
| Stochastic | %K = (C-L14)/(H14-L14) | Momentum | High |

**Quality Assurance**:
- Input validation for all calculations
- Null handling for insufficient data
- Precision control (8 decimal places)
- Error isolation per indicator

### 6. Pattern Recognition (`utils/patterns.js`)

#### Class: `CandlestickPatterns`
**Purpose**: Advanced candlestick pattern detection

**Pattern Categories**:

**Single Candle Patterns**:
- Doji (Dragonfly, Gravestone, Standard)
- Hammer / Hanging Man
- Pin Bar
- Marubozu
- Spinning Top

**Multi-Candle Patterns**:
- Engulfing (Bullish/Bearish)
- Piercing Pattern / Dark Cloud Cover
- Morning Star / Evening Star
- Three White Soldiers / Three Black Crows
- Rising/Falling Three Methods

**Pattern Validation**:
```javascript
// Example: Bullish Engulfing validation
isBullishEngulfing(prev, curr) {
    return prev.close < prev.open &&        // Previous bearish
           curr.close > curr.open &&        // Current bullish
           curr.open < prev.close &&        // Opens below prev close
           curr.close > prev.open;          // Closes above prev open
}
```

## AI Model Integration

### Current Implementation: Rule-Based Engine

**Signal Generation Logic**:
```javascript
// Weighted scoring system
let bullishSignals = 0;
let bearishSignals = 0;

// RSI analysis (weight: 2)
if (indicators.RSI < 30) bullishSignals += 2;
if (indicators.RSI > 70) bearishSignals += 2;

// EMA analysis (weight: 1)
if (indicators.EMA9 > indicators.EMA21) bullishSignals += 1;

// Pattern analysis (weight: 2)
patterns.forEach(pattern => {
    if (pattern.type === 'bullish') bullishSignals += 2;
});

// Final prediction
const prediction = bullishSignals > bearishSignals ? 'UP' : 'DOWN';
const confidence = Math.min(95, 55 + (Math.abs(bullishSignals - bearishSignals) * 8));
```

### Future Implementation: Neural Network

**Planned Architecture**:
```
Input Layer (Multi-timeframe OHLCV + Indicators)
    ↓
LSTM Layers (Sequential pattern recognition)
    ↓
Attention Mechanism (Focus on relevant timeframes)
    ↓
Dense Layers (Feature combination)
    ↓
Output Layer (Direction probability + Confidence)
```

**Training Data Structure**:
```json
{
    "features": {
        "timeframes": {"1H": [...], "5M": [...], "1M": [...]},
        "indicators": {"RSI": 45.2, "EMA9": 1.2034, ...},
        "patterns": [{"name": "Bullish Engulfing", "strength": 85}]
    },
    "label": {
        "direction": 1,  // 1 for UP, 0 for DOWN
        "outcome": 1,    // 1 for correct, 0 for incorrect
        "confidence": 0.78
    }
}
```

## Performance Optimizations

### 1. Caching Strategy
- **Indicator Cache**: 5-minute TTL for calculated indicators
- **Pattern Cache**: 10-minute TTL for pattern recognition
- **OHLCV Cache**: 1-minute TTL for real-time data

### 2. Rate Limiting
- **Per-source limits**: Prevents API overuse
- **Graceful degradation**: Falls back to alternative sources
- **Request batching**: Combines multiple timeframe requests

### 3. Memory Management
- **Circular buffers**: Limit stored candle history
- **Lazy loading**: Load indicators only when needed
- **Garbage collection**: Clear old signals and logs

### 4. Error Handling
```javascript
// Resilient error handling pattern
async function withRetry(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}
```

## Security Considerations

### 1. Content Security Policy
```json
{
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'self';"
    }
}
```

### 2. Permission Management
- **Minimal permissions**: Only request necessary permissions
- **Host permissions**: Limited to trading platforms
- **No external scripts**: All code bundled with extension

### 3. Data Privacy
- **Local storage only**: No data sent to external servers
- **No tracking**: No analytics or user behavior tracking
- **API key security**: Keys stored in chrome.storage.local

## Testing Framework

### Unit Tests
```javascript
// Indicator testing
describe('Technical Indicators', () => {
    it('should calculate RSI correctly', () => {
        const mockData = generateMockOHLCV();
        const rsi = indicators.calculateRSI(mockData, 14);
        expect(rsi).toBeGreaterThan(0);
        expect(rsi).toBeLessThan(100);
    });
});
```

### Integration Tests
- **Platform compatibility**: Test on all supported platforms
- **API connectivity**: Verify data source reliability
- **Signal accuracy**: Compare predictions with actual outcomes

### Performance Tests
- **Memory usage**: Monitor extension memory footprint
- **CPU usage**: Ensure minimal impact on browser performance
- **Network usage**: Track API call frequency and data usage

## Deployment Checklist

### Pre-deployment
- [ ] All unit tests pass
- [ ] Integration tests complete
- [ ] Performance benchmarks meet targets
- [ ] Security audit complete
- [ ] Documentation updated

### Chrome Web Store Submission
- [ ] Manifest v3 compliance
- [ ] Privacy policy created
- [ ] Screenshots and descriptions prepared
- [ ] Review guidelines compliance
- [ ] Age rating assessment

### Post-deployment
- [ ] User feedback monitoring
- [ ] Performance metrics tracking
- [ ] Bug report triage
- [ ] Regular updates and improvements

## API Documentation

### Internal Messages

#### Popup ↔ Background
```javascript
// Start analysis
{type: 'START_ANALYSIS', data: {tabId, settings}}

// Analysis result
{type: 'ANALYSIS_RESULT', data: {prediction, confidence, reason}}

// Market data update
{type: 'MARKET_DATA', data: {indicators, patterns, timeframes}}
```

#### Content ↔ Background
```javascript
// Asset detected
{type: 'ASSET_DETECTED', data: {asset, platform, url}}

// Candle data
{type: 'CANDLE_DATA', data: {asset, candles, timestamp}}
```

### External APIs

#### Binance API
```javascript
// Klines endpoint
GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=100

// Response format
[
    [timestamp, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignored]
]
```

#### TwelveData API
```javascript
// Time series endpoint
GET https://api.twelvedata.com/time_series?symbol=EUR/USD&interval=5min&apikey=API_KEY

// Response format
{
    "values": [
        {"datetime": "2023-01-01 10:00:00", "open": "1.0500", "high": "1.0520", ...}
    ]
}
```

## Troubleshooting Guide

### Common Issues

#### Signal Not Generated
**Symptoms**: Extension active but no signals appear
**Causes**: 
- Insufficient data (< 50 candles)
- All signals below confidence threshold
- API rate limits reached
- Network connectivity issues

**Solutions**:
1. Check browser console for errors
2. Lower confidence threshold temporarily
3. Verify internet connection
4. Wait for rate limit reset

#### Asset Not Detected
**Symptoms**: "Asset not detected" in popup
**Causes**:
- Platform changed layout
- JavaScript disabled
- Page not fully loaded
- Unsupported platform

**Solutions**:
1. Refresh the trading platform page
2. Verify platform is supported
3. Check content script injection
4. Update asset detection selectors

#### Performance Issues
**Symptoms**: High CPU/memory usage
**Causes**:
- Too many simultaneous analyses
- Memory leaks in pattern recognition
- Excessive API calls
- Large cache sizes

**Solutions**:
1. Close unused tabs
2. Restart Chrome
3. Clear extension cache
4. Reduce analysis frequency

### Debug Commands

```javascript
// Enable debug logging
localStorage.setItem('candleSniperDebug', 'true');

// View stored signals
chrome.storage.local.get(['signalLogs'], console.log);

// Clear all data
chrome.storage.local.clear();

// Check extension status
chrome.runtime.id
```

---

**Technical Documentation Version**: 1.0  
**Last Updated**: 2024  
**Maintainer**: Ranveer Singh Rajput  
**Contact**: GitHub Issues