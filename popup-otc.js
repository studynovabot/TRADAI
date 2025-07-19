/**
 * AI Candle Sniper - OTC Mode Popup Script
 * 
 * Comprehensive OTC mode interface with:
 * - Real-time status monitoring
 * - Signal generation and display
 * - Trade execution
 * - Performance tracking
 * - System health monitoring
 */

class OTCPopupController {
    constructor() {
        this.isOTCActive = false;
        this.currentSignal = null;
        this.selectedAsset = '';
        this.selectedTimeframe = '5M';
        this.tradeHistory = [];
        this.systemStatus = {
            extractor: 'unknown',
            validator: 'unknown',
            errorHandler: 'unknown',
            background: 'unknown'
        };
        
        this.updateInterval = null;
        this.statusCheckInterval = null;
        
        this.init();
    }
    
    /**
     * Initialize the popup controller
     */
    init() {
        console.log('[OTC Popup] Initializing...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check if it's weekend
        this.checkWeekendMode();
        
        // Load initial data
        this.loadInitialData();
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        console.log('[OTC Popup] Initialized successfully');
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Control buttons
        document.getElementById('activate-otc').addEventListener('click', () => {
            this.activateOTCMode();
        });
        
        document.getElementById('deactivate-otc').addEventListener('click', () => {
            this.deactivateOTCMode();
        });
        
        // Asset and timeframe selection
        document.getElementById('asset-list').addEventListener('change', (e) => {
            this.selectedAsset = e.target.value;
            this.updateActionButtons();
        });
        
        document.getElementById('timeframe-list').addEventListener('change', (e) => {
            this.selectedTimeframe = e.target.value;
            this.updateActionButtons();
        });
        
        // Action buttons
        document.getElementById('generate-signal').addEventListener('click', () => {
            this.generateSignal();
        });
        
        document.getElementById('place-trade').addEventListener('click', () => {
            this.placeTrade();
        });
        
        // Footer buttons
        document.getElementById('toggle-debug').addEventListener('click', () => {
            this.toggleDebugPanel();
        });
        
        document.getElementById('show-help').addEventListener('click', () => {
            this.showHelp();
        });
        
        document.getElementById('show-settings').addEventListener('click', () => {
            this.showSettings();
        });
        
        // Debug buttons
        document.getElementById('run-tests').addEventListener('click', () => {
            this.runTests();
        });
        
        document.getElementById('clear-logs').addEventListener('click', () => {
            this.clearLogs();
        });
        
        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });
    }
    
    /**
     * Check if it's weekend and show notice
     */
    checkWeekendMode() {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        
        if (day === 0 || day === 6) {
            document.getElementById('weekend-notice').classList.remove('hidden');
        } else {
            document.getElementById('weekend-notice').classList.add('hidden');
        }
    }
    
    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            this.showLoading('Loading OTC data...');
            
            // Get OTC status
            await this.updateOTCStatus();
            
            // Load available pairs
            await this.loadAvailablePairs();
            
            // Load trade history
            await this.loadTradeHistory();
            
            // Update performance metrics
            this.updatePerformanceMetrics();
            
            // Check system status
            await this.checkSystemStatus();
            
        } catch (error) {
            console.error('[OTC Popup] Error loading initial data:', error);
            this.showNotification('Error loading data: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Start periodic updates
     */
    startPeriodicUpdates() {
        // Update status every 5 seconds
        this.updateInterval = setInterval(() => {
            this.updateOTCStatus();
        }, 5000);
        
        // Check system status every 30 seconds
        this.statusCheckInterval = setInterval(() => {
            this.checkSystemStatus();
        }, 30000);
    }
    
    /**
     * Stop periodic updates
     */
    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }
    
    /**
     * Activate OTC mode
     */
    async activateOTCMode() {
        try {
            this.showLoading('Activating OTC mode...');
            
            const response = await this.sendMessage({
                action: 'activateOTCMode',
                data: {
                    timestamp: Date.now()
                }
            });
            
            if (response && response.success) {
                this.isOTCActive = true;
                this.updateUI();
                this.showNotification('OTC mode activated successfully', 'success');
                
                // Enable controls
                document.getElementById('asset-list').disabled = false;
                document.getElementById('timeframe-list').disabled = false;
                this.updateActionButtons();
            } else {
                throw new Error(response?.error || 'Failed to activate OTC mode');
            }
        } catch (error) {
            console.error('[OTC Popup] Error activating OTC mode:', error);
            this.showNotification('Failed to activate OTC mode: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Send message to background script
     */
    async sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, resolve);
        });
    }
    
    /**
     * Show loading overlay
     */
    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.querySelector('.loading-text');
        
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'none';
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    /**
     * Update UI based on current state
     */
    updateUI() {
        const activateBtn = document.getElementById('activate-otc');
        const deactivateBtn = document.getElementById('deactivate-otc');
        
        if (this.isOTCActive) {
            activateBtn.disabled = true;
            deactivateBtn.disabled = false;
        } else {
            activateBtn.disabled = false;
            deactivateBtn.disabled = true;
        }
        
        this.updateActionButtons();
    }
    
    /**
     * Update action buttons state
     */
    updateActionButtons() {
        const generateBtn = document.getElementById('generate-signal');
        const placeBtn = document.getElementById('place-trade');
        
        const canGenerate = this.isOTCActive && this.selectedAsset && this.selectedTimeframe;
        const canTrade = canGenerate && this.currentSignal;
        
        generateBtn.disabled = !canGenerate;
        placeBtn.disabled = !canTrade;
    }
    
    // Placeholder methods for remaining functionality
    async deactivateOTCMode() { /* Implementation */ }
    async updateOTCStatus() { /* Implementation */ }
    async loadAvailablePairs() { /* Implementation */ }
    async loadTradeHistory() { /* Implementation */ }
    updatePerformanceMetrics() { /* Implementation */ }
    async checkSystemStatus() { /* Implementation */ }
    async generateSignal() { /* Implementation */ }
    async placeTrade() { /* Implementation */ }
    toggleDebugPanel() { /* Implementation */ }
    showHelp() { /* Implementation */ }
    showSettings() { /* Implementation */ }
    async runTests() { /* Implementation */ }
    clearLogs() { /* Implementation */ }
    exportData() { /* Implementation */ }
    
    /**
     * Cleanup when popup is closed
     */
    cleanup() {
        this.stopPeriodicUpdates();
    }
}

// Initialize popup controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.otcPopupController = new OTCPopupController();
});

// Cleanup when popup is closed
window.addEventListener('beforeunload', () => {
    if (window.otcPopupController) {
        window.otcPopupController.cleanup();
    }
});
