import React from 'react';
import { SignalData } from './SignalGeneratorPanel';

interface SignalOutputProps {
  signal: SignalData;
}

export function SignalOutput({ signal }: SignalOutputProps) {
  const isCallSignal = signal.signal === 'BUY';
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-400';
    if (confidence >= 80) return 'text-yellow-400';
    if (confidence >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getConfidenceBar = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-500';
    if (confidence >= 80) return 'bg-yellow-500';
    if (confidence >= 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-600">
      <h3 className="text-xl font-bold mb-4 text-white flex items-center">
        <span className="text-2xl mr-3">🎯</span>
        AI Signal Generated
      </h3>

      {/* Signal Direction */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Trade Direction:</span>
          <div className={`px-4 py-2 rounded-full font-bold text-lg ${
            isCallSignal 
              ? 'bg-green-500/20 text-green-400 border border-green-400' 
              : 'bg-red-500/20 text-red-400 border border-red-400'
          }`}>
            {isCallSignal ? '📈 BUY' : '📉 SELL'}
          </div>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Confidence Score:</span>
          <span className={`text-2xl font-bold ${getConfidenceColor(signal.confidence)}`}>
            {signal.confidence.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getConfidenceBar(signal.confidence)}`}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      {/* AI Explanation */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-3">🧠 AI Analysis:</h4>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300 leading-relaxed">{signal.reason}</p>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-3">📊 Technical Indicators:</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">RSI</div>
            <div className="text-white font-semibold">
              {signal.indicators.rsi?.toFixed(1) || 'N/A'}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">MACD</div>
            <div className="text-white font-semibold">
              {signal.indicators.macd?.macd > signal.indicators.macd?.signal ? 'Bullish' : 'Bearish'}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">EMA</div>
            <div className="text-white font-semibold">
              {signal.indicators.ema?.ema20 > signal.indicators.ema?.ema50 ? 'Bullish' : 'Bearish'}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Volume</div>
            <div className="text-white font-semibold">
              {signal.indicators.volume?.trend || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Signal Details */}
      <div className="border-t border-gray-700 pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Symbol:</span>
            <span className="text-white ml-2 font-semibold">{signal.symbol}</span>
          </div>
          <div>
            <span className="text-gray-400">Timeframe:</span>
            <span className="text-white ml-2 font-semibold">{signal.timeframe}</span>
          </div>
          <div>
            <span className="text-gray-400">Duration:</span>
            <span className="text-white ml-2 font-semibold">{signal.trade_duration}</span>
          </div>
          <div>
            <span className="text-gray-400">Generated:</span>
            <span className="text-white ml-2 font-semibold">
              {new Date(signal.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}