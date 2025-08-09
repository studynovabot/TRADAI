/**
 * Prediction API Endpoint
 * POST /api/predict - Create new prediction from chart image
 */

const { verifyAuth } = require('../../lib/firebase-admin');
const PredictionService = require('../../services/PredictionService');
const UltimateGeminiVisionService = require('../../services/UltimateGeminiVisionService');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req, res);
    if (!user) return; // Response already sent by verifyAuth

    const { imageBase64, meta = {} } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    console.log(`🔍 Processing prediction request for user: ${user.uid}`);

    // Initialize services
    const predictionService = new PredictionService();
    const visionService = new UltimateGeminiVisionService();

    // Analyze chart with AI
    const startTime = Date.now();
    const analysisResult = await visionService.analyzeChart(imageBase64, {
      asset: meta.asset || 'Unknown',
      timeframe: meta.timeframe || 'Unknown'
    });

    const processingTime = Date.now() - startTime;
    analysisResult.processingTimeMs = processingTime;

    // Extract market data for features (mock data for now)
    const marketData = {
      currentPrice: analysisResult.currentPrice || 0,
      recentCandles: [] // TODO: Integrate with real market data
    };

    // Create prediction record
    const prediction = await predictionService.createPrediction(
      user.uid,
      imageBase64,
      analysisResult,
      marketData,
      meta
    );

    // Return prediction without sensitive data
    const response = {
      predictionId: prediction.predictionId,
      predictions: prediction.predictions,
      signal: prediction.signal,
      signalConfidence: prediction.signalConfidence,
      overallConfidence: prediction.overallConfidence,
      trend: prediction.trend,
      marketCondition: prediction.marketCondition,
      modelVersion: prediction.modelVersion,
      processingTimeMs: processingTime,
      timestamp: prediction.timestamp
    };

    console.log(`✅ Prediction created successfully: ${prediction.predictionId}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('Prediction API error:', error);
    res.status(500).json({ 
      error: 'Prediction failed', 
      message: error.message 
    });
  }
}

// Increase body size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};