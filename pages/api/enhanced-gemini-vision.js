/**
 * Enhanced Gemini Vision Signal API Endpoint
 * Implements advanced signal accuracy improvements with multi-factor confirmation,
 * image preprocessing, contradiction handling, and backtesting capabilities
 */

const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

// Import Enhanced Gemini Vision Service
const EnhancedGeminiVisionService = require('../../services/EnhancedGeminiVisionService');

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    console.log('=== ENHANCED GEMINI VISION API CALLED ===');
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
        error: 'Method not allowed. Use POST to upload trading chart images.',
        service: 'Enhanced Gemini Vision'
      });
    }
  } catch (initialError) {
    console.error('❌ Initial handler error:', initialError);
    return res.status(500).json({
      success: false,
      error: 'Enhanced API initialization failed',
      details: initialError.message,
      service: 'Enhanced Gemini Vision'
    });
  }

  const startTime = Date.now();
  let tempFilePath = null;

  try {
    console.log('🚀 Processing enhanced trading chart analysis request...');

    // Check if API key is available
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    console.log('API Key configured:', !!apiKey);

    if (!apiKey) {
      console.error('❌ GOOGLE_VISION_API_KEY not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Enhanced Gemini API configuration error. Please ensure GOOGLE_VISION_API_KEY is set.',
        code: 'MISSING_API_KEY',
        service: 'Enhanced Gemini Vision'
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
        service: 'Enhanced Gemini Vision'
      });
    }

    // Parse the uploaded file using formidable
    console.log('📁 Parsing uploaded file...');
    const form = formidable({
      uploadDir: '/tmp',
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
        code: 'NO_IMAGE_FILE',
        service: 'Enhanced Gemini Vision'
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
        code: 'FILE_TOO_LARGE',
        service: 'Enhanced Gemini Vision'
      });
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Please upload an image file (PNG, JPG, etc.).',
        code: 'INVALID_FILE_TYPE',
        service: 'Enhanced Gemini Vision'
      });
    }

    // Verify file exists and is readable
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Uploaded file not found on server');
    }

    console.log('🤖 Initializing Enhanced Gemini Vision Service...');

    // Extract configuration options from fields
    const enhancedConfig = {
      minConfidence: parseInt(fields.minConfidence?.[0] || fields.minConfidence || '60'),
      maxConfidence: parseInt(fields.maxConfidence?.[0] || fields.maxConfidence || '95'),
      timeout: parseInt(fields.timeout?.[0] || fields.timeout || '60000'),
      
      // Enhanced features configuration
      imagePreprocessing: (fields.imagePreprocessing?.[0] || fields.imagePreprocessing || 'true') === 'true',
      multiFactorConfirmation: (fields.multiFactorConfirmation?.[0] || fields.multiFactorConfirmation || 'true') === 'true',
      contradictionHandling: (fields.contradictionHandling?.[0] || fields.contradictionHandling || 'true') === 'true',
      backtestingEnabled: (fields.backtestingEnabled?.[0] || fields.backtestingEnabled || 'false') === 'true',
      uncertaintyThreshold: parseInt(fields.uncertaintyThreshold?.[0] || fields.uncertaintyThreshold || '60')
    };

    console.log('⚙️ Enhanced configuration:', enhancedConfig);

    // Initialize Enhanced Gemini Vision Service
    const enhancedGeminiService = new EnhancedGeminiVisionService(enhancedConfig);

    // Initialize the service
    const initResult = await enhancedGeminiService.initialize();
    if (!initResult.success) {
      throw new Error(`Enhanced Gemini Vision service initialization failed: ${initResult.error}`);
    }

    console.log('✅ Enhanced service initialized with features:', initResult.features);

    console.log('📈 Analyzing trading chart with Enhanced Gemini Vision...');

    // Extract analysis options from fields or use defaults
    const analysisOptions = {
      asset: fields.asset?.[0] || fields.asset || 'Auto-detect',
      timeframe: fields.timeframe?.[0] || fields.timeframe || 'Auto-detect',
      platform: fields.platform?.[0] || fields.platform || 'Trading Platform',
      
      // Enhanced analysis options
      autoCrop: (fields.autoCrop?.[0] || fields.autoCrop || 'true') === 'true',
      enhanceImage: (fields.enhanceImage?.[0] || fields.enhanceImage || 'true') === 'true'
    };

    console.log('⚙️ Analysis options:', analysisOptions);

    // Read the image file into a buffer for enhanced analysis
    const imageBuffer = fs.readFileSync(tempFilePath);
    console.log('📊 Image buffer size:', imageBuffer.length, 'bytes');

    // Analyze the chart image using Enhanced Gemini Vision
    const analysisResult = await enhancedGeminiService.analyzeChartImage(imageBuffer, analysisOptions);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    if (!analysisResult.success) {
      throw new Error(`Enhanced Gemini Vision analysis failed: ${analysisResult.error}`);
    }

    // Get enhanced service statistics
    const stats = enhancedGeminiService.getStats();

    console.log('✅ Enhanced analysis completed successfully');
    console.log('📊 Analysis confidence:', analysisResult.confidence);
    console.log('🎯 Multi-factor confirmation applied:', enhancedConfig.multiFactorConfirmation);
    console.log('⚖️ Contradiction handling applied:', enhancedConfig.contradictionHandling);

    // Check if analysis meets quality thresholds
    const qualityAssessment = assessAnalysisQuality(analysisResult.analysis, enhancedConfig);

    // Return comprehensive enhanced analysis result
    const response = {
      success: true,
      analysis: analysisResult.analysis,
      confidence: analysisResult.confidence,
      processingTime: processingTime,
      
      // Enhanced metadata
      metadata: {
        ...analysisResult.metadata,
        originalFilename: file.originalFilename,
        fileSize: file.size,
        analysisOptions: analysisOptions,
        enhancedConfig: enhancedConfig,
        serviceStats: stats,
        qualityAssessment: qualityAssessment
      },
      
      // Enhanced features status
      enhancedFeatures: {
        imagePreprocessingApplied: enhancedConfig.imagePreprocessing,
        multiFactorConfirmationApplied: enhancedConfig.multiFactorConfirmation,
        contradictionHandlingApplied: enhancedConfig.contradictionHandling,
        backtestingEnabled: enhancedConfig.backtestingEnabled,
        uncertaintyThreshold: enhancedConfig.uncertaintyThreshold
      },
      
      // Quality indicators
      qualityIndicators: {
        confluenceCount: analysisResult.analysis.multiFactorConfirmation?.confluenceCount || 0,
        hasContradictions: analysisResult.analysis.contradictionAnalysis?.hasContradictions || false,
        uncertaintyLevel: analysisResult.confidence < enhancedConfig.uncertaintyThreshold ? 'HIGH' : 'LOW',
        recommendedAction: analysisResult.analysis.recommendedAction || 'WAIT'
      },
      
      timestamp: new Date().toISOString(),
      version: '3.0.0-enhanced',
      service: 'Enhanced Gemini Vision'
    };

    // Add warnings if analysis quality is low
    if (qualityAssessment.overallQuality === 'LOW') {
      response.warnings = [
        'Low analysis quality detected',
        'Consider waiting for better market conditions',
        'Manual review recommended before trading'
      ];
    }

    res.status(200).json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ ENHANCED API HANDLER ERROR ===');
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
    } else if (error.message.includes('sharp') || error.message.includes('preprocessing')) {
      statusCode = 500;
      errorCode = 'IMAGE_PROCESSING_ERROR';
    }

    res.status(statusCode).json({
      success: false,
      error: 'Enhanced Gemini Vision trading chart analysis failed. Please try again.',
      details: error.message,
      code: errorCode,
      processingTime: processingTime,
      timestamp: new Date().toISOString(),
      service: 'Enhanced Gemini Vision',
      analysisMethod: 'Enhanced Gemini Vision with Multi-Factor Confirmation',
      troubleshooting: {
        steps: [
          'Ensure you uploaded a clear, high-resolution trading chart image',
          'Check that the chart contains visible candlesticks, price levels, and technical indicators',
          'Verify the file size is under 10MB and format is PNG/JPG',
          'Ensure the chart shows at least 20-30 candles for proper analysis',
          'Try disabling image preprocessing if the error persists',
          'Consider adjusting confidence thresholds if getting too many uncertain signals'
        ],
        enhancedFeatures: [
          'Image preprocessing can be disabled by setting imagePreprocessing=false',
          'Multi-factor confirmation requires at least 3 technical confluences',
          'Contradiction handling will flag conflicting signals',
          'Backtesting can be enabled to track prediction accuracy over time'
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

/**
 * Assess the quality of the enhanced analysis
 */
function assessAnalysisQuality(analysis, config) {
  let qualityScore = 0;
  let maxScore = 0;
  const issues = [];
  const strengths = [];

  // Check confluence count (30 points)
  maxScore += 30;
  const confluenceCount = analysis.multiFactorConfirmation?.confluenceCount || 0;
  if (confluenceCount >= 3) {
    qualityScore += 30;
    strengths.push(`Strong confluence (${confluenceCount} factors)`);
  } else if (confluenceCount >= 2) {
    qualityScore += 20;
    strengths.push(`Moderate confluence (${confluenceCount} factors)`);
  } else {
    qualityScore += 10;
    issues.push(`Low confluence (${confluenceCount} factors)`);
  }

  // Check for contradictions (25 points)
  maxScore += 25;
  const hasContradictions = analysis.contradictionAnalysis?.hasContradictions || false;
  if (!hasContradictions) {
    qualityScore += 25;
    strengths.push('No signal contradictions detected');
  } else {
    const contradictions = analysis.contradictionAnalysis?.contradictorySignals || [];
    const highSeverity = contradictions.filter(c => c.severity === 'HIGH').length;
    if (highSeverity === 0) {
      qualityScore += 15;
      strengths.push('Minor contradictions only');
    } else {
      qualityScore += 5;
      issues.push(`${highSeverity} high-severity contradictions`);
    }
  }

  // Check confidence level (25 points)
  maxScore += 25;
  const confidence = analysis.overallConfidence || 0;
  if (confidence >= 80) {
    qualityScore += 25;
    strengths.push(`High confidence (${confidence}%)`);
  } else if (confidence >= 70) {
    qualityScore += 20;
    strengths.push(`Good confidence (${confidence}%)`);
  } else if (confidence >= 60) {
    qualityScore += 15;
    strengths.push(`Moderate confidence (${confidence}%)`);
  } else {
    qualityScore += 5;
    issues.push(`Low confidence (${confidence}%)`);
  }

  // Check technical indicator coverage (20 points)
  maxScore += 20;
  const indicators = analysis.technicalIndicatorVerification || {};
  const indicatorCount = Object.keys(indicators).length;
  if (indicatorCount >= 4) {
    qualityScore += 20;
    strengths.push(`Comprehensive indicator analysis (${indicatorCount} indicators)`);
  } else if (indicatorCount >= 3) {
    qualityScore += 15;
    strengths.push(`Good indicator coverage (${indicatorCount} indicators)`);
  } else {
    qualityScore += 10;
    issues.push(`Limited indicator analysis (${indicatorCount} indicators)`);
  }

  const qualityPercentage = maxScore > 0 ? (qualityScore / maxScore) * 100 : 0;
  
  let overallQuality;
  if (qualityPercentage >= 80) {
    overallQuality = 'HIGH';
  } else if (qualityPercentage >= 60) {
    overallQuality = 'MEDIUM';
  } else {
    overallQuality = 'LOW';
  }

  return {
    overallQuality,
    qualityScore: qualityPercentage.toFixed(1) + '%',
    strengths,
    issues,
    recommendations: generateQualityRecommendations(overallQuality, issues)
  };
}

/**
 * Generate recommendations based on quality assessment
 */
function generateQualityRecommendations(quality, issues) {
  const recommendations = [];

  if (quality === 'LOW') {
    recommendations.push('Consider waiting for better market conditions');
    recommendations.push('Manual review strongly recommended before trading');
    recommendations.push('Look for additional confirmation signals');
  } else if (quality === 'MEDIUM') {
    recommendations.push('Proceed with caution');
    recommendations.push('Consider reducing position size');
    recommendations.push('Monitor for additional confirmation');
  } else {
    recommendations.push('Analysis meets high quality standards');
    recommendations.push('Suitable for automated trading decisions');
  }

  // Add specific recommendations based on issues
  if (issues.some(issue => issue.includes('confluence'))) {
    recommendations.push('Wait for more technical confluences to align');
  }
  
  if (issues.some(issue => issue.includes('contradictions'))) {
    recommendations.push('Resolve signal contradictions before trading');
  }
  
  if (issues.some(issue => issue.includes('confidence'))) {
    recommendations.push('Wait for higher confidence signals');
  }

  return recommendations;
}