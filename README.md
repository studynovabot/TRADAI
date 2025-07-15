# 🎯 AI Candle Sniper - Professional Binary Options Predictor

A sophisticated Chrome Extension that leverages AI and advanced technical analysis to predict binary options candle movements with high accuracy.

## 🚀 Features

### 🧠 **AI-Powered Predictions**
- Multi-timeframe analysis (1H, 30M, 15M, 5M, 3M, 1M)
- Neural network-based prediction engine
- Real-time confidence scoring
- Detailed reasoning for each signal

### 📊 **Technical Analysis Engine**
- **Indicators**: RSI, EMA (9,21,50), MACD, Bollinger Bands, ATR, Stochastic, Williams %R
- **Pattern Recognition**: Engulfing, Doji, Hammer, Pin Bar, Morning/Evening Star, Three Soldiers/Crows
- **Volume Analysis**: Volume trend and confirmation signals
- **Market Context**: Trend detection and volatility analysis

### 🎪 **Platform Support**
- ✅ Quotex
- ✅ Olymp Trade  
- ✅ IQ Option
- ✅ Binomo
- 🔄 Generic platform detection

### 🎨 **Professional UI**
- Modern, intuitive design
- Real-time signal display
- Interactive charts and indicators
- Voice alerts and notifications
- Comprehensive trade logging

### 🛡️ **Risk Management**
- Confidence threshold filtering
- Anti-overtrading protection
- Market condition filters
- Signal validation layers

## 📋 Installation

### Method 1: Developer Mode (Recommended)

1. **Download the Extension**
   ```bash
   git clone https://github.com/ranveer-singh/ai-candle-sniper.git
   cd ai-candle-sniper
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the extension folder

3. **Pin the Extension**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "AI Candle Sniper" and pin it

### Method 2: Chrome Web Store
*Coming soon - pending review*

## 🎯 Quick Start Guide

### 1. **Setup**
- Open your preferred binary options platform (Quotex, Olymp Trade, etc.)
- Click the AI Candle Sniper extension icon
- The extension will automatically detect the current asset

### 2. **Configuration**
- Set your minimum confidence threshold (recommended: 65%+)
- Enable/disable voice alerts
- Choose auto-analysis mode if desired

### 3. **Start Analysis**
- Click "Start AI Analysis"
- Wait for the first signal (typically 30-60 seconds)
- Review the prediction, confidence, and reasoning

### 4. **Trade Execution**
- Use the provided signal as guidance
- Set your trade amount according to your risk management
- Enter the trade during the countdown timer window
- Log the outcome for performance tracking

## 📊 Understanding Signals

### Signal Components
```
Prediction: UP/DOWN
Confidence: 65-95% (recommended minimum: 65%)
Reason: "RSI oversold + Bullish engulfing + EMA21 support"
Volatility: Low/Normal/High
Risk: Low/Medium/High
```

### Signal Quality
- **🟢 85%+ Confidence**: High probability trades
- **🟡 70-84% Confidence**: Good probability trades  
- **🔴 65-69% Confidence**: Acceptable with caution
- **❌ <65% Confidence**: Automatically filtered out

## 🧠 AI Model Details

### TensorFlow.js Local Model
The extension uses a fully local TensorFlow.js model that runs directly in your browser:
- **No external API calls** for predictions
- **Fast inference** (<200ms per prediction)
- **Privacy-focused** (all data stays in your browser)
- **Works offline** after initial setup

For detailed setup instructions, see [TENSORFLOW_MODEL_SETUP.md](TENSORFLOW_MODEL_SETUP.md).

### Multi-Timeframe Analysis
The AI analyzes 6 different timeframes simultaneously:
- **1H**: Long-term trend context
- **30M**: Medium-term momentum
- **15M**: Short-term trend confirmation  
- **5M**: Entry timing precision
- **3M**: Fine-tuning signals
- **1M**: Execution timing

### Technical Indicators Used
```javascript
RSI (14): Momentum oscillator
EMA 9/21/50: Trend direction
MACD: Trend changes
Bollinger Bands: Volatility and support/resistance
ATR: Volatility measurement
Stochastic: Overbought/oversold
Williams %R: Price position
Volume: Confirmation signals
```

### Pattern Recognition
- **Reversal Patterns**: Engulfing, Morning/Evening Star, Hammer, Doji
- **Continuation Patterns**: Three Soldiers/Crows, Pin Bars
- **Consolidation Patterns**: Inside Bars, Spinning Tops

### AI Model Architecture
```
Input → Dense (128) → ReLU → Dropout → Dense (64) → ReLU → Output (2 Softmax)
```

The model takes 24 candles with 12 features per candle as input and outputs a directional prediction (UP/DOWN) with confidence score.

## 🔧 Advanced Configuration

### API Keys Setup (Optional)
For enhanced data feeds, you can configure API keys:

```javascript
// In browser console or settings
chrome.storage.local.set({
  aiConfig: {
    endpoint: 'http://localhost:8000', // Your AI server
    twelveDataKey: 'your-api-key',     // TwelveData API
    alphaVantageKey: 'your-api-key'    // Alpha Vantage API
  }
});
```

### Custom AI Model Options

#### Option 1: Local TensorFlow.js Model (Default)
The extension uses a local TensorFlow.js model by default:

1. Generate or train a model using the provided tools
2. Place model files in the `assets/models/` directory
3. The extension will automatically use your local model

#### Option 2: Custom AI Endpoint (Optional)
If you prefer to use an external AI service:

1. Deploy the FastAPI backend (see `/backend` folder)
2. Update the AI endpoint in extension settings
3. The extension will use your custom API as a fallback

## 📈 Performance Tracking

### Built-in Analytics
- Win/loss ratio tracking
- Daily signal count
- Performance by time of day
- Asset-specific success rates

### Export Data
Access your trading data:
```javascript
// In browser console
chrome.storage.local.get(['signalLogs'], (result) => {
  console.log(result.signalLogs);
});
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 16+
- Python 3.8+ (for AI backend)
- Chrome Browser

### Local Development
```bash
# Clone the repository
git clone https://github.com/ranveer-singh/ai-candle-sniper.git
cd ai-candle-sniper

# Install dependencies (if using build tools)
npm install

# Load extension in Chrome developer mode
# chrome://extensions/ > Load unpacked
```

### Backend Setup (Optional)
```bash
# Navigate to backend folder
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run the AI server
python app.py

# Server runs on http://localhost:8000
```

## 🔍 Troubleshooting

### Common Issues

**1. Asset Not Detected**
- Refresh the trading platform page
- Ensure you're on a supported platform
- Check browser console for errors

**2. No Signals Generated**
- Verify internet connection
- Check if platform is loading correctly
- Try refreshing the extension

**3. API Errors**
- Check if API keys are configured correctly
- Verify API rate limits haven't been exceeded
- Try switching to mock data mode for testing

**4. Extension Not Loading**
- Disable other trading extensions
- Clear browser cache
- Reinstall the extension

### Debug Mode
Enable debug logging:
```javascript
localStorage.setItem('candleSniperDebug', 'true');
```

## 📜 Disclaimer

**⚠️ Important Risk Warning**

This extension is for educational and informational purposes only. Binary options trading carries significant financial risk:

- Past performance does not guarantee future results
- AI predictions are not 100% accurate
- You can lose all invested capital
- Only trade with money you can afford to lose
- Consider seeking advice from financial professionals

The developers are not responsible for any financial losses incurred through the use of this extension.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/ranveer-singh/ai-candle-sniper/issues)
- **Documentation**: [Wiki](https://github.com/ranveer-singh/ai-candle-sniper/wiki)
- **Discussions**: [Community Forum](https://github.com/ranveer-singh/ai-candle-sniper/discussions)

## 🏆 Acknowledgments

- Technical Analysis Library inspirations
- Chrome Extension development community
- Binary options trading community feedback
- Open source AI/ML libraries

---

**Built with ❤️ for the trading community by Ranveer Singh Rajput**

*"Precision in prediction, excellence in execution"*