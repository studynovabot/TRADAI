import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, TrendingUp, Clock, Zap } from 'lucide-react';
import { AssetSelector } from './AssetSelector';
import { SignalOutput } from './SignalOutput';
import { updateCurrentSignal } from './TradeLogPanel';

export interface SignalData {
  signal: 'BUY' | 'SELL';
  confidence: number;
  reason: string;
  indicators: any;
  symbol: string;
  timeframe: string;
  trade_duration: string;
  timestamp: string;
}

export function SignalGeneratorPanel() {
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [timeframe, setTimeframe] = useState('5M');
  const [tradeDuration, setTradeDuration] = useState('3M');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSignal, setCurrentSignal] = useState<SignalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeframes = [
    { value: '1M', label: '1 Minute' },
    { value: '3M', label: '3 Minutes' },
    { value: '5M', label: '5 Minutes' },
    { value: '15M', label: '15 Minutes' },
    { value: '30M', label: '30 Minutes' },
    { value: '1H', label: '1 Hour' },
    { value: '4H', label: '4 Hours' },
    { value: '1D', label: '1 Day' }
  ];

  const durations = [
    { value: '3M', label: '3 Minutes' },
    { value: '5M', label: '5 Minutes' },
    { value: '10M', label: '10 Minutes' },
    { value: '15M', label: '15 Minutes' }
  ];

  const generateSignal = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentSignal(null);

    try {
      const response = await fetch('/api/generate-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedAsset,
          timeframe: timeframe,
          trade_duration: tradeDuration
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate signal');
      }

      if (data.signal) {
        setCurrentSignal(data);
        updateCurrentSignal(data); // Update for TradeLogPanel
      } else {
        setError(data.message || 'No signal generated - AI brains disagreed');
      }

    } catch (error) {
      console.error('Signal generation error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div 
      className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h2 
        className="text-2xl font-bold mb-6 text-white flex items-center"
        initial={{ x: -20 }}
        animate={{ x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <TrendingUp className="mr-3 text-cyan-400" size={28} />
        Signal Generator
      </motion.h2>

      {/* Asset Selection */}
      <div className="mb-6">
        <AssetSelector
          selectedAsset={selectedAsset}
          onAssetChange={setSelectedAsset}
        />
      </div>

      {/* Timeframe Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Chart Timeframe
        </label>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {timeframes.map((tf) => (
            <option key={tf.value} value={tf.value}>
              {tf.label}
            </option>
          ))}
        </select>
      </div>

      {/* Trade Duration Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Trade Duration
        </label>
        <select
          value={tradeDuration}
          onChange={(e) => setTradeDuration(e.target.value)}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {durations.map((duration) => (
            <option key={duration.value} value={duration.value}>
              {duration.label}
            </option>
          ))}
        </select>
      </div>

      {/* Generate Button */}
      <motion.button
        onClick={generateSignal}
        disabled={isGenerating}
        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
          isGenerating
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg'
        }`}
        whileHover={!isGenerating ? { scale: 1.02, y: -2 } : {}}
        whileTap={!isGenerating ? { scale: 0.98 } : {}}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className="flex items-center justify-center"
          animate={isGenerating ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5, repeat: isGenerating ? Infinity : 0 }}
        >
          {isGenerating ? (
            <>
              <motion.div 
                className="rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span>Analyzing Market...</span>
            </>
          ) : (
            <>
              <Rocket className="mr-3" size={20} />
              <span>Generate AI Signal</span>
            </>
          )}
        </motion.div>
      </motion.button>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className="mt-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-sm flex items-center">
              <Zap className="mr-2 text-red-400" size={16} />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signal Output */}
      <AnimatePresence>
        {currentSignal && (
          <motion.div 
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <SignalOutput signal={currentSignal} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}