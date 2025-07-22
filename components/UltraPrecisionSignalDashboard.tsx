/**
 * Ultra-Precision Signal Dashboard
 * 
 * Real-time dashboard for ultra-precision 2-5 minute trading signals
 * Features live signal generation, confidence scoring, and risk management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Shield, 
  Clock, 
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface UltraPrecisionSignal {
  symbol: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  confidenceLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  timeframe: string;
  reasons: string[];
  timestamp: number;
  expiryTime: number;
  indicators: {
    rsi: number;
    macd: any;
    ema: { ema9: number; ema20: number };
    currentPrice: number;
  };
  patterns: any;
  confluence: {
    agreement: number;
    bullishSignals: number;
    bearishSignals: number;
  };
  riskManagement?: {
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
    riskRewardRatio: number;
    atr: number;
    positionSize: string;
  };
}

interface SignalHistory {
  signal: UltraPrecisionSignal;
  result?: 'WIN' | 'LOSS' | 'PENDING';
  pnl?: number;
}

const UltraPrecisionSignalDashboard: React.FC = () => {
  const [currentSignals, setCurrentSignals] = useState<UltraPrecisionSignal[]>([]);
  const [signalHistory, setSignalHistory] = useState<SignalHistory[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['EURUSD', 'GBPUSD', 'USDJPY']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [stats, setStats] = useState({
    totalSignals: 0,
    winRate: 0,
    avgConfidence: 0,
    highConfidenceSignals: 0
  });

  // Available trading symbols
  const availableSymbols = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    'EURJPY', 'GBPJPY', 'EURGBP', 'AUDJPY', 'EURAUD', 'EURCHF'
  ];

  // Generate signals for selected symbols
  const generateSignals = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    const newSignals: UltraPrecisionSignal[] = [];

    try {
      for (const symbol of selectedSymbols) {
        try {
          const response = await fetch('/api/ultra-precision-signal', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              symbol,
              timeframe: '2M',
              includeRiskManagement: true,
              confidenceThreshold: 50
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.signal) {
              newSignals.push(data.signal);
            }
          }
        } catch (error) {
          console.error(`Error generating signal for ${symbol}:`, error);
        }
      }

      setCurrentSignals(newSignals);
      updateStats(newSignals);
      
    } catch (error) {
      console.error('Error generating signals:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedSymbols, isGenerating]);

  // Update statistics
  const updateStats = (signals: UltraPrecisionSignal[]) => {
    const totalSignals = signalHistory.length + signals.length;
    const completedSignals = signalHistory.filter(h => h.result !== 'PENDING');
    const winRate = completedSignals.length > 0 
      ? (completedSignals.filter(h => h.result === 'WIN').length / completedSignals.length) * 100 
      : 0;
    
    const avgConfidence = signals.length > 0 
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length 
      : 0;
    
    const highConfidenceSignals = signals.filter(s => s.confidence >= 75).length;

    setStats({
      totalSignals,
      winRate,
      avgConfidence,
      highConfidenceSignals
    });
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(generateSignals, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, generateSignals]);

  // Initial load
  useEffect(() => {
    generateSignals();
  }, []);

  // Get signal direction icon
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'BUY':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'SELL':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-500';
    if (confidence >= 75) return 'bg-blue-500';
    if (confidence >= 65) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  // Get confidence level badge
  const getConfidenceBadge = (level: string) => {
    const colors = {
      'VERY_HIGH': 'bg-green-100 text-green-800',
      'HIGH': 'bg-blue-100 text-blue-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'LOW': 'bg-gray-100 text-gray-800'
    };
    return colors[level as keyof typeof colors] || colors.LOW;
  };

  // Format time remaining
  const getTimeRemaining = (expiryTime: number) => {
    const remaining = Math.max(0, expiryTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ultra-Precision Signals</h1>
          <p className="text-gray-600">2-5 minute high-confidence trading signals</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            onClick={generateSignals}
            disabled={isGenerating}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : 'Refresh Signals'}</span>
          </Button>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-700">
              Auto-refresh ({refreshInterval}s)
            </label>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Signals</p>
                <p className="text-2xl font-bold">{stats.totalSignals}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold">{stats.avgConfidence.toFixed(0)}%</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Confidence</p>
                <p className="text-2xl font-bold">{stats.highConfidenceSignals}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Symbol Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Symbol Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableSymbols.map((symbol) => (
              <Badge
                key={symbol}
                variant={selectedSymbols.includes(symbol) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  if (selectedSymbols.includes(symbol)) {
                    setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
                  } else {
                    setSelectedSymbols([...selectedSymbols, symbol]);
                  }
                }}
              >
                {symbol}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {currentSignals.map((signal, index) => (
          <Card key={`${signal.symbol}-${signal.timestamp}`} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  {getDirectionIcon(signal.direction)}
                  <CardTitle className="text-lg">{signal.symbol}</CardTitle>
                  <Badge className={getConfidenceBadge(signal.confidenceLevel)}>
                    {signal.confidenceLevel}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {getTimeRemaining(signal.expiryTime)}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Direction and Confidence */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-bold ${
                    signal.direction === 'BUY' ? 'text-green-600' : 
                    signal.direction === 'SELL' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {signal.direction}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{signal.confidence}%</div>
                  <Progress 
                    value={signal.confidence} 
                    className="w-20 h-2"
                  />
                </div>
              </div>

              {/* Current Price and Indicators */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Price:</span>
                    <span className="font-mono ml-1">{signal.indicators.currentPrice.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">RSI:</span>
                    <span className="font-mono ml-1">{signal.indicators.rsi.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">EMA9:</span>
                    <span className="font-mono ml-1">{signal.indicators.ema.ema9.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">EMA20:</span>
                    <span className="font-mono ml-1">{signal.indicators.ema.ema20.toFixed(5)}</span>
                  </div>
                </div>
              </div>

              {/* Confluence */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Multi-TF Agreement:</span>
                <div className="flex items-center space-x-2">
                  <Progress value={signal.confluence.agreement} className="w-16 h-2" />
                  <span className="text-sm font-medium">{signal.confluence.agreement.toFixed(0)}%</span>
                </div>
              </div>

              {/* Risk Management */}
              {signal.riskManagement && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Risk Management</span>
                    <Badge variant="outline" className="text-xs">
                      {signal.riskManagement.positionSize}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-blue-600">Entry:</span>
                      <span className="font-mono ml-1">{signal.riskManagement.entryPrice.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">R:R:</span>
                      <span className="font-mono ml-1">{signal.riskManagement.riskRewardRatio}:1</span>
                    </div>
                    {signal.riskManagement.stopLoss && (
                      <div>
                        <span className="text-red-600">SL:</span>
                        <span className="font-mono ml-1">{signal.riskManagement.stopLoss.toFixed(5)}</span>
                      </div>
                    )}
                    {signal.riskManagement.takeProfit && (
                      <div>
                        <span className="text-green-600">TP:</span>
                        <span className="font-mono ml-1">{signal.riskManagement.takeProfit.toFixed(5)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top Reasons */}
              <div>
                <span className="text-sm font-medium text-gray-700">Key Reasons:</span>
                <ul className="mt-1 space-y-1">
                  {signal.reasons.slice(0, 3).map((reason, idx) => (
                    <li key={idx} className="text-xs text-gray-600 flex items-start">
                      <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500 border-t pt-2">
                Generated: {new Date(signal.timestamp).toLocaleTimeString()}
              </div>
            </CardContent>

            {/* Confidence indicator bar */}
            <div 
              className={`absolute bottom-0 left-0 h-1 ${getConfidenceColor(signal.confidence)}`}
              style={{ width: `${signal.confidence}%` }}
            />
          </Card>
        ))}
      </div>

      {/* No Signals State */}
      {currentSignals.length === 0 && !isGenerating && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Signals Available</h3>
            <p className="text-gray-600 mb-4">
              No high-confidence signals found for the selected symbols.
            </p>
            <Button onClick={generateSignals} disabled={isGenerating}>
              Generate New Signals
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isGenerating && currentSignals.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Signals</h3>
            <p className="text-gray-600">
              Analyzing market data and generating ultra-precision signals...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UltraPrecisionSignalDashboard;