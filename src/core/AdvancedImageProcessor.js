/**
 * Advanced Image Processing Pipeline for Trading Chart Analysis
 * 
 * This module provides comprehensive image preprocessing, OCR enhancement,
 * and multi-region analysis for trading platform screenshots.
 */

const sharp = require('sharp');
const Jimp = require('jimp');
const { createWorker } = require('tesseract.js');
const fs = require('fs').promises;

class AdvancedImageProcessor {
    constructor(config = {}) {
        this.config = {
            // Image quality settings (relaxed for trading screenshots)
            minWidth: config.minWidth || 600,
            minHeight: config.minHeight || 400,
            maxWidth: config.maxWidth || 4096,
            maxHeight: config.maxHeight || 4096,
            qualityThreshold: config.qualityThreshold || 0.5,
            
            // OCR settings
            ocrLanguage: config.ocrLanguage || 'eng',
            ocrConfidenceThreshold: config.ocrConfidenceThreshold || 60,
            
            // Preprocessing settings
            contrastEnhancement: config.contrastEnhancement || 1.2,
            brightnessAdjustment: config.brightnessAdjustment || 0.1,
            sharpenRadius: config.sharpenRadius || 1,
            sharpenFlat: config.sharpenFlat || 1,
            sharpenJagged: config.sharpenJagged || 2,
            
            // Region detection settings
            textRegionMinArea: config.textRegionMinArea || 100,
            chartRegionMinArea: config.chartRegionMinArea || 10000,
            
            ...config
        };
        
        this.processingHistory = [];
        this.ocrWorkers = new Map();
    }

    /**
     * Main processing pipeline for trading chart screenshots
     */
    async processChartScreenshot(imageBuffer, options = {}) {
        console.log('🔍 Starting advanced chart screenshot processing...');
        
        const startTime = Date.now();
        const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Step 1: Validate image
            const validation = await this.validateImage(imageBuffer);
            if (!validation.valid) {
                throw new Error(`Image validation failed: ${validation.error}`);
            }
            
            // Step 2: Preprocess image
            const preprocessed = await this.preprocessImage(imageBuffer, options);
            
            // Step 3: Detect regions of interest
            const regions = await this.detectRegions(preprocessed.buffer);
            
            // Step 4: Extract text from multiple regions
            const textExtractions = await this.extractTextFromRegions(preprocessed.buffer, regions);
            
            // Step 5: Parse trading-specific data
            const tradingData = await this.parseTradingData(textExtractions);
            
            // Step 6: Extract chart visual data
            const chartData = await this.extractChartData(preprocessed.buffer, regions);
            
            const processingTime = Date.now() - startTime;
            
            const result = {
                processingId,
                success: true,
                processingTime,
                imageMetadata: validation.metadata,
                preprocessing: preprocessed.metadata,
                regions: regions,
                textExtractions: textExtractions,
                tradingData: tradingData,
                chartData: chartData,
                confidence: this.calculateOverallConfidence(textExtractions, chartData),
                timestamp: new Date().toISOString()
            };
            
            // Store processing history
            this.processingHistory.push({
                processingId,
                timestamp: result.timestamp,
                processingTime,
                confidence: result.confidence,
                success: true
            });
            
            console.log(`✅ Chart processing completed in ${processingTime}ms with ${result.confidence.toFixed(1)}% confidence`);
            
            return result;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            
            console.error('❌ Chart processing failed:', error.message);
            
            // Store error in history
            this.processingHistory.push({
                processingId,
                timestamp: new Date().toISOString(),
                processingTime,
                success: false,
                error: error.message
            });
            
            return {
                processingId,
                success: false,
                error: error.message,
                processingTime,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Validate image format, size, and quality
     */
    async validateImage(imageBuffer) {
        try {
            const metadata = await sharp(imageBuffer).metadata();
            
            const validation = {
                valid: true,
                metadata: metadata,
                checks: {
                    format: false,
                    dimensions: false,
                    quality: false,
                    fileSize: false
                },
                warnings: [],
                errors: []
            };
            
            // Check format
            if (['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) {
                validation.checks.format = true;
            } else {
                validation.errors.push(`Unsupported format: ${metadata.format}. Use JPEG, PNG, or WebP.`);
            }
            
            // Check dimensions
            if (metadata.width >= this.config.minWidth && metadata.height >= this.config.minHeight) {
                validation.checks.dimensions = true;
            } else {
                validation.errors.push(`Image too small: ${metadata.width}x${metadata.height}. Minimum: ${this.config.minWidth}x${this.config.minHeight}`);
            }
            
            if (metadata.width > this.config.maxWidth || metadata.height > this.config.maxHeight) {
                validation.warnings.push(`Image very large: ${metadata.width}x${metadata.height}. May affect processing speed.`);
            }
            
            // Check file size
            const fileSizeKB = imageBuffer.length / 1024;
            if (fileSizeKB > 10240) { // 10MB
                validation.warnings.push(`Large file size: ${fileSizeKB.toFixed(1)}KB. May affect processing speed.`);
            } else {
                validation.checks.fileSize = true;
            }
            
            // Estimate quality
            const qualityScore = this.estimateImageQuality(metadata);
            if (qualityScore >= this.config.qualityThreshold) {
                validation.checks.quality = true;
            } else {
                validation.warnings.push(`Low image quality detected: ${(qualityScore * 100).toFixed(1)}%`);
            }
            
            // Overall validation
            validation.valid = validation.errors.length === 0;
            if (!validation.valid) {
                validation.error = validation.errors.join('; ');
            }
            
            return validation;
            
        } catch (error) {
            return {
                valid: false,
                error: `Image validation error: ${error.message}`,
                metadata: null
            };
        }
    }

    /**
     * Estimate image quality based on metadata
     */
    estimateImageQuality(metadata) {
        let score = 0.5; // Base score
        
        // Resolution score
        const pixelCount = metadata.width * metadata.height;
        if (pixelCount > 1920 * 1080) score += 0.3;
        else if (pixelCount > 1280 * 720) score += 0.2;
        else if (pixelCount > 800 * 600) score += 0.1;
        
        // Format score
        if (metadata.format === 'png') score += 0.1;
        else if (metadata.format === 'jpeg') score += 0.05;
        
        // Density score
        if (metadata.density && metadata.density > 150) score += 0.1;
        
        return Math.min(score, 1.0);
    }

    /**
     * Advanced image preprocessing with multiple enhancement techniques
     */
    async preprocessImage(imageBuffer, options = {}) {
        console.log('🔧 Preprocessing image for optimal analysis...');
        
        try {
            let processedImage = sharp(imageBuffer);
            const metadata = await processedImage.metadata();
            
            const preprocessing = {
                originalSize: { width: metadata.width, height: metadata.height },
                operations: [],
                finalSize: null,
                enhancementApplied: false
            };
            
            // Resize if necessary
            if (metadata.width > this.config.maxWidth || metadata.height > this.config.maxHeight) {
                processedImage = processedImage.resize(this.config.maxWidth, this.config.maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
                preprocessing.operations.push('resize');
            }
            
            // Enhance contrast and brightness
            if (options.enhanceContrast !== false) {
                processedImage = processedImage.modulate({
                    brightness: 1 + this.config.brightnessAdjustment,
                    saturation: 1.1,
                    hue: 0
                });
                preprocessing.operations.push('contrast_enhancement');
                preprocessing.enhancementApplied = true;
            }
            
            // Sharpen for better text recognition
            if (options.sharpen !== false) {
                processedImage = processedImage.sharpen({
                    sigma: this.config.sharpenRadius,
                    flat: this.config.sharpenFlat,
                    jagged: this.config.sharpenJagged
                });
                preprocessing.operations.push('sharpen');
            }
            
            // Normalize for consistent processing
            processedImage = processedImage.normalize();
            preprocessing.operations.push('normalize');
            
            // Convert to high-quality PNG for processing
            processedImage = processedImage.png({ quality: 95, compressionLevel: 6 });
            
            const processedBuffer = await processedImage.toBuffer();
            const finalMetadata = await sharp(processedBuffer).metadata();
            
            preprocessing.finalSize = { width: finalMetadata.width, height: finalMetadata.height };
            
            console.log(`✅ Image preprocessed: ${preprocessing.operations.join(', ')}`);
            
            return {
                buffer: processedBuffer,
                metadata: preprocessing
            };
            
        } catch (error) {
            throw new Error(`Image preprocessing failed: ${error.message}`);
        }
    }

    /**
     * Detect regions of interest in the trading chart screenshot
     */
    async detectRegions(imageBuffer) {
        console.log('🎯 Detecting regions of interest...');

        try {
            const metadata = await sharp(imageBuffer).metadata();
            const { width, height } = metadata;

            // Define standard trading platform regions
            const regions = {
                // Header region (currency pair, timeframe)
                header: {
                    x: 0,
                    y: 0,
                    width: width,
                    height: Math.floor(height * 0.15),
                    type: 'text',
                    priority: 'high',
                    expectedContent: ['currency_pair', 'timeframe', 'current_price']
                },

                // Price axis (right side)
                priceAxis: {
                    x: Math.floor(width * 0.85),
                    y: Math.floor(height * 0.15),
                    width: Math.floor(width * 0.15),
                    height: Math.floor(height * 0.7),
                    type: 'text',
                    priority: 'high',
                    expectedContent: ['price_levels', 'support_resistance']
                },

                // Time axis (bottom)
                timeAxis: {
                    x: 0,
                    y: Math.floor(height * 0.85),
                    width: Math.floor(width * 0.85),
                    height: Math.floor(height * 0.15),
                    type: 'text',
                    priority: 'medium',
                    expectedContent: ['timestamps', 'timeframe_markers']
                },

                // Main chart area
                chartArea: {
                    x: Math.floor(width * 0.05),
                    y: Math.floor(height * 0.15),
                    width: Math.floor(width * 0.8),
                    height: Math.floor(height * 0.7),
                    type: 'chart',
                    priority: 'critical',
                    expectedContent: ['candlesticks', 'indicators', 'patterns']
                },

                // Indicator panel (bottom section)
                indicatorPanel: {
                    x: Math.floor(width * 0.05),
                    y: Math.floor(height * 0.7),
                    width: Math.floor(width * 0.8),
                    height: Math.floor(height * 0.15),
                    type: 'mixed',
                    priority: 'high',
                    expectedContent: ['rsi', 'macd', 'stochastic', 'volume']
                },

                // Left sidebar (if present)
                leftSidebar: {
                    x: 0,
                    y: Math.floor(height * 0.15),
                    width: Math.floor(width * 0.05),
                    height: Math.floor(height * 0.7),
                    type: 'text',
                    priority: 'low',
                    expectedContent: ['tools', 'settings']
                }
            };

            // Validate regions don't exceed image boundaries
            Object.keys(regions).forEach(regionName => {
                const region = regions[regionName];
                region.x = Math.max(0, Math.min(region.x, width - 1));
                region.y = Math.max(0, Math.min(region.y, height - 1));
                region.width = Math.max(1, Math.min(region.width, width - region.x));
                region.height = Math.max(1, Math.min(region.height, height - region.y));

                // Calculate region area
                region.area = region.width * region.height;
            });

            console.log(`✅ Detected ${Object.keys(regions).length} regions of interest`);

            return regions;

        } catch (error) {
            throw new Error(`Region detection failed: ${error.message}`);
        }
    }

    /**
     * Extract text from multiple regions using optimized OCR
     */
    async extractTextFromRegions(imageBuffer, regions) {
        console.log('📝 Extracting text from detected regions...');

        const extractions = {};
        const extractionPromises = [];

        // Process high-priority regions first
        const priorityOrder = ['critical', 'high', 'medium', 'low'];
        const regionsByPriority = {};

        Object.entries(regions).forEach(([name, region]) => {
            if (!regionsByPriority[region.priority]) {
                regionsByPriority[region.priority] = [];
            }
            regionsByPriority[region.priority].push({ name, region });
        });

        try {
            for (const priority of priorityOrder) {
                if (!regionsByPriority[priority]) continue;

                const regionPromises = regionsByPriority[priority].map(async ({ name, region }) => {
                    if (region.type === 'text' || region.type === 'mixed') {
                        return this.extractTextFromRegion(imageBuffer, name, region);
                    }
                    return null;
                });

                const results = await Promise.all(regionPromises);

                regionsByPriority[priority].forEach(({ name }, index) => {
                    if (results[index]) {
                        extractions[name] = results[index];
                    }
                });
            }

            console.log(`✅ Text extraction completed for ${Object.keys(extractions).length} regions`);

            return extractions;

        } catch (error) {
            throw new Error(`Text extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from a specific region
     */
    async extractTextFromRegion(imageBuffer, regionName, region) {
        try {
            // Extract region from image
            const regionBuffer = await sharp(imageBuffer)
                .extract({
                    left: region.x,
                    top: region.y,
                    width: region.width,
                    height: region.height
                })
                .png()
                .toBuffer();

            // Get or create OCR worker
            let worker = this.ocrWorkers.get(regionName);
            if (!worker) {
                worker = await createWorker(this.config.ocrLanguage);

                // Configure OCR for trading-specific content
                await worker.setParameters({
                    tessedit_char_whitelist: '0123456789.,+-/:%ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz',
                    tessedit_pageseg_mode: '6'
                });

                this.ocrWorkers.set(regionName, worker);
            }

            // Perform OCR
            const startTime = Date.now();
            const { data } = await worker.recognize(regionBuffer);
            const ocrTime = Date.now() - startTime;

            // Process OCR results
            const extraction = {
                regionName,
                text: data.text.trim(),
                confidence: data.confidence,
                words: data.words.filter(word => word.confidence > this.config.ocrConfidenceThreshold),
                lines: data.lines,
                processingTime: ocrTime,
                region: region,
                success: data.confidence > this.config.ocrConfidenceThreshold
            };

            console.log(`   📄 ${regionName}: "${extraction.text.substring(0, 50)}${extraction.text.length > 50 ? '...' : ''}" (${extraction.confidence.toFixed(1)}%)`);

            return extraction;

        } catch (error) {
            console.error(`❌ OCR failed for region ${regionName}:`, error.message);
            return {
                regionName,
                text: '',
                confidence: 0,
                words: [],
                lines: [],
                processingTime: 0,
                region: region,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Parse trading-specific data from text extractions
     */
    async parseTradingData(textExtractions) {
        console.log('🔍 Parsing trading-specific data...');

        const tradingData = {
            currencyPair: null,
            currentPrice: null,
            timeframe: null,
            pricelevels: [],
            timestamps: [],
            indicators: {},
            platform: null,
            confidence: 0
        };

        try {
            // Combine all extracted text
            const allText = Object.values(textExtractions)
                .map(extraction => extraction.text)
                .join(' ')
                .toLowerCase();

            // Extract currency pair
            tradingData.currencyPair = this.extractCurrencyPair(allText, textExtractions);

            // Extract current price
            tradingData.currentPrice = this.extractCurrentPrice(allText, textExtractions);

            // Extract timeframe
            tradingData.timeframe = this.extractTimeframe(allText, textExtractions);

            // Extract price levels
            tradingData.pricelevels = this.extractPriceLevels(textExtractions);

            // Extract timestamps
            tradingData.timestamps = this.extractTimestamps(textExtractions);

            // Extract indicator values
            tradingData.indicators = this.extractIndicatorValues(textExtractions);

            // Detect trading platform
            tradingData.platform = this.detectTradingPlatform(allText);

            // Calculate confidence
            tradingData.confidence = this.calculateTradingDataConfidence(tradingData, textExtractions);

            console.log(`✅ Trading data parsed: ${tradingData.currencyPair || 'Unknown'} @ ${tradingData.currentPrice || 'Unknown'} (${tradingData.confidence.toFixed(1)}%)`);

            return tradingData;

        } catch (error) {
            console.error('❌ Trading data parsing failed:', error.message);
            return {
                ...tradingData,
                error: error.message,
                confidence: 0
            };
        }
    }

    /**
     * Extract currency pair from text
     */
    extractCurrencyPair(allText, textExtractions) {
        const forexPairs = ['usd/brl', 'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'usd/cad', 'eur/gbp', 'eur/jpy'];

        for (const pair of forexPairs) {
            if (allText.includes(pair) || allText.includes(pair.replace('/', ''))) {
                return pair.toUpperCase();
            }
        }

        return 'Unknown';
    }

    /**
     * Extract current price from text
     */
    extractCurrentPrice(allText, textExtractions) {
        const pricePattern = /(\d+\.\d{4,5})/g;
        const matches = allText.match(pricePattern);
        return matches ? parseFloat(matches[0]) : null;
    }

    /**
     * Extract timeframe from text
     */
    extractTimeframe(allText, textExtractions) {
        const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];

        for (const tf of timeframes) {
            if (allText.includes(tf)) {
                return tf;
            }
        }

        return 'Unknown';
    }

    /**
     * Extract price levels from text
     */
    extractPriceLevels(textExtractions) {
        const levels = [];
        const pricePattern = /(\d+\.\d{4,5})/g;

        Object.values(textExtractions).forEach(extraction => {
            const matches = extraction.text.match(pricePattern);
            if (matches) {
                matches.forEach(match => {
                    const price = parseFloat(match);
                    if (price > 0 && !levels.includes(price)) {
                        levels.push(price);
                    }
                });
            }
        });

        return levels.sort((a, b) => b - a);
    }

    /**
     * Extract timestamps from text
     */
    extractTimestamps(textExtractions) {
        const timestamps = [];
        const timePattern = /(\d{1,2}:\d{2})/g;

        Object.values(textExtractions).forEach(extraction => {
            const matches = extraction.text.match(timePattern);
            if (matches) {
                timestamps.push(...matches);
            }
        });

        return [...new Set(timestamps)];
    }

    /**
     * Extract indicator values from text
     */
    extractIndicatorValues(textExtractions) {
        return {
            rsi: null,
            macd: null,
            stochastic: null,
            volume: null
        };
    }

    /**
     * Detect trading platform from text
     */
    detectTradingPlatform(allText) {
        const platforms = ['metatrader', 'mt4', 'mt5', 'tradingview', 'iq option', 'binomo'];

        for (const platform of platforms) {
            if (allText.includes(platform)) {
                return platform;
            }
        }

        return 'Unknown';
    }

    /**
     * Calculate trading data confidence
     */
    calculateTradingDataConfidence(tradingData, textExtractions) {
        let confidence = 0;
        let factors = 0;

        if (tradingData.currencyPair && tradingData.currencyPair !== 'Unknown') {
            confidence += 25;
            factors++;
        }

        if (tradingData.currentPrice) {
            confidence += 25;
            factors++;
        }

        if (tradingData.timeframe && tradingData.timeframe !== 'Unknown') {
            confidence += 20;
            factors++;
        }

        if (tradingData.pricelevels.length > 0) {
            confidence += 15;
            factors++;
        }

        if (tradingData.timestamps.length > 0) {
            confidence += 15;
            factors++;
        }

        return factors > 0 ? confidence : 0;
    }

    /**
     * Extract chart data (placeholder for visual analysis)
     */
    async extractChartData(imageBuffer, regions) {
        return {
            candlesticks: [],
            indicators: {},
            patterns: [],
            confidence: 50
        };
    }

    /**
     * Calculate overall confidence score
     */
    calculateOverallConfidence(textExtractions, chartData) {
        let totalConfidence = 0;
        let weightSum = 0;

        // Text extraction confidence (40% weight)
        const textConfidences = Object.values(textExtractions).map(e => e.confidence);
        if (textConfidences.length > 0) {
            const avgTextConfidence = textConfidences.reduce((a, b) => a + b, 0) / textConfidences.length;
            totalConfidence += avgTextConfidence * 0.4;
            weightSum += 0.4;
        }

        // Chart data confidence (60% weight)
        if (chartData && chartData.confidence !== undefined) {
            totalConfidence += chartData.confidence * 0.6;
            weightSum += 0.6;
        }

        return weightSum > 0 ? totalConfidence / weightSum : 0;
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up OCR workers...');

        for (const [regionName, worker] of this.ocrWorkers) {
            try {
                await worker.terminate();
                console.log(`   ✅ Terminated worker for ${regionName}`);
            } catch (error) {
                console.error(`   ❌ Failed to terminate worker for ${regionName}:`, error.message);
            }
        }

        this.ocrWorkers.clear();
        console.log('✅ Cleanup completed');
    }
}

module.exports = AdvancedImageProcessor;
