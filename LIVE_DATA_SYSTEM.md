# 🎯 AI Candle Sniper - Live Data Collection System

## 🚀 Real-Time Multi-Timeframe Analysis Engine

This document explains the enhanced live data collection system that forms the foundation of the AI Candle Sniper extension.

## 📊 **System Overview**

### **Core Functionality**
- **Automatic Asset Detection**: Detects currency pairs across all supported platforms
- **Multi-Timeframe Data Collection**: Gathers data from 6 timeframes simultaneously
- **Real-Time Analysis**: Continuous monitoring every 15-30 seconds
- **Intelligent Fallbacks**: Multiple data sources with graceful degradation
- **Structured Data Pipeline**: Optimized for AI processing

### **Supported Timeframes**
- 1H (1 Hour) - Long-term trend context
- 30M (30 Minutes) - Medium-term momentum
- 15M (15 Minutes) - Short-term trend confirmation
- 5M (5 Minutes) - Entry timing precision
- 3M (3 Minutes) - Fine-tuning signals
- 1M (1 Minute) - Execution timing

## 🏗️ **Architecture**

### **Data Flow Pipeline**
```
Platform Detection → Asset Recognition → Multi-Timeframe Collection → 
Technical Analysis → AI Processing → Signal Generation → User Display
```

### **Key Components**

#### 1. **PlatformDetector Class** (`content.js`)
```javascript
class PlatformDetector {
    // Real-time data collection and DOM interaction
    async continuousDataCollection()
    async collectMultiTimeframeData(asset)
    async extractTimeframeCandles(asset, timeframe)
}
```

#### 2. **CandleSniperEngine Class** (`background.js`)
```javascript
class CandleSniperEngine {
    // Data processing and AI integration
    async processStructuredMarketData(structuredData)
    async calculateIndicatorsFromStructured(structuredData)
    async getAIPredictionFromStructured(aiInput)
}
```

## 🔍 **Asset Detection**

### **Platform-Specific Detection**
- **Quotex**: Multiple DOM selector strategies
- **Olymp Trade**: Asset name extraction
- **IQ Option**: Symbol detection
- **Binomo**: Asset selection monitoring

### **Detection Methods**
```javascript
// Example Quotex detection
const selectors = [
    '.asset-select__selected .asset-select__name',
    '.asset-name',
    '.selected-asset .asset-name',
    '[class*="asset"] [class*="name"]'
];
```

## 📈 **Data Collection Strategy**

### **Multi-Source Approach**
1. **Primary**: Platform DOM scraping
2. **Secondary**: Browser storage/globals
3. **Tertiary**: External APIs (Binance, TwelveData)
4. **Fallback**: Realistic mock data generation

### **Data Quality Assessment**
```javascript
assessDataQuality(data) {
    const timeframeCount = Object.keys(data).length;
    const totalCandles = Object.values(data).reduce((sum, candles) => sum + candles.length, 0);
    
    if (timeframeCount >= 5 && totalCandles >= 100) return 'excellent';
    if (timeframeCount >= 3 && totalCandles >= 60) return 'good';
    if (timeframeCount >= 2 && totalCandles >= 30) return 'fair';
    return 'poor';
}
```

## 🧠 **AI-Ready Data Structure**

### **Structured Market Data Format**
```json
{
    "symbol": "EUR/USD",
    "platform": "quotex",
    "timestamp": 1647890123456,
    "dataQuality": "excellent",
    "structure": {
        "1H": {
            "candles": [...],
            "lastPrice": 1.08500,
            "trend": "bullish",
            "volatility": "normal",
            "volume": 1250
        },
        "5M": {
            "candles": [...],
            "lastPrice": 1.08505,
            "trend": "bullish",
            "volatility": "low",
            "volume": 850
        }
    }
}
```

### **Technical Analysis Integration**
```javascript
// Enhanced indicators calculation
const indicators = {
    RSI: calculateRSI(candles, 14),
    EMA9: calculateEMA(candles, 9),
    EMA21: calculateEMA(candles, 21),
    EMA50: calculateEMA(candles, 50),
    MACD: calculateMACD(candles),
    BollingerBands: calculateBollingerBands(candles, 20, 2),
    ATR: calculateATR(candles, 14),
    trends: multiTimeframeTrends
};
```

## 🎯 **Signal Generation**

### **Enhanced Rule-Based AI**
```javascript
getEnhancedRuleBasedPrediction(aiInput) {
    let bullishSignals = 0;
    let bearishSignals = 0;
    let reasons = [];
    
    // Multi-timeframe trend confluence
    const bullishTrends = Object.values(trends).filter(t => t === 'bullish').length;
    
    // Enhanced RSI analysis
    if (indicators.RSI < 25) {
        bullishSignals += 3;
        reasons.push('RSI extremely oversold');
    }
    
    // EMA confluence
    if (EMA9 > EMA21 && EMA21 > EMA50) {
        bullishSignals += 3;
        reasons.push('Strong EMA alignment');
    }
    
    // Pattern analysis with timeframe weighting
    patterns.forEach(pattern => {
        let weight = pattern.timeframe === '1H' ? 3 : 
                    pattern.timeframe === '15M' ? 2 : 1;
        
        if (pattern.type === 'bullish') {
            bullishSignals += weight;
            reasons.push(`${pattern.name} (${pattern.timeframe})`);
        }
    });
    
    return {
        prediction: bullishSignals > bearishSignals ? 'UP' : 'DOWN',
        confidence: calculateConfidence(signalStrength, dataQuality),
        reason: reasons.slice(0, 3).join(' + '),
        risk: determineRiskLevel(confidence),
        timestamp: Date.now()
    };
}
```

## 🔧 **Configuration Options**

### **Scan Settings**
```javascript
// Configurable parameters
this.timeframes = ['1H', '30M', '15M', '5M', '3M', '1M'];
this.requiredCandles = 24;
this.scanInterval = 20000; // 20 seconds
this.minConfidence = 65;
```

### **Quality Filters**
- Minimum 3 timeframes required
- At least 10 candles per timeframe
- Data age validation
- Platform stability checks

## 🧪 **Testing & Debugging**

### **Test Page Features**
- Live data collection simulation
- Multi-timeframe visualization
- Real-time indicator updates
- Pattern detection display
- AI signal simulation

### **Console Access**
```javascript
// Access debugging features
window.candleSniperDetector.getCurrentAsset()
window.testExtension.startDataCollection()
window.testExtension.generateMockData()
```

## 📈 **Performance Optimization**

### **Efficient Data Handling**
- Lazy loading of external scripts
- Cached data with TTL
- Selective DOM querying
- Batch processing
- Memory management

### **Error Handling**
- Graceful degradation
- Multiple fallback strategies
- Detailed error logging
- Recovery mechanisms

## 🔮 **Future Enhancements**

### **Planned Features**
- WebSocket integration for real-time feeds
- Advanced pattern recognition AI
- Custom indicator support
- Historical backtesting
- Performance analytics

### **AI Model Integration**
- TensorFlow.js local inference
- Custom FastAPI backend
- Cloud-based prediction service
- Model versioning and updates

## 🚀 **Usage Examples**

### **Basic Implementation**
```javascript
// Start live analysis
const detector = new PlatformDetector();
await detector.startCandleMonitoring();

// Listen for structured data
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STRUCTURED_MARKET_DATA') {
        const marketData = message.data;
        console.log('Live data:', marketData);
    }
});
```

### **Custom Configuration**
```javascript
// Configure analysis parameters
detector.scanInterval = 15000; // 15 seconds
detector.timeframes = ['1H', '15M', '5M']; // Custom timeframes
detector.requiredCandles = 30; // More historical data
```

## 📝 **Development Notes**

### **Code Structure**
- Modular design with clear separation
- Async/await for better flow control
- Comprehensive error handling
- Extensive logging for debugging

### **Best Practices**
- Non-blocking operations
- Efficient DOM manipulation
- Smart caching strategies
- Clean resource management

## 🔗 **Related Files**
- `content.js` - Platform detection and data collection
- `background.js` - Data processing and AI integration
- `utils/indicators.js` - Technical analysis functions
- `utils/patterns.js` - Pattern recognition
- `test-live-data.html` - Testing interface

---

**Built with precision for professional binary options analysis** 🎯

*This system forms the foundation for accurate, real-time trading signals with institutional-grade reliability.*