/**
 * QXBroker OTC Signal Generator Web Interface
 * 
 * React component implementing the user interface for QXBroker OTC signal generation:
 * - Asset selection (GBP/USD)
 * - Timeframe selection
 * - Trade Duration selection
 * - Generate Signal button
 * - Real-time signal display with detailed analysis
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Signal {
  success: boolean;
  requestId: string;
  asset: string;
  signal: string;
  confidence: string;
  confidenceNumeric: number;
  riskScore: string;
  reason: string[];
  timestamp: string;
  processingTime: number;
  analysis?: {
    multiTimeframe: any;
    pattern: any;
    historical: any;
  };
  metadata?: any;
  error?: string;
}

interface HealthStatus {
  status: string;
  signalGenerator?: {
    status: string;
    initialized: boolean;
    loggedIn: boolean;
    currentAsset: string;
    currentTimeframe: string;
    timeframeDataAvailable: string[];
    errors: number;
  };
}

const QXBrokerOTCSignalGenerator: React.FC = () => {
  // State management
  const [asset, setAsset] = useState('GBP/USD');
  const [timeframes, setTimeframes] = useState<string[]>(['1H', '30M', '15M', '5M', '3M', '1M']);
  const [tradeDuration, setTradeDuration] = useState('5 minutes');
  const [isGenerating, setIsGenerating] = useState(false);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [signalHistory, setSignalHistory] = useState<Signal[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configuration
  const assets = [
    'GBP/USD',
    'EUR/USD', 
    'USD/JPY',
    'AUD/USD',
    'USD/CAD',
    'USD/CHF',
    'NZD/USD',
    'EUR/JPY'
  ];

  const availableTimeframes = [
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

  // Load health status on component mount
  useEffect(() => {
    checkHealthStatus();
    const interval = setInterval(checkHealthStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Load signal history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('qxbroker-otc-signal-history');
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
      localStorage.setItem('qxbroker-otc-signal-history', JSON.stringify(signalHistory.slice(-50))); // Keep last 50
    }
  }, [signalHistory]);

  /**
   * Check system health status
   */
  const checkHealthStatus = async () => {
    try {
      const response = await fetch('/api/qxbroker-otc-signal/health');
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
    setErrorMessage(null);

    try {
      console.log('🎯 Generating signal...', { asset, timeframes, tradeDuration });

      const response = await fetch('/api/qxbroker-otc-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset,
          timeframes,
          tradeDuration
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
      setErrorMessage(`Network error: ${error.message}`);
      setSignal({
        success: false,
        requestId: 'ERROR',
        asset,
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
   * Toggle timeframe selection
   */
  const toggleTimeframe = (timeframe: string) => {
    if (timeframes.includes(timeframe)) {
      // Don't allow removing if only one timeframe is selected
      if (timeframes.length > 1) {
        setTimeframes(timeframes.filter(t => t !== timeframe));
      }
    } else {
      setTimeframes([...timeframes, timeframe].sort((a, b) => {
        const order = { '1M': 5, '3M': 4, '5M': 3, '15M': 2, '30M': 1, '1H': 0 };
        return order[a as keyof typeof order] - order[b as keyof typeof order];
      }));
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
          🤖 QXBroker OTC Signal Generator
        </h1>
        <p className="text-gray-400 text-lg">
          Multi-Timeframe Analysis with OCR + Pattern Recognition + AI Confluence
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
              {/* Asset */}
              <div>
                <label className="block text-sm font-medium mb-2">Asset</label>
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                >
                  {assets.map(a => (
                    <option key={a} value={a}>{a}</option>
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
            </div>

            {/* Timeframe Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Timeframes</label>
              <div className="flex flex-wrap gap-2">
                {availableTimeframes.map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => toggleTimeframe(tf.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeframes.includes(tf.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    disabled={isGenerating}
                  >
                    {tf.label}
                  </button>
                ))}
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

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                <p className="font-medium">Error: {errorMessage}</p>
              </div>
            )}

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
                        <p className="text-gray-400 text-sm">Asset</p>
                        <p className="font-medium">{signal.asset}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Risk</p>
                        <p className={`font-medium ${getRiskColor(signal.riskScore)}`}>{signal.riskScore}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Request ID</p>
                        <p className="font-medium text-xs truncate">{signal.requestId}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Data Quality</p>
                        <p className="font-medium">
                          {signal.metadata?.dataQuality?.overall ? `${signal.metadata.dataQuality.overall}%` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Signal Reasoning */}
                    <div className="mt-4">
                      <h4 className="text-lg font-semibold mb-2">Signal Reasoning</h4>
                      <ul className="bg-gray-800 rounded-lg p-3 space-y-2">
                        {signal.reason && signal.reason.map((reason, index) => (
                          <li key={index} className="text-sm text-gray-300">
                            • {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Advanced Analysis Toggle */}
                    <div className="mt-4">
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-blue-400 text-sm flex items-center"
                      >
                        {showAdvanced ? '▼ Hide' : '► Show'} Advanced Analysis
                      </button>
                    </div>

                    {/* Advanced Analysis */}
                    {showAdvanced && signal.analysis && (
                      <div className="mt-2 bg-gray-800 rounded-lg p-4 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Multi-Timeframe Analysis */}
                          <div>
                            <h5 className="font-medium text-blue-400 mb-2">Multi-Timeframe</h5>
                            <div className="space-y-1">
                              {signal.analysis.multiTimeframe && (
                                <>
                                  <p>Trend: {signal.analysis.multiTimeframe.trend || 'N/A'}</p>
                                  <p>Alignment: {signal.analysis.multiTimeframe.alignment || 'N/A'}</p>
                                  <p>Strength: {signal.analysis.multiTimeframe.strength || 'N/A'}</p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Pattern Analysis */}
                          <div>
                            <h5 className="font-medium text-purple-400 mb-2">Pattern Analysis</h5>
                            <div className="space-y-1">
                              {signal.analysis.pattern && (
                                <>
                                  <p>Pattern: {signal.analysis.pattern.name || 'N/A'}</p>
                                  <p>Quality: {signal.analysis.pattern.quality || 'N/A'}</p>
                                  <p>Matches: {signal.analysis.pattern.matches || 'N/A'}</p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Historical Validation */}
                          <div>
                            <h5 className="font-medium text-green-400 mb-2">Historical Validation</h5>
                            <div className="space-y-1">
                              {signal.analysis.historical && (
                                <>
                                  <p>Accuracy: {signal.analysis.historical.accuracy || 'N/A'}</p>
                                  <p>Samples: {signal.analysis.historical.samples || 'N/A'}</p>
                                  <p>Win Rate: {signal.analysis.historical.winRate || 'N/A'}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
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
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl h-full">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              📜 Signal History
            </h2>

            {signalHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No signals generated yet</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {signalHistory.map((historySignal, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border-l-4 bg-gray-700 ${
                      historySignal.signal === 'BUY' || historySignal.signal === 'UP' ? 'border-green-500' :
                      historySignal.signal === 'SELL' || historySignal.signal === 'DOWN' ? 'border-red-500' :
                      'border-yellow-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{historySignal.asset}</p>
                        <p className="text-xs text-gray-400">{formatTimestamp(historySignal.timestamp)}</p>
                      </div>
                      <div className={`font-bold ${getSignalColor(historySignal.signal)}`}>
                        {historySignal.signal}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span className={`text-sm ${getConfidenceColor(historySignal.confidenceNumeric)}`}>
                        {historySignal.confidence}
                      </span>
                      <span className={`text-sm ${getRiskColor(historySignal.riskScore)}`}>
                        {historySignal.riskScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QXBrokerOTCSignalGenerator;