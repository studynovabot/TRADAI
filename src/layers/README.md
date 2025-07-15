# 3-Layer AI Trading System Architecture

## Overview
This system implements a modular 3-layer architecture for binary options trading focused on technical analysis only. It fetches real-time data from Twelve Data API every 2 minutes and provides 5-minute candle signals.

## Layer Structure

### 1. Quant Brain (Layer 1)
- **Purpose**: ML-based prediction engine
- **Technology**: XGBoost, LightGBM, Tabular Neural Networks
- **Input**: Multi-timeframe OHLCV from Twelve Data API, technical indicators, candlestick patterns
- **Output**: Direction (UP/DOWN), Confidence (0.0-1.0)

### 2. Analyst Brain (Layer 2)
- **Purpose**: LLM-based technical confluence validator
- **Technology**: LLaMA 3 (Groq), Claude 3 (Together AI)
- **Input**: Quant prediction + technical snapshot
- **Output**: Validation (YES/NO/HIGH_RISK), Reasoning, Confidence

### 3. Reflex Brain (Layer 3)
- **Purpose**: Lightning-fast execution engine
- **Technology**: Groq-hosted inference
- **Input**: Quant + Analyst decisions
- **Output**: Trade execution or rejection

## Data Flow
```
Twelve Data API (every 2min) → Quant Brain → Analyst Brain → Reflex Brain → Trade Signal
     ↓                            ↓              ↓              ↓
Multi-timeframe OHLCV        Prediction    Validation    Execution Decision
```

## Key Features
- **Real-Time Data**: Twelve Data API integration with 2-minute updates
- **Technical Only**: No external news, sentiment, or fundamental data
- **Modular Design**: Each brain can be upgraded independently
- **Multi-timeframe**: 1M, 3M, 5M, 15M, 30M, 1H analysis
- **Pattern Recognition**: Advanced candlestick pattern detection
- **Volume Analysis**: Volume spikes and confirmation
- **Risk Management**: Built-in uncertainty scoring

## Timing Configuration
- **Data Fetching**: Every 2 minutes from Twelve Data API
- **Signal Generation**: For next 5-minute candle
- **Processing Time**: < 10 seconds total
- **Currency Pairs**: Configurable (USD/INR, EUR/USD, etc.)

## API Integration
- **Primary Source**: Twelve Data API
- **Rate Limiting**: 800 requests/day (free tier)
- **Fallback**: Mock data for testing/development
- **Caching**: Smart caching to minimize API calls