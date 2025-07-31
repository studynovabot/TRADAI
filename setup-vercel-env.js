/**
 * Script to set up essential environment variables for Vercel deployment
 * Run this script after authenticating with Vercel CLI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env file
function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file not found');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=');
            envVars[key.trim()] = value.trim();
        }
    });

    return envVars;
}

// Essential environment variables for TRADAI deployment
const essentialVars = [
    'GOOGLE_VISION_API_KEY',
    'GROQ_API_KEY',
    'TOGETHER_API_KEY',
    'TWELVE_DATA_API_KEY',
    'MIN_CONFIDENCE',
    'TARGET_ACCURACY',
    'MIN_SIGNAL_CONFIDENCE'
];

function setVercelEnvVar(key, value, environment = 'production') {
    try {
        console.log(`Setting ${key} for ${environment}...`);
        execSync(`npx vercel env add ${key} ${environment}`, {
            input: `${value}\n`,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        console.log(`✅ ${key} set successfully`);
    } catch (error) {
        console.error(`❌ Failed to set ${key}:`, error.message);
    }
}

function main() {
    console.log('🚀 Setting up Vercel environment variables...\n');
    
    const envVars = loadEnvFile();
    
    // Set essential environment variables
    essentialVars.forEach(varName => {
        if (envVars[varName]) {
            setVercelEnvVar(varName, envVars[varName]);
        } else {
            console.warn(`⚠️  ${varName} not found in .env file`);
        }
    });

    // Set additional production-specific variables
    setVercelEnvVar('NODE_ENV', 'production');
    setVercelEnvVar('VERCEL', '1');
    setVercelEnvVar('OPENCV4NODEJS_DISABLE_AUTOBUILD', '1');

    console.log('\n✅ Environment variables setup complete!');
    console.log('📝 Please verify the variables in your Vercel dashboard');
}

if (require.main === module) {
    main();
}

module.exports = { loadEnvFile, setVercelEnvVar };
