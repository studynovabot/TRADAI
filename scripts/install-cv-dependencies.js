/**
 * Computer Vision Dependencies Installation Script
 * Installs all required dependencies for advanced chart analysis
 */

const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

const dependencies = [
    'image-size',
    'file-type', 
    'jimp',
    'formidable',
    'canvas',
    '@tensorflow/tfjs-node',
    'opencv4nodejs'
];

async function installDependency(dep) {
    console.log(`\n📦 Installing ${dep}...`);
    
    try {
        // Check if already installed
        try {
            require.resolve(dep);
            console.log(`   ✅ ${dep} already installed`);
            return true;
        } catch (error) {
            // Not installed, proceed with installation
        }
        
        // Special handling for opencv4nodejs
        if (dep === 'opencv4nodejs') {
            console.log('   🔧 Installing opencv4nodejs with extended timeout...');
            
            // Set environment variables
            process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '0';
            
            const { stdout, stderr } = await execAsync(`npm install ${dep}`, {
                timeout: 600000, // 10 minutes
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });
            
            if (stderr && !stderr.includes('WARN') && !stderr.includes('deprecated')) {
                console.log('   ⚠️ Installation warnings:', stderr);
            }
            
        } else {
            // Regular installation
            const { stdout, stderr } = await execAsync(`npm install ${dep}`);
            
            if (stderr && !stderr.includes('WARN') && !stderr.includes('deprecated')) {
                throw new Error(`Installation failed: ${stderr}`);
            }
        }
        
        // Verify installation
        try {
            require.resolve(dep);
            console.log(`   ✅ ${dep} installed and verified successfully`);
            return true;
        } catch (error) {
            throw new Error(`Installation verification failed for ${dep}`);
        }
        
    } catch (error) {
        console.log(`   ❌ Failed to install ${dep}: ${error.message}`);
        
        if (dep === 'opencv4nodejs') {
            console.log('   💡 opencv4nodejs requires:');
            console.log('      - CMake installed and in PATH');
            console.log('      - Python installed and in PATH');
            console.log('      - Visual Studio Build Tools (Windows)');
            console.log('      - Sufficient memory and disk space');
        }
        
        return false;
    }
}

async function main() {
    console.log('🚀 Installing Computer Vision Dependencies...');
    console.log('=' .repeat(60));
    
    const results = [];
    
    for (const dep of dependencies) {
        const success = await installDependency(dep);
        results.push({ dependency: dep, success });
    }
    
    console.log('\n📊 Installation Summary:');
    console.log('=' .repeat(40));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}/${dependencies.length}`);
    successful.forEach(r => console.log(`   ✅ ${r.dependency}`));
    
    if (failed.length > 0) {
        console.log(`❌ Failed: ${failed.length}/${dependencies.length}`);
        failed.forEach(r => console.log(`   ❌ ${r.dependency}`));
    }
    
    if (failed.length === 0) {
        console.log('\n🎉 All dependencies installed successfully!');
        console.log('🚀 You can now run the advanced chart analysis system.');
    } else {
        console.log('\n⚠️ Some dependencies failed to install.');
        console.log('💡 Please check the error messages above and install missing prerequisites.');
        
        if (failed.some(r => r.dependency === 'opencv4nodejs')) {
            console.log('\n🔧 For opencv4nodejs installation issues:');
            console.log('   1. Install CMake: https://cmake.org/download/');
            console.log('   2. Install Python: https://python.org/downloads/');
            console.log('   3. Install Visual Studio Build Tools (Windows)');
            console.log('   4. Restart your terminal and try again');
        }
    }
}

main().catch(error => {
    console.error('❌ Installation script failed:', error.message);
    process.exit(1);
});
