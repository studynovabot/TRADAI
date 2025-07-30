/**
 * Image Preprocessing Service for Trading Chart Screenshots
 * Optimizes images for better Google Vision OCR accuracy
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImagePreprocessingService {
    constructor(config = {}) {
        this.config = {
            // Output settings
            outputFormat: config.outputFormat || 'png',
            outputQuality: config.outputQuality || 100,
            
            // Resize settings
            maxWidth: config.maxWidth || 1920,
            maxHeight: config.maxHeight || 1080,
            maintainAspectRatio: config.maintainAspectRatio !== false,
            
            // Enhancement settings
            enableSharpening: config.enableSharpening !== false,
            enableNormalization: config.enableNormalization !== false,
            enableContrastEnhancement: config.enableContrastEnhancement !== false,
            enableNoiseReduction: config.enableNoiseReduction !== false,
            
            // OCR optimization
            enableTextEnhancement: config.enableTextEnhancement !== false,
            enableBinarization: config.enableBinarization || false,
            
            // Chart-specific optimizations
            enableChartOptimization: config.enableChartOptimization !== false,
            enhanceCandlesticks: config.enhanceCandlesticks !== false,
            enhanceIndicators: config.enhanceIndicators !== false,
            
            ...config
        };

        this.tempDir = path.join(__dirname, '../../temp/preprocessing');
        this.ensureTempDirectory();
    }

    /**
     * Ensure temp directory exists
     */
    ensureTempDirectory() {
        try {
            if (!fs.existsSync(this.tempDir)) {
                fs.mkdirSync(this.tempDir, { recursive: true });
            }
        } catch (error) {
            console.warn('⚠️ Failed to create temp directory:', error.message);
        }
    }

    /**
     * Preprocess trading chart screenshot for optimal OCR
     */
    async preprocessForOCR(imageBuffer, options = {}) {
        console.log('🔧 Preprocessing image for OCR optimization...');
        
        const startTime = Date.now();
        
        try {
            let processedImage = sharp(imageBuffer);
            
            // Get image metadata
            const metadata = await processedImage.metadata();
            console.log(`   📏 Original: ${metadata.width}x${metadata.height}, ${metadata.format}`);
            
            // Step 1: Resize if needed
            if (metadata.width > this.config.maxWidth || metadata.height > this.config.maxHeight) {
                console.log('   📐 Resizing image...');
                processedImage = processedImage.resize({
                    width: this.config.maxWidth,
                    height: this.config.maxHeight,
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }
            
            // Step 2: Enhance for text recognition
            if (this.config.enableTextEnhancement) {
                console.log('   📝 Enhancing text readability...');
                processedImage = await this.enhanceTextReadability(processedImage);
            }
            
            // Step 3: Chart-specific optimizations
            if (this.config.enableChartOptimization) {
                console.log('   📊 Applying chart optimizations...');
                processedImage = await this.optimizeForChartElements(processedImage);
            }
            
            // Step 4: General image enhancements
            processedImage = await this.applyGeneralEnhancements(processedImage);
            
            // Step 5: Convert to optimal format
            const outputBuffer = await processedImage
                .png({ quality: this.config.outputQuality })
                .toBuffer();
            
            const processingTime = Date.now() - startTime;
            console.log(`   ✅ Preprocessing completed in ${processingTime}ms`);
            
            return {
                success: true,
                buffer: outputBuffer,
                processingTime,
                originalSize: imageBuffer.length,
                processedSize: outputBuffer.length,
                metadata: await sharp(outputBuffer).metadata()
            };
            
        } catch (error) {
            console.error('❌ Image preprocessing failed:', error);
            return {
                success: false,
                error: error.message,
                buffer: imageBuffer // Return original on failure
            };
        }
    }

    /**
     * Enhance text readability for better OCR
     */
    async enhanceTextReadability(sharpImage) {
        try {
            // Increase contrast for better text recognition
            let enhanced = sharpImage.normalize();
            
            // Sharpen text
            if (this.config.enableSharpening) {
                enhanced = enhanced.sharpen({
                    sigma: 1.0,
                    flat: 1.0,
                    jagged: 2.0
                });
            }
            
            // Enhance contrast specifically for text
            if (this.config.enableContrastEnhancement) {
                enhanced = enhanced.modulate({
                    brightness: 1.1,
                    saturation: 0.8,
                    hue: 0
                });
            }
            
            // Apply gamma correction for better text visibility
            enhanced = enhanced.gamma(1.2);
            
            return enhanced;
            
        } catch (error) {
            console.warn('⚠️ Text enhancement failed:', error.message);
            return sharpImage;
        }
    }

    /**
     * Optimize for chart elements (candlesticks, indicators)
     */
    async optimizeForChartElements(sharpImage) {
        try {
            let optimized = sharpImage;
            
            // Enhance candlestick visibility
            if (this.config.enhanceCandlesticks) {
                optimized = optimized.modulate({
                    brightness: 1.05,
                    saturation: 1.2,
                    hue: 0
                });
            }
            
            // Enhance indicator lines and text
            if (this.config.enhanceIndicators) {
                optimized = optimized.sharpen({
                    sigma: 0.8,
                    flat: 1.2,
                    jagged: 1.5
                });
            }
            
            // Reduce noise while preserving chart details
            if (this.config.enableNoiseReduction) {
                optimized = optimized.median(1);
            }
            
            return optimized;
            
        } catch (error) {
            console.warn('⚠️ Chart optimization failed:', error.message);
            return sharpImage;
        }
    }

    /**
     * Apply general image enhancements
     */
    async applyGeneralEnhancements(sharpImage) {
        try {
            let enhanced = sharpImage;
            
            // Normalize colors
            if (this.config.enableNormalization) {
                enhanced = enhanced.normalize();
            }
            
            // Final sharpening
            if (this.config.enableSharpening) {
                enhanced = enhanced.sharpen();
            }
            
            return enhanced;
            
        } catch (error) {
            console.warn('⚠️ General enhancement failed:', error.message);
            return sharpImage;
        }
    }

    /**
     * Create multiple preprocessed versions for different OCR scenarios
     */
    async createMultipleVersions(imageBuffer, options = {}) {
        console.log('🔄 Creating multiple preprocessed versions...');
        
        const versions = {};
        
        try {
            // Version 1: Standard OCR optimization
            versions.standard = await this.preprocessForOCR(imageBuffer, {
                ...options,
                enableTextEnhancement: true,
                enableChartOptimization: false
            });
            
            // Version 2: Chart-focused optimization
            versions.chartFocused = await this.preprocessForOCR(imageBuffer, {
                ...options,
                enableTextEnhancement: false,
                enableChartOptimization: true,
                enhanceCandlesticks: true,
                enhanceIndicators: true
            });
            
            // Version 3: High contrast for difficult text
            versions.highContrast = await this.createHighContrastVersion(imageBuffer);
            
            // Version 4: Binarized for clear text extraction
            if (this.config.enableBinarization) {
                versions.binarized = await this.createBinarizedVersion(imageBuffer);
            }
            
            return {
                success: true,
                versions,
                count: Object.keys(versions).length
            };
            
        } catch (error) {
            console.error('❌ Failed to create multiple versions:', error);
            return {
                success: false,
                error: error.message,
                versions: { original: { buffer: imageBuffer } }
            };
        }
    }

    /**
     * Create high contrast version for difficult text
     */
    async createHighContrastVersion(imageBuffer) {
        try {
            const highContrastBuffer = await sharp(imageBuffer)
                .resize({
                    width: this.config.maxWidth,
                    height: this.config.maxHeight,
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .modulate({
                    brightness: 1.3,
                    saturation: 0.5,
                    hue: 0
                })
                .sharpen({
                    sigma: 1.5,
                    flat: 2.0,
                    jagged: 3.0
                })
                .gamma(1.5)
                .normalize()
                .png({ quality: 100 })
                .toBuffer();
            
            return {
                success: true,
                buffer: highContrastBuffer,
                type: 'high_contrast'
            };
            
        } catch (error) {
            console.warn('⚠️ High contrast version failed:', error.message);
            return {
                success: false,
                buffer: imageBuffer,
                error: error.message
            };
        }
    }

    /**
     * Create binarized version for clear text extraction
     */
    async createBinarizedVersion(imageBuffer) {
        try {
            const binarizedBuffer = await sharp(imageBuffer)
                .resize({
                    width: this.config.maxWidth,
                    height: this.config.maxHeight,
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .greyscale()
                .normalize()
                .threshold(128) // Binary threshold
                .png({ quality: 100 })
                .toBuffer();
            
            return {
                success: true,
                buffer: binarizedBuffer,
                type: 'binarized'
            };
            
        } catch (error) {
            console.warn('⚠️ Binarized version failed:', error.message);
            return {
                success: false,
                buffer: imageBuffer,
                error: error.message
            };
        }
    }

    /**
     * Analyze image quality and suggest preprocessing options
     */
    async analyzeImageQuality(imageBuffer) {
        try {
            const image = sharp(imageBuffer);
            const metadata = await image.metadata();
            const stats = await image.stats();
            
            const analysis = {
                metadata: {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format,
                    channels: metadata.channels,
                    density: metadata.density
                },
                quality: {
                    resolution: this.assessResolution(metadata),
                    sharpness: this.assessSharpness(stats),
                    contrast: this.assessContrast(stats),
                    brightness: this.assessBrightness(stats)
                },
                recommendations: []
            };
            
            // Generate recommendations
            if (analysis.quality.resolution === 'LOW') {
                analysis.recommendations.push('Consider using higher resolution screenshots');
            }
            
            if (analysis.quality.sharpness === 'LOW') {
                analysis.recommendations.push('Enable sharpening enhancement');
            }
            
            if (analysis.quality.contrast === 'LOW') {
                analysis.recommendations.push('Enable contrast enhancement');
            }
            
            if (analysis.quality.brightness === 'LOW' || analysis.quality.brightness === 'HIGH') {
                analysis.recommendations.push('Enable brightness normalization');
            }
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Image quality analysis failed:', error);
            return {
                error: error.message,
                recommendations: ['Use standard preprocessing settings']
            };
        }
    }

    /**
     * Assess image resolution quality
     */
    assessResolution(metadata) {
        const totalPixels = metadata.width * metadata.height;
        
        if (totalPixels >= 1920 * 1080) return 'HIGH';
        if (totalPixels >= 1280 * 720) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Assess image sharpness
     */
    assessSharpness(stats) {
        // Simple sharpness assessment based on channel statistics
        const avgStdDev = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
        
        if (avgStdDev > 50) return 'HIGH';
        if (avgStdDev > 30) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Assess image contrast
     */
    assessContrast(stats) {
        // Contrast assessment based on standard deviation
        const maxStdDev = Math.max(...stats.channels.map(ch => ch.stdev));
        
        if (maxStdDev > 60) return 'HIGH';
        if (maxStdDev > 40) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Assess image brightness
     */
    assessBrightness(stats) {
        // Brightness assessment based on mean values
        const avgMean = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
        
        if (avgMean > 200) return 'HIGH';
        if (avgMean < 50) return 'LOW';
        return 'MEDIUM';
    }

    /**
     * Save preprocessed image to temp directory
     */
    async savePreprocessedImage(buffer, filename) {
        try {
            const filepath = path.join(this.tempDir, filename);
            fs.writeFileSync(filepath, buffer);
            
            return {
                success: true,
                filepath,
                size: buffer.length
            };
            
        } catch (error) {
            console.error('❌ Failed to save preprocessed image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cleanup temp files
     */
    cleanup() {
        try {
            if (fs.existsSync(this.tempDir)) {
                const files = fs.readdirSync(this.tempDir);
                files.forEach(file => {
                    const filepath = path.join(this.tempDir, file);
                    fs.unlinkSync(filepath);
                });
            }
            console.log('✅ Image preprocessing cleanup completed');
        } catch (error) {
            console.warn('⚠️ Preprocessing cleanup warning:', error.message);
        }
    }
}

module.exports = ImagePreprocessingService;
