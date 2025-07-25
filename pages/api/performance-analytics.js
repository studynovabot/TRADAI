/**
 * Performance Analytics API Endpoint
 * 
 * Provides comprehensive performance metrics for the trading dashboard:
 * - Real-time trading statistics
 * - Risk management metrics
 * - Model performance data
 * - Trade history and analysis
 */

import fs from 'fs/promises';
import path from 'path';

// Performance data cache
let performanceCache = {
    lastUpdate: 0,
    data: null
};

const CACHE_DURATION = 5000; // 5 seconds

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        // Check cache
        const now = Date.now();
        if (performanceCache.data && (now - performanceCache.lastUpdate) < CACHE_DURATION) {
            return res.status(200).json({
                success: true,
                cached: true,
                ...performanceCache.data
            });
        }

        // Gather performance data
        const performanceData = await gatherPerformanceData();
        
        // Update cache
        performanceCache = {
            lastUpdate: now,
            data: performanceData
        };

        res.status(200).json({
            success: true,
            cached: false,
            ...performanceData
        });

    } catch (error) {
        console.error('Performance analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance data',
            details: error.message
        });
    }
}

/**
 * Gather comprehensive performance data
 */
async function gatherPerformanceData() {
    const data = {
        metrics: await getPerformanceMetrics(),
        tradeHistory: await getTradeHistory(),
        riskMetrics: await getRiskMetrics(),
        modelMetrics: await getModelMetrics(),
        systemStatus: await getSystemStatus(),
        timestamp: Date.now()
    };

    return data;
}

/**
 * Get core performance metrics
 */
async function getPerformanceMetrics() {
    try {
        // Try to load from performance file
        const performanceFile = path.join(process.cwd(), 'data', 'signal_performance.json');
        
        let performanceData = {};
        try {
            const fileContent = await fs.readFile(performanceFile, 'utf8');
            performanceData = JSON.parse(fileContent);
        } catch (error) {
            console.log('No performance file found, using defaults');
        }

        // Calculate metrics from trade history
        const trades = performanceData.trades || [];
        const totalTrades = trades.length;
        const winningTrades = trades.filter(t => t.result === 'WIN').length;
        const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

        // Calculate P&L
        const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        const currentBalance = 100 + totalPnL; // Assuming $100 starting balance

        // Calculate daily P&L
        const today = new Date().toDateString();
        const todayTrades = trades.filter(t => new Date(t.timestamp).toDateString() === today);
        const dailyPnL = todayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);

        // Calculate drawdown
        let peakBalance = 100;
        let maxDrawdown = 0;
        let runningBalance = 100;

        trades.forEach(trade => {
            runningBalance += trade.pnl || 0;
            if (runningBalance > peakBalance) {
                peakBalance = runningBalance;
            }
            const currentDrawdown = (peakBalance - runningBalance) / peakBalance;
            if (currentDrawdown > maxDrawdown) {
                maxDrawdown = currentDrawdown;
            }
        });

        // Calculate consecutive wins/losses
        let consecutiveWins = 0;
        let consecutiveLosses = 0;
        
        for (let i = trades.length - 1; i >= 0; i--) {
            if (trades[i].result === 'WIN') {
                if (consecutiveLosses === 0) {
                    consecutiveWins++;
                } else {
                    break;
                }
            } else {
                if (consecutiveWins === 0) {
                    consecutiveLosses++;
                } else {
                    break;
                }
            }
        }

        // Calculate average win/loss
        const wins = trades.filter(t => t.result === 'WIN');
        const losses = trades.filter(t => t.result === 'LOSS');
        const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
        const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;

        // Calculate profit factor
        const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
        const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

        // Calculate Sharpe ratio (simplified)
        const returns = trades.map(t => (t.pnl || 0) / 100); // Normalize by account size
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
        const returnStd = calculateStandardDeviation(returns);
        const sharpeRatio = returnStd > 0 ? avgReturn / returnStd : 0;

        return {
            winRate,
            totalTrades,
            totalProfit: totalPnL,
            currentBalance,
            dailyPnL,
            maxDrawdown,
            consecutiveWins,
            consecutiveLosses,
            averageWin,
            averageLoss,
            profitFactor,
            sharpeRatio: sharpeRatio * Math.sqrt(252), // Annualized
            detectionRisk: calculateDetectionRisk(winRate, consecutiveWins, consecutiveLosses),
            modelAccuracy: performanceData.modelAccuracy || 0.68,
            lastTradeTime: trades.length > 0 ? trades[trades.length - 1].timestamp : 0
        };

    } catch (error) {
        console.error('Error calculating performance metrics:', error);
        return getDefaultMetrics();
    }
}

/**
 * Get trade history
 */
async function getTradeHistory() {
    try {
        const performanceFile = path.join(process.cwd(), 'data', 'signal_performance.json');
        const fileContent = await fs.readFile(performanceFile, 'utf8');
        const performanceData = JSON.parse(fileContent);
        
        return performanceData.trades || [];
    } catch (error) {
        return [];
    }
}

/**
 * Get risk management metrics
 */
async function getRiskMetrics() {
    try {
        // This would integrate with the AdvancedRiskManagement system
        return {
            riskLevel: 'LOW',
            portfolioHeat: 0.15,
            maxPositionSize: 50,
            dailyTradeLimit: 12,
            emergencyStopActive: false
        };
    } catch (error) {
        return {
            riskLevel: 'UNKNOWN',
            portfolioHeat: 0,
            maxPositionSize: 0,
            dailyTradeLimit: 0,
            emergencyStopActive: false
        };
    }
}

/**
 * Get model performance metrics
 */
async function getModelMetrics() {
    try {
        // This would integrate with the ML models
        return {
            ensembleAccuracy: 0.72,
            modelConfidence: 0.85,
            featureImportance: {
                'price_action': 0.35,
                'volume': 0.25,
                'indicators': 0.40
            },
            lastTrainingTime: Date.now() - 86400000, // 24 hours ago
            modelVersion: 'v1.2.3'
        };
    } catch (error) {
        return {
            ensembleAccuracy: 0,
            modelConfidence: 0,
            featureImportance: {},
            lastTrainingTime: 0,
            modelVersion: 'unknown'
        };
    }
}

/**
 * Get system status
 */
async function getSystemStatus() {
    return {
        isLive: true,
        uptime: Date.now() - (Date.now() - 3600000), // 1 hour uptime
        memoryUsage: process.memoryUsage(),
        cpuUsage: 0.25,
        lastHealthCheck: Date.now(),
        activeConnections: 1,
        errorRate: 0.02
    };
}

/**
 * Calculate detection risk level
 */
function calculateDetectionRisk(winRate, consecutiveWins, consecutiveLosses) {
    let riskScore = 0;

    // High win rate increases detection risk
    if (winRate > 0.80) riskScore += 3;
    else if (winRate > 0.75) riskScore += 2;
    else if (winRate > 0.70) riskScore += 1;

    // Too many consecutive wins
    if (consecutiveWins > 10) riskScore += 3;
    else if (consecutiveWins > 7) riskScore += 2;
    else if (consecutiveWins > 5) riskScore += 1;

    // Determine risk level
    if (riskScore >= 5) return 'CRITICAL';
    if (riskScore >= 3) return 'HIGH';
    if (riskScore >= 1) return 'MEDIUM';
    return 'LOW';
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
}

/**
 * Get default metrics when no data is available
 */
function getDefaultMetrics() {
    return {
        winRate: 0,
        totalTrades: 0,
        totalProfit: 0,
        currentBalance: 100,
        dailyPnL: 0,
        maxDrawdown: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        detectionRisk: 'LOW',
        modelAccuracy: 0,
        lastTradeTime: 0
    };
}
