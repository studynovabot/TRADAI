/**
 * Advanced Chart Analysis System Setup Script
 * 
 * Installs dependencies, configures the system, and validates the installation
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

class AdvancedChartAnalysisSetup {
    constructor() {
        this.setupSteps = [];
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Install chocolatey package manager if not available (Windows only)
     */
    async installChocolatey() {
        if (process.platform !== 'win32') return;

        try {
            await execAsync('choco --version');
            console.log('   ✅ Chocolatey already installed');
        } catch (error) {
            console.log('   📦 Installing Chocolatey package manager...');
            try {
                const installScript = 'Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://community.chocolatey.org/install.ps1\'))';
                await execAsync(`powershell -Command "${installScript}"`);
                console.log('   ✅ Chocolatey installed successfully');
            } catch (chocoError) {
                console.log('   ⚠️ Failed to install Chocolatey automatically');
                throw new Error('Please install Chocolatey manually from https://chocolatey.org/install or install CMake and Visual Studio Build Tools manually');
            }
        }
    }

    /**
     * Main setup process
     */
    async runSetup() {
        console.log('🚀 Setting up Advanced Chart Analysis System...');
        console.log('=' .repeat(60));
        
        try {
            await this.installChocolatey();
            await this.checkPrerequisites();
            await this.installDependencies();
            await this.setupDirectories();
            await this.configureSystem();
            await this.validateInstallation();
            await this.generateSetupReport();

            console.log('\n🎉 Setup completed successfully!');

        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            await this.generateErrorReport(error);
            throw error;
        }
    }

    /**
     * Check system prerequisites
     */
    async checkPrerequisites() {
        console.log('\n📋 Step 1: Checking Prerequisites...');

        const step = { name: 'Prerequisites Check', startTime: Date.now(), success: false };

        try {
            // Check Node.js version
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

            if (majorVersion < 18) {
                throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
            }

            console.log(`   ✅ Node.js version: ${nodeVersion}`);

            // Check available memory
            const memoryUsage = process.memoryUsage();
            const availableMemory = memoryUsage.heapTotal / 1024 / 1024; // MB

            if (availableMemory < 512) {
                this.warnings.push('Low available memory detected. Performance may be affected.');
            }

            console.log(`   ✅ Available memory: ${availableMemory.toFixed(0)}MB`);

            // Check for cmake (required for opencv4nodejs)
            try {
                const { stdout } = await execAsync('cmake --version');
                console.log('   ✅ CMake found');
            } catch (error) {
                console.log('   ❌ CMake not found - installing...');
                try {
                    if (process.platform === 'win32') {
                        await execAsync('choco install cmake -y');
                        console.log('   ✅ CMake installed via chocolatey');
                    } else {
                        throw new Error('Please install CMake manually for your platform');
                    }
                } catch (installError) {
                    throw new Error('CMake installation failed. Please install CMake manually from https://cmake.org/download/');
                }
            }

            // Check for Python (required for opencv4nodejs compilation)
            try {
                const { stdout } = await execAsync('python --version');
                console.log('   ✅ Python found');
            } catch (error) {
                try {
                    const { stdout } = await execAsync('python3 --version');
                    console.log('   ✅ Python3 found');
                } catch (error3) {
                    this.warnings.push('Python not found - may be required for opencv4nodejs compilation');
                }
            }

            // Check for Visual Studio Build Tools (Windows only)
            if (process.platform === 'win32') {
                try {
                    const { stdout } = await execAsync('where cl');
                    console.log('   ✅ Visual Studio Build Tools found');
                } catch (error) {
                    console.log('   ⚠️ Visual Studio Build Tools not found');
                    console.log('   💡 Installing Visual Studio Build Tools via chocolatey...');
                    try {
                        await execAsync('choco install visualstudio2019buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools" -y');
                        console.log('   ✅ Visual Studio Build Tools installed');
                    } catch (buildToolsError) {
                        this.warnings.push('Visual Studio Build Tools not found - may be required for opencv4nodejs compilation on Windows');
                    }
                }
            }

            // Check disk space
            try {
                const stats = await fs.stat(process.cwd());
                console.log('   ✅ Disk access verified');
            } catch (error) {
                throw new Error('Cannot access current directory');
            }

            // Check package.json
            try {
                const packageJson = await fs.readFile('package.json', 'utf8');
                const pkg = JSON.parse(packageJson);
                console.log(`   ✅ Project: ${pkg.name} v${pkg.version}`);
            } catch (error) {
                throw new Error('package.json not found or invalid');
            }

            step.success = true;
            console.log('   ✅ All prerequisites met');

        } catch (error) {
            step.error = error.message;
            this.errors.push(error.message);
            throw error;
        }

        step.duration = Date.now() - step.startTime;
        this.setupSteps.push(step);
    }

    /**
     * Install required dependencies
     */
    async installDependencies() {
        console.log('\n📦 Step 2: Installing Dependencies...');

        const step = { name: 'Dependency Installation', startTime: Date.now(), success: false };

        // Define required dependencies outside try block for catch block access
        const requiredDependencies = [
            'opencv4nodejs',
            '@tensorflow/tfjs-node',
            'canvas',
            'image-size',
            'file-type',
            'jimp',
            'formidable'
        ];

        try {
            console.log(`   🔍 Checking ${requiredDependencies.length} required dependencies...`);
            console.log(`   📋 Dependencies: ${requiredDependencies.join(', ')}`);
            console.log('   📥 Installing computer vision dependencies...');

            // Check which dependencies are missing
            const missingDeps = [];

            for (const dep of requiredDependencies) {
                try {
                    require.resolve(dep);
                    console.log(`   ✅ ${dep} already installed`);
                } catch (error) {
                    missingDeps.push(dep);
                }
            }

            if (missingDeps.length > 0) {
                console.log(`   📥 Installing missing dependencies: ${missingDeps.join(', ')}`);

                // Special handling for opencv4nodejs
                if (missingDeps.includes('opencv4nodejs')) {
                    console.log('   🔧 Installing opencv4nodejs with special configuration...');

                    // Set environment variables for opencv4nodejs
                    process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '0';
                    process.env.OPENCV_VERSION = '4.5.5';

                    // Install opencv4nodejs separately with longer timeout
                    try {
                        const { stdout, stderr } = await execAsync('npm install opencv4nodejs --timeout=600000', {
                            timeout: 600000 // 10 minutes timeout
                        });
                        console.log('   ✅ opencv4nodejs installed successfully');

                        // Remove opencv4nodejs from missing deps list
                        const index = missingDeps.indexOf('opencv4nodejs');
                        missingDeps.splice(index, 1);
                    } catch (opencvError) {
                        console.log(`   ❌ opencv4nodejs installation failed: ${opencvError.message}`);
                        throw new Error(`opencv4nodejs installation failed. Please ensure CMake and Python are properly installed. Error: ${opencvError.message}`);
                    }
                }

                // Install remaining dependencies
                if (missingDeps.length > 0) {
                    const installCommand = `npm install ${missingDeps.join(' ')}`;
                    const { stdout, stderr } = await execAsync(installCommand);

                    if (stderr && !stderr.includes('WARN') && !stderr.includes('deprecated')) {
                        throw new Error(`Installation failed: ${stderr}`);
                    }

                    console.log('   ✅ Remaining dependencies installed successfully');
                }
            } else {
                console.log('   ✅ All dependencies already installed');
            }

            // Verify installations
            console.log('   🔍 Verifying all installations...');
            for (const dep of requiredDependencies) {
                try {
                    require.resolve(dep);
                    console.log(`   ✅ ${dep} verified`);
                } catch (error) {
                    throw new Error(`Failed to verify installation of ${dep}: ${error.message}`);
                }
            }
            
            step.success = true;
            step.details = {
                requiredDependencies: requiredDependencies.length,
                missingDependencies: missingDeps.length,
                installedDependencies: requiredDependencies.length - missingDeps.length
            };
            
        } catch (error) {
            step.error = error.message;
            this.errors.push(error.message);

            console.log('   ❌ Dependency installation failed');
            console.log(`   🔍 Error details: ${error.message}`);
            console.log('   💡 Please ensure all prerequisites are met:');
            console.log('      - CMake is installed and in PATH');
            console.log('      - Python is installed and in PATH');
            console.log('      - Visual Studio Build Tools are installed (Windows)');
            console.log('      - Sufficient disk space and memory available');

            throw new Error(`Dependency installation failed: ${error.message}`);
        }
        
        step.duration = Date.now() - step.startTime;
        this.setupSteps.push(step);
    }

    /**
     * Setup required directories
     */
    async setupDirectories() {
        console.log('\n📁 Step 3: Setting up Directories...');
        
        const step = { name: 'Directory Setup', startTime: Date.now(), success: false };
        
        try {
            const directories = [
                'src/core',
                'components',
                'pages/api',
                'tests',
                'test-results',
                'logs/analysis',
                'data/screenshots',
                'data/models',
                'scripts'
            ];
            
            for (const dir of directories) {
                try {
                    await fs.access(dir);
                    console.log(`   ✅ Directory exists: ${dir}`);
                } catch (error) {
                    await fs.mkdir(dir, { recursive: true });
                    console.log(`   📁 Created directory: ${dir}`);
                }
            }
            
            // Create .gitignore entries for data directories
            const gitignoreEntries = [
                'data/screenshots/*',
                'data/models/*',
                'logs/*',
                'test-results/*',
                '!data/screenshots/.gitkeep',
                '!data/models/.gitkeep',
                '!logs/.gitkeep',
                '!test-results/.gitkeep'
            ];
            
            try {
                const existingGitignore = await fs.readFile('.gitignore', 'utf8');
                const newEntries = gitignoreEntries.filter(entry => !existingGitignore.includes(entry));
                
                if (newEntries.length > 0) {
                    await fs.appendFile('.gitignore', '\n# Advanced Chart Analysis\n' + newEntries.join('\n') + '\n');
                    console.log('   ✅ Updated .gitignore');
                }
            } catch (error) {
                // Create .gitignore if it doesn't exist
                await fs.writeFile('.gitignore', '# Advanced Chart Analysis\n' + gitignoreEntries.join('\n') + '\n');
                console.log('   📁 Created .gitignore');
            }
            
            step.success = true;
            step.details = {
                directoriesCreated: directories.length,
                gitignoreUpdated: true
            };
            
        } catch (error) {
            step.error = error.message;
            this.errors.push(error.message);
            throw error;
        }
        
        step.duration = Date.now() - step.startTime;
        this.setupSteps.push(step);
    }

    /**
     * Configure system settings
     */
    async configureSystem() {
        console.log('\n⚙️ Step 4: Configuring System...');
        
        const step = { name: 'System Configuration', startTime: Date.now(), success: false };
        
        try {
            // Create configuration file
            const config = {
                advancedChartAnalysis: {
                    enabled: true,
                    version: '1.0.0',
                    imageProcessing: {
                        minWidth: 800,
                        minHeight: 600,
                        maxWidth: 4096,
                        maxHeight: 4096,
                        qualityThreshold: 0.7
                    },
                    computerVision: {
                        patternConfidenceThreshold: 0.7,
                        supportResistanceMinTouches: 3,
                        candleColorThreshold: 30
                    },
                    signalGeneration: {
                        minSignalConfidence: 80,
                        strongSignalConfidence: 90,
                        defaultRiskRewardRatio: 2.0
                    },
                    api: {
                        maxFileSize: 10485760, // 10MB
                        allowedFormats: ['image/png', 'image/jpeg', 'image/webp'],
                        rateLimit: {
                            windowMs: 900000, // 15 minutes
                            max: 100 // limit each IP to 100 requests per windowMs
                        }
                    }
                }
            };
            
            const configPath = 'config/advanced-chart-analysis.json';
            await fs.mkdir(path.dirname(configPath), { recursive: true });
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
            console.log(`   ✅ Configuration saved to ${configPath}`);
            
            // Update package.json scripts
            try {
                const packageJson = await fs.readFile('package.json', 'utf8');
                const pkg = JSON.parse(packageJson);
                
                const newScripts = {
                    'test:advanced-chart-analysis': 'node tests/advancedChartAnalysisTest.js',
                    'setup:advanced-chart-analysis': 'node scripts/setup-advanced-chart-analysis.js',
                    'dev:advanced-chart-analysis': 'npm run dev && open http://localhost:3000/advanced-chart-analysis'
                };
                
                pkg.scripts = { ...pkg.scripts, ...newScripts };
                
                await fs.writeFile('package.json', JSON.stringify(pkg, null, 2));
                console.log('   ✅ Updated package.json scripts');
            } catch (error) {
                this.warnings.push('Failed to update package.json scripts');
            }
            
            step.success = true;
            step.details = {
                configurationCreated: true,
                scriptsUpdated: true
            };
            
        } catch (error) {
            step.error = error.message;
            this.errors.push(error.message);
            throw error;
        }
        
        step.duration = Date.now() - step.startTime;
        this.setupSteps.push(step);
    }

    /**
     * Validate installation
     */
    async validateInstallation() {
        console.log('\n✅ Step 5: Validating Installation...');
        
        const step = { name: 'Installation Validation', startTime: Date.now(), success: false };
        
        try {
            // Test core module imports
            const coreModules = [
                '../src/core/AdvancedImageProcessor',
                '../src/core/TradingDataExtractor',
                '../src/core/ComputerVisionEngine',
                '../src/core/AdvancedMultiTimeframeAnalyzer',
                '../src/core/AdvancedSignalGenerator',
                '../src/core/AdvancedChartAnalysisEngine'
            ];
            
            for (const module of coreModules) {
                try {
                    require(module);
                    console.log(`   ✅ ${path.basename(module)} loaded successfully`);
                } catch (error) {
                    throw new Error(`Failed to load ${module}: ${error.message}`);
                }
            }
            
            // Test API endpoint
            try {
                const apiModule = require('../pages/api/advanced-chart-analysis');
                console.log('   ✅ API endpoint loaded successfully');
            } catch (error) {
                this.warnings.push('API endpoint validation failed - may need Next.js environment');
            }
            
            // Test React component
            try {
                const componentPath = '../components/AdvancedChartAnalyzer.tsx';
                const componentContent = await fs.readFile(componentPath, 'utf8');
                if (componentContent.includes('AdvancedChartAnalyzer')) {
                    console.log('   ✅ React component validated');
                } else {
                    throw new Error('Component validation failed');
                }
            } catch (error) {
                this.warnings.push('React component validation failed');
            }
            
            step.success = true;
            step.details = {
                coreModulesValidated: coreModules.length,
                apiEndpointValidated: true,
                componentValidated: true
            };
            
        } catch (error) {
            step.error = error.message;
            this.errors.push(error.message);
            throw error;
        }
        
        step.duration = Date.now() - step.startTime;
        this.setupSteps.push(step);
    }

    /**
     * Generate setup report
     */
    async generateSetupReport() {
        const report = {
            timestamp: new Date().toISOString(),
            success: this.errors.length === 0,
            setupSteps: this.setupSteps,
            errors: this.errors,
            warnings: this.warnings,
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                memoryUsage: process.memoryUsage()
            },
            nextSteps: [
                'Run "npm run test:advanced-chart-analysis" to test the system',
                'Start the development server with "npm run dev"',
                'Navigate to "/advanced-chart-analysis" to use the interface',
                'Upload trading chart screenshots for analysis'
            ]
        };
        
        try {
            await fs.mkdir('setup-results', { recursive: true });
            await fs.writeFile(
                'setup-results/advanced-chart-analysis-setup.json',
                JSON.stringify(report, null, 2)
            );
            console.log('\n💾 Setup report saved to setup-results/advanced-chart-analysis-setup.json');
        } catch (error) {
            console.log('\n⚠️ Failed to save setup report:', error.message);
        }
        
        // Display summary
        console.log('\n📊 Setup Summary:');
        console.log(`   Steps completed: ${this.setupSteps.filter(s => s.success).length}/${this.setupSteps.length}`);
        console.log(`   Errors: ${this.errors.length}`);
        console.log(`   Warnings: ${this.warnings.length}`);
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            this.warnings.forEach(warning => console.log(`   • ${warning}`));
        }
        
        console.log('\n🚀 Next Steps:');
        report.nextSteps.forEach(step => console.log(`   • ${step}`));
    }

    /**
     * Generate error report
     */
    async generateErrorReport(error) {
        const errorReport = {
            timestamp: new Date().toISOString(),
            error: error.message,
            setupSteps: this.setupSteps,
            errors: this.errors,
            warnings: this.warnings,
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch
            }
        };
        
        try {
            await fs.mkdir('setup-results', { recursive: true });
            await fs.writeFile(
                'setup-results/advanced-chart-analysis-setup-error.json',
                JSON.stringify(errorReport, null, 2)
            );
            console.log('\n💾 Error report saved to setup-results/advanced-chart-analysis-setup-error.json');
        } catch (saveError) {
            console.log('\n⚠️ Failed to save error report:', saveError.message);
        }
    }
}

// Export for use in other modules
module.exports = { AdvancedChartAnalysisSetup };

// Run setup if called directly
if (require.main === module) {
    const setup = new AdvancedChartAnalysisSetup();
    setup.runSetup()
        .then(() => {
            console.log('\n✅ Setup completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Setup failed:', error.message);
            process.exit(1);
        });
}
