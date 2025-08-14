/**
 * Multi-Scenario Feedback API Endpoint
 * POST /api/multi-scenario-feedback - Submit feedback for multi-scenario predictions
 */

const { verifyAuth } = require('../../lib/firebase-admin');
const PredictionService = require('../../services/PredictionService');

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

    const { 
      predictionId, 
      actualPath, 
      matchingScenario, 
      wasCorrect, 
      comment 
    } = req.body;

    if (!predictionId || !actualPath || !Array.isArray(actualPath)) {
      return res.status(400).json({ 
        error: 'Prediction ID and actual path are required' 
      });
    }

    if (actualPath.length !== 3) {
      return res.status(400).json({ 
        error: 'Actual path must contain exactly 3 candle directions' 
      });
    }

    console.log(`📝 Processing multi-scenario feedback for prediction: ${predictionId}`);

    // Initialize prediction service
    const predictionService = new PredictionService();

    // Submit multi-scenario feedback
    const result = await predictionService.submitMultiScenarioFeedback(
      user.uid,
      predictionId,
      {
        actualPath,
        matchingScenario,
        wasCorrect,
        comment: comment || null
      }
    );

    console.log(`✅ Multi-scenario feedback submitted successfully for: ${predictionId}`);
    
    res.status(200).json({
      success: true,
      predictionId: result.predictionId,
      feedback: result.feedback,
      status: result.status,
      accuracy: result.accuracy,
      message: wasCorrect 
        ? `Great! The AI correctly predicted scenario #${matchingScenario}.`
        : 'Thank you for the feedback. This will help improve future predictions.'
    });

  } catch (error) {
    console.error('Multi-scenario feedback API error:', error);
    res.status(500).json({ 
      error: 'Feedback submission failed', 
      message: error.message 
    });
  }
}