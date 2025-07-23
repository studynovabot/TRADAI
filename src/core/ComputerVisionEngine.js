/**
 * Computer Vision Engine for Trading Chart Analysis
 * 
 * Advanced computer vision for candlestick detection, pattern recognition,
 * and support/resistance level identification.
 */

const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');

class ComputerVisionEngine {
    constructor(config = {}) {
        this.config = {
            // Candlestick detection settings
            minCandleWidth: config.minCandleWidth || 3,
            maxCandleWidth: config.maxCandleWidth || 50,
            minCandleHeight: config.minCandleHeight || 5,
            candleColorThreshold: config.candleColorThreshold || 30,
            
            // Pattern recognition settings
            patternConfidenceThreshold: config.patternConfidenceThreshold || 0.7,
            supportResistanceMinTouches: config.supportResistanceMinTouches || 3,
            supportResistanceTolerancePercent: config.supportResistanceTolerancePercent || 0.1,
            
            // Color detection settings
            bullishColors: config.bullishColors || [
                { r: 0, g: 255, b: 0 },    // Green
                { r: 0, g: 200, b: 0 },    // Dark Green
                { r: 50, g: 255, b: 50 }   // Light Green
            ],
            bearishColors: config.bearishColors || [
                { r: 255, g: 0, b: 0 },    // Red
                { r: 200, g: 0, b: 0 },    // Dark Red
                { r: 255, g: 50, b: 50 }   // Light Red
            ],
            
            ...config
        };
        
        this.analysisHistory = [];
    }

    /**
     * Extract chart data from preprocessed image
     */
    async extractChartData(imageBuffer, regions) {
        console.log('👁️ Starting computer vision analysis...');
        
        const startTime = Date.now();
        const analysisId = `cv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Focus on chart area
            const chartRegion = regions.chartArea;
            const chartBuffer = await this.extractChartRegion(imageBuffer, chartRegion);
            
            // Detect candlesticks
            const candlesticks = await this.detectCandlesticks(chartBuffer, chartRegion);
            
            // Detect patterns
            const patterns = await this.detectChartPatterns(candlesticks, chartBuffer);
            
            // Detect support and resistance levels
            const supportResistance = await this.detectSupportResistanceLevels(candlesticks, chartRegion);
            
            // Analyze trend direction
            const trendAnalysis = await this.analyzeTrendDirection(candlesticks);
            
            // Extract indicator visual data
            const indicatorData = await this.extractIndicatorVisualData(imageBuffer, regions);
            
            const processingTime = Date.now() - startTime;
            
            const result = {
                analysisId,
                success: true,
                processingTime,
                candlesticks: candlesticks,
                patterns: patterns,
                supportResistance: supportResistance,
                trendAnalysis: trendAnalysis,
                indicatorData: indicatorData,
                confidence: this.calculateVisionConfidence(candlesticks, patterns, supportResistance),
                metadata: {
                    candlestickCount: candlesticks.length,
                    patternCount: patterns.length,
                    supportLevels: supportResistance.support.length,
                    resistanceLevels: supportResistance.resistance.length
                },
                timestamp: new Date().toISOString()
            };
            
            // Store analysis history
            this.analysisHistory.push({
                analysisId,
                timestamp: result.timestamp,
                processingTime,
                confidence: result.confidence,
                success: true
            });
            
            console.log(`✅ Computer vision analysis completed in ${processingTime}ms with ${result.confidence.toFixed(1)}% confidence`);
            
            return result;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            
            console.error('❌ Computer vision analysis failed:', error.message);
            
            return {
                analysisId,
                success: false,
                error: error.message,
                processingTime,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Extract chart region from full image
     */
    async extractChartRegion(imageBuffer, chartRegion) {
        return await sharp(imageBuffer)
            .extract({
                left: chartRegion.x,
                top: chartRegion.y,
                width: chartRegion.width,
                height: chartRegion.height
            })
            .png()
            .toBuffer();
    }

    /**
     * Detect candlesticks in chart image
     */
    async detectCandlesticks(chartBuffer, chartRegion) {
        console.log('🕯️ Detecting candlesticks...');
        
        try {
            // Convert image to canvas for pixel analysis
            const image = await loadImage(chartBuffer);
            const canvas = createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            const candlesticks = [];
            
            // Scan for vertical structures (candlestick bodies and wicks)
            const scanWidth = Math.max(1, Math.floor(canvas.width / 100)); // Adaptive scanning
            
            for (let x = 0; x < canvas.width; x += scanWidth) {
                const candlestick = this.detectCandlestickAtColumn(pixels, canvas.width, canvas.height, x);
                if (candlestick) {
                    // Convert relative coordinates to absolute
                    candlestick.x += chartRegion.x;
                    candlestick.high += chartRegion.y;
                    candlestick.low += chartRegion.y;
                    candlestick.open += chartRegion.y;
                    candlestick.close += chartRegion.y;
                    
                    candlesticks.push(candlestick);
                }
            }
            
            // Filter and validate candlesticks
            const validCandlesticks = this.filterValidCandlesticks(candlesticks);
            
            console.log(`   🕯️ Detected ${validCandlesticks.length} candlesticks`);
            
            return validCandlesticks;
            
        } catch (error) {
            console.error('❌ Candlestick detection failed:', error.message);
            return [];
        }
    }

    /**
     * Detect candlestick at specific column
     */
    detectCandlestickAtColumn(pixels, width, height, x) {
        const column = [];
        
        // Extract column pixels
        for (let y = 0; y < height; y++) {
            const pixelIndex = (y * width + x) * 4;
            const r = pixels[pixelIndex];
            const g = pixels[pixelIndex + 1];
            const b = pixels[pixelIndex + 2];
            const a = pixels[pixelIndex + 3];
            
            column.push({ r, g, b, a, y });
        }
        
        // Find colored pixels (potential candlestick parts)
        const coloredPixels = column.filter(pixel => 
            this.isSignificantColor(pixel) && pixel.a > 200
        );
        
        if (coloredPixels.length < this.config.minCandleHeight) {
            return null;
        }
        
        // Determine candlestick type and boundaries
        const isBullish = this.isBullishColor(coloredPixels[0]);
        const high = Math.min(...coloredPixels.map(p => p.y));
        const low = Math.max(...coloredPixels.map(p => p.y));
        
        // Estimate open and close based on color distribution
        const bodyPixels = coloredPixels.filter(p => this.isBodyColor(p, isBullish));
        const open = isBullish ? Math.max(...bodyPixels.map(p => p.y)) : Math.min(...bodyPixels.map(p => p.y));
        const close = isBullish ? Math.min(...bodyPixels.map(p => p.y)) : Math.max(...bodyPixels.map(p => p.y));
        
        return {
            x: x,
            high: high,
            low: low,
            open: open,
            close: close,
            isBullish: isBullish,
            bodySize: Math.abs(close - open),
            wickSize: (high - Math.min(open, close)) + (Math.max(open, close) - low),
            confidence: this.calculateCandlestickConfidence(coloredPixels, bodyPixels)
        };
    }

    /**
     * Check if pixel color is significant (not background)
     */
    isSignificantColor(pixel) {
        const { r, g, b } = pixel;
        
        // Check if it's close to bullish or bearish colors
        const isBullish = this.config.bullishColors.some(color => 
            this.colorDistance(pixel, color) < this.config.candleColorThreshold
        );
        
        const isBearish = this.config.bearishColors.some(color => 
            this.colorDistance(pixel, color) < this.config.candleColorThreshold
        );
        
        return isBullish || isBearish || (r + g + b < 600); // Include dark colors
    }

    /**
     * Check if color is bullish
     */
    isBullishColor(pixel) {
        return this.config.bullishColors.some(color => 
            this.colorDistance(pixel, color) < this.config.candleColorThreshold
        );
    }

    /**
     * Check if pixel is part of candlestick body
     */
    isBodyColor(pixel, isBullish) {
        if (isBullish) {
            return this.isBullishColor(pixel);
        } else {
            return this.config.bearishColors.some(color => 
                this.colorDistance(pixel, color) < this.config.candleColorThreshold
            );
        }
    }

    /**
     * Calculate color distance
     */
    colorDistance(color1, color2) {
        return Math.sqrt(
            Math.pow(color1.r - color2.r, 2) +
            Math.pow(color1.g - color2.g, 2) +
            Math.pow(color1.b - color2.b, 2)
        );
    }

    /**
     * Calculate candlestick detection confidence
     */
    calculateCandlestickConfidence(coloredPixels, bodyPixels) {
        let confidence = 50; // Base confidence
        
        // More colored pixels = higher confidence
        if (coloredPixels.length > 10) confidence += 20;
        else if (coloredPixels.length > 5) confidence += 10;
        
        // Clear body definition = higher confidence
        if (bodyPixels.length > coloredPixels.length * 0.3) confidence += 20;
        
        // Reasonable proportions = higher confidence
        const bodyRatio = bodyPixels.length / coloredPixels.length;
        if (bodyRatio > 0.2 && bodyRatio < 0.8) confidence += 10;
        
        return Math.min(confidence, 100);
    }

    /**
     * Filter valid candlesticks
     */
    filterValidCandlesticks(candlesticks) {
        return candlesticks.filter(candle => {
            // Filter by size constraints
            if (candle.bodySize < this.config.minCandleHeight) return false;
            if (candle.bodySize > 200) return false; // Unreasonably large
            
            // Filter by confidence
            if (candle.confidence < 50) return false;
            
            return true;
        }).sort((a, b) => a.x - b.x); // Sort by x position
    }

    /**
     * Calculate overall computer vision confidence
     */
    calculateVisionConfidence(candlesticks, patterns, supportResistance) {
        let confidence = 0;
        let factors = 0;
        
        // Candlestick detection confidence
        if (candlesticks.length > 0) {
            const avgCandleConfidence = candlesticks.reduce((sum, c) => sum + c.confidence, 0) / candlesticks.length;
            confidence += avgCandleConfidence * 0.4;
            factors += 0.4;
        }
        
        // Pattern detection confidence
        if (patterns.length > 0) {
            const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
            confidence += avgPatternConfidence * 0.3;
            factors += 0.3;
        }
        
        // Support/Resistance confidence
        const totalLevels = supportResistance.support.length + supportResistance.resistance.length;
        if (totalLevels > 0) {
            confidence += Math.min(totalLevels * 10, 30);
            factors += 0.3;
        }
        
        return factors > 0 ? confidence / factors : 0;
    }
}

    /**
     * Detect chart patterns from candlestick data
     */
    async detectChartPatterns(candlesticks, chartBuffer) {
        console.log('📊 Detecting chart patterns...');

        if (candlesticks.length < 3) {
            return [];
        }

        const patterns = [];

        try {
            // Detect single candlestick patterns
            patterns.push(...this.detectSingleCandlestickPatterns(candlesticks));

            // Detect multi-candlestick patterns
            patterns.push(...this.detectMultiCandlestickPatterns(candlesticks));

            // Detect chart formations
            patterns.push(...this.detectChartFormations(candlesticks));

            console.log(`   📊 Detected ${patterns.length} chart patterns`);

            return patterns.filter(p => p.confidence >= this.config.patternConfidenceThreshold * 100);

        } catch (error) {
            console.error('❌ Pattern detection failed:', error.message);
            return [];
        }
    }

    /**
     * Detect single candlestick patterns
     */
    detectSingleCandlestickPatterns(candlesticks) {
        const patterns = [];

        candlesticks.forEach((candle, index) => {
            // Doji pattern
            if (this.isDoji(candle)) {
                patterns.push({
                    type: 'doji',
                    name: 'Doji',
                    position: index,
                    candles: [candle],
                    confidence: 85,
                    signal: 'reversal',
                    description: 'Indecision pattern indicating potential reversal'
                });
            }

            // Hammer pattern
            if (this.isHammer(candle)) {
                patterns.push({
                    type: 'hammer',
                    name: 'Hammer',
                    position: index,
                    candles: [candle],
                    confidence: 80,
                    signal: 'bullish_reversal',
                    description: 'Bullish reversal pattern with long lower wick'
                });
            }

            // Shooting star pattern
            if (this.isShootingStar(candle)) {
                patterns.push({
                    type: 'shooting_star',
                    name: 'Shooting Star',
                    position: index,
                    candles: [candle],
                    confidence: 80,
                    signal: 'bearish_reversal',
                    description: 'Bearish reversal pattern with long upper wick'
                });
            }
        });

        return patterns;
    }

    /**
     * Detect multi-candlestick patterns
     */
    detectMultiCandlestickPatterns(candlesticks) {
        const patterns = [];

        for (let i = 0; i < candlesticks.length - 1; i++) {
            // Engulfing patterns
            if (i < candlesticks.length - 1) {
                const engulfing = this.detectEngulfingPattern(candlesticks[i], candlesticks[i + 1]);
                if (engulfing) {
                    patterns.push({
                        ...engulfing,
                        position: i,
                        candles: [candlesticks[i], candlesticks[i + 1]]
                    });
                }
            }

            // Three-candle patterns
            if (i < candlesticks.length - 2) {
                const morningEvening = this.detectMorningEveningStar(
                    candlesticks[i],
                    candlesticks[i + 1],
                    candlesticks[i + 2]
                );
                if (morningEvening) {
                    patterns.push({
                        ...morningEvening,
                        position: i,
                        candles: [candlesticks[i], candlesticks[i + 1], candlesticks[i + 2]]
                    });
                }
            }
        }

        return patterns;
    }

    /**
     * Detect chart formations (triangles, wedges, etc.)
     */
    detectChartFormations(candlesticks) {
        const patterns = [];

        if (candlesticks.length < 10) return patterns;

        // Detect triangle patterns
        const triangle = this.detectTrianglePattern(candlesticks);
        if (triangle) patterns.push(triangle);

        // Detect wedge patterns
        const wedge = this.detectWedgePattern(candlesticks);
        if (wedge) patterns.push(wedge);

        // Detect double top/bottom
        const doublePattern = this.detectDoubleTopBottom(candlesticks);
        if (doublePattern) patterns.push(doublePattern);

        return patterns;
    }

    /**
     * Check if candlestick is a Doji
     */
    isDoji(candle) {
        const bodySize = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;

        // Body should be very small relative to total range
        return totalRange > 0 && (bodySize / totalRange) < 0.1;
    }

    /**
     * Check if candlestick is a Hammer
     */
    isHammer(candle) {
        const bodySize = Math.abs(candle.close - candle.open);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        const upperWick = candle.high - Math.max(candle.open, candle.close);

        // Long lower wick, small body, small upper wick
        return lowerWick > bodySize * 2 && upperWick < bodySize * 0.5;
    }

    /**
     * Check if candlestick is a Shooting Star
     */
    isShootingStar(candle) {
        const bodySize = Math.abs(candle.close - candle.open);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        const upperWick = candle.high - Math.max(candle.open, candle.close);

        // Long upper wick, small body, small lower wick
        return upperWick > bodySize * 2 && lowerWick < bodySize * 0.5;
    }

    /**
     * Detect engulfing patterns
     */
    detectEngulfingPattern(candle1, candle2) {
        const body1Size = Math.abs(candle1.close - candle1.open);
        const body2Size = Math.abs(candle2.close - candle2.open);

        // Second candle should engulf the first
        if (body2Size <= body1Size) return null;

        const candle1Top = Math.max(candle1.open, candle1.close);
        const candle1Bottom = Math.min(candle1.open, candle1.close);
        const candle2Top = Math.max(candle2.open, candle2.close);
        const candle2Bottom = Math.min(candle2.open, candle2.close);

        // Bullish engulfing
        if (!candle1.isBullish && candle2.isBullish &&
            candle2Bottom < candle1Bottom && candle2Top > candle1Top) {
            return {
                type: 'bullish_engulfing',
                name: 'Bullish Engulfing',
                confidence: 85,
                signal: 'bullish_reversal',
                description: 'Bullish reversal pattern where second candle engulfs the first'
            };
        }

        // Bearish engulfing
        if (candle1.isBullish && !candle2.isBullish &&
            candle2Bottom < candle1Bottom && candle2Top > candle1Top) {
            return {
                type: 'bearish_engulfing',
                name: 'Bearish Engulfing',
                confidence: 85,
                signal: 'bearish_reversal',
                description: 'Bearish reversal pattern where second candle engulfs the first'
            };
        }

        return null;
    }

    /**
     * Detect support and resistance levels
     */
    async detectSupportResistanceLevels(candlesticks, chartRegion) {
        console.log('📈 Detecting support and resistance levels...');

        if (candlesticks.length < 5) {
            return { support: [], resistance: [] };
        }

        try {
            // Extract price levels
            const highs = candlesticks.map(c => c.high);
            const lows = candlesticks.map(c => c.low);

            // Detect resistance levels (from highs)
            const resistanceLevels = this.findSignificantLevels(highs, 'resistance');

            // Detect support levels (from lows)
            const supportLevels = this.findSignificantLevels(lows, 'support');

            console.log(`   📈 Found ${supportLevels.length} support and ${resistanceLevels.length} resistance levels`);

            return {
                support: supportLevels,
                resistance: resistanceLevels
            };

        } catch (error) {
            console.error('❌ Support/Resistance detection failed:', error.message);
            return { support: [], resistance: [] };
        }
    }

    /**
     * Find significant price levels
     */
    findSignificantLevels(prices, type) {
        const levels = [];
        const tolerance = this.calculateTolerance(prices);

        // Group similar prices
        const priceGroups = this.groupSimilarPrices(prices, tolerance);

        // Filter groups with minimum touches
        priceGroups.forEach(group => {
            if (group.prices.length >= this.config.supportResistanceMinTouches) {
                const avgPrice = group.prices.reduce((sum, p) => sum + p, 0) / group.prices.length;

                levels.push({
                    price: avgPrice,
                    touches: group.prices.length,
                    strength: this.calculateLevelStrength(group.prices.length),
                    type: type,
                    confidence: Math.min(group.prices.length * 20, 100)
                });
            }
        });

        return levels.sort((a, b) => b.strength - a.strength);
    }

    /**
     * Calculate price tolerance for grouping
     */
    calculateTolerance(prices) {
        const priceRange = Math.max(...prices) - Math.min(...prices);
        return priceRange * (this.config.supportResistanceTolerancePercent / 100);
    }

    /**
     * Group similar prices within tolerance
     */
    groupSimilarPrices(prices, tolerance) {
        const groups = [];
        const used = new Set();

        prices.forEach((price, index) => {
            if (used.has(index)) return;

            const group = { prices: [price], indices: [index] };
            used.add(index);

            // Find similar prices
            prices.forEach((otherPrice, otherIndex) => {
                if (used.has(otherIndex)) return;

                if (Math.abs(price - otherPrice) <= tolerance) {
                    group.prices.push(otherPrice);
                    group.indices.push(otherIndex);
                    used.add(otherIndex);
                }
            });

            groups.push(group);
        });

        return groups;
    }

    /**
     * Calculate level strength based on touches
     */
    calculateLevelStrength(touches) {
        if (touches >= 5) return 'very_strong';
        if (touches >= 4) return 'strong';
        if (touches >= 3) return 'moderate';
        return 'weak';
    }

    /**
     * Analyze trend direction
     */
    async analyzeTrendDirection(candlesticks) {
        if (candlesticks.length < 5) {
            return { direction: 'unknown', strength: 0, confidence: 0 };
        }

        // Calculate moving averages
        const closes = candlesticks.map(c => c.close);
        const shortMA = this.calculateMovingAverage(closes.slice(-5), 5);
        const longMA = this.calculateMovingAverage(closes.slice(-10), 10);

        // Determine trend direction
        let direction = 'sideways';
        let strength = 0;

        if (shortMA > longMA) {
            direction = 'uptrend';
            strength = ((shortMA - longMA) / longMA) * 100;
        } else if (shortMA < longMA) {
            direction = 'downtrend';
            strength = ((longMA - shortMA) / longMA) * 100;
        }

        // Calculate confidence based on consistency
        const recentTrend = this.calculateTrendConsistency(closes.slice(-10));

        return {
            direction: direction,
            strength: Math.abs(strength),
            confidence: recentTrend,
            shortMA: shortMA,
            longMA: longMA
        };
    }

    /**
     * Calculate moving average
     */
    calculateMovingAverage(values, period) {
        if (values.length < period) return values[values.length - 1] || 0;

        const sum = values.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    }

    /**
     * Calculate trend consistency
     */
    calculateTrendConsistency(prices) {
        if (prices.length < 3) return 0;

        let upMoves = 0;
        let downMoves = 0;

        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) upMoves++;
            else if (prices[i] < prices[i - 1]) downMoves++;
        }

        const totalMoves = upMoves + downMoves;
        if (totalMoves === 0) return 0;

        const dominantMoves = Math.max(upMoves, downMoves);
        return (dominantMoves / totalMoves) * 100;
    }

    /**
     * Extract indicator visual data (placeholder for future enhancement)
     */
    async extractIndicatorVisualData(imageBuffer, regions) {
        // This would analyze indicator panels for visual patterns
        // For now, return empty structure
        return {
            rsi: { level: null, trend: null },
            macd: { signal: null, histogram: null },
            stochastic: { k: null, d: null },
            volume: { trend: null, spikes: [] }
        };
    }
}

module.exports = { ComputerVisionEngine };
