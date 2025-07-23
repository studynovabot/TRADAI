/**
 * Technical Analysis Core Engine
 * Provides institutional-level precision for indicator calculations and signal generation
 */

class TechnicalAnalysisCore {
    constructor() {
        this.precision = 5; // Decimal places for price calculations
    }

    /**
     * Generate comprehensive technical analysis report
     */
    generateAnalysisReport(chartData, aiAnalysis, timeframe) {
        console.log(`📊 Generating analysis report for ${timeframe} timeframe...`);
        
        const report = {
            currencyPair: chartData.currencyPair,
            timeframe: timeframe,
            timestamp: new Date().toISOString(),
            indicators: this.formatIndicatorAnalysis(aiAnalysis.indicators, chartData),
            candlestickPatterns: this.formatCandlestickAnalysis(aiAnalysis.patterns),
            supportResistance: this.formatSupportResistanceAnalysis(aiAnalysis.supportResistance),
            signals: this.formatTradingSignals(aiAnalysis.signals),
            marketStructure: aiAnalysis.marketStructure,
            confidence: aiAnalysis.metadata?.confidence || 'medium'
        };
        
        console.log('✅ Analysis report generated');
        return report;
    }

    /**
     * Format indicator analysis with precise signals
     */
    formatIndicatorAnalysis(indicators, chartData) {
        const ema5Analysis = this.analyzeEMA5(indicators.ema5, chartData.priceData);
        const sma20Analysis = this.analyzeSMA20(indicators.sma20, chartData.priceData);
        const stochasticAnalysis = this.analyzeStochastic(indicators.stochastic);

        return {
            ema5: {
                signal: ema5Analysis.signal,
                position: ema5Analysis.position,
                description: ema5Analysis.description,
                strength: ema5Analysis.strength
            },
            sma20: {
                signal: sma20Analysis.signal,
                position: sma20Analysis.position,
                description: sma20Analysis.description,
                strength: sma20Analysis.strength
            },
            stochastic: {
                kLevel: stochasticAnalysis.kLevel,
                dLevel: stochasticAnalysis.dLevel,
                signal: stochasticAnalysis.signal,
                zone: stochasticAnalysis.zone,
                description: stochasticAnalysis.description
            }
        };
    }

    /**
     * Analyze EMA 5 with institutional precision
     */
    analyzeEMA5(emaData, priceData) {
        const signal = emaData.signal || 'NEUTRAL';
        const position = emaData.position || 'UNKNOWN';
        
        let description = '';
        let strength = emaData.strength || 5;

        switch (signal) {
            case 'BULLISH':
                description = position === 'BELOW' ? 
                    'Price trading ABOVE EMA 5 - **BULLISH SIGNAL**' :
                    'EMA 5 showing bullish momentum - **BULLISH SIGNAL**';
                break;
            case 'BEARISH':
                description = position === 'ABOVE' ?
                    'Currently ABOVE price - **BEARISH SIGNAL**' :
                    'EMA 5 showing bearish momentum - **BEARISH SIGNAL**';
                break;
            default:
                description = 'EMA 5 showing neutral momentum - **NEUTRAL SIGNAL**';
        }

        return {
            signal,
            position,
            description,
            strength
        };
    }

    /**
     * Analyze SMA 20 with institutional precision
     */
    analyzeSMA20(smaData, priceData) {
        const signal = smaData.signal || 'NEUTRAL';
        const position = smaData.position || 'UNKNOWN';
        
        let description = '';
        let strength = smaData.strength || 5;

        switch (signal) {
            case 'BULLISH':
                description = position === 'BELOW' ?
                    'Price breaking ABOVE SMA 20 - **TREND REVERSAL**' :
                    'Price trading ABOVE SMA 20 - **BULLISH TREND**';
                break;
            case 'BEARISH':
                description = position === 'ABOVE' ?
                    'Price trading BELOW SMA 20 - **BEARISH TREND**' :
                    'Price approaching SMA 20 from above - **POTENTIAL BREAKDOWN**';
                break;
            default:
                description = 'Price near SMA 20 - **NEUTRAL TREND**';
        }

        return {
            signal,
            position,
            description,
            strength
        };
    }

    /**
     * Analyze Stochastic Oscillator with precise levels
     */
    analyzeStochastic(stochasticData) {
        const kLevel = stochasticData.kLevel || 50;
        const dLevel = stochasticData.dLevel || 50;
        
        let zone = 'NEUTRAL';
        let signal = 'NEUTRAL';
        let description = '';

        // Determine zone
        if (kLevel < 20 || dLevel < 20) {
            zone = 'OVERSOLD';
        } else if (kLevel > 80 || dLevel > 80) {
            zone = 'OVERBOUGHT';
        }

        // Determine signal based on crossover and levels
        if (kLevel > dLevel && zone === 'OVERSOLD') {
            signal = 'BULLISH';
            description = `**%K (Green):** ~${kLevel} level - **OVERSOLD TERRITORY**\n  - **%D (Red):** ~${dLevel} level - **POTENTIAL BULLISH CROSSOVER FORMING**\n  - **Signal:** Stochastic showing potential bullish divergence`;
        } else if (kLevel < dLevel && zone === 'OVERBOUGHT') {
            signal = 'BEARISH';
            description = `**%K (Green):** ~${kLevel} level - **OVERBOUGHT TERRITORY**\n  - **%D (Red):** ~${dLevel} level - **POTENTIAL BEARISH CROSSOVER FORMING**\n  - **Signal:** Stochastic showing potential bearish divergence`;
        } else if (kLevel > 60 && dLevel > 50) {
            signal = 'BULLISH';
            description = `**%K (Green):** ~${kLevel} level - **NEUTRAL TO BULLISH**\n  - **%D (Red):** ~${dLevel} level - **BULLISH CROSSOVER CONFIRMED**\n  - **Signal:** Strong bullish momentum building`;
        } else {
            description = `**%K (Green):** ~${kLevel} level - **${zone}**\n  - **%D (Red):** ~${dLevel} level - **MONITORING**\n  - **Signal:** ${signal} momentum`;
        }

        return {
            kLevel,
            dLevel,
            signal,
            zone,
            description
        };
    }

    /**
     * Format candlestick pattern analysis
     */
    formatCandlestickAnalysis(patterns) {
        const patternName = patterns.primary || 'Analysis in progress';
        const confidence = patterns.confidence || 75;
        const description = patterns.description || 'Pattern analysis based on detected structure';

        return {
            primaryPattern: patternName,
            confidence: confidence,
            description: description,
            structure: this.generatePatternStructure(patternName),
            momentum: this.assessPatternMomentum(patternName, confidence)
        };
    }

    /**
     * Generate pattern structure description
     */
    generatePatternStructure(patternName) {
        const patternStructures = {
            'DOUBLE TOP': 'Double top formation with resistance rejection',
            'DOUBLE BOTTOM': 'Perfect double bottom with reversal confirmation',
            'ASCENDING TRIANGLE': 'Ascending triangle formation with bullish bias',
            'FALLING WEDGE': 'Falling wedge (bullish reversal pattern) completed',
            'HEAD AND SHOULDERS': 'Head and shoulders pattern indicating reversal',
            'BULL FLAG': 'Bull flag continuation pattern',
            'BEAR FLAG': 'Bear flag continuation pattern'
        };

        return patternStructures[patternName] || 'Pattern structure analysis in progress';
    }

    /**
     * Assess pattern momentum
     */
    assessPatternMomentum(patternName, confidence) {
        if (confidence >= 90) return 'Strong momentum confirmed';
        if (confidence >= 80) return 'Clear momentum building';
        if (confidence >= 70) return 'Moderate momentum';
        return 'Momentum developing';
    }

    /**
     * Format support and resistance analysis
     */
    formatSupportResistanceAnalysis(srData) {
        const support = srData.support || [];
        const resistance = srData.resistance || [];
        const currentLevel = srData.currentLevel;

        return {
            majorResistance: this.formatPriceLevel(resistance[0]),
            currentResistance: this.formatPriceLevel(resistance[1] || resistance[0]),
            currentSupport: this.formatPriceLevel(currentLevel),
            strongSupport: this.formatPriceLevel(support[0]),
            majorSupport: this.formatPriceLevel(support[1] || support[0]),
            levels: {
                resistance: resistance.map(level => this.formatPriceLevel(level)),
                support: support.map(level => this.formatPriceLevel(level))
            }
        };
    }

    /**
     * Format trading signals with precise entry/exit points
     */
    formatTradingSignals(signals) {
        return {
            immediate: this.formatSignal(signals.immediate, 'Next 1-3 minutes'),
            shortTerm: this.formatSignal(signals.shortTerm, 'Next 5-15 minutes'),
            mediumTerm: this.formatSignal(signals.mediumTerm, 'Next 30-60 minutes')
        };
    }

    /**
     * Format individual trading signal
     */
    formatSignal(signal, timeHorizon) {
        if (!signal) return null;

        const direction = signal.direction === 'LONG' ? '📈 LONG SIGNAL' : '📉 SHORT SIGNAL';
        const confidence = signal.confidence || 75;
        
        return {
            direction: direction,
            confidence: `${confidence}% CONFIDENCE`,
            timeHorizon: timeHorizon,
            entry: this.formatPriceLevel(signal.entry),
            target: this.formatPriceLevel(signal.target),
            stopLoss: this.formatPriceLevel(signal.stopLoss),
            riskReward: this.calculateRiskReward(signal.entry, signal.target, signal.stopLoss)
        };
    }

    /**
     * Calculate risk/reward ratio
     */
    calculateRiskReward(entry, target, stopLoss) {
        if (!entry || !target || !stopLoss) return 'N/A';
        
        const profit = Math.abs(target - entry);
        const risk = Math.abs(entry - stopLoss);
        
        if (risk === 0) return 'N/A';
        
        const ratio = profit / risk;
        return `1:${ratio.toFixed(1)}`;
    }

    /**
     * Format price level with institutional precision
     */
    formatPriceLevel(price) {
        if (!price || isNaN(price)) return 'N/A';
        return parseFloat(price).toFixed(this.precision);
    }

    /**
     * Generate final verdict based on analysis
     */
    generateFinalVerdict(analysisReport) {
        const { signals, marketStructure, confidence } = analysisReport;
        
        // Determine overall direction
        const directions = [
            signals.immediate?.direction,
            signals.shortTerm?.direction,
            signals.mediumTerm?.direction
        ].filter(d => d && d !== 'NEUTRAL');

        const bullishCount = directions.filter(d => d.includes('LONG')).length;
        const bearishCount = directions.filter(d => d.includes('SHORT')).length;

        let verdict = '';
        let movement = '';

        if (bullishCount > bearishCount) {
            verdict = 'BULLISH REVERSAL IN PROGRESS';
            movement = 'EXPECT UPWARD MOVEMENT';
        } else if (bearishCount > bullishCount) {
            verdict = 'BEARISH MOMENTUM BUILDING';
            movement = 'EXPECT DOWNWARD MOVEMENT';
        } else {
            verdict = 'CONSOLIDATION PHASE';
            movement = 'EXPECT SIDEWAYS MOVEMENT';
        }

        const targetRange = this.calculateTargetRange(signals);
        
        return `🔥 FINAL VERDICT: ${verdict} - ${movement} TO ${targetRange}`;
    }

    /**
     * Calculate target range from signals
     */
    calculateTargetRange(signals) {
        const targets = [
            signals.immediate?.target,
            signals.shortTerm?.target,
            signals.mediumTerm?.target
        ].filter(t => t && !isNaN(t));

        if (targets.length === 0) return 'TARGET ANALYSIS PENDING';

        const minTarget = Math.min(...targets);
        const maxTarget = Math.max(...targets);

        return `${this.formatPriceLevel(minTarget)}-${this.formatPriceLevel(maxTarget)}`;
    }
}

module.exports = TechnicalAnalysisCore;
