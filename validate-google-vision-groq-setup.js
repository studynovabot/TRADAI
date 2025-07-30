/**
 * Validate Google Vision + Groq AI Pipeline Setup
 * Quick validation script to test API connections and service initialization
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function validateSetup() {
    console.log('🔍 Validating Google Vision + Groq AI Pipeline Setup...');
    console.log('=' .repeat(60));
    
    const results = {
        environment: false,
        googleVision: false,
        groq: false,
        services: false,
        overall: false
    };
    
    try {
        // 1. Check environment variables
        console.log('\n📋 Checking Environment Variables...');
        
        const requiredEnvVars = [
            'GOOGLE_VISION_API_KEY',
            'GROQ_API_KEY'
        ];
        
        let envValid = true;
        requiredEnvVars.forEach(envVar => {
            if (process.env[envVar]) {
                console.log(`   ✅ ${envVar}: Configured`);
            } else {
                console.log(`   ❌ ${envVar}: Missing`);
                envValid = false;
            }
        });
        
        results.environment = envValid;
        
        // 2. Test Google Vision API
        console.log('\n👁️ Testing Google Vision API...');
        
        try {
            const axios = require('axios');
            
            // Create a simple 1x1 pixel PNG for testing
            const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            
            const response = await axios.post(
                `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
                {
                    requests: [{
                        image: {
                            content: testImageBase64
                        },
                        features: [
                            { type: 'TEXT_DETECTION', maxResults: 1 }
                        ]
                    }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            if (response.status === 200 && response.data.responses) {
                console.log('   ✅ Google Vision API: Connected successfully');
                results.googleVision = true;
            } else {
                console.log('   ❌ Google Vision API: Invalid response');
            }
            
        } catch (error) {
            console.log(`   ❌ Google Vision API: ${error.message}`);
        }
        
        // 3. Test Groq API
        console.log('\n🧠 Testing Groq API...');
        
        try {
            const Groq = require('groq-sdk');
            const groq = new Groq({
                apiKey: process.env.GROQ_API_KEY
            });
            
            const response = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'user',
                        content: 'Respond with "OK" only.'
                    }
                ],
                model: 'llama-3.1-70b-versatile',
                max_tokens: 5,
                temperature: 0
            });
            
            if (response.choices && response.choices[0]) {
                console.log('   ✅ Groq API: Connected successfully');
                console.log(`   📝 Response: ${response.choices[0].message.content}`);
                results.groq = true;
            } else {
                console.log('   ❌ Groq API: Invalid response');
            }
            
        } catch (error) {
            console.log(`   ❌ Groq API: ${error.message}`);
        }
        
        // 4. Test service initialization
        console.log('\n🔧 Testing Service Initialization...');
        
        try {
            // Test GoogleVisionOCRService
            const GoogleVisionOCRService = require('./src/services/GoogleVisionOCRService');
            const visionService = new GoogleVisionOCRService();
            console.log('   ✅ GoogleVisionOCRService: Instantiated');
            
            // Test EnhancedGroqAnalysisService
            const EnhancedGroqAnalysisService = require('./src/services/EnhancedGroqAnalysisService');
            const groqService = new EnhancedGroqAnalysisService();
            console.log('   ✅ EnhancedGroqAnalysisService: Instantiated');
            
            // Test GoogleVisionGroqPipeline
            const GoogleVisionGroqPipeline = require('./src/services/GoogleVisionGroqPipeline');
            const pipeline = new GoogleVisionGroqPipeline();
            console.log('   ✅ GoogleVisionGroqPipeline: Instantiated');
            
            // Test MultiTimeframeAnalysisEngine
            const MultiTimeframeAnalysisEngine = require('./src/services/MultiTimeframeAnalysisEngine');
            const multiTimeframeEngine = new MultiTimeframeAnalysisEngine();
            console.log('   ✅ MultiTimeframeAnalysisEngine: Instantiated');
            
            // Test ErrorHandlingValidationService
            const { ErrorHandlingValidationService } = require('./src/services/ErrorHandlingValidationService');
            const errorHandler = new ErrorHandlingValidationService();
            console.log('   ✅ ErrorHandlingValidationService: Instantiated');
            
            results.services = true;
            
        } catch (error) {
            console.log(`   ❌ Service initialization failed: ${error.message}`);
        }
        
        // 5. Check file structure
        console.log('\n📁 Checking File Structure...');
        
        const requiredFiles = [
            'src/services/GoogleVisionOCRService.js',
            'src/services/EnhancedGroqAnalysisService.js',
            'src/services/GoogleVisionGroqPipeline.js',
            'src/services/MultiTimeframeAnalysisEngine.js',
            'src/services/ImagePreprocessingService.js',
            'src/services/ErrorHandlingValidationService.js',
            'pages/api/google-vision-groq-signal.js',
            'test-google-vision-groq-pipeline.js'
        ];
        
        let filesValid = true;
        requiredFiles.forEach(file => {
            if (fs.existsSync(file)) {
                console.log(`   ✅ ${file}: Exists`);
            } else {
                console.log(`   ❌ ${file}: Missing`);
                filesValid = false;
            }
        });
        
        // 6. Check dependencies
        console.log('\n📦 Checking Dependencies...');
        
        const requiredDeps = [
            '@google-cloud/vision',
            'groq-sdk',
            'sharp',
            'axios',
            'multer'
        ];
        
        let depsValid = true;
        requiredDeps.forEach(dep => {
            try {
                require(dep);
                console.log(`   ✅ ${dep}: Available`);
            } catch (error) {
                console.log(`   ❌ ${dep}: Missing`);
                depsValid = false;
            }
        });
        
        // 7. Overall assessment
        results.overall = results.environment && results.googleVision && results.groq && results.services && filesValid && depsValid;
        
        console.log('\n📊 Validation Summary:');
        console.log('=' .repeat(40));
        console.log(`Environment Variables: ${results.environment ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Google Vision API: ${results.googleVision ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Groq API: ${results.groq ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Service Initialization: ${results.services ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`File Structure: ${filesValid ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Dependencies: ${depsValid ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Overall Status: ${results.overall ? '✅ READY' : '❌ NOT READY'}`);
        
        if (results.overall) {
            console.log('\n🎉 Google Vision + Groq AI Pipeline is ready for use!');
            console.log('\nNext steps:');
            console.log('1. Run comprehensive tests: node test-google-vision-groq-pipeline.js');
            console.log('2. Test API endpoint: POST /api/google-vision-groq-signal');
            console.log('3. Deploy to production with: npm run vercel-build && vercel --prod');
        } else {
            console.log('\n⚠️ Setup incomplete. Please address the failed checks above.');
        }
        
        return results;
        
    } catch (error) {
        console.error('❌ Validation failed:', error);
        return { overall: false, error: error.message };
    }
}

// Run validation if called directly
if (require.main === module) {
    validateSetup()
        .then(results => {
            process.exit(results.overall ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Validation error:', error);
            process.exit(1);
        });
}

module.exports = validateSetup;
