/**
 * Direct Installation Script for TRADAI Dependencies
 * Bypasses package managers and installs dependencies directly
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const util = require('util');

const execAsync = util.promisify(exec);

class DirectInstaller {
    constructor() {
        this.dependencies = [
            'image-size',
            'file-type', 
            'jimp',
            'formidable',
            'canvas',
            '@tensorflow/tfjs-node',
            'opencv4nodejs'
        ];
        this.log = [];
    }

    logMessage(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        this.log.push(logEntry);
    }

    async installDependency(dep) {
        this.logMessage(`📦 Installing ${dep}...`);
        
        try {
            // Check if already installed
            try {
                require.resolve(dep);
                this.logMessage(`✅ ${dep} already installed`);
                return true;
            } catch (error) {
                // Not installed, proceed
            }

            let installCommand;
            let timeout = 300000; // 5 minutes default

            if (dep === 'opencv4nodejs') {
                // Special handling for opencv4nodejs
                this.logMessage('🔧 Installing opencv4nodejs with special configuration...');
                
                // Set environment variables
                process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '0';
                process.env.OPENCV_VERSION = '4.5.5';
                
                installCommand = 'npm install opencv4nodejs --build-from-source';
                timeout = 1800000; // 30 minutes for opencv compilation
                
            } else if (dep === '@tensorflow/tfjs-node') {
                this.logMessage('🧠 Installing TensorFlow.js Node...');
                installCommand = `npm install ${dep}`;
                timeout = 600000; // 10 minutes
                
            } else if (dep === 'canvas') {
                this.logMessage('🎨 Installing Canvas with native dependencies...');
                installCommand = `npm install ${dep}`;
                timeout = 600000; // 10 minutes
                
            } else {
                installCommand = `npm install ${dep}`;
            }

            const { stdout, stderr } = await execAsync(installCommand, {
                timeout: timeout,
                maxBuffer: 1024 * 1024 * 50, // 50MB buffer
                env: { ...process.env }
            });

            if (stderr && !stderr.includes('WARN') && !stderr.includes('deprecated')) {
                this.logMessage(`⚠️ Installation warnings: ${stderr.substring(0, 200)}...`);
            }

            // Verify installation
            try {
                require.resolve(dep);
                this.logMessage(`✅ ${dep} installed and verified successfully`);
                return true;
            } catch (verifyError) {
                throw new Error(`Installation verification failed: ${verifyError.message}`);
            }

        } catch (error) {
            this.logMessage(`❌ Failed to install ${dep}: ${error.message}`);
            
            if (dep === 'opencv4nodejs') {
                this.logMessage('💡 opencv4nodejs installation failed. This requires:');
                this.logMessage('   - CMake installed and in PATH');
                this.logMessage('   - Python installed and in PATH');
                this.logMessage('   - Visual Studio Build Tools (Windows)');
                this.logMessage('   - Sufficient memory and disk space');
                this.logMessage('   - Consider installing these manually and retrying');
            }
            
            return false;
        }
    }

    async testDependency(dep) {
        try {
            const module = require(dep);
            
            if (dep === 'opencv4nodejs') {
                const cv = module;
                this.logMessage(`   📊 OpenCV version: ${cv.version}`);
                return { status: 'success', version: cv.version };
            } else if (dep === '@tensorflow/tfjs-node') {
                const tf = module;
                this.logMessage(`   🧠 TensorFlow version: ${tf.version.tfjs}`);
                return { status: 'success', version: tf.version.tfjs };
            } else if (dep === 'canvas') {
                const { createCanvas } = module;
                const canvas = createCanvas(100, 100);
                this.logMessage(`   🎨 Canvas test: ${canvas.width}x${canvas.height}`);
                return { status: 'success', test: 'canvas_creation' };
            } else {
                return { status: 'success' };
            }
            
        } catch (error) {
            this.logMessage(`❌ ${dep} test failed: ${error.message}`);
            return { status: 'failed', error: error.message };
        }
    }

    async run() {
        this.logMessage('🚀 TRADAI Direct Dependencies Installation');
        this.logMessage('=' .repeat(50));
        
        const results = [];
        let successCount = 0;
        
        for (const dep of this.dependencies) {
            const success = await this.installDependency(dep);
            results.push({ dependency: dep, success });
            
            if (success) {
                successCount++;
            }
        }
        
        this.logMessage('\n🧪 Testing installations...');
        const testResults = [];
        
        for (const result of results) {
            if (result.success) {
                const testResult = await this.testDependency(result.dependency);
                testResults.push({ dependency: result.dependency, ...testResult });
            }
        }
        
        this.logMessage('\n📊 Installation Summary:');
        this.logMessage(`✅ Successful: ${successCount}/${this.dependencies.length}`);
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        successful.forEach(r => this.logMessage(`   ✅ ${r.dependency}`));
        
        if (failed.length > 0) {
            this.logMessage(`❌ Failed: ${failed.length}`);
            failed.forEach(r => this.logMessage(`   ❌ ${r.dependency}`));
        }
        
        // Save report
        try {
            await fs.mkdir('logs', { recursive: true });
            const report = {
                timestamp: new Date().toISOString(),
                success: failed.length === 0,
                results: results,
                testResults: testResults,
                log: this.log
            };
            
            await fs.writeFile(
                'logs/direct-installation-report.json',
                JSON.stringify(report, null, 2)
            );
            this.logMessage('📄 Report saved to logs/direct-installation-report.json');
        } catch (error) {
            this.logMessage(`⚠️ Failed to save report: ${error.message}`);
        }
        
        if (failed.length === 0) {
            this.logMessage('\n🎉 ALL DEPENDENCIES INSTALLED SUCCESSFULLY!');
            this.logMessage('🚀 TRADAI Advanced Chart Analysis System is ready');
            this.logMessage('📊 Professional-grade trading chart analysis capabilities enabled');
            return true;
        } else {
            this.logMessage('\n⚠️ Some dependencies failed to install');
            this.logMessage('💡 Manual installation may be required for failed dependencies');
            return false;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const installer = new DirectInstaller();
    installer.run()
        .then((success) => {
            if (success) {
                console.log('\n✅ Installation completed successfully');
                process.exit(0);
            } else {
                console.log('\n⚠️ Installation completed with some failures');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('\n❌ Installation failed:', error.message);
            process.exit(1);
        });
}

module.exports = { DirectInstaller };
