/**
 * This script is used to prepare the project for Vercel deployment
 * It sets environment variables and performs other necessary setup
 */

console.log('🚀 Preparing for Vercel deployment...');

// Set environment variables
process.env.VERCEL = '1';
process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '1';
process.env.NODE_ENV = 'production';

console.log('✅ Environment variables set:');
console.log('  - VERCEL=1');
console.log('  - OPENCV4NODEJS_DISABLE_AUTOBUILD=1');
console.log('  - NODE_ENV=production');

// Check for required API keys
const requiredApiKeys = [
  'TWELVE_DATA_API_KEY',
  'ALPHA_VANTAGE_API_KEY',
  'FINNHUB_API_KEY',
  'POLYGON_API_KEY'
];

const missingKeys = requiredApiKeys.filter(key => !process.env[key]);

if (missingKeys.length > 0) {
  console.warn('⚠️ Missing API keys:', missingKeys.join(', '));
  console.warn('⚠️ The application may use demo data instead of real market data');
} else {
  console.log('✅ All required API keys are set');
}

// Inform about OpenCV mock
console.log('ℹ️ Using OpenCV mock implementation for Vercel deployment');
console.log('ℹ️ Using simplified logger for Vercel deployment');
console.log('✅ Deployment preparation complete!');