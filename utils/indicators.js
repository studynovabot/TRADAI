/**
 * AI Candle Sniper - Technical Indicators Library
 * Professional trading indicators for binary options analysis
 */

class TechnicalIndicators {
    constructor() {
        this.precision = 8; // Decimal precision for calculations
    }

    /**
     * Calculate Relative Strength Index (RSI)
     * @param {Array} data - Array of OHLCV candles
     * @param {number} period - RSI period (default: 14)
     * @returns {number} RSI value
     */
    calculateRSI(data, period = 14) {
        if (!data || data.length < period + 1) {
            return null;
        }

        const closes = data.map(candle => candle.close);
        const changes = [];
        
        // Calculate price changes
        for (let i = 1; i < closes.length; i++) {
            changes.push(closes[i] - closes[i - 1]);
        }

        // Calculate initial average gains and losses
        let gains = 0;
        let losses = 0;
        
        for (let i = 0; i < period; i++) {
            const change = changes[i];
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        // Calculate RSI using smoothed averages
        for (let i = period; i < changes.length; i++) {
            const change = changes[i];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        return parseFloat((100 - (100 / (1 + rs))).toFixed(this.precision));
    }

    /**
     * Calculate Exponential Moving Average (EMA)
     * @param {Array} data - Array of OHLCV candles
     * @param {number} period - EMA period
     * @returns {number} EMA value
     */
    calculateEMA(data, period) {
        if (!data || data.length < period) {
            return null;
        }

        const closes = data.map(candle => candle.close);
        const multiplier = 2 / (period + 1);
        
        // Calculate initial SMA
        let ema = closes.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
        
        // Calculate EMA
        for (let i = period; i < closes.length; i++) {
            ema = (closes[i] * multiplier) + (ema * (1 - multiplier));
        }

        return parseFloat(ema.toFixed(this.precision));
    }

    /**
     * Calculate Simple Moving Average (SMA)
     * @param {Array} data - Array of OHLCV candles
     * @param {number} period - SMA period
     * @returns {number} SMA value
     */
    calculateSMA(data, period) {
        if (!data || data.length < period) {
            return null;
        }

        const closes = data.slice(-period).map(candle => candle.close);
        const sum = closes.reduce((total, price) => total + price, 0);
        
        return parseFloat((sum / period).toFixed(this.precision));
    }

    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     * @param {Array} data - Array of OHLCV candles
     * @param {number} fastPeriod - Fast EMA period (default: 12)
     * @param {number} slowPeriod - Slow EMA period (default: 26)
     * @param {number} signalPeriod - Signal line period (default: 9)
     * @returns {Object} MACD values
     */
    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (!data || data.length < slowPeriod) {
            return null;
        }

        // Calculate EMAs
        const fastEMA = this.calculateEMA(data, fastPeriod);
        const slowEMA = this.calculateEMA(data, slowPeriod);
        
        if (!fastEMA || !slowEMA) return null;

        const macdLine = fastEMA - slowEMA;
        
        // Calculate signal line (EMA of MACD line)
        // For this simplified version, we'll return the MACD line
        // Full implementation would require historical MACD values for signal calculation
        
        return {
            macd: parseFloat(macdLine.toFixed(this.precision)),
            signal: null, // Would need historical data
            histogram: null // macd - signal
        };
    }

    /**
     * Calculate Bollinger Bands
     * @param {Array} data - Array of OHLCV candles
     * @param {number} period - Period for moving average (default: 20)
     * @param {number} stdDev - Standard deviation multiplier (default: 2)
     * @returns {Object} Bollinger Bands values
     */
    calculateBollingerBands(data, period = 20, stdDev = 2) {
        if (!data || data.length < period) {
            return null;
        }

        const closes = data.slice(-period).map(candle => candle.close);
        
        // Calculate SMA
        const sma = closes.reduce((sum, price) => sum + price, 0) / period;
        
        // Calculate standard deviation
        const variance = closes.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: parseFloat((sma + (standardDeviation * stdDev)).toFixed(this.precision)),
            middle: parseFloat(sma.toFixed(this.precision)),
            lower: parseFloat((sma - (standardDeviation * stdDev)).toFixed(this.precision)),
            bandwidth: parseFloat(((standardDeviation * stdDev * 2) / sma * 100).toFixed(2))
        };
    }

    /**
     * Calculate Stochastic Oscillator
     * @param {Array} data - Array of OHLCV candles
     * @param {number} kPeriod - %K period (default: 14)
     * @param {number} dPeriod - %D period (default: 3)
     * @returns {Object} Stochastic values
     */
    calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
        if (!data || data.length < kPeriod) {
            return null;
        }

        const recentData = data.slice(-kPeriod);
        const currentClose = data[data.length - 1].close;
        
        const highest = Math.max(...recentData.map(candle => candle.high));
        const lowest = Math.min(...recentData.map(candle => candle.low));
        
        const kPercent = ((currentClose - lowest) / (highest - lowest)) * 100;
        
        // For %D, we would need historical %K values
        // This is a simplified implementation
        
        return {
            k: parseFloat(kPercent.toFixed(2)),
            d: null // Would need historical %K values
        };
    }

    /**
     * Calculate Average True Range (ATR)
     * @param {Array} data - Array of OHLCV candles
     * @param {number} period - ATR period (default: 14)
     * @returns {number} ATR value
     */
    calculateATR(data, period = 14) {
        if (!data || data.length < period + 1) {
            return null;
        }

        const trueRanges = [];
        
        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const previous = data[i - 1];
            
            const tr1 = current.high - current.low;
            const tr2 = Math.abs(current.high - previous.close);
            const tr3 = Math.abs(current.low - previous.close);
            
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }

        // Calculate ATR as SMA of True Ranges
        const recentTR = trueRanges.slice(-period);
        const atr = recentTR.reduce((sum, tr) => sum + tr, 0) / period;
        
        return parseFloat(atr.toFixed(this.precision));
    }

    /**
     * Calculate Williams %R
     * @param {Array} data - Array of OHLCV candles
     * @param {number} period - Period (default: 14)
     * @returns {number} Williams %R value
     */
    calculateWilliamsR(data, period = 14) {
        if (!data || data.length < period) {
            return null;
        }

        const recentData = data.slice(-period);
        const currentClose = data[data.length - 1].close;
        
        const highest = Math.max(...recentData.map(candle => candle.high));
        const lowest = Math.min(...recentData.map(candle => candle.low));
        
        const williamsR = ((highest - currentClose) / (highest - lowest)) * -100;
        
        return parseFloat(williamsR.toFixed(2));
    }

    /**
     * Calculate Momentum
     * @param {Array} data - Array of OHLCV candles
     * @param {number} period - Period (default: 10)
     * @returns {number} Momentum value
     */
    calculateMomentum(data, period = 10) {
        if (!data || data.length < period + 1) {
            return null;
        }

        const current = data[data.length - 1].close;
        const previous = data[data.length - 1 - period].close;
        
        return parseFloat((current - previous).toFixed(this.precision));
    }

    /**
     * Calculate Rate of Change (ROC)
     * @param {Array} data - Array of OHLCV candles
     * @param {number} period - Period (default: 10)
     * @returns {number} ROC value as percentage
     */
    calculateROC(data, period = 10) {
        if (!data || data.length < period + 1) {
            return null;
        }

        const current = data[data.length - 1].close;
        const previous = data[data.length - 1 - period].close;
        
        const roc = ((current - previous) / previous) * 100;
        
        return parseFloat(roc.toFixed(2));
    }

    /**
     * Calculate Commodity Channel Index (CCI)
     * @param {Array} data - Array of OHLCV candles
     * @param {number} period - Period (default: 20)
     * @returns {number} CCI value
     */
    calculateCCI(data, period = 20) {
        if (!data || data.length < period) {
            return null;
        }

        const recentData = data.slice(-period);
        
        // Calculate Typical Price for each candle
        const typicalPrices = recentData.map(candle => 
            (candle.high + candle.low + candle.close) / 3
        );
        
        // Calculate SMA of Typical Prices
        const smaTP = typicalPrices.reduce((sum, tp) => sum + tp, 0) / period;
        
        // Calculate Mean Deviation
        const meanDeviation = typicalPrices.reduce((sum, tp) => 
            sum + Math.abs(tp - smaTP), 0
        ) / period;
        
        const currentTP = typicalPrices[typicalPrices.length - 1];
        const cci = (currentTP - smaTP) / (0.015 * meanDeviation);
        
        return parseFloat(cci.toFixed(2));
    }

    /**
     * Calculate Volume indicators
     * @param {Array} data - Array of OHLCV candles
     * @returns {Object} Volume analysis
     */
    calculateVolumeIndicators(data) {
        if (!data || data.length < 2) {
            return null;
        }

        const volumes = data.map(candle => candle.volume || 0);
        const currentVolume = volumes[volumes.length - 1];
        
        // Average volume (20 period)
        const period = Math.min(20, volumes.length);
        const avgVolume = volumes.slice(-period).reduce((sum, vol) => sum + vol, 0) / period;
        
        // Volume ratio
        const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 0;
        
        // Volume trend (comparing last 3 candles)
        let volumeTrend = 'neutral';
        if (volumes.length >= 3) {
            const recent = volumes.slice(-3);
            if (recent[2] > recent[1] && recent[1] > recent[0]) {
                volumeTrend = 'increasing';
            } else if (recent[2] < recent[1] && recent[1] < recent[0]) {
                volumeTrend = 'decreasing';
            }
        }

        return {
            current: currentVolume,
            average: parseFloat(avgVolume.toFixed(0)),
            ratio: parseFloat(volumeRatio.toFixed(2)),
            trend: volumeTrend,
            isHigh: volumeRatio > 1.5,
            isLow: volumeRatio < 0.5
        };
    }

    /**
     * Calculate multiple indicators at once
     * @param {Array} data - Array of OHLCV candles
     * @param {Object} config - Configuration for indicators
     * @returns {Object} All calculated indicators
     */
    calculateAll(data, config = {}) {
        const indicators = {};

        try {
            // RSI
            indicators.RSI = this.calculateRSI(data, config.rsiPeriod || 14);
            
            // Moving Averages
            indicators.EMA9 = this.calculateEMA(data, 9);
            indicators.EMA21 = this.calculateEMA(data, 21);
            indicators.EMA50 = this.calculateEMA(data, 50);
            indicators.SMA20 = this.calculateSMA(data, 20);
            
            // MACD
            indicators.MACD = this.calculateMACD(data);
            
            // Bollinger Bands
            indicators.BollingerBands = this.calculateBollingerBands(data);
            
            // Stochastic
            indicators.Stochastic = this.calculateStochastic(data);
            
            // ATR
            indicators.ATR = this.calculateATR(data);
            
            // Williams %R
            indicators.WilliamsR = this.calculateWilliamsR(data);
            
            // Momentum
            indicators.Momentum = this.calculateMomentum(data);
            
            // Rate of Change
            indicators.ROC = this.calculateROC(data);
            
            // CCI
            indicators.CCI = this.calculateCCI(data);
            
            // Volume
            indicators.Volume = this.calculateVolumeIndicators(data);

        } catch (error) {
            console.error('[Indicators] Calculation error:', error);
        }

        return indicators;
    }

    /**
     * Get trading signals based on indicators
     * @param {Object} indicators - Calculated indicators
     * @returns {Object} Trading signals
     */
    getSignals(indicators) {
        const signals = {
            bullish: [],
            bearish: [],
            neutral: [],
            strength: 0
        };

        try {
            // RSI Signals
            if (indicators.RSI !== null) {
                if (indicators.RSI < 30) {
                    signals.bullish.push('RSI Oversold');
                } else if (indicators.RSI > 70) {
                    signals.bearish.push('RSI Overbought');
                }
            }

            // EMA Signals
            if (indicators.EMA9 && indicators.EMA21) {
                if (indicators.EMA9 > indicators.EMA21) {
                    signals.bullish.push('EMA9 > EMA21');
                } else {
                    signals.bearish.push('EMA9 < EMA21');
                }
            }

            // Bollinger Bands Signals
            if (indicators.BollingerBands) {
                const bb = indicators.BollingerBands;
                // Would need current price to compare
                if (bb.bandwidth < 10) {
                    signals.neutral.push('Low Volatility');
                } else if (bb.bandwidth > 40) {
                    signals.neutral.push('High Volatility');
                }
            }

            // Stochastic Signals
            if (indicators.Stochastic && indicators.Stochastic.k !== null) {
                if (indicators.Stochastic.k < 20) {
                    signals.bullish.push('Stochastic Oversold');
                } else if (indicators.Stochastic.k > 80) {
                    signals.bearish.push('Stochastic Overbought');
                }
            }

            // Williams %R Signals
            if (indicators.WilliamsR !== null) {
                if (indicators.WilliamsR < -80) {
                    signals.bullish.push('Williams %R Oversold');
                } else if (indicators.WilliamsR > -20) {
                    signals.bearish.push('Williams %R Overbought');
                }
            }

            // Calculate overall strength
            signals.strength = signals.bullish.length - signals.bearish.length;

        } catch (error) {
            console.error('[Indicators] Signal analysis error:', error);
        }

        return signals;
    }

    /**
     * Validate data format
     * @param {Array} data - OHLCV data
     * @returns {boolean} Whether data is valid
     */
    validateData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return false;
        }

        // Check if data has required properties
        const requiredProps = ['open', 'high', 'low', 'close'];
        const firstCandle = data[0];
        
        return requiredProps.every(prop => 
            firstCandle.hasOwnProperty(prop) && 
            typeof firstCandle[prop] === 'number'
        );
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TechnicalIndicators;
} else {
    window.TechnicalIndicators = TechnicalIndicators;
}