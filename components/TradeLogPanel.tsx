import React, { useState, useEffect } from 'react';
import { SignalData } from './SignalGeneratorPanel';

interface TradeLog {
  trade_id: string;
  symbol: string;
  timeframe: string;
  trade_duration: string;
  signal: 'BUY' | 'SELL';
  result: 'WIN' | 'LOSS' | 'SKIP';
  confidence: number;
  reason: string;
  timestamp: string;
  logged_at: string;
}

export function TradeLogPanel() {
  const [currentSignal, setCurrentSignal] = useState<SignalData | null>(null);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [isLogging, setIsLogging] = useState(false);

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

  // Load trade logs from localStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('tradeLogs');
    if (savedLogs) {
      setTradeLogs(JSON.parse(savedLogs));
    }
  }, []);

  const logTrade = async (result: 'WIN' | 'LOSS' | 'SKIP') => {
    if (!currentSignal) return;

    setIsLogging(true);

    try {
      const response = await fetch('/api/log-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: currentSignal.symbol,
          timeframe: currentSignal.timeframe,
          trade_duration: currentSignal.trade_duration,
          signal: currentSignal.signal,
          result: result,
          confidence: currentSignal.confidence,
          reason: currentSignal.reason,
          timestamp: currentSignal.timestamp
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add to local logs
        const newLog: TradeLog = {
          trade_id: data.trade_id,
          symbol: currentSignal.symbol,
          timeframe: currentSignal.timeframe,
          trade_duration: currentSignal.trade_duration,
          signal: currentSignal.signal,
          result: result,
          confidence: currentSignal.confidence,
          reason: currentSignal.reason,
          timestamp: currentSignal.timestamp,
          logged_at: new Date().toISOString()
        };

        const updatedLogs = [newLog, ...tradeLogs].slice(0, 50); // Keep only last 50
        setTradeLogs(updatedLogs);
        localStorage.setItem('tradeLogs', JSON.stringify(updatedLogs));
        
        // Clear current signal
        setCurrentSignal(null);
        localStorage.removeItem('currentSignal');
      } else {
        throw new Error(data.error || 'Failed to log trade');
      }
    } catch (error) {
      console.error('Error logging trade:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'WIN': return 'text-green-400';
      case 'LOSS': return 'text-red-400';
      case 'SKIP': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getResultBg = (result: string) => {
    switch (result) {
      case 'WIN': return 'bg-green-500/20 border-green-500';
      case 'LOSS': return 'bg-red-500/20 border-red-500';
      case 'SKIP': return 'bg-gray-500/20 border-gray-500';
      default: return 'bg-gray-500/20 border-gray-500';
    }
  };

  const winRate = tradeLogs.length > 0 
    ? (tradeLogs.filter(log => log.result === 'WIN').length / tradeLogs.filter(log => log.result !== 'SKIP').length * 100)
    : 0;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center">
        <span className="text-3xl mr-3">📝</span>
        Trade Log
      </h2>

      {/* Current Signal to Log */}
      {currentSignal && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold mb-3 text-white">Log Trade Result</h3>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">{currentSignal.symbol}</span>
              <span className={`px-2 py-1 rounded font-semibold ${
                currentSignal.signal === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {currentSignal.signal}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Confidence: {currentSignal.confidence.toFixed(1)}% | {currentSignal.timeframe} | {currentSignal.trade_duration}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => logTrade('WIN')}
              disabled={isLogging}
              className="py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              ✅ WIN
            </button>
            <button
              onClick={() => logTrade('LOSS')}
              disabled={isLogging}
              className="py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              ❌ LOSS
            </button>
            <button
              onClick={() => logTrade('SKIP')}
              disabled={isLogging}
              className="py-2 px-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              ⏭️ SKIP
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Win Rate</div>
          <div className="text-2xl font-bold text-green-400">
            {winRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Trades</div>
          <div className="text-2xl font-bold text-blue-400">
            {tradeLogs.filter(log => log.result !== 'SKIP').length}
          </div>
        </div>
      </div>

      {/* Trade History */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {tradeLogs.length > 0 ? (
          tradeLogs.map((log) => (
            <div key={log.trade_id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-white">{log.symbol}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    log.signal === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {log.signal}
                  </span>
                </div>
                <div className={`px-2 py-1 rounded border font-semibold ${getResultBg(log.result)} ${getResultColor(log.result)}`}>
                  {log.result}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Confidence:</span>
                  <span className="text-white ml-1">{log.confidence.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white ml-1">{log.trade_duration}</span>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-400">
                {new Date(log.logged_at).toLocaleString()}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-400">No trades logged yet</p>
            <p className="text-sm text-gray-500 mt-2">Generate and log your first signal to get started</p>
          </div>
        )}
      </div>
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