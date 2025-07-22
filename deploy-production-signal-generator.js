// Deploy the production-grade signal generator to Vercel

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Deploying Production-Grade Forex Signal Generator to Vercel\n');

try {
  // Check if we have the required files
  const requiredFiles = [
    'pages/api/vercel-forex-signal.ts',
    'services/forexSignalGenerator.ts',
    'services/technicalAnalyzer.ts',
    'services/twelveDataService.ts'
  ];

  console.log('📋 Checking required files...');
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required file missing: ${file}`);
    }
    console.log(`✅ ${file}`);
  }

  // Build the project
  console.log('\n🔨 Building the project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Deploy to Vercel
  console.log('\n🌐 Deploying to Vercel...');
  execSync('vercel --prod', { stdio: 'inherit' });

  console.log('\n🎉 Deployment completed successfully!');
  console.log('\n📊 Test the production API with:');
  console.log('Invoke-RestMethod -Uri "https://tradai-indol.vercel.app/api/vercel-forex-signal" -Method Post -ContentType "application/json" -Body \'{"pair":"EUR/USD","trade_mode":"scalping","risk":"1"}\'');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}