#!/usr/bin/env node

/**
 * 🕯️ Pattern Recognition & Trend Analysis Module
 * ==============================================
 * 
 * Advanced pattern recognition for candlestick patterns and trend analysis
 * Identifies doji, hammer, engulfing, shooting star, and other patterns
 * 
 * Features:
 * - Comprehensive candlestick pattern recognition
 * - Chart pattern detection (triangles, channels, etc.)
 * - Trend analysis with strength assessment
 * - Pattern reliability scoring
 * - Multi-pattern confluence detection
 * - Reversal and continuation pattern identification
 * 
 * Built for TRADAI Chart Analysis System
 */

class PatternRecognitionAnalyzer {
    constructor(options = {}) {
        this.options = {
            patternConfidenceThreshold: 0.7,
            trendStrengthThreshold: 0.6,
            minimumPatternCount: 2,
            reversalPatternWeight: 0.8,
            continuationPatternWeight: 0.6,
            ...options
        };

        // Pattern definitions and characteristics
        this.candlestickPatterns = {
            bullish: [
                'hammer', 'inverted_hammer', 'bullish_engulfing', 'piercing_line',
                'morning_star', 'three_white_soldiers', 'bullish_harami', 'dragonfly_doji'
            ],
            bearish: [
                'shooting_star', 'hanging_man', 'bearish_engulfing', 'dark_cloud_cover',
                'evening_star', 'three_black_crows', 'bearish_harami', 'gravestone_doji'
            ],
            neutral: [
                'doji', 'spinning_top', 'long_legged_doji'
            ]
        };

        this.chartPatterns = {
            reversal: [
                'head_and_shoulders', 'inverse_head_and_shoulders', 'double_top', 'double_bottom',
                'triple_top', 'triple_bottom', 'rising_wedge', 'falling_wedge'
            ],
            continuation: [
                'flag', 'pennant', 'triangle', 'rectangle', 'cup_and_handle'
            ]
        };

        // Analysis results storage
        this.analysisResults = {
            candlestickPatterns: [],
            chartPatterns: [],
            trendAnalysis: {},
            patternConfluence: {},
            signals: []
        };

        this.stats = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            patternsDetected: 0,
            bullishPatterns: 0,
            bearishPatterns: 0,
            reversalPatterns: 0,
            continuationPatterns: 0,
            trendConfirmations: 0
        };
    }

    /**
     * Analyze patterns from AI vision response
     */
    async analyzePatterns(aiAnalysisText, chartData) {
        console.log(`🕯️ Analyzing patterns for ${chartData.timeframe}/${chartData.filename}`);

        try {
            this.stats.totalAnalyses++;

            // Reset analysis results
            this.resetAnalysisResults();

            // Analyze candlestick patterns
            await this.analyzeCandlestickPatterns(aiAnalysisText);

            // Analyze chart patterns
            await this.analyzeChartPatterns(aiAnalysisText);

            // Perform trend analysis
            await this.performTrendAnalysis(aiAnalysisText);

            // Detect pattern confluence
            await this.detectPatternConfluence();

            // Generate pattern-based signals
            const signals = await this.generatePatternSignals();

            // Calculate pattern strength
            const patternStrength = this.calculatePatternStrength();

            this.stats.successfulAnalyses++;

            const result = {
                chartData,
                timestamp: new Date().toISOString(),
                patterns: this.analysisResults,
                signals,
                patternStrength,
                confluence: this.analysisResults.patternConfluence,
                summary: this.generatePatternSummary()
            };

            console.log(`✅ Pattern analysis completed`);
            console.log(`   Patterns detected: ${this.analysisResults.candlestickPatterns.length + this.analysisResults.chartPatterns.length}`);
            console.log(`   Pattern strength: ${patternStrength.toFixed(2)}`);

            return result;

        } catch (error) {
            console.error(`❌ Pattern analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Analyze candlestick patterns
     */
    async analyzeCandlestickPatterns(analysisText) {
        const detectedPatterns = [];

        // Check for each candlestick pattern type
        for (const [category, patterns] of Object.entries(this.candlestickPatterns)) {
            for (const pattern of patterns) {
                const detection = this.detectCandlestickPattern(analysisText, pattern, category);
                if (detection.detected) {
                    detectedPatterns.push(detection);
                    this.stats.patternsDetected++;
                    
                    if (category === 'bullish') this.stats.bullishPatterns++;
                    else if (category === 'bearish') this.stats.bearishPatterns++;
                }
            }
        }

        this.analysisResults.candlestickPatterns = detectedPatterns;
        return detectedPatterns;
    }

    /**
     * Detect specific candlestick pattern
     */
    detectCandlestickPattern(text, patternName, category) {
        const pattern = {
            name: patternName,
            category: category,
            detected: false,
            confidence: 0,
            location: 'UNKNOWN',
            significance: 'LOW',
            signal: 'NEUTRAL'
        };

        // Pattern-specific detection logic
        const patternKeywords = this.getPatternKeywords(patternName);
        let detectionScore = 0;

        for (const keyword of patternKeywords) {
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
                detectionScore += keyword.length > 4 ? 0.3 : 0.2; // Longer keywords get higher weight
                pattern.detected = true;
            }
        }

        if (pattern.detected) {
            pattern.confidence = Math.min(detectionScore, 1.0);
            pattern.signal = this.getPatternSignal(patternName, category);
            pattern.significance = this.assessPatternSignificance(patternName, text);
            pattern.location = this.determinePatternLocation(text);
        }

        return pattern;
    }

    /**
     * Get keywords for pattern detection
     */
    getPatternKeywords(patternName) {
        const keywords = {
            'hammer': ['hammer', 'bullish hammer'],
            'shooting_star': ['shooting star', 'bearish shooting'],
            'doji': ['doji', 'indecision'],
            'bullish_engulfing': ['bullish engulfing', 'engulfing bullish'],
            'bearish_engulfing': ['bearish engulfing', 'engulfing bearish'],
            'morning_star': ['morning star', 'bullish morning'],
            'evening_star': ['evening star', 'bearish evening'],
            'hanging_man': ['hanging man', 'bearish hanging'],
            'inverted_hammer': ['inverted hammer', 'bullish inverted'],
            'piercing_line': ['piercing line', 'bullish piercing'],
            'dark_cloud_cover': ['dark cloud', 'bearish cloud'],
            'three_white_soldiers': ['three white soldiers', 'three soldiers'],
            'three_black_crows': ['three black crows', 'three crows'],
            'dragonfly_doji': ['dragonfly doji', 'dragonfly'],
            'gravestone_doji': ['gravestone doji', 'gravestone'],
            'spinning_top': ['spinning top', 'spinning'],
            'long_legged_doji': ['long legged doji', 'long doji']
        };

        return keywords[patternName] || [patternName.replace('_', ' ')];
    }

    /**
     * Analyze chart patterns
     */
    async analyzeChartPatterns(analysisText) {
        const detectedPatterns = [];

        // Check for chart patterns
        for (const [category, patterns] of Object.entries(this.chartPatterns)) {
            for (const pattern of patterns) {
                const detection = this.detectChartPattern(analysisText, pattern, category);
                if (detection.detected) {
                    detectedPatterns.push(detection);
                    
                    if (category === 'reversal') this.stats.reversalPatterns++;
                    else if (category === 'continuation') this.stats.continuationPatterns++;
                }
            }
        }

        this.analysisResults.chartPatterns = detectedPatterns;
        return detectedPatterns;
    }

    /**
     * Detect specific chart pattern
     */
    detectChartPattern(text, patternName, category) {
        const pattern = {
            name: patternName,
            category: category,
            detected: false,
            confidence: 0,
            stage: 'UNKNOWN',
            signal: 'NEUTRAL',
            target: null
        };

        const patternKeywords = this.getChartPatternKeywords(patternName);
        let detectionScore = 0;

        for (const keyword of patternKeywords) {
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
                detectionScore += 0.4;
                pattern.detected = true;
            }
        }

        if (pattern.detected) {
            pattern.confidence = Math.min(detectionScore, 1.0);
            pattern.signal = this.getChartPatternSignal(patternName, category);
            pattern.stage = this.determinePatternStage(text, patternName);
        }

        return pattern;
    }

    /**
     * Get keywords for chart pattern detection
     */
    getChartPatternKeywords(patternName) {
        const keywords = {
            'head_and_shoulders': ['head and shoulders', 'head shoulders'],
            'inverse_head_and_shoulders': ['inverse head', 'inverted head'],
            'double_top': ['double top', 'twin peaks'],
            'double_bottom': ['double bottom', 'twin bottoms'],
            'triple_top': ['triple top', 'three peaks'],
            'triple_bottom': ['triple bottom', 'three bottoms'],
            'rising_wedge': ['rising wedge', 'ascending wedge'],
            'falling_wedge': ['falling wedge', 'descending wedge'],
            'flag': ['flag pattern', 'bull flag', 'bear flag'],
            'pennant': ['pennant', 'triangle pennant'],
            'triangle': ['triangle', 'ascending triangle', 'descending triangle'],
            'rectangle': ['rectangle', 'trading range'],
            'cup_and_handle': ['cup and handle', 'cup handle']
        };

        return keywords[patternName] || [patternName.replace('_', ' ')];
    }

    /**
     * Perform comprehensive trend analysis
     */
    async performTrendAnalysis(analysisText) {
        const trendAnalysis = {
            direction: this.extractTrendDirection(analysisText),
            strength: this.assessTrendStrength(analysisText),
            duration: this.estimateTrendDuration(analysisText),
            momentum: this.analyzeTrendMomentum(analysisText),
            reversalSignals: this.detectReversalSignals(analysisText),
            continuationSignals: this.detectContinuationSignals(analysisText)
        };

        this.analysisResults.trendAnalysis = trendAnalysis;

        if (trendAnalysis.strength > this.options.trendStrengthThreshold) {
            this.stats.trendConfirmations++;
        }

        return trendAnalysis;
    }

    /**
     * Extract trend direction from analysis
     */
    extractTrendDirection(text) {
        const bullishKeywords = ['uptrend', 'bullish', 'rising', 'ascending', 'higher highs'];
        const bearishKeywords = ['downtrend', 'bearish', 'falling', 'descending', 'lower lows'];
        const sidewaysKeywords = ['sideways', 'ranging', 'consolidation', 'horizontal'];

        let bullishScore = 0;
        let bearishScore = 0;
        let sidewaysScore = 0;

        bullishKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) bullishScore++;
        });

        bearishKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) bearishScore++;
        });

        sidewaysKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) sidewaysScore++;
        });

        if (bullishScore > bearishScore && bullishScore > sidewaysScore) return 'BULLISH';
        if (bearishScore > bullishScore && bearishScore > sidewaysScore) return 'BEARISH';
        if (sidewaysScore > 0) return 'SIDEWAYS';
        return 'UNKNOWN';
    }

    /**
     * Assess trend strength
     */
    assessTrendStrength(text) {
        const strongKeywords = ['strong', 'powerful', 'steep', 'aggressive'];
        const weakKeywords = ['weak', 'shallow', 'gentle', 'mild'];
        const moderateKeywords = ['moderate', 'steady', 'consistent'];

        let strengthScore = 0.5; // Default moderate

        strongKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) strengthScore += 0.2;
        });

        weakKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) strengthScore -= 0.2;
        });

        return Math.max(0, Math.min(1, strengthScore));
    }

    /**
     * Detect pattern confluence
     */
    async detectPatternConfluence() {
        const allPatterns = [
            ...this.analysisResults.candlestickPatterns,
            ...this.analysisResults.chartPatterns
        ];

        const bullishPatterns = allPatterns.filter(p => 
            p.signal === 'BULLISH' && p.confidence > this.options.patternConfidenceThreshold
        );

        const bearishPatterns = allPatterns.filter(p => 
            p.signal === 'BEARISH' && p.confidence > this.options.patternConfidenceThreshold
        );

        const confluence = {
            bullishCount: bullishPatterns.length,
            bearishCount: bearishPatterns.length,
            totalPatterns: allPatterns.length,
            direction: bullishPatterns.length > bearishPatterns.length ? 'BULLISH' : 
                      bearishPatterns.length > bullishPatterns.length ? 'BEARISH' : 'NEUTRAL',
            strength: Math.max(bullishPatterns.length, bearishPatterns.length) / allPatterns.length,
            patterns: {
                bullish: bullishPatterns,
                bearish: bearishPatterns
            }
        };

        this.analysisResults.patternConfluence = confluence;
        return confluence;
    }

    /**
     * Generate pattern-based signals
     */
    async generatePatternSignals() {
        const signals = [];

        // Reversal pattern signals
        const reversalPatterns = this.analysisResults.chartPatterns.filter(p => p.category === 'reversal');
        reversalPatterns.forEach(pattern => {
            if (pattern.confidence > this.options.patternConfidenceThreshold) {
                signals.push({
                    type: 'REVERSAL_PATTERN',
                    pattern: pattern.name,
                    signal: pattern.signal,
                    confidence: pattern.confidence,
                    weight: this.options.reversalPatternWeight
                });
            }
        });

        // Strong candlestick pattern signals
        const strongCandlestickPatterns = this.analysisResults.candlestickPatterns.filter(p => 
            p.confidence > this.options.patternConfidenceThreshold && p.significance !== 'LOW'
        );

        strongCandlestickPatterns.forEach(pattern => {
            signals.push({
                type: 'CANDLESTICK_PATTERN',
                pattern: pattern.name,
                signal: pattern.signal,
                confidence: pattern.confidence,
                weight: 0.7
            });
        });

        // Confluence signals
        const confluence = this.analysisResults.patternConfluence;
        if (Math.max(confluence.bullishCount, confluence.bearishCount) >= this.options.minimumPatternCount) {
            signals.push({
                type: 'PATTERN_CONFLUENCE',
                pattern: 'MULTIPLE',
                signal: confluence.direction,
                confidence: confluence.strength,
                weight: 0.9,
                count: Math.max(confluence.bullishCount, confluence.bearishCount)
            });
        }

        this.analysisResults.signals = signals;
        return signals;
    }

    /**
     * Calculate overall pattern strength
     */
    calculatePatternStrength() {
        const totalPatterns = this.analysisResults.candlestickPatterns.length + this.analysisResults.chartPatterns.length;
        const confluence = this.analysisResults.patternConfluence;
        const trendStrength = this.analysisResults.trendAnalysis.strength || 0;

        if (totalPatterns === 0) return 0;

        const patternScore = Math.min(totalPatterns / 5, 1); // Normalize to max 5 patterns
        const confluenceScore = confluence.strength || 0;
        const trendScore = trendStrength;

        return (patternScore * 0.4) + (confluenceScore * 0.4) + (trendScore * 0.2);
    }

    /**
     * Generate pattern summary
     */
    generatePatternSummary() {
        const candlestickCount = this.analysisResults.candlestickPatterns.length;
        const chartPatternCount = this.analysisResults.chartPatterns.length;
        const confluence = this.analysisResults.patternConfluence;

        return {
            candlestickPatterns: candlestickCount,
            chartPatterns: chartPatternCount,
            totalPatterns: candlestickCount + chartPatternCount,
            confluenceDirection: confluence.direction,
            confluenceStrength: confluence.strength,
            patternStrength: this.calculatePatternStrength(),
            trendDirection: this.analysisResults.trendAnalysis.direction,
            trendStrength: this.analysisResults.trendAnalysis.strength
        };
    }

    /**
     * Utility methods
     */
    resetAnalysisResults() {
        this.analysisResults = {
            candlestickPatterns: [],
            chartPatterns: [],
            trendAnalysis: {},
            patternConfluence: {},
            signals: []
        };
    }

    getPatternSignal(patternName, category) {
        if (category === 'bullish') return 'BULLISH';
        if (category === 'bearish') return 'BEARISH';
        return 'NEUTRAL';
    }

    getChartPatternSignal(patternName, category) {
        const reversalPatterns = {
            'head_and_shoulders': 'BEARISH',
            'inverse_head_and_shoulders': 'BULLISH',
            'double_top': 'BEARISH',
            'double_bottom': 'BULLISH',
            'rising_wedge': 'BEARISH',
            'falling_wedge': 'BULLISH'
        };

        return reversalPatterns[patternName] || 'NEUTRAL';
    }

    assessPatternSignificance(patternName, text) {
        if (text.toLowerCase().includes('strong') || text.toLowerCase().includes('clear')) {
            return 'HIGH';
        } else if (text.toLowerCase().includes('weak') || text.toLowerCase().includes('unclear')) {
            return 'LOW';
        }
        return 'MEDIUM';
    }

    determinePatternLocation(text) {
        if (text.toLowerCase().includes('support')) return 'SUPPORT';
        if (text.toLowerCase().includes('resistance')) return 'RESISTANCE';
        if (text.toLowerCase().includes('recent') || text.toLowerCase().includes('latest')) return 'RECENT';
        return 'UNKNOWN';
    }

    determinePatternStage(text, patternName) {
        if (text.toLowerCase().includes('forming') || text.toLowerCase().includes('developing')) {
            return 'FORMING';
        } else if (text.toLowerCase().includes('complete') || text.toLowerCase().includes('confirmed')) {
            return 'COMPLETE';
        }
        return 'UNKNOWN';
    }

    estimateTrendDuration(text) {
        if (text.toLowerCase().includes('short') || text.toLowerCase().includes('brief')) return 'SHORT';
        if (text.toLowerCase().includes('long') || text.toLowerCase().includes('extended')) return 'LONG';
        return 'MEDIUM';
    }

    analyzeTrendMomentum(text) {
        if (text.toLowerCase().includes('accelerating') || text.toLowerCase().includes('gaining')) return 'ACCELERATING';
        if (text.toLowerCase().includes('slowing') || text.toLowerCase().includes('weakening')) return 'DECELERATING';
        return 'STEADY';
    }

    detectReversalSignals(text) {
        const reversalKeywords = ['reversal', 'turning', 'exhaustion', 'divergence'];
        return reversalKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    detectContinuationSignals(text) {
        const continuationKeywords = ['continuation', 'breakout', 'momentum', 'follow-through'];
        return continuationKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    /**
     * Get analysis statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalAnalyses > 0 ? 
                (this.stats.successfulAnalyses / this.stats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
            averagePatternsPerAnalysis: this.stats.totalAnalyses > 0 ? 
                (this.stats.patternsDetected / this.stats.totalAnalyses).toFixed(1) : '0'
        };
    }
}

module.exports = { PatternRecognitionAnalyzer };
