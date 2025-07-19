import React from 'react';
import { SignalData } from './SignalGeneratorPanel';
import { Clock, TrendingUp, BarChart2, AlertCircle, Calendar, Layers } from 'lucide-react';

interface SignalOutputProps {
  signal: SignalData;
}

export function SignalOutput({ signal }: SignalOutputProps) {
  const isCallSignal = signal.signal === 'BUY';
  const isNoTradeSignal = signal.signal === 'NO TRADE';
  
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

  // Get the timeframes that confirm the signal direction
  const getConfirmingTimeframes = () => {
    if (!signal.timeframe_analysis) return [];
    
    const direction = signal.signal === 'BUY' ? 'bullishTimeframes' : 'bearishTimeframes';
    return signal.timeframe_analysis.confluence[direction] || [];
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-600">
      <h3 className="text-xl font-bold mb-4 text-white flex items-center justify-between">
        <div>
          <span className="text-2xl mr-3">🎯</span>
          AI Signal Generated
        </div>
        {signal.mode === 'OTC' && (
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400 flex items-center">
            <Calendar className="mr-1" size={14} />
            OTC MODE
          </div>
        )}
      </h3>

      {/* Signal Direction */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Trade Direction:</span>
          {isNoTradeSignal ? (
            <div className="px-4 py-2 rounded-full font-bold text-lg bg-gray-600/20 text-gray-300 border border-gray-500">
              <AlertCircle className="inline mr-2" size={18} />
              NO TRADE
            </div>
          ) : (
            <div className={`px-4 py-2 rounded-full font-bold text-lg ${
              isCallSignal 
                ? 'bg-green-500/20 text-green-400 border border-green-400' 
                : 'bg-red-500/20 text-red-400 border border-red-400'
            }`}>
              {isCallSignal ? '📈 BUY' : '📉 SELL'}
            </div>
          )}
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

      {/* Entry Time */}
      {signal.candle_timestamp && !isNoTradeSignal && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center">
              <Clock className="mr-2" size={16} />
              Entry Time (UTC+5:30):
            </span>
            <span className="text-xl font-bold text-cyan-400">
              {signal.candle_timestamp}
            </span>
          </div>
        </div>
      )}

      {/* AI Explanation */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-3">🧠 AI Analysis:</h4>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300 leading-relaxed">{signal.reason}</p>
        </div>
      </div>

      {/* Timeframe Confluence */}
      {signal.timeframe_analysis && !isNoTradeSignal && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
            <TrendingUp className="mr-2" size={18} />
            Multi-Timeframe Confluence:
          </h4>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex flex-wrap gap-2 mb-3">
              {getConfirmingTimeframes().map((timeframe: string) => (
                <span 
                  key={timeframe}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isCallSignal ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {timeframe}
                </span>
              ))}
            </div>
            <p className="text-gray-300 text-sm">
              {getConfirmingTimeframes().length} of {signal.timeframe_analysis.timeframes_analyzed.length} timeframes confirm this signal
            </p>
          </div>
        </div>
      )}

      {/* Technical Indicators */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
          <BarChart2 className="mr-2" size={18} />
          Technical Indicators:
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">RSI</div>
            <div className="text-white font-semibold">
              {signal.indicators.rsi?.toFixed(1) || 'N/A'}
              {signal.indicators.rsi > 70 && <span className="text-red-400 ml-2">(Overbought)</span>}
              {signal.indicators.rsi < 30 && <span className="text-green-400 ml-2">(Oversold)</span>}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">MACD</div>
            <div className="text-white font-semibold">
              {signal.indicators.macd?.macd > signal.indicators.macd?.signal ? (
                <span className="text-green-400">Bullish</span>
              ) : (
                <span className="text-red-400">Bearish</span>
              )}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">EMA</div>
            <div className="text-white font-semibold">
              {signal.indicators.ema?.ema20 > signal.indicators.ema?.ema50 ? (
                <span className="text-green-400">Bullish</span>
              ) : (
                <span className="text-red-400">Bearish</span>
              )}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Volume</div>
            <div className="text-white font-semibold capitalize">
              {signal.indicators.volume?.trend || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Pattern Detection */}
      {signal.indicators.pattern && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3">🕯️ Pattern Detected:</h4>
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold capitalize">
                {signal.indicators.pattern.type} Pattern
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                signal.indicators.pattern.type === 'bullish' ? 'bg-green-900/30 text-green-400' : 
                signal.indicators.pattern.type === 'bearish' ? 'bg-red-900/30 text-red-400' : 
                'bg-gray-700 text-gray-300'
              }`}>
                {Math.round(signal.indicators.pattern.strength * 100)}% strength
              </span>
            </div>
          </div>
        </div>
      )}

      {/* OTC Pattern Matching (only shown in OTC mode) */}
      {signal.mode === 'OTC' && signal.patternMatches && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Layers className="mr-2" size={18} />
            Pattern Matching Analysis:
          </h4>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-sm text-gray-400">Pattern Matches</div>
                <div className="text-white font-semibold">
                  {signal.patternMatches.count || 0} historical matches
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Similarity Score</div>
                <div className="text-white font-semibold">
                  {signal.patternMatches.similarity || 0}%
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-300">
              Pattern matching uses historical data to find similar market conditions and predict outcomes.
            </div>
          </div>
        </div>
      )}

      {/* Signal Details */}
      <div className="border-t border-gray-700 pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Symbol:</span>
            <span className="text-white ml-2 font-semibold">{signal.symbol}</span>
          </div>
          <div>
            <span className="text-gray-400">Trade Duration:</span>
            <span className="text-white ml-2 font-semibold">{signal.trade_duration}</span>
          </div>
          <div>
            <span className="text-gray-400">Generated:</span>
            <span className="text-white ml-2 font-semibold">
              {new Date(signal.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Analysis:</span>
            <span className="text-white ml-2 font-semibold">
              {signal.mode === 'OTC' ? 'Pattern Matching' : 
                (signal.timeframe_analysis ? 
                  `${signal.timeframe_analysis.timeframes_analyzed.length} timeframes` : 
                  'Standard')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}