/**
 * Human Behavior Simulation System
 * 
 * Implements sophisticated anti-detection mechanisms to simulate human trading behavior:
 * - Random timing delays and variations
 * - Position size variation and inconsistency
 * - Occasional signal skipping and hesitation
 * - Simulated losing streaks and emotional responses
 * - Natural trading patterns and mistakes
 * - Weekend/holiday avoidance
 * - Realistic profit curves
 */

class HumanBehaviorSimulator {
    constructor(config = {}) {
        this.config = {
            // Timing simulation
            minDelayBetweenTrades: config.minDelayBetweenTrades || 45000, // 45 seconds
            maxDelayBetweenTrades: config.maxDelayBetweenTrades || 300000, // 5 minutes
            hesitationProbability: config.hesitationProbability || 0.15, // 15% chance to hesitate
            
            // Position sizing
            basePositionSize: config.basePositionSize || 10, // Base amount
            positionVariation: config.positionVariation || 0.3, // ±30% variation
            emotionalSizingEnabled: config.emotionalSizingEnabled !== false,
            
            // Signal behavior
            signalSkipProbability: config.signalSkipProbability || 0.08, // 8% skip rate
            lowConfidenceSkipRate: config.lowConfidenceSkipRate || 0.25, // 25% skip low confidence
            maxSignalsPerHour: config.maxSignalsPerHour || 4,
            maxSignalsPerDay: config.maxSignalsPerDay || 12,
            
            // Losing streak simulation
            simulateLosingStreaks: config.simulateLosingStreaks !== false,
            maxConsecutiveWins: config.maxConsecutiveWins || 7, // Force loss after 7 wins
            losingStreakProbability: config.losingStreakProbability || 0.12, // 12% chance
            
            // Market hours and holidays
            respectMarketHours: config.respectMarketHours !== false,
            avoidWeekends: config.avoidWeekends !== false,
            avoidHolidays: config.avoidHolidays !== false,
            
            // Performance targets
            targetWinRate: config.targetWinRate || 0.68, // 68% target (realistic)
            maxWinRate: config.maxWinRate || 0.75, // Never exceed 75%
            
            ...config
        };

        // State tracking
        this.state = {
            consecutiveWins: 0,
            consecutiveLosses: 0,
            totalTrades: 0,
            totalWins: 0,
            lastTradeTime: 0,
            currentEmotionalState: 'neutral', // neutral, confident, cautious, frustrated
            dailyTradeCount: 0,
            hourlyTradeCount: 0,
            lastResetTime: Date.now(),
            isInLosingStreak: false,
            losingStreakCount: 0
        };

        // Behavioral patterns
        this.behaviorPatterns = {
            morning: { activity: 0.7, caution: 0.3 },
            afternoon: { activity: 0.9, caution: 0.2 },
            evening: { activity: 0.6, caution: 0.4 },
            night: { activity: 0.3, caution: 0.7 }
        };

        // Holiday calendar (simplified)
        this.holidays = [
            '2025-01-01', '2025-07-04', '2025-12-25', // Major holidays
            // Add more holidays as needed
        ];
    }

    /**
     * Main method to determine if a trade should be executed
     */
    shouldExecuteTrade(signal, marketConditions = {}) {
        console.log('🤖 Evaluating trade execution with human behavior simulation...');

        // Check basic constraints
        if (!this.isMarketOpen()) {
            console.log('❌ Market closed - skipping trade');
            return { execute: false, reason: 'Market closed' };
        }

        if (!this.checkTradeFrequencyLimits()) {
            console.log('❌ Trade frequency limit reached');
            return { execute: false, reason: 'Frequency limit reached' };
        }

        // Apply human behavior filters
        const behaviorChecks = [
            this.checkTimingBehavior(),
            this.checkSignalQualityBehavior(signal),
            this.checkEmotionalState(signal),
            this.checkLosingStreakBehavior(),
            this.checkWinRateBehavior()
        ];

        const failedChecks = behaviorChecks.filter(check => !check.passed);
        
        if (failedChecks.length > 0) {
            const reason = failedChecks.map(check => check.reason).join(', ');
            console.log(`❌ Human behavior check failed: ${reason}`);
            return { execute: false, reason: reason };
        }

        // Calculate position size with human variation
        const positionSize = this.calculateHumanPositionSize(signal);

        // Add execution delay
        const delay = this.calculateExecutionDelay(signal);

        console.log('✅ Trade approved by human behavior simulation');
        return {
            execute: true,
            positionSize: positionSize,
            executionDelay: delay,
            emotionalState: this.state.currentEmotionalState,
            confidence: this.adjustConfidenceForBehavior(signal.confidence)
        };
    }

    /**
     * Check if market is open (avoid weekends and holidays)
     */
    isMarketOpen() {
        if (!this.config.respectMarketHours) return true;

        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Avoid weekends
        if (this.config.avoidWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
            return false;
        }

        // Avoid holidays
        if (this.config.avoidHolidays) {
            const today = now.toISOString().split('T')[0];
            if (this.holidays.includes(today)) {
                return false;
            }
        }

        // Check market hours (simplified - 24/5 for forex)
        const hour = now.getHours();
        if (hour < 1 || hour > 23) { // Avoid very late/early hours
            return false;
        }

        return true;
    }

    /**
     * Check trade frequency limits
     */
    checkTradeFrequencyLimits() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const oneDay = 24 * oneHour;

        // Reset counters if needed
        if (now - this.state.lastResetTime > oneDay) {
            this.state.dailyTradeCount = 0;
            this.state.hourlyTradeCount = 0;
            this.state.lastResetTime = now;
        } else if (now - this.state.lastResetTime > oneHour) {
            this.state.hourlyTradeCount = 0;
        }

        // Check limits
        if (this.state.hourlyTradeCount >= this.config.maxSignalsPerHour) {
            return false;
        }

        if (this.state.dailyTradeCount >= this.config.maxSignalsPerDay) {
            return false;
        }

        return true;
    }

    /**
     * Check timing behavior (random delays, hesitation)
     */
    checkTimingBehavior() {
        const now = Date.now();
        const timeSinceLastTrade = now - this.state.lastTradeTime;
        const minDelay = this.config.minDelayBetweenTrades;

        // Enforce minimum delay
        if (timeSinceLastTrade < minDelay) {
            return { passed: false, reason: 'Too soon after last trade' };
        }

        // Random hesitation
        if (Math.random() < this.config.hesitationProbability) {
            return { passed: false, reason: 'Random hesitation' };
        }

        return { passed: true };
    }

    /**
     * Check signal quality behavior (skip low confidence signals)
     */
    checkSignalQualityBehavior(signal) {
        // Skip low confidence signals more often
        if (signal.confidence < 0.7 && Math.random() < this.config.lowConfidenceSkipRate) {
            return { passed: false, reason: 'Low confidence signal skipped' };
        }

        // Random signal skipping
        if (Math.random() < this.config.signalSkipProbability) {
            return { passed: false, reason: 'Random signal skip' };
        }

        return { passed: true };
    }

    /**
     * Check emotional state behavior
     */
    checkEmotionalState(signal) {
        // Cautious after losses
        if (this.state.currentEmotionalState === 'cautious' && signal.confidence < 0.8) {
            return { passed: false, reason: 'Too cautious after recent losses' };
        }

        // Overconfident after wins (occasionally skip good signals)
        if (this.state.currentEmotionalState === 'confident' && Math.random() < 0.1) {
            return { passed: false, reason: 'Overconfident - skipping signal' };
        }

        // Frustrated state (skip more signals)
        if (this.state.currentEmotionalState === 'frustrated' && Math.random() < 0.3) {
            return { passed: false, reason: 'Frustrated - avoiding trades' };
        }

        return { passed: true };
    }

    /**
     * Check losing streak behavior
     */
    checkLosingStreakBehavior() {
        // Force losing streak occasionally
        if (this.config.simulateLosingStreaks && 
            this.state.consecutiveWins >= this.config.maxConsecutiveWins &&
            Math.random() < 0.7) {
            return { passed: false, reason: 'Simulated losing streak' };
        }

        return { passed: true };
    }

    /**
     * Check win rate behavior (keep it realistic)
     */
    checkWinRateBehavior() {
        if (this.state.totalTrades === 0) return { passed: true };

        const currentWinRate = this.state.totalWins / this.state.totalTrades;
        
        // If win rate is too high, force some losses
        if (currentWinRate > this.config.maxWinRate && Math.random() < 0.8) {
            return { passed: false, reason: 'Win rate too high - forcing loss' };
        }

        return { passed: true };
    }

    /**
     * Calculate human-like position sizing
     */
    calculateHumanPositionSize(signal) {
        let baseSize = this.config.basePositionSize;

        // Emotional sizing adjustments
        if (this.config.emotionalSizingEnabled) {
            switch (this.state.currentEmotionalState) {
                case 'confident':
                    baseSize *= 1.2; // Increase size when confident
                    break;
                case 'cautious':
                    baseSize *= 0.7; // Decrease size when cautious
                    break;
                case 'frustrated':
                    baseSize *= 0.5; // Much smaller size when frustrated
                    break;
            }
        }

        // Add random variation
        const variation = (Math.random() - 0.5) * 2 * this.config.positionVariation;
        baseSize *= (1 + variation);

        // Confidence-based sizing
        baseSize *= (0.5 + signal.confidence * 0.5);

        // Round to realistic values
        return Math.max(1, Math.round(baseSize));
    }

    /**
     * Calculate execution delay (human thinking time)
     */
    calculateExecutionDelay(signal) {
        const baseDelay = 2000; // 2 seconds base
        const maxDelay = 15000; // 15 seconds max

        // Add random delay
        const randomDelay = Math.random() * (maxDelay - baseDelay);
        
        // Longer delay for lower confidence
        const confidenceDelay = (1 - signal.confidence) * 5000;
        
        // Emotional state affects delay
        let emotionalMultiplier = 1;
        switch (this.state.currentEmotionalState) {
            case 'confident':
                emotionalMultiplier = 0.7; // Faster execution
                break;
            case 'cautious':
                emotionalMultiplier = 1.5; // Slower execution
                break;
            case 'frustrated':
                emotionalMultiplier = 2.0; // Much slower
                break;
        }

        return Math.round((baseDelay + randomDelay + confidenceDelay) * emotionalMultiplier);
    }

    /**
     * Adjust confidence to appear more human
     */
    adjustConfidenceForBehavior(originalConfidence) {
        // Add slight randomness to confidence
        const variation = (Math.random() - 0.5) * 0.1; // ±5%
        return Math.max(0.1, Math.min(0.95, originalConfidence + variation));
    }
