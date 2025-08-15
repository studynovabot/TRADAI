/**
 * 🚀💡 MULTI-SCENARIO ANALYSIS API ENDPOINT
 * 
 * This endpoint provides PURE multi-scenario analysis without any legacy format conversion.
 * Returns rich, detailed analysis with multiple scenarios, confluence factors, and detailed reasoning.
 * 
 * Features:
 * - Multiple scenario generation with probabilities
 * - Detailed technical analysis of all visible indicators
 * - Confluence factor analysis
 * - No legacy format conversion - pure multi-scenario output
 * - Advanced image preprocessing and analysis
 * - Full Gemini AI integration for comprehensive chart analysis
 */

const { formidable } = require('formidable');
const fs = require('fs');
const path = require('path');

// Import Multi-Scenario Gemini Vision Service
const MultiScenarioGeminiVisionService = require('../../services/MultiScenarioGeminiVisionService');

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Set CORS headers immediately for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight OPTIONS request');
    return res.status(200).end();
  }

  try {
    console.log('=== 🚀 MULTI-SCENARIO ANALYSIS API CALLED ===');
    console.log('🔮 Pure Multi-Scenario Analysis - No Legacy Conversion!');
    console.log('Method:', req.method);
    console.log('Origin:', req.headers.origin);

    if (req.method !== 'POST') {
      console.log('Invalid method:', req.method);
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST to upload trading chart images.',
        service: 'Multi-Scenario Analysis'
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
    console.log('🚀 Processing multi-scenario chart analysis request...');

    // Check if API keys are available
    const hasApiKey = process.env.GOOGLE_VISION_API_KEY || process.env.GEMINI_API_KEY;
    console.log('API Key configured:', !!hasApiKey);

    if (!hasApiKey) {
      console.error('❌ No Gemini API keys found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Gemini API configuration error. Please ensure API keys are set.',
        code: 'MISSING_API_KEY'
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
        code: 'INVALID_CONTENT_TYPE'
      });
    }

    // Parse the uploaded file using formidable
    console.log('📁 Parsing uploaded file...');
    
    // Runtime type check for formidable
    if (typeof formidable !== 'function') {
      throw new Error(`Expected formidable to be a function but got ${typeof formidable}`);
    }
    
    const form = formidable({
      uploadDir: process.env.NODE_ENV === 'production' ? '/tmp' : require('os').tmpdir(),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: function ({ name, originalFilename, mimetype }) {
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

    // Runtime type check for MultiScenarioGeminiVisionService
    if (typeof MultiScenarioGeminiVisionService !== 'function') {
      throw new Error(`Expected MultiScenarioGeminiVisionService to be a function but got ${typeof MultiScenarioGeminiVisionService}`);
    }

    // Initialize Multi-Scenario Gemini Vision Service with optimal settings
    const geminiVisionService = new MultiScenarioGeminiVisionService({
      temperature: 0.1, // Low temperature for consistent analysis
      maxTokens: 8000,
      maxRetries: 3,
      debugMode: true,
      imagePreprocessing: true, // Enable advanced image preprocessing
      ocrEnabled: true, // Enable OCR for reading chart data
      patternDetection: true // Enable pattern detection
    });

    console.log('📈 Analyzing trading chart with Multi-Scenario Gemini Vision...');

    // Extract analysis options from fields or use defaults
    const analysisOptions = {
      asset: fields.asset?.[0] || fields.asset || 'Auto-detect',
      timeframe: fields.timeframe?.[0] || fields.timeframe || 'Auto-detect',
      platform: fields.platform?.[0] || fields.platform || 'Trading Platform'
    };

    console.log('⚙️ Analysis options:', analysisOptions);

    // Read the image file and convert to base64 for analysis
    const imageBuffer = fs.readFileSync(tempFilePath);
    console.log('📊 Image buffer size:', imageBuffer.length, 'bytes');
    
    // Convert to base64 format required by the service
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    // Analyze the chart image using Multi-Scenario Gemini Vision
    console.log('🔍 Starting multi-scenario analysis...');
    const analysisResult = await geminiVisionService.analyzeChart(base64Image, analysisOptions);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    if (!analysisResult.success) {
      throw new Error(`Multi-Scenario analysis failed: ${analysisResult.error}`);
    }

    // Get service statistics
    const stats = geminiVisionService.getScenarioStats();

    console.log('✅ Multi-scenario analysis completed successfully');
    console.log('📊 Generated scenarios:', analysisResult.scenarios?.length || 0);
    console.log('📊 Overall confidence:', analysisResult.overallConfidence);
    console.log('📊 Most likely path:', analysisResult.mostLikelyPath);

    // Return PURE multi-scenario analysis result - NO LEGACY CONVERSION
    const response = {
      success: true,
      analysisType: 'multi-scenario',
      
      // Core Analysis Results
      signal: analysisResult.signal,
      signalConfidence: analysisResult.signalConfidence,
      overallConfidence: analysisResult.overallConfidence,
      trend: analysisResult.trend,
      marketCondition: analysisResult.marketCondition,
      
      // Multi-Scenario Data
      scenarios: analysisResult.scenarios,
      mostLikelyPath: analysisResult.mostLikelyPath,
      mostLikelyPathArray: analysisResult.mostLikelyPathArray,
      confluenceFactors: analysisResult.confluenceFactors,
      
      // Technical Analysis
      technicalAnalysis: analysisResult.technicalAnalysis,
      supportLevels: analysisResult.supportLevels,
      resistanceLevels: analysisResult.resistanceLevels,
      currentPrice: analysisResult.currentPrice,
      
      // Metadata
      processingTime: processingTime,
      timestamp: new Date().toISOString(),
      metadata: analysisResult.metadata,
      
      // Service Statistics
      serviceStats: stats,
      
      // Debug Information
      debug: {
        imageSize: imageBuffer.length,
        analysisOptions: analysisOptions,
        model: analysisResult.metadata?.model,
        version: '2.0.0-pure-multi-scenario'
      }
    };

    console.log('📤 Returning pure multi-scenario analysis response');
    return res.status(200).json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Multi-scenario analysis error:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      processingTime: processingTime,
      timestamp: new Date().toISOString(),
      service: 'Multi-Scenario Analysis',
      debug: {
        errorType: error.constructor.name,
        stack: error.stack?.split('\n').slice(0, 5)
      }
    });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🗑️ Cleaned up temporary file:', tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError.message);
      }
    }
  }
}