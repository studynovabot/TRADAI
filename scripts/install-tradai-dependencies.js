/**
 * TRADAI Advanced Chart Analysis Dependencies Installation Script
 * NO FALLBACKS - All dependencies must be installed successfully
 */

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const util = require('util');
const path = require('path');

const execAsync = util.promisify(exec);

class TradaiDependencyInstaller {
    constructor() {
        this.requiredDependencies = [
            'opencv4nodejs',
            '@tensorflow/tfjs-node', 
            'canvas',
            'image-size',
            'file-type',
            'jimp',
            'formidable'
        ];
        this.installationLog = [];
        this.errors = [];
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        this.installationLog.push(logEntry);
    }

    async checkSystemRequirements() {
        this.log('🔍 Checking system requirements...');
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 18) {
            throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
        }
        this.log(`✅ Node.js version: ${nodeVersion}`);

        // Check available memory (heap usage, not total system RAM)
        const memoryUsage = process.memoryUsage();
        const heapMemory = memoryUsage.heapTotal / 1024 / 1024;
        this.log(`✅ Node.js heap memory: ${heapMemory.toFixed(0)}MB`);

        // Check total system memory if possible
        try {
            const os = require('os');
            const totalMemory = os.totalmem() / 1024 / 1024 / 1024; // GB
            this.log(`✅ Total system memory: ${totalMemory.toFixed(1)}GB`);

            if (totalMemory < 3) {
                this.log('⚠️ Warning: Less than 4GB total RAM detected. opencv4nodejs compilation may be slow or fail.');
            }
        } catch (error) {
            this.log('ℹ️ Could not determine total system memory');
        }

        // Check disk space (approximate)
        try {
            await fs.access(process.cwd());
            this.log('✅ Disk access verified');
        } catch (error) {
            throw new Error('Cannot access current directory');
        }
    }

    async installChocolatey() {
        if (process.platform !== 'win32') {
            this.log('ℹ️ Skipping Chocolatey installation (not Windows)');
            return;
        }

        try {
            await execAsync('choco --version');
            this.log('✅ Chocolatey already installed');
            return;
        } catch (error) {
            this.log('📦 Installing Chocolatey package manager...');
            
            const installScript = `
                Set-ExecutionPolicy Bypass -Scope Process -Force;
                [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072;
                iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
            `;
            
            try {
                await execAsync(`powershell -Command "${installScript}"`, { timeout: 300000 });
                this.log('✅ Chocolatey installed successfully');
                this.log('ℹ️ Please restart your terminal after installation for full functionality');
            } catch (chocoError) {
                throw new Error(`Chocolatey installation failed: ${chocoError.message}`);
            }
        }
    }

    async installCMake() {
        try {
            const { stdout } = await execAsync('cmake --version');
            this.log('✅ CMake already installed');
            return;
        } catch (error) {
            this.log('📦 Installing CMake...');
            
            if (process.platform === 'win32') {
                try {
                    await execAsync('choco install cmake -y', { timeout: 600000 });
                    this.log('✅ CMake installed via Chocolatey');
                } catch (chocoError) {
                    throw new Error(`CMake installation failed: ${chocoError.message}. Please install CMake manually from https://cmake.org/download/`);
                }
            } else {
                throw new Error('Please install CMake manually for your platform: https://cmake.org/download/');
            }
        }
    }

    async installPython() {
        try {
            await execAsync('python --version');
            this.log('✅ Python already installed');
            return;
        } catch (error) {
            try {
                await execAsync('python3 --version');
                this.log('✅ Python3 already installed');
                return;
            } catch (error3) {
                this.log('📦 Installing Python...');
                
                if (process.platform === 'win32') {
                    try {
                        await execAsync('choco install python -y', { timeout: 600000 });
                        this.log('✅ Python installed via Chocolatey');
                    } catch (chocoError) {
                        throw new Error(`Python installation failed: ${chocoError.message}. Please install Python manually from https://python.org/downloads/`);
                    }
                } else {
                    throw new Error('Please install Python manually for your platform: https://python.org/downloads/');
                }
            }
        }
    }

    async installVisualStudioBuildTools() {
        if (process.platform !== 'win32') {
            this.log('ℹ️ Skipping Visual Studio Build Tools (not Windows)');
            return;
        }

        try {
            await execAsync('where cl');
            this.log('✅ Visual Studio Build Tools already installed');
            return;
        } catch (error) {
            this.log('📦 Installing Visual Studio Build Tools...');
            
            try {
                const buildToolsCommand = 'choco install visualstudio2019buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.Windows10SDK.19041" -y';
                await execAsync(buildToolsCommand, { timeout: 1800000 }); // 30 minutes timeout
                this.log('✅ Visual Studio Build Tools installed');
            } catch (buildError) {
                throw new Error(`Visual Studio Build Tools installation failed: ${buildError.message}. Please install manually from https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2019`);
            }
        }
    }

    async installPrerequisites() {
        this.log('🔧 Installing prerequisites...');

        await this.installChocolatey();
        await this.installCMake();
        await this.installPython();
        await this.installVisualStudioBuildTools();

        this.log('✅ All prerequisites installed');
    }

    async installDependency(dependency) {
        this.log(`📦 Installing ${dependency}...`);

        // Check if already installed
        try {
            require.resolve(dependency);
            this.log(`✅ ${dependency} already installed`);
            return true;
        } catch (error) {
            // Not installed, proceed with installation
        }

        try {
            if (dependency === 'opencv4nodejs') {
                return await this.installOpenCV();
            } else if (dependency === '@tensorflow/tfjs-node') {
                return await this.installTensorFlow();
            } else if (dependency === 'canvas') {
                return await this.installCanvas();
            } else {
                // Standard installation for other dependencies
                const { stdout, stderr } = await execAsync(`npm install ${dependency}`, {
                    timeout: 300000, // 5 minutes
                    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                });

                if (stderr && !stderr.includes('WARN') && !stderr.includes('deprecated')) {
                    this.log(`⚠️ Installation warnings for ${dependency}: ${stderr}`);
                }
            }

            // Verify installation
            try {
                require.resolve(dependency);
                this.log(`✅ ${dependency} installed and verified successfully`);
                return true;
            } catch (verifyError) {
                throw new Error(`Installation verification failed for ${dependency}`);
            }

        } catch (error) {
            this.log(`❌ Failed to install ${dependency}: ${error.message}`);
            this.errors.push(`${dependency}: ${error.message}`);
            return false;
        }
    }

    async installOpenCV() {
        this.log('🔧 Installing opencv4nodejs with optimized settings...');

        // Set environment variables for optimal opencv4nodejs compilation
        process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '0';
        process.env.OPENCV_VERSION = '4.5.5';
        process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION = '4.5.5';
        process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS = '-DOPENCV_GENERATE_PKGCONFIG=ON';

        try {
            const { stdout, stderr } = await execAsync('npm install opencv4nodejs', {
                timeout: 1800000, // 30 minutes timeout for opencv compilation
                maxBuffer: 1024 * 1024 * 50, // 50MB buffer
                env: { ...process.env }
            });

            this.log('✅ opencv4nodejs compiled and installed successfully');
            return true;

        } catch (error) {
            throw new Error(`opencv4nodejs installation failed: ${error.message}. Ensure CMake, Python, and Visual Studio Build Tools are properly installed.`);
        }
    }

    async installTensorFlow() {
        this.log('🔧 Installing @tensorflow/tfjs-node...');

        try {
            const { stdout, stderr } = await execAsync('npm install @tensorflow/tfjs-node', {
                timeout: 600000, // 10 minutes timeout
                maxBuffer: 1024 * 1024 * 20 // 20MB buffer
            });

            this.log('✅ @tensorflow/tfjs-node installed successfully');
            return true;

        } catch (error) {
            throw new Error(`@tensorflow/tfjs-node installation failed: ${error.message}`);
        }
    }

    async installCanvas() {
        this.log('🔧 Installing canvas with native dependencies...');

        try {
            const { stdout, stderr } = await execAsync('npm install canvas', {
                timeout: 600000, // 10 minutes timeout
                maxBuffer: 1024 * 1024 * 20 // 20MB buffer
            });

            this.log('✅ canvas installed successfully');
            return true;

        } catch (error) {
            throw new Error(`canvas installation failed: ${error.message}`);
        }
    }

    async installAllDependencies() {
        this.log('📦 Installing all required dependencies...');

        const results = [];

        for (const dependency of this.requiredDependencies) {
            const success = await this.installDependency(dependency);
            results.push({ dependency, success });

            if (!success) {
                throw new Error(`CRITICAL: Failed to install ${dependency}. No fallbacks allowed.`);
            }
        }

        this.log('✅ All dependencies installed successfully');
        return results;
    }

    async testInstallation() {
        this.log('🧪 Testing installation...');

        const testResults = [];

        for (const dependency of this.requiredDependencies) {
            try {
                const module = require(dependency);
                this.log(`✅ ${dependency} - Module loaded successfully`);

                // Specific tests for key modules
                if (dependency === 'opencv4nodejs') {
                    const cv = module;
                    this.log(`   📊 OpenCV version: ${cv.version}`);
                    testResults.push({ dependency, status: 'success', version: cv.version });
                } else if (dependency === '@tensorflow/tfjs-node') {
                    const tf = module;
                    this.log(`   🧠 TensorFlow version: ${tf.version.tfjs}`);
                    testResults.push({ dependency, status: 'success', version: tf.version.tfjs });
                } else if (dependency === 'canvas') {
                    const { createCanvas } = module;
                    const canvas = createCanvas(100, 100);
                    this.log(`   🎨 Canvas test: ${canvas.width}x${canvas.height}`);
                    testResults.push({ dependency, status: 'success', test: 'canvas_creation' });
                } else {
                    testResults.push({ dependency, status: 'success' });
                }

            } catch (error) {
                this.log(`❌ ${dependency} - Test failed: ${error.message}`);
                testResults.push({ dependency, status: 'failed', error: error.message });
                throw new Error(`Installation test failed for ${dependency}: ${error.message}`);
            }
        }

        this.log('✅ All installation tests passed');
        return testResults;
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            success: this.errors.length === 0,
            dependencies: this.requiredDependencies,
            errors: this.errors,
            installationLog: this.installationLog,
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                memoryUsage: process.memoryUsage()
            }
        };

        try {
            await fs.mkdir('logs', { recursive: true });
            await fs.writeFile(
                'logs/tradai-dependency-installation.json',
                JSON.stringify(report, null, 2)
            );
            this.log('📄 Installation report saved to logs/tradai-dependency-installation.json');
        } catch (error) {
            this.log(`⚠️ Failed to save report: ${error.message}`);
        }

        return report;
    }

    async run() {
        try {
            this.log('🚀 TRADAI Advanced Chart Analysis Dependencies Installation');
            this.log('=' .repeat(70));

            await this.checkSystemRequirements();
            await this.installPrerequisites();
            await this.installAllDependencies();
            await this.testInstallation();

            const report = await this.generateReport();

            this.log('🎉 INSTALLATION COMPLETED SUCCESSFULLY!');
            this.log('🚀 TRADAI Advanced Chart Analysis System is ready for professional-grade trading chart analysis');
            this.log('📊 All dependencies installed and verified');
            this.log('💡 Next steps:');
            this.log('   1. Test with actual trading chart screenshots');
            this.log('   2. Verify technical analysis output quality');
            this.log('   3. Validate confidence percentage accuracy');

            return report;

        } catch (error) {
            this.log(`❌ INSTALLATION FAILED: ${error.message}`);
            this.errors.push(error.message);

            await this.generateReport();

            this.log('💡 Troubleshooting steps:');
            this.log('   1. Ensure you are running as Administrator (Windows)');
            this.log('   2. Check internet connection for package downloads');
            this.log('   3. Verify sufficient disk space (minimum 2GB)');
            this.log('   4. Install prerequisites manually if automated installation fails');

            throw error;
        }
    }
}

// Run installation if called directly
if (require.main === module) {
    const installer = new TradaiDependencyInstaller();
    installer.run()
        .then(() => {
            console.log('\n✅ Installation completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Installation failed:', error.message);
            process.exit(1);
        });
}

module.exports = { TradaiDependencyInstaller };
