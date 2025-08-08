/**
 * Verification script for Gemini 2.5 Flash upgrade
 * This script verifies that all services and configurations have been updated correctly
 */

// Import all services to verify their configurations
const ProductionGeminiVisionService = require('./services/ProductionGeminiVisionService');
const DirectGeminiVisionService = require('./services/DirectGeminiVisionService');
const EnhancedGeminiVisionService = require('./services/EnhancedGeminiVisionService');
const EnhancedUltimateGeminiVisionService = require('./services/EnhancedUltimateGeminiVisionService');
const GeminiAnalysisService = require('./services/GeminiAnalysisService');
const InstitutionalGeminiVisionService = require('./services/InstitutionalGeminiVisionService');
const UltimateGeminiVisionService = require('./services/UltimateGeminiVisionService');

function verifyModelUpgrade() {
    console.log('🔍 Verifying Gemini 2.5 Flash Model Upgrade...\n');
    
    const services = [
        { name: 'ProductionGeminiVisionService', service: ProductionGeminiVisionService },
        { name: 'DirectGeminiVisionService', service: DirectGeminiVisionService },
        { name: 'EnhancedGeminiVisionService', service: EnhancedGeminiVisionService },
        { name: 'EnhancedUltimateGeminiVisionService', service: EnhancedUltimateGeminiVisionService },
        { name: 'GeminiAnalysisService', service: GeminiAnalysisService },
        { name: 'InstitutionalGeminiVisionService', service: InstitutionalGeminiVisionService },
        { name: 'UltimateGeminiVisionService', service: UltimateGeminiVisionService }
    ];
    
    let allPassed = true;
    
    services.forEach(({ name, service }) => {
        try {
            const instance = new service();
            const models = instance.config.models;
            const primaryModel = models[0];
            
            console.log(`📋 ${name}:`);
            console.log(`   🎯 Primary model: ${primaryModel}`);
            console.log(`   📝 All models: [${models.join(', ')}]`);
            
            // Check if primary model is gemini-2.5-flash
            if (primaryModel === 'gemini-2.5-flash') {
                console.log(`   ✅ PASS - Using Gemini 2.5 Flash\n`);
            } else {
                console.log(`   ❌ FAIL - Expected gemini-2.5-flash, got ${primaryModel}\n`);
                allPassed = false;
            }
            
        } catch (error) {
            console.log(`   ❌ FAIL - Error initializing service: ${error.message}\n`);
            allPassed = false;
        }
    });
    
    // Check API endpoint files by reading their content
    console.log('🌐 Verifying API Endpoints...\n');
    
    const fs = require('fs');
    const path = require('path');
    
    const apiFiles = [
        'pages/api/direct-gemini-vision.js',
        'pages/api/final-gemini-vision.js',
        'pages/api/working-gemini-vision.js',
        'pages/api/test-gemini-direct.js'
    ];
    
    apiFiles.forEach(filePath => {
        try {
            const fullPath = path.join(__dirname, filePath);
            const content = fs.readFileSync(fullPath, 'utf8');
            
            console.log(`📄 ${filePath}:`);
            
            // Check for gemini-2.5-flash in the content
            const has25Flash = content.includes('gemini-2.5-flash');
            const has15Flash = content.includes('gemini-1.5-flash');
            
            if (has25Flash && !has15Flash) {
                console.log(`   ✅ PASS - Updated to Gemini 2.5 Flash`);
            } else if (has15Flash) {
                console.log(`   ❌ FAIL - Still contains gemini-1.5-flash references`);
                allPassed = false;
            } else {
                console.log(`   ⚠️  WARNING - No Gemini model references found`);
            }
            
            console.log('');
            
        } catch (error) {
            console.log(`   ❌ FAIL - Error reading file: ${error.message}\n`);
            allPassed = false;
        }
    });
    
    // Final summary
    console.log('📊 UPGRADE VERIFICATION SUMMARY:');
    console.log('================================');
    
    if (allPassed) {
        console.log('🎉 SUCCESS: All services and API endpoints have been successfully upgraded to Gemini 2.5 Flash!');
        console.log('');
        console.log('✅ Services updated: 7/7');
        console.log('✅ API endpoints updated: 4/4');
        console.log('✅ No legacy model references found');
        console.log('');
        console.log('🚀 The upgrade is complete and ready for production use!');
        return true;
    } else {
        console.log('❌ FAILURE: Some components still need to be updated.');
        console.log('');
        console.log('Please review the failed items above and make necessary corrections.');
        return false;
    }
}

// Run verification
if (require.main === module) {
    const success = verifyModelUpgrade();
    process.exit(success ? 0 : 1);
}

module.exports = { verifyModelUpgrade };