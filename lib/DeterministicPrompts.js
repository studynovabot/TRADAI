/**
 * 🎯 DETERMINISTIC GEMINI PROMPTS MODULE
 * 
 * Single place to edit and manage all prompt text for deterministic analysis.
 * All prompts are designed for temperature 0.0-0.2 and structured JSON output.
 */

class DeterministicPrompts {
    /**
     * System prompt for deterministic analysis
     */
    static getSystemPrompt() {
        return `You are a precise technical chart analyst. You must return only valid JSON that conforms to the schema provided. Work deterministically (temperature 0.0–0.2). Use the **most recent fully CLOSED candle** as the canonical candle. Explain decisions with quantified factor weights in the JSON. Do not produce free text.`;
    }

    /**
     * Main analysis prompt template
     */
    static getAnalysisPrompt(metadata, analyzedCandleTimestamp) {
        return `Image: [attached chart screenshot]. 
Metadata: ${JSON.stringify(metadata)}

Tasks:
1. Determine the timestamp of the most recent fully closed candle analyzed and return it as analyzed_candle_timestamp: "${analyzedCandleTimestamp}"
2. Extract closed-candle OHLC and indicator values (EMA5, EMA20, Bollinger mid, stochastic %K/%D)
3. Compute signal using the Closed Candle Rule (use the closed candle values only, not any forming candle)
4. Provide next_3_candles predictions: for each, direction (UP/DOWN/NEUTRAL), probability (0–100) and short reason tied to factor scores
5. Return structured output matching schema

For ${metadata.timeframe} scalping:
- EMA cross (EMA5 vs EMA20) + price relative to Bollinger midline > Stochastic alone > longer-term trend
- When EMA5 > EMA20 and price > Boll midline — bias bullish even if longer TF trend is down
- Be conservative: prefer HOLD if any ambiguity

Indicator precedence for ${metadata.timeframe} scalping:
1. EMA crossover (EMA5 vs EMA20): ±35 points
2. Price vs Bollinger midline: ±25 points  
3. Stochastic momentum (K/D crossover & slope): ±20 points
4. Candle body strength (close vs open, wick length): ±10 points
5. Volume/market activity: ±10 points (if available)

Sum factor scores → map to confidence (0–100). If sum between -10 and +10 → signal = HOLD.

Return only JSON. If any numeric value is uncertain, include uncertainty_reason and set confidence lower.`;
    }

    /**
     * OCR-focused prompt for timestamp extraction
     */
    static getOCRPrompt(metadata) {
        return `Analyze this trading chart image and extract:

1. Time axis reading: Read the rightmost time tick on the chart
2. Current price reading: Read the current/last price value
3. Time-to-close countdown: If visible, read the countdown timer

Focus on the most recent CLOSED candle, not any forming candle.

Metadata context: ${JSON.stringify(metadata)}

Return only JSON:
{
    "time_axis_reading": "extracted time string",
    "numeric_price_reading": "extracted price string", 
    "countdown_visible": true/false,
    "countdown_seconds": number or null,
    "confidence": 0-100
}`;
    }

    /**
     * Indicator extraction prompt
     */
    static getIndicatorExtractionPrompt(metadata) {
        const colorMap = metadata.indicator_color_map || {};
        
        return `Extract technical indicator values from this chart image.

Focus on the most recent CLOSED candle values only.

Expected indicator colors:
${JSON.stringify(colorMap, null, 2)}

Extract these values for the CLOSED candle:
1. OHLC (Open, High, Low, Close)
2. EMA5 value at candle close
3. EMA20 value at candle close  
4. Bollinger Bands: upper, middle, lower at candle close
5. Stochastic: %K and %D values at candle close

Return only JSON:
{
    "ohlc": {
        "open": float,
        "high": float,
        "low": float, 
        "close": float
    },
    "indicators": {
        "EMA5": float,
        "EMA20": float,
        "Bollinger_upper": float,
        "Bollinger_mid": float,
        "Bollinger_lower": float,
        "Stochastic_K": float,
        "Stochastic_D": float
    },
    "extraction_confidence": 0-100,
    "color_mapping_used": true/false,
    "notes": "any extraction issues"
}`;
    }

    /**
     * Signal generation prompt
     */
    static getSignalGenerationPrompt(ohlc, indicators, metadata) {
        return `Generate trading signal based on these extracted values:

OHLC: ${JSON.stringify(ohlc)}
Indicators: ${JSON.stringify(indicators)}
Timeframe: ${metadata.timeframe}
Pair: ${metadata.pair}

Apply scoring rules for ${metadata.timeframe} scalping:

1. EMA Crossover Analysis (±35 points):
   - EMA5 > EMA20: +35 (bullish)
   - EMA5 < EMA20: -35 (bearish)
   - EMA5 ≈ EMA20: 0 (neutral)

2. Bollinger Position (±25 points):
   - Price > Bollinger_mid: +25 (bullish)
   - Price < Bollinger_mid: -25 (bearish)
   - Price ≈ Bollinger_mid: 0 (neutral)

3. Stochastic Momentum (±20 points):
   - %K > %D and both rising: +20 (bullish)
   - %K < %D and both falling: -20 (bearish)
   - Mixed signals: 0 to ±10 based on strength

4. Candle Body/Wick (±10 points):
   - Strong bullish candle (close > open, small wicks): +10
   - Strong bearish candle (close < open, small wicks): -10
   - Doji/indecision: 0 to ±5

5. Volume/Activity (±10 points):
   - High activity supporting direction: +10/-10
   - Low activity: 0 to ±5

Signal Logic:
- Total score > +10: BUY
- Total score < -10: SELL  
- Total score -10 to +10: HOLD

Confidence = min(100, abs(total_score) * 2)

Return only JSON:
{
    "signal": "BUY|SELL|HOLD",
    "confidence": 0-100,
    "total_score": number,
    "factor_scores": [
        {"factor": "EMA_crossover", "score": number, "explanation": "string"},
        {"factor": "Bollinger_position", "score": number, "explanation": "string"},
        {"factor": "Stochastic", "score": number, "explanation": "string"},
        {"factor": "Candle_body_wick", "score": number, "explanation": "string"},
        {"factor": "Volume_or_activity", "score": number, "explanation": "string"}
    ],
    "reasoning": "brief explanation of signal decision"
}`;
    }

    /**
     * Next candles prediction prompt
     */
    static getNextCandlesPredictionPrompt(currentAnalysis, metadata) {
        return `Based on current analysis, predict the next 3 candles:

Current Analysis: ${JSON.stringify(currentAnalysis)}
Timeframe: ${metadata.timeframe}

For each of the next 3 candles, predict:
1. Direction: UP/DOWN/NEUTRAL
2. Probability: 0-100%
3. Reason: Brief explanation tied to current factors

Consider:
- Current momentum and trend
- Support/resistance levels
- Indicator momentum
- Typical ${metadata.timeframe} price action patterns

Return only JSON:
{
    "next_3_candles": [
        {
            "candle_index": 1,
            "direction": "UP|DOWN|NEUTRAL", 
            "probability": 0-100,
            "reason": "string"
        },
        {
            "candle_index": 2,
            "direction": "UP|DOWN|NEUTRAL",
            "probability": 0-100, 
            "reason": "string"
        },
        {
            "candle_index": 3,
            "direction": "UP|DOWN|NEUTRAL",
            "probability": 0-100,
            "reason": "string"
        }
    ]
}`;
    }

    /**
     * Support/Resistance levels prompt
     */
    static getSupportResistancePrompt(ohlc, metadata) {
        return `Identify key support and resistance levels from this chart.

Current OHLC: ${JSON.stringify(ohlc)}
Timeframe: ${metadata.timeframe}

Look for:
1. Recent swing highs and lows
2. Psychological levels (round numbers)
3. Previous support/resistance zones
4. Bollinger band levels
5. EMA levels acting as dynamic S/R

Return only JSON:
{
    "support_levels": [float, float, float],
    "resistance_levels": [float, float, float],
    "nearest_support": float,
    "nearest_resistance": float,
    "confidence": 0-100
}`;
    }

    /**
     * Validation prompt for cross-checking
     */
    static getValidationPrompt(analysis, metadata) {
        return `Validate this trading analysis for consistency and accuracy:

Analysis: ${JSON.stringify(analysis)}
Metadata: ${JSON.stringify(metadata)}

Check for:
1. Signal consistency with factor scores
2. Confidence level appropriateness  
3. Timestamp alignment
4. Indicator value reasonableness
5. Next candle predictions logic

Return only JSON:
{
    "validation_passed": true/false,
    "issues_found": ["string array of issues"],
    "confidence_adjustment": number,
    "recommended_signal": "BUY|SELL|HOLD|NO_CHANGE",
    "validation_notes": "string"
}`;
    }

    /**
     * Error handling prompt
     */
    static getErrorRecoveryPrompt(error, metadata) {
        return `An error occurred during analysis. Provide a safe fallback response:

Error: ${error}
Metadata: ${JSON.stringify(metadata)}

Return a conservative analysis with HOLD signal and low confidence:

{
    "pair": "${metadata.pair}",
    "timeframe": "${metadata.timeframe}",
    "analyzed_candle_timestamp": "${metadata.screenshot_timestamp_iso}",
    "screenshot_timestamp": "${metadata.screenshot_timestamp_iso}",
    "pipeline_latency_ms": 0,
    "signal": "HOLD",
    "confidence": 25,
    "factor_scores": [
        {"factor": "EMA_crossover", "score": 0, "explanation": "Unable to analyze due to error"},
        {"factor": "Bollinger_position", "score": 0, "explanation": "Unable to analyze due to error"},
        {"factor": "Stochastic", "score": 0, "explanation": "Unable to analyze due to error"},
        {"factor": "Candle_body_wick", "score": 0, "explanation": "Unable to analyze due to error"},
        {"factor": "Volume_or_activity", "score": 0, "explanation": "Unable to analyze due to error"}
    ],
    "notes": "Analysis failed: ${error}. Conservative HOLD signal returned."
}`;
    }

    /**
     * Get complete prompt configuration
     */
    static getPromptConfig() {
        return {
            temperature: 0.1,
            maxTokens: 512,
            responseMimeType: "application/json",
            systemInstruction: this.getSystemPrompt(),
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }
            ]
        };
    }
}

module.exports = DeterministicPrompts;