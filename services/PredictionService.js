/**
 * Prediction Service with Firebase Integration
 * Handles predictions, feedback collection, and model management
 */

const { getFirestore, getStorageBucket } = require('../lib/firebase-admin');
const FeatureExtractionService = require('./FeatureExtractionService');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

class PredictionService {
  constructor() {
    this.db = getFirestore();
    this.bucket = getStorageBucket();
    this.featureExtractor = new FeatureExtractionService();
    this.currentModelVersion = process.env.CURRENT_MODEL_VERSION || 'v1.0.0';
  }

  /**
   * Create a new prediction from chart analysis
   * @param {string} userId - User ID
   * @param {string} imageBase64 - Base64 encoded chart image
   * @param {Object} analysisResult - AI analysis result
   * @param {Object} marketData - Market data for feature extraction
   * @param {Object} meta - Additional metadata
   * @returns {Promise<Object>} Prediction document
   */
  async createPrediction(userId, imageBase64, analysisResult, marketData, meta = {}) {
    try {
      const predictionId = uuidv4();
      const timestamp = Date.now();

      // Save image to Firebase Storage
      const imagePath = await this.saveImageToStorage(predictionId, imageBase64);

      // Extract features for ML training
      const features = this.featureExtractor.extractFeatures(
        marketData, 
        marketData.recentCandles || []
      );

      // Create prediction document
      const predictionDoc = {
        userId,
        predictionId,
        imagePath,
        timestamp,
        
        // Market context
        asset: meta.asset || 'Unknown',
        timeframe: meta.timeframe || 'Unknown',
        currentPrice: marketData.currentPrice || 0,
        
        // Analysis results
        trend: analysisResult.trend || 'unknown',
        marketCondition: analysisResult.marketCondition || 'unknown',
        signal: analysisResult.signal || 'HOLD',
        signalConfidence: analysisResult.signalConfidence || 0,
        overallConfidence: analysisResult.overallConfidence || 0,
        
        // 3-candle predictions
        predictions: this.formatPredictions(analysisResult.predictions || {}),
        
        // ML features
        features,
        
        // Feedback (initially null)
        feedback: {
          "1": null,
          "2": null,
          "3": null
        },
        
        // Metadata
        modelVersion: this.currentModelVersion,
        processingTimeMs: analysisResult.processingTimeMs || 0,
        status: 'pending_verification',
        
        // Timestamps
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp)
      };

      // Save to Firestore
      await this.db.collection('predictions').doc(predictionId).set(predictionDoc);

      console.log(`✅ Prediction ${predictionId} created successfully`);
      return { predictionId, ...predictionDoc };

    } catch (error) {
      console.error('Failed to create prediction:', error);
      throw new Error(`Prediction creation failed: ${error.message}`);
    }
  }

  /**
   * Submit feedback for a prediction
   * @param {string} userId - User ID
   * @param {string} predictionId - Prediction ID
   * @param {Object} feedback - Feedback object with candle results
   * @param {string} comment - Optional comment
   * @returns {Promise<Object>} Updated prediction
   */
  async submitFeedback(userId, predictionId, feedback, comment = '') {
    try {
      const predictionRef = this.db.collection('predictions').doc(predictionId);
      const predictionDoc = await predictionRef.get();

      if (!predictionDoc.exists) {
        throw new Error('Prediction not found');
      }

      const prediction = predictionDoc.data();

      // Verify ownership
      if (prediction.userId !== userId) {
        throw new Error('Unauthorized: You can only provide feedback on your own predictions');
      }

      // Validate feedback format
      const validatedFeedback = this.validateFeedback(feedback);

      // Check if all candles have feedback
      const allCandlesLabeled = Object.values(validatedFeedback).every(val => val !== null);
      const newStatus = allCandlesLabeled ? 'labeled' : 'partial_feedback';

      // Update prediction with feedback
      const updateData = {
        feedback: validatedFeedback,
        status: newStatus,
        feedbackTimestamp: new Date(),
        updatedAt: new Date()
      };

      if (comment) {
        updateData.feedbackComment = comment;
      }

      await predictionRef.update(updateData);

      // If fully labeled, queue for training
      if (allCandlesLabeled) {
        await this.queueForTraining(predictionId);
      }

      console.log(`✅ Feedback submitted for prediction ${predictionId}`);
      return { predictionId, feedback: validatedFeedback, status: newStatus };

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw new Error(`Feedback submission failed: ${error.message}`);
    }
  }

  /**
   * Get predictions for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of predictions
   */
  async getUserPredictions(userId, filters = {}) {
    try {
      let query = this.db.collection('predictions').where('userId', '==', userId);

      // Apply filters
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.modelVersion) {
        query = query.where('modelVersion', '==', filters.modelVersion);
      }

      // Order by timestamp (newest first)
      query = query.orderBy('timestamp', 'desc');

      // Apply limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const predictions = [];

      snapshot.forEach(doc => {
        predictions.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return predictions;

    } catch (error) {
      console.error('Failed to get user predictions:', error);
      throw new Error(`Failed to retrieve predictions: ${error.message}`);
    }
  }

  /**
   * Get prediction statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Statistics object
   */
  async getUserStats(userId) {
    try {
      const predictions = await this.getUserPredictions(userId);
      const labeledPredictions = predictions.filter(p => p.status === 'labeled');

      let totalCandles = 0;
      let correctCandles = 0;

      labeledPredictions.forEach(prediction => {
        Object.entries(prediction.feedback).forEach(([candleNum, isCorrect]) => {
          if (isCorrect !== null) {
            totalCandles++;
            if (isCorrect === true) {
              correctCandles++;
            }
          }
        });
      });

      const accuracy = totalCandles > 0 ? (correctCandles / totalCandles) * 100 : 0;

      return {
        totalPredictions: predictions.length,
        labeledPredictions: labeledPredictions.length,
        pendingPredictions: predictions.filter(p => p.status === 'pending_verification').length,
        totalCandles,
        correctCandles,
        accuracy: Math.round(accuracy * 100) / 100,
        modelVersions: [...new Set(predictions.map(p => p.modelVersion))]
      };

    } catch (error) {
      console.error('Failed to get user stats:', error);
      throw new Error(`Failed to retrieve statistics: ${error.message}`);
    }
  }

  /**
   * Get labeled data for training (admin only)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Training data
   */
  async getLabeledDataForTraining(filters = {}) {
    try {
      let query = this.db.collection('predictions').where('status', '==', 'labeled');

      if (filters.modelVersion) {
        query = query.where('modelVersion', '==', filters.modelVersion);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const trainingData = [];

      snapshot.forEach(doc => {
        const prediction = doc.data();
        
        // Create training samples (one per candle)
        Object.entries(prediction.feedback).forEach(([candleNum, isCorrect]) => {
          if (isCorrect !== null) {
            trainingData.push({
              predictionId: doc.id,
              userId: prediction.userId,
              candleNumber: parseInt(candleNum),
              label: isCorrect ? 1 : 0,
              features: prediction.features,
              modelVersion: prediction.modelVersion,
              timestamp: prediction.timestamp,
              asset: prediction.asset,
              timeframe: prediction.timeframe
            });
          }
        });
      });

      return trainingData;

    } catch (error) {
      console.error('Failed to get labeled data:', error);
      throw new Error(`Failed to retrieve training data: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Save base64 image to Firebase Storage
   */
  async saveImageToStorage(predictionId, imageBase64) {
    try {
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Optimize image with Sharp
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload to Firebase Storage
      const fileName = `images/predictions/${predictionId}.jpg`;
      const file = this.bucket.file(fileName);

      await file.save(optimizedBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            predictionId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      console.log(`✅ Image saved to Storage: ${fileName}`);
      return fileName;

    } catch (error) {
      console.error('Failed to save image:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Format predictions to ensure consistent structure
   */
  formatPredictions(predictions) {
    const formatted = {};
    
    for (let i = 1; i <= 3; i++) {
      const candleKey = i.toString();
      const prediction = predictions[candleKey] || {};
      
      formatted[candleKey] = {
        direction: prediction.direction || 'UNKNOWN',
        probability: Math.min(100, Math.max(0, prediction.probability || 50)),
        explanation: prediction.explanation || 'No explanation provided'
      };
    }
    
    return formatted;
  }

  /**
   * Validate feedback format
   */
  validateFeedback(feedback) {
    const validated = {};
    
    for (let i = 1; i <= 3; i++) {
      const candleKey = i.toString();
      const value = feedback[candleKey];
      
      if (value === null || value === undefined) {
        validated[candleKey] = null;
      } else if (value === true || value === 'true' || value === 1 || value === '1') {
        validated[candleKey] = true;
      } else if (value === false || value === 'false' || value === 0 || value === '0') {
        validated[candleKey] = false;
      } else {
        validated[candleKey] = null; // Invalid values become null
      }
    }
    
    return validated;
  }

  /**
   * Queue prediction for training
   */
  async queueForTraining(predictionId) {
    try {
      // Add to training queue collection
      await this.db.collection('training_queue').doc(predictionId).set({
        predictionId,
        queuedAt: new Date(),
        processed: false
      });

      console.log(`✅ Prediction ${predictionId} queued for training`);
    } catch (error) {
      console.error('Failed to queue for training:', error);
    }
  }
}

module.exports = PredictionService;