import React, { useState, useEffect } from 'react';
import { SignalData } from './SignalGeneratorPanel';
import { BarChart, PieChart, TrendingUp, Award, Clock } from 'lucide-react';

interface TradeLog {
  id: string;
  symbol: string;
  timeframe: string;
  trade_duration: string;
  signal: 'BUY' | 'SELL' | 'NO TRADE';
  result: 'win' | 'loss' | 'expired' | 'pending';
  confidence: number;
  reason: string;
  timestamp: number;
  profit_loss?: number;
  entry_price?: number;
  exit_price?: number;
}

interface PerformanceStats {
  totalSignals: number;
  winRate: string;
  averageProfit: string;
  confidenceAccuracy: {
    high: string;
    medium: string;
    low: string;
  };
  bySymbol: Array<{
    symbol: string;
    total: number;
    winRate: string;
  }>;
  byTimeframe: Array<{
    timeframe: string;
    total: number;
    winRate: string;
  }>;
}

export function TradeLogPanel() {
  const [currentSignal, setCurrentSignal] = useState<SignalData | null>(null);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'stats'

  // Listen for signal updates from the generator
  useEffect(() => {
    // This would typically be updated via context or props
    // For now, we'll check if there's a signal in localStorage
    const checkForSignal = () => {
      const savedSignal = localStorage.getItem('currentSignal');
      if (savedSignal) {
        setCurrentSignal(JSON.parse(savedSignal));
      }
    };

    checkForSignal();
    const interval = setInterval(checkForSignal, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load trade logs and performance stats
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, we would fetch from the API
        // For now, we'll use mock data
        
        // Mock recent signals
        const mockTradeLogs: TradeLog[] = Array.from({ length: 10 }, (_, i) => ({
          id: `signal_${Date.now() - i * 3600000}_${Math.floor(Math.random() * 1000)}`,
          symbol: ['EUR/USD', 'GBP/USD', 'BTC/USD', 'ETH/USD'][Math.floor(Math.random() * 4)],
          timeframe: '5m',
          trade_duration: ['1M', '3M', '5M', '15M'][Math.floor(Math.random() * 4)],
          signal: Math.random() > 0.5 ? 'BUY' : 'SELL',
          result: ['win', 'loss', 'win', 'win', 'loss', 'pending'][Math.floor(Math.random() * 6)],
          confidence: 70 + Math.floor(Math.random() * 25),
          reason: 'Mock trade log entry',
          timestamp: Date.now() - i * 3600000,
          profit_loss: Math.random() > 0.5 ? Math.random() * 5 : -Math.random() * 5,
          entry_price: 1.0 + Math.random() * 0.1,
          exit_price: 1.0 + Math.random() * 0.1
        }));
        
        setTradeLogs(mockTradeLogs);
        
        // Mock performance stats
        const mockStats: PerformanceStats = {
          totalSignals: 87,
          winRate: '68.5',
          averageProfit: '2.3',
          confidenceAccuracy: {
            high: '82.4',
            medium: '65.7',
            low: '48.2'
          },
          bySymbol: [
            { symbol: 'EUR/USD', total: 32, winRate: '72.5' },
            { symbol: 'GBP/USD', total: 28, winRate: '64.3' },
            { symbol: 'BTC/USD', total: 15, winRate: '73.3' },
            { symbol: 'ETH/USD', total: 12, winRate: '58.3' }
          ],
          byTimeframe: [
            { timeframe: '1M', total: 18, winRate: '61.1' },
            { timeframe: '3M', total: 25, winRate: '72.0' },
            { timeframe: '5M', total: 22, winRate: '68.2' },
            { timeframe: '15M', total: 22, winRate: '63.6' }
          ]
        };
        
        setPerformanceStats(mockStats);
        
        /* 
        // Real API implementation would be:
        const logsResponse = await fetch('/api/get-recent-signals');
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          setTradeLogs(logsData);
        }
        
        const statsResponse = await fetch('/api/get-performance-stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setPerformanceStats(statsData);
        }
        */
      } catch (error) {
        console.error('Error fetching trade data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const logTrade = async (result: 'win' | 'loss' | 'expired') => {
    if (!currentSignal) return;

    setIsLogging(true);

    try {
      // Calculate profit/loss (mock for now)
      const profitLoss = result === 'win' ? 
        (Math.random() * 5) : 
        (result === 'loss' ? -Math.random() * 5 : 0);
      
      // Calculate exit price (mock for now)
      const entryPrice = currentSignal.entry_price || 1.0;
      const exitPrice = result === 'win' ? 
        (currentSignal.signal === 'BUY' ? entryPrice * 1.01 : entryPrice * 0.99) : 
        (currentSignal.signal === 'BUY' ? entryPrice * 0.99 : entryPrice * 1.01);
      
      // In a real implementation, we would call the API
      /*
      const response = await fetch('/api/update-signal-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signalId: currentSignal.id,
          result: result,
          profitLoss: profitLoss,
          exitPrice: exitPrice
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update signal result');
      }
      */
      
      // Add to local logs (mock implementation)
      const newLog: TradeLog = {
        id: currentSignal.id || `signal_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        symbol: currentSignal.symbol,
        timeframe: currentSignal.timeframe,
        trade_duration: currentSignal.trade_duration,
        signal: currentSignal.signal,
        result: result,
        confidence: currentSignal.confidence,
        reason: currentSignal.reason,
        timestamp: Date.now(),
        profit_loss: profitLoss,
        entry_price: entryPrice,
        exit_price: exitPrice
      };

      const updatedLogs = [newLog, ...tradeLogs].slice(0, 50); // Keep only last 50
      setTradeLogs(updatedLogs);
      
      // Update performance stats (mock implementation)
      if (performanceStats) {
        const newStats = { ...performanceStats };
        newStats.totalSignals += 1;
        
        // Update win rate
        const wins = tradeLogs.filter(log => log.result === 'win').length + (result === 'win' ? 1 : 0);
        const total = tradeLogs.filter(log => log.result !== 'pending').length + 1;
        newStats.winRate = ((wins / total) * 100).toFixed(1);
        
        setPerformanceStats(newStats);
      }
      
      // Clear current signal
      setCurrentSignal(null);
      localStorage.removeItem('currentSignal');
    } catch (error) {
      console.error('Error logging trade:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400';
      case 'loss': return 'text-red-400';
      case 'expired': return 'text-yellow-400';
      case 'pending': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getResultBg = (result: string) => {
    switch (result) {
      case 'win': return 'bg-green-500/20 border-green-500';
      case 'loss': return 'bg-red-500/20 border-red-500';
      case 'expired': return 'bg-yellow-500/20 border-yellow-500';
      case 'pending': return 'bg-blue-500/20 border-blue-500';
      default: return 'bg-gray-500/20 border-gray-500';
    }
  };

  const getResultLabel = (result: string) => {
    switch (result) {
      case 'win': return 'WIN';
      case 'loss': return 'LOSS';
      case 'expired': return 'EXPIRED';
      case 'pending': return 'PENDING';
      default: return result.toUpperCase();
    }
  };

  // const winRate = tradeLogs.length > 0 
  //   ? (tradeLogs.filter(log => log.result === 'win').length / tradeLogs.filter(log => log.result !== 'pending' && log.result !== 'expired').length * 100) || 0
  //   : 0;

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center">
        <TrendingUp className="mr-3 text-purple-400" size={24} />
        Performance Tracker
      </h2>
      {/* Tab Navigation */}
      <div className="flex mb-6 bg-gray-700/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'history' 
              ? 'bg-gray-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="inline-block mr-2" size={16} />
          Trade History
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'stats' 
              ? 'bg-gray-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BarChart className="inline-block mr-2" size={16} />
          Performance Stats
        </button>
      </div>

      {/* Current Signal to Log */}
      {currentSignal && (
        <div className="mb-6 p-4 bg-gray-700/70 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold mb-3 text-white flex items-center">
            <Award className="mr-2 text-yellow-400" size={18} />
            Log Trade Result
          </h3>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">{currentSignal.symbol}</span>
              <span className={`px-3 py-1 rounded-full font-semibold ${
                currentSignal.signal === 'BUY' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : currentSignal.signal === 'SELL'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
              }`}>
                {currentSignal.signal}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Confidence: {currentSignal.confidence.toFixed(1)}% | Duration: {currentSignal.trade_duration}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => logTrade('win')}
              disabled={isLogging}
              className="py-2 px-4 bg-green-600/80 hover:bg-green-600 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              ✅ WIN
            </button>
            <button
              onClick={() => logTrade('loss')}
              disabled={isLogging}
              className="py-2 px-4 bg-red-600/80 hover:bg-red-600 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              ❌ LOSS
            </button>
            <button
              onClick={() => logTrade('expired')}
              disabled={isLogging}
              className="py-2 px-4 bg-yellow-600/80 hover:bg-yellow-600 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              ⏱️ EXPIRED
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' ? (
        <>
          {/* Trade History */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : tradeLogs.length > 0 ? (
              tradeLogs.map((log) => (
                <div key={log.id} className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50 hover:border-gray-500/70 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-white">{log.symbol}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.signal === 'BUY' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : log.signal === 'SELL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                      }`}>
                        {log.signal}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getResultBg(log.result)}`}>
                        {getResultLabel(log.result)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-400">
                        Confidence: <span className="text-white">{log.confidence}%</span>
                      </span>
                      <span className="text-gray-400">
                        Duration: <span className="text-white">{log.trade_duration}</span>
                      </span>
                    </div>
                    {log.profit_loss !== undefined && (
                      <span className={`font-medium ${
                        log.profit_loss > 0 ? 'text-green-400' : 
                        log.profit_loss < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {log.profit_loss > 0 ? '+' : ''}{log.profit_loss.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  
                  {log.reason && (
                    <div className="mt-2 text-xs text-gray-400 bg-gray-600/30 rounded p-2">
                      {log.reason}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-700/30 rounded-lg border border-gray-600/50">
                <Clock className="mx-auto mb-3 text-gray-400" size={48} />
                <p className="text-gray-300 font-medium">No trade history available</p>
                <p className="text-sm text-gray-400 mt-2">Generate signals and log results to see your trading history</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Performance Statistics */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : performanceStats ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50">
                  <div className="text-sm text-gray-400">Win Rate</div>
                  <div className="text-2xl font-bold text-green-400 flex items-center">
                    {performanceStats.winRate}%
                    <span className="text-xs text-gray-400 ml-2">({performanceStats.totalSignals} trades)</span>
                  </div>
                </div>
                <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50">
                  <div className="text-sm text-gray-400">Avg. Profit</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {performanceStats.averageProfit}%
                  </div>
                </div>
                <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50">
                  <div className="text-sm text-gray-400">High Conf. Win Rate</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {performanceStats.confidenceAccuracy.high}%
                  </div>
                </div>
              </div>
              
              {/* By Symbol */}
              <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50">
                <h3 className="text-lg font-semibold mb-3 text-white">Performance by Symbol</h3>
                <div className="space-y-2">
                  {performanceStats.bySymbol.map((item) => (
                    <div key={item.symbol} className="flex items-center justify-between">
                      <span className="text-gray-300">{item.symbol}</span>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-400 mr-2">({item.total})</span>
                        <span className={`font-medium ${
                          parseFloat(item.winRate) >= 70 ? 'text-green-400' : 
                          parseFloat(item.winRate) >= 50 ? 'text-yellow-400' : 
                          'text-red-400'
                        }`}>
                          {item.winRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* By Timeframe */}
              <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50">
                <h3 className="text-lg font-semibold mb-3 text-white">Performance by Duration</h3>
                <div className="space-y-2">
                  {performanceStats.byTimeframe.map((item) => (
                    <div key={item.timeframe} className="flex items-center justify-between">
                      <span className="text-gray-300">{item.timeframe}</span>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-400 mr-2">({item.total})</span>
                        <span className={`font-medium ${
                          parseFloat(item.winRate) >= 70 ? 'text-green-400' : 
                          parseFloat(item.winRate) >= 50 ? 'text-yellow-400' : 
                          'text-red-400'
                        }`}>
                          {item.winRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Confidence Accuracy */}
              <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50">
                <h3 className="text-lg font-semibold mb-3 text-white">Confidence Accuracy</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">High Confidence (85%+)</span>
                      <span className="text-sm text-green-400">{performanceStats.confidenceAccuracy.high}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${performanceStats.confidenceAccuracy.high}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Medium Confidence (70-85%)</span>
                      <span className="text-sm text-yellow-400">{performanceStats.confidenceAccuracy.medium}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${performanceStats.confidenceAccuracy.medium}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Low Confidence (&lt;70%)</span>
                      <span className="text-sm text-red-400">{performanceStats.confidenceAccuracy.low}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${performanceStats.confidenceAccuracy.low}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-700/30 rounded-lg border border-gray-600/50">
              <PieChart className="mx-auto mb-3 text-gray-400" size={48} />
              <p className="text-gray-300 font-medium">No performance data available</p>
              <p className="text-sm text-gray-400 mt-2">Log more trades to see performance statistics</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helper function to update current signal from generator
export const updateCurrentSignal = (signal: SignalData | null) => {
  if (signal) {
    localStorage.setItem('currentSignal', JSON.stringify(signal));
  } else {
    localStorage.removeItem('currentSignal');
  }
};