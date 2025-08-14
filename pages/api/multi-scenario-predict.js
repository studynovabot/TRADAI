/**
 * Multi-Scenario Prediction API Endpoint
 * POST /api/multi-scenario-predict - Create new multi-scenario prediction from chart image
 */

const { verifyAuth } = require('../../lib/firebase-admin');
const PredictionService = require('../../services/PredictionService');
const MultiScenarioGeminiVisionService = require('../../services/MultiScenarioGeminiVisionService');

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

    console.log(`🔍 Processing multi-scenario prediction request for user: ${user.uid}`);

    // Initialize services
    const predictionService = new PredictionService();
    const visionService = new MultiScenarioGeminiVisionService();

    // Analyze chart with AI
    const startTime = Date.now();
    const analysisResult = await visionService.analyzeChart(imageBase64, {
      asset: meta.asset || 'Unknown',
      timeframe: meta.timeframe || 'Unknown'
    });

    const processingTime = Date.now() - startTime;
    analysisResult.processingTimeMs = processingTime;

    if (!analysisResult.success) {
      throw new Error(analysisResult.error || 'Analysis failed');
    }

    // Extract market data for features (mock data for now)
    const marketData = {
      currentPrice: analysisResult.currentPrice || 0,
      recentCandles: [] // TODO: Integrate with real market data
    };

    // Create prediction record with multi-scenario data
    const prediction = await predictionService.createMultiScenarioPrediction(
      user.uid,
      imageBase64,
      analysisResult,
      marketData,
      meta
    );

    // Return prediction without sensitive data
    const response = {
      predictionId: prediction.predictionId,
      
      // Multi-scenario specific data
      scenarios: prediction.scenarios,
      mostLikelyPath: prediction.mostLikelyPath,
      
      // Legacy compatibility
      predictions: prediction.predictions,
      signal: prediction.signal,
      signalConfidence: prediction.signalConfidence,
      overallConfidence: prediction.overallConfidence,
      trend: prediction.trend,
      marketCondition: prediction.marketCondition,
      
      // Metadata
      modelVersion: prediction.modelVersion,
      processingTimeMs: processingTime,
      timestamp: prediction.timestamp,
      analysisType: 'multi-scenario'
    };

    console.log(`✅ Multi-scenario prediction created successfully: ${prediction.predictionId}`);
    console.log(`📊 Generated ${prediction.scenarios?.length || 0} scenarios`);
    
    res.status(200).json(response);

  } catch (error) {
    console.error('Multi-scenario prediction API error:', error);
    res.status(500).json({ 
      error: 'Multi-scenario prediction failed', 
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