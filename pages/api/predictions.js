/**
 * Predictions API Endpoint
 * GET /api/predictions - Get user predictions with filtering
 */

const { verifyAuth, isAdmin } = require('../../lib/firebase-admin');
const PredictionService = require('../../services/PredictionService');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req, res);
    if (!user) return; // Response already sent by verifyAuth

    const { 
      status, 
      modelVersion, 
      limit = 50, 
      includeStats = false,
      userId // Admin can query other users
    } = req.query;

    console.log(`📋 Getting predictions for user: ${user.uid}`);

    // Initialize service
    const predictionService = new PredictionService();

    // Determine target user ID
    let targetUserId = user.uid;
    if (userId && isAdmin(user)) {
      targetUserId = userId;
      console.log(`👑 Admin querying predictions for user: ${userId}`);
    }

    // Build filters
    const filters = {
      limit: Math.min(parseInt(limit), 100) // Cap at 100
    };

    if (status) {
      filters.status = status;
    }

    if (modelVersion) {
      filters.modelVersion = modelVersion;
    }

    // Get predictions
    const predictions = await predictionService.getUserPredictions(targetUserId, filters);

    // Get stats if requested
    let stats = null;
    if (includeStats === 'true') {
      stats = await predictionService.getUserStats(targetUserId);
    }

    const response = {
      predictions: predictions.map(p => ({
        // Remove sensitive data
        predictionId: p.predictionId,
        timestamp: p.timestamp,
        asset: p.asset,
        timeframe: p.timeframe,
        signal: p.signal,
        signalConfidence: p.signalConfidence,
        overallConfidence: p.overallConfidence,
        predictions: p.predictions,
        feedback: p.feedback,
        status: p.status,
        modelVersion: p.modelVersion,
        feedbackComment: p.feedbackComment,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })),
      total: predictions.length,
      filters,
      stats
    };

    console.log(`✅ Retrieved ${predictions.length} predictions`);
    res.status(200).json(response);

  } catch (error) {
    console.error('Predictions API error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve predictions', 
      message: error.message 
    });
  }
}