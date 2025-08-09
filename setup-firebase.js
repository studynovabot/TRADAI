/**
 * Firebase Setup Script
 * Initializes Firebase collections and sets up initial data structure
 */

const { initializeFirebaseAdmin, getFirestore } = require('./lib/firebase-admin');

class FirebaseSetup {
  constructor() {
    this.db = null;
  }

  async initialize() {
    try {
      console.log('🔥 Initializing Firebase Admin...');
      initializeFirebaseAdmin();
      this.db = getFirestore();
      console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      throw error;
    }
  }

  async setupCollections() {
    console.log('\n📚 Setting up Firestore collections...');

    try {
      // Create model versions collection
      await this.setupModelVersions();
      
      // Create indexes (these would typically be done via Firebase Console)
      await this.logRequiredIndexes();
      
      console.log('✅ Collections setup completed');
      
    } catch (error) {
      console.error('❌ Collection setup failed:', error.message);
      throw error;
    }
  }

  async setupModelVersions() {
    console.log('📊 Setting up model versions...');

    const modelVersionsRef = this.db.collection('model_versions');
    
    const initialVersion = {
      version: 'v1.0.0',
      createdAt: new Date(),
      description: 'Initial baseline model',
      status: 'active',
      accuracy: null,
      trainingData: {
        sampleCount: 0,
        lastTrainingDate: null
      },
      features: {
        technicalIndicators: true,
        candlePatterns: true,
        volumeAnalysis: true,
        timeFeatures: true
      }
    };

    await modelVersionsRef.doc('v1.0.0').set(initialVersion);
    console.log('✅ Initial model version created');
  }

  async logRequiredIndexes() {
    console.log('\n📋 Required Firestore Indexes:');
    console.log('   Please create these indexes in Firebase Console:');
    console.log('');
    console.log('   1. Collection: predictions');
    console.log('      Fields: userId (Ascending), timestamp (Descending)');
    console.log('');
    console.log('   2. Collection: predictions');
    console.log('      Fields: userId (Ascending), status (Ascending), timestamp (Descending)');
    console.log('');
    console.log('   3. Collection: predictions');
    console.log('      Fields: status (Ascending), modelVersion (Ascending)');
    console.log('');
    console.log('   4. Collection: training_queue');
    console.log('      Fields: processed (Ascending), queuedAt (Ascending)');
    console.log('');
    console.log('   💡 These indexes will be automatically created when you run queries');
    console.log('      that require them, or you can create them manually for better performance.');
  }

  async createSampleData() {
    console.log('\n🎯 Creating sample data for testing...');

    try {
      // This would create sample predictions for testing
      // In production, this should be removed or made optional
      
      const samplePrediction = {
        userId: 'sample-user-123',
        predictionId: 'sample-prediction-' + Date.now(),
        timestamp: Date.now(),
        asset: 'EURUSD',
        timeframe: '5m',
        currentPrice: 1.0850,
        trend: 'BULLISH',
        marketCondition: 'TRENDING',
        signal: 'BUY',
        signalConfidence: 85,
        overallConfidence: 78,
        predictions: {
          "1": {
            direction: "UP",
            probability: 82,
            explanation: "Strong bullish momentum detected"
          },
          "2": {
            direction: "UP",
            probability: 75,
            explanation: "Continuation expected"
          },
          "3": {
            direction: "DOWN",
            probability: 68,
            explanation: "Potential pullback"
          }
        },
        features: {
          currentPrice: 1.0850,
          ema5: 1.0845,
          ema20: 1.0835,
          rsi: 65.5,
          volatility: 0.0025
        },
        feedback: {
          "1": null,
          "2": null,
          "3": null
        },
        modelVersion: 'v1.0.0',
        status: 'pending_verification',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Only create sample data in development
      if (process.env.NODE_ENV === 'development') {
        await this.db.collection('predictions').doc(samplePrediction.predictionId).set(samplePrediction);
        console.log('✅ Sample prediction created for testing');
      } else {
        console.log('⚠️  Skipping sample data creation in production');
      }

    } catch (error) {
      console.error('❌ Sample data creation failed:', error.message);
    }
  }

  async verifySetup() {
    console.log('\n🔍 Verifying Firebase setup...');

    try {
      // Test Firestore connection
      const modelVersions = await this.db.collection('model_versions').limit(1).get();
      console.log('✅ Firestore connection verified');

      // Test predictions collection
      const predictions = await this.db.collection('predictions').limit(1).get();
      console.log('✅ Predictions collection accessible');

      console.log('\n🎉 Firebase setup verification completed successfully!');
      
    } catch (error) {
      console.error('❌ Setup verification failed:', error.message);
      throw error;
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.setupCollections();
      await this.createSampleData();
      await this.verifySetup();
      
      console.log('\n🚀 Firebase setup completed successfully!');
      console.log('   You can now start the application with: npm run dev');
      
    } catch (error) {
      console.error('\n💥 Firebase setup failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Make sure tradai-firebase-privatekey.json exists');
      console.log('   2. Check your Firebase project configuration');
      console.log('   3. Verify your environment variables');
      console.log('   4. Ensure Firebase Admin SDK is properly installed');
      
      process.exit(1);
    }
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  const setup = new FirebaseSetup();
  setup.run();
}

module.exports = FirebaseSetup;