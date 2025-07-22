/**
 * Vercel Deployment Script for TRADAI Signal Generator
 * 
 * Handles deployment preparation and verification
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class VercelDeployment {
    constructor() {
        this.projectRoot = process.cwd();
        this.deploymentSteps = [];
    }

    async deployToVercel() {
        console.log('\n🚀 === VERCEL DEPLOYMENT PROCESS ===\n');
        
        try {
            // Step 1: Pre-deployment checks
            await this.preDeploymentChecks();
            
            // Step 2: Install Vercel CLI if needed
            await this.ensureVercelCLI();
            
            // Step 3: Build the project
            await this.buildProject();
            
            // Step 4: Deploy to Vercel
            await this.deployProject();
            
            // Step 5: Post-deployment verification
            await this.postDeploymentVerification();
            
            this.printDeploymentSummary();
            
        } catch (error) {
            console.error(`\n❌ Deployment failed: ${error.message}`);
            throw error;
        }
    }

    async preDeploymentChecks() {
        console.log('🔍 Step 1: Pre-deployment Checks');
        
        // Check if all required files exist
        const requiredFiles = [
            'package.json',
            'next.config.js',
            'vercel.json',
            '.env.production',
            'pages/forex-signal-generator.tsx',
            'components/ForexSignalGenerator.tsx',
            'components/ForexSignalOutput.tsx',
            'pages/api/forex-signal-generator.ts'
        ];

        for (const file of requiredFiles) {
            if (await fs.pathExists(file)) {
                console.log(`   ✅ ${file} - Present`);
            } else {
                throw new Error(`Required file missing: ${file}`);
            }
        }

        // Check package.json for required dependencies
        const packageJson = await fs.readJson('package.json');
        const requiredDeps = [
            'next',
            'react',
            'puppeteer-core',
            'chrome-aws-lambda',
            'yahoo-finance2',
            'technicalindicators'
        ];

        for (const dep of requiredDeps) {
            if (packageJson.dependencies[dep]) {
                console.log(`   ✅ ${dep} - Dependency present`);
            } else {
                throw new Error(`Required dependency missing: ${dep}`);
            }
        }

        this.deploymentSteps.push({ step: 'Pre-deployment Checks', status: 'PASSED' });
    }

    async ensureVercelCLI() {
        console.log('\n🔧 Step 2: Vercel CLI Setup');
        
        try {
            // Check if Vercel CLI is installed
            execSync('vercel --version', { stdio: 'pipe' });
            console.log('   ✅ Vercel CLI already installed');
        } catch (error) {
            console.log('   📦 Installing Vercel CLI...');
            try {
                execSync('npm install -g vercel', { stdio: 'inherit' });
                console.log('   ✅ Vercel CLI installed successfully');
            } catch (installError) {
                throw new Error('Failed to install Vercel CLI. Please install manually: npm install -g vercel');
            }
        }

        this.deploymentSteps.push({ step: 'Vercel CLI Setup', status: 'PASSED' });
    }

    async buildProject() {
        console.log('\n🏗️ Step 3: Building Project');
        
        try {
            console.log('   📦 Installing dependencies...');
            execSync('npm install', { stdio: 'inherit' });
            
            console.log('   🔨 Building Next.js project...');
            execSync('npm run build', { stdio: 'inherit' });
            
            console.log('   ✅ Project built successfully');
            this.deploymentSteps.push({ step: 'Project Build', status: 'PASSED' });
        } catch (error) {
            throw new Error(`Build failed: ${error.message}`);
        }
    }

    async deployProject() {
        console.log('\n🚀 Step 4: Deploying to Vercel');
        
        try {
            console.log('   🌐 Deploying to Vercel...');
            
            // Deploy with production flag
            const deployOutput = execSync('vercel --prod --yes', { 
                stdio: 'pipe',
                encoding: 'utf8'
            });
            
            // Extract deployment URL from output
            const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
            if (urlMatch) {
                this.deploymentUrl = urlMatch[0];
                console.log(`   ✅ Deployed successfully to: ${this.deploymentUrl}`);
            } else {
                console.log('   ✅ Deployment completed (URL not captured)');
            }
            
            this.deploymentSteps.push({ step: 'Vercel Deployment', status: 'PASSED' });
        } catch (error) {
            throw new Error(`Deployment failed: ${error.message}`);
        }
    }

    async postDeploymentVerification() {
        console.log('\n🔍 Step 5: Post-deployment Verification');
        
        if (!this.deploymentUrl) {
            console.log('   ⚠️ Deployment URL not available, skipping verification');
            return;
        }

        try {
            // Test health endpoint
            console.log('   🏥 Testing health endpoint...');
            const healthUrl = `${this.deploymentUrl}/api/health`;
            
            const fetch = (await import('node-fetch')).default;
            const healthResponse = await fetch(healthUrl, { timeout: 30000 });
            
            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                console.log(`   ✅ Health check passed: ${healthData.status}`);
            } else {
                throw new Error(`Health check failed: ${healthResponse.status}`);
            }

            // Test Forex Signal Generator API
            console.log('   📊 Testing Forex Signal Generator API...');
            const apiUrl = `${this.deploymentUrl}/api/forex-signal-generator`;
            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pair: 'EUR/USD',
                    trade_mode: 'scalping',
                    risk: '1'
                }),
                timeout: 60000
            });
            
            if (apiResponse.ok) {
                const apiData = await apiResponse.json();
                console.log(`   ✅ Forex API check passed: ${apiData.pair}`);
            } else {
                console.warn(`   ⚠️ Forex API check returned status: ${apiResponse.status}`);
            }

            // Test main page
            console.log('   🌐 Testing main page...');
            const pageUrl = `${this.deploymentUrl}/forex-signal-generator`;
            const pageResponse = await fetch(pageUrl, { timeout: 30000 });
            
            if (pageResponse.ok) {
                console.log('   ✅ Main page accessible');
            } else {
                throw new Error(`Main page failed: ${pageResponse.status}`);
            }

            this.deploymentSteps.push({ step: 'Post-deployment Verification', status: 'PASSED' });
            
        } catch (error) {
            console.log(`   ⚠️ Verification failed: ${error.message}`);
            this.deploymentSteps.push({ step: 'Post-deployment Verification', status: 'FAILED', error: error.message });
        }
    }

    printDeploymentSummary() {
        console.log('\n📊 === DEPLOYMENT SUMMARY ===\n');
        
        const passed = this.deploymentSteps.filter(s => s.status === 'PASSED').length;
        const failed = this.deploymentSteps.filter(s => s.status === 'FAILED').length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${Math.floor((passed / this.deploymentSteps.length) * 100)}%\n`);

        this.deploymentSteps.forEach(step => {
            const icon = step.status === 'PASSED' ? '✅' : '❌';
            console.log(`${icon} ${step.step}: ${step.status}`);
            if (step.error) {
                console.log(`   Error: ${step.error}`);
            }
        });

        if (failed === 0) {
            console.log('\n🎉 === DEPLOYMENT SUCCESSFUL ===');
            if (this.deploymentUrl) {
                console.log(`🌐 Your TRADAI Signal Generator is live at:`);
                console.log(`   ${this.deploymentUrl}/forex-signal-generator`);
                console.log(`\n🔗 API Endpoints:`);
                console.log(`   Health: ${this.deploymentUrl}/api/health`);
                console.log(`   Forex API: ${this.deploymentUrl}/api/forex-signal-generator`);
            }
            console.log('\n💡 Next Steps:');
            console.log('   1. Test the deployed application');
            console.log('   2. Verify all features work correctly');
            console.log('   3. Monitor performance and logs');
        } else {
            console.log('\n⚠️ === DEPLOYMENT ISSUES ===');
            console.log('Some steps failed. Please check the errors above.');
        }
    }
}

// Run deployment if called directly
if (require.main === module) {
    const deployment = new VercelDeployment();
    deployment.deployToVercel().catch(console.error);
}

module.exports = { VercelDeployment };