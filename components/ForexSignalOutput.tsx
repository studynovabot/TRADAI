import React from 'react';
import { ForexSignalData } from './ForexSignalGenerator';
import { Clock, TrendingUp, BarChart2, AlertCircle, Target, Crosshair, Zap, DollarSign, Percent } from 'lucide-react';

interface ForexSignalOutputProps {
  signal: ForexSignalData;
}

export function ForexSignalOutput({ signal }: ForexSignalOutputProps) {
  const isBuySignal = signal.trade_type === 'BUY';
  
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

  const getModeIcon = () => {
    switch (signal.trade_mode) {
      case 'sniper':
        return <Crosshair className="mr-2" size={16} />;
      case 'scalping':
        return <Zap className="mr-2" size={16} />;
      case 'swing':
        return <TrendingUp className="mr-2" size={16} />;
      default:
        return <Target className="mr-2" size={16} />;
    }
  };

  const getModeColor = () => {
    switch (signal.trade_mode) {
      case 'sniper':
        return 'bg-red-900/30 text-red-400';
      case 'scalping':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'swing':
        return 'bg-green-900/30 text-green-400';
      default:
        return 'bg-blue-900/30 text-blue-400';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-600">
      <h3 className="text-xl font-bold mb-4 text-white flex items-center justify-between">
        <div>
          <span className="text-2xl mr-3">🎯</span>
          Forex Signal Generated
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getModeColor()} flex items-center`}>
          {getModeIcon()}
          {signal.trade_mode.toUpperCase()} MODE
        </div>
      </h3>

      {/* Signal Direction */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Trade Direction:</span>
          <div className={`px-4 py-2 rounded-full font-bold text-lg ${
            isBuySignal 
              ? 'bg-green-500/20 text-green-400 border border-green-400' 
              : 'bg-red-500/20 text-red-400 border border-red-400'
          }`}>
            {isBuySignal ? '📈 BUY' : '📉 SELL'}
          </div>
        </div>
      </div>

      {/* Entry, SL, TP */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Entry Price</div>
          <div className="text-lg font-bold text-white">{signal.entry.toFixed(5)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Stop Loss</div>
          <div className="text-lg font-bold text-red-400">{signal.stop_loss.toFixed(5)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Take Profit</div>
          <div className="text-lg font-bold text-green-400">{signal.take_profit.toFixed(5)}</div>
        </div>
      </div>

      {/* RR Ratio and Confidence */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Risk-Reward Ratio:</span>
            <span className="text-xl font-bold text-cyan-400">1:{signal.rr_ratio.toFixed(1)}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="h-3 rounded-full transition-all duration-500 bg-cyan-500"
              style={{ width: `${Math.min(signal.rr_ratio * 25, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Confidence:</span>
            <span className={`text-xl font-bold ${getConfidenceColor(signal.confidence)}`}>
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
      </div>

      {/* AI Explanation */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-3">🧠 AI Analysis:</h4>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300 leading-relaxed">{signal.reason}</p>
        </div>
      </div>

      {/* Risk Management */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
          <DollarSign className="mr-2" size={18} />
          Risk Management:
        </h4>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">Risk Per Trade</div>
              <div className="text-white font-semibold flex items-center">
                <Percent size={14} className="mr-1" />
                {signal.risk_per_trade}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Execution Platform</div>
              <div className="text-white font-semibold">
                {signal.execution_platform}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Details */}
      <div className="border-t border-gray-700 pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Currency Pair:</span>
            <span className="text-white ml-2 font-semibold">{signal.pair}</span>
          </div>
          <div>
            <span className="text-gray-400">Timeframe:</span>
            <span className="text-white ml-2 font-semibold">{signal.timeframe}</span>
          </div>
          <div>
            <span className="text-gray-400">Trade Mode:</span>
            <span className="text-white ml-2 font-semibold capitalize">{signal.trade_mode}</span>
          </div>
          <div>
            <span className="text-gray-400">Generated:</span>
            <span className="text-white ml-2 font-semibold">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}