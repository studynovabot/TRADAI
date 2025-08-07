/**
 * 🧠💡 ADVANCED ANALYSIS LAYER FOR TRADAI SYSTEM
 * 
 * This service implements advanced trade signal analysis using ONLY:
 * - 2 Exponential Moving Averages (fast and slow)
 * - Stochastic Oscillator
 * - Bollinger Bands
 * 
 * Features:
 * 1. Candle Pattern Recognition Layer
 * 2. Price Action Intelligence Layer
 * 3. Trend Strength & Reversal Probability
 * 4. Candle Timing Filter
 * 5. Signal Classification Logic
 * 6. Signal Confidence Scoring System
 * 7. Bot Trap Avoidance Filter
 * 8. Human-like Signal Reasoning
 */

class AdvancedAnalysisService {
    constructor(config = {}) {
        this.config = {
            // Signal confidence thresholds
            minSignalScore: config.minSignalScore || 70,
            maxSignalScore: config.maxSignalScore || 100,
            
            // Timing windows
            entryWindowStart: config.entryWindowStart || 50, // Last 10s of 60s candle
            entryWindowEnd: config.entryWindowEnd || 60,
            
            // Pattern recognition settings
            patternLookback: config.patternLookback || 5,
            wickRejectionThreshold: config.wickRejectionThreshold || 0.3,
            
            // Trend strength settings
            trendStrengthPeriod: config.trendStrengthPeriod || 10,
            
            // Bot trap detection
            flatMovementThreshold: config.flatMovementThreshold || 0.0001,
            consecutiveSimilarCandles: config.consecutiveSimilarCandles || 3,
            
            // Debug mode
            debugMode: config.debugMode || false,
            
            ...config
        };

        // Signal scoring weights (must total 100%)
        this.scoringWeights = {
            candlePattern: 15,
            bollingerBandReaction: 10,
            stochasticOverboughtOversold: 10,
            stochasticCrossDirection: 10,
            emaTrendStrength: 15,
            rejectionWick: 10,
            historicalWinrate: 15,
            timingWindowAlignment: 10,
            reasoningAlignment: 5
        };

        // Historical performance tracking
        this.historicalData = {
            signals: [],
            patterns: {},
            winRates: {}
        };

        // Learning memory for signal optimization
        this.learningMemory = {
            successfulConfluences: [],
            failedConfluences: [],
            patternPerformance: {},
            adjustmentWeights: { ...this.scoringWeights }
        };
    }

    /**
     * 🎯 MAIN ANALYSIS METHOD
     * Analyzes market data and returns advanced signal with reasoning
     */
    async analyzeMarketData(marketData) {
        try {
            console.log('🧠 Starting Advanced Analysis Layer...');
            
            // Validate input data
            if (!this.validateMarketData(marketData)) {
                throw new Error('Invalid market data provided');
            }

            // Extract indicators from market data
            const indicators = this.extractIndicators(marketData);
            
            // 1. Candle Pattern Recognition Layer
            const candlePatterns = this.analyzeCandlePatterns(marketData.candles);
            
            // 2. Price Action Intelligence Layer
            const priceAction = this.analyzePriceAction(marketData.candles, indicators);
            
            // 3. Trend Strength & Reversal Probability
            const trendAnalysis = this.analyzeTrendStrength(marketData.candles, indicators);
            
            // 4. Signal Classification
            const signalType = this.classifySignal(candlePatterns, priceAction, trendAnalysis, indicators);
            
            // 5. Bot Trap Detection
            const botTrapRisk = this.detectBotTrap(marketData.candles, indicators);
            
            // 6. Signal Confidence Scoring
            const signalScore = this.calculateSignalScore({
                candlePatterns,
                priceAction,
                trendAnalysis,
                indicators,
                signalType,
                botTrapRisk
            });
            
            // 7. Entry Timing Analysis
            const entryTiming = this.analyzeEntryTiming(marketData.candles);
            
            // 8. Generate Human-like Reasoning
            const reasoning = this.generateReasoning({
                candlePatterns,
                priceAction,
                trendAnalysis,
                indicators,
                signalType,
                signalScore
            });

            // Determine final signal direction
            const direction = this.determineSignalDirection({
                candlePatterns,
                priceAction,
                trendAnalysis,
                indicators,
                signalType
            });

            // Create final analysis result
            const analysis = {
                direction: direction,
                signal_type: signalType,
                signal_score: signalScore,
                entry_window: entryTiming.window,
                reasoning: reasoning,
                bot_trap_risk: botTrapRisk.detected,
                trade_confidence: this.getTradeConfidence(signalScore),
                
                // Detailed breakdown
                analysis_breakdown: {
                    candle_patterns: candlePatterns,
                    price_action: priceAction,
                    trend_analysis: trendAnalysis,
                    indicators: indicators,
                    entry_timing: entryTiming,
                    bot_trap_analysis: botTrapRisk
                },
                
                // Metadata
                timestamp: new Date().toISOString(),
                analysis_version: '1.0.0-advanced'
            };

            // Store for learning
            this.storeAnalysisForLearning(analysis);

            console.log(`✅ Advanced analysis completed: ${direction} ${signalType} with ${signalScore}% confidence`);
            
            return {
                success: true,
                analysis: analysis
            };

        } catch (error) {
            console.error('❌ Advanced analysis failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🧬 CANDLE PATTERN RECOGNITION LAYER
     */
    analyzeCandlePatterns(candles) {
        const patterns = {
            detected: [],
            strength: 0,
            bias: 'neutral'
        };

        if (candles.length < 2) return patterns;

        const current = candles[candles.length - 1];
        const previous = candles[candles.length - 2];
        
        // Bullish Engulfing
        if (this.isBullishEngulfing(previous, current)) {
            patterns.detected.push({
                type: 'bullish_engulfing',
                strength: 8,
                bias: 'bullish'
            });
        }
        
        // Bearish Engulfing
        if (this.isBearishEngulfing(previous, current)) {
            patterns.detected.push({
                type: 'bearish_engulfing',
                strength: 8,
                bias: 'bearish'
            });
        }
        
        // Hammer
        if (this.isHammer(current)) {
            patterns.detected.push({
                type: 'hammer',
                strength: 7,
                bias: 'bullish'
            });
        }
        
        // Shooting Star
        if (this.isShootingStar(current)) {
            patterns.detected.push({
                type: 'shooting_star',
                strength: 7,
                bias: 'bearish'
            });
        }
        
        // Pin Bar
        if (this.isPinBar(current)) {
            const pinBarBias = current.close > current.open ? 'bullish' : 'bearish';
            patterns.detected.push({
                type: 'pin_bar',
                strength: 6,
                bias: pinBarBias
            });
        }
        
        // Doji
        if (this.isDoji(current)) {
            patterns.detected.push({
                type: 'doji',
                strength: 5,
                bias: 'neutral'
            });
        }
        
        // Inside Bar
        if (this.isInsideBar(previous, current)) {
            patterns.detected.push({
                type: 'inside_bar',
                strength: 4,
                bias: 'neutral'
            });
        }

        // Calculate overall pattern strength and bias
        if (patterns.detected.length > 0) {
            patterns.strength = Math.max(...patterns.detected.map(p => p.strength));
            
            const bullishPatterns = patterns.detected.filter(p => p.bias === 'bullish');
            const bearishPatterns = patterns.detected.filter(p => p.bias === 'bearish');
            
            if (bullishPatterns.length > bearishPatterns.length) {
                patterns.bias = 'bullish';
            } else if (bearishPatterns.length > bullishPatterns.length) {
                patterns.bias = 'bearish';
            }
        }

        return patterns;
    }

    /**
     * 📉 PRICE ACTION INTELLIGENCE LAYER
     */
    analyzePriceAction(candles, indicators) {
        const priceAction = {
            support_resistance: this.findSupportResistance(candles),
            breakout_analysis: this.analyzeBreakouts(candles, indicators),
            wick_analysis: this.analyzeWicks(candles, indicators),
            momentum_analysis: this.analyzeMomentum(candles)
        };

        return priceAction;
    }

    /**
     * 🧠 TREND STRENGTH & REVERSAL PROBABILITY
     */
    analyzeTrendStrength(candles, indicators) {
        const trendAnalysis = {
            ema_spread: this.calculateEMASpread(indicators.ema_fast, indicators.ema_slow),
            trend_direction: this.determineTrendDirection(indicators.ema_fast, indicators.ema_slow),
            trend_strength: 0,
            reversal_probability: 0,
            slope_analysis: this.analyzeEMASlopes(indicators.ema_fast, indicators.ema_slow)
        };

        // Calculate trend strength based on EMA spread
        const avgSpread = this.calculateAverageSpread(trendAnalysis.ema_spread);
        trendAnalysis.trend_strength = this.normalizeTrendStrength(avgSpread);

        // Calculate reversal probability
        trendAnalysis.reversal_probability = this.calculateReversalProbability(
            candles, 
            indicators, 
            trendAnalysis
        );

        return trendAnalysis;
    }

    /**
     * 🎯 SIGNAL CLASSIFICATION LOGIC
     */
    classifySignal(candlePatterns, priceAction, trendAnalysis, indicators) {
        const currentPrice = indicators.current_price;
        const bbUpper = indicators.bollinger_bands.upper;
        const bbLower = indicators.bollinger_bands.lower;
        const stochastic = indicators.stochastic;

        // Reversal Trade Conditions
        const isAtBBBand = (currentPrice >= bbUpper * 0.99) || (currentPrice <= bbLower * 1.01);
        const hasStochasticCross = this.hasStochasticCross(stochastic);
        const hasReversalPattern = candlePatterns.detected.some(p => 
            ['bullish_engulfing', 'bearish_engulfing', 'hammer', 'shooting_star'].includes(p.type)
        );

        if (isAtBBBand && hasStochasticCross && hasReversalPattern) {
            return 'Reversal';
        }

        // Continuation Trade Conditions
        const isNearEMA = this.isPriceNearEMA(currentPrice, indicators.ema_fast, indicators.ema_slow);
        const isInTrendDirection = this.isInTrendDirection(trendAnalysis.trend_direction, candlePatterns.bias);
        const hasStochasticConfirmation = this.hasStochasticConfirmation(stochastic, trendAnalysis.trend_direction);

        if (isNearEMA && isInTrendDirection && hasStochasticConfirmation) {
            return 'Continuation';
        }

        // Default to continuation if unclear
        return 'Continuation';
    }

    /**
     * 📊 SIGNAL CONFIDENCE SCORING SYSTEM
     */
    calculateSignalScore(analysisData) {
        let totalScore = 0;
        const weights = this.scoringWeights;

        // 1. Candle Pattern Match (15%)
        const patternScore = this.scorePatternMatch(analysisData.candlePatterns);
        totalScore += (patternScore / 10) * weights.candlePattern;

        // 2. Bollinger Band Reaction (10%)
        const bbScore = this.scoreBollingerBandReaction(analysisData.indicators);
        totalScore += (bbScore / 10) * weights.bollingerBandReaction;

        // 3. Stochastic Overbought/Oversold (10%)
        const stochOBOSScore = this.scoreStochasticOBOS(analysisData.indicators.stochastic);
        totalScore += (stochOBOSScore / 10) * weights.stochasticOverboughtOversold;

        // 4. Stochastic Cross Direction (10%)
        const stochCrossScore = this.scoreStochasticCross(analysisData.indicators.stochastic);
        totalScore += (stochCrossScore / 10) * weights.stochasticCrossDirection;

        // 5. EMA Trend Strength (15%)
        const emaTrendScore = this.scoreEMATrendStrength(analysisData.trendAnalysis);
        totalScore += (emaTrendScore / 10) * weights.emaTrendStrength;

        // 6. Rejection Wick (10%)
        const wickScore = this.scoreRejectionWick(analysisData.priceAction);
        totalScore += (wickScore / 10) * weights.rejectionWick;

        // 7. Historical Win Rate (15%)
        const historicalScore = this.scoreHistoricalWinRate(analysisData.signalType);
        totalScore += (historicalScore / 10) * weights.historicalWinrate;

        // 8. Timing Window Alignment (10%)
        const timingScore = this.scoreTimingAlignment();
        totalScore += (timingScore / 10) * weights.timingWindowAlignment;

        // 9. Reasoning Alignment (5%)
        const reasoningScore = this.scoreReasoningAlignment(analysisData);
        totalScore += (reasoningScore / 10) * weights.reasoningAlignment;

        // Apply bot trap penalty
        if (analysisData.botTrapRisk && analysisData.botTrapRisk.detected) {
            totalScore *= 0.8; // 20% penalty for bot trap risk
        }

        return Math.max(0, Math.min(100, Math.round(totalScore)));
    }

    /**
     * 🔒 BOT TRAP AVOIDANCE FILTER
     */
    detectBotTrap(candles, indicators) {
        const botTrap = {
            detected: false,
            reasons: [],
            risk_level: 'low'
        };

        // Check for flat EMA movement
        const emaSpread = Math.abs(indicators.ema_fast - indicators.ema_slow);
        const avgPrice = (indicators.ema_fast + indicators.ema_slow) / 2;
        const emaSpreadPercent = (emaSpread / avgPrice) * 100;

        if (emaSpreadPercent < 0.01) { // Less than 0.01% spread
            botTrap.detected = true;
            botTrap.reasons.push('Flat EMA movement detected');
        }

        // Check for price hovering at BB edge
        const currentPrice = indicators.current_price;
        const bbUpper = indicators.bollinger_bands.upper;
        const bbLower = indicators.bollinger_bands.lower;
        
        const atUpperBB = Math.abs(currentPrice - bbUpper) / bbUpper < 0.001;
        const atLowerBB = Math.abs(currentPrice - bbLower) / bbLower < 0.001;

        if ((atUpperBB || atLowerBB) && emaSpreadPercent < 0.02) {
            botTrap.detected = true;
            botTrap.reasons.push('Price hovering at BB edge with flat EMAs');
        }

        // Check for consecutive similar candles
        if (this.hasConsecutiveSimilarCandles(candles)) {
            botTrap.detected = true;
            botTrap.reasons.push('Consecutive similar candle sizes detected');
        }

        // Check for flat stochastic
        const stochastic = indicators.stochastic;
        if (Math.abs(stochastic.k - stochastic.d) < 2 && 
            stochastic.k > 40 && stochastic.k < 60) {
            botTrap.detected = true;
            botTrap.reasons.push('Flat stochastic in neutral zone');
        }

        // Determine risk level
        if (botTrap.reasons.length >= 3) {
            botTrap.risk_level = 'high';
        } else if (botTrap.reasons.length >= 2) {
            botTrap.risk_level = 'medium';
        }

        return botTrap;
    }

    /**
     * ⏱️ CANDLE TIMING FILTER
     */
    analyzeEntryTiming(candles) {
        const currentTime = new Date();
        const secondsIntoCandle = currentTime.getSeconds();
        
        let window = 'avoid';
        let confidence_multiplier = 1.0;

        // Optimal entry windows
        if (secondsIntoCandle >= 50 && secondsIntoCandle <= 60) {
            window = 'last_10s_of_candle';
            confidence_multiplier = 1.1;
        } else if (secondsIntoCandle >= 0 && secondsIntoCandle <= 10) {
            window = 'first_10s_of_candle';
            confidence_multiplier = 1.05;
        } else if (secondsIntoCandle >= 25 && secondsIntoCandle <= 35) {
            window = 'avoid_middle_zone';
            confidence_multiplier = 0.9;
        }

        return {
            window: window,
            seconds_into_candle: secondsIntoCandle,
            confidence_multiplier: confidence_multiplier,
            optimal: window === 'last_10s_of_candle'
        };
    }

    /**
     * 🗣️ HUMAN-LIKE SIGNAL REASONING
     */
    generateReasoning(analysisData) {
        const { candlePatterns, priceAction, trendAnalysis, indicators, signalType, signalScore } = analysisData;
        
        let reasoning = '';
        const reasons = [];

        // Pattern-based reasoning
        if (candlePatterns.detected.length > 0) {
            const strongestPattern = candlePatterns.detected.reduce((prev, current) => 
                (prev.strength > current.strength) ? prev : current
            );
            reasons.push(`${strongestPattern.type.replace('_', ' ')} pattern detected`);
        }

        // Bollinger Band reasoning
        const currentPrice = indicators.current_price;
        const bbUpper = indicators.bollinger_bands.upper;
        const bbLower = indicators.bollinger_bands.lower;
        
        if (currentPrice >= bbUpper * 0.99) {
            reasons.push('price touching upper Bollinger Band');
        } else if (currentPrice <= bbLower * 1.01) {
            reasons.push('price touching lower Bollinger Band');
        }

        // Stochastic reasoning
        const stoch = indicators.stochastic;
        if (stoch.k > 80) {
            reasons.push('stochastic in overbought territory');
        } else if (stoch.k < 20) {
            reasons.push('stochastic in oversold territory');
        }

        if (this.hasStochasticCross(stoch)) {
            const crossDirection = stoch.k > stoch.d ? 'bullish' : 'bearish';
            reasons.push(`stochastic showing ${crossDirection} crossover`);
        }

        // EMA reasoning
        if (trendAnalysis.trend_strength > 7) {
            reasons.push(`strong ${trendAnalysis.trend_direction} trend confirmed by EMA spread`);
        } else if (trendAnalysis.slope_analysis.fast_ema_slope !== 'flat') {
            reasons.push(`EMA showing ${trendAnalysis.slope_analysis.fast_ema_slope} momentum`);
        }

        // Reversal vs Continuation reasoning
        if (signalType === 'Reversal') {
            reasoning = `${reasons.join(', ')} indicating a potential ${trendAnalysis.trend_direction === 'uptrend' ? 'bearish' : 'bullish'} reversal`;
        } else {
            reasoning = `${reasons.join(', ')} supporting ${trendAnalysis.trend_direction} continuation`;
        }

        // Add confidence qualifier
        if (signalScore >= 85) {
            reasoning = `Strong confluence: ${reasoning}`;
        } else if (signalScore >= 75) {
            reasoning = `Good confluence: ${reasoning}`;
        } else {
            reasoning = `Moderate confluence: ${reasoning}`;
        }

        return reasoning;
    }

    /**
     * 🎯 DETERMINE SIGNAL DIRECTION
     */
    determineSignalDirection(analysisData) {
        const { candlePatterns, priceAction, trendAnalysis, indicators, signalType } = analysisData;
        
        let bullishScore = 0;
        let bearishScore = 0;

        // Pattern bias
        if (candlePatterns.bias === 'bullish') bullishScore += 2;
        if (candlePatterns.bias === 'bearish') bearishScore += 2;

        // Trend bias
        if (trendAnalysis.trend_direction === 'uptrend') bullishScore += 3;
        if (trendAnalysis.trend_direction === 'downtrend') bearishScore += 3;

        // Stochastic bias
        const stoch = indicators.stochastic;
        if (stoch.k < 20 && stoch.k > stoch.d) bullishScore += 2;
        if (stoch.k > 80 && stoch.k < stoch.d) bearishScore += 2;

        // Bollinger Band bias
        const currentPrice = indicators.current_price;
        const bbUpper = indicators.bollinger_bands.upper;
        const bbLower = indicators.bollinger_bands.lower;
        const bbMiddle = indicators.bollinger_bands.middle;

        if (signalType === 'Reversal') {
            if (currentPrice >= bbUpper * 0.99) bearishScore += 2;
            if (currentPrice <= bbLower * 1.01) bullishScore += 2;
        } else {
            if (currentPrice > bbMiddle) bullishScore += 1;
            if (currentPrice < bbMiddle) bearishScore += 1;
        }

        // EMA position bias
        if (currentPrice > indicators.ema_fast && indicators.ema_fast > indicators.ema_slow) {
            bullishScore += 2;
        }
        if (currentPrice < indicators.ema_fast && indicators.ema_fast < indicators.ema_slow) {
            bearishScore += 2;
        }

        return bullishScore > bearishScore ? 'BUY' : 'SELL';
    }

    /**
     * 📈 HELPER METHODS FOR PATTERN RECOGNITION
     */
    isBullishEngulfing(prev, current) {
        return prev.close < prev.open && // Previous candle is bearish
               current.close > current.open && // Current candle is bullish
               current.open < prev.close && // Current opens below previous close
               current.close > prev.open; // Current closes above previous open
    }

    isBearishEngulfing(prev, current) {
        return prev.close > prev.open && // Previous candle is bullish
               current.close < current.open && // Current candle is bearish
               current.open > prev.close && // Current opens above previous close
               current.close < prev.open; // Current closes below previous open
    }

    isHammer(candle) {
        const body = Math.abs(candle.close - candle.open);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        
        return lowerWick > body * 2 && upperWick < body * 0.5;
    }

    isShootingStar(candle) {
        const body = Math.abs(candle.close - candle.open);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        
        return upperWick > body * 2 && lowerWick < body * 0.5;
    }

    isPinBar(candle) {
        const body = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        
        return (lowerWick > totalRange * 0.6 || upperWick > totalRange * 0.6) && 
               body < totalRange * 0.3;
    }

    isDoji(candle) {
        const body = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;
        
        return body < totalRange * 0.1;
    }

    isInsideBar(prev, current) {
        return current.high < prev.high && current.low > prev.low;
    }

    /**
     * 📊 HELPER METHODS FOR TECHNICAL ANALYSIS
     */
    extractIndicators(marketData) {
        // Extract indicators from market data
        // This would typically come from the chart analysis
        return {
            current_price: marketData.current_price || marketData.candles[marketData.candles.length - 1].close,
            ema_fast: marketData.ema_fast || 0,
            ema_slow: marketData.ema_slow || 0,
            bollinger_bands: marketData.bollinger_bands || {
                upper: 0,
                middle: 0,
                lower: 0
            },
            stochastic: marketData.stochastic || {
                k: 50,
                d: 50
            }
        };
    }

    validateMarketData(marketData) {
        return marketData && 
               marketData.candles && 
               Array.isArray(marketData.candles) && 
               marketData.candles.length > 0;
    }

    findSupportResistance(candles) {
        // Implement support/resistance detection logic
        const levels = [];
        const lookback = Math.min(20, candles.length);
        
        for (let i = candles.length - lookback; i < candles.length; i++) {
            if (i > 0 && i < candles.length - 1) {
                const prev = candles[i - 1];
                const current = candles[i];
                const next = candles[i + 1];
                
                // Resistance level
                if (current.high > prev.high && current.high > next.high) {
                    levels.push({
                        type: 'resistance',
                        price: current.high,
                        strength: 1
                    });
                }
                
                // Support level
                if (current.low < prev.low && current.low < next.low) {
                    levels.push({
                        type: 'support',
                        price: current.low,
                        strength: 1
                    });
                }
            }
        }
        
        return levels;
    }

    analyzeBreakouts(candles, indicators) {
        const current = candles[candles.length - 1];
        const bbUpper = indicators.bollinger_bands.upper;
        const bbLower = indicators.bollinger_bands.lower;
        
        const breakout = {
            detected: false,
            type: null,
            strength: 0
        };
        
        // Check for BB breakout
        if (current.close > bbUpper) {
            breakout.detected = true;
            breakout.type = 'bullish_breakout';
            breakout.strength = current.high === current.close ? 8 : 5; // No upper wick = stronger
        } else if (current.close < bbLower) {
            breakout.detected = true;
            breakout.type = 'bearish_breakout';
            breakout.strength = current.low === current.close ? 8 : 5; // No lower wick = stronger
        }
        
        return breakout;
    }

    analyzeWicks(candles, indicators) {
        const current = candles[candles.length - 1];
        const body = Math.abs(current.close - current.open);
        const upperWick = current.high - Math.max(current.open, current.close);
        const lowerWick = Math.min(current.open, current.close) - current.low;
        
        const wickAnalysis = {
            upper_wick_rejection: false,
            lower_wick_rejection: false,
            rejection_strength: 0
        };
        
        // Check for rejection at EMA or BB levels
        const emaFast = indicators.ema_fast;
        const emaSlow = indicators.ema_slow;
        const bbUpper = indicators.bollinger_bands.upper;
        const bbLower = indicators.bollinger_bands.lower;
        
        if (upperWick > body * 2) {
            if (current.high >= bbUpper * 0.99 || 
                Math.abs(current.high - emaFast) / emaFast < 0.001 ||
                Math.abs(current.high - emaSlow) / emaSlow < 0.001) {
                wickAnalysis.upper_wick_rejection = true;
                wickAnalysis.rejection_strength = Math.min(10, upperWick / body);
            }
        }
        
        if (lowerWick > body * 2) {
            if (current.low <= bbLower * 1.01 || 
                Math.abs(current.low - emaFast) / emaFast < 0.001 ||
                Math.abs(current.low - emaSlow) / emaSlow < 0.001) {
                wickAnalysis.lower_wick_rejection = true;
                wickAnalysis.rejection_strength = Math.min(10, lowerWick / body);
            }
        }
        
        return wickAnalysis;
    }

    analyzeMomentum(candles) {
        if (candles.length < 3) return { strength: 0, direction: 'neutral' };
        
        const recent = candles.slice(-3);
        let bullishCandles = 0;
        let bearishCandles = 0;
        
        recent.forEach(candle => {
            if (candle.close > candle.open) bullishCandles++;
            else bearishCandles++;
        });
        
        return {
            strength: Math.abs(bullishCandles - bearishCandles),
            direction: bullishCandles > bearishCandles ? 'bullish' : 
                      bearishCandles > bullishCandles ? 'bearish' : 'neutral'
        };
    }

    calculateEMASpread(emaFast, emaSlow) {
        return Math.abs(emaFast - emaSlow);
    }

    determineTrendDirection(emaFast, emaSlow) {
        if (emaFast > emaSlow) return 'uptrend';
        if (emaFast < emaSlow) return 'downtrend';
        return 'sideways';
    }

    analyzeEMASlopes(emaFast, emaSlow) {
        // This would require historical EMA values to calculate slope
        // For now, return basic analysis
        return {
            fast_ema_slope: emaFast > emaSlow ? 'up' : 'down',
            slow_ema_slope: 'neutral', // Would need historical data
            convergence: Math.abs(emaFast - emaSlow) < (emaFast + emaSlow) * 0.001
        };
    }

    calculateAverageSpread(spread) {
        // Would calculate average over time - simplified for now
        return spread;
    }

    normalizeTrendStrength(spread) {
        // Normalize spread to 0-10 scale
        return Math.min(10, spread * 10000); // Simplified normalization
    }

    calculateReversalProbability(candles, indicators, trendAnalysis) {
        let probability = 0;
        
        // High probability if at BB extremes
        const currentPrice = indicators.current_price;
        const bbUpper = indicators.bollinger_bands.upper;
        const bbLower = indicators.bollinger_bands.lower;
        
        if (currentPrice >= bbUpper * 0.99 || currentPrice <= bbLower * 1.01) {
            probability += 30;
        }
        
        // Add stochastic reversal signals
        const stoch = indicators.stochastic;
        if ((stoch.k > 80 && stoch.k < stoch.d) || (stoch.k < 20 && stoch.k > stoch.d)) {
            probability += 25;
        }
        
        // Add EMA slope flattening
        if (trendAnalysis.slope_analysis.convergence) {
            probability += 20;
        }
        
        return Math.min(100, probability);
    }

    hasStochasticCross(stochastic) {
        // Simplified - would need historical data for proper cross detection
        return Math.abs(stochastic.k - stochastic.d) < 5;
    }

    isPriceNearEMA(price, emaFast, emaSlow) {
        const tolerance = 0.001; // 0.1%
        return Math.abs(price - emaFast) / price < tolerance || 
               Math.abs(price - emaSlow) / price < tolerance;
    }

    isInTrendDirection(trendDirection, patternBias) {
        if (trendDirection === 'uptrend' && patternBias === 'bullish') return true;
        if (trendDirection === 'downtrend' && patternBias === 'bearish') return true;
        return false;
    }

    hasStochasticConfirmation(stochastic, trendDirection) {
        if (trendDirection === 'uptrend') {
            return stochastic.k > stochastic.d && stochastic.k < 80;
        } else if (trendDirection === 'downtrend') {
            return stochastic.k < stochastic.d && stochastic.k > 20;
        }
        return false;
    }

    hasConsecutiveSimilarCandles(candles) {
        if (candles.length < this.config.consecutiveSimilarCandles) return false;
        
        const recent = candles.slice(-this.config.consecutiveSimilarCandles);
        const avgRange = recent.reduce((sum, candle) => sum + (candle.high - candle.low), 0) / recent.length;
        
        return recent.every(candle => {
            const range = candle.high - candle.low;
            return Math.abs(range - avgRange) / avgRange < 0.1; // Within 10% of average
        });
    }

    /**
     * 📊 SCORING METHODS
     */
    scorePatternMatch(patterns) {
        if (patterns.detected.length === 0) return 0;
        return Math.min(10, patterns.strength);
    }

    scoreBollingerBandReaction(indicators) {
        const currentPrice = indicators.current_price;
        const bbUpper = indicators.bollinger_bands.upper;
        const bbLower = indicators.bollinger_bands.lower;
        
        const upperDistance = Math.abs(currentPrice - bbUpper) / bbUpper;
        const lowerDistance = Math.abs(currentPrice - bbLower) / bbLower;
        
        const minDistance = Math.min(upperDistance, lowerDistance);
        
        if (minDistance < 0.001) return 10; // Very close to band
        if (minDistance < 0.005) return 8;  // Close to band
        if (minDistance < 0.01) return 6;   // Near band
        return 3; // Away from bands
    }

    scoreStochasticOBOS(stochastic) {
        if (stochastic.k > 80 || stochastic.k < 20) return 10;
        if (stochastic.k > 70 || stochastic.k < 30) return 7;
        if (stochastic.k > 60 || stochastic.k < 40) return 4;
        return 1;
    }

    scoreStochasticCross(stochastic) {
        const diff = Math.abs(stochastic.k - stochastic.d);
        if (diff < 2) return 10; // Very close to cross
        if (diff < 5) return 8;  // Close to cross
        if (diff < 10) return 5; // Approaching cross
        return 2;
    }

    scoreEMATrendStrength(trendAnalysis) {
        return Math.min(10, trendAnalysis.trend_strength);
    }

    scoreRejectionWick(priceAction) {
        if (priceAction.wick_analysis.upper_wick_rejection || 
            priceAction.wick_analysis.lower_wick_rejection) {
            return Math.min(10, priceAction.wick_analysis.rejection_strength);
        }
        return 0;
    }

    scoreHistoricalWinRate(signalType) {
        // Simplified - would use actual historical data
        const baseRate = this.learningMemory.patternPerformance[signalType] || 7;
        return Math.min(10, baseRate);
    }

    scoreTimingAlignment() {
        const timing = this.analyzeEntryTiming([]);
        return timing.optimal ? 10 : 5;
    }

    scoreReasoningAlignment(analysisData) {
        // Simplified reasoning alignment score
        const hasMultipleFactors = 
            (analysisData.candlePatterns.detected.length > 0 ? 1 : 0) +
            (analysisData.trendAnalysis.trend_strength > 5 ? 1 : 0) +
            (analysisData.indicators.stochastic.k > 80 || analysisData.indicators.stochastic.k < 20 ? 1 : 0);
        
        return Math.min(10, hasMultipleFactors * 3);
    }

    getTradeConfidence(signalScore) {
        if (signalScore >= 85) return 'High';
        if (signalScore >= 75) return 'Medium';
        if (signalScore >= 70) return 'Low';
        return 'Very Low';
    }

    storeAnalysisForLearning(analysis) {
        // Store analysis for future learning and optimization
        this.historicalData.signals.push({
            timestamp: analysis.timestamp,
            direction: analysis.direction,
            signal_type: analysis.signal_type,
            signal_score: analysis.signal_score,
            // Would store outcome when available
        });
        
        // Keep only recent signals (last 1000)
        if (this.historicalData.signals.length > 1000) {
            this.historicalData.signals = this.historicalData.signals.slice(-1000);
        }
    }

    /**
     * 🧠 LEARNING METHODS
     */
    updateLearningMemory(signalResult, outcome) {
        // Update learning memory based on signal outcome
        const { signal_type, analysis_breakdown } = signalResult;
        
        if (!this.learningMemory.patternPerformance[signal_type]) {
            this.learningMemory.patternPerformance[signal_type] = 7; // Default score
        }
        
        // Adjust pattern performance based on outcome
        if (outcome === 'success') {
            this.learningMemory.patternPerformance[signal_type] = Math.min(10, 
                this.learningMemory.patternPerformance[signal_type] + 0.1);
        } else if (outcome === 'failure') {
            this.learningMemory.patternPerformance[signal_type] = Math.max(1, 
                this.learningMemory.patternPerformance[signal_type] - 0.1);
        }
        
        // Store successful/failed confluences
        const confluence = {
            patterns: analysis_breakdown.candle_patterns.detected,
            indicators: analysis_breakdown.indicators,
            outcome: outcome
        };
        
        if (outcome === 'success') {
            this.learningMemory.successfulConfluences.push(confluence);
        } else {
            this.learningMemory.failedConfluences.push(confluence);
        }
        
        // Keep memory size manageable
        if (this.learningMemory.successfulConfluences.length > 500) {
            this.learningMemory.successfulConfluences = 
                this.learningMemory.successfulConfluences.slice(-500);
        }
        if (this.learningMemory.failedConfluences.length > 500) {
            this.learningMemory.failedConfluences = 
                this.learningMemory.failedConfluences.slice(-500);
        }
    }

    /**
     * 📈 GET STATISTICS
     */
    getAnalysisStatistics() {
        const totalSignals = this.historicalData.signals.length;
        const buySignals = this.historicalData.signals.filter(s => s.direction === 'BUY').length;
        const sellSignals = this.historicalData.signals.filter(s => s.direction === 'SELL').length;
        const reversalSignals = this.historicalData.signals.filter(s => s.signal_type === 'Reversal').length;
        const continuationSignals = this.historicalData.signals.filter(s => s.signal_type === 'Continuation').length;
        
        const avgScore = totalSignals > 0 ? 
            this.historicalData.signals.reduce((sum, s) => sum + s.signal_score, 0) / totalSignals : 0;
        
        return {
            total_signals: totalSignals,
            buy_signals: buySignals,
            sell_signals: sellSignals,
            reversal_signals: reversalSignals,
            continuation_signals: continuationSignals,
            average_signal_score: Math.round(avgScore),
            pattern_performance: this.learningMemory.patternPerformance,
            successful_confluences: this.learningMemory.successfulConfluences.length,
            failed_confluences: this.learningMemory.failedConfluences.length
        };
    }
}

module.exports = AdvancedAnalysisService;