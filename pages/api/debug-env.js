/**
 * Debug API endpoint to check environment variables
 */

export default async function handler(req, res) {
  console.log('=== DEBUG ENV API CALLED ===');
  
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

  try {
    // Get environment variables
    const envVars = process.env;
    
    // Filter for relevant variables
    const relevantVars = {};
    const apiKeys = {};
    
    Object.keys(envVars).forEach(key => {
      if (key.includes('API') || key.includes('GEMINI') || key.includes('GOOGLE') || key.includes('NODE') || key.includes('VERCEL')) {
        if (key.includes('API_KEY') || key.includes('KEY')) {
          // Mask API keys for security
          apiKeys[key] = envVars[key] ? `${envVars[key].substring(0, 8)}...` : 'undefined';
        } else {
          relevantVars[key] = envVars[key];
        }
      }
    });

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        totalEnvVars: Object.keys(envVars).length
      },
      relevantVars: relevantVars,
      apiKeys: apiKeys,
      hasGoogleVisionKey: !!process.env.GOOGLE_VISION_API_KEY,
      workingDirectory: process.cwd(),
      nodeVersion: process.version
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Debug env error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
