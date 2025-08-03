/**
 * Enhanced Features Setup Script
 * Installs dependencies and validates the enhanced Gemini Vision setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class EnhancedFeaturesSetup {
    constructor() {
        this.setupSteps = [
            'checkNodeVersion',
            'installDependencies',
            'validateEnvironment',
            'createDirectories',
            'validateServices',
            'runTests'
        ];
        this.results = {};
    }

    /**
     * Run the complete setup process
     */
    async runSetup() {
        console.log('🚀 Setting up Enhanced Gemini Vision Features...\n');

        for (const step of this.setupSteps) {
            try {
                console.log(`📋 Running: ${step}...`);
                await this[step]();
                this.results[step] = { success: true };
                console.log(`✅ ${step} completed successfully\n`);
            } catch (error) {
                console.error(`❌ ${step} failed:`, error.message);
                this.results[step] = { success: false, error: error.message };
                
                // Continue with other steps unless it's a critical failure
                if (this.isCriticalStep(step)) {
                    console.error('💥 Critical step failed. Setup cannot continue.');
                    break;
                }
                console.log('⚠️ Non-critical step failed. Continuing...\n');
            }
        }

        this.generateSetupReport();
    }

    /**
     * Check Node.js version
     */
    async checkNodeVersion() {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        console.log(`   Node.js version: ${nodeVersion}`);
        
        if (majorVersion < 18) {
            throw new Error(`Node.js 18+ required. Current version: ${nodeVersion}`);
        }
        
        console.log('   ✅ Node.js version is compatible');
    }

    /**
     * Install required dependencies
     */
    async installDependencies() {
        console.log('   Installing Sharp for image preprocessing...');
        
        try {
            // Check if Sharp is already installed
            require.resolve('sharp');
            console.log('   ✅ Sharp is already installed');
        } catch (error) {
            console.log('   📦 Installing Sharp...');
            execSync('npm install sharp@^0.33.5', { stdio: 'inherit' });
            console.log('   ✅ Sharp installed successfully');
        }

        // Verify other dependencies
        const requiredDeps = [
            '@google/generative-ai',
            'formidable',
            'form-data',
            'node-fetch'
        ];

        for (const dep of requiredDeps) {
            try {
                require.resolve(dep);
                console.log(`   ✅ ${dep} is available`);
            } catch (error) {
                console.log(`   ⚠️ ${dep} not found - may need manual installation`);
            }
        }
    }

    /**
     * Validate environment variables
     */
    async validateEnvironment() {
        const requiredEnvVars = [
            'GOOGLE_VISION_API_KEY'
        ];

        const optionalEnvVars = [
            'GEMINI_API_KEY_2',
            'GEMINI_API_KEY_3'
        ];

        console.log('   Checking required environment variables...');
        
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Required environment variable ${envVar} is not set`);
            }
            console.log(`   ✅ ${envVar} is configured`);
        }

        console.log('   Checking optional environment variables...');
        let optionalCount = 0;
        for (const envVar of optionalEnvVars) {
            if (process.env[envVar]) {
                optionalCount++;
                console.log(`   ✅ ${envVar} is configured`);
            }
        }

        console.log(`   📊 Total API keys configured: ${requiredEnvVars.length + optionalCount}`);
        
        if (optionalCount === 0) {
            console.log('   💡 Consider adding backup API keys for better reliability');
        }
    }

    /**
     * Create necessary directories
     */
    async createDirectories() {
        const directories = [
            'backtesting-data',
            'logs',
            'temp'
        ];

        for (const dir of directories) {
            const dirPath = path.join(process.cwd(), dir);
            
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`   📁 Created directory: ${dir}`);
            } else {
                console.log(`   ✅ Directory exists: ${dir}`);
            }
        }
    }

    /**
     * Validate enhanced services
     */
    async validateServices() {
        console.log('   Validating Enhanced Gemini Vision Service...');
        
        try {
            const EnhancedGeminiVisionService = require('./services/EnhancedGeminiVisionService');
            const service = new EnhancedGeminiVisionService({
                imagePreprocessing: false, // Disable for validation to avoid Sharp issues
                multiFactorConfirmation: true,
                contradictionHandling: true,
                backtestingEnabled: false
            });
            console.log('   ✅ EnhancedGeminiVisionService loaded successfully');
        } catch (error) {
            throw new Error(`EnhancedGeminiVisionService validation failed: ${error.message}`);
        }

        console.log('   Validating Backtesting Service...');
        
        try {
            const BacktestingService = require('./services/BacktestingService');
            const service = new BacktestingService();
            console.log('   ✅ BacktestingService loaded successfully');
        } catch (error) {
            throw new Error(`BacktestingService validation failed: ${error.message}`);
        }
    }

    /**
     * Run basic tests
     */
    async runTests() {
        console.log('   Running basic service tests...');
        
        // Test Enhanced Gemini Vision Service initialization
        try {
            const EnhancedGeminiVisionService = require('./services/EnhancedGeminiVisionService');
            const service = new EnhancedGeminiVisionService({
                imagePreprocessing: false, // Disable for test
                backtestingEnabled: false
            });
            
            // Test initialization without API calls
            console.log('   ✅ Enhanced service initialization test passed');
        } catch (error) {
            throw new Error(`Enhanced service test failed: ${error.message}`);
        }

        // Test Backtesting Service
        try {
            const BacktestingService = require('./services/BacktestingService');
            const service = new BacktestingService();
            
            // Test basic functionality
            const mockAnalysis = {
                detectedAsset: 'TEST/PAIR',
                overallConfidence: 85,
                nextCandlePredictions: [
                    { candle: 1, direction: 'UP', confidence: 85 }
                ]
            };
            
            const predictionId = service.storePrediction(mockAnalysis, { test: true });
            console.log(`   ✅ Backtesting service test passed (ID: ${predictionId})`);
        } catch (error) {
            throw new Error(`Backtesting service test failed: ${error.message}`);
        }
    }

    /**
     * Check if a step is critical for setup
     */
    isCriticalStep(step) {
        const criticalSteps = [
            'checkNodeVersion',
            'validateEnvironment',
            'validateServices'
        ];
        return criticalSteps.includes(step);
    }

    /**
     * Generate setup report
     */
    generateSetupReport() {
        console.log('\n📋 Enhanced Features Setup Report');
        console.log('=====================================');

        let successCount = 0;
        let totalSteps = this.setupSteps.length;

        for (const step of this.setupSteps) {
            const result = this.results[step];
            if (result) {
                const status = result.success ? '✅ PASS' : '❌ FAIL';
                console.log(`${status} ${step}`);
                if (result.success) successCount++;
                if (!result.success && result.error) {
                    console.log(`     Error: ${result.error}`);
                }
            } else {
                console.log(`⏸️ SKIP ${step} (not executed)`);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Successful steps: ${successCount}/${totalSteps}`);
        console.log(`   Success rate: ${((successCount / totalSteps) * 100).toFixed(1)}%`);

        if (successCount === totalSteps) {
            console.log('\n🎉 Enhanced features setup completed successfully!');
            console.log('\n🚀 Next steps:');
            console.log('   1. Start your development server: npm run dev');
            console.log('   2. Test the enhanced endpoint: POST /api/enhanced-gemini-vision');
            console.log('   3. Run comprehensive tests: npm run test:enhanced');
            console.log('   4. Check backtesting: GET /api/backtesting?action=status');
        } else {
            console.log('\n⚠️ Setup completed with some issues.');
            console.log('   Please review the failed steps above and resolve any issues.');
            console.log('   You may still be able to use basic functionality.');
        }

        // Save report to file
        const reportPath = path.join(process.cwd(), 'setup-report.json');
        const report = {
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: {
                totalSteps,
                successCount,
                successRate: ((successCount / totalSteps) * 100).toFixed(1) + '%'
            }
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n💾 Setup report saved to: ${reportPath}`);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new EnhancedFeaturesSetup();
    setup.runSetup().then(() => {
        console.log('\n✨ Setup process completed!');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 Setup process failed:', error);
        process.exit(1);
    });
}

module.exports = EnhancedFeaturesSetup;