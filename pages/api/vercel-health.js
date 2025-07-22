/**
 * Vercel Health Check API
 * This endpoint is used to verify that the application is running correctly on Vercel
 */

export default async function handler(req, res) {
  try {
    // Check if we're running in Vercel
    const isVercel = process.env.VERCEL === '1';
    
    // Return a success response
    res.status(200).json({
      status: 'ok',
      environment: isVercel ? 'vercel' : 'local',
      timestamp: new Date().toISOString(),
      message: 'TRADAI system is running correctly',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}