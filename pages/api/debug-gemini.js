/**
 * Debug API endpoint to test DirectGeminiVisionService in Vercel environment
 */

export default async function handler(req, res) {
  console.log('=== DEBUG GEMINI API CALLED ===');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasGoogleVisionKey: !!process.env.GOOGLE_VISION_API_KEY,
    workingDirectory: process.cwd(),
    nodeVersion: process.version
  };

  try {
    console.log('1. Testing DirectGeminiVisionService import...');
    
    // Test import
    const DirectGeminiVisionService = require('../../services/DirectGeminiVisionService');
    debugInfo.importSuccess = true;
    debugInfo.serviceType = typeof DirectGeminiVisionService;
    
    console.log('2. Testing service instantiation...');
    
    // Test instantiation
    const service = new DirectGeminiVisionService();
    debugInfo.instantiationSuccess = true;
    
    console.log('3. Testing service initialization...');
    
    // Test initialization
    const initResult = await service.initialize();
    debugInfo.initializationResult = initResult;
    
    if (initResult.success) {
      console.log('4. Testing API connection...');
      
      // Test basic connection (already done in initialize)
      const stats = service.getStats();
      debugInfo.serviceStats = stats;
      
      debugInfo.overallStatus = 'SUCCESS';
      debugInfo.message = 'DirectGeminiVisionService is working correctly';
    } else {
      debugInfo.overallStatus = 'INIT_FAILED';
      debugInfo.message = `Initialization failed: ${initResult.error}`;
    }

    res.status(200).json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('Debug error:', error);
    
    debugInfo.overallStatus = 'ERROR';
    debugInfo.error = error.message;
    debugInfo.stack = error.stack;
    
    res.status(500).json({
      success: false,
      debug: debugInfo,
      error: error.message
    });
  }
}
