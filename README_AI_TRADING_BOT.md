# 🤖 AI Binary Trading Bot

**Professional-grade AI-powered binary options trading system using Node.js, Groq/Together AI, and advanced technical analysis.**

## 🌟 Features

- **AI-Powered Decisions**: Uses Groq or Together AI for intelligent trade analysis
- **Real-time Data**: Live OHLCV data from Twelve Data API (1-minute intervals)
- **Advanced Technical Analysis**: RSI, MACD, Bollinger Bands, Stochastic, candlestick patterns
- **Automated Execution**: Selenium-based QXBroker integration
- **Risk Management**: Configurable stop-loss, position sizing, and drawdown protection
- **Paper Trading**: Safe testing mode before live trading
- **Comprehensive Logging**: SQLite database with performance tracking
- **Multi-Currency Support**: USD/INR, USD/BRL, USD/PKR, USD/MXN, and more

## 🚀 Quick Start

### 1. Installation

```bash
# Clone or download the project
cd ai-binary-trading-bot

# Install dependencies
npm install

# Run setup wizard
npm run setup
```

### 2. Configuration

The setup wizard will guide you through:
- API key configuration (Twelve Data, Groq/Together AI)
- QXBroker credentials
- Trading parameters
- Risk management settings

### 3. Start Trading

```bash
# Paper trading (recommended first)
npm start -- --paper-trading

# Live trading (after testing)
npm start

# Specific currency pair
npm start -- --currency-pair USD/INR
```

## 📋 Requirements

### System Requirements
- **Node.js**: 18.0.0 or higher
- **Chrome/Chromium**: For Selenium automation
- **Memory**: 2GB RAM minimum
- **Storage**: 1GB free space for logs and data

### API Keys Required
1. **Twelve Data API**: Free tier available (800 requests/day)
   - Get at: https://twelvedata.com/
   
2. **AI Provider** (choose one):
   - **Groq API**: Fast and free tier available
     - Get at: https://console.groq.com/
   - **Together AI**: Alternative AI provider
     - Get at: https://api.together.xyz/

3. **QXBroker Account**: For live trading
   - Register at: https://qxbroker.com/

## ⚙️ Configuration

### Environment Variables (.env)
```env
# API Keys
TWELVE_DATA_API_KEY=your_twelve_data_key
GROQ_API_KEY=your_groq_key
TOGETHER_API_KEY=your_together_key

# QXBroker Credentials
QXBROKER_EMAIL=your_email@example.com
QXBROKER_PASSWORD=your_password

# Trading Settings
CURRENCY_PAIR=USD/INR
TRADE_AMOUNT=10
MIN_CONFIDENCE=75
PAPER_TRADING=true
AI_PROVIDER=groq

# System Settings
SELENIUM_HEADLESS=true
LOG_LEVEL=info
```

### Trading Configuration (config/trading.json)
```json
{
  "currencyPair": "USD/INR",
  "tradeAmount": 10,
  "minConfidence": 75,
  "maxDailyTrades": 50,
  "riskManagement": {
    "maxRiskPerTrade": 2,
    "stopAfterConsecutiveLosses": 3
  }
}
```

## 🎯 How It Works

### 1. Data Collection (Every 1 Minute)
- Fetches live OHLCV data from Twelve Data
- Stores in SQLite database
- Maintains 20-candle rolling window

### 2. Technical Analysis (Every 5 Minutes)
- **RSI (14)**: Overbought/oversold conditions
- **MACD (12,26,9)**: Trend momentum and crossovers
- **Bollinger Bands**: Volatility and price position
- **Stochastic**: Additional momentum confirmation
- **Candlestick Patterns**: Doji, Hammer, Engulfing, Stars
- **Volume Analysis**: Spike detection and confirmation

### 3. AI Decision Making (Every 5 Minutes)
- Comprehensive prompt with all technical data
- AI analyzes confluence of indicators
- Returns: BUY/SELL/NO_TRADE with confidence score
- Only trades when confidence ≥ minimum threshold

### 4. Trade Execution
- **Paper Mode**: Simulated trades logged to database
- **Live Mode**: Selenium automation on QXBroker
- **Duration**: Always 5-minute binary options
- **Screenshots**: Captured for debugging and verification

## 📊 Supported Currency Pairs

- USD/INR (Indian Rupee)
- USD/BRL (Brazilian Real)
- USD/PKR (Pakistani Rupee)
- USD/MXN (Mexican Peso)
- USD/ARS (Argentine Peso)
- USD/EGP (Egyptian Pound)
- USD/BDT (Bangladeshi Taka)
- USD/DZD (Algerian Dinar)

## 🛡️ Risk Management

### Built-in Protections
- **Position Sizing**: Configurable trade amounts
- **Daily Limits**: Maximum trades per day
- **Consecutive Loss Protection**: Auto-stop after X losses
- **Confidence Filtering**: Only high-confidence trades
- **Emergency Stop**: Automatic shutdown on major losses
- **Paper Trading**: Risk-free testing mode

### Recommended Settings
- Start with paper trading for 1-2 weeks
- Use small trade amounts initially ($5-10)
- Set minimum confidence to 75%+
- Limit to 20-30 trades per day maximum
- Monitor win rate (target 60%+ for profitability)

## 📈 Performance Monitoring

### Real-time Metrics
- Win/Loss ratio
- Daily P&L
- Average confidence scores
- Trade execution times
- API response times

### Database Analytics
```bash
# View recent performance
sqlite3 data/trading.db "SELECT * FROM performance_metrics ORDER BY date DESC LIMIT 7;"

# Check trade history
sqlite3 data/trading.db "SELECT timestamp, decision, confidence, result FROM trades ORDER BY timestamp DESC LIMIT 10;"
```

## 🔧 Troubleshooting

### Common Issues

1. **Chrome/Selenium Issues**
   ```bash
   # Install Chrome on Ubuntu/Debian
   wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   sudo apt-get update
   sudo apt-get install google-chrome-stable
   ```

2. **API Rate Limits**
   - Twelve Data: 800 requests/day (free tier)
   - Groq: Generous free tier
   - Monitor usage in logs

3. **QXBroker Login Issues**
   - Verify credentials in .env file
   - Check for 2FA requirements
   - Review screenshots in logs/screenshots/

4. **Database Errors**
   ```bash
   # Reset database
   rm data/trading.db
   npm run setup
   ```

### Log Files
- **Main Log**: `logs/trading.log`
- **Error Log**: `logs/error.log`
- **Screenshots**: `logs/screenshots/`

## 🚨 Important Disclaimers

⚠️ **Trading Risk Warning**: Binary options trading involves substantial risk of loss. Never trade with money you cannot afford to lose.

⚠️ **No Guarantees**: This bot is for educational purposes. Past performance does not guarantee future results.

⚠️ **Compliance**: Ensure binary options trading is legal in your jurisdiction.

⚠️ **Testing Required**: Always test thoroughly in paper trading mode before risking real money.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review log files for error details
3. Ensure all API keys are valid and have sufficient quotas
4. Test individual components (data collection, AI analysis, etc.)

## 🔄 Updates and Maintenance

- Monitor API changes from providers
- Update selectors if QXBroker changes their interface
- Regularly backup your database and configuration
- Keep dependencies updated for security

---

**Remember**: Start with paper trading, use proper risk management, and never risk more than you can afford to lose. This is a sophisticated tool that requires understanding and careful operation.
