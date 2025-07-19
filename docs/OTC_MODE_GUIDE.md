# OTC Mode Guide

## Overview

OTC (Over-The-Counter) Mode is a specialized feature designed for weekend trading on binary options platforms. Unlike regular trading which relies on real-time market data from APIs, OTC Mode uses pattern matching and historical data analysis to generate signals when traditional markets are closed.

## How OTC Mode Works

1. **Data Collection**: Extracts real-time price data directly from the broker's chart using DOM analysis, canvas extraction, or OCR.
2. **Pattern Matching**: Compares current market patterns with a database of historical patterns.
3. **Similarity Analysis**: Identifies the most similar historical patterns and analyzes what happened next.
4. **Signal Generation**: Generates trading signals based on the historical outcomes of similar patterns.

## Key Features

- **Pattern Recognition**: Identifies candlestick patterns, indicator readings, and price action patterns.
- **Historical Matching**: Compares current patterns with a database of historical patterns.
- **Confidence Scoring**: Provides confidence scores based on pattern similarity and historical outcome consistency.
- **Detailed Analysis**: Shows which historical patterns matched and their outcomes.

## Using OTC Mode

1. **Enable OTC Mode**: Toggle the "Enable OTC Mode (Weekend Trading)" switch in the Signal Generator panel.
2. **Select Asset**: Choose the asset you want to trade (e.g., EUR/USD OTC).
3. **Select Duration**: Choose the trade duration.
4. **Generate Signal**: Click the "Generate AI Signal" button to analyze patterns and generate a signal.

## Understanding OTC Signals

OTC signals include:
- **Direction**: BUY, SELL, or NO TRADE recommendation.
- **Confidence**: Percentage indicating the confidence level of the prediction.
- **Pattern Matches**: Number of similar historical patterns found.
- **Similarity Score**: How closely the current pattern matches historical patterns.
- **Reasoning**: Detailed explanation of why the signal was generated.

## Best Practices

1. **Higher Confidence Threshold**: Consider only taking trades with 80%+ confidence in OTC Mode.
2. **Pattern Match Quality**: Look for signals with multiple high-quality pattern matches.
3. **Confirmation**: Use multiple timeframes for confirmation.
4. **Risk Management**: Use smaller position sizes for OTC trading compared to regular trading.
5. **Weekend Volatility**: Be aware that OTC markets may have different volatility characteristics.

## Technical Implementation

OTC Mode uses several advanced techniques:
- **DOM Analysis**: Extracts data directly from the broker's DOM.
- **Canvas Extraction**: Reads chart data from canvas elements.
- **OCR**: Uses optical character recognition to read prices when needed.
- **Vector Similarity**: Compares pattern vectors using cosine similarity.
- **Feature Extraction**: Extracts meaningful features from price data and indicators.

## Limitations

- OTC Mode relies on pattern recognition rather than real-time market data.
- Historical patterns may not always predict future movements accurately.
- OTC markets may behave differently than regular markets.
- Pattern matching accuracy depends on the quality and quantity of historical data.

## Troubleshooting

If you encounter issues with OTC Mode:
1. **No Data Extraction**: Try refreshing the broker page and restarting the extension.
2. **Low Confidence Signals**: This may indicate insufficient pattern matches or low similarity scores.
3. **No Signal Generated**: The system may not have found enough similar patterns to make a prediction.

## Future Improvements

- Expanding the historical pattern database
- Implementing machine learning for pattern recognition
- Adding more technical indicators for pattern matching
- Improving OCR accuracy for better data extraction
- Adding broker-specific optimizations

---

*Note: OTC Mode is designed as a supplementary tool for weekend trading when regular markets are closed. Always use proper risk management and consider the limitations of pattern-based prediction.*