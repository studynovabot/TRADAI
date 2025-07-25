/**
 * Multi-Timeframe Analysis API Endpoint
 * 
 * Handles multi-timeframe screenshot uploads and processes them through
 * the ComprehensiveAnalysisService for confluence analysis
 */

const multer = require('multer');
const ComprehensiveAnalysisService = require('../../src/services/ComprehensiveAnalysisService');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 3 // Maximum 3 files (1m, 3m, 5m)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// Global analysis service instance
let globalAnalysisService = null;
let initializationPromise = null;

/**
 * Initialize analysis service if not already initialized
 */
async function ensureAnalysisServiceInitialized() {
  if (globalAnalysisService && globalAnalysisService.isInitialized) {
    return globalAnalysisService;
  }

  if (initializationPromise) {
    return await initializationPromise;
  }

  initializationPromise = initializeAnalysisService();
  return await initializationPromise;
}

/**
 * Initialize the comprehensive analysis service
 */
async function initializeAnalysisService() {
  try {
    console.log('🚀 Initializing Comprehensive Analysis Service...');

    globalAnalysisService = new ComprehensiveAnalysisService();
    await globalAnalysisService.initialize();

    console.log('✅ Comprehensive Analysis Service initialized');
    return globalAnalysisService;

  } catch (error) {
    console.error(`❌ Analysis Service initialization failed: ${error.message}`);
    globalAnalysisService = null;
    initializationPromise = null;
    throw error;
  }
}

/**
 * Save uploaded file to temporary directory
 */
async function saveUploadedFile(fileBuffer, originalName, timeframe, requestId) {
  const tempDir = path.join(process.cwd(), 'data', 'temp', requestId);
  await fs.mkdir(tempDir, { recursive: true });
  
  const fileExtension = path.extname(originalName);
  const fileName = `${timeframe}_chart${fileExtension}`;
  const filePath = path.join(tempDir, fileName);
  
  await fs.writeFile(filePath, fileBuffer);
  return filePath;
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles(requestId) {
  try {
    const tempDir = path.join(process.cwd(), 'data', 'temp', requestId);
    await fs.rmdir(tempDir, { recursive: true });
  } catch (error) {
    console.warn(`Failed to cleanup temp files for ${requestId}:`, error.message);
  }
}

/**
 * Validate required timeframes
 */
function validateTimeframes(files) {
  const requiredTimeframes = ['1m', '3m', '5m'];
  const uploadedTimeframes = [];
  
  for (const file of files) {
    const timeframe = file.fieldname.replace('screenshot_', '');
    uploadedTimeframes.push(timeframe);
  }
  
  const missingTimeframes = requiredTimeframes.filter(tf => !uploadedTimeframes.includes(tf));
  
  return {
    isValid: missingTimeframes.length === 0,
    missingTimeframes,
    uploadedTimeframes
  };
}

/**
 * Main API handler with multer middleware
 */
async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }

  const startTime = Date.now();
  const requestId = `MTF_${Date.now()}_${uuidv4().substr(0, 8)}`;

  try {
    console.log(`\n🌐 === MULTI-TIMEFRAME ANALYSIS REQUEST ===`);
    console.log(`🆔 Request ID: ${requestId}`);
    console.log(`🕐 Time: ${new Date().toISOString()}`);

    // Parse multipart form data
    await new Promise((resolve, reject) => {
      upload.any()(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Validate uploaded files
    const validation = validateTimeframes(req.files || []);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Missing required timeframes',
        message: `Please upload screenshots for all timeframes: ${validation.missingTimeframes.join(', ')}`,
        missingTimeframes: validation.missingTimeframes,
        uploadedTimeframes: validation.uploadedTimeframes,
        requestId
      });
    }

    // Extract parameters
    const { currencyPair, platform } = req.body;
    
    console.log(`💱 Currency Pair: ${currencyPair}`);
    console.log(`🏢 Platform: ${platform}`);
    console.log(`📸 Screenshots: ${req.files.length}`);

    // Initialize analysis service
    console.log('🔧 Ensuring analysis service is initialized...');
    const analysisService = await ensureAnalysisServiceInitialized();

    // Save uploaded files to temporary directory
    const screenshotPaths = [];
    for (const file of req.files) {
      const timeframe = file.fieldname.replace('screenshot_', '');
      const filePath = await saveUploadedFile(file.buffer, file.originalname, timeframe, requestId);
      screenshotPaths.push(filePath);
      console.log(`📁 Saved ${timeframe} screenshot: ${path.basename(filePath)}`);
    }

    // Perform multi-timeframe analysis
    console.log('🎯 Starting comprehensive multi-timeframe analysis...');
    const analysisResult = await analysisService.analyzeMultipleScreenshots(
      screenshotPaths,
      currencyPair || 'EUR/USD OTC'
    );

    const processingTime = Date.now() - startTime;

    // Clean up temporary files
    await cleanupTempFiles(requestId);

    // Transform analysis result to match frontend expectations
    const signal = transformAnalysisToSignal(analysisResult, requestId, processingTime, currencyPair);

    console.log(`✅ === MULTI-TIMEFRAME ANALYSIS COMPLETED ===`);
    console.log(`🆔 Request ID: ${requestId}`);
    console.log(`🎯 Final Signal: ${signal.signal}`);
    console.log(`📊 Confluence Score: ${signal.multiTimeframeAnalysis?.confluenceScore || 0}%`);
    console.log(`⏱️ Processing Time: ${processingTime}ms`);

    return res.status(200).json(signal);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error(`\n❌ === MULTI-TIMEFRAME ANALYSIS FAILED ===`);
    console.error(`🆔 Request ID: ${requestId}`);
    console.error(`❌ Error: ${error.message}`);
    console.error(`⏱️ Failed after: ${processingTime}ms`);

    // Clean up temporary files on error
    await cleanupTempFiles(requestId);

    return res.status(500).json({
      success: false,
      error: 'Multi-timeframe analysis failed',
      message: error.message,
      requestId,
      processingTime,
      signal: 'ERROR',
      confidence: '0%',
      riskScore: 'HIGH'
    });
  }
}

/**
 * Transform analysis result to signal format
 */
function transformAnalysisToSignal(analysisResult, requestId, processingTime, currencyPair) {
  // Extract final recommendation
  const finalRec = analysisResult.finalRecommendation || {};
  const confluence = analysisResult.confluenceAnalysis || {};
  
  // Determine main signal
  let signal = 'NO_SIGNAL';
  let confidence = 0;
  
  if (finalRec.direction) {
    signal = finalRec.direction.toUpperCase();
    confidence = finalRec.confidence || 0;
  }

  // Build multi-timeframe analysis data
  const multiTimeframeAnalysis = {
    confluenceScore: confluence.score || 0,
    agreement: confluence.aligned ? 85 : 45,
    strength: confluence.score >= 80 ? 'strong' : confluence.score >= 60 ? 'moderate' : 'weak',
    timeframes: {},
    finalRecommendation: {
      direction: signal,
      action: finalRec.action || 'HOLD',
      confidence: confidence,
      riskLevel: confidence >= 80 ? 'LOW' : confidence >= 60 ? 'MEDIUM' : 'HIGH'
    }
  };

  // Add individual timeframe data
  if (analysisResult.individualAnalyses) {
    analysisResult.individualAnalyses.forEach((analysis, index) => {
      const timeframes = ['1m', '3m', '5m'];
      const tf = timeframes[index] || `tf${index + 1}`;
      
      multiTimeframeAnalysis.timeframes[tf] = {
        signal: analysis.tradingSignal?.direction?.toUpperCase() || 'NEUTRAL',
        confidence: analysis.tradingSignal?.confidence || 0,
        indicators: {
          trend: analysis.technicalAnalysis?.trend || 'Unknown',
          momentum: analysis.technicalAnalysis?.momentum || 'Unknown'
        },
        patterns: analysis.patternAnalysis || {}
      };
    });
  }

  return {
    success: true,
    requestId,
    currency_pair: currencyPair,
    timeframe: 'Multi-TF',
    trade_duration: '3 minutes',
    signal,
    confidence: `${confidence.toFixed(1)}%`,
    confidenceNumeric: confidence,
    riskScore: multiTimeframeAnalysis.finalRecommendation.riskLevel,
    reason: [
      `Multi-timeframe confluence analysis completed`,
      `Confluence score: ${multiTimeframeAnalysis.confluenceScore.toFixed(1)}%`,
      `Signal strength: ${multiTimeframeAnalysis.strength}`,
      `Final recommendation: ${multiTimeframeAnalysis.finalRecommendation.action}`
    ],
    timestamp: new Date().toISOString(),
    processingTime,
    multiTimeframeAnalysis,
    metadata: {
      source: 'screenshot_analysis',
      analysisType: 'multi_timeframe_confluence',
      screenshotsProcessed: analysisResult.screenshots || 0
    }
  };
}

export default handler;
