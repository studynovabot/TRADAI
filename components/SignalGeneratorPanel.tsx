import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, TrendingUp, Clock, Zap, Target } from 'lucide-react';
import { AssetSelector } from './AssetSelector';
import { SignalOutput } from './SignalOutput';
import { updateCurrentSignal } from './TradeLogPanel';

export interface SignalData {
  signal: 'BUY' | 'SELL' | 'NO TRADE';
  confidence: number;
  reason: string;
  indicators: any;
  symbol: string;
  trade_duration: string;
  timestamp: string | number;
  candle_timestamp?: string;
  timeframe_analysis?: any;
  mode?: 'SNIPER' | 'SCALPING' | 'SWING' | 'REGULAR';
  entry_price?: number;
  // Enhanced signal structure for MT5 compatibility
  pair?: string;
  trade_type?: 'BUY' | 'SELL';
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
  rr_ratio?: number;
  timeframe?: string;
  trade_mode?: string;
  risk_per_trade?: string;
  execution_platform?: string;
}

export function SignalGeneratorPanel() {
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [tradeDuration, setTradeDuration] = useState('5M');
  const [tradeMode, setTradeMode] = useState('SCALPING');
  const [riskPerTrade, setRiskPerTrade] = useState('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSignal, setCurrentSignal] = useState<SignalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  // Trading mode configurations
  const tradingModes = [
    {
      value: 'SNIPER',
      label: 'Sniper Mode',
      icon: '🎯',
      description: 'High-frequency, low-capital, fast-exit trades (1-2M)',
      timeframes: ['1M', '2M'],
      defaultTimeframe: '1M',
      confidence: '70-80%',
      rrRatio: '0.2-0.5',
      slPips: '3-5',
      tpPips: '6-8',
      color: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    {
      value: 'SCALPING',
      label: 'Scalping Mode',
      icon: '⚡',
      description: 'Medium-frequency, medium-risk, better reward (5-15M)',
      timeframes: ['5M', '10M', '15M'],
      defaultTimeframe: '5M',
      confidence: '80%+',
      rrRatio: '1.5-2.5',
      slPips: '8-12',
      tpPips: '15-25',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    },
    {
      value: 'SWING',
      label: 'Swing Mode',
      icon: '📈',
      description: 'Low-frequency, high-capital, ultra-high-accuracy (30M-1H)',
      timeframes: ['30M', '1H'],
      defaultTimeframe: '30M',
      confidence: '85-95%',
      rrRatio: '2.5-3.0+',
      slPips: '20-30',
      tpPips: '50-100+',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  ];

  // Get available timeframes based on selected mode
  const getAvailableTimeframes = () => {
    const mode = tradingModes.find(m => m.value === tradeMode);
    return mode ? mode.timeframes.map(tf => ({ value: tf, label: tf })) : [];
  };

  // Risk percentage options
  const riskOptions = ['0.5', '1', '2', '3', '5'];

  // Dynamic analysis stages based on trading mode
  const getAnalysisStages = (mode: string) => {
    const baseStages = ['Collecting real-time market data...', 'Initializing technical analysis...'];
    
    switch (mode) {
      case 'SNIPER':
        return [
          ...baseStages,
          'Analyzing 1M price action...',
          'Calculating EMA 9/20 crossover...',
          'Checking RSI(7) extreme levels...',
          'Detecting pinbar/engulfing patterns...',
          'Validating sniper entry conditions...',
          'Calculating 3-5 pip stop loss...',
          'Setting 6-8 pip take profit...',
          'Finalizing high-frequency signal...'
        ];
      case 'SCALPING':
        return [
          ...baseStages,
          'Analyzing 5M-15M timeframes...',
          'Calculating MACD crossover signals...',
          'Analyzing EMA 20/50/200 trend...',
          'Checking RSI(14) momentum...',
          'Identifying support/resistance levels...',
          'Evaluating engulfing patterns...',
          'Computing 8-12 pip stop loss...',
          'Setting 15-25 pip take profit...',
          'Validating scalping parameters...',
          'Finalizing medium-frequency signal...'
        ];
      case 'SWING':
        return [
          ...baseStages,
          'Multi-timeframe analysis (30M-1H)...',
          'Calculating Fibonacci retracements...',
          'Detecting RSI divergence patterns...',
          'Analyzing MACD reversal zones...',
          'Volume profile analysis...',
          'Advanced candlestick formations...',
          'Morning/Evening Star detection...',
          'Computing 20-30 pip stop loss...',
          'Setting 50-100+ pip take profit...',
          'Deep confluence validation...',
          'Finalizing high-accuracy swing signal...'
        ];
      default:
        return baseStages;
    }
  };

  const generateSignal = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentSignal(null);
    setAnalysisProgress(0);
    
    // Start the progress animation with mode-specific stages
    startProgressAnimation();

    try {
      console.log(`🎯 Generating ${tradeMode} signal for ${selectedAsset} on ${tradeDuration} timeframe`);
      
      // Real API call to enhanced signal generator with trading mode support
      const response = await fetch('/api/enhanced-ai-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedAsset,
          trade_duration: tradeDuration,
          trade_mode: tradeMode,
          risk_per_trade: riskPerTrade
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate signal');
      }
      
      // Ensure we complete the progress animation
      await completeProgressAnimation();

      // Process the enhanced signal data
      const enhancedSignal = {
        ...data,
        mode: tradeMode,
        trade_mode: tradeMode.toLowerCase(),
        risk_per_trade: `${riskPerTrade}%`,
        execution_platform: 'MT5'
      };

      setCurrentSignal(enhancedSignal);
      updateCurrentSignal(enhancedSignal); // Update for TradeLogPanel

    } catch (error) {
      console.error('Signal generation error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      
      // Complete the progress animation even on error
      await completeProgressAnimation();
    } finally {
      setIsGenerating(false);
    }
  };

  // Simulate the analysis progress animation
  const startProgressAnimation = () => {
    let currentStage = 0;
    let progress = 0;
    
    // Get dynamic stages based on current trade mode
    const currentStages = getAnalysisStages(tradeMode);
    
    // Calculate timing based on trade mode
    const modeTimings = {
      'SNIPER': 200,    // Faster for sniper mode
      'SCALPING': 300,  // Medium for scalping
      'SWING': 400      // Slower for swing (more analysis)
    };
    
    const updateInterval = modeTimings[tradeMode as keyof typeof modeTimings] || 300;
    
    const interval = setInterval(() => {
      progress += 1;
      
      // Update the stage text at certain progress points
      const stageInterval = Math.floor(90 / currentStages.length);
      if (progress % stageInterval === 0 && currentStage < currentStages.length - 1) {
        currentStage++;
        setAnalysisStage(currentStages[currentStage]);
      }
      
      setAnalysisProgress(progress);
      
      // Stop at 90% and wait for the actual response
      if (progress >= 90) {
        clearInterval(interval);
        setAnalysisStage(`Finalizing ${tradeMode.toLowerCase()} signal...`);
      }
    }, updateInterval);
    
    // Start with the first stage
    setAnalysisStage(currentStages[0]);
    
    // Store the interval ID to clear it later if needed
    return interval;
  };

  // Complete the progress animation
  const completeProgressAnimation = async () => {
    // Ensure we reach 100%
    for (let i = Math.max(analysisProgress, 90); i <= 100; i++) {
      setAnalysisProgress(i);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Set the final stage
    setAnalysisStage('Analysis complete!');
    
    // Small delay before showing results
    await new Promise(resolve => setTimeout(resolve, 500));
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
        AI Signal Generator
      </motion.h2>

      {/* Asset Selection */}
      <div className="mb-6">
        <AssetSelector
          selectedAsset={selectedAsset}
          onAssetChange={setSelectedAsset}
        />
      </div>

      {/* Trading Mode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center">
          <Zap className="mr-2 text-cyan-400" size={16} />
          Select Trading Mode
        </label>
        <div className="grid grid-cols-1 gap-3">
          {tradingModes.map((mode) => (
            <motion.div
              key={mode.value}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                tradeMode === mode.value
                  ? mode.color
                  : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => {
                setTradeMode(mode.value);
                setTradeDuration(mode.defaultTimeframe);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{mode.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white">{mode.label}</h3>
                    <p className="text-sm text-gray-400">{mode.description}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-300">Confidence: {mode.confidence}</div>
                  <div className="text-gray-400">R/R: {mode.rrRatio}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                SL: {mode.slPips} pips | TP: {mode.tpPips} pips
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Timeframe Selection (Dynamic based on mode) */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center">
          <Clock className="mr-2 text-cyan-400" size={16} />
          Timeframe
        </label>
        <select
          value={tradeDuration}
          onChange={(e) => setTradeDuration(e.target.value)}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {getAvailableTimeframes().map((timeframe) => (
            <option key={timeframe.value} value={timeframe.value}>
              {timeframe.label}
            </option>
          ))}
        </select>
      </div>

      {/* Risk Management */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center">
          <Target className="mr-2 text-cyan-400" size={16} />
          Risk Per Trade
        </label>
        <select
          value={riskPerTrade}
          onChange={(e) => setRiskPerTrade(e.target.value)}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {riskOptions.map((risk) => (
            <option key={risk} value={risk}>
              {risk}% of account
            </option>
          ))}
        </select>
      </div>
      
      {/* Spacer */}
      <div className="mb-6"></div>

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

      {/* Analysis Progress */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            className="mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm text-gray-300">{analysisStage}</span>
              <span className="text-sm text-gray-300">{analysisProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-gray-400 italic">
              Deep market analysis across multiple timeframes takes 15-30 seconds for accuracy
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
              <span className="mr-2 text-red-400">⚠️</span>
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