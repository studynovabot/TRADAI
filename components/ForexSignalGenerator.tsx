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
  const getAnalysisStages = (mode: string) => {
    const baseStages = ['Collecting market data...', 'Analyzing price action patterns...'];
    
    switch (mode) {
      case 'sniper':
        return [
          ...baseStages,
          'Calculating EMA 9/20 crossover...',
          'Checking RSI(7) extreme levels...',
          'Detecting pinbar/engulfing patterns...',
          'Finalizing sniper entry...'
        ];
      case 'scalping':
        return [
          ...baseStages,
          'Calculating MACD crossover signals...',
          'Analyzing EMA 20/50/200 trend...',
          'Checking RSI(14) momentum...',
          'Identifying support/resistance levels...',
          'Evaluating engulfing patterns...',
          'Computing scalping parameters...',
          'Finalizing scalping signal...'
        ];
      case 'swing':
        return [
          ...baseStages,
          'Multi-timeframe analysis...',
          'Calculating Fibonacci retracements...',
          'Detecting RSI divergence...',
          'Analyzing MACD reversal zones...',
          'Volume profile analysis...',
          'Advanced candlestick formations...',
          'Computing swing parameters...',
          'Finalizing swing signal...'
        ];
      default:
        return baseStages;
    }
  };

  const analysisStages = getAnalysisStages(tradeMode);

  const generateSignal = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentSignal(null);
    setAnalysisProgress(0);
    
    // Start the progress animation
    startProgressAnimation();

    try {
      // Try the new Vercel-optimized endpoint first
      const endpoints = [
        '/api/vercel-forex-signal',
        '/api/forex-signal-generator'
      ];
      
      let response = null;
      let data = null;
      let success = false;
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pair: selectedPair,
              trade_mode: tradeMode,
              risk: risk
            }),
            // Add a timeout to prevent hanging requests
            signal: AbortSignal.timeout(15000) // Increased timeout for real analysis
          });
          
          data = await response.json();
          console.log(`📊 Response from ${endpoint}:`, data);
          
          if (response.ok) {
            if (data.error) {
              // API returned a legitimate "no signal" response
              console.log(`⚠️ ${endpoint} returned: ${data.error}`);
              // Continue to next endpoint, but store this as a valid response
              if (!success) {
                // If no previous success, we'll use this error response
                success = true;
              }
            } else if (data.pair && data.trade_type) {
              // API returned a valid signal
              console.log(`✅ ${endpoint} returned valid signal`);
              success = true;
              break;
            }
          }
        } catch (endpointError) {
          console.warn(`❌ Error with endpoint ${endpoint}:`, endpointError);
          // Continue to the next endpoint
        }
      }

      // Ensure we complete the progress animation
      await completeProgressAnimation();

      if (!success || !data) {
        throw new Error('All signal generation endpoints failed');
      }

      // Handle API responses
      if (data.error) {
        // API returned a legitimate "no signal" response
        console.log('📊 API Response: No signal detected');
        setError(data.error);
        return;
      }

      // Process the signal data
      if (data.pair && data.trade_type) {
        console.log('✅ Processing valid signal data:', data);
        setCurrentSignal(data);
      } else {
        throw new Error('Invalid signal data format received from API');
      }

    } catch (error) {
      console.error('❌ Signal generation error:', error);
      
      // Complete the progress animation even on error
      await completeProgressAnimation();
      
      // Show error message instead of generating fallback
      setError(`API Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try again.`);
      
      // Only generate fallback in development mode or if explicitly needed
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔄 Generating fallback signal for development');
        generateFallbackSignal();
      }
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Generate a fallback signal on the client side if all API endpoints fail
  const generateFallbackSignal = () => {
    const now = new Date();
    const isBuy = now.getMinutes() % 2 === 0;
    const tradeType = isBuy ? 'BUY' : 'SELL';
    
    // Generate base price based on currency pair
    let basePrice = 1.0;
    if (selectedPair.includes('USD')) {
      if (selectedPair.startsWith('EUR')) basePrice = 1.05;
      else if (selectedPair.startsWith('GBP')) basePrice = 1.25;
      else if (selectedPair.startsWith('AUD')) basePrice = 0.65;
      else if (selectedPair.startsWith('NZD')) basePrice = 0.60;
      else if (selectedPair.includes('JPY')) basePrice = 150;
    }
    
    // Calculate SL/TP based on mode
    let slPips, tpPips, confidence, timeframe;
    
    switch (tradeMode) {
      case 'sniper':
        slPips = 3 + Math.floor(Math.random() * 3); // 3-5 pips
        tpPips = 6 + Math.floor(Math.random() * 3); // 6-8 pips
        confidence = 70 + Math.floor(Math.random() * 10); // 70-80%
        timeframe = '1M';
        break;
        
      case 'scalping':
        slPips = 8 + Math.floor(Math.random() * 5); // 8-12 pips
        tpPips = 15 + Math.floor(Math.random() * 11); // 15-25 pips
        confidence = 80 + Math.floor(Math.random() * 6); // 80-85%
        timeframe = '5M';
        break;
        
      case 'swing':
        slPips = 20 + Math.floor(Math.random() * 11); // 20-30 pips
        tpPips = 50 + Math.floor(Math.random() * 51); // 50-100 pips
        confidence = 85 + Math.floor(Math.random() * 11); // 85-95%
        timeframe = '1H';
        break;
        
      default:
        slPips = 10;
        tpPips = 20;
        confidence = 80;
        timeframe = '5M';
    }
    
    // Convert pips to price for major pairs
    const pipValue = selectedPair.includes('JPY') ? 0.01 : 0.0001;
    const decimals = selectedPair.includes('JPY') ? 3 : 5;
    
    // Calculate entry, SL, TP
    let entry = parseFloat(basePrice.toFixed(decimals));
    let stopLoss, takeProfit;
    
    if (tradeType === 'BUY') {
      stopLoss = parseFloat((entry - (slPips * pipValue)).toFixed(decimals));
      takeProfit = parseFloat((entry + (tpPips * pipValue)).toFixed(decimals));
    } else { // SELL
      stopLoss = parseFloat((entry + (slPips * pipValue)).toFixed(decimals));
      takeProfit = parseFloat((entry - (tpPips * pipValue)).toFixed(decimals));
    }
    
    // Calculate RR ratio
    const rrRatio = parseFloat((tpPips / slPips).toFixed(2));
    
    // Generate reason
    const reasons = [
      `Strong ${tradeType === 'BUY' ? 'bullish' : 'bearish'} momentum detected on ${selectedPair}`,
      `Multiple timeframe confirmation for ${tradeType} signal on ${selectedPair}`,
      `${tradeType === 'BUY' ? 'RSI indicates oversold conditions' : 'RSI indicates overbought conditions'}`,
      `MACD ${tradeType === 'BUY' ? 'bullish' : 'bearish'} crossover with increasing histogram momentum`,
      `Price broke ${tradeType === 'BUY' ? 'above key resistance' : 'below key support'} with strong volume`
    ];
    
    const reason = `[FALLBACK DEMO] ${reasons[Math.floor(Math.random() * reasons.length)]}`;
    
    setCurrentSignal({
      pair: selectedPair,
      trade_type: tradeType,
      entry,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      rr_ratio: rrRatio,
      confidence,
      timeframe,
      trade_mode: tradeMode,
      reason,
      risk_per_trade: risk + '%',
      execution_platform: 'MT5'
    });
  };

  // Simulate the analysis progress animation
  const startProgressAnimation = () => {
    let currentStage = 0;
    let progress = 0;
    
    // Calculate expected analysis time based on trade mode
    const expectedTime = tradeMode === 'sniper' ? 2000 : 
                        tradeMode === 'scalping' ? 5500 : 
                        tradeMode === 'swing' ? 15000 : 5000;
    
    // Calculate interval to reach 90% in expected time
    const updateInterval = Math.max(100, expectedTime / 90);
    
    const interval = setInterval(() => {
      progress += 1;
      
      // Update the stage text at certain progress points
      if (progress % 15 === 0 && currentStage < analysisStages.length - 1) {
        currentStage++;
        setAnalysisStage(analysisStages[currentStage]);
      }
      
      setAnalysisProgress(progress);
      
      // Stop at 90% and wait for the actual response
      if (progress >= 90) {
        clearInterval(interval);
        setAnalysisStage('Finalizing trade recommendation...');
      }
    }, updateInterval);
    
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