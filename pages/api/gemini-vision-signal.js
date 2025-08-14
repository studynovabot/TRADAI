/**
 * Gemini Vision Signal API Endpoint
 * Handles chart image upload and analysis using Gemini AI
 */

const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

// Import Multi-Scenario Gemini Vision Service for enhanced analysis
const MultiScenarioGeminiVisionService = require('../../services/MultiScenarioGeminiVisionService');

/**
 * Convert multi-scenario format to legacy format for backward compatibility
 */
function convertToLegacyFormat(multiScenarioResult) {
  const { scenarios, signal, signalConfidence, overallConfidence, trend, marketCondition, predictions } = multiScenarioResult;
  
  // Use the legacy predictions format if available, otherwise convert from scenarios
  const candlePredictions = predictions || (scenarios && scenarios.length > 0 ? 
    convertScenariosToLegacyPredictions(scenarios) : 
    generateDefaultPredictions(signal, signalConfidence)
  );

  return {
    overallConfidence: overallConfidence || 75,
    tradingSignal: {
      action: signal === 'HOLD' ? 'NO_TRADE' : signal,
      confidence: signalConfidence || overallConfidence || 75,
      reasoning: `Multi-scenario analysis suggests ${signal} with ${signalConfidence || overallConfidence}% confidence`
    },
    predictions: candlePredictions,
    trend: trend || 'Unknown trend',
    currentPrice: multiScenarioResult.currentPrice || 'N/A',
    marketCondition: marketCondition || 'Unknown',
    detectedAsset: 'Auto-detected',
    detectedTimeframe: 'Multi-TF',
    technicalIndicators: {
      ema: 'Multi-scenario analysis',
      sma: 'Multi-scenario analysis', 
      stochastic: 'Multi-scenario analysis'
    },
    supportLevels: ['Auto-detected'],
    resistanceLevels: ['Auto-detected']
  };
}

/**
 * Convert scenarios to legacy prediction format
 */
function convertScenariosToLegacyPredictions(scenarios) {
  if (!scenarios || scenarios.length === 0) {
    return generateDefaultPredictions('BUY', 75);
  }

  // Use the most likely scenario (first one)
  const topScenario = scenarios[0];
  if (!topScenario.path || topScenario.path.length !== 3) {
    return generateDefaultPredictions('BUY', topScenario.probability || 75);
  }

  return topScenario.path.map((direction, index) => ({
    candle: index + 1,
    direction: direction,
    confidence: Math.max(40, topScenario.probability - (index * 5)), // Slightly decrease confidence for later candles
    explanation: `${direction} movement predicted based on multi-scenario analysis. ${topScenario.reasoning}`
  }));
}

/**
 * Generate default predictions when scenarios are not available
 */
function generateDefaultPredictions(signal, confidence) {
  const baseDirection = signal === 'SELL' ? 'DOWN' : 'UP';
  return [
    {
      candle: 1,
      direction: baseDirection,
      confidence: confidence || 75,
      explanation: `${baseDirection} movement based on ${signal} signal`
    },
    {
      candle: 2, 
      direction: baseDirection === 'UP' ? 'DOWN' : 'UP',
      confidence: (confidence || 75) - 5,
      explanation: `Potential reversal after initial ${baseDirection} movement`
    },
    {
      candle: 3,
      direction: baseDirection,
      confidence: (confidence || 75) - 10,
      explanation: `Return to ${baseDirection} trend continuation`
    }
  ];
}

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    console.log('=== GEMINI VISION SIGNAL API CALLED (MULTI-SCENARIO POWERED) ===');
    console.log('🔮 This endpoint now uses Multi-Scenario Gemini Vision Service!');
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);

    // Set CORS headers for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      console.log('Invalid method:', req.method);
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST to upload trading chart images.'
      });
    }
  } catch (initialError) {
    console.error('❌ Initial handler error:', initialError);
    return res.status(500).json({
      success: false,
      error: 'API initialization failed',
      details: initialError.message
    });
  }

  const startTime = Date.now();
  let tempFilePath = null;

  try {
    console.log('🚀 Processing trading chart analysis request...');

    // Check if API key is available
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    console.log('API Key configured:', !!apiKey);
    console.log('Environment variables available:', Object.keys(process.env).filter(key => key.includes('API') || key.includes('GEMINI') || key.includes('GOOGLE')));

    if (!apiKey) {
      console.error('❌ GOOGLE_VISION_API_KEY not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).slice(0, 10));
      return res.status(500).json({
        success: false,
        error: 'Gemini API configuration error. Please ensure GOOGLE_VISION_API_KEY is set.',
        code: 'MISSING_API_KEY',
        debug: {
          envVarsCount: Object.keys(process.env).length,
          hasNodeEnv: !!process.env.NODE_ENV,
          nodeEnv: process.env.NODE_ENV
        }
      });
    }

    // Check content type
    const contentType = req.headers['content-type'] || '';
    console.log('📋 Content-Type:', contentType);

    if (!contentType.includes('multipart/form-data')) {
      console.log('❌ Invalid content type. Expected multipart/form-data for file upload.');
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Please upload a trading chart image using multipart/form-data.',
        code: 'INVALID_CONTENT_TYPE',
        expectedContentType: 'multipart/form-data',
        receivedContentType: contentType
      });
    }

    // Parse the uploaded file using formidable
    console.log('📁 Parsing uploaded file...');
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: function ({ name, originalFilename, mimetype }) {
        // Only allow image files
        return mimetype && mimetype.includes('image');
      }
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('❌ File parsing error:', err);
          reject(err);
        } else {
          resolve([fields, files]);
        }
      });
    });

    console.log('📋 Parsed fields:', Object.keys(fields));
    console.log('📁 Parsed files:', Object.keys(files));

    // Get the uploaded image file
    const imageFile = files.image;
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded. Please upload a trading chart screenshot.',
        code: 'NO_IMAGE_FILE'
      });
    }

    // Handle both single file and array of files
    const file = Array.isArray(imageFile) ? imageFile[0] : imageFile;
    tempFilePath = file.filepath;

    console.log('📊 Processing image file:', {
      originalName: file.originalFilename,
      size: file.size,
      type: file.mimetype,
      path: tempFilePath
    });

    // Validate file size and type
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.',
        code: 'FILE_TOO_LARGE'
      });
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Please upload an image file (PNG, JPG, etc.).',
        code: 'INVALID_FILE_TYPE'
      });
    }

    // Verify file exists and is readable
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Uploaded file not found on server');
    }

    console.log('🤖 Initializing Multi-Scenario Gemini Vision Service...');

    // Initialize Multi-Scenario Gemini Vision Service
    const geminiVisionService = new MultiScenarioGeminiVisionService({
      temperature: 0.1,
      maxTokens: 8000,
      maxRetries: 3,
      debugMode: true
    });

    console.log('📈 Analyzing trading chart with Direct Gemini Vision...');

    // Extract analysis options from fields or use defaults
    const analysisOptions = {
      asset: fields.asset?.[0] || fields.asset || 'Auto-detect',
      timeframe: fields.timeframe?.[0] || fields.timeframe || 'Auto-detect',
      platform: fields.platform?.[0] || fields.platform || 'Trading Platform'
    };

    console.log('⚙️ Analysis options:', analysisOptions);

    // Read the image file and convert to base64 for multi-scenario analysis
    const imageBuffer = fs.readFileSync(tempFilePath);
    console.log('📊 Image buffer size:', imageBuffer.length, 'bytes');
    
    // Convert to base64 format required by multi-scenario service
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    // Analyze the chart image using Multi-Scenario Gemini Vision
    const analysisResult = await geminiVisionService.analyzeChart(base64Image, analysisOptions);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    if (!analysisResult.success) {
      throw new Error(`Multi-Scenario Gemini Vision analysis failed: ${analysisResult.error}`);
    }

    // Get service statistics
    const stats = geminiVisionService.getScenarioStats();

    console.log('✅ Multi-scenario analysis completed successfully');
    console.log('📊 Generated scenarios:', analysisResult.scenarios?.length || 0);
    console.log('📊 Overall confidence:', analysisResult.overallConfidence);

    // Convert multi-scenario format to legacy format for backward compatibility
    const legacyAnalysis = convertToLegacyFormat(analysisResult);

    // Return comprehensive analysis result in legacy format
    const response = {
      success: true,
      analysis: legacyAnalysis,
      confidence: analysisResult.overallConfidence,
      processingTime: processingTime,
      metadata: {
        ...analysisResult.metadata,
        originalFilename: file.originalFilename,
        fileSize: file.size,
        analysisOptions: analysisOptions,
        serviceStats: stats,
        analysisType: 'multi-scenario-legacy-compat'
      },
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    };

    res.status(200).json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ API HANDLER ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Determine error type and appropriate status code
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';

    if (error.message.includes('API key') || error.message.includes('unauthorized')) {
      statusCode = 401;
      errorCode = 'API_KEY_ERROR';
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      statusCode = 429;
      errorCode = 'QUOTA_EXCEEDED';
    } else if (error.message.includes('file') || error.message.includes('upload')) {
      statusCode = 400;
      errorCode = 'FILE_ERROR';
    }

    res.status(statusCode).json({
      success: false,
      error: 'Direct Gemini Vision trading chart analysis failed. Please try again.',
      details: error.message,
      code: errorCode,
      processingTime: processingTime,
      timestamp: new Date().toISOString(),
      analysisMethod: 'Direct Gemini Vision (No OCR)',
      troubleshooting: {
        steps: [
          'Ensure you uploaded a valid trading chart image (PNG, JPG)',
          'Check that the image is clear and contains visible chart data',
          'Verify the file size is under 10MB',
          'Ensure the chart shows candlesticks, price levels, and indicators',
          'Try again in a few moments if this was a temporary issue'
        ],
        support: 'If the problem persists, please contact support with the error code and timestamp'
      }
    });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🧹 Cleaned up temporary file:', tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError.message);
      }
    }
  }
}
