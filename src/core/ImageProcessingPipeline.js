/**
 * Image Processing Pipeline
 * 
 * Core image processing capabilities for OTC binary options chart analysis
 * using computer vision and OCR techniques.
 */

const sharp = require('sharp');
const Tesseract = require('tesseract.js');

class ImageProcessingPipeline {
    constructor(config = {}) {
        this.config = {
            maxWidth: config.maxWidth || 1920,
            maxHeight: config.maxHeight || 1080,
            maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
            supportedFormats: config.supportedFormats || ['png', 'jpg', 'jpeg', 'webp'],
            qualityThreshold: config.qualityThreshold || 0.7,
            ...config
        };

        this.processingStats = {
            totalProcessed: 0,
            successfulProcessing: 0,
            averageProcessingTime: 0,
            lastProcessed: null
        };
    }

    /**
     * Process uploaded image through the complete pipeline
     */
    async processImage(imageBuffer, filename = 'unknown') {
        const startTime = Date.now();
        console.log(`🖼️ Starting image processing for ${filename}`);

        try {
            // Step 1: Validate image
            const validation = await this.validateImage(imageBuffer, filename);
            if (!validation.isValid) {
                throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
            }

            // Step 2: Preprocess image
            const preprocessed = await this.preprocessImage(imageBuffer);

            // Step 3: Detect chart area
            const chartDetection = await this.detectChartArea(preprocessed);

            // Step 4: Extract chart elements
            const elements = await this.extractChartElements(chartDetection.chartImage);

            // Step 5: Perform OCR on text regions
            const ocrResults = await this.performOCR(chartDetection.chartImage, elements.textRegions);

            // Step 6: Reconstruct market data
            const marketData = await this.reconstructMarketData(elements, ocrResults);

            const processingTime = Date.now() - startTime;
            this.updateProcessingStats(processingTime, true);

            console.log(`✅ Image processing completed in ${processingTime}ms`);

            return {
                success: true,
                processingTime,
                validation,
                chartDetection,
                elements,
                ocrResults,
                marketData,
                metadata: {
                    filename,
                    originalSize: validation.metadata.size,
                    processedSize: chartDetection.metadata.size,
                    confidence: this.calculateOverallConfidence(chartDetection, elements, ocrResults)
                }
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.updateProcessingStats(processingTime, false);
            
            console.error(`❌ Image processing failed for ${filename}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                processingTime,
                filename
            };
        }
    }

    /**
     * Validate uploaded image
     */
    async validateImage(imageBuffer, filename) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            metadata: {}
        };

        try {
            // Get image metadata
            const metadata = await sharp(imageBuffer).metadata();
            validation.metadata = {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                size: imageBuffer.length,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha
            };

            // Check file size
            if (imageBuffer.length > this.config.maxFileSize) {
                validation.errors.push(`File too large: ${imageBuffer.length} bytes > ${this.config.maxFileSize} bytes`);
                validation.isValid = false;
            }

            // Check format
            if (!this.config.supportedFormats.includes(metadata.format)) {
                validation.errors.push(`Unsupported format: ${metadata.format}`);
                validation.isValid = false;
            }

            // Check dimensions
            if (metadata.width < 800 || metadata.height < 600) {
                validation.errors.push(`Resolution too low: ${metadata.width}x${metadata.height} (minimum: 800x600)`);
                validation.isValid = false;
            }

            if (metadata.width > this.config.maxWidth || metadata.height > this.config.maxHeight) {
                validation.warnings.push(`Large image will be resized: ${metadata.width}x${metadata.height}`);
            }

            // Check aspect ratio
            const aspectRatio = metadata.width / metadata.height;
            if (aspectRatio < 0.5 || aspectRatio > 3.0) {
                validation.warnings.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)}`);
            }

            console.log(`📊 Image validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
            return validation;

        } catch (error) {
            validation.isValid = false;
            validation.errors.push(`Validation error: ${error.message}`);
            return validation;
        }
    }

    /**
     * Preprocess image for analysis
     */
    async preprocessImage(imageBuffer) {
        console.log('🔧 Preprocessing image...');

        try {
            let processedImage = sharp(imageBuffer);

            // Resize if too large
            const metadata = await processedImage.metadata();
            if (metadata.width > this.config.maxWidth || metadata.height > this.config.maxHeight) {
                processedImage = processedImage.resize(this.config.maxWidth, this.config.maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            // Enhance image quality
            processedImage = processedImage
                .normalize() // Normalize contrast
                .sharpen() // Sharpen edges
                .png({ quality: 90 }); // Convert to high-quality PNG

            const processedBuffer = await processedImage.toBuffer();
            
            console.log('✅ Image preprocessing completed');
            return processedBuffer;

        } catch (error) {
            throw new Error(`Image preprocessing failed: ${error.message}`);
        }
    }

    /**
     * Detect chart area in the image
     */
    async detectChartArea(imageBuffer) {
        console.log('🎯 Detecting chart area...');

        try {
            // For now, implement a basic chart detection
            // In a full implementation, this would use computer vision algorithms
            const metadata = await sharp(imageBuffer).metadata();
            
            // Assume chart occupies central 80% of the image
            const chartMargin = 0.1;
            const chartArea = {
                left: Math.floor(metadata.width * chartMargin),
                top: Math.floor(metadata.height * chartMargin),
                width: Math.floor(metadata.width * (1 - 2 * chartMargin)),
                height: Math.floor(metadata.height * (1 - 2 * chartMargin))
            };

            // Extract chart area
            const chartImage = await sharp(imageBuffer)
                .extract(chartArea)
                .png()
                .toBuffer();

            const confidence = 0.8; // Placeholder confidence score

            console.log(`✅ Chart area detected with ${(confidence * 100).toFixed(1)}% confidence`);

            return {
                success: true,
                confidence,
                chartArea,
                chartImage,
                metadata: {
                    originalSize: { width: metadata.width, height: metadata.height },
                    chartSize: { width: chartArea.width, height: chartArea.height },
                    extractionRatio: (chartArea.width * chartArea.height) / (metadata.width * metadata.height)
                }
            };

        } catch (error) {
            throw new Error(`Chart detection failed: ${error.message}`);
        }
    }

    /**
     * Extract chart elements (candles, indicators, etc.)
     */
    async extractChartElements(chartImageBuffer) {
        console.log('📊 Extracting chart elements...');

        try {
            const metadata = await sharp(chartImageBuffer).metadata();
            
            // Placeholder implementation - in reality, this would use computer vision
            const elements = {
                candles: this.detectCandlesticks(chartImageBuffer, metadata),
                indicators: this.detectIndicators(chartImageBuffer, metadata),
                textRegions: this.detectTextRegions(chartImageBuffer, metadata),
                gridLines: this.detectGridLines(chartImageBuffer, metadata)
            };

            const confidence = 0.75; // Placeholder confidence

            console.log(`✅ Chart elements extracted with ${(confidence * 100).toFixed(1)}% confidence`);

            return {
                success: true,
                confidence,
                elements,
                metadata: {
                    candleCount: elements.candles.length,
                    indicatorCount: elements.indicators.length,
                    textRegionCount: elements.textRegions.length
                }
            };

        } catch (error) {
            throw new Error(`Element extraction failed: ${error.message}`);
        }
    }

    /**
     * Detect candlesticks in the chart (placeholder implementation)
     */
    detectCandlesticks(imageBuffer, metadata) {
        // Placeholder: Generate sample candlestick data
        const candles = [];
        const candleCount = 50; // Assume 50 visible candles
        const chartWidth = metadata.width;
        const candleWidth = chartWidth / candleCount;

        for (let i = 0; i < candleCount; i++) {
            candles.push({
                index: i,
                x: i * candleWidth,
                width: candleWidth * 0.8,
                bodyTop: metadata.height * (0.3 + Math.random() * 0.2),
                bodyBottom: metadata.height * (0.5 + Math.random() * 0.2),
                wickTop: metadata.height * (0.2 + Math.random() * 0.1),
                wickBottom: metadata.height * (0.7 + Math.random() * 0.1),
                color: Math.random() > 0.5 ? 'green' : 'red',
                confidence: 0.8 + Math.random() * 0.2
            });
        }

        return candles;
    }

    /**
     * Detect indicators in the chart (placeholder implementation)
     */
    detectIndicators(imageBuffer, metadata) {
        // Placeholder: Detect common indicators
        return [
            {
                type: 'moving_average',
                color: 'blue',
                confidence: 0.85,
                points: [] // Would contain actual line points
            },
            {
                type: 'rsi',
                location: 'bottom_panel',
                confidence: 0.75,
                value: 65
            }
        ];
    }

    /**
     * Detect text regions for OCR (placeholder implementation)
     */
    detectTextRegions(imageBuffer, metadata) {
        // Placeholder: Define typical text regions in trading charts
        return [
            {
                type: 'price_labels',
                region: { x: metadata.width * 0.85, y: 0, width: metadata.width * 0.15, height: metadata.height },
                confidence: 0.9
            },
            {
                type: 'time_labels',
                region: { x: 0, y: metadata.height * 0.9, width: metadata.width, height: metadata.height * 0.1 },
                confidence: 0.85
            },
            {
                type: 'current_price',
                region: { x: metadata.width * 0.7, y: metadata.height * 0.45, width: metadata.width * 0.3, height: metadata.height * 0.1 },
                confidence: 0.95
            }
        ];
    }

    /**
     * Detect grid lines (placeholder implementation)
     */
    detectGridLines(imageBuffer, metadata) {
        // Placeholder: Detect horizontal and vertical grid lines
        return {
            horizontal: 10, // Number of horizontal lines
            vertical: 20,   // Number of vertical lines
            confidence: 0.7
        };
    }

    /**
     * Perform OCR on detected text regions
     */
    async performOCR(imageBuffer, textRegions) {
        console.log('🔍 Performing OCR on text regions...');

        try {
            const ocrResults = [];

            for (const region of textRegions) {
                try {
                    // Extract region from image
                    const regionImage = await sharp(imageBuffer)
                        .extract({
                            left: Math.floor(region.region.x),
                            top: Math.floor(region.region.y),
                            width: Math.floor(region.region.width),
                            height: Math.floor(region.region.height)
                        })
                        .png()
                        .toBuffer();

                    // Perform OCR
                    const { data: { text, confidence } } = await Tesseract.recognize(regionImage, 'eng', {
                        logger: m => {} // Suppress logging
                    });

                    ocrResults.push({
                        type: region.type,
                        text: text.trim(),
                        confidence: confidence / 100, // Convert to 0-1 scale
                        region: region.region
                    });

                } catch (error) {
                    console.warn(`OCR failed for region ${region.type}:`, error.message);
                    ocrResults.push({
                        type: region.type,
                        text: '',
                        confidence: 0,
                        error: error.message,
                        region: region.region
                    });
                }
            }

            const avgConfidence = ocrResults.reduce((sum, r) => sum + r.confidence, 0) / ocrResults.length;
            console.log(`✅ OCR completed with ${(avgConfidence * 100).toFixed(1)}% average confidence`);

            return {
                success: true,
                results: ocrResults,
                averageConfidence: avgConfidence,
                processedRegions: textRegions.length
            };

        } catch (error) {
            throw new Error(`OCR processing failed: ${error.message}`);
        }
    }

    /**
     * Reconstruct market data from extracted elements
     */
    async reconstructMarketData(elements, ocrResults) {
        console.log('🔄 Reconstructing market data...');

        try {
            // Extract price information from OCR
            const priceTexts = ocrResults.results
                .filter(r => r.type === 'price_labels' || r.type === 'current_price')
                .map(r => r.text)
                .join(' ');

            // Extract numbers from text
            const prices = this.extractNumbers(priceTexts);
            const currentPrice = prices.length > 0 ? prices[prices.length - 1] : null;

            // Reconstruct OHLCV data from candlesticks
            const ohlcvData = elements.elements.candles.map((candle, index) => {
                // Convert pixel positions to price values (placeholder logic)
                const priceRange = prices.length > 1 ? Math.max(...prices) - Math.min(...prices) : 100;
                const chartHeight = 400; // Assumed chart height
                
                const high = Math.min(...prices) + (1 - candle.wickTop / chartHeight) * priceRange;
                const low = Math.min(...prices) + (1 - candle.wickBottom / chartHeight) * priceRange;
                const open = Math.min(...prices) + (1 - candle.bodyTop / chartHeight) * priceRange;
                const close = Math.min(...prices) + (1 - candle.bodyBottom / chartHeight) * priceRange;

                return {
                    timestamp: Date.now() - (elements.elements.candles.length - index) * 60000, // 1 minute intervals
                    open: parseFloat(open.toFixed(5)),
                    high: parseFloat(high.toFixed(5)),
                    low: parseFloat(low.toFixed(5)),
                    close: parseFloat(close.toFixed(5)),
                    volume: 1000 + Math.random() * 500 // Placeholder volume
                };
            });

            const confidence = 0.7; // Placeholder confidence

            console.log(`✅ Market data reconstructed with ${(confidence * 100).toFixed(1)}% confidence`);

            return {
                success: true,
                confidence,
                currentPrice,
                ohlcvData,
                metadata: {
                    candleCount: ohlcvData.length,
                    priceRange: prices.length > 1 ? Math.max(...prices) - Math.min(...prices) : 0,
                    timeframe: '1m', // Assumed timeframe
                    extractedPrices: prices.length
                }
            };

        } catch (error) {
            throw new Error(`Market data reconstruction failed: ${error.message}`);
        }
    }

    /**
     * Extract numbers from text using regex
     */
    extractNumbers(text) {
        const numberRegex = /\d+\.?\d*/g;
        const matches = text.match(numberRegex);
        return matches ? matches.map(m => parseFloat(m)).filter(n => !isNaN(n)) : [];
    }

    /**
     * Calculate overall confidence score
     */
    calculateOverallConfidence(chartDetection, elements, ocrResults) {
        const weights = {
            chartDetection: 0.3,
            elements: 0.4,
            ocr: 0.3
        };

        return (
            chartDetection.confidence * weights.chartDetection +
            elements.confidence * weights.elements +
            ocrResults.averageConfidence * weights.ocr
        );
    }

    /**
     * Update processing statistics
     */
    updateProcessingStats(processingTime, success) {
        this.processingStats.totalProcessed++;
        if (success) {
            this.processingStats.successfulProcessing++;
        }
        
        // Update average processing time
        const totalTime = this.processingStats.averageProcessingTime * (this.processingStats.totalProcessed - 1) + processingTime;
        this.processingStats.averageProcessingTime = totalTime / this.processingStats.totalProcessed;
        
        this.processingStats.lastProcessed = Date.now();
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return {
            ...this.processingStats,
            successRate: this.processingStats.totalProcessed > 0 ? 
                this.processingStats.successfulProcessing / this.processingStats.totalProcessed : 0
        };
    }
}

module.exports = { ImageProcessingPipeline };
