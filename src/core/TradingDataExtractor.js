/**
 * Trading Data Extraction Utilities
 * 
 * Helper methods for extracting specific trading data from OCR text
 */

class TradingDataExtractor {
    constructor() {
        // Currency pair patterns
        this.currencyPairPatterns = [
            /([A-Z]{3})[\/\-_]([A-Z]{3})/g,
            /(EUR|USD|GBP|JPY|AUD|CAD|CHF|NZD|BRL|MXN|ZAR)(USD|EUR|GBP|JPY|AUD|CAD|CHF|NZD|BRL|MXN|ZAR)/g,
            /(BITCOIN|BTC|ETHEREUM|ETH|LITECOIN|LTC)(USD|EUR|GBP)/gi
        ];
        
        // Price patterns
        this.pricePatterns = [
            /\b\d{1,2}\.\d{4,5}\b/g,  // Forex prices (e.g., 1.2345)
            /\b\d{1,6}\.\d{2,8}\b/g,  // Crypto prices
            /\b\d+,\d{3}\.\d{2,5}\b/g // Formatted prices
        ];
        
        // Timeframe patterns
        this.timeframePatterns = [
            /\b(1|5|15|30)m\b/gi,     // Minutes
            /\b(1|4|12)h\b/gi,        // Hours
            /\b(1|7)d\b/gi,           // Days
            /\b(1|4)w\b/gi,           // Weeks
            /\b1M\b/g                 // Month
        ];
        
        // Indicator patterns
        this.indicatorPatterns = {
            rsi: /RSI[:\s]*(\d{1,3}\.?\d*)/gi,
            macd: /MACD[:\s]*(-?\d+\.?\d*)/gi,
            ema: /EMA[:\s]*(\d+\.?\d*)/gi,
            sma: /SMA[:\s]*(\d+\.?\d*)/gi,
            stochastic: /STOCH[:\s]*(\d{1,3}\.?\d*)/gi,
            bollinger: /BB[:\s]*(\d+\.?\d*)/gi
        };
        
        // Platform detection patterns
        this.platformPatterns = {
            'MetaTrader 4': /MT4|MetaTrader\s*4/gi,
            'MetaTrader 5': /MT5|MetaTrader\s*5/gi,
            'TradingView': /TradingView|tradingview\.com/gi,
            'QXBroker': /QXBroker|qxbroker/gi,
            'Quotex': /Quotex/gi,
            'PocketOption': /PocketOption|Pocket\s*Option/gi,
            'IQ Option': /IQ\s*Option/gi,
            'Binance': /Binance/gi,
            'Coinbase': /Coinbase/gi
        };
    }

    /**
     * Extract currency pair from text
     */
    extractCurrencyPair(allText, textExtractions) {
        // Check header region first (highest priority)
        if (textExtractions.header && textExtractions.header.text) {
            const headerPair = this.findCurrencyPairInText(textExtractions.header.text);
            if (headerPair) return headerPair;
        }
        
        // Check all text as fallback
        return this.findCurrencyPairInText(allText);
    }

    /**
     * Find currency pair in specific text
     */
    findCurrencyPairInText(text) {
        for (const pattern of this.currencyPairPatterns) {
            const matches = [...text.matchAll(pattern)];
            if (matches.length > 0) {
                const match = matches[0];
                if (match.length >= 3) {
                    return `${match[1]}/${match[2]}`;
                } else if (match.length === 2) {
                    // Handle patterns like EURUSD
                    const pair = match[1];
                    if (pair.length === 6) {
                        return `${pair.substring(0, 3)}/${pair.substring(3, 6)}`;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Extract current price from text
     */
    extractCurrentPrice(allText, textExtractions) {
        // Check header region first
        if (textExtractions.header && textExtractions.header.text) {
            const headerPrice = this.findPriceInText(textExtractions.header.text);
            if (headerPrice) return headerPrice;
        }
        
        // Check price axis
        if (textExtractions.priceAxis && textExtractions.priceAxis.text) {
            const prices = this.findAllPricesInText(textExtractions.priceAxis.text);
            if (prices.length > 0) {
                // Return the most prominent price (usually the largest or most recent)
                return prices.sort((a, b) => b.confidence - a.confidence)[0].value;
            }
        }
        
        return this.findPriceInText(allText);
    }

    /**
     * Find price in specific text
     */
    findPriceInText(text) {
        for (const pattern of this.pricePatterns) {
            const matches = [...text.matchAll(pattern)];
            if (matches.length > 0) {
                // Return the first valid price found
                const priceStr = matches[0][0].replace(/,/g, '');
                const price = parseFloat(priceStr);
                if (!isNaN(price) && price > 0) {
                    return price;
                }
            }
        }
        return null;
    }

    /**
     * Find all prices in text with confidence scores
     */
    findAllPricesInText(text) {
        const prices = [];
        
        for (const pattern of this.pricePatterns) {
            const matches = [...text.matchAll(pattern)];
            matches.forEach(match => {
                const priceStr = match[0].replace(/,/g, '');
                const price = parseFloat(priceStr);
                if (!isNaN(price) && price > 0) {
                    prices.push({
                        value: price,
                        text: match[0],
                        index: match.index,
                        confidence: this.calculatePriceConfidence(match[0], text)
                    });
                }
            });
        }
        
        return prices.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Calculate confidence score for a price match
     */
    calculatePriceConfidence(priceText, context) {
        let confidence = 50; // Base confidence
        
        // Check decimal places (forex typically has 4-5)
        const decimalPlaces = (priceText.split('.')[1] || '').length;
        if (decimalPlaces >= 4 && decimalPlaces <= 5) confidence += 20;
        else if (decimalPlaces >= 2 && decimalPlaces <= 3) confidence += 10;
        
        // Check if near currency-related keywords
        const nearbyText = context.substring(
            Math.max(0, context.indexOf(priceText) - 20),
            Math.min(context.length, context.indexOf(priceText) + priceText.length + 20)
        ).toLowerCase();
        
        if (nearbyText.includes('price') || nearbyText.includes('current')) confidence += 15;
        if (nearbyText.includes('bid') || nearbyText.includes('ask')) confidence += 10;
        
        return Math.min(confidence, 100);
    }

    /**
     * Extract timeframe from text
     */
    extractTimeframe(allText, textExtractions) {
        // Check header region first
        if (textExtractions.header && textExtractions.header.text) {
            const headerTimeframe = this.findTimeframeInText(textExtractions.header.text);
            if (headerTimeframe) return headerTimeframe;
        }
        
        return this.findTimeframeInText(allText);
    }

    /**
     * Find timeframe in specific text
     */
    findTimeframeInText(text) {
        for (const pattern of this.timeframePatterns) {
            const matches = [...text.matchAll(pattern)];
            if (matches.length > 0) {
                return matches[0][0].toLowerCase();
            }
        }
        return null;
    }

    /**
     * Extract price levels from text extractions
     */
    extractPriceLevels(textExtractions) {
        const priceLevels = [];
        
        // Extract from price axis
        if (textExtractions.priceAxis && textExtractions.priceAxis.text) {
            const prices = this.findAllPricesInText(textExtractions.priceAxis.text);
            prices.forEach(price => {
                priceLevels.push({
                    value: price.value,
                    type: 'axis_level',
                    confidence: price.confidence,
                    source: 'priceAxis'
                });
            });
        }
        
        return priceLevels.sort((a, b) => b.value - a.value);
    }

    /**
     * Extract timestamps from text extractions
     */
    extractTimestamps(textExtractions) {
        const timestamps = [];
        
        if (textExtractions.timeAxis && textExtractions.timeAxis.text) {
            // Simple timestamp extraction - can be enhanced
            const timePattern = /\b\d{1,2}:\d{2}\b/g;
            const matches = [...textExtractions.timeAxis.text.matchAll(timePattern)];
            
            matches.forEach(match => {
                timestamps.push({
                    time: match[0],
                    source: 'timeAxis',
                    confidence: 70
                });
            });
        }
        
        return timestamps;
    }

    /**
     * Extract indicator values from text extractions
     */
    extractIndicatorValues(textExtractions) {
        const indicators = {};
        
        // Check indicator panel
        if (textExtractions.indicatorPanel && textExtractions.indicatorPanel.text) {
            const text = textExtractions.indicatorPanel.text;
            
            Object.entries(this.indicatorPatterns).forEach(([indicator, pattern]) => {
                const matches = [...text.matchAll(pattern)];
                if (matches.length > 0) {
                    const value = parseFloat(matches[0][1]);
                    if (!isNaN(value)) {
                        indicators[indicator] = {
                            value: value,
                            confidence: 75,
                            source: 'indicatorPanel'
                        };
                    }
                }
            });
        }
        
        return indicators;
    }

    /**
     * Detect trading platform from text
     */
    detectTradingPlatform(allText) {
        for (const [platform, pattern] of Object.entries(this.platformPatterns)) {
            if (pattern.test(allText)) {
                return platform;
            }
        }
        return 'Unknown';
    }

    /**
     * Calculate confidence for trading data
     */
    calculateTradingDataConfidence(tradingData, textExtractions) {
        let confidence = 0;
        let factors = 0;
        
        // Currency pair confidence
        if (tradingData.currencyPair) {
            confidence += 25;
            factors++;
        }
        
        // Current price confidence
        if (tradingData.currentPrice) {
            confidence += 25;
            factors++;
        }
        
        // Timeframe confidence
        if (tradingData.timeframe) {
            confidence += 15;
            factors++;
        }
        
        // Platform detection confidence
        if (tradingData.platform && tradingData.platform !== 'Unknown') {
            confidence += 15;
            factors++;
        }
        
        // Indicator values confidence
        const indicatorCount = Object.keys(tradingData.indicators).length;
        if (indicatorCount > 0) {
            confidence += Math.min(indicatorCount * 5, 20);
            factors++;
        }
        
        // OCR quality factor
        const avgOcrConfidence = Object.values(textExtractions)
            .filter(e => e.success)
            .reduce((sum, e, _, arr) => sum + e.confidence / arr.length, 0);
        
        if (avgOcrConfidence > 0) {
            confidence = confidence * (avgOcrConfidence / 100);
        }
        
        return factors > 0 ? Math.min(confidence, 100) : 0;
    }
}

module.exports = { TradingDataExtractor };
