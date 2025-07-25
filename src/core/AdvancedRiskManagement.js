/**
 * Advanced Risk Management System for Binary Options Trading
 * 
 * Implements sophisticated risk controls:
 * - Kelly Criterion position sizing
 * - Drawdown protection (max 30%)
 * - Daily loss limits (20% of account)
 * - Performance-based adjustments
 * - Emergency stop mechanisms
 * - Portfolio heat management
 */

class AdvancedRiskManagement {
    constructor(config = {}) {
        this.config = {
            // Position sizing
            basePositionPercent: config.basePositionPercent || 0.02, // 2% of account
            maxPositionPercent: config.maxPositionPercent || 0.10, // 10% max
            minPositionPercent: config.minPositionPercent || 0.005, // 0.5% min
            
            // Kelly Criterion settings
            useKellyCriterion: config.useKellyCriterion !== false,
            kellyMultiplier: config.kellyMultiplier || 0.25, // Conservative Kelly
            
            // Drawdown protection
            maxDrawdownPercent: config.maxDrawdownPercent || 0.30, // 30% max drawdown
            dailyLossLimitPercent: config.dailyLossLimitPercent || 0.20, // 20% daily loss limit
            consecutiveLossLimit: config.consecutiveLossLimit || 3, // Stop after 3 losses
            
            // Performance adjustments
            performanceAdjustmentEnabled: config.performanceAdjustmentEnabled !== false,
            winRateThreshold: config.winRateThreshold || 0.60, // Reduce size if below 60%
            profitTargetMultiplier: config.profitTargetMultiplier || 2.0, // 2x daily target
            
            // Emergency controls
            emergencyStopEnabled: config.emergencyStopEnabled !== false,
            maxDailyTrades: config.maxDailyTrades || 15,
            cooldownPeriod: config.cooldownPeriod || 3600000, // 1 hour cooldown
            
            // Account protection
            minimumAccountBalance: config.minimumAccountBalance || 10, // $10 minimum
            
            ...config
        };

        // Risk state tracking
        this.state = {
            accountBalance: 100, // Starting balance
            peakBalance: 100,
            currentDrawdown: 0,
            dailyStartBalance: 100,
            dailyPnL: 0,
            
            // Trade tracking
            consecutiveLosses: 0,
            consecutiveWins: 0,
            totalTrades: 0,
            winningTrades: 0,
            
            // Daily limits
            dailyTradeCount: 0,
            dailyLossAmount: 0,
            lastResetTime: Date.now(),
            
            // Emergency state
            emergencyStop: false,
            cooldownUntil: 0,
            
            // Performance metrics
            winRate: 0,
            averageWin: 0,
            averageLoss: 0,
            profitFactor: 0,
            sharpeRatio: 0
        };

        // Trade history for calculations
        this.tradeHistory = [];
        this.dailyResults = [];
    }

    /**
     * Calculate position size for a trade
     */
    calculatePositionSize(signal, accountBalance = null) {
        console.log('💰 Calculating position size with risk management...');

        if (accountBalance) {
            this.state.accountBalance = accountBalance;
        }

        // Check if trading is allowed
        if (!this.canTrade()) {
            return { size: 0, reason: 'Trading not allowed due to risk controls' };
        }

        let positionSize = 0;

        if (this.config.useKellyCriterion && this.state.totalTrades > 10) {
            // Use Kelly Criterion for position sizing
            positionSize = this.calculateKellyPosition(signal);
        } else {
            // Use fixed percentage
            positionSize = this.calculateFixedPercentagePosition(signal);
        }

        // Apply risk adjustments
        positionSize = this.applyRiskAdjustments(positionSize, signal);

        // Ensure within limits
        positionSize = this.enforcePositionLimits(positionSize);

        console.log(`✅ Position size calculated: $${positionSize.toFixed(2)}`);
        
        return {
            size: positionSize,
            method: this.config.useKellyCriterion ? 'Kelly Criterion' : 'Fixed Percentage',
            riskLevel: this.getRiskLevel(),
            accountRisk: (positionSize / this.state.accountBalance * 100).toFixed(2) + '%'
        };
    }

    /**
     * Check if trading is allowed based on risk controls
     */
    canTrade() {
        const now = Date.now();

        // Check emergency stop
        if (this.state.emergencyStop) {
            console.log('❌ Emergency stop active');
            return false;
        }

        // Check cooldown period
        if (now < this.state.cooldownUntil) {
            console.log('❌ In cooldown period');
            return false;
        }

        // Check daily trade limit
        if (this.state.dailyTradeCount >= this.config.maxDailyTrades) {
            console.log('❌ Daily trade limit reached');
            return false;
        }

        // Check drawdown limit
        if (this.state.currentDrawdown >= this.config.maxDrawdownPercent) {
            console.log('❌ Maximum drawdown reached');
            this.triggerEmergencyStop('Maximum drawdown exceeded');
            return false;
        }

        // Check daily loss limit
        const dailyLossPercent = Math.abs(this.state.dailyPnL) / this.state.dailyStartBalance;
        if (this.state.dailyPnL < 0 && dailyLossPercent >= this.config.dailyLossLimitPercent) {
            console.log('❌ Daily loss limit reached');
            this.triggerCooldown('Daily loss limit exceeded');
            return false;
        }

        // Check consecutive losses
        if (this.state.consecutiveLosses >= this.config.consecutiveLossLimit) {
            console.log('❌ Consecutive loss limit reached');
            this.triggerCooldown('Too many consecutive losses');
            return false;
        }

        // Check minimum account balance
        if (this.state.accountBalance < this.config.minimumAccountBalance) {
            console.log('❌ Account balance too low');
            this.triggerEmergencyStop('Account balance below minimum');
            return false;
        }

        return true;
    }

    /**
     * Calculate Kelly Criterion position size
     */
    calculateKellyPosition(signal) {
        if (this.state.totalTrades < 10) {
            return this.calculateFixedPercentagePosition(signal);
        }

        // Kelly formula: f = (bp - q) / b
        // where: b = odds, p = win probability, q = loss probability
        const winRate = this.state.winRate;
        const avgWin = this.state.averageWin || 0.8; // 80% payout typical
        const avgLoss = this.state.averageLoss || 1.0; // 100% loss

        if (winRate <= 0 || avgWin <= 0) {
            return this.calculateFixedPercentagePosition(signal);
        }

        const b = avgWin / avgLoss; // Odds ratio
        const p = winRate; // Win probability
        const q = 1 - p; // Loss probability

        const kellyFraction = (b * p - q) / b;

        // Apply conservative multiplier and confidence adjustment
        const adjustedKelly = kellyFraction * this.config.kellyMultiplier * signal.confidence;

        // Convert to dollar amount
        const kellyPosition = Math.max(0, adjustedKelly * this.state.accountBalance);

        console.log(`📊 Kelly Criterion: ${(kellyFraction * 100).toFixed(2)}%, Adjusted: ${(adjustedKelly * 100).toFixed(2)}%`);

        return kellyPosition;
    }

    /**
     * Calculate fixed percentage position size
     */
    calculateFixedPercentagePosition(signal) {
        const basePercent = this.config.basePositionPercent;
        const confidenceAdjustment = signal.confidence || 0.7;
        
        const adjustedPercent = basePercent * confidenceAdjustment;
        return adjustedPercent * this.state.accountBalance;
    }

    /**
     * Apply risk adjustments based on current performance
     */
    applyRiskAdjustments(positionSize, signal) {
        if (!this.config.performanceAdjustmentEnabled) {
            return positionSize;
        }

        let adjustmentFactor = 1.0;

        // Reduce size if win rate is low
        if (this.state.winRate < this.config.winRateThreshold && this.state.totalTrades > 5) {
            adjustmentFactor *= 0.7; // Reduce by 30%
            console.log('⚠️ Reducing position size due to low win rate');
        }

        // Reduce size after consecutive losses
        if (this.state.consecutiveLosses > 0) {
            adjustmentFactor *= Math.pow(0.8, this.state.consecutiveLosses);
            console.log(`⚠️ Reducing position size due to ${this.state.consecutiveLosses} consecutive losses`);
        }

        // Increase size slightly after consecutive wins (but cap it)
        if (this.state.consecutiveWins > 2) {
            adjustmentFactor *= Math.min(1.3, 1 + (this.state.consecutiveWins * 0.05));
            console.log(`📈 Slightly increasing position size after ${this.state.consecutiveWins} wins`);
        }

        // Reduce size if approaching daily loss limit
        const dailyLossPercent = Math.abs(this.state.dailyPnL) / this.state.dailyStartBalance;
        if (this.state.dailyPnL < 0 && dailyLossPercent > 0.1) { // 10% daily loss
            adjustmentFactor *= 0.5; // Reduce by 50%
            console.log('⚠️ Reducing position size due to daily losses');
        }

        return positionSize * adjustmentFactor;
    }

    /**
     * Enforce position size limits
     */
    enforcePositionLimits(positionSize) {
        const maxPosition = this.config.maxPositionPercent * this.state.accountBalance;
        const minPosition = this.config.minPositionPercent * this.state.accountBalance;

        if (positionSize > maxPosition) {
            console.log(`⚠️ Position size capped at maximum: $${maxPosition.toFixed(2)}`);
            return maxPosition;
        }

        if (positionSize < minPosition) {
            console.log(`⚠️ Position size increased to minimum: $${minPosition.toFixed(2)}`);
            return minPosition;
        }

        return positionSize;
    }

    /**
     * Record trade result and update metrics
     */
    recordTradeResult(tradeResult) {
        console.log('📊 Recording trade result for risk management...');

        const { result, amount, pnl } = tradeResult;
        
        // Update trade counts
        this.state.totalTrades++;
        this.state.dailyTradeCount++;

        if (result === 'WIN') {
            this.state.winningTrades++;
            this.state.consecutiveWins++;
            this.state.consecutiveLosses = 0;
        } else {
            this.state.consecutiveWins = 0;
            this.state.consecutiveLosses++;
        }

        // Update balance and PnL
        this.state.accountBalance += pnl;
        this.state.dailyPnL += pnl;

        // Update peak balance and drawdown
        if (this.state.accountBalance > this.state.peakBalance) {
            this.state.peakBalance = this.state.accountBalance;
        }

        this.state.currentDrawdown = (this.state.peakBalance - this.state.accountBalance) / this.state.peakBalance;

        // Add to trade history
        this.tradeHistory.push({
            timestamp: Date.now(),
            result: result,
            amount: amount,
            pnl: pnl,
            balance: this.state.accountBalance
        });

        // Update performance metrics
        this.updatePerformanceMetrics();

        // Check for daily reset
        this.checkDailyReset();

        console.log(`💰 Account Balance: $${this.state.accountBalance.toFixed(2)}`);
        console.log(`📈 Win Rate: ${(this.state.winRate * 100).toFixed(1)}%`);
        console.log(`📉 Current Drawdown: ${(this.state.currentDrawdown * 100).toFixed(1)}%`);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        if (this.state.totalTrades === 0) return;

        // Calculate win rate
        this.state.winRate = this.state.winningTrades / this.state.totalTrades;

        // Calculate average win/loss
        const wins = this.tradeHistory.filter(t => t.result === 'WIN');
        const losses = this.tradeHistory.filter(t => t.result === 'LOSS');

        if (wins.length > 0) {
            this.state.averageWin = wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length;
        }

        if (losses.length > 0) {
            this.state.averageLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length);
        }

        // Calculate profit factor
        const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
        const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

        if (totalLosses > 0) {
            this.state.profitFactor = totalWins / totalLosses;
        }
    }

    /**
     * Check for daily reset
     */
    checkDailyReset() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (now - this.state.lastResetTime > oneDay) {
            console.log('🔄 Daily reset - resetting daily counters');

            // Store daily result
            this.dailyResults.push({
                date: new Date(this.state.lastResetTime).toISOString().split('T')[0],
                startBalance: this.state.dailyStartBalance,
                endBalance: this.state.accountBalance,
                pnl: this.state.dailyPnL,
                trades: this.state.dailyTradeCount
            });

            // Reset daily counters
            this.state.dailyStartBalance = this.state.accountBalance;
            this.state.dailyPnL = 0;
            this.state.dailyTradeCount = 0;
            this.state.dailyLossAmount = 0;
            this.state.lastResetTime = now;

            // Clear cooldown if it's a new day
            if (this.state.cooldownUntil < now) {
                this.state.cooldownUntil = 0;
            }
        }
    }

    /**
     * Trigger emergency stop
     */
    triggerEmergencyStop(reason) {
        console.log(`🚨 EMERGENCY STOP TRIGGERED: ${reason}`);
        this.state.emergencyStop = true;

        // Log emergency stop
        this.tradeHistory.push({
            timestamp: Date.now(),
            event: 'EMERGENCY_STOP',
            reason: reason,
            balance: this.state.accountBalance
        });
    }

    /**
     * Trigger cooldown period
     */
    triggerCooldown(reason) {
        console.log(`⏸️ COOLDOWN TRIGGERED: ${reason}`);
        this.state.cooldownUntil = Date.now() + this.config.cooldownPeriod;

        // Log cooldown
        this.tradeHistory.push({
            timestamp: Date.now(),
            event: 'COOLDOWN',
            reason: reason,
            duration: this.config.cooldownPeriod
        });
    }

    /**
     * Get current risk level
     */
    getRiskLevel() {
        let riskScore = 0;

        // Drawdown risk
        if (this.state.currentDrawdown > 0.2) riskScore += 3;
        else if (this.state.currentDrawdown > 0.1) riskScore += 2;
        else if (this.state.currentDrawdown > 0.05) riskScore += 1;

        // Consecutive losses risk
        if (this.state.consecutiveLosses >= 3) riskScore += 3;
        else if (this.state.consecutiveLosses >= 2) riskScore += 2;
        else if (this.state.consecutiveLosses >= 1) riskScore += 1;

        // Win rate risk
        if (this.state.totalTrades > 10) {
            if (this.state.winRate < 0.5) riskScore += 3;
            else if (this.state.winRate < 0.6) riskScore += 2;
            else if (this.state.winRate < 0.65) riskScore += 1;
        }

        // Daily loss risk
        const dailyLossPercent = Math.abs(this.state.dailyPnL) / this.state.dailyStartBalance;
        if (this.state.dailyPnL < 0) {
            if (dailyLossPercent > 0.15) riskScore += 3;
            else if (dailyLossPercent > 0.1) riskScore += 2;
            else if (dailyLossPercent > 0.05) riskScore += 1;
        }

        // Determine risk level
        if (riskScore >= 8) return 'CRITICAL';
        if (riskScore >= 6) return 'HIGH';
        if (riskScore >= 4) return 'MEDIUM';
        if (riskScore >= 2) return 'LOW';
        return 'MINIMAL';
    }

    /**
     * Get risk management status
     */
    getStatus() {
        return {
            canTrade: this.canTrade(),
            riskLevel: this.getRiskLevel(),
            accountBalance: this.state.accountBalance,
            currentDrawdown: this.state.currentDrawdown,
            dailyPnL: this.state.dailyPnL,
            winRate: this.state.winRate,
            consecutiveLosses: this.state.consecutiveLosses,
            consecutiveWins: this.state.consecutiveWins,
            dailyTradeCount: this.state.dailyTradeCount,
            emergencyStop: this.state.emergencyStop,
            cooldownUntil: this.state.cooldownUntil,
            profitFactor: this.state.profitFactor
        };
    }

    /**
     * Reset emergency stop (manual override)
     */
    resetEmergencyStop() {
        console.log('🔄 Resetting emergency stop (manual override)');
        this.state.emergencyStop = false;

        this.tradeHistory.push({
            timestamp: Date.now(),
            event: 'EMERGENCY_STOP_RESET',
            balance: this.state.accountBalance
        });
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        const totalPnL = this.state.accountBalance - 100; // Assuming $100 start
        const totalReturn = (totalPnL / 100) * 100;

        return {
            summary: {
                totalTrades: this.state.totalTrades,
                winRate: this.state.winRate,
                totalReturn: totalReturn,
                currentBalance: this.state.accountBalance,
                maxDrawdown: this.state.currentDrawdown,
                profitFactor: this.state.profitFactor
            },
            daily: this.dailyResults,
            recent: this.tradeHistory.slice(-10),
            riskMetrics: {
                sharpeRatio: this.state.sharpeRatio,
                averageWin: this.state.averageWin,
                averageLoss: this.state.averageLoss,
                riskLevel: this.getRiskLevel()
            }
        };
    }

    /**
     * Dispose and cleanup
     */
    dispose() {
        console.log('🗑️ Disposing Risk Management System...');
        this.tradeHistory = [];
        this.dailyResults = [];
        console.log('✅ Risk Management System disposed');
    }
}

module.exports = { AdvancedRiskManagement };
