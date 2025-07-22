# Forex Signal Generator

## Overview

The Forex Signal Generator is a sophisticated AI-powered tool designed to provide real-time trading signals for the Forex market. It offers three distinct trading modes (Sniper, Scalping, and Swing) to accommodate different trading styles and risk preferences.

## Key Features

- **Real Market Trading Only**: Designed exclusively for real Forex markets during weekdays
- **Multiple Trading Modes**: Choose between Sniper, Scalping, and Swing trading modes
- **Precise Entry Points**: Get exact entry, stop-loss, and take-profit levels
- **Risk Management**: Customize risk percentage per trade
- **Technical Analysis**: Utilizes multiple indicators and pattern recognition
- **Multi-Timeframe Analysis**: Analyzes multiple timeframes for confluence
- **Signal-Only System**: No auto-trading functionality (manual execution required)

## Trading Modes

### 1. Sniper Mode

- **Timeframes**: 1M – 2M
- **Use-case**: High frequency, low capital, fast profits
- **Analysis Depth**: Light
- **Indicators**: Price action patterns (engulfing, pinbars), EMA 9/20, RSI 7
- **RR**: Low (~0.2–0.5)
- **SL**: Small (3–5 pips), TP: Small (6–8 pips)
- **Confidence needed**: Medium (70–80%)

### 2. Scalping Mode

- **Timeframes**: 5M – 15M
- **Use-case**: Medium frequency, more analysis, better RR
- **Analysis Depth**: Medium
- **Indicators**: MACD crossover, EMA 20/50/200, RSI (14), bullish engulfing, S/R levels
- **RR**: Moderate (~1.5–2.5)
- **SL**: 8–12 pips, TP: 15–25 pips
- **Confidence**: 80%+

### 3. Swing Mode

- **Timeframes**: 30M – 1H
- **Use-case**: Very low frequency, but extremely accurate, high capital use
- **Analysis Depth**: Deep
- **Indicators**: Multi-timeframe trend confirmation, Fibonacci levels, RSI divergence, MACD reversal, volume profile, strong candle patterns
- **RR**: High (2.5–3+)
- **SL**: 20–30 pips, TP: 50–100+ pips
- **Confidence**: 85–95%

## Signal Output Format

```json
{
  "pair": "GBP/USD",
  "trade_type": "BUY",
  "entry": 1.2850,
  "stop_loss": 1.2835,
  "take_profit": 1.2885,
  "rr_ratio": 2.3,
  "confidence": 87,
  "timeframe": "5M",
  "trade_mode": "scalping",
  "reason": "MACD crossover + EMA 20/50 bull + RSI>50 + bullish engulfing",
  "risk_per_trade": "1%",
  "execution_platform": "MT5"
}
```

## Setup Instructions

1. Ensure you have a valid Twelve Data API key (or other supported market data provider)
2. Copy `.env.example` to `.env` and fill in your API keys
3. Configure the Forex Signal Generator settings in the `.env` file
4. Run the application using `npm run dev`
5. Navigate to `/forex-signal-generator` to access the Forex Signal Generator

## API Endpoint

The Forex Signal Generator exposes an API endpoint at `/api/forex-signal-generator` that accepts POST requests with the following parameters:

```json
{
  "pair": "EUR/USD",
  "trade_mode": "scalping",
  "risk": "1"
}
```

## Important Notes

- This is a SIGNAL-ONLY system - it does not execute trades automatically
- Always verify signals independently before trading
- The system is designed for weekday trading only (when real Forex markets are open)
- Past performance is not indicative of future results

## Recommended Platforms

- MetaTrader 4/5
- TradingView
- Any Forex broker platform that supports manual trade entry

## Disclaimer

Trading Forex carries a high level of risk and may not be suitable for all investors. Before deciding to trade foreign exchange, you should carefully consider your investment objectives, level of experience, and risk appetite. The possibility exists that you could sustain a loss of some or all of your initial investment and therefore you should not invest money that you cannot afford to lose.