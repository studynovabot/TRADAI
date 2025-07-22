# Forex Signal Generator Quick Start Guide

## Introduction

The Forex Signal Generator is a powerful tool that provides accurate trading signals based on real-time market data and advanced technical analysis. This guide will help you get started with using the system for your trading.

## Setup

### API Keys

For optimal performance with real market data, set up the following API keys:

1. **TwelveData API**: Get a free API key from [TwelveData](https://twelvedata.com/)
2. **Alpha Vantage API**: Get a free API key from [Alpha Vantage](https://www.alphavantage.co/)
3. **Finnhub API**: Get a free API key from [Finnhub](https://finnhub.io/)
4. **Polygon API**: Get a free API key from [Polygon](https://polygon.io/)

Add these keys to your `.env` file:

```
TWELVE_DATA_API_KEY=your_key_here
ALPHA_VANTAGE_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
POLYGON_API_KEY=your_key_here
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```

## Using the Forex Signal Generator

### Web Interface

1. Open your browser and navigate to `http://localhost:3000/forex-signal-generator`
2. Select a currency pair (e.g., EUR/USD, GBP/USD)
3. Choose a trading mode:
   - **Sniper**: Quick trades with tight stop-loss (1-5 minute timeframe)
   - **Scalping**: Short-term trades (5-15 minute timeframe)
   - **Swing**: Longer-term trades (1-4 hour timeframe)
4. Set your risk percentage (1-5% recommended)
5. Click "Generate Signal" to receive your trading signal

### API Usage

You can also use the API directly:

**Endpoint**: `/api/forex-signal-generator`

**Method**: POST

**Request Body**:
```json
{
  "pair": "EUR/USD",
  "trade_mode": "scalping",
  "risk": "1"
}
```

**Response**:
```json
{
  "pair": "EUR/USD",
  "signal": "BUY",
  "confidence": 80,
  "reason": "MACD is bullish",
  "entry": 1.17018,
  "stop_loss": 1.16950,
  "take_profit": 1.17154,
  "rr_ratio": 2.0,
  "timeframe": "5M",
  "trade_mode": "scalping",
  "timestamp": "2025-07-22T11:10:31.632Z"
}
```

## Trading Modes

### Sniper Mode

- **Timeframe**: 1-minute charts
- **Trade Duration**: Very short (1-5 minutes)
- **Stop-Loss**: Tight (3-5 pips)
- **Take-Profit**: 6-8 pips
- **Best For**: Quick scalping during high volatility
- **Confidence Threshold**: 80%+

### Scalping Mode

- **Timeframe**: 5-minute charts
- **Trade Duration**: Short (5-30 minutes)
- **Stop-Loss**: Medium (8-12 pips)
- **Take-Profit**: 15-25 pips
- **Best For**: Regular day trading
- **Confidence Threshold**: 70%+

### Swing Mode

- **Timeframe**: 1-hour charts
- **Trade Duration**: Medium to long (hours to days)
- **Stop-Loss**: Wider (20-30 pips)
- **Take-Profit**: 50-100 pips
- **Best For**: Longer-term position trading
- **Confidence Threshold**: 65%+

## Understanding the Signals

### Signal Types

- **BUY**: Enter a long position
- **SELL**: Enter a short position
- **NO TRADE**: No clear opportunity, stay out of the market

### Confidence Level

The confidence level (0-100%) indicates how strong the signal is:
- **80-100%**: Very strong signal
- **70-80%**: Strong signal
- **60-70%**: Moderate signal
- **Below 60%**: Weak signal (consider avoiding)

### Risk Management

The system provides:
- **Entry Price**: The recommended entry point
- **Stop-Loss**: Where to place your stop-loss order
- **Take-Profit**: Where to place your take-profit order
- **Risk-Reward Ratio**: The potential reward compared to the risk

## Best Practices

1. **Always use stop-loss orders** to protect your capital
2. **Don't risk more than 1-2%** of your account on a single trade
3. **Higher confidence signals** are more reliable
4. **Combine with your own analysis** for best results
5. **Keep a trading journal** to track performance
6. **Test on a demo account** before using real money

## Troubleshooting

If you encounter issues:

1. **Check API keys**: Ensure your API keys are valid and have not exceeded rate limits
2. **Verify internet connection**: The system needs internet access to fetch real-time data
3. **Check system health**: Use the `/api/health` endpoint to verify all services are operational
4. **Restart the server**: Sometimes a simple restart can resolve issues

## Support

For additional help or to report issues, please open an issue on the GitHub repository.

Happy trading!