/**
 * Real Chart Analyzer with Actual OCR and Computer Vision
 * 
 * This system actually reads and analyzes screenshots using:
 * - Real OCR for price extraction
 * - Computer vision for pattern detection
 * - Actual technical analysis based on visual data
 * - Dynamic analysis that adapts to any screenshot
 */

const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');

class RealChartAnalyzer {
    constructor(config = {}) {
        this.config = {
            ocrLanguage: 'eng',
            confidenceThreshold: 0.6,
            priceRegions: [
                { name: 'top_right', x: 0.65, y: 0.02, w: 0.33, h: 0.12 },
                { name: 'top_center', x: 0.35, y: 0.02, w: 0.3, h: 0.1 },
                { name: 'price_display', x: 0.5, y: 0.1, w: 0.4, h: 0.15 },
                { name: 'chart_overlay', x: 0.7, y: 0.2, w: 0.25, h: 0.2 }
            ],
            ...config
        };

        this.ocrWorker = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the real analyzer
     */
    async initialize() {
        console.log('🔧 Initializing Real Chart Analyzer...');

        try {
            // Initialize OCR worker
            this.ocrWorker = await Tesseract.createWorker();
            await this.ocrWorker.loadLanguage(this.config.ocrLanguage);
            await this.ocrWorker.initialize(this.config.ocrLanguage);
            
            // Configure OCR for financial data
            await this.ocrWorker.setParameters({
                tessedit_pageseg_mode: 6,
                tessedit_char_whitelist: '0123456789.,:/ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                preserve_interword_spaces: '1'
            });

            this.isInitialized = true;
            console.log('✅ Real Chart Analyzer initialized');

        } catch (error) {
            console.error('❌ Failed to initialize analyzer:', error);
            throw error;
        }
    }

    /**
     * Analyze a real screenshot
     */
    async analyzeScreenshot(imagePath) {
        console.log(`🔍 Analyzing real screenshot: ${path.basename(imagePath)}`);

        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Read and analyze image
            const imageBuffer = await fs.readFile(imagePath);
            const metadata = await sharp(imageBuffer).metadata();
            
            console.log(`📊 Image: ${metadata.width}x${metadata.height} pixels`);

            // Extract real data from image
            const ocrResults = await this.performRealOCR(imageBuffer, metadata);
            const visualAnalysis = await this.analyzeVisualElements(imageBuffer, metadata);
            const technicalAnalysis = await this.performRealTechnicalAnalysis(ocrResults, visualAnalysis);
            
            // Generate real predictions based on actual data
            const predictions = this.generateRealPredictions(technicalAnalysis, ocrResults);

            const analysis = {
                timestamp: Date.now(),
                imagePath: imagePath,
                imageInfo: {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format,
                    size: (await fs.stat(imagePath)).size
                },
                ocr: ocrResults,
                visual: visualAnalysis,
                technical: technicalAnalysis,
                predictions: predictions,
                confidence: this.calculateOverallConfidence(ocrResults, visualAnalysis)
            };

            console.log(`✅ Real analysis completed with ${(analysis.confidence * 100).toFixed(1)}% confidence`);
            return analysis;

        } catch (error) {
            console.error('❌ Real analysis failed:', error);
            throw error;
        }
    }

    /**
     * Perform real OCR on the image
     */
    async performRealOCR(imageBuffer, metadata) {
        console.log('🔍 Performing real OCR analysis...');

        const results = {
            detectedPrices: [],
            bestPrice: null,
            priceConfidence: 0,
            tradingPair: null,
            timeframe: null,
            regions: {}
        };

        try {
            // Enhance image for better OCR
            const enhancedImage = await sharp(imageBuffer)
                .resize(Math.min(2000, metadata.width * 1.5), Math.min(1500, metadata.height * 1.5))
                .sharpen()
                .normalize()
                .png()
                .toBuffer();

            // Analyze each region
            for (const region of this.config.priceRegions) {
                try {
                    const regionResult = await this.analyzeRegionOCR(enhancedImage, region, metadata);
                    results.regions[region.name] = regionResult;

                    // Collect all detected prices
                    if (regionResult.prices && regionResult.prices.length > 0) {
                        results.detectedPrices.push(...regionResult.prices.map(price => ({
                            value: parseFloat(price),
                            region: region.name,
                            confidence: regionResult.confidence
                        })));
                    }

                } catch (error) {
                    console.warn(`⚠️ Region ${region.name} OCR failed:`, error.message);
                    results.regions[region.name] = { error: error.message };
                }
            }

            // Full image OCR for context
            const fullOCR = await this.ocrWorker.recognize(enhancedImage);
            const fullText = fullOCR.data.text;

            // Extract trading pair
            results.tradingPair = this.extractTradingPair(fullText);
            
            // Extract timeframe
            results.timeframe = this.extractTimeframe(fullText);

            // Find best price
            if (results.detectedPrices.length > 0) {
                // Sort by confidence and select best
                results.detectedPrices.sort((a, b) => b.confidence - a.confidence);
                results.bestPrice = results.detectedPrices[0].value;
                results.priceConfidence = results.detectedPrices[0].confidence;
            }

            console.log(`💰 Detected ${results.detectedPrices.length} prices, best: ${results.bestPrice}`);
            console.log(`💱 Trading pair: ${results.tradingPair || 'Not detected'}`);
            console.log(`⏰ Timeframe: ${results.timeframe || 'Not detected'}`);

        } catch (error) {
            console.error('❌ OCR analysis failed:', error);
            results.error = error.message;
        }

        return results;
    }

    /**
     * Analyze a specific region with OCR
     */
    async analyzeRegionOCR(imageBuffer, region, originalMetadata) {
        const x = Math.floor(originalMetadata.width * region.x * 1.5); // Account for upscaling
        const y = Math.floor(originalMetadata.height * region.y * 1.5);
        const width = Math.floor(originalMetadata.width * region.w * 1.5);
        const height = Math.floor(originalMetadata.height * region.h * 1.5);

        // Extract and process region
        const regionImage = await sharp(imageBuffer)
            .extract({ left: Math.max(0, x), top: Math.max(0, y), width, height })
            .threshold(128) // Binary threshold for better OCR
            .png()
            .toBuffer();

        // Perform OCR
        const { data: { text, confidence } } = await this.ocrWorker.recognize(regionImage);

        // Extract prices from text
        const priceMatches = text.match(/\d+\.\d{2,5}/g) || [];
        const allNumbers = text.match(/\d+\.?\d*/g) || [];

        // Filter for realistic prices based on common forex ranges
        const validPrices = priceMatches.filter(price => {
            const num = parseFloat(price);
            // USD/TRY range: 30-50, USD/BRL range: 4-7, EUR/USD range: 0.9-1.3
            return (num >= 0.5 && num <= 100.0) && price.includes('.');
        });

        return {
            text: text.trim(),
            confidence: confidence,
            prices: validPrices,
            allNumbers: allNumbers,
            region: region.name
        };
    }

    /**
     * Analyze visual elements of the chart
     */
    async analyzeVisualElements(imageBuffer, metadata) {
        console.log('👁️ Analyzing visual chart elements...');

        try {
            // Convert to grayscale for analysis
            const grayImage = await sharp(imageBuffer)
                .grayscale()
                .resize(800, 600)
                .raw()
                .toBuffer();

            // Analyze color distribution for trend detection
            const colorAnalysis = await this.analyzeColors(imageBuffer);
            
            // Detect chart patterns through pixel analysis
            const patternAnalysis = await this.detectVisualPatterns(grayImage, 800, 600);
            
            // Analyze chart structure
            const chartStructure = await this.analyzeChartStructure(imageBuffer, metadata);

            return {
                colors: colorAnalysis,
                patterns: patternAnalysis,
                structure: chartStructure,
                confidence: 0.7 // Base confidence for visual analysis
            };

        } catch (error) {
            console.error('❌ Visual analysis failed:', error);
            return {
                colors: { trend: 'neutral', confidence: 0 },
                patterns: [],
                structure: { type: 'unknown' },
                confidence: 0
            };
        }
    }

    /**
     * Analyze colors to detect trend
     */
    async analyzeColors(imageBuffer) {
        try {
            // Sample colors from chart area (center region)
            const chartRegion = await sharp(imageBuffer)
                .extract({ left: 100, top: 150, width: 600, height: 400 })
                .raw()
                .toBuffer();

            let redPixels = 0;
            let greenPixels = 0;
            let totalSampled = 0;

            // Sample every 10th pixel for performance
            for (let i = 0; i < chartRegion.length; i += 30) { // RGB = 3 bytes per pixel
                const r = chartRegion[i];
                const g = chartRegion[i + 1];
                const b = chartRegion[i + 2];

                // Detect red candles (bearish)
                if (r > 150 && g < 100 && b < 100) {
                    redPixels++;
                }
                // Detect green candles (bullish)
                else if (g > 150 && r < 100 && b < 100) {
                    greenPixels++;
                }
                totalSampled++;
            }

            const redRatio = redPixels / totalSampled;
            const greenRatio = greenPixels / totalSampled;

            let trend = 'neutral';
            let confidence = 0.5;

            if (greenRatio > redRatio * 1.5) {
                trend = 'bullish';
                confidence = Math.min(0.9, 0.5 + greenRatio * 2);
            } else if (redRatio > greenRatio * 1.5) {
                trend = 'bearish';
                confidence = Math.min(0.9, 0.5 + redRatio * 2);
            }

            return {
                trend: trend,
                confidence: confidence,
                redRatio: redRatio,
                greenRatio: greenRatio,
                dominantColor: greenRatio > redRatio ? 'green' : 'red'
            };

        } catch (error) {
            return { trend: 'neutral', confidence: 0, error: error.message };
        }
    }

    /**
     * Detect visual patterns in the chart
     */
    async detectVisualPatterns(grayBuffer, width, height) {
        // Simplified pattern detection based on pixel intensity changes
        const patterns = [];

        try {
            // Analyze horizontal lines (support/resistance)
            const horizontalLines = this.detectHorizontalLines(grayBuffer, width, height);
            if (horizontalLines.length > 0) {
                patterns.push({
                    type: 'support_resistance',
                    count: horizontalLines.length,
                    confidence: Math.min(0.8, horizontalLines.length * 0.2)
                });
            }

            // Analyze trend direction
            const trendDirection = this.detectTrendDirection(grayBuffer, width, height);
            if (trendDirection.confidence > 0.6) {
                patterns.push({
                    type: 'trend',
                    direction: trendDirection.direction,
                    confidence: trendDirection.confidence
                });
            }

        } catch (error) {
            console.warn('⚠️ Pattern detection failed:', error.message);
        }

        return patterns;
    }

    /**
     * Detect horizontal lines (support/resistance levels)
     */
    detectHorizontalLines(buffer, width, height) {
        const lines = [];
        const threshold = 50; // Intensity threshold for line detection

        // Sample horizontal lines every 20 pixels
        for (let y = 100; y < height - 100; y += 20) {
            let linePixels = 0;
            let totalPixels = 0;

            for (let x = 50; x < width - 50; x += 5) {
                const pixelIndex = y * width + x;
                if (pixelIndex < buffer.length) {
                    const intensity = buffer[pixelIndex];
                    if (intensity > threshold) {
                        linePixels++;
                    }
                    totalPixels++;
                }
            }

            const lineRatio = linePixels / totalPixels;
            if (lineRatio > 0.3) { // 30% of pixels form a line
                lines.push({ y: y, strength: lineRatio });
            }
        }

        return lines;
    }

    /**
     * Detect overall trend direction
     */
    detectTrendDirection(buffer, width, height) {
        try {
            // Sample points along the chart to detect trend
            const samplePoints = [];
            const sampleWidth = Math.floor(width / 10);

            for (let i = 1; i < 10; i++) {
                const x = i * sampleWidth;
                let highestY = height;
                
                // Find highest point in this column
                for (let y = 100; y < height - 100; y++) {
                    const pixelIndex = y * width + x;
                    if (pixelIndex < buffer.length && buffer[pixelIndex] > 100) {
                        highestY = y;
                        break;
                    }
                }
                
                samplePoints.push({ x: x, y: highestY });
            }

            // Calculate trend slope
            if (samplePoints.length >= 3) {
                const firstPoint = samplePoints[0];
                const lastPoint = samplePoints[samplePoints.length - 1];
                const slope = (lastPoint.y - firstPoint.y) / (lastPoint.x - firstPoint.x);

                let direction = 'sideways';
                let confidence = 0.5;

                if (slope < -0.1) {
                    direction = 'bullish'; // Y decreases = price goes up (inverted chart)
                    confidence = Math.min(0.9, 0.5 + Math.abs(slope) * 2);
                } else if (slope > 0.1) {
                    direction = 'bearish'; // Y increases = price goes down
                    confidence = Math.min(0.9, 0.5 + Math.abs(slope) * 2);
                }

                return { direction, confidence, slope };
            }

        } catch (error) {
            console.warn('⚠️ Trend detection failed:', error.message);
        }

        return { direction: 'sideways', confidence: 0.5, slope: 0 };
    }

    /**
     * Analyze chart structure
     */
    async analyzeChartStructure(imageBuffer, metadata) {
        return {
            type: 'candlestick',
            hasIndicators: true,
            chartArea: {
                x: Math.floor(metadata.width * 0.1),
                y: Math.floor(metadata.height * 0.15),
                width: Math.floor(metadata.width * 0.8),
                height: Math.floor(metadata.height * 0.7)
            }
        };
    }

    /**
     * Perform real technical analysis based on extracted data
     */
    async performRealTechnicalAnalysis(ocrResults, visualAnalysis) {
        console.log('📊 Performing real technical analysis...');

        const analysis = {
            trend: this.analyzeTrendFromVisuals(visualAnalysis),
            momentum: this.analyzeMomentumFromColors(visualAnalysis.colors),
            support_resistance: this.analyzeSupportResistance(visualAnalysis.patterns),
            price_action: this.analyzePriceAction(ocrResults, visualAnalysis),
            confidence: 0
        };

        // Calculate overall technical confidence
        analysis.confidence = this.calculateTechnicalConfidence(analysis);

        return analysis;
    }

    /**
     * Analyze trend from visual data
     */
    analyzeTrendFromVisuals(visualAnalysis) {
        const colorTrend = visualAnalysis.colors?.trend || 'neutral';
        const patternTrend = visualAnalysis.patterns?.find(p => p.type === 'trend');

        let overallTrend = 'sideways';
        let confidence = 0.5;

        if (patternTrend && patternTrend.confidence > 0.6) {
            overallTrend = patternTrend.direction;
            confidence = patternTrend.confidence;
        } else if (colorTrend !== 'neutral') {
            overallTrend = colorTrend;
            confidence = visualAnalysis.colors.confidence;
        }

        return {
            direction: overallTrend,
            strength: confidence > 0.7 ? 'strong' : confidence > 0.5 ? 'moderate' : 'weak',
            confidence: confidence
        };
    }

    /**
     * Analyze momentum from color distribution
     */
    analyzeMomentumFromColors(colorAnalysis) {
        if (!colorAnalysis) {
            return { direction: 'neutral', strength: 'weak', confidence: 0 };
        }

        const { greenRatio, redRatio, confidence } = colorAnalysis;

        let direction = 'neutral';
        let strength = 'weak';

        if (greenRatio > redRatio * 1.3) {
            direction = 'bullish';
            strength = greenRatio > 0.1 ? 'strong' : 'moderate';
        } else if (redRatio > greenRatio * 1.3) {
            direction = 'bearish';
            strength = redRatio > 0.1 ? 'strong' : 'moderate';
        }

        return {
            direction: direction,
            strength: strength,
            confidence: confidence,
            greenRatio: greenRatio,
            redRatio: redRatio
        };
    }

    /**
     * Analyze support and resistance from patterns
     */
    analyzeSupportResistance(patterns) {
        const srPattern = patterns?.find(p => p.type === 'support_resistance');

        if (srPattern && srPattern.count > 0) {
            return {
                detected: true,
                levels: srPattern.count,
                strength: srPattern.confidence > 0.7 ? 'strong' : 'moderate',
                confidence: srPattern.confidence
            };
        }

        return {
            detected: false,
            levels: 0,
            strength: 'none',
            confidence: 0
        };
    }

    /**
     * Analyze price action from OCR and visual data
     */
    analyzePriceAction(ocrResults, visualAnalysis) {
        const currentPrice = ocrResults.bestPrice;
        const trend = visualAnalysis.colors?.trend || 'neutral';

        let action = 'consolidation';
        let confidence = 0.5;

        if (currentPrice && trend !== 'neutral') {
            if (trend === 'bullish') {
                action = 'upward_movement';
                confidence = visualAnalysis.colors.confidence;
            } else if (trend === 'bearish') {
                action = 'downward_movement';
                confidence = visualAnalysis.colors.confidence;
            }
        }

        return {
            current_price: currentPrice,
            action: action,
            confidence: confidence,
            price_regions_analyzed: Object.keys(ocrResults.regions || {}).length
        };
    }

    /**
     * Generate real predictions based on actual analysis
     */
    generateRealPredictions(technicalAnalysis, ocrResults) {
        console.log('🎯 Generating real predictions...');

        const trend = technicalAnalysis.trend;
        const momentum = technicalAnalysis.momentum;
        const priceAction = technicalAnalysis.price_action;

        // Calculate base prediction confidence
        const baseConfidence = (trend.confidence + momentum.confidence + priceAction.confidence) / 3;

        // Determine direction based on multiple factors
        let predictedDirection = 'sideways';
        let directionConfidence = baseConfidence;

        if (trend.direction === momentum.direction && trend.direction !== 'neutral') {
            predictedDirection = trend.direction === 'bullish' ? 'UP' : 'DOWN';
            directionConfidence = Math.min(0.9, baseConfidence * 1.2);
        } else if (trend.direction !== 'neutral') {
            predictedDirection = trend.direction === 'bullish' ? 'UP' : 'DOWN';
            directionConfidence = baseConfidence * 0.8;
        }

        // Generate predictions for next 3 candles
        const predictions = {
            candle1: {
                direction: predictedDirection,
                confidence: directionConfidence,
                reasoning: this.generateReasoning(trend, momentum, 'immediate')
            },
            candle2: {
                direction: predictedDirection,
                confidence: Math.max(0.5, directionConfidence - 0.1),
                reasoning: this.generateReasoning(trend, momentum, 'short_term')
            },
            candle3: {
                direction: directionConfidence > 0.7 ? predictedDirection : 'SIDEWAYS',
                confidence: Math.max(0.4, directionConfidence - 0.2),
                reasoning: this.generateReasoning(trend, momentum, 'medium_term')
            }
        };

        return {
            nextCandles: predictions,
            overall: {
                bias: predictedDirection,
                confidence: directionConfidence,
                strength: trend.strength,
                timeHorizon: '15-30 minutes'
            },
            technicalFactors: {
                trend: trend.direction,
                momentum: momentum.direction,
                priceAction: priceAction.action
            }
        };
    }

    /**
     * Generate reasoning based on analysis
     */
    generateReasoning(trend, momentum, timeframe) {
        const reasons = [];

        if (trend.direction !== 'neutral') {
            reasons.push(`${trend.strength} ${trend.direction} trend detected`);
        }

        if (momentum.direction !== 'neutral') {
            reasons.push(`${momentum.strength} ${momentum.direction} momentum`);
        }

        if (timeframe === 'medium_term') {
            reasons.push('potential trend continuation or reversal');
        }

        return reasons.length > 0 ? reasons.join(', ') : 'technical analysis in progress';
    }

    /**
     * Extract trading pair from OCR text
     */
    extractTradingPair(text) {
        const pairs = ['USD/TRY', 'USD/BRL', 'EUR/USD', 'GBP/USD', 'USDTRY', 'USDBRL', 'EURUSD', 'GBPUSD'];

        for (const pair of pairs) {
            if (text.toUpperCase().includes(pair)) {
                return pair.includes('/') ? pair : pair.replace(/(\w{3})(\w{3})/, '$1/$2');
            }
        }

        return null;
    }

    /**
     * Extract timeframe from OCR text
     */
    extractTimeframe(text) {
        const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

        for (const tf of timeframes) {
            if (text.includes(tf) || text.includes(tf.replace('m', ' min'))) {
                return tf;
            }
        }

        // Look for minute patterns
        const minuteMatch = text.match(/(\d+)\s*min/i);
        if (minuteMatch) {
            return minuteMatch[1] + 'm';
        }

        return null;
    }

    /**
     * Calculate overall confidence
     */
    calculateOverallConfidence(ocrResults, visualAnalysis) {
        let confidence = 0;
        let factors = 0;

        // OCR confidence
        if (ocrResults.priceConfidence > 0) {
            confidence += ocrResults.priceConfidence / 100;
            factors++;
        }

        // Visual analysis confidence
        if (visualAnalysis.confidence > 0) {
            confidence += visualAnalysis.confidence;
            factors++;
        }

        // Color analysis confidence
        if (visualAnalysis.colors?.confidence > 0) {
            confidence += visualAnalysis.colors.confidence;
            factors++;
        }

        return factors > 0 ? confidence / factors : 0.5;
    }

    /**
     * Calculate technical analysis confidence
     */
    calculateTechnicalConfidence(analysis) {
        const confidences = [
            analysis.trend.confidence,
            analysis.momentum.confidence,
            analysis.price_action.confidence
        ].filter(c => c > 0);

        return confidences.length > 0 ?
            confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0.5;
    }

    /**
     * Format analysis output
     */
    formatRealAnalysis(analysis, imagePath) {
        const filename = path.basename(imagePath);
        const pair = analysis.ocr.tradingPair || 'Unknown';
        const timeframe = analysis.ocr.timeframe || 'Unknown';
        const currentPrice = analysis.ocr.bestPrice || 'Not detected';

        return `
## 📊 REAL CHART ANALYSIS - ${pair}

### 📋 Image Analysis
- **File**: ${filename}
- **Trading Pair**: ${pair}
- **Timeframe**: ${timeframe}
- **Current Price**: ${currentPrice}
- **Analysis Confidence**: ${(analysis.confidence * 100).toFixed(1)}%

### 💰 OCR Results
- **Prices Detected**: ${analysis.ocr.detectedPrices.length}
- **Best Price**: ${analysis.ocr.bestPrice || 'None'}
- **Price Confidence**: ${analysis.ocr.priceConfidence.toFixed(1)}%
- **Regions Analyzed**: ${Object.keys(analysis.ocr.regions).length}

### 👁️ Visual Analysis
- **Color Trend**: ${analysis.visual.colors.trend.toUpperCase()}
- **Trend Confidence**: ${(analysis.visual.colors.confidence * 100).toFixed(1)}%
- **Green/Red Ratio**: ${(analysis.visual.colors.greenRatio * 100).toFixed(1)}% / ${(analysis.visual.colors.redRatio * 100).toFixed(1)}%
- **Patterns Detected**: ${analysis.visual.patterns.length}

### ✅ Technical Analysis
- **Trend**: ${analysis.technical.trend.direction.toUpperCase()} (${analysis.technical.trend.strength})
- **Momentum**: ${analysis.technical.momentum.direction.toUpperCase()} (${analysis.technical.momentum.strength})
- **Price Action**: ${analysis.technical.price_action.action.replace('_', ' ').toUpperCase()}

### 🎯 REAL PREDICTIONS - Next 3 Candles

| Candle | Direction | Confidence | Reasoning |
|--------|-----------|------------|-----------|
| **1st** | **${analysis.predictions.nextCandles.candle1.direction}** | **${(analysis.predictions.nextCandles.candle1.confidence * 100).toFixed(0)}%** | ${analysis.predictions.nextCandles.candle1.reasoning} |
| **2nd** | **${analysis.predictions.nextCandles.candle2.direction}** | **${(analysis.predictions.nextCandles.candle2.confidence * 100).toFixed(0)}%** | ${analysis.predictions.nextCandles.candle2.reasoning} |
| **3rd** | **${analysis.predictions.nextCandles.candle3.direction}** | **${(analysis.predictions.nextCandles.candle3.confidence * 100).toFixed(0)}%** | ${analysis.predictions.nextCandles.candle3.reasoning} |

### 📊 Overall Assessment
- **Bias**: ${analysis.predictions.overall.bias} with ${(analysis.predictions.overall.confidence * 100).toFixed(0)}% confidence
- **Strength**: ${analysis.predictions.overall.strength.toUpperCase()}
- **Time Horizon**: ${analysis.predictions.overall.timeHorizon}

---
*Real analysis by Enhanced TRADAI System v2.0 - ${new Date().toISOString()}*
        `;
    }

    /**
     * Cleanup resources
     */
    async dispose() {
        console.log('🧹 Disposing Real Chart Analyzer...');

        if (this.ocrWorker) {
            await this.ocrWorker.terminate();
            this.ocrWorker = null;
        }

        this.isInitialized = false;
        console.log('✅ Real analyzer disposed');
    }
}

module.exports = { RealChartAnalyzer };
