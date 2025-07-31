/**
 * Gemini Vision Signal API Endpoint
 * Handles chart image upload and analysis using Gemini AI
 */

import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

class GeminiVisionAnalyzer {
  constructor() {
    this.apiKey = process.env.GOOGLE_VISION_API_KEY;
    this.genAI = null;
    this.model = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    if (!this.apiKey) {
      throw new Error('GOOGLE_VISION_API_KEY not found in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4000
      }
    });

    this.initialized = true;
  }

  createAnalysisPrompt(detectedAsset = 'Unknown', detectedTimeframe = 'Unknown') {
    return `You are a professional trading analyst with expertise in technical analysis and chart pattern recognition. Analyze this trading chart.

CRITICAL REQUIREMENTS:
- Provide REAL analysis of the actual chart content visible in the image
- NO placeholder data, NO synthetic responses, NO mock analysis
- Base all analysis on what you can actually see in the chart
- Provide specific, actionable trading insights

COMPREHENSIVE ANALYSIS REQUIRED:

1. **CHART PATTERN ANALYSIS:**
   - Identify current trend direction (uptrend/downtrend/sideways)
   - Locate support and resistance levels with specific price points
   - Identify chart patterns (triangles, flags, head & shoulders, etc.)
   - Analyze price action and momentum

2. **TECHNICAL INDICATORS:**
   - Moving averages (EMA/SMA) - identify if price is above/below key levels
   - Stochastic oscillator readings (overbought/oversold/neutral)
   - RSI levels if visible on the chart
   - Volume analysis (high/normal/low relative volume)
   - Any other visible indicators

3. **CANDLESTICK PATTERN ANALYSIS:**
   - Recent candlestick formations and their significance
   - Reversal patterns (doji, hammer, engulfing, etc.)
   - Continuation patterns
   - Current candle formation analysis

4. **DIRECTION PREDICTIONS (CRITICAL):**
   - Predict direction for NEXT 3 CANDLES with confidence percentages
   - Each prediction must have 70-95% confidence based on technical analysis
   - Provide specific reasoning for each prediction
   - Consider all technical factors in your analysis

5. **TRADING SIGNAL:**
   - Clear BUY/SELL/HOLD recommendation
   - Confidence percentage (70-95%)
   - Entry point suggestion with specific price level
   - Risk assessment and reasoning

6. **ASSET AND TIMEFRAME DETECTION:**
   - Try to identify the currency pair or asset from the chart
   - Determine the timeframe (1m, 3m, 5m, 15m, 1h, etc.) from visible indicators

RESPONSE FORMAT (JSON):
{
  "analysis": {
    "trend": "uptrend/downtrend/sideways",
    "currentPrice": "visible price level",
    "supportLevels": ["level1", "level2", "level3"],
    "resistanceLevels": ["level1", "level2", "level3"],
    "chartPatterns": "detailed description of patterns found",
    "technicalIndicators": {
      "ema": "above/below price analysis with specific levels",
      "sma": "above/below price analysis with specific levels",
      "stochastic": "overbought/oversold/neutral with values if visible",
      "rsi": "value and interpretation if visible",
      "volume": "high/normal/low analysis",
      "momentum": "bullish/bearish/neutral"
    },
    "candlestickPatterns": "specific patterns identified in recent candles",
    "predictions": [
      {
        "candle": 1,
        "direction": "UP/DOWN",
        "confidence": 85,
        "reasoning": "specific technical reasons for this prediction"
      },
      {
        "candle": 2,
        "direction": "UP/DOWN",
        "confidence": 80,
        "reasoning": "specific technical reasons for this prediction"
      },
      {
        "candle": 3,
        "direction": "UP/DOWN",
        "confidence": 75,
        "reasoning": "specific technical reasons for this prediction"
      }
    ],
    "tradingSignal": {
      "action": "BUY/SELL/HOLD",
      "confidence": 85,
      "entryPoint": "specific price level for entry",
      "reasoning": "comprehensive analysis summary explaining the signal",
      "riskLevel": "LOW/MEDIUM/HIGH"
    },
    "overallConfidence": 85,
    "marketCondition": "trending/ranging/volatile",
    "timeframeBias": "bullish/bearish/neutral"
  },
  "detectedAsset": "currency pair or asset name if identifiable",
  "detectedTimeframe": "timeframe if identifiable from chart"
}

IMPORTANT: Analyze the ACTUAL chart content. Look at real price movements, actual candlestick formations, visible indicators, and genuine market structure. This analysis will be used for real trading decisions.`;
  }
  async analyzeChart(imagePath) {
    await this.initialize();

    try {
      // Read and encode image
      const imageBuffer = fs.readFileSync(imagePath);
      const imageData = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/png'
        }
      };

      // Create prompt
      const prompt = this.createAnalysisPrompt();

      // Perform analysis with enhanced failover
      const startTime = Date.now();

      let result;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          result = await this.model.generateContent([prompt, imageData]);
          break; // Success, exit retry loop
        } catch (error) {
          attempts++;

          if (error.message.includes('503') && attempts < maxAttempts) {
            // API overload, wait and retry with exponential backoff
            const delay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
            console.log(`503 error detected, retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          throw error; // Re-throw if not retryable or max attempts reached
        }
      }

      const response = await result.response;
      const analysisText = response.text();
      const processingTime = Date.now() - startTime;

      // Parse JSON response
      let analysis = null;
      try {
        let jsonMatch = analysisText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          const codeBlockMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (codeBlockMatch) {
            jsonMatch = [codeBlockMatch[1]];
          }
        }

        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }

      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        // Return structured error response
        return {
          success: false,
          error: 'Failed to parse analysis response',
          rawResponse: analysisText,
          processingTime: processingTime
        };
      }

      // Validate analysis structure
      if (!analysis || !analysis.analysis) {
        return {
          success: false,
          error: 'Invalid analysis structure',
          rawResponse: analysisText,
          processingTime: processingTime
        };
      }

      // Calculate overall confidence
      const overallConfidence = analysis.analysis.overallConfidence ||
                               analysis.analysis.tradingSignal?.confidence || 75;

      return {
        success: true,
        confidence: overallConfidence,
        processingTime: processingTime,
        analysis: analysis.analysis,
        detectedAsset: analysis.detectedAsset,
        detectedTimeframe: analysis.detectedTimeframe,
        rawResponse: analysisText
      };

    } catch (error) {
      console.error('Chart analysis failed:', error);

      return {
        success: false,
        error: error.message.includes('503')
          ? 'Gemini API is temporarily overloaded. Please try again in a moment.'
          : `Analysis failed: ${error.message}`,
        processingTime: Date.now() - Date.now()
      };
    }
  }
}



export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = new IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Validate file upload
    const imageFile = files.image;
    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const filePath = Array.isArray(imageFile) ? imageFile[0].filepath : imageFile.filepath;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const mimeType = Array.isArray(imageFile) ? imageFile[0].mimetype : imageFile.mimetype;

    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid file type. Please upload PNG, JPG, or JPEG files only.' });
    }

    // Analyze chart
    const analyzer = new GeminiVisionAnalyzer();
    const result = await analyzer.analyzeChart(filePath);

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('Failed to clean up uploaded file:', cleanupError);
    }

    // Return result
    res.status(200).json(result);

  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.'
    });
  }
}

