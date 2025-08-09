/**
 * Feedback API Endpoint
 * POST /api/feedback - Submit feedback for prediction candles
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

    const { predictionId, feedback, comment } = req.body;

    if (!predictionId) {
      return res.status(400).json({ error: 'Prediction ID is required' });
    }

    if (!feedback || typeof feedback !== 'object') {
      return res.status(400).json({ error: 'Feedback object is required' });
    }

    console.log(`📝 Processing feedback for prediction: ${predictionId}`);

    // Initialize service
    const predictionService = new PredictionService();

    // Submit feedback
    const result = await predictionService.submitFeedback(
      user.uid,
      predictionId,
      feedback,
      comment
    );

    console.log(`✅ Feedback submitted successfully for: ${predictionId}`);
    res.status(200).json({
      success: true,
      predictionId: result.predictionId,
      feedback: result.feedback,
      status: result.status,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Feedback API error:', error);
    
    // Handle specific error types
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Prediction not found' });
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.status(500).json({ 
      error: 'Feedback submission failed', 
      message: error.message 
    });
  }
}