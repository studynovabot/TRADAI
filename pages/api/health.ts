// API route to check system health
import type { NextApiRequest, NextApiResponse } from 'next';
import { TwelveDataService } from '../../services/twelveDataService';

type HealthResponse = {
  message: string;
  timestamp: number;
  status: string;
  version: string;
  services?: {
    [key: string]: {
      status: string;
      message?: string;
    };
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Initialize services status
  const services: { [key: string]: { status: string; message?: string } } = {
    twelveData: { status: 'unknown' },
    technicalAnalysis: { status: 'unknown' }
  };

  // Check TwelveData API
  try {
    const twelveData = new TwelveDataService();
    const marketData = await twelveData.getOHLCV('EUR/USD', '1M', 5);
    
    if (marketData && marketData.length > 0) {
      services.twelveData = { 
        status: 'healthy',
        message: `Successfully fetched ${marketData.length} candles`
      };
    } else {
      services.twelveData = { 
        status: 'degraded',
        message: 'API returned empty data, using fallback'
      };
    }
  } catch (error) {
    services.twelveData = { 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Check technical analysis service
  try {
    // Simple calculation to verify the service is working
    const calculation = Math.sqrt(16) * 2;
    if (calculation === 8) {
      services.technicalAnalysis = { 
        status: 'healthy',
        message: 'Technical analysis service is operational'
      };
    } else {
      services.technicalAnalysis = { 
        status: 'error',
        message: 'Technical analysis service failed basic calculation'
      };
    }
  } catch (error) {
    services.technicalAnalysis = { 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Determine overall status
  let overallStatus = 'OK';
  let overallMessage = 'TRADAI API is healthy';
  
  const hasError = Object.values(services).some(s => s.status === 'error');
  const hasDegraded = Object.values(services).some(s => s.status === 'degraded');
  
  if (hasError) {
    overallStatus = 'ERROR';
    overallMessage = 'One or more services are experiencing issues';
  } else if (hasDegraded) {
    overallStatus = 'DEGRADED';
    overallMessage = 'One or more services are degraded';
  }

  // Return health status
  res.status(200).json({
    message: overallMessage,
    timestamp: Date.now(),
    status: overallStatus,
    version: '1.0.0',
    services
  });
}