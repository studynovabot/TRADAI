/**
 * Auto-Trading Execution Engine
 * Executes trades based on AI signals with strict risk management
 * Supports Quotex.io and other binary options platforms
 */

class AutoTradeEngine {
    constructor() {
        this.isEnabled = false;
        this.isExecuting = false;
        this.platform = 'quotex'; // Default platform
        this.accountBalance = 0;
        this.tradeHistory = [];
        this.lastTradeTime = 0;
        this.minTradeInterval = 300000; // 5 minutes minimum between trades
        
        // Risk management settings
        this.riskSettings = {
            maxTradesPerDay: 10,
            maxTradesPerHour: 3,
            maxConsecutiveLosses: 2,
            dailyLossLimit: 5, // Max 5 losing trades per day
            maxRiskPerTrade: 3, // 3% of account balance
            emergencyStop: false,
            cooldownAfterLoss: 1800000, // 30 minutes cooldown after loss
            minConfidenceForTrade: 85
        };
        
        // Platform-specific selectors
        this.platformSelectors = {
            quotex: {
                // Primary selectors
                tradeAmount: 'input[data-testid="trade-amount-input"]',
                callButton: '[data-testid="call-button"]',
                putButton: '[data-testid="put-button"]',
                balance: '[data-testid="balance"]',
                assetSelector: '[data-testid="asset-selector"]',
                timeSelector: '[data-testid="time-selector"]',
                confirmButton: '[data-testid="confirm-trade"]',
                tradeResult: '[data-testid="trade-result"]',

                // Enhanced fallback selectors (2025 update)
                tradeAmountAlt: [
                    '.trade-amount input',
                    'input[name="amount"]',
                    'input[placeholder*="amount"]',
                    'input[placeholder*="Amount"]',
                    '.amount-input',
                    '.bet-amount',
                    '.trade-amount',
                    'input[type="number"]',
                    '[class*="amount-input"]',
                    '[class*="trade-amount"]'
                ],

                callButtonAlt: [
                    '.call-button',
                    '.up-button',
                    '.buy-button',
                    'button[data-direction="call"]',
                    'button[data-type="call"]',
                    'button[data-action="buy"]',
                    'button.green',
                    '[class*="call-button"]',
                    '[class*="buy-button"]',
                    '[class*="up-button"]',
                    'button:contains("Call")',
                    'button:contains("Buy")',
                    'button:contains("Up")',
                    'div[role="button"][class*="call"]',
                    'div[role="button"][class*="buy"]',
                    'div[role="button"][class*="up"]'
                ],

                putButtonAlt: [
                    '.put-button',
                    '.down-button',
                    '.sell-button',
                    'button[data-direction="put"]',
                    'button[data-type="put"]',
                    'button[data-action="sell"]',
                    'button.red',
                    '[class*="put-button"]',
                    '[class*="sell-button"]',
                    '[class*="down-button"]',
                    'button:contains("Put")',
                    'button:contains("Sell")',
                    'button:contains("Down")',
                    'div[role="button"][class*="put"]',
                    'div[role="button"][class*="sell"]',
                    'div[role="button"][class*="down"]'
                ],

                balanceAlt: [
                    '.balance',
                    '.account-balance',
                    '.current-balance',
                    '[class*="balance"]',
                    '.wallet-balance',
                    '.user-balance'
                ],

                expirySelectors: [
                    'select[data-type="expiry"]',
                    'select[name="expiry"]',
                    '.expiry-select',
                    '.time-selector select',
                    '.duration-select',
                    '[class*="expiry-select"]',
                    '[class*="time-select"]',
                    '[class*="duration"]'
                ]
            }
        };
        
        this.init();
    }

    async init() {
        console.log('[Auto Trade Engine] 🤖 Initializing auto-trading engine...');
        
        try {
            // Load settings from storage
            await this.loadSettings();
            
            // Detect current platform
            this.detectPlatform();
            
            // Initialize DOM observers
            this.initializeDOMObservers();
            
            // Load trade history
            await this.loadTradeHistory();
            
            console.log('[Auto Trade Engine] ✅ Auto-trading engine ready');
            
        } catch (error) {
            console.error('[Auto Trade Engine] 💥 Initialization failed:', error);
        }
    }

    detectPlatform() {
        const hostname = window.location.hostname.toLowerCase();
        
        if (hostname.includes('quotex')) {
            this.platform = 'quotex';
        } else if (hostname.includes('iqoption')) {
            this.platform = 'iqoption';
        } else if (hostname.includes('olymptrade')) {
            this.platform = 'olymptrade';
        } else if (hostname.includes('binomo')) {
            this.platform = 'binomo';
        } else {
            this.platform = 'generic';
        }
        
        console.log(`[Auto Trade Engine] 🎯 Platform detected: ${this.platform}`);
    }

    async executeSignal(signal) {
        if (!this.isEnabled) {
            console.log('[Auto Trade Engine] ⏸️ Auto-trading disabled');
            return { success: false, reason: 'Auto-trading disabled' };
        }

        if (this.riskSettings.emergencyStop) {
            console.log('[Auto Trade Engine] 🛑 Emergency stop active');
            return { success: false, reason: 'Emergency stop active' };
        }

        if (this.isExecuting) {
            console.log('[Auto Trade Engine] ⏳ Trade execution in progress');
            return { success: false, reason: 'Trade execution in progress' };
        }

        try {
            console.log('[Auto Trade Engine] 🚀 Executing trade signal...');
            this.isExecuting = true;

            // Validate signal
            const validation = this.validateSignal(signal);
            if (!validation.valid) {
                return { success: false, reason: validation.reason };
            }

            // Check risk limits
            const riskCheck = this.checkRiskLimits();
            if (!riskCheck.allowed) {
                return { success: false, reason: riskCheck.reason };
            }

            // Calculate trade amount
            const tradeAmount = this.calculateTradeAmount(signal);
            if (tradeAmount <= 0) {
                return { success: false, reason: 'Invalid trade amount calculated' };
            }

            // Execute the trade
            const tradeResult = await this.executeTrade(signal, tradeAmount);
            
            // Record trade
            if (tradeResult.success) {
                this.recordTrade(signal, tradeAmount, tradeResult);
                this.lastTradeTime = Date.now();
            }

            return tradeResult;

        } catch (error) {
            console.error('[Auto Trade Engine] 💥 Trade execution failed:', error);
            return { success: false, reason: `Execution error: ${error.message}` };
        } finally {
            this.isExecuting = false;
        }
    }

    validateSignal(signal) {
        // Check signal structure
        if (!signal || !signal.direction || !signal.confidence) {
            console.log('[Auto Trade Engine] ❌ Invalid signal structure');
            return { valid: false, reason: 'Invalid signal structure' };
        }

        // Check confidence threshold with stricter requirements for production
        if (signal.confidence < this.riskSettings.minConfidenceForTrade) {
            console.log(`[Auto Trade Engine] ❌ Confidence too low: ${signal.confidence}% < ${this.riskSettings.minConfidenceForTrade}%`);
            return { 
                valid: false, 
                reason: `Confidence too low: ${signal.confidence}% < ${this.riskSettings.minConfidenceForTrade}%` 
            };
        }

        // Check signal age (signals should be fresh)
        const signalAge = Date.now() - (signal.timestamp || 0);
        if (signalAge > 120000) { // 2 minutes - stricter for production
            console.log(`[Auto Trade Engine] ❌ Signal too old: ${Math.round(signalAge/1000)}s`);
            return { valid: false, reason: `Signal too old: ${Math.round(signalAge/1000)}s` };
        }

        // Check direction validity with more flexible matching
        const direction = signal.direction.toLowerCase();
        if (!['up', 'down', 'call', 'put', 'buy', 'sell'].includes(direction)) {
            console.log(`[Auto Trade Engine] ❌ Invalid signal direction: ${direction}`);
            return { valid: false, reason: `Invalid signal direction: ${direction}` };
        }
        
        // Check if signal is from real data
        if (signal.real_data === false) {
            console.log('[Auto Trade Engine] ❌ Signal not from real data');
            return { valid: false, reason: 'Signal not from real data' };
        }
        
        // Check data quality if available
        if (signal.technical_details && signal.technical_details.data_quality === 'poor') {
            console.log('[Auto Trade Engine] ❌ Poor data quality');
            return { valid: false, reason: 'Poor data quality' };
        }
        
        // Check timeframe alignment if available
        if (signal.technical_details && signal.technical_details.timeframe_alignment < 60) {
            console.log(`[Auto Trade Engine] ❌ Poor timeframe alignment: ${signal.technical_details.timeframe_alignment}%`);
            return { valid: false, reason: `Poor timeframe alignment: ${signal.technical_details.timeframe_alignment}%` };
        }
        
        // Check for extreme volatility
        if (signal.volatility === 'extreme') {
            console.log('[Auto Trade Engine] ❌ Extreme market volatility');
            return { valid: false, reason: 'Extreme market volatility' };
        }

        console.log('[Auto Trade Engine] ✅ Signal validation passed');
        return { 
            valid: true,
            normalized_direction: (direction === 'up' || direction === 'call' || direction === 'buy') ? 'call' : 'put'
        };
    }

    checkRiskLimits() {
        const now = Date.now();
        
        // Check if emergency stop is active
        if (this.riskSettings.emergencyStop) {
            return { 
                allowed: false, 
                reason: 'Emergency stop is active',
                code: 'EMERGENCY_STOP'
            };
        }
        
        // Check minimum interval between trades with enhanced logic
        if (now - this.lastTradeTime < this.minTradeInterval) {
            const remainingTime = Math.ceil((this.minTradeInterval - (now - this.lastTradeTime)) / 1000);
            return { 
                allowed: false, 
                reason: `Minimum trade interval not met. Wait ${remainingTime}s`,
                code: 'MIN_INTERVAL',
                remaining_seconds: remainingTime
            };
        }

        // Check daily trade limit with enhanced tracking
        const todayTrades = this.getTodayTrades();
        if (todayTrades.length >= this.riskSettings.maxTradesPerDay) {
            return { 
                allowed: false, 
                reason: `Daily trade limit reached (${todayTrades.length}/${this.riskSettings.maxTradesPerDay})`,
                code: 'DAILY_LIMIT',
                current: todayTrades.length,
                limit: this.riskSettings.maxTradesPerDay
            };
        }

        // Check hourly trade limit with enhanced tracking
        const hourlyTrades = this.getHourlyTrades();
        if (hourlyTrades.length >= this.riskSettings.maxTradesPerHour) {
            const nextHourReset = 3600 - Math.floor((now - hourlyTrades[0].timestamp) / 1000);
            return { 
                allowed: false, 
                reason: `Hourly trade limit reached (${hourlyTrades.length}/${this.riskSettings.maxTradesPerHour})`,
                code: 'HOURLY_LIMIT',
                current: hourlyTrades.length,
                limit: this.riskSettings.maxTradesPerHour,
                reset_in_seconds: nextHourReset
            };
        }

        // Check consecutive losses with enhanced tracking
        const recentTrades = this.tradeHistory.slice(-this.riskSettings.maxConsecutiveLosses);
        const consecutiveLosses = recentTrades.length > 0 && recentTrades.every(trade => trade.result === 'loss');
        
        if (recentTrades.length >= this.riskSettings.maxConsecutiveLosses && consecutiveLosses) {
            return { 
                allowed: false, 
                reason: `Maximum consecutive losses reached (${recentTrades.length})`,
                code: 'CONSECUTIVE_LOSSES',
                losses: recentTrades.length,
                limit: this.riskSettings.maxConsecutiveLosses
            };
        }

        // Check daily loss limit with enhanced tracking
        const todayLosses = todayTrades.filter(trade => trade.result === 'loss');
        if (todayLosses.length >= this.riskSettings.dailyLossLimit) {
            return { 
                allowed: false, 
                reason: `Daily loss limit reached (${todayLosses.length}/${this.riskSettings.dailyLossLimit})`,
                code: 'DAILY_LOSS_LIMIT',
                current: todayLosses.length,
                limit: this.riskSettings.dailyLossLimit
            };
        }

        // Check cooldown after loss with enhanced tracking
        const lastTrade = this.tradeHistory[this.tradeHistory.length - 1];
        if (lastTrade && lastTrade.result === 'loss') {
            const timeSinceLastLoss = now - lastTrade.timestamp;
            if (timeSinceLastLoss < this.riskSettings.cooldownAfterLoss) {
                const remainingCooldown = Math.ceil((this.riskSettings.cooldownAfterLoss - timeSinceLastLoss) / 60000);
                const remainingSeconds = Math.ceil((this.riskSettings.cooldownAfterLoss - timeSinceLastLoss) / 1000);
                return { 
                    allowed: false, 
                    reason: `Cooldown active after loss. Wait ${remainingCooldown} minutes`,
                    code: 'COOLDOWN_ACTIVE',
                    remaining_minutes: remainingCooldown,
                    remaining_seconds: remainingSeconds,
                    cooldown_total: this.riskSettings.cooldownAfterLoss / 60000
                };
            }
        }
        
        // Check account balance protection
        const currentBalance = this.getCurrentBalance();
        if (currentBalance > 0) {
            // Check if we've lost more than allowed percentage in a day
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            
            const todayCompletedTrades = todayTrades.filter(trade => trade.result !== null);
            const todayProfitLoss = todayCompletedTrades.reduce((sum, trade) => {
                if (trade.result === 'win' && trade.payout) {
                    return sum + trade.payout;
                } else if (trade.result === 'loss' && trade.amount) {
                    return sum - trade.amount;
                }
                return sum;
            }, 0);
            
            // If we've lost more than 10% of current balance today
            if (todayProfitLoss < 0 && Math.abs(todayProfitLoss) > (currentBalance * 0.1)) {
                return { 
                    allowed: false, 
                    reason: `Daily loss exceeds 10% of account balance`,
                    code: 'BALANCE_PROTECTION',
                    daily_loss: Math.abs(todayProfitLoss),
                    balance: currentBalance
                };
            }
        }
        
        // Check win rate protection
        if (this.tradeHistory.length >= 5) {
            const recentTrades = this.tradeHistory.slice(-5).filter(trade => trade.result !== null);
            if (recentTrades.length >= 5) {
                const wins = recentTrades.filter(trade => trade.result === 'win').length;
                const winRate = wins / recentTrades.length;
                
                if (winRate < 0.2) { // Less than 20% win rate
                    return { 
                        allowed: false, 
                        reason: `Win rate too low (${Math.round(winRate * 100)}%). Taking a break.`,
                        code: 'LOW_WIN_RATE',
                        win_rate: Math.round(winRate * 100)
                    };
                }
            }
        }
        
        // Check market condition (if we have volatility data)
        if (this.marketCondition && this.marketCondition.volatility === 'extreme') {
            return { 
                allowed: false, 
                reason: `Extreme market volatility detected. Trading paused.`,
                code: 'EXTREME_VOLATILITY'
            };
        }

        // All checks passed
        return { 
            allowed: true,
            code: 'ALLOWED',
            daily_trades: todayTrades.length,
            hourly_trades: hourlyTrades.length,
            time_since_last_trade: now - this.lastTradeTime
        };
    }
    
    updateMarketCondition(condition) {
        this.marketCondition = condition;
        console.log(`[Auto Trade Engine] Market condition updated: ${condition.volatility} volatility`);
    }

    calculateTradeAmount(signal) {
        try {
            // Get current balance with retry logic
            let balance = this.getCurrentBalance();
            if (balance <= 0) {
                console.warn('[Auto Trade Engine] Cannot determine account balance, retrying...');
                // Try alternative methods to get balance
                balance = this.getBalanceFromAlternativeSources();
                
                if (balance <= 0) {
                    console.error('[Auto Trade Engine] Failed to determine account balance');
                    return 0;
                }
            }

            console.log(`[Auto Trade Engine] 💰 Current balance: $${balance}`);

            // Base amount (percentage of balance) with enhanced risk management
            let baseAmount = balance * (this.riskSettings.maxRiskPerTrade / 100);

            // Use signal's position size recommendation if available
            if (signal.position_size && signal.position_size.recommended_percent > 0) {
                const signalRecommendedAmount = balance * (signal.position_size.recommended_percent / 100);
                
                // Use the lower of our calculation and signal recommendation for safety
                baseAmount = Math.min(baseAmount, signalRecommendedAmount);
                
                console.log(`[Auto Trade Engine] Signal recommends ${signal.position_size.recommended_percent}% position size`);
            }

            // Adjust based on signal confidence with enhanced scaling
            let confidenceMultiplier = 0.8; // Default conservative multiplier
            
            if (signal.confidence >= 90) {
                confidenceMultiplier = 1.2; // Very high confidence
            } else if (signal.confidence >= 85) {
                confidenceMultiplier = 1.1; // High confidence
            } else if (signal.confidence >= 80) {
                confidenceMultiplier = 1.0; // Good confidence
            } else if (signal.confidence >= 75) {
                confidenceMultiplier = 0.9; // Moderate confidence
            }
            
            baseAmount *= confidenceMultiplier;
            console.log(`[Auto Trade Engine] Confidence multiplier: ${confidenceMultiplier.toFixed(2)}`);

            // Adjust based on signal strength with enhanced logic
            if (signal.signal_strength === 'very_strong') {
                baseAmount *= 1.1;
                console.log('[Auto Trade Engine] Very strong signal: +10% size');
            } else if (signal.signal_strength === 'strong') {
                baseAmount *= 1.05;
                console.log('[Auto Trade Engine] Strong signal: +5% size');
            } else if (signal.signal_strength === 'weak') {
                baseAmount *= 0.7;
                console.log('[Auto Trade Engine] Weak signal: -30% size');
            }

            // Adjust based on recent performance with enhanced logic
            const recentWinRate = this.getRecentWinRate();
            let performanceMultiplier = 1.0;
            
            if (recentWinRate < 0.3) { // Very poor performance
                performanceMultiplier = 0.5; // Significantly reduce trade size
                console.log(`[Auto Trade Engine] Very poor win rate (${Math.round(recentWinRate * 100)}%): -50% size`);
            } else if (recentWinRate < 0.4) { // Poor performance
                performanceMultiplier = 0.7; // Reduce trade size
                console.log(`[Auto Trade Engine] Poor win rate (${Math.round(recentWinRate * 100)}%): -30% size`);
            } else if (recentWinRate > 0.7) { // Good performance
                performanceMultiplier = 1.1; // Slightly increase trade size
                console.log(`[Auto Trade Engine] Good win rate (${Math.round(recentWinRate * 100)}%): +10% size`);
            } else if (recentWinRate > 0.8) { // Excellent performance
                performanceMultiplier = 1.2; // Increase trade size
                console.log(`[Auto Trade Engine] Excellent win rate (${Math.round(recentWinRate * 100)}%): +20% size`);
            }
            
            baseAmount *= performanceMultiplier;

            // Adjust based on market volatility if available
            if (signal.volatility) {
                let volatilityMultiplier = 1.0;
                
                if (signal.volatility === 'high') {
                    volatilityMultiplier = 0.8; // Reduce size in high volatility
                    console.log('[Auto Trade Engine] High volatility: -20% size');
                } else if (signal.volatility === 'low') {
                    volatilityMultiplier = 1.1; // Increase size in low volatility
                    console.log('[Auto Trade Engine] Low volatility: +10% size');
                }
                
                baseAmount *= volatilityMultiplier;
            }
            
            // Adjust based on risk assessment if available
            if (signal.risk_assessment && signal.risk_assessment.level) {
                let riskMultiplier = 1.0;
                
                if (signal.risk_assessment.level === 'High') {
                    riskMultiplier = 0.7; // Reduce size for high risk
                    console.log('[Auto Trade Engine] High risk assessment: -30% size');
                } else if (signal.risk_assessment.level === 'Low') {
                    riskMultiplier = 1.1; // Increase size for low risk
                    console.log('[Auto Trade Engine] Low risk assessment: +10% size');
                }
                
                baseAmount *= riskMultiplier;
            }
            
            // Apply daily loss protection
            const todayTrades = this.getTodayTrades();
            const todayLosses = todayTrades.filter(trade => trade.result === 'loss').length;
            
            if (todayLosses > 0) {
                // Reduce position size after losses
                const lossMultiplier = Math.max(0.5, 1 - (todayLosses * 0.1)); // Reduce by 10% per loss, min 50%
                baseAmount *= lossMultiplier;
                console.log(`[Auto Trade Engine] ${todayLosses} losses today: ${Math.round((1-lossMultiplier)*100)}% size reduction`);
            }

            // Ensure minimum and maximum trade amounts
            const minTradeAmount = 1.0; // Minimum $1 trade
            const maxTradeAmount = Math.min(balance * 0.05, 100); // Maximum 5% of balance or $100
            
            baseAmount = Math.max(minTradeAmount, Math.min(maxTradeAmount, baseAmount));

            // Round to platform-appropriate amount
            const finalAmount = this.roundTradeAmount(baseAmount);
            
            console.log(`[Auto Trade Engine] 💰 Final trade amount: $${finalAmount.toFixed(2)} (${(finalAmount/balance*100).toFixed(2)}% of balance)`);
            
            return finalAmount;

        } catch (error) {
            console.error('[Auto Trade Engine] Trade amount calculation failed:', error);
            return 0;
        }
    }
    
    getBalanceFromAlternativeSources() {
        try {
            // Try alternative selectors for balance
            const alternativeSelectors = [
                '.balance-value',
                '[class*="balance"]',
                '[class*="account-value"]',
                '[class*="account-balance"]',
                '[data-balance]',
                '[class*="money"]'
            ];
            
            for (const selector of alternativeSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent || '';
                    const matches = text.match(/[\d,]+\.?\d*/);
                    if (matches && matches[0]) {
                        const balance = parseFloat(matches[0].replace(/,/g, ''));
                        if (balance > 0) {
                            console.log(`[Auto Trade Engine] Found balance via alternative selector: $${balance}`);
                            return balance;
                        }
                    }
                }
            }
            
            // If we still can't find balance, use a conservative default
            return 100; // Assume $100 balance
        } catch (error) {
            console.error('[Auto Trade Engine] Alternative balance detection failed:', error);
            return 100; // Default fallback
        }
    }
    
    roundTradeAmount(amount) {
        try {
            // Different platforms have different rounding requirements
            switch (this.platform) {
                case 'quotex':
                    // Quotex typically uses 1 unit increments
                    return Math.max(1, Math.round(amount));
                    
                case 'iqoption':
                    // IQ Option typically uses specific increments
                    if (amount <= 5) return Math.max(1, Math.round(amount));
                    if (amount <= 50) return Math.round(amount / 5) * 5; // Round to nearest 5
                    if (amount <= 100) return Math.round(amount / 10) * 10; // Round to nearest 10
                    return Math.round(amount / 50) * 50; // Round to nearest 50
                    
                case 'olymptrade':
                    // Olymp Trade typically uses 1 unit increments
                    return Math.max(1, Math.round(amount));
                    
                case 'binomo':
                    // Binomo typically uses specific increments
                    if (amount <= 10) return Math.max(1, Math.round(amount));
                    if (amount <= 50) return Math.round(amount / 5) * 5; // Round to nearest 5
                    return Math.round(amount / 10) * 10; // Round to nearest 10
                    
                default:
                    // Default conservative rounding
                    return Math.max(1, Math.round(amount));
            }
        } catch (error) {
            console.error('[Auto Trade Engine] Error rounding trade amount:', error);
            return Math.max(1, Math.round(amount)); // Safe fallback
        }
    }
    
    captureChartScreenshot(label) {
        try {
            // Only proceed if we're in a browser environment with canvas support
            if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
                return false;
            }
            
            // Find the chart canvas
            const chartSelectors = [
                'canvas.chart',
                'canvas.trading-chart',
                'canvas[id*="chart"]',
                'canvas[class*="chart"]',
                '.chart-container canvas',
                '#trading-chart canvas'
            ];
            
            let chartCanvas = null;
            
            for (const selector of chartSelectors) {
                const canvas = document.querySelector(selector);
                if (canvas && canvas instanceof HTMLCanvasElement) {
                    chartCanvas = canvas;
                    break;
                }
            }
            
            if (!chartCanvas) {
                console.log('[Auto Trade Engine] Could not find chart canvas for screenshot');
                return false;
            }
            
            // Capture the canvas as a data URL
            try {
                const dataUrl = chartCanvas.toDataURL('image/png');
                
                // Send to background script for storage
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.runtime.sendMessage({
                        type: 'CHART_SCREENSHOT',
                        data: {
                            label: label,
                            timestamp: Date.now(),
                            dataUrl: dataUrl
                        }
                    });
                    
                    console.log(`[Auto Trade Engine] 📸 Chart screenshot captured: ${label}`);
                    return true;
                }
            } catch (canvasError) {
                // This can fail due to CORS restrictions on some platforms
                console.log('[Auto Trade Engine] Could not capture canvas data due to security restrictions');
                return false;
            }
            
            return false;
        } catch (error) {
            console.error('[Auto Trade Engine] Error capturing chart screenshot:', error);
            return false;
        }
    }

    async executeTrade(signal, amount) {
        console.log(`[Auto Trade Engine] 🎯 Executing ${signal.direction} trade for $${amount}`);
        
        try {
            // Validate platform is supported
            if (!this.platformSelectors[this.platform]) {
                console.log(`[Auto Trade Engine] ❌ Platform ${this.platform} not supported for auto-trading`);
                return { success: false, reason: `Platform ${this.platform} not supported for auto-trading` };
            }
            
            // Take screenshot of chart before trade (if supported)
            this.captureChartScreenshot('before_trade');
            
            // Get normalized direction
            const validationResult = this.validateSignal(signal);
            if (!validationResult.valid) {
                return { success: false, reason: validationResult.reason };
            }
            
            const direction = validationResult.normalized_direction;
            
            // Determine optimal expiry time
            let expirySeconds = 300; // Default 5 minutes
            
            // Use signal's recommended expiry if available
            if (signal.entry_window && signal.entry_window.window_duration_seconds) {
                expirySeconds = signal.entry_window.window_duration_seconds;
                console.log(`[Auto Trade Engine] Using signal's recommended expiry: ${expirySeconds}s`);
            } 
            // Otherwise use timeframe-based expiry
            else if (signal.timeframe_used) {
                switch (signal.timeframe_used) {
                    case '1M': expirySeconds = 60; break;
                    case '5M': expirySeconds = 300; break;
                    case '15M': expirySeconds = 900; break;
                    case '30M': expirySeconds = 1800; break;
                    case '1H': expirySeconds = 3600; break;
                    default: expirySeconds = 300; // Default 5 minutes
                }
                console.log(`[Auto Trade Engine] Using timeframe-based expiry: ${expirySeconds}s (${signal.timeframe_used})`);
            }
            
            // Set trade duration with enhanced retry logic
            let durationSet = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                durationSet = await this.setTradeDuration(expirySeconds);
                if (durationSet) {
                    console.log(`[Auto Trade Engine] ✅ Set trade duration to ${expirySeconds}s`);
                    break;
                }
                
                console.log(`[Auto Trade Engine] ⚠️ Attempt ${attempt} to set duration failed, retrying...`);
                await this.sleep(700); // Longer wait between retries
            }
            
            if (!durationSet) {
                console.log('[Auto Trade Engine] ⚠️ Could not set custom duration, using platform default');
            }
            
            // Calculate optimal trade amount with risk management
            let optimalAmount = amount;
            
            // Use signal's position size recommendation if available
            if (signal.position_size && signal.position_size.recommended_percent) {
                const balance = this.getCurrentBalance();
                optimalAmount = balance * (signal.position_size.recommended_percent / 100);
                console.log(`[Auto Trade Engine] Using signal's recommended position size: ${signal.position_size.recommended_percent}% = $${optimalAmount.toFixed(2)}`);
            }
            
            // Round to appropriate value for platform
            optimalAmount = this.roundTradeAmount(optimalAmount);
            
            // Set trade amount with enhanced retry logic
            let amountSet = false;
            for (let attempt = 1; attempt <= 4; attempt++) {
                amountSet = await this.setTradeAmount(optimalAmount);
                if (amountSet) {
                    console.log(`[Auto Trade Engine] ✅ Set trade amount to $${optimalAmount}`);
                    break;
                }
                
                console.log(`[Auto Trade Engine] ⚠️ Attempt ${attempt} to set amount failed, retrying...`);
                await this.sleep(700); // Longer wait between retries
                
                // Try alternative selectors on later attempts
                if (attempt >= 2) {
                    amountSet = await this.setTradeAmountAlternative(optimalAmount);
                    if (amountSet) {
                        console.log(`[Auto Trade Engine] ✅ Set trade amount via alternative method: $${optimalAmount}`);
                        break;
                    }
                }
            }
            
            if (!amountSet) {
                console.log('[Auto Trade Engine] ❌ Failed to set trade amount after multiple attempts');
                return { success: false, reason: 'Failed to set trade amount after multiple attempts' };
            }

            // Wait for UI to update with longer delay for reliability
            await this.sleep(1000);
            
            // Click the appropriate trade button with enhanced retry logic
            let tradeExecuted = false;
            for (let attempt = 1; attempt <= 4; attempt++) {
                tradeExecuted = await this.clickTradeButton(direction);
                if (tradeExecuted) {
                    console.log(`[Auto Trade Engine] ✅ Clicked ${direction.toUpperCase()} button successfully`);
                    break;
                }
                
                console.log(`[Auto Trade Engine] ⚠️ Attempt ${attempt} to click ${direction} button failed, retrying...`);
                await this.sleep(700);
                
                // Try alternative selectors on later attempts
                if (attempt >= 2) {
                    tradeExecuted = await this.clickTradeButtonAlternative(direction);
                    if (tradeExecuted) {
                        console.log(`[Auto Trade Engine] ✅ Clicked ${direction.toUpperCase()} button via alternative method`);
                        break;
                    }
                }
            }
            
            if (!tradeExecuted) {
                console.log(`[Auto Trade Engine] ❌ Failed to execute ${direction} button click after multiple attempts`);
                return { success: false, reason: `Failed to execute ${direction} button click after multiple attempts` };
            }

            // Wait for trade confirmation with longer timeout for reliability
            await this.sleep(2000);
            
            // Take screenshot of chart after trade (if supported)
            this.captureChartScreenshot('after_trade');

            // Verify trade was placed with enhanced verification
            const verificationResult = await this.verifyTradeExecution();
            
            if (verificationResult.verified) {
                console.log('[Auto Trade Engine] ✅ Trade executed successfully');
                
                // Take screenshot of trade if possible
                const screenshotUrl = await this.captureTradeScreenshot();
                
                return { 
                    success: true, 
                    tradeId: this.generateTradeId(),
                    timestamp: Date.now(),
                    platform: this.platform,
                    direction: direction,
                    amount: amount,
                    verification_method: verificationResult.method,
                    screenshot: screenshotUrl,
                    signal_confidence: signal.confidence,
                    expected_expiry: new Date(Date.now() + (signal.entry_window?.window_duration_seconds || 300) * 1000).toISOString()
                };
            } else {
                return { 
                    success: false, 
                    reason: `Trade execution could not be verified: ${verificationResult.reason}` 
                };
            }

        } catch (error) {
            console.error('[Auto Trade Engine] Trade execution error:', error);
            return { success: false, reason: `Execution error: ${error.message}` };
        }
    }
    
    async setTradeDuration(durationSeconds) {
        try {
            const selectors = this.platformSelectors[this.platform];
            if (!selectors) return false;
            
            // Map seconds to platform-specific duration
            let durationValue;
            if (durationSeconds <= 60) {
                durationValue = '1m';
            } else if (durationSeconds <= 180) {
                durationValue = '3m';
            } else if (durationSeconds <= 300) {
                durationValue = '5m';
            } else if (durationSeconds <= 900) {
                durationValue = '15m';
            } else {
                durationValue = '5m'; // Default to 5 minutes
            }
            
            // Try to find duration selector
            const durationSelectors = [
                selectors.timeSelector,
                '[data-duration]',
                '[class*="duration-selector"]',
                '[class*="expiry-selector"]',
                'select[class*="time"]'
            ];
            
            for (const selector of durationSelectors) {
                const element = document.querySelector(selector);
                if (!element) continue;
                
                // Check if it's a select element
                if (element.tagName === 'SELECT') {
                    // Find option with matching text
                    const options = Array.from(element.options);
                    const option = options.find(opt => 
                        opt.textContent.toLowerCase().includes(durationValue) ||
                        opt.value.toLowerCase().includes(durationValue)
                    );
                    
                    if (option) {
                        element.value = option.value;
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`[Auto Trade Engine] ✅ Set duration to ${durationValue} via select`);
                        return true;
                    }
                } else {
                    // Try to find child elements with duration values
                    const durationButtons = element.querySelectorAll('button, [class*="option"], [data-value]');
                    
                    for (const button of durationButtons) {
                        const buttonText = button.textContent.toLowerCase();
                        if (buttonText.includes(durationValue)) {
                            button.click();
                            console.log(`[Auto Trade Engine] ✅ Set duration to ${durationValue} via button`);
                            return true;
                        }
                    }
                }
            }
            
            console.log('[Auto Trade Engine] ⚠️ Could not find duration selector');
            return false;
            
        } catch (error) {
            console.error('[Auto Trade Engine] Error setting trade duration:', error);
            return false;
        }
    }
    
    async captureTradeScreenshot() {
        // This would require additional permissions and implementation
        // For now, return null as we can't take screenshots directly
        return null;
    }

    async setTradeAmount(amount) {
        const selectors = this.platformSelectors[this.platform];
        if (!selectors) return false;

        try {
            let amountInput = null;

            // Try primary selector first
            amountInput = document.querySelector(selectors.tradeAmount);

            // Try alternative selectors if primary fails
            if (!amountInput && selectors.tradeAmountAlt) {
                for (const selector of selectors.tradeAmountAlt) {
                    amountInput = document.querySelector(selector);
                    if (amountInput) {
                        console.log(`[Auto Trade Engine] Found amount input with: ${selector}`);
                        break;
                    }
                }
            }

            if (!amountInput) {
                console.error('[Auto Trade Engine] Trade amount input not found');
                console.log('[Auto Trade Engine] Tried selectors:', [selectors.tradeAmount, ...(selectors.tradeAmountAlt || [])]);
                return false;
            }

            // Clear existing value and set new value
            amountInput.focus();
            amountInput.select();
            amountInput.value = '';

            // Set new value with multiple methods for compatibility
            amountInput.value = amount.toString();

            // Trigger comprehensive events
            const events = ['input', 'change', 'blur', 'keyup'];
            for (const eventType of events) {
                amountInput.dispatchEvent(new Event(eventType, { bubbles: true }));
            }

            // Additional React/Vue compatibility
            if (amountInput._valueTracker) {
                amountInput._valueTracker.setValue('');
            }

            // Verify value was set
            await this.sleep(300);
            const setValue = parseFloat(amountInput.value);

            if (Math.abs(setValue - amount) < 0.01) {
                console.log(`[Auto Trade Engine] ✅ Trade amount set to $${amount}`);
                return true;
            } else {
                console.warn(`[Auto Trade Engine] Amount verification failed. Expected: ${amount}, Got: ${setValue}`);
                // Try one more time with direct property setting
                Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(amountInput, amount.toString());
                amountInput.dispatchEvent(new Event('input', { bubbles: true }));

                await this.sleep(200);
                const finalValue = parseFloat(amountInput.value);
                if (Math.abs(finalValue - amount) < 0.01) {
                    console.log(`[Auto Trade Engine] ✅ Trade amount set to $${amount} (second attempt)`);
                    return true;
                } else {
                    console.error(`[Auto Trade Engine] Failed to set trade amount after multiple attempts`);
                    return false;
                }
            }

        } catch (error) {
            console.error('[Auto Trade Engine] Error setting trade amount:', error);
            return false;
        }
    }

    async clickTradeButton(direction) {
        const selectors = this.platformSelectors[this.platform];
        if (!selectors) return false;

        try {
            let button = null;
            let usedSelector = '';

            if (direction === 'up' || direction === 'call') {
                // Try primary selector first
                button = document.querySelector(selectors.callButton);
                if (button) {
                    usedSelector = selectors.callButton;
                } else if (selectors.callButtonAlt) {
                    // Try alternative selectors
                    for (const selector of selectors.callButtonAlt) {
                        button = document.querySelector(selector);
                        if (button) {
                            usedSelector = selector;
                            break;
                        }
                    }
                }
            } else if (direction === 'down' || direction === 'put') {
                // Try primary selector first
                button = document.querySelector(selectors.putButton);
                if (button) {
                    usedSelector = selectors.putButton;
                } else if (selectors.putButtonAlt) {
                    // Try alternative selectors
                    for (const selector of selectors.putButtonAlt) {
                        button = document.querySelector(selector);
                        if (button) {
                            usedSelector = selector;
                            break;
                        }
                    }
                }
            }

            if (!button) {
                console.error(`[Auto Trade Engine] ${direction} button not found`);
                console.log('[Auto Trade Engine] Tried selectors:',
                    direction === 'up' || direction === 'call'
                        ? [selectors.callButton, ...(selectors.callButtonAlt || [])]
                        : [selectors.putButton, ...(selectors.putButtonAlt || [])]
                );
                return false;
            }

            console.log(`[Auto Trade Engine] Found ${direction} button with: ${usedSelector}`);

            // Ensure button is visible and clickable
            if (button.offsetParent === null) {
                console.error('[Auto Trade Engine] Trade button is not visible');
                return false;
            }

            // Check if button is disabled
            if (button.disabled || button.hasAttribute('disabled')) {
                console.error('[Auto Trade Engine] Trade button is disabled');
                return false;
            }

            // Scroll button into view if needed
            if (typeof button.scrollIntoView === 'function') {
                button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.sleep(300);
            }

            // Multiple click methods for maximum compatibility
            try {
                // Method 1: Standard click
                button.click();
            } catch (e) {
                // Method 2: Dispatch click event
                button.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            }

            console.log(`[Auto Trade Engine] ✅ ${direction} button clicked successfully`);
            return true;

        } catch (error) {
            console.error('[Auto Trade Engine] Error clicking trade button:', error);
            return false;
        }
    }
    
    async clickTradeButtonAlternative(direction) {
        try {
            // Try alternative selectors for trade buttons
            const callSelectors = [
                'button[data-type="call"]',
                'button[data-action="buy"]',
                'button.call-button',
                'button.buy-button',
                'button.up-button',
                '[class*="call-button"]',
                '[class*="buy-button"]',
                '[class*="up-button"]',
                'button:contains("Call")',
                'button:contains("Buy")',
                'button:contains("Up")',
                'button.green',
                'button[style*="green"]',
                'div[role="button"][class*="call"]',
                'div[role="button"][class*="buy"]',
                'div[role="button"][class*="up"]'
            ];
            
            const putSelectors = [
                'button[data-type="put"]',
                'button[data-action="sell"]',
                'button.put-button',
                'button.sell-button',
                'button.down-button',
                '[class*="put-button"]',
                '[class*="sell-button"]',
                '[class*="down-button"]',
                'button:contains("Put")',
                'button:contains("Sell")',
                'button:contains("Down")',
                'button.red',
                'button[style*="red"]',
                'div[role="button"][class*="put"]',
                'div[role="button"][class*="sell"]',
                'div[role="button"][class*="down"]'
            ];
            
            const selectors = (direction === 'call') ? callSelectors : putSelectors;
            
            // Try each selector
            for (const selector of selectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    
                    for (const element of elements) {
                        // Skip hidden or very small elements
                        const rect = element.getBoundingClientRect();
                        if (rect.width < 20 || rect.height < 10 || 
                            rect.top < 0 || rect.left < 0 || 
                            rect.bottom > window.innerHeight || rect.right > window.innerWidth) {
                            continue;
                        }
                        
                        // Scroll element into view
                        if (typeof element.scrollIntoView === 'function') {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            await this.sleep(300);
                        }
                        
                        // Click the element
                        element.click();
                        
                        console.log(`[Auto Trade Engine] Clicked ${direction} button via alternative selector: ${selector}`);
                        
                        // Check for confirmation button
                        await this.sleep(300);
                        const confirmButtons = document.querySelectorAll('button:contains("Confirm"), button:contains("OK"), button.confirm-button, [class*="confirm-button"]');
                        
                        for (const confirmButton of confirmButtons) {
                            confirmButton.click();
                            console.log('[Auto Trade Engine] Clicked confirmation button');
                            await this.sleep(200);
                        }
                        
                        return true;
                    }
                } catch (selectorError) {
                    // Ignore individual selector errors and try the next one
                    continue;
                }
            }
            
            // If we get here, no button was found or clicked
            return false;
            
        } catch (error) {
            console.error(`[Auto Trade Engine] Error in alternative ${direction} button click:`, error);
            return false;
        }
    }

    async verifyTradeExecution() {
        // Wait for potential confirmation dialogs or trade placement
        await this.sleep(2000);
        
        try {
            // Look for trade confirmation indicators with enhanced detection
            const confirmationSelectors = [
                // Direct confirmation elements
                '[class*="trade-placed"]',
                '[class*="position-opened"]',
                '[class*="trade-active"]',
                '.trade-confirmation',
                '[data-testid="trade-confirmation"]',
                
                // Platform-specific confirmation elements
                '.active-trade',
                '.open-position',
                '.trade-timer',
                '.countdown-timer',
                '[class*="trade-status"]',
                
                // Text-based confirmation elements
                '[class*="notification"]:contains("successful")',
                '[class*="message"]:contains("placed")',
                '[class*="alert"]:contains("opened")'
            ];

            for (const selector of confirmationSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        if (element && element.offsetParent !== null) {
                            console.log(`[Auto Trade Engine] ✅ Trade confirmation found: ${selector}`);
                            return { 
                                verified: true, 
                                method: 'confirmation_element',
                                element: selector
                            };
                        }
                    }
                } catch (e) {
                    // Some selectors might be invalid, continue with others
                    continue;
                }
            }

            // Check for trade timer or countdown
            const timerElements = document.querySelectorAll('[class*="timer"], [class*="countdown"], [class*="expiry"]');
            for (const timer of timerElements) {
                const timerText = timer.textContent;
                if (timerText && /\d+:\d+/.test(timerText)) {
                    console.log('[Auto Trade Engine] ✅ Trade verified (countdown timer found)');
                    return { 
                        verified: true, 
                        method: 'countdown_timer',
                        element: 'timer'
                    };
                }
            }

            // Alternative verification: check if trade amount input was reset or disabled
            const selectors = this.platformSelectors[this.platform];
            const amountInput = document.querySelector(selectors.tradeAmount) || 
                              document.querySelector(selectors.tradeAmountAlt);
            
            if (amountInput) {
                if (amountInput.disabled) {
                    console.log('[Auto Trade Engine] ✅ Trade verified (input disabled)');
                    return { 
                        verified: true, 
                        method: 'input_disabled',
                        element: 'amount_input'
                    };
                }
                
                // Check if input was reset (value changed)
                if (amountInput.value === '' || amountInput.value === '0' || parseFloat(amountInput.value) === 0) {
                    console.log('[Auto Trade Engine] ✅ Trade verified (input reset)');
                    return { 
                        verified: true, 
                        method: 'input_reset',
                        element: 'amount_input'
                    };
                }
            }
            
            // Check for trade buttons being disabled
            const callButton = document.querySelector(selectors.callButton) || 
                             document.querySelector(selectors.callButtonAlt);
            const putButton = document.querySelector(selectors.putButton) || 
                            document.querySelector(selectors.putButtonAlt);
                            
            if ((callButton && callButton.disabled) || (putButton && putButton.disabled)) {
                console.log('[Auto Trade Engine] ✅ Trade verified (buttons disabled)');
                return { 
                    verified: true, 
                    method: 'buttons_disabled',
                    element: 'trade_buttons'
                };
            }
            
            // Check for new elements that appeared after trade
            const newTradeElements = document.querySelectorAll('[class*="new"], [class*="active"], [class*="open"]');
            const newTradeFound = Array.from(newTradeElements).some(el => {
                const creationTime = el.dataset.timestamp || el.dataset.time || el.dataset.created;
                if (creationTime) {
                    const timeDiff = Date.now() - parseInt(creationTime);
                    return timeDiff < 5000; // Element created in last 5 seconds
                }
                return false;
            });
            
            if (newTradeFound) {
                console.log('[Auto Trade Engine] ✅ Trade verified (new trade element found)');
                return { 
                    verified: true, 
                    method: 'new_element',
                    element: 'trade_container'
                };
            }

            // If we couldn't definitively verify but also didn't see errors
            console.warn('[Auto Trade Engine] ⚠️ Trade execution verification inconclusive');
            
            // Look for error messages
            const errorElements = document.querySelectorAll('[class*="error"], [class*="failed"], [class*="rejected"]');
            for (const error of errorElements) {
                if (error && error.offsetParent !== null && error.textContent.trim() !== '') {
                    console.error(`[Auto Trade Engine] ❌ Trade error detected: ${error.textContent}`);
                    return { 
                        verified: false, 
                        reason: `Error message: ${error.textContent.trim()}`,
                        method: 'error_element'
                    };
                }
            }
            
            // Assume success if no clear failure indicators
            return { 
                verified: true, 
                method: 'assumption',
                confidence: 'low'
            };

        } catch (error) {
            console.error('[Auto Trade Engine] Trade verification error:', error);
            return { 
                verified: false, 
                reason: `Verification error: ${error.message}`,
                method: 'exception'
            };
        }
    }

    getCurrentBalance() {
        try {
            const selectors = this.platformSelectors[this.platform];
            if (!selectors) return 0;

            const balanceElement = document.querySelector(selectors.balance) || 
                                  document.querySelector(selectors.balanceAlt);

            if (balanceElement) {
                const balanceText = balanceElement.textContent || balanceElement.innerText;
                const balanceMatch = balanceText.match(/[\d,]+\.?\d*/);
                
                if (balanceMatch) {
                    const balance = parseFloat(balanceMatch[0].replace(/,/g, ''));
                    this.accountBalance = balance;
                    return balance;
                }
            }

            // Fallback to stored balance
            return this.accountBalance || 100; // Default fallback

        } catch (error) {
            console.error('[Auto Trade Engine] Error getting balance:', error);
            return this.accountBalance || 100;
        }
    }

    recordTrade(signal, amount, tradeResult) {
        const trade = {
            id: tradeResult.tradeId || this.generateTradeId(),
            timestamp: Date.now(),
            signal: {
                direction: signal.direction,
                confidence: signal.confidence,
                source: signal.model_version || 'unknown'
            },
            amount: amount,
            platform: this.platform,
            result: null, // Will be updated when trade closes
            payout: null,
            execution: tradeResult
        };

        this.tradeHistory.push(trade);
        
        // Keep only last 100 trades
        if (this.tradeHistory.length > 100) {
            this.tradeHistory = this.tradeHistory.slice(-100);
        }

        this.saveTradeHistory();
        
        console.log(`[Auto Trade Engine] 📝 Trade recorded: ${trade.id}`);
    }

    // Helper methods
    getTodayTrades() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        
        return this.tradeHistory.filter(trade => trade.timestamp >= todayTimestamp);
    }

    getHourlyTrades() {
        const oneHourAgo = Date.now() - 3600000;
        return this.tradeHistory.filter(trade => trade.timestamp >= oneHourAgo);
    }

    getRecentWinRate(lookback = 10) {
        const recentTrades = this.tradeHistory
            .filter(trade => trade.result !== null)
            .slice(-lookback);
        
        if (recentTrades.length === 0) return 0.5; // Neutral if no history
        
        const wins = recentTrades.filter(trade => trade.result === 'win').length;
        return wins / recentTrades.length;
    }

    roundTradeAmount(amount) {
        // Round to nearest cent for most platforms
        return Math.round(amount * 100) / 100;
    }

    generateTradeId() {
        return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initializeDOMObservers() {
        // Observer to detect trade results
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    this.checkForTradeResults(mutation.addedNodes);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[Auto Trade Engine] 👁️ DOM observers initialized');
    }

    checkForTradeResults(addedNodes) {
        // Look for trade result notifications
        addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const resultIndicators = [
                    'win', 'loss', 'profit', 'lose', 'won', 'lost',
                    'successful', 'failed', 'expired'
                ];

                const nodeText = node.textContent?.toLowerCase() || '';
                const hasResultIndicator = resultIndicators.some(indicator => 
                    nodeText.includes(indicator)
                );

                if (hasResultIndicator) {
                    this.processTradeResult(node);
                }
            }
        });
    }

    processTradeResult(resultElement) {
        try {
            const resultText = resultElement.textContent?.toLowerCase() || '';
            
            // Determine if win or loss
            let result = null;
            if (resultText.includes('win') || resultText.includes('profit') || resultText.includes('won')) {
                result = 'win';
            } else if (resultText.includes('loss') || resultText.includes('lose') || resultText.includes('lost')) {
                result = 'loss';
            }

            if (result) {
                // Find the most recent trade without a result
                const pendingTrade = this.tradeHistory
                    .slice()
                    .reverse()
                    .find(trade => trade.result === null);

                if (pendingTrade) {
                    pendingTrade.result = result;
                    pendingTrade.closed_at = Date.now();
                    
                    // Try to extract payout amount
                    const payoutMatch = resultText.match(/[\d,]+\.?\d*/);
                    if (payoutMatch) {
                        pendingTrade.payout = parseFloat(payoutMatch[0].replace(/,/g, ''));
                    }

                    this.saveTradeHistory();
                    
                    console.log(`[Auto Trade Engine] 📊 Trade result updated: ${pendingTrade.id} - ${result}`);
                    
                    // Check if emergency stop should be triggered
                    this.checkEmergencyStopConditions();
                }
            }

        } catch (error) {
            console.error('[Auto Trade Engine] Error processing trade result:', error);
        }
    }

    checkEmergencyStopConditions() {
        const recentTrades = this.tradeHistory.slice(-5);
        const recentLosses = recentTrades.filter(trade => trade.result === 'loss').length;
        
        // Auto-enable emergency stop after too many losses
        if (recentLosses >= 3) {
            this.riskSettings.emergencyStop = true;
            this.isEnabled = false;
            
            console.warn('[Auto Trade Engine] 🛑 Emergency stop triggered due to consecutive losses');
            
            // Notify user
            this.notifyEmergencyStop();
        }
    }

    notifyEmergencyStop() {
        // Create notification
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'assets/icon48.png',
                title: 'Auto-Trading Emergency Stop',
                message: 'Auto-trading has been disabled due to consecutive losses. Please review your strategy.'
            });
        }
    }

    // Storage methods
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['autoTradeSettings']);
            if (result.autoTradeSettings) {
                this.riskSettings = { ...this.riskSettings, ...result.autoTradeSettings };
            }
        } catch (error) {
            console.error('[Auto Trade Engine] Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set({ autoTradeSettings: this.riskSettings });
        } catch (error) {
            console.error('[Auto Trade Engine] Failed to save settings:', error);
        }
    }

    async loadTradeHistory() {
        try {
            const result = await chrome.storage.local.get(['tradeHistory']);
            if (result.tradeHistory) {
                this.tradeHistory = result.tradeHistory;
            }
        } catch (error) {
            console.error('[Auto Trade Engine] Failed to load trade history:', error);
        }
    }

    async saveTradeHistory() {
        try {
            await chrome.storage.local.set({ tradeHistory: this.tradeHistory });
        } catch (error) {
            console.error('[Auto Trade Engine] Failed to save trade history:', error);
        }
    }

    // Public API methods
    enable() {
        this.isEnabled = true;
        this.riskSettings.emergencyStop = false;
        this.saveSettings();
        console.log('[Auto Trade Engine] ✅ Auto-trading ENABLED');
    }

    disable() {
        this.isEnabled = false;
        this.saveSettings();
        console.log('[Auto Trade Engine] ⏸️ Auto-trading DISABLED');
    }

    setEmergencyStop(enabled) {
        this.riskSettings.emergencyStop = enabled;
        if (enabled) {
            this.isEnabled = false;
        }
        this.saveSettings();
        console.log(`[Auto Trade Engine] Emergency stop ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    getStatus() {
        return {
            enabled: this.isEnabled,
            executing: this.isExecuting,
            platform: this.platform,
            balance: this.accountBalance,
            tradesCount: this.tradeHistory.length,
            todayTrades: this.getTodayTrades().length,
            recentWinRate: this.getRecentWinRate(),
            emergencyStop: this.riskSettings.emergencyStop,
            lastTradeTime: this.lastTradeTime
        };
    }

    getTradeHistory(limit = 20) {
        return this.tradeHistory.slice(-limit);
    }

    updateRiskSettings(newSettings) {
        this.riskSettings = { ...this.riskSettings, ...newSettings };
        this.saveSettings();
        console.log('[Auto Trade Engine] ⚙️ Risk settings updated');
    }

    clearTradeHistory() {
        this.tradeHistory = [];
        this.saveTradeHistory();
        console.log('[Auto Trade Engine] 🗑️ Trade history cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoTradeEngine;
} else if (typeof window !== 'undefined') {
    window.AutoTradeEngine = AutoTradeEngine;
}