/**
 * 🚀💎 PRODUCTION GEMINI VISION API ENDPOINT
 * Ultra-detailed, high-accuracy trading image analysis using pure Gemini capabilities
 * 
 * This endpoint implements the production-ready system with complete reliance on 
 * Gemini's multimodal capabilities - NO external OCR tools.
 */

const ProductionGeminiVisionService = require('../../services/ProductionGeminiVisionService');
const formidable = require('formidable');
const fs = require('fs');

// Initialize the production service
let productionService = null;

async function initializeService() {
    if (!productionService) {
        console.log('🚀 Initializing Production Gemini Vision Service...');
        productionService = new ProductionGeminiVisionService({
            debugMode: process.env.NODE_ENV === 'development',
            imagePreprocessing: true,
            temperature: 0.1,
            maxTokens: 8000,
            timeout: 90000,
            maxRetries: 3
        });
        
        const initResult = await productionService.initialize();
        if (!initResult.success) {
            throw new Error(`Service initialization failed: ${initResult.error}`);
        }
        
        console.log('✅ Production Gemini Vision Service initialized successfully');
    }
    return productionService;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST.'
        });
    }

    const startTime = Date.now();

    try {
        console.log('🚀 Production Gemini Vision API request received');

        // Initialize service
        const service = await initializeService();

        // Handle file upload with formidable
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB limit
            keepExtensions: true,
            multiples: false
        });

        const [fields, files] = await form.parse(req);

        // Get the uploaded image file
        const imageFile = files.image?.[0];
        if (!imageFile) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided. Please upload an image.'
            });
        }

        console.log(`📷 Image received: ${imageFile.originalFilename} (${imageFile.size} bytes)`);

        // Read image buffer
        const imageBuffer = fs.readFileSync(imageFile.filepath);

        // Validate image
        if (!imageBuffer || imageBuffer.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or empty image file'
            });
        }

        // Clean up temporary file
        fs.unlinkSync(imageFile.filepath);

        // Extract options from request
        const options = {
            debugMode: fields.debugMode?.[0] === 'true' || false,
            imagePreprocessing: fields.imagePreprocessing?.[0] !== 'false',
            // Add any other options from fields
        };

        console.log('🔍 Starting production chart analysis...');

        // Perform analysis
        const result = await service.analyzeChartImage(imageBuffer, options);

        const totalTime = Date.now() - startTime;

        if (result.success) {
            console.log(`✅ Production analysis completed successfully in ${totalTime}ms`);
            
            // Get service statistics
            const stats = service.getProductionStats();
            
            return res.status(200).json({
                success: true,
                analysis: result.analysis,
                confidence: result.confidence,
                processingTime: totalTime,
                metadata: {
                    ...result.metadata,
                    endpoint: 'production-gemini-vision',
                    requestId: `prod-${Date.now()}`,
                    imageInfo: {
                        originalName: imageFile.originalFilename,
                        size: imageFile.size,
                        mimeType: imageFile.mimetype
                    }
                },
                serviceStats: stats
            });
        } else {
            console.error(`❌ Production analysis failed: ${result.error}`);
            
            return res.status(500).json({
                success: false,
                error: result.error,
                processingTime: totalTime,
                metadata: {
                    endpoint: 'production-gemini-vision',
                    requestId: `prod-${Date.now()}`,
                    timestamp: new Date().toISOString()
                }
            });
        }

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('❌ Production Gemini Vision API error:', error);

        // Handle specific error types
        let statusCode = 500;
        let errorMessage = error.message;

        if (error.message.includes('LIMIT_FILE_SIZE')) {
            statusCode = 413;
            errorMessage = 'Image file too large. Maximum size is 10MB.';
        } else if (error.message.includes('Only image files')) {
            statusCode = 400;
            errorMessage = 'Invalid file type. Only image files are allowed.';
        } else if (error.message.includes('API key')) {
            statusCode = 401;
            errorMessage = 'API authentication failed. Please check your API keys.';
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
            statusCode = 429;
            errorMessage = 'API rate limit exceeded. Please try again later.';
        }

        return res.status(statusCode).json({
            success: false,
            error: errorMessage,
            processingTime: totalTime,
            metadata: {
                endpoint: 'production-gemini-vision',
                requestId: `prod-${Date.now()}`,
                timestamp: new Date().toISOString(),
                errorType: error.constructor.name
            }
        });
    }
}

// Disable Next.js body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};