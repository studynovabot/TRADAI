/**
 * Setup Browser Automation
 * 
 * This script sets up the browser automation environment for OTC data collection.
 * It installs the required dependencies and configures the system.
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function setupBrowserAutomation() {
    console.log('🤖 Setting up Browser Automation for OTC Data Collection');
    console.log('====================================================');
    
    // Create necessary directories
    const dirs = [
        path.join(process.cwd(), 'data', 'screenshots'),
        path.join(process.cwd(), 'data', 'ocr'),
        path.join(process.cwd(), 'data', 'otc')
    ];
    
    for (const dir of dirs) {
        await fs.ensureDir(dir);
        console.log(`✅ Created directory: ${dir}`);
    }
    
    // Check if Playwright is installed
    try {
        require.resolve('playwright');
        console.log('✅ Playwright is already installed');
    } catch (error) {
        console.log('⚠️ Playwright is not installed. Installing...');
        try {
            execSync('npm install playwright --save', { stdio: 'inherit' });
            console.log('✅ Playwright installed successfully');
        } catch (error) {
            console.error('❌ Failed to install Playwright:', error.message);
            console.log('Please run: npm install playwright --save');
        }
    }
    
    // Install Playwright browsers
    try {
        console.log('📥 Installing Playwright browsers...');
        execSync('npx playwright install chromium', { stdio: 'inherit' });
        console.log('✅ Playwright browsers installed successfully');
    } catch (error) {
        console.error('❌ Failed to install Playwright browsers:', error.message);
        console.log('Please run: npx playwright install chromium');
    }
    
    // Check if Tesseract.js is installed
    try {
        require.resolve('tesseract.js');
        console.log('✅ Tesseract.js is already installed');
    } catch (error) {
        console.log('⚠️ Tesseract.js is not installed. Installing...');
        try {
            execSync('npm install tesseract.js --save', { stdio: 'inherit' });
            console.log('✅ Tesseract.js installed successfully');
        } catch (error) {
            console.error('❌ Failed to install Tesseract.js:', error.message);
            console.log('Please run: npm install tesseract.js --save');
        }
    }
    
    // Check if Sharp is installed
    try {
        require.resolve('sharp');
        console.log('✅ Sharp is already installed');
    } catch (error) {
        console.log('⚠️ Sharp is not installed. Installing...');
        try {
            execSync('npm install sharp --save', { stdio: 'inherit' });
            console.log('✅ Sharp installed successfully');
        } catch (error) {
            console.error('❌ Failed to install Sharp:', error.message);
            console.log('Please run: npm install sharp --save');
        }
    }
    
    // Check if OpenCV is installed
    try {
        require.resolve('opencv4nodejs');
        console.log('✅ OpenCV is already installed');
    } catch (error) {
        console.log('⚠️ OpenCV is not installed. This is optional but recommended for better chart recognition.');
        console.log('Installing OpenCV can be complex. If you want to install it, please run:');
        console.log('npm install opencv4nodejs --save');
    }
    
    // Create configuration file
    const configPath = path.join(process.cwd(), 'config', 'browser-automation.json');
    await fs.ensureDir(path.dirname(configPath));
    
    // Ask for broker platform URL
    rl.question('Enter the broker platform URL (default: https://quotex.io): ', async (brokerUrl) => {
        brokerUrl = brokerUrl || 'https://quotex.io';
        
        // Ask for login credentials (optional)
        rl.question('Enter your broker username (optional, press Enter to skip): ', async (username) => {
            rl.question('Enter your broker password (optional, press Enter to skip): ', async (password) => {
                const config = {
                    brokerUrl,
                    auth: {
                        username: username || '',
                        password: password || '',
                        saveCredentials: !!username
                    },
                    screenshots: {
                        enabled: true,
                        directory: path.join(process.cwd(), 'data', 'screenshots')
                    },
                    ocr: {
                        enabled: true,
                        directory: path.join(process.cwd(), 'data', 'ocr')
                    },
                    browser: {
                        headless: false,
                        slowMo: 100
                    },
                    timeframes: ['1M', '5M', '15M', '30M', '1H'],
                    currencyPairs: [
                        'EUR/USD OTC',
                        'GBP/USD OTC',
                        'USD/JPY OTC',
                        'AUD/USD OTC'
                    ]
                };
                
                await fs.writeJson(configPath, config, { spaces: 2 });
                console.log(`✅ Created configuration file: ${configPath}`);
                
                console.log('\n🎉 Browser Automation setup completed successfully!');
                console.log('You can now use the OTC Signal Generator with real market data.');
                console.log('To test the setup, run: npm run test:signal');
                
                rl.close();
            });
        });
    });
}

// Run the setup
setupBrowserAutomation().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
});