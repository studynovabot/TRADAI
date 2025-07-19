/**
 * OTC Signal Generator Web Interface
 * 
 * React component implementing the user interface as specified:
 * - Currency Pair dropdown
 * - Trade Duration dropdown  
 * - Generate Signal button
 * - Real-time signal display with detailed analysis
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Signal {
  success: boolean;
  requestId: string;
  currency_pair: string;
  timeframe: string;
  trade_duration: string;
  signal: string;
  confidence: string;
  confidenceNumeric: number;
  riskScore: string;
  reason: string[];
  timestamp: string;
  processingTime: number;
  analysis?: {
    pattern: any;
    indicator: any;
    consensus: any;
  };
  marketContext?: {
    currentPrice: number;
    priceChange24h: number;
    volatility: number;
    volume: number;
  };
  metadata?: any;
  error?: string;
}

interface HealthStatus {
  status: string;
  orchestrator?: {
    status: string;
    components?: any;
    stats?: any;
  };
}

const OTCSignalGenerator: React.FC = () => {
  // State management
  const [currencyPair, setCurrencyPair] = useState('EUR/USD OTC');
  const [timeframe, setTimeframe] = useState('5M');
  const [tradeDuration, setTradeDuration] = useState('3 minutes');
  const [platform, setPlatform] = useState('quotex');
  const [isGenerating, setIsGenerating] = useState(false);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [signalHistory, setSignalHistory] = useState<Signal[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Configuration
  const currencyPairs = [
    'EUR/USD OTC',
    'GBP/USD OTC', 
    'USD/JPY OTC',
    'AUD/USD OTC',
    'USD/CAD OTC',
    'USD/CHF OTC',
    'NZD/USD OTC',
    'EUR/JPY OTC'
  ];

  const timeframes = [
    { value: '1M', label: '1 Minute' },
    { value: '3M', label: '3 Minutes' },
    { value: '5M', label: '5 Minutes' },
    { value: '15M', label: '15 Minutes' },
    { value: '30M', label: '30 Minutes' },
    { value: '1H', label: '1 Hour' }
  ];

  const tradeDurations = [
    '1 minute',
    '3 minutes', 
    '5 minutes',
    '15 minutes',
    '30 minutes'
  ];

  const platforms = [
    { value: 'quotex', label: 'Quotex' },
    { value: 'pocketOption', label: 'Pocket Option' }
  ];

  // Load health status on component mount
  useEffect(() => {
    checkHealthStatus();
    const interval = setInterval(checkHealthStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Load signal history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('otc-signal-history');
    if (saved) {
      try {
        setSignalHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load signal history:', error);
      }
    }
  }, []);

  // Save signal history to localStorage
  useEffect(() => {
    if (signalHistory.length > 0) {
      localStorage.setItem('otc-signal-history', JSON.stringify(signalHistory.slice(-50))); // Keep last 50
    }
  }, [signalHistory]);

  /**
   * Check system health status
   */
  const checkHealthStatus = async () => {
    try {
      const response = await fetch('/api/otc-signal-generator/health');
      const health = await response.json();
      setHealthStatus(health);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus({ status: 'error' });
    }
  };

  /**
   * Generate trading signal
   */
  const generateSignal = async () => {
    setIsGenerating(true);
    setSignal(null);

    try {
      console.log('🎯 Generating signal...', { currencyPair, timeframe, tradeDuration, platform });

      const response = await fetch('/api/otc-signal-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currencyPair,
          timeframe,
          tradeDuration,
          platform
        }),
      });

      const result = await response.json();
      
      console.log('📊 Signal result:', result);
      
      setSignal(result);
      
      // Add to history if successful
      if (result.success && result.signal !== 'ERROR') {
        setSignalHistory(prev => [result, ...prev].slice(0, 50));
      }

    } catch (error) {
      console.error('❌ Signal generation failed:', error);
      setSignal({
        success: false,
        requestId: 'ERROR',
        currency_pair: currencyPair,
        timeframe,
        trade_duration: tradeDuration,
        signal: 'ERROR',
        confidence: '0%',
        confidenceNumeric: 0,
        riskScore: 'HIGH',
        reason: [`Network error: ${error.message}`],
        timestamp: new Date().toISOString(),
        processingTime: 0,
        error: error.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Get signal color based on direction
   */
  const getSignalColor = (signalType: string) => {
    switch (signalType) {
      case 'BUY':
      case 'UP':
        return 'text-green-500';
      case 'SELL':
      case 'DOWN':
        return 'text-red-500';
      case 'NO_SIGNAL':
        return 'text-yellow-500';
      case 'ERROR':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  /**
   * Get confidence color based on level
   */
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 70) return 'text-yellow-500';
    if (confidence >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  /**
   * Get risk color
   */
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-500';
      case 'MEDIUM': return 'text-yellow-500';
      case 'HIGH': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          🤖 AI OTC Trading Signal Generator
        </h1>
        <p className="text-gray-400 text-lg">
          Real-time OTC market analysis using Browser Automation + OCR + AI Pattern Matching
        </p>
        
        {/* Health Status */}
        {healthStatus && (
          <div className={`inline-flex items-center mt-4 px-4 py-2 rounded-full text-sm ${
            healthStatus.status === 'healthy' ? 'bg-green-900 text-green-300' :
            healthStatus.status === 'initializing' ? 'bg-yellow-900 text-yellow-300' :
            'bg-red-900 text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              healthStatus.status === 'healthy' ? 'bg-green-400' :
              healthStatus.status === 'initializing' ? 'bg-yellow-400' :
              'bg-red-400'
            }`}></div>
            System Status: {healthStatus.status}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signal Generation Panel */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              🎯 Signal Generation
            </h2>

            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Currency Pair */}
              <div>
                <label className="block text-sm font-medium mb-2">Currency Pair</label>
                <select
                  value={currencyPair}
                  onChange={(e) => setCurrencyPair(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                >
                  {currencyPairs.map(pair => (
                    <option key={pair} value={pair}>{pair}</option>
                  ))}
                </select>
              </div>

              {/* Timeframe */}
              <div>
                <label className="block text-sm font-medium mb-2">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                >
                  {timeframes.map(tf => (
                    <option key={tf.value} value={tf.value}>{tf.label}</option>
                  ))}
                </select>
              </div>

              {/* Trade Duration */}
              <div>
                <label className="block text-sm font-medium mb-2">Trade Duration</label>
                <select
                  value={tradeDuration}
                  onChange={(e) => setTradeDuration(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                >
                  {tradeDurations.map(duration => (
                    <option key={duration} value={duration}>{duration}</option>
                  ))}
                </select>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium mb-2">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                >
                  {platforms.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <motion.button
              onClick={generateSignal}
              disabled={isGenerating}
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 ${
                isGenerating
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
              }`}
              whileHover={!isGenerating ? { scale: 1.02 } : {}}
              whileTap={!isGenerating ? { scale: 0.98 } : {}}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Generating Signal...
                </div>
              ) : (
                '🚀 Generate Signal'
              )}
            </motion.button>

            {/* Signal Display */}
            <AnimatePresence>
              {signal && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6"
                >
                  <div className={`bg-gray-700 rounded-lg p-6 border-l-4 ${
                    signal.signal === 'BUY' || signal.signal === 'UP' ? 'border-green-500' :
                    signal.signal === 'SELL' || signal.signal === 'DOWN' ? 'border-red-500' :
                    signal.signal === 'NO_SIGNAL' ? 'border-yellow-500' :
                    'border-red-600'
                  }`}>
                    {/* Signal Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold mb-1">Trading Signal</h3>
                        <p className="text-gray-400 text-sm">
                          {formatTimestamp(signal.timestamp)} • {signal.processingTime}ms
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getSignalColor(signal.signal)}`}>
                          {signal.signal}
                        </div>
                        <div className={`text-lg ${getConfidenceColor(signal.confidenceNumeric)}`}>
                          {signal.confidence}
                        </div>
                      </div>
                    </div>

                    {/* Signal Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">Pair</p>
                        <p className="font-semibold">{signal.currency_pair}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Duration</p>
                        <p className="font-semibold">{signal.trade_duration}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Risk Score</p>
                        <p className={`font-semibold ${getRiskColor(signal.riskScore)}`}>
                          {signal.riskScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Request ID</p>
                        <p className="font-mono text-xs">{signal.requestId}</p>
                      </div>
                    </div>

                    {/* Reasoning */}
                    {signal.reason && signal.reason.length > 0 && (
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-2">Analysis Reasoning:</p>
                        <ul className="space-y-1">
                          {signal.reason.map((reason, index) => (
                            <li key={index} className="text-sm flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Market Context */}
                    {signal.marketContext && (
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-2">Market Context:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-400">Price: </span>
                            <span>{signal.marketContext.currentPrice?.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">24h Change: </span>
                            <span className={signal.marketContext.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {signal.marketContext.priceChange24h?.toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Volatility: </span>
                            <span>{signal.marketContext.volatility?.toFixed(2)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Volume: </span>
                            <span>{signal.marketContext.volume?.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Advanced Analysis Toggle */}
                    {signal.analysis && (
                      <div>
                        <button
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          {showAdvanced ? '▼ Hide' : '▶ Show'} Advanced Analysis
                        </button>

                        <AnimatePresence>
                          {showAdvanced && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 space-y-4"
                            >
                              {/* Pattern Analysis */}
                              {signal.analysis.pattern && (
                                <div className="bg-gray-800 rounded p-4">
                                  <h4 className="font-semibold mb-2">📊 Pattern Analysis</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>Direction: {signal.analysis.pattern.direction}</div>
                                    <div>Confidence: {signal.analysis.pattern.confidence}%</div>
                                    <div>Similarity: {signal.analysis.pattern.similarity}%</div>
                                    <div>Matches: {signal.analysis.pattern.matches}</div>
                                  </div>
                                </div>
                              )}

                              {/* Indicator Analysis */}
                              {signal.analysis.indicator && (
                                <div className="bg-gray-800 rounded p-4">
                                  <h4 className="font-semibold mb-2">🧠 Indicator Analysis</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>Direction: {signal.analysis.indicator.direction}</div>
                                    <div>Confidence: {signal.analysis.indicator.confidence}%</div>
                                    <div>Score: {signal.analysis.indicator.score?.toFixed(3)}</div>
                                  </div>
                                </div>
                              )}

                              {/* Consensus */}
                              {signal.analysis.consensus && (
                                <div className="bg-gray-800 rounded p-4">
                                  <h4 className="font-semibold mb-2">🎯 Consensus</h4>
                                  <div className="text-sm">
                                    <div>Agreement: {signal.analysis.consensus.agreement ? 'Yes' : 'No'}</div>
                                    <div>Reason: {signal.analysis.consensus.reason}</div>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Signal History Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              📈 Signal History
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {signalHistory.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No signals generated yet</p>
              ) : (
                signalHistory.map((historySignal, index) => (
                  <div key={index} className="bg-gray-700 rounded p-3 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{historySignal.currency_pair}</span>
                      <span className={`font-bold ${getSignalColor(historySignal.signal)}`}>
                        {historySignal.signal}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{historySignal.confidence}</span>
                      <span>{formatTimestamp(historySignal.timestamp).split(',')[1]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {signalHistory.length > 0 && (
              <button
                onClick={() => {
                  setSignalHistory([]);
                  localStorage.removeItem('otc-signal-history');
                }}
                className="w-full mt-4 py-2 px-4 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
              >
                Clear History
              </button>
            )}
          </div>

          {/* System Stats */}
          {healthStatus?.orchestrator?.stats && (
            <div className="bg-gray-800 rounded-lg p-6 shadow-xl mt-6">
              <h2 className="text-xl font-bold mb-4">📊 System Stats</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Requests:</span>
                  <span>{healthStatus.orchestrator.stats.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="text-green-400">{healthStatus.orchestrator.stats.successRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Processing:</span>
                  <span>{healthStatus.orchestrator.stats.avgProcessingTimeFormatted}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTCSignalGenerator;