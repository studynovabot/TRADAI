/**
 * Retrain Request API Endpoint
 * POST /api/retrain-request - Trigger model retraining (Admin only)
 */

const { verifyAuth, isAdmin } = require('../../lib/firebase-admin');
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

    // Check admin privileges
    if (!isAdmin(user)) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const { modelVersion, minSamples = 100 } = req.body;

    console.log(`🔄 Admin ${user.uid} requesting model retrain`);

    // Initialize service
    const predictionService = new PredictionService();

    // Get labeled data for training
    const trainingData = await predictionService.getLabeledDataForTraining({
      modelVersion,
      limit: 10000 // Large limit for training
    });

    if (trainingData.length < minSamples) {
      return res.status(400).json({
        error: 'Insufficient training data',
        message: `Need at least ${minSamples} labeled samples, but only ${trainingData.length} available`,
        availableSamples: trainingData.length
      });
    }

    // TODO: Implement actual training pipeline
    // For now, we'll simulate the training request
    const retrainJob = {
      jobId: `retrain_${Date.now()}`,
      requestedBy: user.uid,
      requestedAt: new Date(),
      modelVersion: modelVersion || 'latest',
      sampleCount: trainingData.length,
      status: 'queued',
      estimatedDuration: Math.ceil(trainingData.length / 100) * 5 // 5 minutes per 100 samples
    };

    // In a real implementation, you would:
    // 1. Save training data to a file/database
    // 2. Trigger a Cloud Run job or similar
    // 3. Monitor the training progress
    // 4. Update model artifacts when complete

    console.log(`✅ Retrain job queued: ${retrainJob.jobId}`);
    
    res.status(200).json({
      success: true,
      message: 'Model retraining requested successfully',
      job: retrainJob,
      trainingDataSummary: {
        totalSamples: trainingData.length,
        uniqueUsers: [...new Set(trainingData.map(d => d.userId))].length,
        modelVersions: [...new Set(trainingData.map(d => d.modelVersion))],
        assets: [...new Set(trainingData.map(d => d.asset))],
        timeframes: [...new Set(trainingData.map(d => d.timeframe))]
      }
    });

  } catch (error) {
    console.error('Retrain request API error:', error);
    res.status(500).json({ 
      error: 'Retrain request failed', 
      message: error.message 
    });
  }
}