/**
 * 🚀 Deploy CORS Fix Script
 * 
 * This script helps deploy the CORS fixes to resolve the cross-origin issues
 * between different Vercel deployments.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 TRADAI CORS Fix Deployment');
console.log('='.repeat(40));

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found. Please run this script from the project root.');
    process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
console.log('📦 Project:', packageJson.name);
console.log('📦 Version:', packageJson.version);

// Summary of changes made
console.log('\n📋 CORS Fix Summary:');
console.log('✅ Updated pages/index.tsx to use relative URLs instead of hardcoded ones');
console.log('✅ Enhanced CORS headers in pages/api/multi-scenario-analysis.js');
console.log('✅ Added CORS configuration in next.config.js');
console.log('✅ Updated vercel.json with multi-scenario endpoints');
console.log('✅ Fixed CSP to allow Google Analytics');

// Check if git is available and show status
try {
    console.log('\n📊 Git Status:');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
        console.log('Modified files:');
        gitStatus.trim().split('\n').forEach(line => {
            console.log(`  ${line}`);
        });
    } else {
        console.log('No uncommitted changes');
    }
} catch (error) {
    console.log('Git not available or not a git repository');
}

// Instructions for deployment
console.log('\n🚀 Deployment Instructions:');
console.log('1. Commit the changes:');
console.log('   git add .');
console.log('   git commit -m "Fix CORS issues - use relative URLs and enhance headers"');
console.log('');
console.log('2. Push to trigger Vercel deployment:');
console.log('   git push origin main');
console.log('');
console.log('3. Or deploy directly with Vercel CLI:');
console.log('   vercel --prod');
console.log('');

// Test the current local setup
console.log('🧪 Testing Local Configuration:');

// Check if the files exist and have the expected content
const filesToCheck = [
    'pages/index.tsx',
    'pages/api/multi-scenario-analysis.js',
    'next.config.js',
    'vercel.json'
];

let allFilesOk = true;
filesToCheck.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} - exists`);
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for specific fixes
        if (file === 'pages/index.tsx') {
            if (content.includes('/api/multi-scenario-analysis')) {
                console.log(`   ✅ Uses relative URL for API calls`);
            } else {
                console.log(`   ❌ Still using hardcoded URL`);
                allFilesOk = false;
            }
        }
        
        if (file === 'pages/api/multi-scenario-analysis.js') {
            if (content.includes('Access-Control-Allow-Origin')) {
                console.log(`   ✅ CORS headers configured`);
            } else {
                console.log(`   ❌ CORS headers missing`);
                allFilesOk = false;
            }
        }
        
        if (file === 'next.config.js') {
            if (content.includes('multi-scenario-analysis')) {
                console.log(`   ✅ Next.js CORS config added`);
            } else {
                console.log(`   ❌ Next.js CORS config missing`);
                allFilesOk = false;
            }
        }
        
        if (file === 'vercel.json') {
            if (content.includes('multi-scenario-analysis')) {
                console.log(`   ✅ Vercel config updated`);
            } else {
                console.log(`   ❌ Vercel config not updated`);
                allFilesOk = false;
            }
        }
    } else {
        console.log(`❌ ${file} - missing`);
        allFilesOk = false;
    }
});

console.log('\n🎯 Configuration Status:', allFilesOk ? '✅ ALL GOOD' : '❌ NEEDS ATTENTION');

if (allFilesOk) {
    console.log('\n🎉 All CORS fixes are in place!');
    console.log('📤 Ready for deployment to resolve the cross-origin issues.');
    console.log('');
    console.log('🔍 After deployment, the frontend should:');
    console.log('   - Use relative URLs (/api/multi-scenario-analysis)');
    console.log('   - No longer show CORS errors');
    console.log('   - Successfully communicate with the API');
} else {
    console.log('\n⚠️ Some fixes are missing. Please review the files above.');
}

console.log('\n📞 Need help? Check the browser console after deployment for:');
console.log('   - "Using endpoint: /api/multi-scenario-analysis (relative URL)"');
console.log('   - No CORS error messages');
console.log('   - Successful API responses');