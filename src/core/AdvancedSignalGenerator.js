/**
 * Advanced Signal Generation Engine
 * 
 * Generates high-confidence trading signals with precise entry/exit points,
 * risk management calculations, and detailed confidence scoring.
 */

class AdvancedSignalGenerator {
    constructor(config = {}) {
        this.config = {
            // Confidence thresholds
            minSignalConfidence: config.minSignalConfidence || 80,
            strongSignalConfidence: config.strongSignalConfidence || 90,
            
            // Risk management
            defaultRiskRewardRatio: config.defaultRiskRewardRatio || 2.0,
            maxRiskPercentage: config.maxRiskPercentage || 2.0,
            
            // Signal types
            enablePatternSignals: config.enablePatternSignals !== false,
            enableConfluenceSignals: config.enableConfluenceSignals !== false,
            enableBreakoutSignals: config.enableBreakoutSignals !== false,
            
            // Timeframe preferences
            primaryTimeframe: config.primaryTimeframe || '5m',
            confirmationTimeframes: config.confirmationTimeframes || ['15m', '1h'],
            
            ...config
        };
        
        this.signalHistory = [];
        this.activeSignals = new Map();
    }

    /**
     * Generate comprehensive trading signals
     */
    async generateSignals(analysisData) {
        console.log('🎯 Generating advanced trading signals...');
        
        const startTime = Date.now();
        const generationId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            const signals = [];
            
            // Extract key data
            const { tradingData, chartData, textExtractions } = analysisData;
            
            // Generate pattern-based signals
            if (this.config.enablePatternSignals && chartData && chartData.patterns) {
                const patternSignals = this.generatePatternSignals(chartData.patterns, tradingData);
                signals.push(...patternSignals);
            }
            
            // Generate confluence-based signals
            if (this.config.enableConfluenceSignals) {
                const confluenceSignals = this.generateConfluenceSignals(analysisData);
                signals.push(...confluenceSignals);
            }
            
            // Generate breakout signals
            if (this.config.enableBreakoutSignals && chartData && chartData.supportResistance) {
                const breakoutSignals = this.generateBreakoutSignals(chartData.supportResistance, tradingData);
                signals.push(...breakoutSignals);
            }
            
            // Filter signals by confidence
            const qualitySignals = signals.filter(signal => 
                signal.confidence >= this.config.minSignalConfidence
            );
            
            // Rank and prioritize signals
            const rankedSignals = this.rankSignals(qualitySignals);
            
            // Add risk management to each signal
            const finalSignals = rankedSignals.map(signal => 
                this.enhanceSignalWithRiskManagement(signal, tradingData)
            );
            
            const processingTime = Date.now() - startTime;
            
            const result = {
                generationId,
                success: true,
                processingTime,
                signals: finalSignals,
                metadata: {
                    totalGenerated: signals.length,
                    qualitySignals: qualitySignals.length,
                    finalSignals: finalSignals.length,
                    strongSignals: finalSignals.filter(s => s.confidence >= this.config.strongSignalConfidence).length
                },
                timestamp: new Date().toISOString()
            };
            
            // Store in history
            this.signalHistory.push({
                generationId,
                timestamp: result.timestamp,
                signalCount: finalSignals.length,
                avgConfidence: finalSignals.length > 0 ? 
                    finalSignals.reduce((sum, s) => sum + s.confidence, 0) / finalSignals.length : 0,
                success: true
            });
            
            console.log(`✅ Generated ${finalSignals.length} high-quality signals in ${processingTime}ms`);
            
            return result;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            
            console.error('❌ Signal generation failed:', error.message);
            
            return {
                generationId,
                success: false,
                error: error.message,
                processingTime,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Generate signals from candlestick patterns
     */
    generatePatternSignals(patterns, tradingData) {
        console.log('🕯️ Generating pattern-based signals...');
        
        const signals = [];
        
        patterns.forEach(pattern => {
            if (pattern.confidence < 70) return; // Skip low-confidence patterns
            
            const signal = {
                id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                type: 'pattern',
                source: 'candlestick_pattern',
                direction: this.getPatternDirection(pattern),
                strength: this.getPatternStrength(pattern),
                confidence: this.calculatePatternSignalConfidence(pattern),
                pattern: {
                    name: pattern.name,
                    type: pattern.type,
                    description: pattern.description
                },
                entry: this.calculatePatternEntry(pattern, tradingData),
                timeframe: this.config.primaryTimeframe,
                timestamp: new Date().toISOString(),
                reasoning: `${pattern.name} pattern detected with ${pattern.confidence.toFixed(1)}% confidence`
            };
            
            signals.push(signal);
        });
        
        console.log(`   🕯️ Generated ${signals.length} pattern signals`);
        return signals;
    }

    /**
     * Generate confluence-based signals
     */
    generateConfluenceSignals(analysisData) {
        console.log('🎯 Generating confluence-based signals...');
        
        const signals = [];
        const { tradingData, chartData } = analysisData;
        
        // Check for multiple confirming factors
        const confluenceFactors = this.identifyConfluenceFactors(analysisData);
        
        if (confluenceFactors.length >= 3) { // Minimum 3 factors for confluence
            const bullishFactors = confluenceFactors.filter(f => f.bias === 'bullish').length;
            const bearishFactors = confluenceFactors.filter(f => f.bias === 'bearish').length;
            
            if (bullishFactors > bearishFactors && bullishFactors >= 3) {
                signals.push(this.createConfluenceSignal('UP', confluenceFactors, tradingData));
            } else if (bearishFactors > bullishFactors && bearishFactors >= 3) {
                signals.push(this.createConfluenceSignal('DOWN', confluenceFactors, tradingData));
            }
        }
        
        console.log(`   🎯 Generated ${signals.length} confluence signals`);
        return signals;
    }

    /**
     * Generate breakout signals
     */
    generateBreakoutSignals(supportResistance, tradingData) {
        console.log('📈 Generating breakout signals...');
        
        const signals = [];
        const currentPrice = tradingData.currentPrice;
        
        if (!currentPrice) return signals;
        
        // Check for resistance breakouts (bullish)
        supportResistance.resistance.forEach(level => {
            if (this.isNearLevel(currentPrice, level.price, 0.001)) { // Within 0.1%
                signals.push({
                    id: `breakout_res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    type: 'breakout',
                    source: 'resistance_breakout',
                    direction: 'UP',
                    strength: this.getLevelStrength(level),
                    confidence: this.calculateBreakoutConfidence(level, 'resistance'),
                    entry: level.price * 1.0005, // Slightly above resistance
                    level: level,
                    timeframe: this.config.primaryTimeframe,
                    timestamp: new Date().toISOString(),
                    reasoning: `Potential resistance breakout at ${level.price.toFixed(5)} with ${level.touches} touches`
                });
            }
        });
        
        // Check for support breakdowns (bearish)
        supportResistance.support.forEach(level => {
            if (this.isNearLevel(currentPrice, level.price, 0.001)) { // Within 0.1%
                signals.push({
                    id: `breakdown_sup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    type: 'breakdown',
                    source: 'support_breakdown',
                    direction: 'DOWN',
                    strength: this.getLevelStrength(level),
                    confidence: this.calculateBreakoutConfidence(level, 'support'),
                    entry: level.price * 0.9995, // Slightly below support
                    level: level,
                    timeframe: this.config.primaryTimeframe,
                    timestamp: new Date().toISOString(),
                    reasoning: `Potential support breakdown at ${level.price.toFixed(5)} with ${level.touches} touches`
                });
            }
        });
        
        console.log(`   📈 Generated ${signals.length} breakout signals`);
        return signals;
    }

    /**
     * Rank signals by quality and confidence
     */
    rankSignals(signals) {
        return signals.sort((a, b) => {
            // Primary sort by confidence
            if (b.confidence !== a.confidence) {
                return b.confidence - a.confidence;
            }
            
            // Secondary sort by signal type priority
            const typePriority = {
                'confluence': 3,
                'breakout': 2,
                'pattern': 1
            };
            
            return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
        });
    }

    /**
     * Enhance signal with risk management
     */
    enhanceSignalWithRiskManagement(signal, tradingData) {
        const entry = signal.entry;
        const currentPrice = tradingData.currentPrice || entry;
        
        // Calculate stop loss
        const stopLoss = this.calculateStopLoss(signal, currentPrice);
        
        // Calculate targets
        const targets = this.calculateTargets(signal, entry, stopLoss);
        
        // Calculate position sizing
        const positionSize = this.calculatePositionSize(entry, stopLoss);
        
        // Calculate risk/reward
        const risk = Math.abs(entry - stopLoss);
        const reward = Math.abs(targets[0] - entry);
        const riskReward = reward / risk;
        
        return {
            ...signal,
            entry: entry,
            stopLoss: stopLoss,
            targets: targets,
            riskManagement: {
                positionSize: positionSize,
                riskReward: riskReward,
                riskAmount: risk,
                rewardAmount: reward,
                maxRiskPercent: this.config.maxRiskPercentage
            }
        };
    }

    /**
     * Calculate stop loss based on signal type
     */
    calculateStopLoss(signal, currentPrice) {
        const baseDistance = currentPrice * 0.005; // 0.5% default
        
        switch (signal.type) {
            case 'pattern':
                return signal.direction === 'UP' ? 
                    currentPrice - baseDistance * 1.5 : 
                    currentPrice + baseDistance * 1.5;
                    
            case 'breakout':
                return signal.direction === 'UP' ? 
                    signal.level.price * 0.999 : 
                    signal.level.price * 1.001;
                    
            case 'confluence':
                return signal.direction === 'UP' ? 
                    currentPrice - baseDistance * 2 : 
                    currentPrice + baseDistance * 2;
                    
            default:
                return signal.direction === 'UP' ? 
                    currentPrice - baseDistance : 
                    currentPrice + baseDistance;
        }
    }

    /**
     * Calculate target levels
     */
    calculateTargets(signal, entry, stopLoss) {
        const risk = Math.abs(entry - stopLoss);
        const direction = signal.direction === 'UP' ? 1 : -1;
        
        return [
            entry + (risk * this.config.defaultRiskRewardRatio * direction), // Primary target
            entry + (risk * this.config.defaultRiskRewardRatio * 1.5 * direction), // Extended target
            entry + (risk * this.config.defaultRiskRewardRatio * 2 * direction)  // Maximum target
        ];
    }

    /**
     * Calculate position size based on risk
     */
    calculatePositionSize(entry, stopLoss) {
        const riskPerTrade = this.config.maxRiskPercentage / 100;
        const priceRisk = Math.abs(entry - stopLoss);
        
        // This would typically use account balance
        // For now, return a percentage recommendation
        return Math.min(riskPerTrade / (priceRisk / entry), 0.1); // Max 10% position
    }

    /**
     * Helper methods for signal generation
     */
    getPatternDirection(pattern) {
        if (pattern.signal === 'bullish_reversal' || pattern.signal === 'bullish') return 'UP';
        if (pattern.signal === 'bearish_reversal' || pattern.signal === 'bearish') return 'DOWN';
        return 'NEUTRAL';
    }

    getPatternStrength(pattern) {
        if (pattern.confidence >= 90) return 'very_strong';
        if (pattern.confidence >= 80) return 'strong';
        if (pattern.confidence >= 70) return 'moderate';
        return 'weak';
    }

    calculatePatternSignalConfidence(pattern) {
        return Math.min(pattern.confidence + 5, 95); // Slight boost for pattern signals
    }

    isNearLevel(price, level, tolerance) {
        return Math.abs(price - level) / level <= tolerance;
    }

    getLevelStrength(level) {
        if (level.touches >= 5) return 'very_strong';
        if (level.touches >= 4) return 'strong';
        if (level.touches >= 3) return 'moderate';
        return 'weak';
    }

    calculateBreakoutConfidence(level, type) {
        let confidence = 60; // Base confidence
        
        // More touches = higher confidence
        confidence += Math.min(level.touches * 5, 25);
        
        // Level strength bonus
        if (level.strength === 'very_strong') confidence += 10;
        else if (level.strength === 'strong') confidence += 5;
        
        return Math.min(confidence, 95);
    }
}

module.exports = { AdvancedSignalGenerator };
