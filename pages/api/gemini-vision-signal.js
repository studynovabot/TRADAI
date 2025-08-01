/**
 * Gemini Vision Signal API Endpoint
 * Handles chart image upload and analysis using Gemini AI
 */

const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

// Import Direct Gemini Vision Service (no OCR preprocessing)
const DirectGeminiVisionService = require('../../services/DirectGeminiVisionService');

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    console.log('=== GEMINI VISION SIGNAL API CALLED ===');
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

    console.log('🤖 Initializing Direct Gemini Vision Service...');

    // Initialize Direct Gemini Vision Service (no OCR preprocessing)
    const geminiVisionService = new DirectGeminiVisionService({
      minConfidence: 70,
      maxConfidence: 95,
      timeout: 60000
    });

    // Initialize the service
    const initResult = await geminiVisionService.initialize();
    if (!initResult.success) {
      throw new Error(`Direct Gemini Vision service initialization failed: ${initResult.error}`);
    }

    console.log('📈 Analyzing trading chart with Direct Gemini Vision...');

    // Extract analysis options from fields or use defaults
    const analysisOptions = {
      asset: fields.asset?.[0] || fields.asset || 'Auto-detect',
      timeframe: fields.timeframe?.[0] || fields.timeframe || 'Auto-detect',
      platform: fields.platform?.[0] || fields.platform || 'Trading Platform'
    };

    console.log('⚙️ Analysis options:', analysisOptions);

    // Read the image file into a buffer for direct analysis
    const imageBuffer = fs.readFileSync(tempFilePath);
    console.log('📊 Image buffer size:', imageBuffer.length, 'bytes');

    // Analyze the chart image directly using Gemini Vision (no OCR preprocessing)
    const analysisResult = await geminiVisionService.analyzeChartImage(imageBuffer, analysisOptions);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    if (!analysisResult.success) {
      throw new Error(`Direct Gemini Vision analysis failed: ${analysisResult.error}`);
    }

    // Get service statistics
    const stats = geminiVisionService.getStats();

    console.log('✅ Analysis completed successfully');
    console.log('📊 Analysis confidence:', analysisResult.confidence);

    // Return comprehensive analysis result
    const response = {
      success: true,
      analysis: analysisResult.analysis,
      confidence: analysisResult.confidence,
      processingTime: processingTime,
      metadata: {
        ...analysisResult.metadata,
        originalFilename: file.originalFilename,
        fileSize: file.size,
        analysisOptions: analysisOptions,
        serviceStats: stats
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
