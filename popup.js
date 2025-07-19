/**
 * AI Candle Sniper - Popup Controller
 * Professional Binary Options Prediction Interface
 */

class CandleSniperUI {
    constructor() {
        this.isAnalyzing = false;
        this.currentSignal = null;
        this.entryTimer = null;
        this.signalCount = 0;
        this.settings = {
            voiceAlerts: true,
            autoAnalysis: false,
            minConfidence: 65,
            autoTradeEnabled: false
        };
        
        // Trade management
        this.tradeHistory = [];
        this.tradeStats = null;
        this.autoTradeStatus = {
            isEnabled: false,
            emergencyStopActive: false,
            cooldownRemaining: 0
        };
        
        this.init();
    }

    async init() {
        this.loadSettings();
        this.setupEventListeners();
        this.setupMessageListeners();
        await this.detectCurrentAsset();
        this.updateUI();
    }

    setupEventListeners() {
        // Mode switch
        document.getElementById('otcModeBtn').addEventListener('click', () => this.switchToOTCMode());
        
        // Main control buttons
        document.getElementById('startAnalysis').addEventListener('click', () => this.startAnalysis());
        document.getElementById('stopAnalysis').addEventListener('click', () => this.stopAnalysis());

        // Settings
        document.getElementById('voiceAlerts').addEventListener('change', (e) => {
            this.settings.voiceAlerts = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('autoAnalysis').addEventListener('change', (e) => {
            this.settings.autoAnalysis = e.target.checked;
            this.saveSettings();
            
            // Send auto-analysis setting to content script
            this.sendMessageToActiveTab({
                type: 'UPDATE_AUTO_ANALYSIS',
                data: { enabled: e.target.checked }
            });
        });
        
        // Auto-trading controls
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.addEventListener('change', (e) => {
                this.settings.autoTradeEnabled = e.target.checked;
                this.saveSettings();
                
                // Send auto-trade setting to background
                chrome.runtime.sendMessage({
                    type: 'SET_AUTO_TRADE',
                    data: { enabled: e.target.checked }
                });
                
                // Also send to content script
                this.sendMessageToActiveTab({
                    type: 'SET_AUTO_TRADE',
                    data: { enabled: e.target.checked }
                });
                
                this.updateAutoTradeUI();
            });
        }
        
        // Emergency stop button
        const emergencyStopBtn = document.getElementById('emergencyStop');
        if (emergencyStopBtn) {
            emergencyStopBtn.addEventListener('click', () => {
                this.activateEmergencyStop();
            });
        }
        
        // Reset emergency stop button
        const resetEmergencyBtn = document.getElementById('resetEmergency');
        if (resetEmergencyBtn) {
            resetEmergencyBtn.addEventListener('click', () => {
                this.resetEmergencyStop();
            });
        }
        
        // Trade history button
        const tradeHistoryBtn = document.getElementById('viewTradeHistory');
        if (tradeHistoryBtn) {
            tradeHistoryBtn.addEventListener('click', () => {
                this.showTradeHistory();
            });
        }
        
        // Export trade history button
        const exportTradeBtn = document.getElementById('exportTradeHistory');
        if (exportTradeBtn) {
            exportTradeBtn.addEventListener('click', () => {
                this.exportTradeHistory();
            });
        }
        
        // Clear trade history button
        const clearTradeBtn = document.getElementById('clearTradeHistory');
        if (clearTradeBtn) {
            clearTradeBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all trade history?')) {
                    this.clearTradeHistory();
                }
            });
        }
        
        // Risk settings
        const maxTradesInput = document.getElementById('maxTradesPerDay');
        if (maxTradesInput) {
            maxTradesInput.addEventListener('change', () => {
                const value = parseInt(maxTradesInput.value);
                if (!isNaN(value) && value > 0) {
                    this.updateRiskSettings({ maxTradesPerDay: value });
                }
            });
        }
        
        const tradeCooldownInput = document.getElementById('tradeCooldown');
        if (tradeCooldownInput) {
            tradeCooldownInput.addEventListener('change', () => {
                const value = parseInt(tradeCooldownInput.value);
                if (!isNaN(value) && value > 0) {
                    this.updateRiskSettings({ tradeCooldown: value });
                }
            });
        }
        
        const maxLossesInput = document.getElementById('maxConsecutiveLosses');
        if (maxLossesInput) {
            maxLossesInput.addEventListener('change', () => {
                const value = parseInt(maxLossesInput.value);
                if (!isNaN(value) && value > 0) {
                    this.updateRiskSettings({ maxConsecutiveLosses: value });
                }
            });
        }
        
        // Auto-trading controls
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.addEventListener('change', (e) => {
                this.settings.autoTradeEnabled = e.target.checked;
                this.saveSettings();
                
                // Send auto-trade setting to content script
                this.sendMessageToActiveTab({
                    type: 'UPDATE_AUTO_TRADE',
                    data: { enabled: e.target.checked }
                });
                
                this.updateAutoTradeUI();
            });
        }
        
        // Emergency stop button
        const emergencyStopBtn = document.getElementById('emergencyStop');
        if (emergencyStopBtn) {
            emergencyStopBtn.addEventListener('click', () => {
                this.activateEmergencyStop();
            });
        }
        
        // Reset emergency stop button
        const resetEmergencyBtn = document.getElementById('resetEmergency');
        if (resetEmergencyBtn) {
            resetEmergencyBtn.addEventListener('click', () => {
                this.resetEmergencyStop();
            });
        }
        
        // Risk management settings
        const maxTradesInput = document.getElementById('maxTradesPerDay');
        if (maxTradesInput) {
            maxTradesInput.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1 && value <= 20) {
                    this.settings.maxTradesPerDay = value;
                    this.saveSettings();
                    
                    // Send updated setting to content script
                    this.sendMessageToActiveTab({
                        type: 'UPDATE_RISK_SETTINGS',
                        data: { maxTradesPerDay: value }
                    });
                }
            });
        }
        
        const cooldownInput = document.getElementById('tradeCooldown');
        if (cooldownInput) {
            cooldownInput.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1 && value <= 30) {
                    this.settings.tradeCooldown = value;
                    this.saveSettings();
                    
                    // Send updated setting to content script
                    this.sendMessageToActiveTab({
                        type: 'UPDATE_RISK_SETTINGS',
                        data: { tradeCooldown: value }
                    });
                }
            });
        }
        
        const minConfidenceInput = document.getElementById('minConfidence');
        if (minConfidenceInput) {
            minConfidenceInput.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 60 && value <= 95) {
                    this.settings.minConfidence = value;
                    this.saveSettings();
                    
                    // Send updated setting to content script
                    this.sendMessageToActiveTab({
                        type: 'UPDATE_RISK_SETTINGS',
                        data: { minConfidence: value }
                    });
                }
            });
        }
        
        // Trade history button
        const viewHistoryBtn = document.getElementById('viewTradeHistory');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => {
                this.openTradeHistoryView();
            });
        }
        
        // Export history button
        const exportHistoryBtn = document.getElementById('exportHistory');
        if (exportHistoryBtn) {
            exportHistoryBtn.addEventListener('click', () => {
                this.exportTradeHistory();
            });
        }

        document.getElementById('minConfidence').addEventListener('change', (e) => {
            this.settings.minConfidence = parseInt(e.target.value);
            this.saveSettings();
            
            // Send min confidence setting to content script
            this.sendMessageToActiveTab({
                type: 'UPDATE_MIN_CONFIDENCE',
                data: { threshold: parseInt(e.target.value) }
            });
        });
        
        // Auto-trading controls (if they exist)
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                
                // Update UI
                document.getElementById('autoTradeStatus').textContent = enabled ? 'ENABLED' : 'DISABLED';
                document.getElementById('autoTradeStatus').className = enabled ? 'status-enabled' : 'status-disabled';
                
                // Send auto-trade setting to content script
                this.sendMessageToActiveTab({
                    type: 'SET_AUTO_TRADE',
                    data: { enabled }
                });
                
                // Save setting
                this.settings.autoTradeEnabled = enabled;
                this.saveSettings();
                
                // Show confirmation
                this.showNotification(`Auto-trading ${enabled ? 'enabled' : 'disabled'}`);
            });
        }
        
        // Emergency stop button (if it exists)
        const emergencyStop = document.getElementById('emergencyStop');
        if (emergencyStop) {
            emergencyStop.addEventListener('click', () => {
                // Disable auto-trading
                if (autoTradeToggle) {
                    autoTradeToggle.checked = false;
                    document.getElementById('autoTradeStatus').textContent = 'DISABLED';
                    document.getElementById('autoTradeStatus').className = 'status-disabled';
                }
                
                // Send emergency stop to content script
                this.sendMessageToActiveTab({
                    type: 'EMERGENCY_STOP',
                    data: { timestamp: Date.now() }
                });
                
                // Update settings
                this.settings.autoTradeEnabled = false;
                this.saveSettings();
                
                // Show confirmation
                this.showNotification('EMERGENCY STOP ACTIVATED', 'error');
            });
        }

        // Tab navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target.closest('.nav-btn').dataset.section));
        });

        // Analysis tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Clear logs
        document.getElementById('clearLogs').addEventListener('click', () => this.clearLogs());
        
        // Refresh data button (if it exists)
        const refreshData = document.getElementById('refreshData');
        if (refreshData) {
            refreshData.addEventListener('click', () => {
                this.refreshData();
                this.showNotification('Refreshing data...');
            });
        }
    }
    
    sendMessageToActiveTab(message) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
    
    refreshData() {
        // Request fresh data from content script
        this.sendMessageToActiveTab({
            type: 'REQUEST_FRESH_DATA',
            data: { timestamp: Date.now() }
        });
        
        // Update UI to show loading state
        this.updateStatus('Refreshing data...');
    }

    setupMessageListeners() {
        // Listen for messages from background script and content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch(message.type) {
                case 'ASSET_DETECTED':
                    this.updateAssetInfo(message.data);
                    break;
                case 'ANALYSIS_RESULT':
                    this.displayRealSignal(message.data);
                    break;
                case 'REAL_SIGNAL_GENERATED':
                    this.displayRealSignal(message.data);
                    break;
                case 'REAL_DATA_UPDATE':
                    this.updateRealDataStatus(message.data);
                    break;
                case 'MARKET_DATA':
                    this.updateMarketData(message.data);
                    break;
                case 'ERROR':
                    this.showError(message.data);
                    break;
                    
                // Auto-trading related messages
                case 'AUTO_TRADE_STATUS':
                    this.updateAutoTradeStatus(message.data);
                    break;
                case 'TRADE_EXECUTED':
                    this.handleTradeExecuted(message.data);
                    break;
                case 'TRADE_RESULT':
                    this.handleTradeResult(message.data);
                    break;
                case 'TRADE_STATS':
                    this.updateTradeStats(message.data);
                    break;
                case 'EMERGENCY_STOP_ACTIVATED':
                    this.handleEmergencyStop(message.data);
                    break;
            }
        });
    }
    
    updateAutoTradeStatus(data) {
        // Update auto-trade status in UI
        const autoTradeStatus = document.getElementById('autoTradeStatus');
        if (autoTradeStatus) {
            if (data.emergencyStopActive) {
                autoTradeStatus.textContent = '🛑 EMERGENCY STOP';
                autoTradeStatus.className = 'status-emergency';
            } else if (data.isEnabled) {
                autoTradeStatus.textContent = '✅ ENABLED';
                autoTradeStatus.className = 'status-enabled';
            } else {
                autoTradeStatus.textContent = '⚫ DISABLED';
                autoTradeStatus.className = 'status-disabled';
            }
        }
        
        // Update cooldown timer
        const cooldownElement = document.getElementById('cooldownTimer');
        if (cooldownElement && data.cooldownRemaining) {
            if (data.cooldownRemaining > 0) {
                const minutes = Math.floor(data.cooldownRemaining / 60000);
                const seconds = Math.floor((data.cooldownRemaining % 60000) / 1000);
                cooldownElement.textContent = `${minutes}m ${seconds}s`;
                cooldownElement.parentElement.style.display = 'block';
            } else {
                cooldownElement.textContent = 'Ready';
                cooldownElement.parentElement.style.display = 'none';
            }
        }
        
        // Update toggle state
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.checked = data.isEnabled && !data.emergencyStopActive;
            autoTradeToggle.disabled = data.emergencyStopActive;
        }
        
        // Store status
        this.autoTradeStatus = data;
    }
    
    activateEmergencyStop() {
        // Send emergency stop command to background
        chrome.runtime.sendMessage({
            type: 'EMERGENCY_STOP'
        });
        
        // Also send to content script
        this.sendMessageToActiveTab({
            type: 'EMERGENCY_STOP'
        });
        
        // Update UI
        const autoTradeStatus = document.getElementById('autoTradeStatus');
        if (autoTradeStatus) {
            autoTradeStatus.textContent = '🛑 EMERGENCY STOP';
            autoTradeStatus.className = 'status-emergency';
        }
        
        // Disable toggle
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.checked = false;
            autoTradeToggle.disabled = true;
        }
        
        // Show notification
        this.showNotification('🛑 EMERGENCY STOP ACTIVATED');
    }
    
    resetEmergencyStop() {
        // Send reset command to background
        chrome.runtime.sendMessage({
            type: 'RESET_EMERGENCY_STOP'
        });
        
        // Also send to content script
        this.sendMessageToActiveTab({
            type: 'RESET_EMERGENCY_STOP'
        });
        
        // Update UI
        const autoTradeStatus = document.getElementById('autoTradeStatus');
        if (autoTradeStatus) {
            autoTradeStatus.textContent = '⚫ DISABLED';
            autoTradeStatus.className = 'status-disabled';
        }
        
        // Enable toggle
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.disabled = false;
        }
        
        // Show notification
        this.showNotification('✅ Emergency stop reset');
    }
    
    updateRiskSettings(settings) {
        // Send settings to background
        chrome.runtime.sendMessage({
            type: 'UPDATE_RISK_SETTINGS',
            data: settings
        });
        
        // Show notification
        this.showNotification('Risk settings updated');
    }
    
    handleTradeExecuted(data) {
        // Add to trade history
        this.tradeHistory.unshift(data);
        
        // Update UI
        this.updateTradeHistoryUI();
        
        // Show notification
        this.showNotification(`Trade executed: ${data.direction.toUpperCase()} $${data.amount}`);
        
        // Play sound if enabled
        if (this.settings.voiceAlerts) {
            this.playSound('trade');
        }
    }
    
    handleTradeResult(data) {
        // Find trade in history
        const tradeIndex = this.tradeHistory.findIndex(trade => 
            trade.id === data.id || 
            (trade.timestamp === data.timestamp && trade.direction === data.direction)
        );
        
        if (tradeIndex !== -1) {
            // Update trade
            this.tradeHistory[tradeIndex] = {
                ...this.tradeHistory[tradeIndex],
                result: data.result,
                profit: data.profit,
                resultTimestamp: data.resultTimestamp || Date.now()
            };
            
            // Update UI
            this.updateTradeHistoryUI();
            
            // Show notification
            const resultText = data.result === 'win' ? 'WIN' : 'LOSS';
            const profitText = data.profit ? `$${data.profit.toFixed(2)}` : '';
            this.showNotification(`Trade result: ${resultText} ${profitText}`);
            
            // Play sound if enabled
            if (this.settings.voiceAlerts) {
                this.playSound(data.result === 'win' ? 'win' : 'loss');
            }
        }
    }
    
    updateTradeStats(data) {
        this.tradeStats = data.stats;
        
        // Update UI
        this.updateTradeStatsUI();
    }
    
    updateTradeStatsUI() {
        if (!this.tradeStats) return;
        
        const statsContainer = document.getElementById('tradeStats');
        if (!statsContainer) return;
        
        // Update stats in UI
        const winRate = this.tradeStats.winRate * 100;
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Today:</span>
                <span class="stat-value">${this.tradeStats.todayCount}/${this.tradeStats.maxTradesPerDay}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Win Rate:</span>
                <span class="stat-value">${winRate.toFixed(1)}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">W/L:</span>
                <span class="stat-value">${this.tradeStats.winCount}/${this.tradeStats.lossCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Consecutive Losses:</span>
                <span class="stat-value">${this.tradeStats.consecutiveLosses}/${this.tradeStats.maxConsecutiveLosses}</span>
            </div>
        `;
    }
    
    updateTradeHistoryUI() {
        const historyContainer = document.getElementById('tradeHistory');
        if (!historyContainer) return;
        
        // Clear container
        historyContainer.innerHTML = '';
        
        // Add trades
        if (this.tradeHistory.length === 0) {
            historyContainer.innerHTML = '<div class="no-trades">No trades yet</div>';
            return;
        }
        
        // Show last 10 trades
        const recentTrades = this.tradeHistory.slice(0, 10);
        
        recentTrades.forEach(trade => {
            const date = new Date(trade.timestamp);
            const timeStr = date.toLocaleTimeString();
            
            let resultClass = 'pending';
            let resultText = 'PENDING';
            
            if (trade.result === 'win') {
                resultClass = 'win';
                resultText = 'WIN';
            } else if (trade.result === 'loss') {
                resultClass = 'loss';
                resultText = 'LOSS';
            }
            
            const tradeItem = document.createElement('div');
            tradeItem.className = `trade-item ${resultClass}`;
            tradeItem.innerHTML = `
                <div class="trade-time">${timeStr}</div>
                <div class="trade-asset">${trade.asset || 'Unknown'}</div>
                <div class="trade-direction">${trade.direction.toUpperCase()}</div>
                <div class="trade-amount">$${trade.amount}</div>
                <div class="trade-result ${resultClass}">${resultText}</div>
            `;
            
            historyContainer.appendChild(tradeItem);
        });
    }
    
    showTradeHistory() {
        // Request trade history from background
        chrome.runtime.sendMessage({
            type: 'GET_TRADE_HISTORY'
        }, response => {
            if (response && response.history) {
                this.tradeHistory = response.history;
                this.updateTradeHistoryUI();
                
                // Show trade history panel
                const historyPanel = document.getElementById('tradeHistoryPanel');
                if (historyPanel) {
                    historyPanel.style.display = 'block';
                }
            }
        });
        
        // Request trade stats
        chrome.runtime.sendMessage({
            type: 'GET_TRADE_STATS'
        }, response => {
            if (response && response.stats) {
                this.tradeStats = response.stats;
                this.updateTradeStatsUI();
            }
        });
    }
    
    exportTradeHistory() {
        // Request CSV export from background
        chrome.runtime.sendMessage({
            type: 'EXPORT_TRADE_HISTORY'
        }, response => {
            if (response && response.csv) {
                // Create download link
                const blob = new Blob([response.csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `trade_history_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // Show notification
                this.showNotification('Trade history exported');
            }
        });
    }
    
    clearTradeHistory() {
        // Send clear command to background
        chrome.runtime.sendMessage({
            type: 'CLEAR_TRADE_HISTORY'
        }, response => {
            if (response && response.success) {
                // Clear local history
                this.tradeHistory = [];
                this.updateTradeHistoryUI();
                
                // Show notification
                this.showNotification('Trade history cleared');
            }
        });
    }
    
    handleEmergencyStop(data) {
        // Update UI
        const autoTradeStatus = document.getElementById('autoTradeStatus');
        if (autoTradeStatus) {
            autoTradeStatus.textContent = '🛑 EMERGENCY STOP';
            autoTradeStatus.className = 'status-emergency';
        }
        
        // Disable toggle
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.checked = false;
            autoTradeToggle.disabled = true;
        }
        
        // Show notification
        this.showNotification(`🛑 EMERGENCY STOP: ${data.reason || 'Manual activation'}`);
        
        // Play sound if enabled
        if (this.settings.voiceAlerts) {
            this.playSound('emergency');
        }
    }
        
        // Update settings
        if (data.isEnabled !== undefined) {
            this.settings.autoTradeEnabled = data.isEnabled;
        }
        if (data.emergencyStopActive !== undefined) {
            this.settings.emergencyStopActive = data.emergencyStopActive;
        }
        
        // Update toggle
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.checked = this.settings.autoTradeEnabled && !this.settings.emergencyStopActive;
            autoTradeToggle.disabled = this.settings.emergencyStopActive;
        }
        
        // Save settings
        this.saveSettings();
    }
    
    handleTradeExecuted(data) {
        // Show notification
        this.showNotification(`Trade executed: ${data.direction} $${data.amount}`, 'success');
        
        // Update trade info in UI
        const tradeInfoElement = document.getElementById('lastTradeInfo');
        if (tradeInfoElement) {
            tradeInfoElement.textContent = `${data.direction} $${data.amount} (${data.expiry}m)`;
            tradeInfoElement.parentElement.style.display = 'block';
        }
        
        // Log trade
        console.log('[Popup] Trade executed:', data);
    }
    
    handleTradeResult(data) {
        // Show notification
        const resultClass = data.result === 'win' ? 'success' : 'error';
        this.showNotification(`Trade result: ${data.result.toUpperCase()} ${data.profit ? '$' + data.profit : ''}`, resultClass);
        
        // Update trade result in UI
        const tradeResultElement = document.getElementById('lastTradeResult');
        if (tradeResultElement) {
            tradeResultElement.textContent = `${data.result.toUpperCase()} ${data.profit ? '$' + data.profit : ''}`;
            tradeResultElement.className = data.result === 'win' ? 'result-win' : 'result-loss';
            tradeResultElement.parentElement.style.display = 'block';
        }
        
        // Update trade stats
        this.updateTradeStats();
    }
    
    handleEmergencyStop(data) {
        // Update settings
        this.settings.emergencyStopActive = true;
        this.settings.autoTradeEnabled = false;
        this.saveSettings();
        
        // Update UI
        this.updateAutoTradeUI();
        
        // Show notification
        this.showNotification('⚠️ EMERGENCY STOP ACTIVATED', 'error');
        
        // Show alert if reason provided
        if (data.reason) {
            alert(`EMERGENCY STOP ACTIVATED\nReason: ${data.reason}`);
        }
    }

    async detectCurrentAsset() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                this.updateStatus('No active tab detected');
                return;
            }

            // Detect platform from URL
            const platform = this.detectPlatform(tab.url);
            document.getElementById('currentPlatform').textContent = platform;

            // Request asset detection from content script
            chrome.tabs.sendMessage(tab.id, { type: 'DETECT_ASSET' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Content script not ready:', chrome.runtime.lastError.message);
                    document.getElementById('currentAsset').textContent = 'Platform not supported';
                    return;
                }

                if (response && response.asset) {
                    document.getElementById('currentAsset').textContent = response.asset;
                } else {
                    document.getElementById('currentAsset').textContent = 'Not detected';
                }
            });

        } catch (error) {
            console.error('Asset detection error:', error);
            this.updateStatus('Detection failed');
        }
    }

    detectPlatform(url) {
        if (url.includes('quotex.io')) return 'Quotex';
        if (url.includes('olymptrade.com')) return 'Olymp Trade';
        if (url.includes('iqoption.com')) return 'IQ Option';
        if (url.includes('binomo.com')) return 'Binomo';
        return 'Unknown';
    }

    async startAnalysis() {
        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.updateControlButtons();
        this.updateStatus('Starting REAL-TIME DOM analysis...');

        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check if we're on a supported platform
            const platform = this.detectPlatform(tab.url);
            if (platform === 'Unknown') {
                this.showError('Platform not supported for real-time analysis');
                this.stopAnalysis();
                return;
            }

            // Show loading indicator
            this.showLoadingIndicator(true);

            // Start real-time DOM extraction in content script with enhanced error handling
            chrome.tabs.sendMessage(tab.id, { 
                type: 'START_REAL_EXTRACTION',
                data: {
                    settings: this.settings,
                    timestamp: Date.now()
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Content script communication failed:', chrome.runtime.lastError.message);
                    
                    // Try to inject content script if it's not loaded
                    this.injectContentScriptIfNeeded(tab.id).then(injected => {
                        if (injected) {
                            // Retry after injection
                            setTimeout(() => {
                                this.startAnalysis();
                            }, 1000);
                        } else {
                            this.showError('Failed to connect to platform - please refresh the page');
                            this.stopAnalysis();
                        }
                    });
                    
                    return;
                }

                if (response && response.success) {
                    console.log('[Popup] ✅ Real-time extraction started');
                    this.updateStatus('🔍 Extracting live data from platform...');
                    
                    // Hide loading indicator
                    this.showLoadingIndicator(false);
                    
                    // Start background analysis with real data processing
                    chrome.runtime.sendMessage({
                        type: 'START_ANALYSIS',
                        data: {
                            tabId: tab.id,
                            settings: this.settings,
                            mode: 'REAL_DOM_EXTRACTION', // Flag for real mode
                            platform: platform
                        }
                    });

                    // Show signal section
                    document.getElementById('signalSection').style.display = 'block';
                    
                    // Show analysis section if available
                    const analysisSection = document.getElementById('analysisSection');
                    if (analysisSection) {
                        analysisSection.style.display = 'block';
                    }
                    
                    // Update status after short delay
                    setTimeout(() => {
                        if (this.isAnalyzing) {
                            this.updateStatus('🧠 Real-time analysis active - waiting for signals...');
                        }
                    }, 3000);
                    
                    // Enable auto-trading if configured
                    if (this.settings.autoTradeEnabled) {
                        this.enableAutoTrading();
                    }
                    
                    // Show notification
                    this.showNotification('Real-time analysis started');
                    
                } else {
                    this.showError(response?.error || 'Failed to start DOM extraction');
                    this.stopAnalysis();
                    return;
                }
            });

        } catch (error) {
            console.error('Start analysis error:', error);
            this.showError('Failed to start real-time analysis');
            this.stopAnalysis();
        }
    }
    
    async injectContentScriptIfNeeded(tabId) {
        try {
            // Check if content script is already injected
            const response = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tabId, { type: 'PING' }, response => {
                    resolve(response);
                });
            });
            
            if (response) {
                console.log('[Popup] Content script already injected');
                return true;
            }
        } catch (error) {
            // Content script not injected, proceed with injection
            console.log('[Popup] Content script not detected, injecting...');
        }
        
        try {
            // Inject content script
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            });
            
            console.log('[Popup] Content script injected successfully');
            return true;
        } catch (error) {
            console.error('[Popup] Failed to inject content script:', error);
            return false;
        }
    }
    
    showLoadingIndicator(show) {
        // Create or find loading indicator
        let loader = document.getElementById('analysisLoader');
        
        if (!loader && show) {
            loader = document.createElement('div');
            loader.id = 'analysisLoader';
            loader.className = 'loader';
            loader.innerHTML = '<div class="spinner"></div><div class="loader-text">Initializing analysis...</div>';
            document.body.appendChild(loader);
        }
        
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }
    
    enableAutoTrading() {
        // Send command to enable auto-trading
        this.sendMessageToActiveTab({
            type: 'ENABLE_AUTO_TRADING',
            data: {
                enabled: true,
                settings: {
                    minConfidence: this.settings.minConfidence,
                    maxRiskPerTrade: this.settings.maxRiskPerTrade || 2
                }
            }
        });
        
        // Update UI
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.checked = true;
        }
        
        const autoTradeStatus = document.getElementById('autoTradeStatus');
        if (autoTradeStatus) {
            autoTradeStatus.textContent = 'ENABLED';
            autoTradeStatus.className = 'status-enabled';
        }
        
        console.log('[Popup] Auto-trading enabled');
    }

    stopAnalysis() {
        this.isAnalyzing = false;
        this.updateControlButtons();
        this.updateStatus('Analysis stopped');

        // Stop background analysis
        chrome.runtime.sendMessage({ type: 'STOP_ANALYSIS' });

        // Clear timer
        if (this.entryTimer) {
            clearInterval(this.entryTimer);
            this.entryTimer = null;
        }

        // Hide signal section
        document.getElementById('signalSection').style.display = 'none';
    }

    displaySignal(signalData) {
        this.currentSignal = signalData;
        
        // Check confidence threshold
        if (signalData.confidence < this.settings.minConfidence) {
            console.log('Signal rejected: Low confidence', signalData.confidence);
            return;
        }

        // Update prediction display
        const predictionEl = document.getElementById('prediction');
        const directionText = predictionEl.querySelector('.direction-text');
        const directionArrow = predictionEl.querySelector('.direction-arrow');
        
        directionText.textContent = signalData.prediction;
        directionArrow.textContent = signalData.prediction === 'UP' ? '↗️' : '↘️';
        
        predictionEl.className = `direction ${signalData.prediction.toLowerCase()}`;

        // Update confidence
        document.getElementById('confidence').textContent = `${signalData.confidence}%`;
        document.getElementById('confidenceBar').style.width = `${signalData.confidence}%`;

        // Update details
        document.getElementById('reason').textContent = signalData.reason;
        document.getElementById('volatility').textContent = signalData.volatility || 'Normal';
        document.getElementById('risk').textContent = signalData.risk || 'Medium';

        // Update timestamp
        document.getElementById('signalTime').textContent = new Date().toLocaleTimeString();

        // Start entry timer (5 minutes for binary options)
        this.startEntryTimer(300); // 5 minutes in seconds

        // Play voice alert
        if (this.settings.voiceAlerts) {
            this.playVoiceAlert(signalData);
        }

        // Log signal
        this.logSignal(signalData);

        // Update signal count
        this.signalCount++;
        document.getElementById('signalsToday').textContent = this.signalCount.toString();
    }

    displayRealSignal(signalData) {
        console.log('[Popup] 🎯 Displaying REAL signal:', signalData);
        
        this.currentSignal = signalData;
        
        // Check confidence threshold
        if (signalData.confidence < this.settings.minConfidence) {
            console.log('[Popup] Real signal rejected: Low confidence', signalData.confidence);
            // Still log the signal but mark as rejected
            this.logRealSignal({...signalData, rejected: true, rejection_reason: 'Low confidence'});
            return;
        }

        // Update prediction display with enhanced styling for real signals
        const predictionEl = document.getElementById('prediction');
        const directionText = predictionEl.querySelector('.direction-text');
        const directionArrow = predictionEl.querySelector('.direction-arrow');
        
        // Normalize direction format
        const direction = signalData.direction.toUpperCase();
        
        // Add visual indicators based on confidence
        let confidenceIndicator = '⚡'; // Default
        if (signalData.confidence >= 90) {
            confidenceIndicator = '🔥'; // Very high confidence
        } else if (signalData.confidence >= 85) {
            confidenceIndicator = '⚡⚡'; // High confidence
        }
        
        directionText.textContent = `${direction} ${confidenceIndicator}`;
        directionArrow.textContent = direction === 'UP' ? '↗️' : '↘️';
        
        // Add special class for very high confidence signals
        const confidenceClass = signalData.confidence >= 85 ? 'high-confidence' : '';
        predictionEl.className = `direction ${direction.toLowerCase()} real-signal ${confidenceClass}`;

        // Update confidence with real signal indicator and color coding
        const confidenceEl = document.getElementById('confidence');
        let confidenceSymbol = '✅'; // Default verified
        
        if (signalData.confidence >= 90) {
            confidenceSymbol = '✅✅'; // Double check for very high confidence
        }
        
        if (signalData.source_verified) {
            confidenceSymbol += ' 🔒'; // Add lock for verified source
        }
        
        confidenceEl.textContent = `${signalData.confidence}% ${confidenceSymbol}`;
        confidenceEl.className = signalData.confidence >= 85 ? 'high-confidence' : '';
        
        // Update confidence bar with color coding
        const confidenceBar = document.getElementById('confidenceBar');
        confidenceBar.style.width = `${signalData.confidence}%`;
        
        if (signalData.confidence >= 85) {
            confidenceBar.className = 'confidence-fill high';
        } else if (signalData.confidence >= 75) {
            confidenceBar.className = 'confidence-fill medium';
        } else {
            confidenceBar.className = 'confidence-fill';
        }

        // Update details with enhanced real signal information
        document.getElementById('reason').textContent = signalData.reason;
        
        // Update volatility with icon
        const volatilityEl = document.getElementById('volatility');
        const volatility = signalData.volatility || 'Normal';
        const volatilityIcons = {
            'high': '📈 High',
            'low': '📉 Low',
            'normal': '📊 Normal',
            'extreme': '⚠️ Extreme'
        };
        volatilityEl.textContent = volatilityIcons[volatility.toLowerCase()] || volatility;
        
        // Update risk with icon and color
        const riskEl = document.getElementById('risk');
        let risk = 'Medium';
        
        if (signalData.risk_assessment && signalData.risk_assessment.level) {
            risk = signalData.risk_assessment.level;
        } else if (signalData.risk) {
            risk = signalData.risk;
        }
        
        const riskIcons = {
            'Low': '🟢 Low',
            'Medium': '🟠 Medium',
            'High': '🔴 High'
        };
        
        riskEl.textContent = riskIcons[risk] || risk;
        riskEl.className = risk.toLowerCase();

        // Add real signal verification indicators with enhanced details
        this.updateVerificationStatus(signalData);

        // Update timestamp with precision
        const timestamp = signalData.timestamp || Date.now();
        document.getElementById('signalTime').textContent = new Date(timestamp).toLocaleTimeString();

        // Enhanced entry timer with optimal entry window
        if (signalData.entry_window) {
            this.startOptimalEntryTimer(signalData.entry_window);
            
            // Add entry recommendation if available
            const entryRecommendationEl = document.getElementById('entryRecommendation');
            if (entryRecommendationEl && signalData.entry_window.recommendation) {
                entryRecommendationEl.textContent = signalData.entry_window.recommendation;
                entryRecommendationEl.style.display = 'block';
            }
        } else {
            this.startEntryTimer(300); // Fallback 5 minutes
        }

        // Play enhanced voice alert for real signals
        if (this.settings.voiceAlerts) {
            this.playRealSignalVoiceAlert(signalData);
        }

        // Log real signal
        this.logRealSignal(signalData);

        // Update signal count
        this.signalCount++;
        document.getElementById('signalsToday').textContent = this.signalCount.toString();

        // Show signal section
        document.getElementById('signalSection').style.display = 'block';
        
        // Update auto-trade status if available
        this.updateAutoTradeStatus(signalData);
        
        // Show notification
        this.showNotification(`${direction} signal detected! ${signalData.confidence}% confidence`, 'signal');
        
        // Flash the signal for attention
        this.flashSignalAttention();
    }
    
    updateAutoTradeStatus(signal) {
        const autoTradeStatusEl = document.getElementById('autoTradeExecutionStatus');
        if (!autoTradeStatusEl) return;
        
        if (this.settings.autoTradeEnabled && signal.confidence >= 85) {
            autoTradeStatusEl.textContent = 'AUTO-TRADE EXECUTING...';
            autoTradeStatusEl.className = 'auto-trade-status executing';
            
            // Reset after 5 seconds
            setTimeout(() => {
                if (autoTradeStatusEl.textContent === 'AUTO-TRADE EXECUTING...') {
                    autoTradeStatusEl.textContent = 'READY FOR NEXT SIGNAL';
                    autoTradeStatusEl.className = 'auto-trade-status ready';
                }
            }, 5000);
        } else if (this.settings.autoTradeEnabled) {
            autoTradeStatusEl.textContent = 'WAITING FOR STRONGER SIGNAL';
            autoTradeStatusEl.className = 'auto-trade-status waiting';
        } else {
            autoTradeStatusEl.textContent = 'AUTO-TRADE DISABLED';
            autoTradeStatusEl.className = 'auto-trade-status disabled';
        }
    }
    
    flashSignalAttention() {
        const signalSection = document.getElementById('signalSection');
        if (!signalSection) return;
        
        // Add flash class
        signalSection.classList.add('flash-attention');
        
        // Remove after animation completes
        setTimeout(() => {
            signalSection.classList.remove('flash-attention');
        }, 1000);
    }

    updateVerificationStatus(signalData) {
        // Add verification status indicators to the UI with enhanced details
        let verificationHTML = '<div class="verification-status">';
        
        // Data source verification
        if (signalData.real_data) {
            verificationHTML += '<span class="verified">🔍 Real DOM Data</span>';
        } else if (signalData.source === 'real_dom_data') {
            verificationHTML += '<span class="verified">🔍 DOM Extraction</span>';
        } else {
            verificationHTML += '<span class="unverified">⚠️ Unverified Data</span>';
        }
        
        // Source verification
        if (signalData.source_verified) {
            verificationHTML += '<span class="verified">✅ Source Verified</span>';
        }
        
        // Extraction method with enhanced details
        if (signalData.extraction_method) {
            const methodIcons = {
                'dom': '📊',
                'dom_analysis': '📊',
                'canvas': '🎨',
                'injected': '💉',
                'network': '🌐',
                'multi_timeframe_analysis': '⏱️'
            };
            
            const icon = methodIcons[signalData.extraction_method] || '📊';
            verificationHTML += `<span class="method">${icon} ${this.formatMethodName(signalData.extraction_method)}</span>`;
        }
        
        // Data quality with enhanced styling
        if (signalData.data_quality) {
            const qualityEmoji = {
                'excellent': '🌟',
                'good': '✅', 
                'fair': '⚠️',
                'poor': '❌'
            };
            
            const qualityClass = signalData.data_quality.toLowerCase();
            verificationHTML += `<span class="quality ${qualityClass}">${qualityEmoji[signalData.data_quality.toLowerCase()] || '📊'} ${signalData.data_quality}</span>`;
        }
        
        // Add signal strength if available
        if (signalData.signal_strength) {
            const strengthEmoji = {
                'very_strong': '💪💪',
                'strong': '💪',
                'moderate': '👍',
                'weak': '👎'
            };
            
            const strengthClass = signalData.signal_strength.toLowerCase().replace('_', '-');
            verificationHTML += `<span class="strength ${strengthClass}">${strengthEmoji[signalData.signal_strength] || '📊'} ${this.formatStrengthName(signalData.signal_strength)}</span>`;
        }
        
        // Add timeframe information if available
        if (signalData.timeframe_used) {
            verificationHTML += `<span class="timeframe">⏱️ ${signalData.timeframe_used}</span>`;
        }
        
        // Add model version if available
        if (signalData.model_version) {
            verificationHTML += `<span class="model-version">🧠 v${signalData.model_version}</span>`;
        }
        
        verificationHTML += '</div>';
        
        // Add technical details section if available
        if (signalData.technical_details) {
            verificationHTML += '<div class="technical-details">';
            
            // Add timeframe alignment
            if (signalData.technical_details.timeframe_alignment) {
                const alignment = signalData.technical_details.timeframe_alignment;
                const alignmentClass = alignment >= 80 ? 'high' : (alignment >= 60 ? 'medium' : 'low');
                verificationHTML += `<span class="alignment ${alignmentClass}">⏱️ ${alignment}% Aligned</span>`;
            }
            
            // Add bullish/bearish scores
            if (signalData.technical_details.bullish_score !== undefined && 
                signalData.technical_details.bearish_score !== undefined) {
                
                const bullScore = Math.round(signalData.technical_details.bullish_score * 100) / 100;
                const bearScore = Math.round(signalData.technical_details.bearish_score * 100) / 100;
                
                verificationHTML += `<span class="score bullish">📈 Bull: ${bullScore}</span>`;
                verificationHTML += `<span class="score bearish">📉 Bear: ${bearScore}</span>`;
            }
            
            verificationHTML += '</div>';
        }
        
        // Insert verification status (create element if doesn't exist)
        let verificationEl = document.getElementById('verificationStatus');
        if (!verificationEl) {
            verificationEl = document.createElement('div');
            verificationEl.id = 'verificationStatus';
            verificationEl.className = 'verification-container';
            
            // Insert after the prediction element
            const predictionEl = document.getElementById('prediction');
            predictionEl.parentNode.insertBefore(verificationEl, predictionEl.nextSibling);
        }
        
        verificationEl.innerHTML = verificationHTML;
    }
    
    formatMethodName(method) {
        if (!method) return 'Unknown';
        
        // Convert snake_case to Title Case with spaces
        return method
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    formatStrengthName(strength) {
        if (!strength) return 'Unknown';
        
        // Convert snake_case to Title Case with spaces
        return strength
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    updateRealDataStatus(dataUpdate) {
        console.log('[Popup] 📊 Real data update received:', dataUpdate);
        
        // Update data quality indicator
        const statusElements = {
            timeframe: document.getElementById('currentTimeframe'),
            candleCount: document.getElementById('candleCount'),
            dataQuality: document.getElementById('dataQuality'),
            extractionMethod: document.getElementById('extractionMethod'),
            lastPrice: document.getElementById('lastPrice')
        };
        
        if (statusElements.timeframe) {
            statusElements.timeframe.textContent = dataUpdate.timeframe;
        }
        
        if (statusElements.candleCount) {
            statusElements.candleCount.textContent = `${dataUpdate.candleCount} candles`;
        }
        
        if (statusElements.dataQuality) {
            const qualityEmoji = {
                'excellent': '🌟 Excellent',
                'good': '✅ Good',
                'fair': '⚠️ Fair', 
                'poor': '❌ Poor'
            };
            statusElements.dataQuality.textContent = qualityEmoji[dataUpdate.dataQuality] || dataUpdate.dataQuality;
        }
        
        if (statusElements.extractionMethod) {
            statusElements.extractionMethod.textContent = dataUpdate.method;
        }
        
        if (statusElements.lastPrice && dataUpdate.lastPrice) {
            statusElements.lastPrice.textContent = dataUpdate.lastPrice.toFixed(5);
        }
    }

    startOptimalEntryTimer(entryWindow) {
        if (this.entryTimer) {
            clearInterval(this.entryTimer);
        }

        let timeLeft = entryWindow.seconds_until_entry;
        const timerEl = document.getElementById('entryTimer');
        const recommendationEl = document.getElementById('entryRecommendation');

        // Show entry recommendation
        if (recommendationEl) {
            recommendationEl.textContent = entryWindow.recommendation;
            recommendationEl.style.display = 'block';
        }

        const updateTimer = () => {
            const minutes = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            
            if (timeLeft > 0) {
                timerEl.textContent = `Enter in: ${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                timerEl.style.color = timeLeft <= 10 ? '#ff6b6b' : '#4ecdc4';
            } else if (timeLeft === 0) {
                timerEl.textContent = '🎯 ENTER NOW!';
                timerEl.style.color = '#4ecdc4';
                timerEl.style.fontWeight = 'bold';
                
                // Flash the enter signal
                this.flashEntrySignal();
            } else {
                const expiredTime = Math.abs(timeLeft);
                timerEl.textContent = `Expired ${expiredTime}s ago`;
                timerEl.style.color = '#ef4444';
            }
            
            timeLeft--;
        };

        updateTimer(); // Initial call
        this.entryTimer = setInterval(updateTimer, 1000);
    }

    flashEntrySignal() {
        const predictionEl = document.getElementById('prediction');
        let flashCount = 0;
        
        const flashInterval = setInterval(() => {
            predictionEl.style.opacity = predictionEl.style.opacity === '0.3' ? '1' : '0.3';
            flashCount++;
            
            if (flashCount >= 6) { // Flash 3 times
                clearInterval(flashInterval);
                predictionEl.style.opacity = '1';
            }
        }, 300);
    }

    playRealSignalVoiceAlert(signalData) {
        if (!('speechSynthesis' in window)) return;

        // Enhanced voice message for real signals
        const message = `Real signal detected! ${signalData.direction} direction with ${signalData.confidence} percent confidence from live DOM data. ${signalData.reason}. Entry recommended at ${signalData.entry_window?.optimal_entry || 'next opportunity'}.`;

        const utterance = new SpeechSynthesisUtterance(message);
        
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        
        speechSynthesis.speak(utterance);
    }

    logRealSignal(signalData) {
        const log = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: 'REAL_SIGNAL',
            signal: {
                direction: signalData.direction,
                confidence: signalData.confidence,
                reason: signalData.reason,
                asset: signalData.asset,
                platform: signalData.platform
            },
            verification: {
                real_data: signalData.real_data,
                source_verified: signalData.source_verified,
                extraction_method: signalData.extraction_method,
                data_quality: signalData.data_quality
            },
            risk: signalData.risk_assessment,
            position: signalData.position_size,
            entry: signalData.entry_window,
            outcome: 'pending'
        };

        // Get existing logs
        chrome.storage.local.get(['signalLogs'], (result) => {
            const logs = result.signalLogs || [];
            logs.unshift(log); // Add to beginning
            
            // Keep only last 100 logs
            if (logs.length > 100) {
                logs.splice(100);
            }
            
            chrome.storage.local.set({ signalLogs: logs });
        });

        console.log('[Popup] 📝 Real signal logged:', log);
    }

    startEntryTimer(seconds) {
        if (this.entryTimer) {
            clearInterval(this.entryTimer);
        }

        let timeLeft = seconds;
        const timerEl = document.getElementById('entryTimer');

        const updateTimer = () => {
            const minutes = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(this.entryTimer);
                timerEl.textContent = 'Expired';
                timerEl.style.color = '#ef4444';
            }
            
            timeLeft--;
        };

        updateTimer(); // Initial call
        this.entryTimer = setInterval(updateTimer, 1000);
    }

    playVoiceAlert(signalData) {
        if (!('speechSynthesis' in window)) return;

        const utterance = new SpeechSynthesisUtterance(
            `New signal: ${signalData.prediction} with ${signalData.confidence} percent confidence. ${signalData.reason}`
        );
        
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 0.7;
        
        speechSynthesis.speak(utterance);
    }

    updateMarketData(marketData) {
        // Update indicators
        if (marketData.indicators) {
            const indicators = marketData.indicators;
            document.getElementById('rsi').textContent = indicators.RSI?.toFixed(1) || '--';
            document.getElementById('macd').textContent = indicators.MACD?.toFixed(4) || '--';
            document.getElementById('ema21').textContent = indicators.EMA21?.toFixed(5) || '--';
            document.getElementById('volume').textContent = indicators.Volume || '--';
        }

        // Update patterns
        if (marketData.patterns) {
            this.updatePatterns(marketData.patterns);
        }

        // Update timeframe analysis
        if (marketData.timeframes) {
            this.updateTimeframeAnalysis(marketData.timeframes);
        }
    }

    updatePatterns(patterns) {
        const patternsContainer = document.getElementById('patternsList');
        
        if (patterns.length === 0) {
            patternsContainer.innerHTML = '<div class="no-patterns">No significant patterns detected</div>';
            return;
        }

        patternsContainer.innerHTML = patterns.map(pattern => `
            <div class="pattern-item">
                <span class="pattern-name">${pattern.name}</span>
                <span class="pattern-strength ${pattern.strength.toLowerCase()}">${pattern.strength}</span>
            </div>
        `).join('');
    }

    updateTimeframeAnalysis(timeframes) {
        const container = document.getElementById('timeframeAnalysis');
        
        container.innerHTML = Object.entries(timeframes).map(([tf, analysis]) => `
            <div class="timeframe-item">
                <div class="timeframe-label">${tf}</div>
                <div class="timeframe-trend ${analysis.trend.toLowerCase()}">${analysis.trend}</div>
                <div class="timeframe-strength">${analysis.strength}%</div>
            </div>
        `).join('');
    }

    logSignal(signalData) {
        const log = {
            timestamp: new Date().toISOString(),
            signal: signalData,
            outcome: 'pending'
        };

        // Get existing logs
        chrome.storage.local.get(['signalLogs'], (result) => {
            const logs = result.signalLogs || [];
            logs.push(log);
            
            // Keep only last 100 logs
            if (logs.length > 100) {
                logs.shift();
            }
            
            chrome.storage.local.set({ signalLogs: logs });
        });
    }

    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Show/hide sections
        const sections = ['signalSection', 'analysisSection', 'logsSection'];
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (sectionId.includes(section) || (section === 'main' && sectionId === 'signalSection')) {
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        });

        // Load logs if logs section is selected
        if (section === 'logs') {
            this.loadLogs();
        }
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Show/hide tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = content.id === tab ? 'block' : 'none';
        });
    }

    loadLogs() {
        chrome.storage.local.get(['signalLogs'], (result) => {
            const logs = result.signalLogs || [];
            const container = document.getElementById('logsContainer');
            
            if (logs.length === 0) {
                container.innerHTML = '<div class="no-logs">No signals logged yet</div>';
                return;
            }

            container.innerHTML = logs.reverse().map(log => `
                <div class="log-entry">
                    <div class="log-header">
                        <span class="log-time">${new Date(log.timestamp).toLocaleString()}</span>
                        <span class="log-outcome ${log.outcome}">${log.outcome.toUpperCase()}</span>
                    </div>
                    <div class="log-details">
                        <span class="log-prediction ${log.signal.prediction.toLowerCase()}">
                            ${log.signal.prediction} ${log.signal.confidence}%
                        </span>
                        <span class="log-reason">${log.signal.reason}</span>
                    </div>
                </div>
            `).join('');
        });
    }

    clearLogs() {
        chrome.storage.local.set({ signalLogs: [] });
        document.getElementById('logsContainer').innerHTML = '<div class="no-logs">No signals logged yet</div>';
    }

    updateControlButtons() {
        const startBtn = document.getElementById('startAnalysis');
        const stopBtn = document.getElementById('stopAnalysis');
        
        if (this.isAnalyzing) {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
        } else {
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
        }
    }

    updateStatus(status) {
        document.getElementById('systemStatus').textContent = status;
    }

    updateAssetInfo(assetData) {
        document.getElementById('currentAsset').textContent = assetData.asset || 'Not detected';
        document.getElementById('currentPlatform').textContent = assetData.platform || 'Unknown';
    }

    showError(error) {
        console.error('UI Error:', error);
        this.updateStatus(`Error: ${error}`);
    }
    
    playSound(type) {
        try {
            let soundUrl;
            
            switch(type) {
                case 'signal':
                    soundUrl = chrome.runtime.getURL('sounds/signal.mp3');
                    break;
                case 'trade':
                    soundUrl = chrome.runtime.getURL('sounds/trade.mp3');
                    break;
                case 'win':
                    soundUrl = chrome.runtime.getURL('sounds/win.mp3');
                    break;
                case 'loss':
                    soundUrl = chrome.runtime.getURL('sounds/loss.mp3');
                    break;
                case 'emergency':
                    soundUrl = chrome.runtime.getURL('sounds/emergency.mp3');
                    break;
                default:
                    soundUrl = chrome.runtime.getURL('sounds/notification.mp3');
            }
            
            const audio = new Audio(soundUrl);
            audio.volume = 0.5;
            audio.play();
        } catch (error) {
            console.error('[Candle Sniper] Error playing sound:', error);
        }
    }

    loadSettings() {
        chrome.storage.local.get(['candleSniperSettings'], (result) => {
            if (result.candleSniperSettings) {
                this.settings = { 
                    ...this.settings, 
                    ...result.candleSniperSettings,
                    // Default values for auto-trading if not present
                    autoTradeEnabled: result.candleSniperSettings.autoTradeEnabled || false,
                    emergencyStopActive: result.candleSniperSettings.emergencyStopActive || false,
                    maxTradesPerDay: result.candleSniperSettings.maxTradesPerDay || 5,
                    tradeCooldown: result.candleSniperSettings.tradeCooldown || 5,
                    minConfidence: result.candleSniperSettings.minConfidence || 85
                };
                
                // Update UI
                document.getElementById('voiceAlerts').checked = this.settings.voiceAlerts;
                document.getElementById('autoAnalysis').checked = this.settings.autoAnalysis;
                
                // Update auto-trade UI
                const autoTradeToggle = document.getElementById('autoTradeToggle');
                if (autoTradeToggle) {
                    autoTradeToggle.checked = this.settings.autoTradeEnabled && !this.settings.emergencyStopActive;
                }
                
                // Update risk management settings
                const maxTradesInput = document.getElementById('maxTradesPerDay');
                if (maxTradesInput) {
                    maxTradesInput.value = this.settings.maxTradesPerDay;
                }
                
                const cooldownInput = document.getElementById('tradeCooldown');
                if (cooldownInput) {
                    cooldownInput.value = this.settings.tradeCooldown;
                }
                
                const minConfidenceInput = document.getElementById('minConfidence');
                if (minConfidenceInput) {
                    minConfidenceInput.value = this.settings.minConfidence;
                }
                
                // Update auto-trade UI
                this.updateAutoTradeUI();
            }
        });
    }

    saveSettings() {
        chrome.storage.local.set({ candleSniperSettings: this.settings });
    }
    
    updateAutoTradeUI() {
        // Update auto-trade toggle
        const autoTradeToggle = document.getElementById('autoTradeToggle');
        if (autoTradeToggle) {
            autoTradeToggle.checked = this.settings.autoTradeEnabled && !this.settings.emergencyStopActive;
            autoTradeToggle.disabled = this.settings.emergencyStopActive;
        }
        
        // Update emergency stop UI
        const emergencyStopBtn = document.getElementById('emergencyStop');
        const resetEmergencyBtn = document.getElementById('resetEmergency');
        const emergencyStatusIndicator = document.getElementById('emergencyStatus');
        
        if (emergencyStopBtn && resetEmergencyBtn && emergencyStatusIndicator) {
            emergencyStopBtn.disabled = this.settings.emergencyStopActive;
            resetEmergencyBtn.disabled = !this.settings.emergencyStopActive;
            
            if (this.settings.emergencyStopActive) {
                emergencyStatusIndicator.textContent = 'EMERGENCY STOP ACTIVE';
                emergencyStatusIndicator.classList.add('emergency-active');
            } else {
                emergencyStatusIndicator.textContent = 'Normal operation';
                emergencyStatusIndicator.classList.remove('emergency-active');
            }
        }
        
        // Update auto-trade status card
        const autoTradeStatus = document.getElementById('autoTradeStatus');
        if (autoTradeStatus) {
            if (this.settings.emergencyStopActive) {
                autoTradeStatus.textContent = '🛑 EMERGENCY STOP';
                autoTradeStatus.className = 'status-emergency';
            } else if (this.settings.autoTradeEnabled) {
                autoTradeStatus.textContent = '✅ ENABLED';
                autoTradeStatus.className = 'status-enabled';
            } else {
                autoTradeStatus.textContent = '⚫ DISABLED';
                autoTradeStatus.className = 'status-disabled';
            }
        }
        
        // Update trade stats
        this.updateTradeStats();
    }
    
    activateEmergencyStop() {
        this.settings.emergencyStopActive = true;
        this.settings.autoTradeEnabled = false;
        this.saveSettings();
        
        // Send emergency stop command to content script
        this.sendMessageToActiveTab({
            type: 'EMERGENCY_STOP',
            data: { activated: true }
        });
        
        // Update UI
        this.updateAutoTradeUI();
        
        // Show alert
        alert('⚠️ EMERGENCY STOP ACTIVATED\nAll auto-trading has been halted.');
    }
    
    resetEmergencyStop() {
        this.settings.emergencyStopActive = false;
        this.saveSettings();
        
        // Send reset command to content script
        this.sendMessageToActiveTab({
            type: 'RESET_EMERGENCY_STOP',
            data: { reset: true }
        });
        
        // Update UI
        this.updateAutoTradeUI();
    }
    
    updateTradeStats() {
        // Request latest trade stats from background
        chrome.runtime.sendMessage({ type: 'GET_TRADE_STATS' }, (response) => {
            if (response && response.stats) {
                const stats = response.stats;
                
                // Update trade count
                const tradeCountElement = document.getElementById('tradeCount');
                if (tradeCountElement) {
                    tradeCountElement.textContent = stats.todayCount || 0;
                }
                
                // Update win rate
                const winRateElement = document.getElementById('winRate');
                if (winRateElement && stats.winRate !== undefined) {
                    winRateElement.textContent = `${Math.round(stats.winRate * 100)}%`;
                }
                
                // Update cooldown timer
                const cooldownElement = document.getElementById('cooldownTimer');
                if (cooldownElement) {
                    if (stats.cooldownRemaining > 0) {
                        const minutes = Math.floor(stats.cooldownRemaining / 60000);
                        const seconds = Math.floor((stats.cooldownRemaining % 60000) / 1000);
                        cooldownElement.textContent = `${minutes}m ${seconds}s`;
                        cooldownElement.parentElement.style.display = 'block';
                    } else {
                        cooldownElement.textContent = 'Ready';
                        cooldownElement.parentElement.style.display = 'none';
                    }
                }
            }
        });
    }
    
    openTradeHistoryView() {
        // Open trade history in a new tab
        chrome.tabs.create({ url: chrome.runtime.getURL('trade-history.html') });
    }
    
    exportTradeHistory() {
        // Request trade history from background
        chrome.runtime.sendMessage({ type: 'EXPORT_TRADE_HISTORY' }, (response) => {
            if (response && response.csv) {
                // Create a download link
                const blob = new Blob([response.csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                alert('No trade history available to export.');
            }
        });
    }

    updateUI() {
        this.updateControlButtons();
        this.updateStatus('Ready');
        
        // Load today's signal count
        chrome.storage.local.get(['signalLogs'], (result) => {
            const logs = result.signalLogs || [];
            const today = new Date().toDateString();
            const todayLogs = logs.filter(log => new Date(log.timestamp).toDateString() === today);
            this.signalCount = todayLogs.length;
            document.getElementById('signalsToday').textContent = this.signalCount.toString();
        });
        
        // Update auto-trade UI
        this.updateAutoTradeUI();
        
        // Request latest trade stats
        chrome.runtime.sendMessage({ type: 'GET_TRADE_STATS' });
        
        // Update current signal if available
        this.updateCurrentSignal();
    }
    
    updateCurrentSignal() {
        chrome.runtime.sendMessage({ type: 'GET_CURRENT_SIGNAL' }, (response) => {
            if (response && response.signal) {
                this.displaySignal(response.signal);
            }
        });
    }
    
    /**
     * Switch to OTC mode
     */
    switchToOTCMode() {
        // First check if we're on a weekend
        const today = new Date().getDay();
        const isWeekend = today === 0 || today === 6; // 0 = Sunday, 6 = Saturday
        
        if (!isWeekend) {
            // Show confirmation dialog for weekday OTC mode
            if (!confirm('OTC mode is primarily designed for weekend trading. Continue anyway?')) {
                return;
            }
        }
        
        // Activate OTC mode in background
        chrome.runtime.sendMessage({
            action: 'activateOTCMode',
            data: {
                requestedBy: 'popup',
                manualActivation: true
            }
        });
        
        // Navigate to OTC popup
        window.location.href = 'popup-otc.html';
    }
}

// Initialize UI when popup loads
document.addEventListener('DOMContentLoaded', () => {
    new CandleSniperUI();
});

// Handle popup visibility
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Refresh data when popup becomes visible
        chrome.runtime.sendMessage({ type: 'POPUP_OPENED' });
    }
});