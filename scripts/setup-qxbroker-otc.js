/**
 * QXBroker OTC Signal Generator Setup Script
 * 
 * Sets up the environment for the QXBroker OTC signal generator:
 * - Creates necessary directories
 * - Installs required dependencies
 * - Sets up environment variables
 * - Tests the connection to QXBroker
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for user input
const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

// Main setup function
async function setupQXBrokerOTC() {
  console.log('\n🚀 Setting up QXBroker OTC Signal Generator...\n');
  
  try {
    // Step 1: Create necessary directories
    console.log('📁 Creating necessary directories...');
    
    const directories = [
      path.join(process.cwd(), 'data', 'screenshots'),
      path.join(process.cwd(), 'data', 'diagnostics'),
      path.join(process.cwd(), 'data', 'error-logs'),
      path.join(process.cwd(), 'data', 'otc')
    ];
    
    for (const dir of directories) {
      await fs.ensureDir(dir);
      console.log(`✅ Created directory: ${dir}`);
    }
    
    // Step 2: Check for required dependencies
    console.log('\n📦 Checking for required dependencies...');
    
    const requiredDependencies = [
      'playwright',
      'tesseract.js',
      'sharp',
      'opencv4nodejs'
    ];
    
    const packageJson = await fs.readJson(path.join(process.cwd(), 'package.json'));
    const installedDependencies = Object.keys(packageJson.dependencies || {});
    
    const missingDependencies = requiredDependencies.filter(
      dep => !installedDependencies.includes(dep)
    );
    
    if (missingDependencies.length > 0) {
      console.log(`⚠️ Missing dependencies: ${missingDependencies.join(', ')}`);
      
      const installMissing = await prompt('Do you want to install missing dependencies? (y/n): ');
      
      if (installMissing.toLowerCase() === 'y') {
        console.log(`📦 Installing missing dependencies...`);
        execSync(`npm install ${missingDependencies.join(' ')} --save`, { stdio: 'inherit' });
        console.log('✅ Dependencies installed successfully');
      } else {
        console.log('⚠️ Skipping dependency installation. Some features may not work properly.');
      }
    } else {
      console.log('✅ All required dependencies are installed');
    }
    
    // Step 3: Set up environment variables
    console.log('\n🔐 Setting up environment variables...');
    
    let envFile = '';
    try {
      envFile = await fs.readFile(path.join(process.cwd(), '.env'), 'utf8');
    } catch (error) {
      // .env file doesn't exist, create it
      envFile = '';
    }
    
    // Check if QXBroker credentials are already set
    const hasQXBrokerEmail = envFile.includes('QXBROKER_EMAIL=');
    const hasQXBrokerPassword = envFile.includes('QXBROKER_PASSWORD=');
    
    if (!hasQXBrokerEmail || !hasQXBrokerPassword) {
      console.log('⚠️ QXBroker credentials not found in .env file');
      
      const setupCredentials = await prompt('Do you want to set up QXBroker credentials now? (y/n): ');
      
      if (setupCredentials.toLowerCase() === 'y') {
        const email = await prompt('Enter your QXBroker email: ');
        const password = await prompt('Enter your QXBroker password: ');
        
        // Add credentials to .env file
        if (!hasQXBrokerEmail) {
          envFile += `\nQXBROKER_EMAIL=${email}`;
        } else {
          envFile = envFile.replace(/QXBROKER_EMAIL=.*/, `QXBROKER_EMAIL=${email}`);
        }
        
        if (!hasQXBrokerPassword) {
          envFile += `\nQXBROKER_PASSWORD=${password}`;
        } else {
          envFile = envFile.replace(/QXBROKER_PASSWORD=.*/, `QXBROKER_PASSWORD=${password}`);
        }
        
        await fs.writeFile(path.join(process.cwd(), '.env'), envFile);
        console.log('✅ QXBroker credentials saved to .env file');
      } else {
        console.log('⚠️ Skipping QXBroker credentials setup. You will need to set them manually.');
      }
    } else {
      console.log('✅ QXBroker credentials already set in .env file');
    }
    
    // Step 4: Install Playwright browsers
    console.log('\n🌐 Setting up Playwright browsers...');
    
    try {
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      console.log('✅ Playwright browsers installed successfully');
    } catch (error) {
      console.error('❌ Failed to install Playwright browsers:', error.message);
      console.log('⚠️ You may need to install them manually with: npx playwright install chromium');
    }
    
    // Step 5: Test the setup
    console.log('\n🧪 Testing the setup...');
    
    const testSetup = await prompt('Do you want to test the QXBroker connection? (y/n): ');
    
    if (testSetup.toLowerCase() === 'y') {
      try {
        // Import the QXBrokerOTCSignalGenerator
        const { QXBrokerOTCSignalGenerator } = require('../src/core/QXBrokerOTCSignalGenerator');
        
        // Create an instance with test mode
        const signalGenerator = new QXBrokerOTCSignalGenerator({
          headless: false,
          testMode: true
        });
        
        // Initialize
        console.log('🚀 Initializing QXBroker OTC Signal Generator...');
        await signalGenerator.initialize();
        console.log('✅ Initialization successful');
        
        // Test login
        const testLogin = await prompt('Do you want to test login to QXBroker? (y/n): ');
        
        if (testLogin.toLowerCase() === 'y') {
          console.log('🔐 Testing login to QXBroker...');
          await signalGenerator.login();
          console.log('✅ Login successful');
          
          // Clean up
          await signalGenerator.cleanup();
        }
        
        console.log('✅ Setup test completed successfully');
      } catch (error) {
        console.error('❌ Setup test failed:', error.message);
        console.log('⚠️ You may need to check your credentials or network connection');
      }
    }
    
    console.log('\n🎉 QXBroker OTC Signal Generator setup completed!');
    console.log('\nYou can now use the QXBroker OTC Signal Generator by:');
    console.log('1. Running the development server: npm run dev');
    console.log('2. Navigating to: http://localhost:3000/qxbroker-otc-signals');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run the setup
setupQXBrokerOTC();