/**
 * TRADAI - Trade History Viewer
 * Displays and analyzes trade history with filtering and statistics
 */

class TradeHistoryViewer {
    constructor() {
        this.tradeHistory = [];
        this.filteredHistory = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filters = {
            date: 'today',
            result: 'all',
            direction: 'all',
            timeframe: 'all'
        };
        
        this.init();
    }
    
    async init() {
        // Load trade history
        await this.loadTradeHistory();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Apply initial filters and render
        this.applyFilters();
        this.renderTradeTable();
        this.calculateStats();
    }
    
    async loadTradeHistory() {
        try {
            // Request trade history from background script
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ type: 'GET_TRADE_HISTORY' }, resolve);
            });
            
            if (response && response.history) {
                this.tradeHistory = response.history;
                console.log(`Loaded ${this.tradeHistory.length} trade records`);
            } else {
                this.tradeHistory = [];
                console.log('No trade history found');
            }
            
            // Show/hide empty state
            document.getElementById('emptyState').style.display = 
                this.tradeHistory.length === 0 ? 'block' : 'none';
            
            document.getElementById('tradeTableContainer').style.display = 
                this.tradeHistory.length === 0 ? 'none' : 'block';
                
        } catch (error) {
            console.error('Error loading trade history:', error);
            this.tradeHistory = [];
        }
    }
    
    setupEventListeners() {
        // Filter change events
        document.getElementById('dateFilter').addEventListener('change', () => {
            this.filters.date = document.getElementById('dateFilter').value;
            this.currentPage = 1;
            this.applyFilters();
            this.renderTradeTable();
            this.calculateStats();
        });
        
        document.getElementById('resultFilter').addEventListener('change', () => {
            this.filters.result = document.getElementById('resultFilter').value;
            this.currentPage = 1;
            this.applyFilters();
            this.renderTradeTable();
            this.calculateStats();
        });
        
        document.getElementById('directionFilter').addEventListener('change', () => {
            this.filters.direction = document.getElementById('directionFilter').value;
            this.currentPage = 1;
            this.applyFilters();
            this.renderTradeTable();
            this.calculateStats();
        });
        
        document.getElementById('timeframeFilter').addEventListener('change', () => {
            this.filters.timeframe = document.getElementById('timeframeFilter').value;
            this.currentPage = 1;
            this.applyFilters();
            this.renderTradeTable();
            this.calculateStats();
        });
        
        // Button events
        document.getElementById('refreshBtn').addEventListener('click', async () => {
            await this.loadTradeHistory();
            this.applyFilters();
            this.renderTradeTable();
            this.calculateStats();
        });
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCsv();
        });
        
        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all trade history? This cannot be undone.')) {
                this.clearTradeHistory();
            }
        });
    }
    
    applyFilters() {
        // Start with all trades
        let filtered = [...this.tradeHistory];
        
        // Apply date filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        switch (this.filters.date) {
            case 'today':
                filtered = filtered.filter(trade => new Date(trade.timestamp) >= today);
                break;
            case 'yesterday':
                filtered = filtered.filter(trade => 
                    new Date(trade.timestamp) >= yesterday && new Date(trade.timestamp) < today);
                break;
            case 'week':
                filtered = filtered.filter(trade => new Date(trade.timestamp) >= weekStart);
                break;
            case 'month':
                filtered = filtered.filter(trade => new Date(trade.timestamp) >= monthStart);
                break;
            // 'all' - no filtering needed
        }
        
        // Apply result filter
        if (this.filters.result !== 'all') {
            filtered = filtered.filter(trade => trade.result === this.filters.result);
        }
        
        // Apply direction filter
        if (this.filters.direction !== 'all') {
            filtered = filtered.filter(trade => 
                trade.direction.toUpperCase() === this.filters.direction ||
                (this.filters.direction === 'UP' && ['CALL', 'BUY'].includes(trade.direction.toUpperCase())) ||
                (this.filters.direction === 'DOWN' && ['PUT', 'SELL'].includes(trade.direction.toUpperCase()))
            );
        }
        
        // Apply timeframe filter
        if (this.filters.timeframe !== 'all') {
            filtered = filtered.filter(trade => trade.timeframe === this.filters.timeframe);
        }
        
        // Sort by timestamp (newest first)
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        
        this.filteredHistory = filtered;
    }
    
    renderTradeTable() {
        const tableBody = document.getElementById('tradeTableBody');
        tableBody.innerHTML = '';
        
        // Calculate pagination
        const totalPages = Math.ceil(this.filteredHistory.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredHistory.length);
        
        // Get current page of trades
        const currentPageTrades = this.filteredHistory.slice(startIndex, endIndex);
        
        // Render trades
        if (currentPageTrades.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="8" style="text-align: center;">No trades match the selected filters</td>`;
            tableBody.appendChild(emptyRow);
        } else {
            currentPageTrades.forEach(trade => {
                const row = document.createElement('tr');
                
                // Format date
                const date = new Date(trade.timestamp);
                const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                
                // Format confidence class
                let confidenceClass = '';
                if (trade.confidence >= 85) confidenceClass = 'high-confidence';
                else if (trade.confidence >= 70) confidenceClass = 'medium-confidence';
                else confidenceClass = 'low-confidence';
                
                // Format result class
                let resultClass = '';
                if (trade.result === 'win') resultClass = 'result-win';
                else if (trade.result === 'loss') resultClass = 'result-loss';
                else resultClass = 'result-pending';
                
                // Format profit/loss
                let profitLoss = '-';
                if (trade.result === 'win' && trade.profit) {
                    profitLoss = `+$${trade.profit.toFixed(2)}`;
                } else if (trade.result === 'loss' && trade.amount) {
                    profitLoss = `-$${trade.amount.toFixed(2)}`;
                }
                
                // Format reason
                let reason = trade.reason || '-';
                if (Array.isArray(reason)) {
                    reason = reason.join(', ');
                }
                if (reason.length > 50) {
                    reason = reason.substring(0, 47) + '...';
                }
                
                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${trade.direction.toUpperCase()}</td>
                    <td>${trade.timeframe || '-'}</td>
                    <td><span class="confidence ${confidenceClass}">${trade.confidence}%</span></td>
                    <td>$${trade.amount ? trade.amount.toFixed(2) : '-'}</td>
                    <td class="${resultClass}">${trade.result ? trade.result.toUpperCase() : 'PENDING'}</td>
                    <td>${profitLoss}</td>
                    <td title="${reason}">${reason}</td>
                `;
                
                tableBody.appendChild(row);
            });
        }
        
        // Render pagination
        this.renderPagination(totalPages);
    }
    
    renderPagination(totalPages) {
        const paginationContainer = document.getElementById('pagination');
        paginationContainer.innerHTML = '';
        
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.textContent = '←';
        prevButton.disabled = this.currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTradeTable();
            }
        });
        paginationContainer.appendChild(prevButton);
        
        // Page buttons
        const maxButtons = 5;
        const startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        const endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.toggle('active', i === this.currentPage);
            pageButton.addEventListener('click', () => {
                this.currentPage = i;
                this.renderTradeTable();
            });
            paginationContainer.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.textContent = '→';
        nextButton.disabled = this.currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTradeTable();
            }
        });
        paginationContainer.appendChild(nextButton);
    }
    
    calculateStats() {
        // Calculate statistics based on filtered trades
        const totalTrades = this.filteredHistory.length;
        const completedTrades = this.filteredHistory.filter(trade => trade.result === 'win' || trade.result === 'loss');
        const winTrades = this.filteredHistory.filter(trade => trade.result === 'win');
        const lossTrades = this.filteredHistory.filter(trade => trade.result === 'loss');
        
        // Win/loss rates
        const winRate = completedTrades.length > 0 ? (winTrades.length / completedTrades.length) * 100 : 0;
        const lossRate = completedTrades.length > 0 ? (lossTrades.length / completedTrades.length) * 100 : 0;
        
        // Net profit
        let netProfit = 0;
        completedTrades.forEach(trade => {
            if (trade.result === 'win' && trade.profit) {
                netProfit += trade.profit;
            } else if (trade.result === 'loss' && trade.amount) {
                netProfit -= trade.amount;
            }
        });
        
        // Average confidence
        const totalConfidence = this.filteredHistory.reduce((sum, trade) => sum + (trade.confidence || 0), 0);
        const avgConfidence = totalTrades > 0 ? totalConfidence / totalTrades : 0;
        
        // Best timeframe
        const timeframeStats = {};
        completedTrades.forEach(trade => {
            if (!trade.timeframe) return;
            
            if (!timeframeStats[trade.timeframe]) {
                timeframeStats[trade.timeframe] = { total: 0, wins: 0 };
            }
            
            timeframeStats[trade.timeframe].total++;
            if (trade.result === 'win') {
                timeframeStats[trade.timeframe].wins++;
            }
        });
        
        let bestTimeframe = '-';
        let bestWinRate = 0;
        
        for (const [timeframe, stats] of Object.entries(timeframeStats)) {
            if (stats.total >= 3) { // Minimum 3 trades to consider
                const tfWinRate = (stats.wins / stats.total) * 100;
                if (tfWinRate > bestWinRate) {
                    bestWinRate = tfWinRate;
                    bestTimeframe = `${timeframe} (${Math.round(tfWinRate)}%)`;
                }
            }
        }
        
        // Update UI
        document.getElementById('totalTrades').textContent = totalTrades;
        document.getElementById('winRate').textContent = `${Math.round(winRate)}%`;
        document.getElementById('lossRate').textContent = `${Math.round(lossRate)}%`;
        document.getElementById('netProfit').textContent = `$${netProfit.toFixed(2)}`;
        document.getElementById('avgConfidence').textContent = `${Math.round(avgConfidence)}%`;
        document.getElementById('bestTimeframe').textContent = bestTimeframe;
        
        // Color coding for profit/loss
        const profitElement = document.getElementById('netProfit');
        if (netProfit > 0) {
            profitElement.style.color = 'var(--success-color)';
        } else if (netProfit < 0) {
            profitElement.style.color = 'var(--danger-color)';
        } else {
            profitElement.style.color = '';
        }
    }
    
    exportToCsv() {
        if (this.filteredHistory.length === 0) {
            alert('No trade data to export.');
            return;
        }
        
        // Create CSV content
        const headers = ['Date', 'Time', 'Direction', 'Timeframe', 'Confidence', 'Amount', 'Result', 'Profit/Loss', 'Reason'];
        
        let csvContent = headers.join(',') + '\n';
        
        this.filteredHistory.forEach(trade => {
            const date = new Date(trade.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            
            let profitLoss = '';
            if (trade.result === 'win' && trade.profit) {
                profitLoss = trade.profit.toFixed(2);
            } else if (trade.result === 'loss' && trade.amount) {
                profitLoss = (-trade.amount).toFixed(2);
            }
            
            let reason = trade.reason || '';
            if (Array.isArray(reason)) {
                reason = reason.join('; ');
            }
            // Escape quotes in reason
            reason = reason.replace(/"/g, '""');
            
            const row = [
                dateStr,
                timeStr,
                trade.direction.toUpperCase(),
                trade.timeframe || '',
                trade.confidence || '',
                trade.amount ? trade.amount.toFixed(2) : '',
                trade.result ? trade.result.toUpperCase() : 'PENDING',
                profitLoss,
                `"${reason}"`
            ];
            
            csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `tradai-history-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    async clearTradeHistory() {
        try {
            await new Promise(resolve => {
                chrome.runtime.sendMessage({ type: 'CLEAR_TRADE_HISTORY' }, resolve);
            });
            
            this.tradeHistory = [];
            this.filteredHistory = [];
            this.renderTradeTable();
            this.calculateStats();
            
            // Show empty state
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('tradeTableContainer').style.display = 'none';
            
            alert('Trade history has been cleared.');
            
        } catch (error) {
            console.error('Error clearing trade history:', error);
            alert('Error clearing trade history. Please try again.');
        }
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TradeHistoryViewer();
});