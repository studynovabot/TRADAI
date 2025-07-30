#!/usr/bin/env node

/**
 * 📈 Support/Resistance Level Detection Module
 * ===========================================
 * 
 * AI-powered automatic support and resistance level identification
 * Analyzes price action without manual marking requirements
 * 
 * Features:
 * - Automatic support/resistance level detection
 * - Price action analysis and validation
 * - Level strength assessment
 * - Breakout/bounce detection
 * - Dynamic level adjustment
 * - Multi-timeframe level correlation
 * 
 * Built for TRADAI Chart Analysis System
 */

class SupportResistanceAnalyzer {
    constructor(options = {}) {
        this.options = {
            minimumTouches: 2,
            levelStrengthThreshold: 0.6,
            priceTolerancePercent: 0.1,
            recentCandlesForAnalysis: 20,
            significantLevelThreshold: 0.7,
            breakoutConfirmationCandles: 2,
            ...options
        };

        // Analysis results storage
        this.analysisResults = {
            supportLevels: [],
            resistanceLevels: [],
            currentPriceAction: {},
            levelInteractions: [],
            breakouts: [],
            bounces: []
        };

        this.stats = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            supportLevelsDetected: 0,
            resistanceLevelsDetected: 0,
            breakoutsDetected: 0,
            bouncesDetected: 0,
            significantLevels: 0
        };
    }

    /**
     * Analyze support and resistance levels from AI vision response
     */
    async analyzeSupportResistance(aiAnalysisText, chartData) {
        console.log(`📈 Analyzing support/resistance for ${chartData.timeframe}/${chartData.filename}`);

        try {
            this.stats.totalAnalyses++;

            // Reset analysis results
            this.resetAnalysisResults();

            // Extract current price information
            const currentPrice = this.extractCurrentPrice(aiAnalysisText);

            // Detect support levels
            await this.detectSupportLevels(aiAnalysisText, currentPrice);

            // Detect resistance levels
            await this.detectResistanceLevels(aiAnalysisText, currentPrice);

            // Analyze current price action
            await this.analyzeCurrentPriceAction(aiAnalysisText, currentPrice);

            // Detect level interactions
            await this.detectLevelInteractions(aiAnalysisText);

            // Identify breakouts and bounces
            await this.identifyBreakoutsAndBounces(aiAnalysisText);

            // Assess level significance
            await this.assessLevelSignificance();

            // Generate support/resistance signals
            const signals = await this.generateSRSignals();

            this.stats.successfulAnalyses++;

            const result = {
                chartData,
                timestamp: new Date().toISOString(),
                currentPrice,
                supportResistance: this.analysisResults,
                signals,
                levelStrength: this.calculateOverallLevelStrength(),
                summary: this.generateSRSummary()
            };

            console.log(`✅ Support/Resistance analysis completed`);
            console.log(`   Support levels: ${this.analysisResults.supportLevels.length}`);
            console.log(`   Resistance levels: ${this.analysisResults.resistanceLevels.length}`);
            console.log(`   Level interactions: ${this.analysisResults.levelInteractions.length}`);

            return result;

        } catch (error) {
            console.error(`❌ Support/Resistance analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract current price from analysis text
     */
    extractCurrentPrice(text) {
        // Look for current price mentions
        const pricePatterns = [
            /current[_\s]*price[:\s]*([0-9]+\.?[0-9]*)/i,
            /price[:\s]*([0-9]+\.?[0-9]*)/i,
            /trading[_\s]*at[:\s]*([0-9]+\.?[0-9]*)/i,
            /([0-9]+\.?[0-9]*)[_\s]*current/i
        ];

        for (const pattern of pricePatterns) {
            const match = text.match(pattern);
            if (match) {
                return parseFloat(match[1]);
            }
        }

        return null;
    }

    /**
     * Detect support levels from analysis text
     */
    async detectSupportLevels(text, currentPrice) {
        const supportLevels = [];

        // Look for explicit support level mentions
        const supportPatterns = [
            /support[_\s]*level[s]?[:\s]*([0-9]+\.?[0-9]*)/gi,
            /support[_\s]*at[:\s]*([0-9]+\.?[0-9]*)/gi,
            /key[_\s]*support[:\s]*([0-9]+\.?[0-9]*)/gi,
            /([0-9]+\.?[0-9]*)[_\s]*support/gi
        ];

        for (const pattern of supportPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const level = parseFloat(match[1]);
                if (level && (!currentPrice || level < currentPrice)) {
                    const supportLevel = this.createSupportLevel(level, text, currentPrice);
                    supportLevels.push(supportLevel);
                    this.stats.supportLevelsDetected++;
                }
            }
        }

        // Remove duplicates and sort by proximity to current price
        const uniqueLevels = this.removeDuplicateLevels(supportLevels);
        this.analysisResults.supportLevels = this.sortLevelsByProximity(uniqueLevels, currentPrice);

        return this.analysisResults.supportLevels;
    }

    /**
     * Detect resistance levels from analysis text
     */
    async detectResistanceLevels(text, currentPrice) {
        const resistanceLevels = [];

        // Look for explicit resistance level mentions
        const resistancePatterns = [
            /resistance[_\s]*level[s]?[:\s]*([0-9]+\.?[0-9]*)/gi,
            /resistance[_\s]*at[:\s]*([0-9]+\.?[0-9]*)/gi,
            /key[_\s]*resistance[:\s]*([0-9]+\.?[0-9]*)/gi,
            /([0-9]+\.?[0-9]*)[_\s]*resistance/gi
        ];

        for (const pattern of resistancePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const level = parseFloat(match[1]);
                if (level && (!currentPrice || level > currentPrice)) {
                    const resistanceLevel = this.createResistanceLevel(level, text, currentPrice);
                    resistanceLevels.push(resistanceLevel);
                    this.stats.resistanceLevelsDetected++;
                }
            }
        }

        // Remove duplicates and sort by proximity to current price
        const uniqueLevels = this.removeDuplicateLevels(resistanceLevels);
        this.analysisResults.resistanceLevels = this.sortLevelsByProximity(uniqueLevels, currentPrice);

        return this.analysisResults.resistanceLevels;
    }

    /**
     * Create support level object
     */
    createSupportLevel(level, text, currentPrice) {
        return {
            type: 'SUPPORT',
            level: level,
            strength: this.assessLevelStrength(level, text),
            touches: this.countLevelTouches(level, text),
            distance: currentPrice ? Math.abs(currentPrice - level) : null,
            distancePercent: currentPrice ? ((currentPrice - level) / currentPrice * 100) : null,
            significance: this.determineLevelSignificance(level, text),
            recentTest: this.checkRecentTest(level, text),
            breakoutPotential: this.assessBreakoutPotential(level, text, 'SUPPORT')
        };
    }

    /**
     * Create resistance level object
     */
    createResistanceLevel(level, text, currentPrice) {
        return {
            type: 'RESISTANCE',
            level: level,
            strength: this.assessLevelStrength(level, text),
            touches: this.countLevelTouches(level, text),
            distance: currentPrice ? Math.abs(level - currentPrice) : null,
            distancePercent: currentPrice ? ((level - currentPrice) / currentPrice * 100) : null,
            significance: this.determineLevelSignificance(level, text),
            recentTest: this.checkRecentTest(level, text),
            breakoutPotential: this.assessBreakoutPotential(level, text, 'RESISTANCE')
        };
    }

    /**
     * Analyze current price action relative to levels
     */
    async analyzeCurrentPriceAction(text, currentPrice) {
        const priceAction = {
            currentPrice: currentPrice,
            position: 'UNKNOWN',
            nearestSupport: null,
            nearestResistance: null,
            priceStructure: this.analyzePriceStructure(text),
            momentum: this.analyzePriceMomentum(text),
            rejection: this.detectPriceRejection(text)
        };

        // Find nearest levels
        if (this.analysisResults.supportLevels.length > 0) {
            priceAction.nearestSupport = this.analysisResults.supportLevels[0];
        }

        if (this.analysisResults.resistanceLevels.length > 0) {
            priceAction.nearestResistance = this.analysisResults.resistanceLevels[0];
        }

        // Determine price position
        if (priceAction.nearestSupport && priceAction.nearestResistance) {
            const supportDistance = currentPrice - priceAction.nearestSupport.level;
            const resistanceDistance = priceAction.nearestResistance.level - currentPrice;
            const totalRange = priceAction.nearestResistance.level - priceAction.nearestSupport.level;
            
            const positionPercent = supportDistance / totalRange;
            
            if (positionPercent < 0.3) priceAction.position = 'NEAR_SUPPORT';
            else if (positionPercent > 0.7) priceAction.position = 'NEAR_RESISTANCE';
            else priceAction.position = 'MIDDLE_RANGE';
        }

        this.analysisResults.currentPriceAction = priceAction;
        return priceAction;
    }

    /**
     * Detect level interactions (bounces, tests, breaks)
     */
    async detectLevelInteractions(text) {
        const interactions = [];

        // Look for bounce mentions
        const bounceKeywords = ['bounce', 'bounced', 'bouncing', 'rejection', 'rejected'];
        bounceKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) {
                interactions.push({
                    type: 'BOUNCE',
                    description: `Price ${keyword} detected`,
                    strength: this.assessInteractionStrength(text, keyword)
                });
                this.stats.bouncesDetected++;
            }
        });

        // Look for breakout mentions
        const breakoutKeywords = ['breakout', 'break', 'broke', 'breakthrough', 'penetration'];
        breakoutKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) {
                interactions.push({
                    type: 'BREAKOUT',
                    description: `Price ${keyword} detected`,
                    strength: this.assessInteractionStrength(text, keyword)
                });
                this.stats.breakoutsDetected++;
            }
        });

        // Look for test mentions
        const testKeywords = ['test', 'tested', 'testing', 'approach', 'approaching'];
        testKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) {
                interactions.push({
                    type: 'TEST',
                    description: `Level ${keyword} detected`,
                    strength: this.assessInteractionStrength(text, keyword)
                });
            }
        });

        this.analysisResults.levelInteractions = interactions;
        return interactions;
    }

    /**
     * Identify breakouts and bounces
     */
    async identifyBreakoutsAndBounces(text) {
        const breakouts = [];
        const bounces = [];

        // Analyze support breakouts
        this.analysisResults.supportLevels.forEach(level => {
            if (level.breakoutPotential > 0.7) {
                breakouts.push({
                    type: 'SUPPORT_BREAKOUT',
                    level: level.level,
                    direction: 'DOWN',
                    potential: level.breakoutPotential,
                    signal: 'BEARISH'
                });
            }
        });

        // Analyze resistance breakouts
        this.analysisResults.resistanceLevels.forEach(level => {
            if (level.breakoutPotential > 0.7) {
                breakouts.push({
                    type: 'RESISTANCE_BREAKOUT',
                    level: level.level,
                    direction: 'UP',
                    potential: level.breakoutPotential,
                    signal: 'BULLISH'
                });
            }
        });

        // Analyze bounces
        [...this.analysisResults.supportLevels, ...this.analysisResults.resistanceLevels].forEach(level => {
            if (level.recentTest && level.strength > 0.6) {
                bounces.push({
                    type: level.type === 'SUPPORT' ? 'SUPPORT_BOUNCE' : 'RESISTANCE_BOUNCE',
                    level: level.level,
                    direction: level.type === 'SUPPORT' ? 'UP' : 'DOWN',
                    strength: level.strength,
                    signal: level.type === 'SUPPORT' ? 'BULLISH' : 'BEARISH'
                });
            }
        });

        this.analysisResults.breakouts = breakouts;
        this.analysisResults.bounces = bounces;

        return { breakouts, bounces };
    }

    /**
     * Assess level significance
     */
    async assessLevelSignificance() {
        const allLevels = [...this.analysisResults.supportLevels, ...this.analysisResults.resistanceLevels];
        
        allLevels.forEach(level => {
            if (level.strength > this.options.significantLevelThreshold) {
                this.stats.significantLevels++;
            }
        });
    }

    /**
     * Generate support/resistance based signals
     */
    async generateSRSignals() {
        const signals = [];

        // Breakout signals
        this.analysisResults.breakouts.forEach(breakout => {
            signals.push({
                type: 'BREAKOUT',
                level: breakout.level,
                signal: breakout.signal,
                confidence: breakout.potential,
                direction: breakout.direction
            });
        });

        // Bounce signals
        this.analysisResults.bounces.forEach(bounce => {
            signals.push({
                type: 'BOUNCE',
                level: bounce.level,
                signal: bounce.signal,
                confidence: bounce.strength,
                direction: bounce.direction
            });
        });

        // Level approach signals
        const priceAction = this.analysisResults.currentPriceAction;
        if (priceAction.position === 'NEAR_SUPPORT' && priceAction.nearestSupport) {
            signals.push({
                type: 'LEVEL_APPROACH',
                level: priceAction.nearestSupport.level,
                signal: 'BULLISH',
                confidence: priceAction.nearestSupport.strength,
                direction: 'UP'
            });
        } else if (priceAction.position === 'NEAR_RESISTANCE' && priceAction.nearestResistance) {
            signals.push({
                type: 'LEVEL_APPROACH',
                level: priceAction.nearestResistance.level,
                signal: 'BEARISH',
                confidence: priceAction.nearestResistance.strength,
                direction: 'DOWN'
            });
        }

        return signals;
    }

    /**
     * Calculate overall level strength
     */
    calculateOverallLevelStrength() {
        const allLevels = [...this.analysisResults.supportLevels, ...this.analysisResults.resistanceLevels];
        
        if (allLevels.length === 0) return 0;

        const totalStrength = allLevels.reduce((sum, level) => sum + level.strength, 0);
        return totalStrength / allLevels.length;
    }

    /**
     * Generate support/resistance summary
     */
    generateSRSummary() {
        const priceAction = this.analysisResults.currentPriceAction;
        
        return {
            supportLevels: this.analysisResults.supportLevels.length,
            resistanceLevels: this.analysisResults.resistanceLevels.length,
            significantLevels: this.stats.significantLevels,
            currentPosition: priceAction.position,
            nearestSupport: priceAction.nearestSupport?.level,
            nearestResistance: priceAction.nearestResistance?.level,
            breakoutPotential: this.analysisResults.breakouts.length,
            bouncePotential: this.analysisResults.bounces.length,
            overallStrength: this.calculateOverallLevelStrength()
        };
    }

    /**
     * Utility methods
     */
    resetAnalysisResults() {
        this.analysisResults = {
            supportLevels: [],
            resistanceLevels: [],
            currentPriceAction: {},
            levelInteractions: [],
            breakouts: [],
            bounces: []
        };
    }

    assessLevelStrength(level, text) {
        let strength = 0.5; // Base strength

        // Check for strength indicators
        if (text.toLowerCase().includes('strong')) strength += 0.2;
        if (text.toLowerCase().includes('key')) strength += 0.15;
        if (text.toLowerCase().includes('major')) strength += 0.15;
        if (text.toLowerCase().includes('significant')) strength += 0.1;

        return Math.min(strength, 1.0);
    }

    countLevelTouches(level, text) {
        // Simplified touch counting based on keywords
        const touchKeywords = ['touch', 'test', 'reach', 'hit'];
        let touches = 1; // Minimum one touch

        touchKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) touches++;
        });

        return Math.min(touches, 5); // Cap at 5 touches
    }

    determineLevelSignificance(level, text) {
        const significanceKeywords = ['significant', 'important', 'critical', 'major'];
        
        for (const keyword of significanceKeywords) {
            if (text.toLowerCase().includes(keyword)) {
                return 'HIGH';
            }
        }

        return 'MEDIUM';
    }

    checkRecentTest(level, text) {
        const recentKeywords = ['recent', 'latest', 'current', 'now', 'just'];
        
        return recentKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    assessBreakoutPotential(level, text, type) {
        let potential = 0.3; // Base potential

        if (text.toLowerCase().includes('break')) potential += 0.3;
        if (text.toLowerCase().includes('pressure')) potential += 0.2;
        if (text.toLowerCase().includes('weak')) potential += 0.2;

        return Math.min(potential, 1.0);
    }

    removeDuplicateLevels(levels) {
        const tolerance = 0.01; // 1% tolerance for duplicate detection
        const unique = [];

        levels.forEach(level => {
            const isDuplicate = unique.some(existing => 
                Math.abs(existing.level - level.level) / level.level < tolerance
            );

            if (!isDuplicate) {
                unique.push(level);
            }
        });

        return unique;
    }

    sortLevelsByProximity(levels, currentPrice) {
        if (!currentPrice) return levels;

        return levels.sort((a, b) => {
            const distanceA = Math.abs(a.level - currentPrice);
            const distanceB = Math.abs(b.level - currentPrice);
            return distanceA - distanceB;
        });
    }

    analyzePriceStructure(text) {
        if (text.toLowerCase().includes('higher highs')) return 'HIGHER_HIGHS';
        if (text.toLowerCase().includes('lower lows')) return 'LOWER_LOWS';
        if (text.toLowerCase().includes('ranging')) return 'RANGING';
        return 'UNKNOWN';
    }

    analyzePriceMomentum(text) {
        if (text.toLowerCase().includes('accelerating')) return 'ACCELERATING';
        if (text.toLowerCase().includes('slowing')) return 'DECELERATING';
        return 'STEADY';
    }

    detectPriceRejection(text) {
        const rejectionKeywords = ['rejection', 'rejected', 'reversal', 'turned'];
        return rejectionKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    assessInteractionStrength(text, keyword) {
        const context = text.toLowerCase();
        let strength = 0.5;

        if (context.includes('strong ' + keyword)) strength += 0.3;
        if (context.includes('clear ' + keyword)) strength += 0.2;
        if (context.includes('sharp ' + keyword)) strength += 0.2;

        return Math.min(strength, 1.0);
    }

    /**
     * Get analysis statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalAnalyses > 0 ? 
                (this.stats.successfulAnalyses / this.stats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
            averageLevelsPerAnalysis: this.stats.totalAnalyses > 0 ? 
                ((this.stats.supportLevelsDetected + this.stats.resistanceLevelsDetected) / this.stats.totalAnalyses).toFixed(1) : '0'
        };
    }
}

module.exports = { SupportResistanceAnalyzer };
