/**
 * AI Candle Sniper - Canvas Data Parser
 * Advanced canvas-based chart data extraction for platforms like Quotex
 * Fallback method when DOM/JS injection fails
 */

class CanvasChartParser {
    constructor() {
        this.debugMode = false;
        this.canvasCache = new Map();
        this.lastAnalysis = 0;
        this.minAnalysisInterval = 5000; // 5 seconds minimum between analyses
        
        // Canvas analysis settings
        this.settings = {
            candleDetection: {
                minCandleWidth: 3,
                maxCandleWidth: 50,
                minCandleHeight: 5,
                colorTolerance: 30
            },
            priceDetection: {
                digitRecognition: true,
                yAxisSampling: true,
                priceGridDetection: true
            },
            timeDetection: {
                xAxisSampling: true,
                timestampPattern: /\d{2}:\d{2}/
            }
        };
        
        // Common candlestick colors (RGB values)
        this.candleColors = {
            bullish: [
                [34, 197, 94],   // Green
                [16, 185, 129],  // Emerald
                [5, 150, 105],   // Dark green
                [0, 200, 0],     // Bright green
                [0, 255, 0]      // Lime green
            ],
            bearish: [
                [239, 68, 68],   // Red
                [220, 38, 38],   // Dark red
                [185, 28, 28],   // Darker red
                [255, 0, 0],     // Bright red
                [200, 0, 0]      // Dark red
            ]
        };
    }

    async analyzeChartCanvas(canvas) {
        if (!canvas || !canvas.getContext) {
            console.error('[Canvas Parser] Invalid canvas element');
            return null;
        }

        const now = Date.now();
        if (now - this.lastAnalysis < this.minAnalysisInterval) {
            return null; // Too frequent analysis
        }

        this.lastAnalysis = now;

        try {
            console.log('[Canvas Parser] 🔍 Starting canvas analysis...');
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Cache the image data for comparison
            const canvasKey = this.generateCanvasKey(canvas);
            const cachedData = this.canvasCache.get(canvasKey);
            
            if (cachedData && this.isImageDataSimilar(imageData, cachedData.imageData)) {
                console.log('[Canvas Parser] Canvas unchanged, using cached analysis');
                return cachedData.analysis;
            }

            // Perform comprehensive analysis
            const analysis = await this.performCanvasAnalysis(canvas, imageData);
            
            // Cache the result
            this.canvasCache.set(canvasKey, {
                imageData: imageData,
                analysis: analysis,
                timestamp: now
            });

            // Clean old cache entries
            this.cleanCache();

            return analysis;

        } catch (error) {
            console.error('[Canvas Parser] Analysis failed:', error);
            return null;
        }
    }

    async performCanvasAnalysis(canvas, imageData) {
        const analysis = {
            candles: [],
            priceAxis: null,
            timeAxis: null,
            chartBounds: null,
            confidence: 0,
            method: 'canvas_analysis'
        };

        // Step 1: Detect chart boundaries
        const chartBounds = this.detectChartBounds(canvas, imageData);
        if (!chartBounds) {
            console.log('[Canvas Parser] Could not detect chart boundaries');
            return analysis;
        }
        analysis.chartBounds = chartBounds;

        // Step 2: Detect price axis
        const priceAxis = await this.detectPriceAxis(canvas, imageData, chartBounds);
        if (priceAxis && priceAxis.prices.length > 0) {
            analysis.priceAxis = priceAxis;
            analysis.confidence += 25;
        }

        // Step 3: Detect time axis
        const timeAxis = await this.detectTimeAxis(canvas, imageData, chartBounds);
        if (timeAxis && timeAxis.timestamps.length > 0) {
            analysis.timeAxis = timeAxis;
            analysis.confidence += 15;
        }

        // Step 4: Detect candlestick patterns
        const candles = await this.detectCandlesticks(canvas, imageData, chartBounds, priceAxis, timeAxis);
        if (candles && candles.length > 0) {
            analysis.candles = candles;
            analysis.confidence += 40;
        }

        // Step 5: Cross-validate detected data
        if (analysis.confidence >= 60) {
            analysis.candles = this.validateAndCleanCandles(analysis.candles);
            analysis.confidence += 20;
        }

        console.log(`[Canvas Parser] Analysis complete - Confidence: ${analysis.confidence}%, Candles: ${analysis.candles.length}`);
        return analysis;
    }

    detectChartBounds(canvas, imageData) {
        const { width, height, data } = imageData;
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let chartPixelCount = 0;

        // Scan for chart content by looking for non-background pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelIndex = (y * width + x) * 4;
                const r = data[pixelIndex];
                const g = data[pixelIndex + 1];
                const b = data[pixelIndex + 2];
                const a = data[pixelIndex + 3];

                // Skip transparent or very light pixels (likely background)
                if (a < 100 || (r > 240 && g > 240 && b > 240)) {
                    continue;
                }

                // Check if this looks like chart content
                if (this.isChartPixel(r, g, b)) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                    chartPixelCount++;
                }
            }
        }

        if (chartPixelCount < 1000) { // Need minimum chart content
            return null;
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    isChartPixel(r, g, b) {
        // Check if pixel could be part of a chart (candlestick, grid, etc.)
        
        // Check for candlestick colors
        for (const colorSet of [this.candleColors.bullish, this.candleColors.bearish]) {
            for (const [cr, cg, cb] of colorSet) {
                if (this.colorDistance(r, g, b, cr, cg, cb) < this.settings.candleDetection.colorTolerance) {
                    return true;
                }
            }
        }

        // Check for grid lines (usually gray)
        if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 100 && r < 200) {
            return true;
        }

        // Check for axis lines (usually dark)
        if (r < 100 && g < 100 && b < 100) {
            return true;
        }

        return false;
    }

    async detectPriceAxis(canvas, imageData, chartBounds) {
        const priceAxis = {
            prices: [],
            positions: [],
            accuracy: 0
        };

        try {
            // Look for price labels on the right side of the chart
            const rightMargin = 50; // Pixels from right edge to look for prices
            const searchArea = {
                x: chartBounds.x + chartBounds.width,
                y: chartBounds.y,
                width: Math.min(rightMargin, canvas.width - (chartBounds.x + chartBounds.width)),
                height: chartBounds.height
            };

            // Use OCR-like approach to detect price numbers
            const detectedPrices = await this.detectPriceNumbers(canvas, searchArea);
            
            if (detectedPrices.length > 0) {
                priceAxis.prices = detectedPrices.map(p => p.value);
                priceAxis.positions = detectedPrices.map(p => p.y);
                priceAxis.accuracy = this.calculatePriceAccuracy(detectedPrices);
            }

        } catch (error) {
            console.error('[Canvas Parser] Price axis detection failed:', error);
        }

        return priceAxis;
    }

    async detectTimeAxis(canvas, imageData, chartBounds) {
        const timeAxis = {
            timestamps: [],
            positions: [],
            accuracy: 0
        };

        try {
            // Look for time labels at the bottom of the chart
            const bottomMargin = 30;
            const searchArea = {
                x: chartBounds.x,
                y: chartBounds.y + chartBounds.height,
                width: chartBounds.width,
                height: Math.min(bottomMargin, canvas.height - (chartBounds.y + chartBounds.height))
            };

            // Detect time stamps
            const detectedTimes = await this.detectTimeStamps(canvas, searchArea);
            
            if (detectedTimes.length > 0) {
                timeAxis.timestamps = detectedTimes.map(t => t.value);
                timeAxis.positions = detectedTimes.map(t => t.x);
                timeAxis.accuracy = this.calculateTimeAccuracy(detectedTimes);
            }

        } catch (error) {
            console.error('[Canvas Parser] Time axis detection failed:', error);
        }

        return timeAxis;
    }

    async detectCandlesticks(canvas, imageData, chartBounds, priceAxis, timeAxis) {
        const candles = [];
        const { width, height, data } = imageData;

        try {
            // Scan for candlestick patterns within chart bounds
            const candleWidth = this.estimateCandleWidth(chartBounds.width, timeAxis);
            const scanStep = Math.max(1, Math.floor(candleWidth / 3));

            for (let x = chartBounds.x; x < chartBounds.x + chartBounds.width; x += scanStep) {
                const candleData = this.analyzeCandleColumn(imageData, x, chartBounds, priceAxis);
                
                if (candleData && candleData.isValid) {
                    // Convert pixel positions to price values
                    const candle = this.convertPixelsToPrices(candleData, priceAxis, timeAxis, x, chartBounds);
                    if (candle) {
                        candles.push(candle);
                    }
                }
            }

            // Sort candles by timestamp
            candles.sort((a, b) => a.timestamp - b.timestamp);

        } catch (error) {
            console.error('[Canvas Parser] Candlestick detection failed:', error);
        }

        return candles;
    }

    analyzeCandleColumn(imageData, x, chartBounds, priceAxis) {
        const { width, height, data } = imageData;
        const columnData = {
            x: x,
            highY: null,
            lowY: null,
            openY: null,
            closeY: null,
            bodyTop: null,
            bodyBottom: null,
            isBullish: null,
            isValid: false
        };

        let candlePixels = [];
        let bodyPixels = [];

        // Scan column for candlestick pixels
        for (let y = chartBounds.y; y < chartBounds.y + chartBounds.height; y++) {
            const pixelIndex = (y * width + x) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];

            if (a < 100) continue; // Skip transparent pixels

            // Check if this pixel is part of a candlestick
            const isBullishPixel = this.isBullishColor(r, g, b);
            const isBearishPixel = this.isBearishColor(r, g, b);

            if (isBullishPixel || isBearishPixel) {
                candlePixels.push({ y, r, g, b, isBullish: isBullishPixel });
                
                // Check if this is a thick body pixel (not just a wick)
                if (this.isBodyPixel(imageData, x, y, width)) {
                    bodyPixels.push({ y, isBullish: isBullishPixel });
                }
            }
        }

        // Analyze collected pixels
        if (candlePixels.length > 0) {
            columnData.highY = Math.min(...candlePixels.map(p => p.y));
            columnData.lowY = Math.max(...candlePixels.map(p => p.y));
            
            if (bodyPixels.length > 0) {
                columnData.bodyTop = Math.min(...bodyPixels.map(p => p.y));
                columnData.bodyBottom = Math.max(...bodyPixels.map(p => p.y));
                
                // Determine if bullish or bearish based on body pixels
                const bullishBodyPixels = bodyPixels.filter(p => p.isBullish).length;
                const bearishBodyPixels = bodyPixels.filter(p => !p.isBullish).length;
                columnData.isBullish = bullishBodyPixels > bearishBodyPixels;
                
                // Set open/close based on candle type
                if (columnData.isBullish) {
                    columnData.openY = columnData.bodyBottom;
                    columnData.closeY = columnData.bodyTop;
                } else {
                    columnData.openY = columnData.bodyTop;
                    columnData.closeY = columnData.bodyBottom;
                }
                
                columnData.isValid = true;
            }
        }

        return columnData;
    }

    convertPixelsToPrices(candleData, priceAxis, timeAxis, x, chartBounds) {
        if (!priceAxis || !priceAxis.prices.length) {
            return null; // Can't convert without price reference
        }

        try {
            // Calculate price per pixel
            const priceRange = Math.max(...priceAxis.prices) - Math.min(...priceAxis.prices);
            const pixelRange = chartBounds.height;
            const pricePerPixel = priceRange / pixelRange;
            const minPrice = Math.min(...priceAxis.prices);

            // Convert Y positions to prices (Y axis is inverted)
            const convertYToPrice = (y) => {
                const pixelsFromBottom = (chartBounds.y + chartBounds.height) - y;
                return minPrice + (pixelsFromBottom * pricePerPixel);
            };

            // Estimate timestamp
            const estimatedTimestamp = this.estimateTimestamp(x, chartBounds, timeAxis);

            return {
                timestamp: estimatedTimestamp,
                open: parseFloat(convertYToPrice(candleData.openY).toFixed(5)),
                high: parseFloat(convertYToPrice(candleData.highY).toFixed(5)),
                low: parseFloat(convertYToPrice(candleData.lowY).toFixed(5)),
                close: parseFloat(convertYToPrice(candleData.closeY).toFixed(5)),
                volume: 0, // Canvas parsing can't detect volume
                isBullish: candleData.isBullish,
                confidence: 0.7 // Medium confidence for canvas-detected candles
            };

        } catch (error) {
            console.error('[Canvas Parser] Price conversion failed:', error);
            return null;
        }
    }

    // Utility methods
    isBullishColor(r, g, b) {
        return this.candleColors.bullish.some(([cr, cg, cb]) => 
            this.colorDistance(r, g, b, cr, cg, cb) < this.settings.candleDetection.colorTolerance
        );
    }

    isBearishColor(r, g, b) {
        return this.candleColors.bearish.some(([cr, cg, cb]) => 
            this.colorDistance(r, g, b, cr, cg, cb) < this.settings.candleDetection.colorTolerance
        );
    }

    colorDistance(r1, g1, b1, r2, g2, b2) {
        return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
    }

    isBodyPixel(imageData, x, y, width) {
        // Check if this pixel is part of a thick body (not just a thin wick)
        const thickness = 3; // Minimum thickness for body detection
        let thickPixelCount = 0;

        for (let dx = -thickness; dx <= thickness; dx++) {
            const checkX = x + dx;
            if (checkX >= 0 && checkX < width) {
                const pixelIndex = (y * width + checkX) * 4;
                const r = imageData.data[pixelIndex];
                const g = imageData.data[pixelIndex + 1];
                const b = imageData.data[pixelIndex + 2];
                const a = imageData.data[pixelIndex + 3];

                if (a > 100 && (this.isBullishColor(r, g, b) || this.isBearishColor(r, g, b))) {
                    thickPixelCount++;
                }
            }
        }

        return thickPixelCount >= thickness;
    }

    estimateCandleWidth(chartWidth, timeAxis) {
        if (timeAxis && timeAxis.positions.length > 1) {
            // Calculate average distance between time markers
            const distances = [];
            for (let i = 1; i < timeAxis.positions.length; i++) {
                distances.push(timeAxis.positions[i] - timeAxis.positions[i - 1]);
            }
            return distances.reduce((sum, d) => sum + d, 0) / distances.length;
        }
        
        // Default estimate: assume 50-100 candles on screen
        return chartWidth / 75;
    }

    estimateTimestamp(x, chartBounds, timeAxis) {
        if (timeAxis && timeAxis.timestamps.length > 0 && timeAxis.positions.length > 0) {
            // Interpolate timestamp based on position
            const relativeX = (x - chartBounds.x) / chartBounds.width;
            const timeRange = timeAxis.timestamps[timeAxis.timestamps.length - 1] - timeAxis.timestamps[0];
            return timeAxis.timestamps[0] + (relativeX * timeRange);
        }
        
        // Fallback: use current time minus estimated offset
        const relativeX = (x - chartBounds.x) / chartBounds.width;
        const estimatedMinutesAgo = (1 - relativeX) * 60; // Assume 1-hour chart
        return Date.now() - (estimatedMinutesAgo * 60 * 1000);
    }

    async detectPriceNumbers(canvas, searchArea) {
        // Simplified price detection - would need OCR for full implementation
        const detectedPrices = [];
        
        // This is a placeholder - real implementation would need:
        // 1. OCR library integration
        // 2. Number pattern recognition
        // 3. Price format detection
        
        console.log('[Canvas Parser] Price number detection not fully implemented');
        return detectedPrices;
    }

    async detectTimeStamps(canvas, searchArea) {
        // Simplified time detection - would need OCR for full implementation
        const detectedTimes = [];
        
        // This is a placeholder - real implementation would need:
        // 1. OCR library integration
        // 2. Time pattern recognition
        // 3. Time format detection
        
        console.log('[Canvas Parser] Timestamp detection not fully implemented');
        return detectedTimes;
    }

    validateAndCleanCandles(candles) {
        return candles.filter(candle => {
            // Basic validation
            if (!candle.open || !candle.high || !candle.low || !candle.close) {
                return false;
            }
            
            // OHLC relationship validation
            if (candle.high < Math.max(candle.open, candle.close) ||
                candle.low > Math.min(candle.open, candle.close)) {
                return false;
            }
            
            // Reasonable price range
            const priceRange = candle.high - candle.low;
            const avgPrice = (candle.open + candle.close) / 2;
            if (priceRange > avgPrice * 0.1) { // 10% range seems too much
                return false;
            }
            
            return true;
        });
    }

    // Cache management
    generateCanvasKey(canvas) {
        return `${canvas.width}x${canvas.height}_${Date.now()}`;
    }

    isImageDataSimilar(imageData1, imageData2, threshold = 0.95) {
        if (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height) {
            return false;
        }
        
        const data1 = imageData1.data;
        const data2 = imageData2.data;
        let similarPixels = 0;
        const totalPixels = data1.length / 4;
        
        for (let i = 0; i < data1.length; i += 4) {
            const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
            const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
            
            if (this.colorDistance(r1, g1, b1, r2, g2, b2) < 20) {
                similarPixels++;
            }
        }
        
        return (similarPixels / totalPixels) >= threshold;
    }

    cleanCache() {
        const maxAge = 60000; // 1 minute
        const now = Date.now();
        
        for (const [key, entry] of this.canvasCache.entries()) {
            if (now - entry.timestamp > maxAge) {
                this.canvasCache.delete(key);
            }
        }
    }

    // Debug methods
    enableDebug() {
        this.debugMode = true;
    }

    drawDebugOverlay(canvas, analysis) {
        if (!this.debugMode || !analysis) return;
        
        const ctx = canvas.getContext('2d');
        ctx.save();
        
        // Draw chart bounds
        if (analysis.chartBounds) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                analysis.chartBounds.x,
                analysis.chartBounds.y,
                analysis.chartBounds.width,
                analysis.chartBounds.height
            );
        }
        
        // Draw detected candles
        if (analysis.candles) {
            analysis.candles.forEach((candle, index) => {
                ctx.fillStyle = candle.isBullish ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
                ctx.fillRect(candle.x - 5, candle.y - 10, 10, 20);
                
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.fillText(index.toString(), candle.x - 3, candle.y - 12);
            });
        }
        
        ctx.restore();
    }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasChartParser;
} else if (typeof window !== 'undefined') {
    window.CanvasChartParser = CanvasChartParser;
}