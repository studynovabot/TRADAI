/**
 * Advanced Risk Management System for Enhanced TRADAI
 * Implements Kelly Criterion, volatility adjustments, and comprehensive risk controls
 */

class RiskManagementSystem {
    constructor(config = {}) {
        this.config = {
            // Account settings
            accountBalance: config.accountBalance || 1000,
            maxDailyLoss: config.maxDailyLoss || 50, // $50 or 5% of account
            maxDailyLossPercent: config.maxDailyLossPercent || 0.05, // 5%
            
            // Position sizing
            baseRiskPercent: config.baseRiskPercent || 0.02, // 2% per trade
            maxRiskPercent: config.maxRiskPercent || 0.05, // 5% maximum
            minRiskPercent: config.minRiskPercent || 0.005, // 0.5% minimum
            
            // Kelly Criterion settings
            useKellyCriterion: config.useKellyCriterion !== false,
            kellyMultiplier: config.kellyMultiplier || 0.25, // Conservative Kelly
            minKellyPercent: config.minKellyPercent || 0.01, // 1% minimum
            maxKellyPercent: config.maxKellyPercent || 0.08, // 8% maximum
            
            // Consecutive loss protection
            maxConsecutiveLosses: config.maxConsecutiveLosses || 3,
            cooldownPeriod: config.cooldownPeriod || 60 * 60 * 1000, // 1 hour
            
            // Volatility adjustments
            volatilityLookback: config.volatilityLookback || 20,
            highVolatilityThreshold: config.highVolatilityThreshold || 2.0,
            lowVolatilityThreshold: config.lowVolatilityThreshold || 0.5,
            
            // Time-based restrictions
            tradingHours: config.tradingHours || { start: 8, end: 18 }, // 8 AM to 6 PM
            avoidNews: config.avoidNews !== false,
            newsBufferMinutes: config.newsBufferMinutes || 30,
            
            ...config
        };
        
        this.dailyStats = {
            tradesCount: 0,
            totalPnL: 0,
            consecutiveLosses: 0,
            lastTradeTime: null,
            dailyReset: new Date().toDateString()
        };
        
        this.performanceHistory = {
            winRate: 0.6, // Default 60% win rate
            avgWin: 0,
            avgLoss: 0,
            totalTrades: 0,
            recentTrades: []
        };
        
        this.volatilityData = {
            current: 1.0,
            average: 1.0,
            trend: 'NORMAL'
        };
        
        this.logger = config.logger || console;
    }

    // Kelly Criterion position sizing
    calculateKellyPosition(signal, technicalAnalysis, performanceData = null) {
        try {
            if (!this.config.useKellyCriterion) {
                return this.calculateFixedPosition(signal);
            }
            
            // Use provided performance data or default values
            const perf = performanceData || this.performanceHistory;
            const winRate = Math.max(0.1, Math.min(0.9, perf.winRate || 0.6));
            const avgWin = Math.abs(perf.avgWin || 1.5);
            const avgLoss = Math.abs(perf.avgLoss || 1.0);
            
            // Kelly formula: f = (bp - q) / b
            // where b = odds received (avgWin/avgLoss), p = win probability, q = loss probability
            const b = avgWin / avgLoss;
            const p = winRate;
            const q = 1 - p;
            
            let kellyPercent = (b * p - q) / b;
            
            // Apply confidence adjustment
            const confidenceMultiplier = this.calculateConfidenceMultiplier(signal.confidence);
            kellyPercent *= confidenceMultiplier;
            
            // Apply volatility adjustment
            const volatilityMultiplier = this.calculateVolatilityMultiplier(technicalAnalysis);
            kellyPercent *= volatilityMultiplier;
            
            // Apply Kelly multiplier for conservative approach
            kellyPercent *= this.config.kellyMultiplier;
            
            // Clamp to safe limits
            kellyPercent = Math.max(this.config.minKellyPercent, 
                          Math.min(this.config.maxKellyPercent, kellyPercent));
            
            const positionSize = this.config.accountBalance * kellyPercent;
            
            return {
                type: 'KELLY_CRITERION',
                percentage: kellyPercent,
                amount: positionSize,
                reasoning: `Kelly: ${(kellyPercent * 100).toFixed(2)}% (WinRate: ${(winRate * 100).toFixed(1)}%, R:R: ${b.toFixed(2)}:1)`,
                confidence: signal.confidence,
                volatilityAdjustment: volatilityMultiplier,
                confidenceAdjustment: confidenceMultiplier
            };
            
        } catch (error) {
            this.logger.error('❌ Error calculating Kelly position:', error);
            return this.calculateFixedPosition(signal);
        }
    }

    calculateFixedPosition(signal) {
        const basePercent = this.config.baseRiskPercent;
        const confidenceMultiplier = this.calculateConfidenceMultiplier(signal.confidence);
        const adjustedPercent = basePercent * confidenceMultiplier;
        
        const clampedPercent = Math.max(this.config.minRiskPercent,
                              Math.min(this.config.maxRiskPercent, adjustedPercent));
        
        return {
            type: 'FIXED_PERCENTAGE',
            percentage: clampedPercent,
            amount: this.config.accountBalance * clampedPercent,
            reasoning: `Fixed: ${(clampedPercent * 100).toFixed(2)}% (Confidence: ${signal.confidence}%)`,
            confidence: signal.confidence,
            volatilityAdjustment: 1.0,
            confidenceAdjustment: confidenceMultiplier
        };
    }

    calculateConfidenceMultiplier(confidence) {
        // Scale position size based on confidence (70% = 0.7x, 90% = 1.3x)
        const normalizedConfidence = Math.max(50, Math.min(100, confidence)) / 100;
        return 0.4 + (normalizedConfidence * 1.2); // Range: 0.4 to 1.6
    }

    calculateVolatilityMultiplier(technicalAnalysis) {
        try {
            const volatility = technicalAnalysis?.volatilityAnalysis?.atr || this.volatilityData.current;
            
            if (volatility > this.config.highVolatilityThreshold) {
                return 0.7; // Reduce position size in high volatility
            } else if (volatility < this.config.lowVolatilityThreshold) {
                return 1.2; // Increase position size in low volatility
            }
            
            return 1.0; // Normal volatility
            
        } catch (error) {
            return 1.0;
        }
    }

    // Risk validation before trade execution
    validateTradeRisk(signal, positionSize, technicalAnalysis) {
        const validationResult = {
            approved: true,
            reasons: [],
            warnings: [],
            adjustments: {}
        };
        
        try {
            // Check daily loss limits
            const dailyCheck = this.checkDailyLimits(positionSize.amount);
            if (!dailyCheck.approved) {
                validationResult.approved = false;
                validationResult.reasons.push(dailyCheck.reason);
            }
            
            // Check consecutive losses
            const consecutiveCheck = this.checkConsecutiveLosses();
            if (!consecutiveCheck.approved) {
                validationResult.approved = false;
                validationResult.reasons.push(consecutiveCheck.reason);
            }
            
            // Check trading hours
            const timeCheck = this.checkTradingHours();
            if (!timeCheck.approved) {
                validationResult.warnings.push(timeCheck.reason);
            }
            
            // Check position size limits
            const sizeCheck = this.checkPositionSize(positionSize);
            if (!sizeCheck.approved) {
                validationResult.approved = false;
                validationResult.reasons.push(sizeCheck.reason);
                if (sizeCheck.adjustedSize) {
                    validationResult.adjustments.positionSize = sizeCheck.adjustedSize;
                }
            }
            
            // Check market conditions
            const marketCheck = this.checkMarketConditions(technicalAnalysis);
            if (!marketCheck.approved) {
                validationResult.warnings.push(marketCheck.reason);
            }
            
            return validationResult;
            
        } catch (error) {
            this.logger.error('❌ Error validating trade risk:', error);
            return {
                approved: false,
                reasons: ['Risk validation error'],
                warnings: [],
                adjustments: {}
            };
        }
    }

    checkDailyLimits(positionAmount) {
        this.resetDailyStatsIfNeeded();
        
        const maxDailyLoss = Math.min(
            this.config.maxDailyLoss,
            this.config.accountBalance * this.config.maxDailyLossPercent
        );
        
        if (Math.abs(this.dailyStats.totalPnL) >= maxDailyLoss) {
            return {
                approved: false,
                reason: `Daily loss limit reached: $${Math.abs(this.dailyStats.totalPnL).toFixed(2)} / $${maxDailyLoss.toFixed(2)}`
            };
        }
        
        // Check if this trade would exceed daily limit
        if (Math.abs(this.dailyStats.totalPnL) + positionAmount >= maxDailyLoss) {
            return {
                approved: false,
                reason: `Trade would exceed daily loss limit`
            };
        }
        
        return { approved: true };
    }

    checkConsecutiveLosses() {
        if (this.dailyStats.consecutiveLosses >= this.config.maxConsecutiveLosses) {
            const timeSinceLastTrade = Date.now() - (this.dailyStats.lastTradeTime || 0);
            
            if (timeSinceLastTrade < this.config.cooldownPeriod) {
                const remainingTime = Math.ceil((this.config.cooldownPeriod - timeSinceLastTrade) / (60 * 1000));
                return {
                    approved: false,
                    reason: `Cooling off after ${this.dailyStats.consecutiveLosses} consecutive losses. ${remainingTime} minutes remaining.`
                };
            } else {
                // Reset consecutive losses after cooldown
                this.dailyStats.consecutiveLosses = 0;
            }
        }
        
        return { approved: true };
    }

    checkTradingHours() {
        const now = new Date();
        const hour = now.getHours();
        
        if (hour < this.config.tradingHours.start || hour >= this.config.tradingHours.end) {
            return {
                approved: false,
                reason: `Outside trading hours (${this.config.tradingHours.start}:00 - ${this.config.tradingHours.end}:00)`
            };
        }
        
        return { approved: true };
    }

    checkPositionSize(positionSize) {
        const maxAmount = this.config.accountBalance * this.config.maxRiskPercent;
        const minAmount = this.config.accountBalance * this.config.minRiskPercent;
        
        if (positionSize.amount > maxAmount) {
            return {
                approved: false,
                reason: `Position size too large: $${positionSize.amount.toFixed(2)} > $${maxAmount.toFixed(2)}`,
                adjustedSize: {
                    ...positionSize,
                    amount: maxAmount,
                    percentage: this.config.maxRiskPercent
                }
            };
        }
        
        if (positionSize.amount < minAmount) {
            return {
                approved: false,
                reason: `Position size too small: $${positionSize.amount.toFixed(2)} < $${minAmount.toFixed(2)}`,
                adjustedSize: {
                    ...positionSize,
                    amount: minAmount,
                    percentage: this.config.minRiskPercent
                }
            };
        }
        
        return { approved: true };
    }

    checkMarketConditions(technicalAnalysis) {
        const warnings = [];
        
        // Check volatility
        if (technicalAnalysis?.volatilityAnalysis?.volatility === 'VERY_HIGH') {
            warnings.push('Very high market volatility detected');
        }
        
        // Check market regime
        if (technicalAnalysis?.marketRegime?.regime === 'VOLATILE') {
            warnings.push('Volatile market regime - exercise caution');
        }
        
        return {
            approved: true,
            reason: warnings.length > 0 ? warnings.join(', ') : null
        };
    }

    // Update performance tracking
    updatePerformanceHistory(tradeOutcome) {
        try {
            this.performanceHistory.recentTrades.push({
                timestamp: new Date(),
                outcome: tradeOutcome.outcome,
                pnl: tradeOutcome.pnl,
                win: tradeOutcome.win
            });
            
            // Keep only recent trades (last 100)
            if (this.performanceHistory.recentTrades.length > 100) {
                this.performanceHistory.recentTrades = this.performanceHistory.recentTrades.slice(-100);
            }
            
            // Recalculate metrics
            const recentTrades = this.performanceHistory.recentTrades;
            const wins = recentTrades.filter(t => t.win);
            const losses = recentTrades.filter(t => !t.win);
            
            this.performanceHistory.winRate = wins.length / recentTrades.length;
            this.performanceHistory.avgWin = wins.length > 0 ? 
                wins.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / wins.length : 0;
            this.performanceHistory.avgLoss = losses.length > 0 ? 
                losses.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losses.length : 0;
            this.performanceHistory.totalTrades = recentTrades.length;
            
            // Update daily stats
            this.updateDailyStats(tradeOutcome);
            
        } catch (error) {
            this.logger.error('❌ Error updating performance history:', error);
        }
    }

    updateDailyStats(tradeOutcome) {
        this.resetDailyStatsIfNeeded();
        
        this.dailyStats.tradesCount++;
        this.dailyStats.totalPnL += tradeOutcome.pnl;
        this.dailyStats.lastTradeTime = Date.now();
        
        if (tradeOutcome.win) {
            this.dailyStats.consecutiveLosses = 0;
        } else {
            this.dailyStats.consecutiveLosses++;
        }
    }

    resetDailyStatsIfNeeded() {
        const today = new Date().toDateString();
        if (this.dailyStats.dailyReset !== today) {
            this.dailyStats = {
                tradesCount: 0,
                totalPnL: 0,
                consecutiveLosses: this.dailyStats.consecutiveLosses, // Carry over consecutive losses
                lastTradeTime: this.dailyStats.lastTradeTime,
                dailyReset: today
            };
        }
    }

    // Get current risk status
    getRiskStatus() {
        this.resetDailyStatsIfNeeded();
        
        const maxDailyLoss = Math.min(
            this.config.maxDailyLoss,
            this.config.accountBalance * this.config.maxDailyLossPercent
        );
        
        return {
            accountBalance: this.config.accountBalance,
            dailyPnL: this.dailyStats.totalPnL,
            dailyTradesCount: this.dailyStats.tradesCount,
            maxDailyLoss: maxDailyLoss,
            remainingDailyRisk: maxDailyLoss - Math.abs(this.dailyStats.totalPnL),
            consecutiveLosses: this.dailyStats.consecutiveLosses,
            maxConsecutiveLosses: this.config.maxConsecutiveLosses,
            inCooldown: this.dailyStats.consecutiveLosses >= this.config.maxConsecutiveLosses,
            performanceMetrics: {
                winRate: this.performanceHistory.winRate,
                totalTrades: this.performanceHistory.totalTrades,
                avgWin: this.performanceHistory.avgWin,
                avgLoss: this.performanceHistory.avgLoss
            }
        };
    }

    // Calculate stop loss and take profit levels
    calculateStopLossAndTakeProfit(signal, technicalAnalysis, positionSize) {
        try {
            const currentPrice = signal.currentPrice;
            const atr = technicalAnalysis?.volatilityAnalysis?.atr || 0.001;
            
            // Support and resistance levels
            const supportLevels = technicalAnalysis?.supportResistance?.filter(l => l.type === 'SUPPORT') || [];
            const resistanceLevels = technicalAnalysis?.supportResistance?.filter(l => l.type === 'RESISTANCE') || [];
            
            let stopLoss, takeProfit;
            
            if (signal.decision === 'BUY') {
                // Stop loss: Below nearest support or 2x ATR
                const nearestSupport = supportLevels
                    .filter(s => s.price < currentPrice)
                    .sort((a, b) => b.price - a.price)[0];
                
                stopLoss = nearestSupport ? 
                    Math.min(nearestSupport.price * 0.999, currentPrice - (2 * atr)) :
                    currentPrice - (2 * atr);
                
                // Take profit: Above nearest resistance or 3x ATR
                const nearestResistance = resistanceLevels
                    .filter(r => r.price > currentPrice)
                    .sort((a, b) => a.price - b.price)[0];
                
                takeProfit = nearestResistance ?
                    Math.max(nearestResistance.price * 1.001, currentPrice + (3 * atr)) :
                    currentPrice + (3 * atr);
                    
            } else if (signal.decision === 'SELL') {
                // Stop loss: Above nearest resistance or 2x ATR
                const nearestResistance = resistanceLevels
                    .filter(r => r.price > currentPrice)
                    .sort((a, b) => a.price - b.price)[0];
                
                stopLoss = nearestResistance ?
                    Math.max(nearestResistance.price * 1.001, currentPrice + (2 * atr)) :
                    currentPrice + (2 * atr);
                
                // Take profit: Below nearest support or 3x ATR
                const nearestSupport = supportLevels
                    .filter(s => s.price < currentPrice)
                    .sort((a, b) => b.price - a.price)[0];
                
                takeProfit = nearestSupport ?
                    Math.min(nearestSupport.price * 0.999, currentPrice - (3 * atr)) :
                    currentPrice - (3 * atr);
            }
            
            // Calculate risk/reward ratio
            const riskAmount = Math.abs(currentPrice - stopLoss);
            const rewardAmount = Math.abs(takeProfit - currentPrice);
            const riskRewardRatio = rewardAmount / riskAmount;
            
            return {
                stopLoss: stopLoss,
                takeProfit: takeProfit,
                riskAmount: riskAmount,
                rewardAmount: rewardAmount,
                riskRewardRatio: riskRewardRatio,
                positionRisk: positionSize.amount,
                potentialProfit: positionSize.amount * riskRewardRatio
            };
            
        } catch (error) {
            this.logger.error('❌ Error calculating stop loss and take profit:', error);
            return null;
        }
    }
}

module.exports = { RiskManagementSystem };
