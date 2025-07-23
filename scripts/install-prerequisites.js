/**
 * Install Prerequisites for Canvas and OpenCV
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const util = require('util');

const execAsync = util.promisify(exec);

class PrerequisiteInstaller {
    constructor() {
        this.log = [];
    }

    logMessage(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        this.log.push(logEntry);
    }

    async installGTKForCanvas() {
        this.logMessage('🎨 Installing GTK libraries for Canvas...');
        
        try {
            // Try to install GTK via chocolatey with full path
            const chocoPath = 'C:\\ProgramData\\chocolatey\\bin\\choco.exe';
            
            try {
                await fs.access(chocoPath);
                this.logMessage('✅ Found Chocolatey at standard location');
                
                // Install GTK
                await execAsync(`"${chocoPath}" install gtk-runtime -y`, { timeout: 600000 });
                this.logMessage('✅ GTK runtime installed via Chocolatey');
                
            } catch (error) {
                this.logMessage('⚠️ Chocolatey not found at standard location, trying alternative...');
                
                // Try direct download and install
                this.logMessage('📥 Downloading GTK runtime manually...');
                
                const downloadCommand = `
                    powershell -Command "
                    $url = 'https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases/download/2022-01-04/gtk3-runtime-3.24.31-2022-01-04-ts-win64.exe';
                    $output = 'gtk-installer.exe';
                    Invoke-WebRequest -Uri $url -OutFile $output;
                    Start-Process -FilePath $output -ArgumentList '/S' -Wait;
                    Remove-Item $output
                    "
                `;
                
                await execAsync(downloadCommand, { timeout: 600000 });
                this.logMessage('✅ GTK runtime installed manually');
            }
            
            return true;
            
        } catch (error) {
            this.logMessage(`❌ Failed to install GTK: ${error.message}`);
            return false;
        }
    }

    async installCMake() {
        this.logMessage('🔧 Installing CMake...');
        
        try {
            // Check if CMake is already installed
            try {
                await execAsync('cmake --version');
                this.logMessage('✅ CMake already installed');
                return true;
            } catch (error) {
                // Not installed, proceed with installation
            }
            
            const chocoPath = 'C:\\ProgramData\\chocolatey\\bin\\choco.exe';
            
            try {
                await fs.access(chocoPath);
                await execAsync(`"${chocoPath}" install cmake -y`, { timeout: 600000 });
                this.logMessage('✅ CMake installed via Chocolatey');
                
            } catch (error) {
                // Manual installation
                this.logMessage('📥 Installing CMake manually...');
                
                const downloadCommand = `
                    powershell -Command "
                    $url = 'https://github.com/Kitware/CMake/releases/download/v3.28.1/cmake-3.28.1-windows-x86_64.msi';
                    $output = 'cmake-installer.msi';
                    Invoke-WebRequest -Uri $url -OutFile $output;
                    Start-Process -FilePath 'msiexec.exe' -ArgumentList '/i', $output, '/quiet' -Wait;
                    Remove-Item $output
                    "
                `;
                
                await execAsync(downloadCommand, { timeout: 600000 });
                this.logMessage('✅ CMake installed manually');
            }
            
            return true;
            
        } catch (error) {
            this.logMessage(`❌ Failed to install CMake: ${error.message}`);
            return false;
        }
    }

    async installCanvasWithPrebuilt() {
        this.logMessage('🎨 Attempting to install Canvas with prebuilt binaries...');
        
        try {
            // Try installing an older version of canvas that has prebuilt binaries
            await execAsync('npm install canvas@2.9.3', { timeout: 600000 });
            
            // Verify installation
            try {
                const { createCanvas } = require('canvas');
                const canvas = createCanvas(100, 100);
                this.logMessage(`✅ Canvas installed successfully: ${canvas.width}x${canvas.height}`);
                return true;
            } catch (verifyError) {
                throw new Error(`Canvas verification failed: ${verifyError.message}`);
            }
            
        } catch (error) {
            this.logMessage(`❌ Failed to install Canvas: ${error.message}`);
            return false;
        }
    }

    async installOpenCVWithAutoBuild() {
        this.logMessage('📊 Installing opencv4nodejs with auto-build...');
        
        try {
            // Set environment variables for auto-build
            process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '0';
            process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION = '4.5.5';
            delete process.env.OPENCV_LIB_DIR; // Remove any existing lib dir setting
            
            await execAsync('npm install opencv4nodejs', { 
                timeout: 1800000, // 30 minutes
                maxBuffer: 1024 * 1024 * 100, // 100MB buffer
                env: { ...process.env }
            });
            
            // Verify installation
            try {
                const cv = require('opencv4nodejs');
                this.logMessage(`✅ opencv4nodejs installed successfully: version ${cv.version}`);
                return true;
            } catch (verifyError) {
                throw new Error(`opencv4nodejs verification failed: ${verifyError.message}`);
            }
            
        } catch (error) {
            this.logMessage(`❌ Failed to install opencv4nodejs: ${error.message}`);
            return false;
        }
    }

    async run() {
        this.logMessage('🚀 Installing Prerequisites for TRADAI Dependencies');
        this.logMessage('=' .repeat(60));
        
        const results = [];
        
        // Install CMake first
        const cmakeSuccess = await this.installCMake();
        results.push({ component: 'CMake', success: cmakeSuccess });
        
        // Install GTK for Canvas
        const gtkSuccess = await this.installGTKForCanvas();
        results.push({ component: 'GTK', success: gtkSuccess });
        
        // Try to install Canvas with prerequisites
        if (gtkSuccess) {
            const canvasSuccess = await this.installCanvasWithPrebuilt();
            results.push({ component: 'Canvas', success: canvasSuccess });
        }
        
        // Try to install opencv4nodejs with CMake
        if (cmakeSuccess) {
            const opencvSuccess = await this.installOpenCVWithAutoBuild();
            results.push({ component: 'opencv4nodejs', success: opencvSuccess });
        }
        
        // Summary
        this.logMessage('\n📊 Installation Summary:');
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        this.logMessage(`✅ Successful: ${successful.length}/${results.length}`);
        successful.forEach(r => this.logMessage(`   ✅ ${r.component}`));
        
        if (failed.length > 0) {
            this.logMessage(`❌ Failed: ${failed.length}`);
            failed.forEach(r => this.logMessage(`   ❌ ${r.component}`));
        }
        
        // Save report
        try {
            await fs.mkdir('logs', { recursive: true });
            const report = {
                timestamp: new Date().toISOString(),
                results: results,
                log: this.log
            };
            
            await fs.writeFile(
                'logs/prerequisites-installation.json',
                JSON.stringify(report, null, 2)
            );
            this.logMessage('📄 Report saved to logs/prerequisites-installation.json');
        } catch (error) {
            this.logMessage(`⚠️ Failed to save report: ${error.message}`);
        }
        
        if (failed.length === 0) {
            this.logMessage('\n🎉 ALL PREREQUISITES INSTALLED SUCCESSFULLY!');
            this.logMessage('🚀 Canvas and opencv4nodejs should now work properly');
            return true;
        } else {
            this.logMessage('\n⚠️ Some prerequisites failed to install');
            this.logMessage('💡 Manual installation may be required');
            return false;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const installer = new PrerequisiteInstaller();
    installer.run()
        .then((success) => {
            if (success) {
                console.log('\n✅ Prerequisites installation completed successfully');
                process.exit(0);
            } else {
                console.log('\n⚠️ Prerequisites installation completed with some failures');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('\n❌ Prerequisites installation failed:', error.message);
            process.exit(1);
        });
}

module.exports = { PrerequisiteInstaller };
