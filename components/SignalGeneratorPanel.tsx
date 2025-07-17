import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, TrendingUp, Clock, Zap, AlertTriangle } from 'lucide-react';
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
  timestamp: string;
  candle_timestamp?: string;
  timeframe_analysis?: any;
}

export function SignalGeneratorPanel() {
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [tradeDuration, setTradeDuration] = useState('3M');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSignal, setCurrentSignal] = useState<SignalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');

  // Trade duration options
  const durations = [
    { value: '1M', label: '1 Minute' },
    { value: '3M', label: '3 Minutes' },
    { value: '5M', label: '5 Minutes' },
    { value: '10M', label: '10 Minutes' },
    { value: '15M', label: '15 Minutes' }
  ];

  // Analysis stages for the progress indicator
  const analysisStages = [
    'Collecting market data...',
    'Analyzing 5m timeframe...',
    'Analyzing 15m timeframe...',
    'Analyzing 30m timeframe...',
    'Analyzing 1h timeframe...',
    'Analyzing 4h timeframe...',
    'Analyzing 1d timeframe...',
    'Calculating indicator confluence...',
    'Validating signal quality...',
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
      // For development/demo purposes, we'll simulate the API call
      // In production, uncomment the actual API call below
      
      // Simulate API delay for realistic analysis time
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      // Generate mock data for demonstration
      const mockData = generateMockSignalData(selectedAsset, tradeDuration);
      
      /* 
      // Actual API call for production use
      const response = await fetch('/api/enhanced-generate-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedAsset,
          trade_duration: tradeDuration
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate signal');
      }
      */
      
      // Ensure we complete the progress animation
      await completeProgressAnimation();

      // Process the signal data
      setCurrentSignal(mockData);
      updateCurrentSignal(mockData); // Update for TradeLogPanel

    } catch (error) {
      console.error('Signal generation error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      
      // Complete the progress animation even on error
      await completeProgressAnimation();
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Generate mock signal data for demonstration
  const generateMockSignalData = (symbol, tradeDuration) => {
    // Randomize signal type with weighted probability
    const signalTypes = ['BUY', 'SELL', 'NO TRADE'];
    const weights = [0.4, 0.4, 0.2]; // 40% buy, 40% sell, 20% no trade
    
    let signalTypeIndex = 0;
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulativeWeight += weights[i];
      if (random < cumulativeWeight) {
        signalTypeIndex = i;
        break;
      }
    }
    
    const signalType = signalTypes[signalTypeIndex];
    
    // Generate confidence based on signal type
    let confidence = 0;
    if (signalType === 'NO TRADE') {
      confidence = 50 + Math.floor(Math.random() * 20); // 50-70%
    } else {
      confidence = 75 + Math.floor(Math.random() * 20); // 75-95%
    }
    
    // Generate mock indicator values
    const rsi = signalType === 'BUY' ? 30 + Math.random() * 10 : 
               signalType === 'SELL' ? 70 - Math.random() * 10 : 
               45 + Math.random() * 10;
               
    const macdValue = signalType === 'BUY' ? 0.0001 + Math.random() * 0.0005 : 
                     signalType === 'SELL' ? -0.0001 - Math.random() * 0.0005 : 
                     0.00001 * (Math.random() - 0.5);
                     
    const macdSignal = signalType === 'BUY' ? macdValue - 0.0002 : 
                      signalType === 'SELL' ? macdValue + 0.0002 : 
                      macdValue + 0.00001 * (Math.random() - 0.5);
    
    // Generate mock pattern
    const patternTypes = ['hammer', 'engulfing', 'doji', 'marubozu', 'morning_star', 'evening_star'];
    const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
    const patternStrength = 0.7 + Math.random() * 0.25;
    const patternDirection = signalType === 'BUY' ? 'bullish' : 
                            signalType === 'SELL' ? 'bearish' : 
                            Math.random() > 0.5 ? 'bullish' : 'bearish';
    
    // Generate timeframe analysis
    const timeframesAnalyzed = ['5m', '15m', '30m', '1h', '4h', '1d'];
    let bullishTimeframes = [];
    let bearishTimeframes = [];
    
    if (signalType === 'BUY') {
      // For BUY signals, more timeframes should be bullish
      bullishTimeframes = timeframesAnalyzed.filter(() => Math.random() > 0.3);
      bearishTimeframes = timeframesAnalyzed.filter(tf => !bullishTimeframes.includes(tf));
    } else if (signalType === 'SELL') {
      // For SELL signals, more timeframes should be bearish
      bearishTimeframes = timeframesAnalyzed.filter(() => Math.random() > 0.3);
      bullishTimeframes = timeframesAnalyzed.filter(tf => !bearishTimeframes.includes(tf));
    } else {
      // For NO TRADE, mixed signals
      timeframesAnalyzed.forEach(tf => {
        if (Math.random() > 0.5) {
          bullishTimeframes.push(tf);
        } else {
          bearishTimeframes.push(tf);
        }
      });
    }
    
    // Generate reason text based on signal type
    let reason = '';
    if (signalType === 'BUY') {
      reason = `Strong bullish momentum detected across ${bullishTimeframes.length} timeframes. RSI indicates oversold conditions at ${rsi.toFixed(2)}. MACD shows bullish crossover. ${patternDirection.charAt(0).toUpperCase() + patternDirection.slice(1)} ${patternType.replace('_', ' ')} pattern detected with ${Math.round(patternStrength * 100)}% strength. Volume is increasing, supporting the upward move.`;
    } else if (signalType === 'SELL') {
      reason = `Strong bearish momentum detected across ${bearishTimeframes.length} timeframes. RSI indicates overbought conditions at ${rsi.toFixed(2)}. MACD shows bearish crossover. ${patternDirection.charAt(0).toUpperCase() + patternDirection.slice(1)} ${patternType.replace('_', ' ')} pattern detected with ${Math.round(patternStrength * 100)}% strength. Volume is increasing, supporting the downward move.`;
    } else {
      reason = `Mixed signals across timeframes. RSI at neutral level (${rsi.toFixed(2)}). MACD showing minimal momentum. Conflicting patterns detected. Recommend waiting for clearer market direction.`;
    }
    
    // Generate current timestamp in IST (UTC+5:30)
    const now = new Date();
    const istOptions = { 
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short'
    };
    const formattedTimestamp = now.toLocaleString('en-IN', istOptions);
    
    return {
      symbol,
      signal: signalType,
      confidence,
      reason,
      timeframe: '5m', // Base timeframe for entry
      trade_duration: tradeDuration,
      timestamp: Date.now(),
      candle_timestamp: formattedTimestamp,
      entry_price: 1.0 + Math.random() * 0.1, // Mock price
      indicators: {
        rsi,
        macd: {
          macd: macdValue,
          signal: macdSignal,
          histogram: macdValue - macdSignal
        },
        ema: {
          ema8: 1.0 + Math.random() * 0.1,
          ema21: 1.0 + Math.random() * 0.1,
          ema50: 1.0 + Math.random() * 0.1
        },
        volume: {
          trend: signalType === 'NO TRADE' ? 'stable' : 'increasing',
          change: signalType === 'NO TRADE' ? 2.5 : 15.8,
          isSpike: signalType !== 'NO TRADE' && Math.random() > 0.7
        },
        pattern: {
          type: patternType,
          direction: patternDirection,
          strength: patternStrength
        }
      },
      timeframe_analysis: {
        timeframes_analyzed: timeframesAnalyzed,
        confluence: {
          bullishTimeframes,
          bearishTimeframes
        }
      }
    };
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
    }, 300); // Update every 300ms
    
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

      {/* Trade Duration Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center">
          <Clock className="mr-2 text-cyan-400" size={16} />
          How long will this trade last?
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
              <AlertTriangle className="mr-2 text-red-400" size={16} />
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