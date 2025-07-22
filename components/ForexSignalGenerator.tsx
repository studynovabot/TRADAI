import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, TrendingUp, Clock, Zap, AlertTriangle, Calendar, ToggleLeft, Target, Crosshair, Repeat } from 'lucide-react';
import { AssetSelector } from './AssetSelector';
import { ForexSignalOutput } from './ForexSignalOutput';

export interface ForexSignalData {
  pair: string;
  trade_type: 'BUY' | 'SELL';
  entry: number;
  stop_loss: number;
  take_profit: number;
  rr_ratio: number;
  confidence: number;
  timeframe: string;
  trade_mode: string;
  reason: string;
  risk_per_trade: string;
  execution_platform: string;
  error?: string;
  message?: string;
}

export function ForexSignalGenerator() {
  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [tradeMode, setTradeMode] = useState<'sniper' | 'scalping' | 'swing'>('scalping');
  const [risk, setRisk] = useState('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSignal, setCurrentSignal] = useState<ForexSignalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');

  // Trade mode options
  const tradeModes = [
    { 
      value: 'sniper', 
      label: 'Sniper', 
      icon: <Crosshair size={16} />,
      description: 'High frequency, low capital, fast profits (1-2M timeframe)',
      color: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    { 
      value: 'scalping', 
      label: 'Scalping', 
      icon: <Zap size={16} />,
      description: 'Medium frequency, more analysis, better RR (5-15M timeframe)',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    },
    { 
      value: 'swing', 
      label: 'Swing', 
      icon: <TrendingUp size={16} />,
      description: 'Low frequency, extremely accurate, high capital (30M-1H timeframe)',
      color: 'bg-green-500/20 text-green-400 border-green-500/30'
    }
  ];

  // Risk percentage options
  const riskOptions = ['0.5', '1', '2', '3', '5'];

  // Analysis stages for the progress indicator
  const analysisStages = [
    'Collecting market data...',
    'Analyzing price action patterns...',
    'Calculating technical indicators...',
    'Evaluating multi-timeframe confluence...',
    'Determining optimal entry point...',
    'Calculating stop-loss and take-profit levels...',
    'Computing risk-reward ratio...',
    'Evaluating signal confidence...',
    'Finalizing trade recommendation...'
  ];

  const generateSignal = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentSignal(null);
    setAnalysisProgress(0);
    
    // Start the progress animation
    startProgressAnimation();

    try {
      // Make API call to generate signal
      const response = await fetch('/api/forex-signal-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pair: selectedPair,
          trade_mode: tradeMode,
          risk: risk
        }),
      });

      const data = await response.json();

      // Ensure we complete the progress animation
      await completeProgressAnimation();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate signal');
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      // Process the signal data
      setCurrentSignal(data);

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
    
    const interval = setInterval(() => {
      progress += 1;
      
      // Update the stage text at certain progress points
      if (progress % 10 === 0 && currentStage < analysisStages.length - 1) {
        currentStage++;
        setAnalysisStage(analysisStages[currentStage]);
      }
      
      setAnalysisProgress(progress);
      
      // Stop at 90% and wait for the actual response
      if (progress >= 90) {
        clearInterval(interval);
        setAnalysisStage('Finalizing trade recommendation...');
      }
    }, 150); // Update every 150ms for faster animation
    
    // Start with the first stage
    setAnalysisStage(analysisStages[0]);
    
    // Store the interval ID to clear it later if needed
    return interval;
  };

  // Complete the progress animation
  const completeProgressAnimation = async () => {
    // Ensure we reach 100%
    for (let i = Math.max(analysisProgress, 90); i <= 100; i++) {
      setAnalysisProgress(i);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    // Set the final stage
    setAnalysisStage('Analysis complete!');
    
    // Small delay before showing results
    await new Promise(resolve => setTimeout(resolve, 300));
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Rocket className="mr-3 text-blue-400" size={24} />
        Forex Signal Generator
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left Column - Asset Selection */}
        <div>
          <AssetSelector 
            selectedAsset={selectedPair} 
            onAssetChange={setSelectedPair}
            defaultCategory="forex"
          />
        </div>

        {/* Right Column - Trade Mode & Risk */}
        <div>
          {/* Trade Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Trade Mode
            </label>
            <div className="grid grid-cols-1 gap-2">
              {tradeModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setTradeMode(mode.value as 'sniper' | 'scalping' | 'swing')}
                  className={`p-3 rounded-lg text-left transition-all duration-200 flex items-center justify-between ${
                    tradeMode === mode.value
                      ? 'bg-blue-600 text-white'
                      : `bg-gray-700 hover:bg-gray-600 ${mode.color}`
                  }`}
                >
                  <div className="flex items-center">
                    <div className="mr-3">
                      {mode.icon}
                    </div>
                    <div>
                      <div className="font-semibold">{mode.label} Mode</div>
                      <div className="text-xs opacity-80">{mode.description}</div>
                    </div>
                  </div>
                  {tradeMode === mode.value && (
                    <div className="bg-white/20 rounded-full p-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Risk Per Trade (%)
            </label>
            <div className="flex flex-wrap gap-2">
              {riskOptions.map((riskValue) => (
                <button
                  key={riskValue}
                  onClick={() => setRisk(riskValue)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    risk === riskValue
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {riskValue}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="mb-8">
        <motion.button
          onClick={generateSignal}
          disabled={isGenerating}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center ${
            isGenerating
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
          }`}
          whileHover={{ scale: isGenerating ? 1 : 1.02 }}
          whileTap={{ scale: isGenerating ? 1 : 0.98 }}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing Market...
            </>
          ) : (
            <>
              <Zap className="mr-2" size={20} />
              Generate Forex Signal
            </>
          )}
        </motion.button>
      </div>

      {/* Progress Bar (visible during generation) */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="text-sm text-gray-300 mb-2 flex justify-between">
              <span>{analysisStage}</span>
              <span>{analysisProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div 
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
                style={{ width: `${analysisProgress}%` }}
                initial={{ width: '0%' }}
                animate={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className="mb-8 bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-start">
              <AlertTriangle className="mr-3 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold">Signal Generation Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signal Output */}
      <AnimatePresence>
        {currentSignal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <ForexSignalOutput signal={currentSignal} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode Information */}
      {!currentSignal && !isGenerating && (
        <motion.div 
          className="mt-6 bg-gray-700/50 rounded-lg p-4 border border-gray-600/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Target className="mr-2" size={18} />
            {tradeMode.charAt(0).toUpperCase() + tradeMode.slice(1)} Mode Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {tradeMode === 'sniper' && (
              <>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-red-400 font-semibold mb-1">Timeframes</div>
                  <div className="text-gray-300">1M - 2M</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-red-400 font-semibold mb-1">Risk-Reward</div>
                  <div className="text-gray-300">Low (0.2 - 0.5)</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-red-400 font-semibold mb-1">Stop-Loss/Take-Profit</div>
                  <div className="text-gray-300">SL: 3-5 pips, TP: 6-8 pips</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg col-span-1 md:col-span-3">
                  <div className="text-red-400 font-semibold mb-1">Indicators</div>
                  <div className="text-gray-300">Price action patterns (engulfing, pinbars), EMA 9/20, RSI 7</div>
                </div>
              </>
            )}
            
            {tradeMode === 'scalping' && (
              <>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-yellow-400 font-semibold mb-1">Timeframes</div>
                  <div className="text-gray-300">5M - 15M</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-yellow-400 font-semibold mb-1">Risk-Reward</div>
                  <div className="text-gray-300">Moderate (1.5 - 2.5)</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-yellow-400 font-semibold mb-1">Stop-Loss/Take-Profit</div>
                  <div className="text-gray-300">SL: 8-12 pips, TP: 15-25 pips</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg col-span-1 md:col-span-3">
                  <div className="text-yellow-400 font-semibold mb-1">Indicators</div>
                  <div className="text-gray-300">MACD crossover, EMA 20/50/200, RSI (14), bullish engulfing, S/R levels</div>
                </div>
              </>
            )}
            
            {tradeMode === 'swing' && (
              <>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-green-400 font-semibold mb-1">Timeframes</div>
                  <div className="text-gray-300">30M - 1H</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-green-400 font-semibold mb-1">Risk-Reward</div>
                  <div className="text-gray-300">High (2.5 - 3+)</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-green-400 font-semibold mb-1">Stop-Loss/Take-Profit</div>
                  <div className="text-gray-300">SL: 20-30 pips, TP: 50-100+ pips</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg col-span-1 md:col-span-3">
                  <div className="text-green-400 font-semibold mb-1">Indicators</div>
                  <div className="text-gray-300">Multi-timeframe trend confirmation, Fibonacci levels, RSI divergence, MACD reversal, volume profile, strong candle patterns</div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}