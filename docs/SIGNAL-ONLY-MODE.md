# TRADAI Signal-Only Mode Guide

## Overview

Signal-Only Mode converts your TRADAI bot into an AI-powered signal generator for manual execution testing. This is the recommended first phase of deployment to validate AI accuracy before enabling auto-trading.

## Quick Start

```bash
# Start signal generation
npm run signal-only

# Alternative command
npm run signals

# Or direct command
node src/index.js --signal-only
```

## Features

### 🎯 **Signal Generation**
- **Frequency**: Every 1 minute (vs 5 minutes for trading mode)
- **AI Analysis**: Comprehensive technical analysis with Groq/Together AI
- **Professional Display**: Colored terminal output with clear formatting
- **No Trade Execution**: Complete bypass of Selenium automation

### 📊 **Signal Content**
Each signal includes:
- **Direction**: BUY/SELL/NO_TRADE with confidence percentage
- **AI Reasoning**: Detailed market analysis explanation
- **Technical Summary**: RSI, MACD, Bollinger Bands, Stochastic, Volume
- **Key Factors**: Important indicators influencing the decision
- **Market Data**: Current price, change, volume
- **Risk Assessment**: Market suitability and risk level
- **Execution Guidance**: Position sizing recommendations

### 📁 **Logging & Tracking**
- **Terminal Display**: Real-time colored signal output
- **File Logging**: Signals saved to `signals/` folder
- **CSV Export**: Structured data for analysis
- **Database Storage**: Signal history and tracking

## Signal Format Example

```
══════════════════════════════════════════════════════════════════════
📉 TRADING SIGNAL #1 📉
══════════════════════════════════════════════════════════════════════
📊 SIGNAL OVERVIEW
Currency Pair: USD/INR
Direction: SELL (PUT/DOWN)
Confidence: ██████████████░░░░░░ 70%
Market Suitability: GOOD
Risk Level: MEDIUM
Timeframe: 5-minute recommendation

──────────────────────────────────────────────────────────────────────
🧠 AI REASONING
The bearish bias is evident from the Bollinger Bands squeeze and MACD 
histogram, indicating a potential downward move...

──────────────────────────────────────────────────────────────────────
🔍 KEY FACTORS
• Bollinger Bands squeeze
• MACD histogram
• Stochastic Oscillator oversold
• Bearish candlestick patterns

──────────────────────────────────────────────────────────────────────
📈 TECHNICAL SUMMARY
RSI: 50.6 (NEUTRAL) | MACD: 0 | BB: LOWER_HALF | Stoch: OVERSOLD | Volume: NORMAL

──────────────────────────────────────────────────────────────────────
💹 MARKET DATA
Current Price: 85.388
Price Change: +0.001%
Volume: 0

──────────────────────────────────────────────────────────────────────
⏰ EXECUTION GUIDANCE
Recommended Action: ⚠️ Moderate signal - Use smaller position size
Generated: 2025-07-03 20:49:01
══════════════════════════════════════════════════════════════════════
```

## Testing Phase Guidelines

### Phase 1: Signal Validation (1-2 weeks)
1. **Run signal-only mode** for 50-100+ signals
2. **Manually execute trades** based on AI recommendations
3. **Track performance** in a spreadsheet or trading journal
4. **Note signal quality** and reasoning accuracy

### Phase 2: Performance Analysis
1. **Calculate win rate** from manual trades
2. **Analyze signal confidence vs outcomes**
3. **Identify best performing timeframes**
4. **Validate risk management suggestions**

### Phase 3: Auto-Trading Transition
Once satisfied with signal accuracy:
1. **Remove --signal-only flag** to enable auto-trading
2. **Start with smaller position sizes**
3. **Monitor automated execution closely**
4. **Gradually increase position sizes**

## Configuration

### Environment Variables
```bash
# Required API keys
GROQ_API_KEY=your_groq_key
TOGETHER_API_KEY=your_together_key  # Fallback
TWELVE_DATA_API_KEY=your_twelve_data_key

# Optional settings
CURRENCY_PAIR=USD/INR  # Default trading pair
LOG_LEVEL=info         # Logging verbosity
```

### Signal Frequency
- **Signal Mode**: 1-minute intervals for real-time analysis
- **Trading Mode**: 5-minute intervals for execution

## File Structure

```
signals/
├── signals_YYYY-MM-DD.log     # Daily signal logs
├── signals_YYYY-MM-DD.csv     # CSV export for analysis
└── signal_history.db          # SQLite database
```

## Troubleshooting

### Common Issues

**1. "Insufficient data for technical analysis"**
- Ensure stable internet connection
- Check Twelve Data API key validity
- Verify API rate limits not exceeded

**2. "AI analysis failed"**
- Check Groq API key and credits
- Verify Together AI fallback configuration
- Monitor API rate limits

**3. "Signal formatter error"**
- Check log files for detailed error messages
- Ensure proper file permissions for signals folder
- Verify database connectivity

### Performance Tips

1. **Stable Connection**: Use reliable internet for consistent data
2. **API Credits**: Monitor Groq/Together AI usage
3. **System Resources**: Ensure adequate RAM/CPU for analysis
4. **Log Monitoring**: Check logs regularly for issues

## Transition Back to Auto-Trading

When ready to enable automated execution:

```bash
# Remove signal-only flag
npm start

# Or with paper trading first
npm run paper-trade
```

**Important**: The TradeExecutor will automatically initialize and Selenium automation will resume. Ensure your trading platform credentials are configured.

## Support

For issues or questions:
1. Check log files in `logs/` folder
2. Review signal history in `signals/` folder
3. Verify API configurations and credits
4. Test individual components if needed

---

**Remember**: Signal-only mode is designed for validation and learning. Take time to understand the AI's reasoning before transitioning to automated trading.
