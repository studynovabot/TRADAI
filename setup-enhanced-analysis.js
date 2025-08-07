/**
 * 🚀 ENHANCED ULTIMATE ANALYSIS SYSTEM SETUP SCRIPT
 * 
 * This script sets up the Enhanced Ultimate Analysis System by:
 * 1. Checking for required dependencies
 * 2. Installing missing packages
 * 3. Validating environment variables
 * 4. Running initial tests
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnhancedAnalysisSetup {
    constructor() {
        this.requiredPackages = [
            '@google/generative-ai',
            'sharp',
            'formidable',
            'axios',
            'form-data'
        ];
        
        this.requiredEnvVars = [
            'GEMINI_API_KEY'
        ];
        
        this.setupResults = {
            dependencies: { checked: false, installed: [] },
            environment: { checked: false, valid: false },
            files: { checked: false, created: [] },
            tests: { run: false, passed: false }
        };
    }

    /**
     * Run complete setup
     */
    async runSetup() {
        console.log('🚀 Setting up Enhanced Ultimate Analysis System...\n');

        try {
            // Step 1: Check and install dependencies
            await this.checkDependencies();

            // Step 2: Validate environment
            await this.validateEnvironment();

            // Step 3: Check required files
            await this.checkRequiredFiles();

            // Step 4: Run basic tests
            await this.runBasicTests();

            // Generate setup report
            this.generateSetupReport();

        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            throw error;
        }
    }

    /**
     * Check and install dependencies
     */
    async checkDependencies() {
        console.log('📦 Checking dependencies...');

        try {
            const packageJsonPath = path.join(__dirname, 'package.json');
            
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error('package.json not found');
            }

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const installedPackages = {
                ...packageJson.dependencies || {},
                ...packageJson.devDependencies || {}
            };

            const missingPackages = [];

            for (const pkg of this.requiredPackages) {
                if (!installedPackages[pkg]) {
                    missingPackages.push(pkg);
                } else {
                    console.log(`   ✅ ${pkg} - installed`);
                }
            }

            if (missingPackages.length > 0) {
                console.log(`\n📥 Installing missing packages: ${missingPackages.join(', ')}`);
                
                for (const pkg of missingPackages) {
                    try {
                        console.log(`   Installing ${pkg}...`);
                        execSync(`npm install ${pkg}`, { stdio: 'inherit' });
                        this.setupResults.dependencies.installed.push(pkg);
                        console.log(`   ✅ ${pkg} installed successfully`);
                    } catch (error) {
                        console.error(`   ❌ Failed to install ${pkg}:`, error.message);
                        throw error;
                    }
                }
            }

            this.setupResults.dependencies.checked = true;
            console.log('✅ All dependencies are available\n');

        } catch (error) {
            console.error('❌ Dependency check failed:', error.message);
            throw error;
        }
    }

    /**
     * Validate environment variables
     */
    async validateEnvironment() {
        console.log('🔧 Validating environment...');

        try {
            const missingVars = [];

            for (const envVar of this.requiredEnvVars) {
                if (process.env[envVar]) {
                    console.log(`   ✅ ${envVar} - configured`);
                } else {
                    missingVars.push(envVar);
                    console.log(`   ❌ ${envVar} - missing`);
                }
            }

            // Check for additional API keys
            let apiKeyCount = 0;
            for (let i = 1; i <= 10; i++) {
                if (process.env[`GEMINI_API_KEY_${i}`] || process.env[`GOOGLE_API_KEY_${i}`]) {
                    apiKeyCount++;
                }
            }

            if (process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY) {
                apiKeyCount++;
            }

            console.log(`   📊 Total API keys found: ${apiKeyCount}`);

            if (missingVars.length > 0) {
                console.log('\n⚠️ Missing environment variables:');
                missingVars.forEach(envVar => {
                    console.log(`   • ${envVar}`);
                });
                
                console.log('\n📝 To fix this, add the following to your .env file:');
                missingVars.forEach(envVar => {
                    console.log(`   ${envVar}=your_api_key_here`);
                });
                
                this.setupResults.environment.valid = false;
            } else {
                this.setupResults.environment.valid = true;
            }

            this.setupResults.environment.checked = true;
            console.log('✅ Environment validation completed\n');

        } catch (error) {
            console.error('❌ Environment validation failed:', error.message);
            throw error;
        }
    }

    /**
     * Check required files
     */
    async checkRequiredFiles() {
        console.log('📁 Checking required files...');

        const requiredFiles = [
            'services/AdvancedAnalysisService.js',
            'services/EnhancedUltimateGeminiVisionService.js',
            'pages/api/enhanced-ultimate-gemini-vision.js'
        ];

        try {
            for (const file of requiredFiles) {
                const filePath = path.join(__dirname, file);
                if (fs.existsSync(filePath)) {
                    console.log(`   ✅ ${file} - exists`);
                } else {
                    console.log(`   ❌ ${file} - missing`);
                    throw new Error(`Required file missing: ${file}`);
                }
            }

            // Check if test image exists, create if needed
            const testImagePath = path.join(__dirname, 'test-image.png');
            if (!fs.existsSync(testImagePath)) {
                console.log('   📷 Creating test image...');
                await this.createTestImage(testImagePath);
                this.setupResults.files.created.push('test-image.png');
                console.log('   ✅ test-image.png - created');
            } else {
                console.log('   ✅ test-image.png - exists');
            }

            this.setupResults.files.checked = true;
            console.log('✅ All required files are available\n');

        } catch (error) {
            console.error('❌ File check failed:', error.message);
            throw error;
        }
    }

    /**
     * Run basic tests
     */
    async runBasicTests() {
        console.log('🧪 Running basic tests...');

        try {
            // Test 1: Service imports
            console.log('   Testing service imports...');
            const AdvancedAnalysisService = require('./services/AdvancedAnalysisService');
            const EnhancedUltimateGeminiVisionService = require('./services/EnhancedUltimateGeminiVisionService');
            console.log('   ✅ Service imports successful');

            // Test 2: Service instantiation
            console.log('   Testing service instantiation...');
            const advancedService = new AdvancedAnalysisService({ debugMode: true });
            const enhancedService = new EnhancedUltimateGeminiVisionService({ 
                debugMode: true,
                advancedAnalysis: true 
            });
            console.log('   ✅ Service instantiation successful');

            // Test 3: Configuration validation
            console.log('   Testing configuration...');
            if (advancedService.config && enhancedService.config) {
                console.log('   ✅ Configuration validation successful');
            } else {
                throw new Error('Configuration validation failed');
            }

            // Test 4: Advanced analysis with sample data
            console.log('   Testing advanced analysis with sample data...');
            const sampleData = this.createSampleMarketData();
            const analysisResult = await advancedService.analyzeMarketData(sampleData);
            
            if (analysisResult.success) {
                console.log('   ✅ Advanced analysis test successful');
                console.log(`      Signal: ${analysisResult.analysis.direction}`);
                console.log(`      Score: ${analysisResult.analysis.signal_score}%`);
            } else {
                throw new Error('Advanced analysis test failed');
            }

            this.setupResults.tests.run = true;
            this.setupResults.tests.passed = true;
            console.log('✅ Basic tests completed successfully\n');

        } catch (error) {
            console.error('❌ Basic tests failed:', error.message);
            this.setupResults.tests.run = true;
            this.setupResults.tests.passed = false;
            throw error;
        }
    }

    /**
     * Create test image
     */
    async createTestImage(imagePath) {
        // Create a simple test image (1x1 PNG)
        const testImageBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        
        fs.writeFileSync(imagePath, testImageBuffer);
    }

    /**
     * Create sample market data for testing
     */
    createSampleMarketData() {
        const currentPrice = 1.2345;
        
        return {
            current_price: currentPrice,
            ema_fast: currentPrice - 0.0005,
            ema_slow: currentPrice - 0.0010,
            bollinger_bands: {
                upper: currentPrice + 0.0020,
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: {
                k: 25,
                d: 30
            },
            candles: [
                {
                    open: currentPrice - 0.0002,
                    high: currentPrice + 0.0003,
                    low: currentPrice - 0.0005,
                    close: currentPrice,
                    timestamp: Date.now()
                }
            ]
        };
    }

    /**
     * Generate setup report
     */
    generateSetupReport() {
        console.log('📊 ENHANCED ULTIMATE ANALYSIS SYSTEM SETUP REPORT');
        console.log('=' .repeat(70));

        console.log('\n📦 Dependencies:');
        console.log(`   Status: ${this.setupResults.dependencies.checked ? '✅ Checked' : '❌ Not checked'}`);
        if (this.setupResults.dependencies.installed.length > 0) {
            console.log(`   Installed: ${this.setupResults.dependencies.installed.join(', ')}`);
        }

        console.log('\n🔧 Environment:');
        console.log(`   Status: ${this.setupResults.environment.checked ? '✅ Checked' : '❌ Not checked'}`);
        console.log(`   Valid: ${this.setupResults.environment.valid ? '✅ Yes' : '❌ No'}`);

        console.log('\n📁 Files:');
        console.log(`   Status: ${this.setupResults.files.checked ? '✅ Checked' : '❌ Not checked'}`);
        if (this.setupResults.files.created.length > 0) {
            console.log(`   Created: ${this.setupResults.files.created.join(', ')}`);
        }

        console.log('\n🧪 Tests:');
        console.log(`   Run: ${this.setupResults.tests.run ? '✅ Yes' : '❌ No'}`);
        console.log(`   Passed: ${this.setupResults.tests.passed ? '✅ Yes' : '❌ No'}`);

        console.log('\n🎯 System Status:');
        const allGood = this.setupResults.dependencies.checked && 
                       this.setupResults.environment.valid && 
                       this.setupResults.files.checked && 
                       this.setupResults.tests.passed;

        if (allGood) {
            console.log('   ✅ Enhanced Ultimate Analysis System is ready for use!');
            console.log('\n🚀 Next Steps:');
            console.log('   1. Start your Next.js server: npm run dev');
            console.log('   2. Test the API endpoint: /api/enhanced-ultimate-gemini-vision');
            console.log('   3. Run the demo: node demo-enhanced-ultimate-analysis.js');
            console.log('   4. Run comprehensive tests: node test-enhanced-ultimate-analysis.js');
        } else {
            console.log('   ❌ Setup incomplete. Please resolve the issues above.');
        }

        console.log('\n📚 Documentation:');
        console.log('   • ENHANCED-ULTIMATE-ANALYSIS-SYSTEM.md - Complete documentation');
        console.log('   • demo-enhanced-ultimate-analysis.js - Usage demonstration');
        console.log('   • test-enhanced-ultimate-analysis.js - Comprehensive tests');

        console.log('\n🔧 Configuration Files:');
        console.log('   • services/AdvancedAnalysisService.js - Core analysis engine');
        console.log('   • services/EnhancedUltimateGeminiVisionService.js - AI integration');
        console.log('   • pages/api/enhanced-ultimate-gemini-vision.js - API endpoint');

        console.log('\n' + '=' .repeat(70));

        // Save setup report
        const reportPath = path.join(__dirname, `setup-enhanced-analysis-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify({
            setupResults: this.setupResults,
            timestamp: new Date().toISOString(),
            systemReady: allGood
        }, null, 2));

        console.log(`💾 Setup report saved to: ${reportPath}`);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new EnhancedAnalysisSetup();
    setup.runSetup().catch(error => {
        console.error('❌ Setup execution failed:', error);
        process.exit(1);
    });
}

module.exports = EnhancedAnalysisSetup;