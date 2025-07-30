/**
 * Multi-Timeframe Analysis Engine for Trading Signal Generation
 * Provides comprehensive confluence analysis across multiple timeframes (1m, 3m, 5m)
 * Specialized for USD/BRL forex pairs and OTC binary options
 */

class MultiTimeframeAnalysisEngine {
    constructor(config = {}) {
        this.config = {
            // Supported timeframes
            supportedTimeframes: config.supportedTimeframes || ['1m', '3m', '5m', '15m', '30m', '1h'],
            primaryTimeframes: config.primaryTimeframes || ['1m', '3m', '5m'],
            
            // Confluence settings
            minConfluenceScore: config.minConfluenceScore || 75,
            requiredAgreement: config.requiredAgreement || 2, // Minimum timeframes that must agree
            
            // Signal validation
            minSignalConfidence: config.minSignalConfidence || 70,
            maxSignalConfidence: config.maxSignalConfidence || 95,
            
            // USD/BRL specific settings
            usdBrlVolatilityThreshold: config.usdBrlVolatilityThreshold || 0.02,
            usdBrlTrendStrengthMin: config.usdBrlTrendStrengthMin || 6,
            
            // OTC binary options settings
            otcExpiryTimeframes: config.otcExpiryTimeframes || ['1m', '3m', '5m'],
            otcMinConfidence: config.otcMinConfidence || 80,
            
            ...config
        };

        this.analysisHistory = [];
        this.confluencePatterns = new Map();
    }

    /**
     * Perform comprehensive multi-timeframe analysis
     */
    async analyzeMultiTimeframe(timeframeResults, options = {}) {
        console.log('🔍 Starting multi-timeframe confluence analysis...');
        
        const startTime = Date.now();
        const analysisId = `mtf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Validate inputs
            this.validateTimeframeResults(timeframeResults);
            
            // Extract timeframe data
            const timeframeData = this.extractTimeframeData(timeframeResults);
            
            // Perform confluence analysis
            const confluenceAnalysis = await this.performConfluenceAnalysis(timeframeData, options);
            
            // Generate multi-timeframe signals
            const signals = await this.generateMultiTimeframeSignals(confluenceAnalysis, options);
            
            // Validate signal quality
            const validation = await this.validateSignalQuality(signals, confluenceAnalysis);
            
            // Create comprehensive report
            const analysis = {
                analysisId,
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - startTime,
                
                // Input data
                timeframes: Object.keys(timeframeData),
                asset: options.asset || 'USD/BRL',
                analysisType: options.analysisType || 'comprehensive',
                
                // Timeframe data
                timeframeData,
                
                // Confluence analysis
                confluence: confluenceAnalysis,
                
                // Generated signals
                signals,
                
                // Validation results
                validation,
                
                // Final recommendations
                recommendations: this.generateRecommendations(signals, confluenceAnalysis, validation)
            };
            
            // Store in history
            this.analysisHistory.push(analysis);
            
            console.log(`✅ Multi-timeframe analysis completed in ${Date.now() - startTime}ms`);
            
            return {
                success: true,
                analysis
            };
            
        } catch (error) {
            console.error('❌ Multi-timeframe analysis failed:', error);
            return {
                success: false,
                error: error.message,
                analysisId,
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * Validate timeframe results input
     */
    validateTimeframeResults(timeframeResults) {
        if (!timeframeResults || !Array.isArray(timeframeResults)) {
            throw new Error('Timeframe results must be an array');
        }
        
        if (timeframeResults.length < 2) {
            throw new Error('Minimum 2 timeframes required for confluence analysis');
        }
        
        // Check for required timeframes
        const availableTimeframes = timeframeResults.map(r => r.timeframe);
        const missingPrimary = this.config.primaryTimeframes.filter(tf => !availableTimeframes.includes(tf));
        
        if (missingPrimary.length > 1) {
            console.warn(`⚠️ Missing primary timeframes: ${missingPrimary.join(', ')}`);
        }
    }

    /**
     * Extract and normalize timeframe data
     */
    extractTimeframeData(timeframeResults) {
        const timeframeData = {};
        
        timeframeResults.forEach(result => {
            if (result.result && result.result.success && result.result.analysis) {
                const analysis = result.result.analysis;
                
                timeframeData[result.timeframe] = {
                    // Basic signal data
                    direction: analysis.tradingSignal?.direction || 'NEUTRAL',
                    confidence: analysis.overallConfidence || 0,
                    recommendation: analysis.recommendation || 'WAIT',
                    
                    // Technical indicators
                    indicators: {
                        ema: analysis.technicalIndicators?.ema || {},
                        sma: analysis.technicalIndicators?.sma || {},
                        rsi: analysis.technicalIndicators?.rsi || {},
                        stochastic: analysis.technicalIndicators?.stochastic || {}
                    },
                    
                    // Pattern analysis
                    patterns: analysis.candlestickPatterns || [],
                    
                    // Support/Resistance
                    supportResistance: analysis.supportResistance || {},
                    
                    // Trend analysis
                    trend: {
                        direction: analysis.multiTimeframeAnalysis?.[result.timeframe]?.trend || 'SIDEWAYS',
                        strength: analysis.multiTimeframeAnalysis?.[result.timeframe]?.strength || 5,
                        confidence: analysis.multiTimeframeAnalysis?.[result.timeframe]?.confidence || 70
                    },
                    
                    // Quality metrics
                    quality: analysis.metadata?.visionDataQuality || { level: 'MEDIUM', score: 50 },
                    
                    // Raw analysis for reference
                    rawAnalysis: analysis
                };
            }
        });
        
        return timeframeData;
    }

    /**
     * Perform confluence analysis across timeframes
     */
    async performConfluenceAnalysis(timeframeData, options = {}) {
        console.log('🔄 Analyzing confluence patterns...');
        
        const timeframes = Object.keys(timeframeData);
        const confluence = {
            // Direction analysis
            directions: {},
            directionConsensus: this.analyzeDirectionConsensus(timeframeData),
            
            // Indicator confluence
            indicatorConfluence: this.analyzeIndicatorConfluence(timeframeData),
            
            // Pattern confluence
            patternConfluence: this.analyzePatternConfluence(timeframeData),
            
            // Trend confluence
            trendConfluence: this.analyzeTrendConfluence(timeframeData),
            
            // Support/Resistance confluence
            srConfluence: this.analyzeSupportResistanceConfluence(timeframeData),
            
            // Overall confluence score
            overallScore: 0,
            
            // Confluence strength
            strength: 'WEAK',
            
            // Agreement metrics
            agreements: 0,
            conflicts: 0,
            neutral: 0
        };
        
        // Calculate direction distribution
        timeframes.forEach(tf => {
            const direction = timeframeData[tf].direction;
            confluence.directions[direction] = (confluence.directions[direction] || 0) + 1;
        });
        
        // Calculate agreement metrics
        const upCount = confluence.directions.UP || 0;
        const downCount = confluence.directions.DOWN || 0;
        const neutralCount = confluence.directions.NEUTRAL || 0;
        
        confluence.agreements = Math.max(upCount, downCount);
        confluence.conflicts = Math.min(upCount, downCount);
        confluence.neutral = neutralCount;
        
        // Calculate overall confluence score
        confluence.overallScore = this.calculateOverallConfluenceScore(confluence);
        
        // Determine confluence strength
        confluence.strength = this.determineConfluenceStrength(confluence.overallScore, confluence.agreements, timeframes.length);
        
        return confluence;
    }

    /**
     * Analyze direction consensus across timeframes
     */
    analyzeDirectionConsensus(timeframeData) {
        const directions = Object.values(timeframeData).map(data => data.direction);
        const confidences = Object.values(timeframeData).map(data => data.confidence);
        
        // Count directions
        const upCount = directions.filter(d => d === 'UP').length;
        const downCount = directions.filter(d => d === 'DOWN').length;
        const neutralCount = directions.filter(d => d === 'NEUTRAL').length;
        
        // Determine consensus
        let consensus = 'NONE';
        let consensusStrength = 0;
        
        if (upCount > downCount && upCount > neutralCount) {
            consensus = 'UP';
            consensusStrength = (upCount / directions.length) * 100;
        } else if (downCount > upCount && downCount > neutralCount) {
            consensus = 'DOWN';
            consensusStrength = (downCount / directions.length) * 100;
        } else if (neutralCount > upCount && neutralCount > downCount) {
            consensus = 'NEUTRAL';
            consensusStrength = (neutralCount / directions.length) * 100;
        }
        
        // Calculate weighted confidence
        const weightedConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
        
        return {
            consensus,
            consensusStrength,
            weightedConfidence,
            distribution: { up: upCount, down: downCount, neutral: neutralCount }
        };
    }

    /**
     * Analyze indicator confluence
     */
    analyzeIndicatorConfluence(timeframeData) {
        const indicators = ['ema', 'sma', 'rsi', 'stochastic'];
        const confluence = {};
        
        indicators.forEach(indicator => {
            const signals = [];
            const confidences = [];
            
            Object.values(timeframeData).forEach(data => {
                if (data.indicators[indicator] && data.indicators[indicator].signal) {
                    signals.push(data.indicators[indicator].signal);
                    confidences.push(data.indicators[indicator].confidence || 70);
                }
            });
            
            if (signals.length > 0) {
                const buyCount = signals.filter(s => s === 'BUY').length;
                const sellCount = signals.filter(s => s === 'SELL').length;
                const neutralCount = signals.filter(s => s === 'NEUTRAL').length;
                
                confluence[indicator] = {
                    signals: { buy: buyCount, sell: sellCount, neutral: neutralCount },
                    consensus: buyCount > sellCount ? 'BUY' : sellCount > buyCount ? 'SELL' : 'NEUTRAL',
                    strength: Math.max(buyCount, sellCount, neutralCount) / signals.length * 100,
                    avgConfidence: confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
                };
            }
        });
        
        return confluence;
    }

    /**
     * Analyze pattern confluence
     */
    analyzePatternConfluence(timeframeData) {
        const allPatterns = [];
        const bullishPatterns = [];
        const bearishPatterns = [];
        
        Object.values(timeframeData).forEach(data => {
            if (data.patterns && Array.isArray(data.patterns)) {
                data.patterns.forEach(pattern => {
                    allPatterns.push(pattern);
                    
                    if (pattern.type === 'BULLISH') {
                        bullishPatterns.push(pattern);
                    } else if (pattern.type === 'BEARISH') {
                        bearishPatterns.push(pattern);
                    }
                });
            }
        });
        
        return {
            totalPatterns: allPatterns.length,
            bullishCount: bullishPatterns.length,
            bearishCount: bearishPatterns.length,
            patternBias: bullishPatterns.length > bearishPatterns.length ? 'BULLISH' : 
                        bearishPatterns.length > bullishPatterns.length ? 'BEARISH' : 'NEUTRAL',
            significantPatterns: allPatterns.filter(p => p.significance === 'HIGH'),
            avgConfidence: allPatterns.length > 0 ? 
                allPatterns.reduce((sum, p) => sum + p.confidence, 0) / allPatterns.length : 0
        };
    }

    /**
     * Analyze trend confluence
     */
    analyzeTrendConfluence(timeframeData) {
        const trends = Object.values(timeframeData).map(data => data.trend);
        
        const upTrends = trends.filter(t => t.direction === 'UP').length;
        const downTrends = trends.filter(t => t.direction === 'DOWN').length;
        const sidewaysTrends = trends.filter(t => t.direction === 'SIDEWAYS').length;
        
        const avgStrength = trends.reduce((sum, t) => sum + t.strength, 0) / trends.length;
        const avgConfidence = trends.reduce((sum, t) => sum + t.confidence, 0) / trends.length;
        
        return {
            distribution: { up: upTrends, down: downTrends, sideways: sidewaysTrends },
            dominantTrend: upTrends > downTrends && upTrends > sidewaysTrends ? 'UP' :
                          downTrends > upTrends && downTrends > sidewaysTrends ? 'DOWN' : 'SIDEWAYS',
            avgStrength,
            avgConfidence,
            alignment: Math.max(upTrends, downTrends, sidewaysTrends) / trends.length * 100
        };
    }

    /**
     * Analyze support/resistance confluence
     */
    analyzeSupportResistanceConfluence(timeframeData) {
        const allSupport = [];
        const allResistance = [];
        
        Object.values(timeframeData).forEach(data => {
            if (data.supportResistance) {
                if (data.supportResistance.support) {
                    allSupport.push(...data.supportResistance.support);
                }
                if (data.supportResistance.resistance) {
                    allResistance.push(...data.supportResistance.resistance);
                }
            }
        });
        
        // Find confluence levels (levels that appear in multiple timeframes)
        const supportConfluence = this.findConfluenceLevels(allSupport);
        const resistanceConfluence = this.findConfluenceLevels(allResistance);
        
        return {
            supportLevels: supportConfluence,
            resistanceLevels: resistanceConfluence,
            totalSupportLevels: allSupport.length,
            totalResistanceLevels: allResistance.length,
            confluenceSupport: supportConfluence.filter(level => level.count > 1),
            confluenceResistance: resistanceConfluence.filter(level => level.count > 1)
        };
    }

    /**
     * Find confluence levels in price arrays
     */
    findConfluenceLevels(prices, tolerance = 0.001) {
        const levels = [];
        const processed = new Set();
        
        prices.forEach(price => {
            if (processed.has(price)) return;
            
            const similarPrices = prices.filter(p => 
                Math.abs(p - price) / price <= tolerance
            );
            
            if (similarPrices.length > 0) {
                levels.push({
                    level: price,
                    count: similarPrices.length,
                    prices: similarPrices
                });
                
                similarPrices.forEach(p => processed.add(p));
            }
        });
        
        return levels.sort((a, b) => b.count - a.count);
    }

    /**
     * Calculate overall confluence score
     */
    calculateOverallConfluenceScore(confluence) {
        let score = 0;
        
        // Direction consensus (40% weight)
        const directionWeight = 0.4;
        score += confluence.directionConsensus.consensusStrength * directionWeight;
        
        // Indicator confluence (30% weight)
        const indicatorWeight = 0.3;
        const indicatorScores = Object.values(confluence.indicatorConfluence)
            .map(ind => ind.strength * (ind.avgConfidence / 100));
        const avgIndicatorScore = indicatorScores.length > 0 ? 
            indicatorScores.reduce((sum, s) => sum + s, 0) / indicatorScores.length : 0;
        score += avgIndicatorScore * indicatorWeight;
        
        // Pattern confluence (20% weight)
        const patternWeight = 0.2;
        const patternScore = confluence.patternConfluence.avgConfidence || 0;
        score += patternScore * patternWeight;
        
        // Trend confluence (10% weight)
        const trendWeight = 0.1;
        score += confluence.trendConfluence.alignment * trendWeight;
        
        return Math.min(95, Math.max(0, score));
    }

    /**
     * Determine confluence strength
     */
    determineConfluenceStrength(score, agreements, totalTimeframes) {
        const agreementRatio = agreements / totalTimeframes;
        
        if (score >= 85 && agreementRatio >= 0.8) return 'VERY_STRONG';
        if (score >= 75 && agreementRatio >= 0.67) return 'STRONG';
        if (score >= 65 && agreementRatio >= 0.5) return 'MODERATE';
        if (score >= 50) return 'WEAK';
        return 'VERY_WEAK';
    }

    /**
     * Generate multi-timeframe trading signals
     */
    async generateMultiTimeframeSignals(confluenceAnalysis, options = {}) {
        console.log('📊 Generating multi-timeframe signals...');
        
        const signals = {
            primary: this.generatePrimarySignal(confluenceAnalysis, options),
            scalping: this.generateScalpingSignal(confluenceAnalysis, options),
            swing: this.generateSwingSignal(confluenceAnalysis, options),
            otc: this.generateOTCSignal(confluenceAnalysis, options)
        };
        
        return signals;
    }

    /**
     * Generate primary trading signal
     */
    generatePrimarySignal(confluence, options = {}) {
        const direction = confluence.directionConsensus.consensus;
        const confidence = Math.min(95, confluence.overallScore);
        
        return {
            type: 'PRIMARY',
            direction: direction,
            confidence: confidence,
            strength: confluence.strength,
            timeframe: '5m',
            recommendation: this.getRecommendation(direction, confidence, confluence.strength),
            reasoning: this.generateSignalReasoning(confluence, 'primary'),
            riskLevel: this.calculateRiskLevel(confidence, confluence.strength),
            validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        };
    }

    /**
     * Generate scalping signal (1m timeframe focus)
     */
    generateScalpingSignal(confluence, options = {}) {
        // Focus on 1m timeframe data with quick execution
        const confidence = Math.max(70, confluence.overallScore - 10); // Slightly lower confidence for scalping
        
        return {
            type: 'SCALPING',
            direction: confluence.directionConsensus.consensus,
            confidence: confidence,
            timeframe: '1m',
            recommendation: confidence >= 75 ? (confluence.directionConsensus.consensus === 'UP' ? 'BUY' : 'SELL') : 'WAIT',
            reasoning: 'Fast scalping signal based on 1m confluence',
            riskLevel: 'HIGH',
            validUntil: new Date(Date.now() + 1 * 60 * 1000).toISOString() // 1 minute
        };
    }

    /**
     * Generate swing signal (longer timeframe focus)
     */
    generateSwingSignal(confluence, options = {}) {
        // Focus on longer timeframes with higher confidence requirement
        const confidence = confluence.overallScore;
        
        return {
            type: 'SWING',
            direction: confluence.directionConsensus.consensus,
            confidence: confidence,
            timeframe: '15m',
            recommendation: confidence >= 80 ? (confluence.directionConsensus.consensus === 'UP' ? 'BUY' : 'SELL') : 'WAIT',
            reasoning: 'Swing trading signal based on multi-timeframe trend alignment',
            riskLevel: this.calculateRiskLevel(confidence, confluence.strength),
            validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
        };
    }

    /**
     * Generate OTC binary options signal
     */
    generateOTCSignal(confluence, options = {}) {
        const asset = options.asset || 'USD/BRL';
        const isOTCAsset = this.isOTCCompatibleAsset(asset);
        
        if (!isOTCAsset) {
            return {
                type: 'OTC',
                available: false,
                reason: `Asset ${asset} not suitable for OTC binary options`
            };
        }
        
        const confidence = confluence.overallScore;
        const minOTCConfidence = this.config.otcMinConfidence;
        
        return {
            type: 'OTC',
            available: true,
            direction: confluence.directionConsensus.consensus,
            confidence: confidence,
            timeframe: '3m',
            expiryTime: '5m',
            recommendation: confidence >= minOTCConfidence ? 
                (confluence.directionConsensus.consensus === 'UP' ? 'CALL' : 'PUT') : 'WAIT',
            reasoning: `OTC binary options signal for ${asset} with ${confidence.toFixed(1)}% confidence`,
            riskLevel: confidence >= 85 ? 'LOW' : confidence >= 75 ? 'MEDIUM' : 'HIGH',
            validUntil: new Date(Date.now() + 3 * 60 * 1000).toISOString() // 3 minutes
        };
    }

    /**
     * Check if asset is compatible with OTC binary options
     */
    isOTCCompatibleAsset(asset) {
        const otcAssets = [
            'USD/BRL', 'USD/EUR', 'USD/GBP', 'USD/JPY', 'USD/CAD', 'USD/AUD',
            'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/USD', 'NZD/USD',
            'BTC/USD', 'ETH/USD', 'LTC/USD'
        ];
        
        return otcAssets.includes(asset.toUpperCase());
    }

    /**
     * Get recommendation based on direction, confidence, and strength
     */
    getRecommendation(direction, confidence, strength) {
        if (direction === 'NEUTRAL' || confidence < 70) return 'WAIT';
        
        if (confidence >= 85 && (strength === 'STRONG' || strength === 'VERY_STRONG')) {
            return direction === 'UP' ? 'STRONG_BUY' : 'STRONG_SELL';
        }
        
        if (confidence >= 75) {
            return direction === 'UP' ? 'BUY' : 'SELL';
        }
        
        return 'WAIT';
    }

    /**
     * Calculate risk level
     */
    calculateRiskLevel(confidence, strength) {
        if (confidence >= 85 && (strength === 'STRONG' || strength === 'VERY_STRONG')) return 'LOW';
        if (confidence >= 75 && strength !== 'VERY_WEAK') return 'MEDIUM';
        return 'HIGH';
    }

    /**
     * Generate signal reasoning
     */
    generateSignalReasoning(confluence, signalType) {
        const reasons = [];
        
        // Direction consensus
        if (confluence.directionConsensus.consensusStrength >= 75) {
            reasons.push(`Strong ${confluence.directionConsensus.consensus} consensus (${confluence.directionConsensus.consensusStrength.toFixed(1)}%)`);
        }
        
        // Indicator confluence
        const strongIndicators = Object.entries(confluence.indicatorConfluence)
            .filter(([_, data]) => data.strength >= 75)
            .map(([indicator, _]) => indicator.toUpperCase());
        
        if (strongIndicators.length > 0) {
            reasons.push(`Strong indicator signals: ${strongIndicators.join(', ')}`);
        }
        
        // Pattern confluence
        if (confluence.patternConfluence.significantPatterns.length > 0) {
            reasons.push(`${confluence.patternConfluence.significantPatterns.length} significant patterns detected`);
        }
        
        // Trend alignment
        if (confluence.trendConfluence.alignment >= 75) {
            reasons.push(`Strong trend alignment (${confluence.trendConfluence.alignment.toFixed(1)}%)`);
        }
        
        return reasons.length > 0 ? reasons.join('; ') : 'Multi-timeframe analysis completed';
    }

    /**
     * Validate signal quality
     */
    async validateSignalQuality(signals, confluenceAnalysis) {
        const validation = {
            isValid: true,
            issues: [],
            warnings: [],
            qualityScore: 0
        };
        
        // Check confluence score
        if (confluenceAnalysis.overallScore < this.config.minConfluenceScore) {
            validation.issues.push(`Low confluence score: ${confluenceAnalysis.overallScore.toFixed(1)}% (min: ${this.config.minConfluenceScore}%)`);
        }
        
        // Check agreement count
        if (confluenceAnalysis.agreements < this.config.requiredAgreement) {
            validation.issues.push(`Insufficient timeframe agreement: ${confluenceAnalysis.agreements} (min: ${this.config.requiredAgreement})`);
        }
        
        // Check signal consistency
        const primarySignal = signals.primary;
        if (primarySignal.confidence < this.config.minSignalConfidence) {
            validation.warnings.push(`Low signal confidence: ${primarySignal.confidence.toFixed(1)}%`);
        }
        
        // Calculate quality score
        validation.qualityScore = this.calculateSignalQualityScore(signals, confluenceAnalysis);
        validation.isValid = validation.issues.length === 0;
        
        return validation;
    }

    /**
     * Calculate signal quality score
     */
    calculateSignalQualityScore(signals, confluenceAnalysis) {
        let score = 0;
        
        // Confluence score (50% weight)
        score += confluenceAnalysis.overallScore * 0.5;
        
        // Signal confidence (30% weight)
        score += signals.primary.confidence * 0.3;
        
        // Agreement ratio (20% weight)
        const totalTimeframes = confluenceAnalysis.agreements + confluenceAnalysis.conflicts + confluenceAnalysis.neutral;
        const agreementRatio = confluenceAnalysis.agreements / totalTimeframes;
        score += agreementRatio * 100 * 0.2;
        
        return Math.min(100, Math.max(0, score));
    }

    /**
     * Generate final recommendations
     */
    generateRecommendations(signals, confluenceAnalysis, validation) {
        const recommendations = {
            primary: signals.primary.recommendation,
            confidence: signals.primary.confidence,
            riskLevel: signals.primary.riskLevel,
            timeframe: signals.primary.timeframe,
            
            // Specific recommendations
            scalping: signals.scalping.recommendation,
            swing: signals.swing.recommendation,
            otc: signals.otc.available ? signals.otc.recommendation : 'NOT_AVAILABLE',
            
            // Quality assessment
            qualityLevel: validation.qualityScore >= 80 ? 'HIGH' : 
                         validation.qualityScore >= 60 ? 'MEDIUM' : 'LOW',
            
            // Action items
            actionItems: this.generateActionItems(signals, confluenceAnalysis, validation)
        };
        
        return recommendations;
    }

    /**
     * Generate action items based on analysis
     */
    generateActionItems(signals, confluenceAnalysis, validation) {
        const actions = [];
        
        if (validation.isValid && signals.primary.confidence >= 80) {
            actions.push(`Execute ${signals.primary.recommendation} signal with ${signals.primary.confidence.toFixed(1)}% confidence`);
        }
        
        if (validation.warnings.length > 0) {
            actions.push('Monitor signal closely due to quality warnings');
        }
        
        if (confluenceAnalysis.strength === 'VERY_STRONG') {
            actions.push('Consider increasing position size due to strong confluence');
        }
        
        if (signals.otc.available && signals.otc.confidence >= 80) {
            actions.push(`OTC binary option: ${signals.otc.recommendation} with ${signals.otc.expiryTime} expiry`);
        }
        
        return actions;
    }

    /**
     * Get analysis history
     */
    getAnalysisHistory(limit = 10) {
        return this.analysisHistory.slice(-limit);
    }

    /**
     * Clear analysis history
     */
    clearHistory() {
        this.analysisHistory = [];
        this.confluencePatterns.clear();
    }
}

module.exports = MultiTimeframeAnalysisEngine;
