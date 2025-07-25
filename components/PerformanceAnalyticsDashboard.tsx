/**
 * Performance Analytics Dashboard for Binary Options Trading System
 * 
 * Features:
 * - Real-time win rate tracking
 * - Profit/Loss analysis with charts
 * - Detection risk indicators
 * - Model performance metrics
 * - Trading session analytics
 * - Risk management status
 * - Historical performance trends
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
    TrendingUp, 
    TrendingDown, 
    Target, 
    Shield, 
    Brain, 
    AlertTriangle,
    DollarSign,
    BarChart3,
    Activity,
    Clock
} from 'lucide-react';

interface PerformanceMetrics {
    winRate: number;
    totalTrades: number;
    totalProfit: number;
    currentBalance: number;
    dailyPnL: number;
    maxDrawdown: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    sharpeRatio: number;
    detectionRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    modelAccuracy: number;
    lastTradeTime: number;
}

interface TradeHistory {
    timestamp: number;
    pair: string;
    direction: 'UP' | 'DOWN';
    result: 'WIN' | 'LOSS';
    amount: number;
    pnl: number;
    confidence: number;
    balance: number;
}

const PerformanceAnalyticsDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
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
    });

    const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
    const [isLive, setIsLive] = useState(false);

    // Fetch performance data
    useEffect(() => {
        const fetchPerformanceData = async () => {
            try {
                const response = await fetch('/api/performance-analytics');
                const data = await response.json();
                
                if (data.success) {
                    setMetrics(data.metrics);
                    setTradeHistory(data.tradeHistory || []);
                }
            } catch (error) {
                console.error('Failed to fetch performance data:', error);
            }
        };

        fetchPerformanceData();
        
        // Set up real-time updates
        const interval = setInterval(fetchPerformanceData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Calculate derived metrics
    const derivedMetrics = useMemo(() => {
        const totalReturn = ((metrics.currentBalance - 100) / 100) * 100;
        const dailyReturnPercent = (metrics.dailyPnL / (metrics.currentBalance - metrics.dailyPnL)) * 100;
        const riskLevel = getRiskLevel(metrics);
        const tradingStatus = getTradingStatus(metrics);
        
        return {
            totalReturn,
            dailyReturnPercent,
            riskLevel,
            tradingStatus
        };
    }, [metrics]);

    // Get risk level color and description
    const getRiskLevel = (metrics: PerformanceMetrics) => {
        if (metrics.consecutiveLosses >= 3 || metrics.maxDrawdown > 0.25) return 'CRITICAL';
        if (metrics.consecutiveLosses >= 2 || metrics.maxDrawdown > 0.15) return 'HIGH';
        if (metrics.consecutiveLosses >= 1 || metrics.maxDrawdown > 0.05) return 'MEDIUM';
        return 'LOW';
    };

    // Get trading status
    const getTradingStatus = (metrics: PerformanceMetrics) => {
        const timeSinceLastTrade = Date.now() - metrics.lastTradeTime;
        if (timeSinceLastTrade < 300000) return 'ACTIVE'; // 5 minutes
        if (timeSinceLastTrade < 3600000) return 'IDLE'; // 1 hour
        return 'STOPPED';
    };

    // Risk level styling
    const getRiskBadgeColor = (risk: string) => {
        switch (risk) {
            case 'LOW': return 'bg-green-500';
            case 'MEDIUM': return 'bg-yellow-500';
            case 'HIGH': return 'bg-orange-500';
            case 'CRITICAL': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                    <span className="text-sm text-gray-600">{isLive ? 'Live' : 'Offline'}</span>
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Win Rate */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(metrics.winRate * 100).toFixed(1)}%
                        </div>
                        <Progress value={metrics.winRate * 100} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            {metrics.totalTrades} total trades
                        </p>
                    </CardContent>
                </Card>

                {/* Current Balance */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${metrics.currentBalance.toFixed(2)}
                        </div>
                        <div className={`text-sm ${derivedMetrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {derivedMetrics.totalReturn >= 0 ? '+' : ''}{derivedMetrics.totalReturn.toFixed(1)}% total return
                        </div>
                    </CardContent>
                </Card>

                {/* Daily P&L */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
                        {metrics.dailyPnL >= 0 ? 
                            <TrendingUp className="h-4 w-4 text-green-600" /> : 
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        }
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metrics.dailyPnL >= 0 ? '+' : ''}${metrics.dailyPnL.toFixed(2)}
                        </div>
                        <div className={`text-sm ${derivedMetrics.dailyReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {derivedMetrics.dailyReturnPercent >= 0 ? '+' : ''}{derivedMetrics.dailyReturnPercent.toFixed(1)}% today
                        </div>
                    </CardContent>
                </Card>

                {/* Risk Level */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <Badge className={getRiskBadgeColor(derivedMetrics.riskLevel)}>
                                {derivedMetrics.riskLevel}
                            </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                            Max Drawdown: {(metrics.maxDrawdown * 100).toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trading Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5" />
                            <span>Trading Performance</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-muted-foreground">Consecutive Wins</div>
                                <div className="text-lg font-semibold text-green-600">
                                    {metrics.consecutiveWins}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Consecutive Losses</div>
                                <div className="text-lg font-semibold text-red-600">
                                    {metrics.consecutiveLosses}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Average Win</div>
                                <div className="text-lg font-semibold">
                                    ${metrics.averageWin.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Average Loss</div>
                                <div className="text-lg font-semibold">
                                    ${metrics.averageLoss.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Profit Factor</span>
                                <span className="font-semibold">{metrics.profitFactor.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                                <span className="font-semibold">{metrics.sharpeRatio.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* System Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Activity className="h-5 w-5" />
                            <span>System Status</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-muted-foreground">Trading Status</div>
                                <Badge variant={derivedMetrics.tradingStatus === 'ACTIVE' ? 'default' : 'secondary'}>
                                    {derivedMetrics.tradingStatus}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Detection Risk</div>
                                <Badge className={getRiskBadgeColor(metrics.detectionRisk)}>
                                    {metrics.detectionRisk}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Model Accuracy</div>
                                <div className="text-lg font-semibold">
                                    {(metrics.modelAccuracy * 100).toFixed(1)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Last Trade</div>
                                <div className="text-sm">
                                    {metrics.lastTradeTime ? 
                                        new Date(metrics.lastTradeTime).toLocaleTimeString() : 
                                        'No trades yet'
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Alerts */}
                        {(metrics.consecutiveLosses >= 2 || metrics.maxDrawdown > 0.15) && (
                            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm text-yellow-800">
                                    Risk management alert: Consider reducing position size
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Trades */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Clock className="h-5 w-5" />
                        <span>Recent Trades</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {tradeHistory.slice(-10).reverse().map((trade, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <Badge variant={trade.result === 'WIN' ? 'default' : 'destructive'}>
                                        {trade.result}
                                    </Badge>
                                    <span className="font-medium">{trade.pair}</span>
                                    <span className="text-sm text-muted-foreground">{trade.direction}</span>
                                </div>
                                <div className="text-right">
                                    <div className={`font-semibold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(trade.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PerformanceAnalyticsDashboard;
