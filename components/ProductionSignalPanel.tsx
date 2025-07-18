/**
 * Production Signal Generator Panel
 * 
 * React component for the production-ready AI trading signal generator
 * with real-time data integration and deep analysis capabilities
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SignalData {
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL' | 'NO_SIGNAL';
  confidence: number;
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  dataSourcesUsed: {
    realtime: string;
    fallback: string;
    historical: string;
  };
  generatedAt: string;
  processingTime?: number;
  signalId?: string;
  analysis?: {
    brainConsensus?: any;
    technicalScore?: number;
    patternStrength?: number;
    confluenceScore?: number;
  };
  systemPerformance?: {
    totalSignals: number;
    successRate: string;
    avgProcessingTime: string;
    systemHealth: string;
  };
}

interface ApiResponse {
  success: boolean;
  signal: SignalData;
  metadata: {
    apiVersion: string;
    processingMode: string;
    deepAnalysisEnabled: boolean;
    timestamp: string;
  };
  error?: string;
  message?: string;
}

const ProductionSignalPanel: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m');
  const [isGenerating, setIsGenerating] = useState(false);
  const [signal, setSignal] = useState<SignalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState('');
  const [processingTime, setProcessingTime] = useState(0);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Supported pairs and timeframes
  const supportedPairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD',
    'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'BTC/USD', 'ETH/USD'
  ];

  const supportedTimeframes = [
    { value: '1m', label: '1 Minute' },
    { value: '3m', label: '3 Minutes' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' }
  ];

  // Processing stages for user feedback
  const processingStages = [
    'Initializing system...',
    'Collecting real-time market data...',
    'Fetching historical context from Yahoo Finance...',
    'Fusing real-time and historical data...',
    'Calculating technical indicators...',
    'Running Quant Brain analysis...',
    'Running Analyst Brain pattern recognition...',
    'Running Reflex Brain validation...',
    'Calculating brain consensus...',
    'Validating signal quality...',
    'Finalizing signal...'
  ];

  // Simulate processing stages during signal generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let stageIndex = 0;

    if (isGenerating) {
      setProcessingTime(0);
      interval = setInterval(() => {
        setProcessingTime(prev => prev + 1);
        
        // Update processing stage every 10-15 seconds
        if (processingTime > 0 && processingTime % 12 === 0) {
          if (stageIndex < processingStages.length - 1) {
            stageIndex++;
            setProcessingStage(processingStages[stageIndex]);
          }
        }
      }, 1000);

      setProcessingStage(processingStages[0]);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating, processingTime]);

  // Generate signal function
  const generateSignal = async () => {
    setIsGenerating(true);
    setError(null);
    setSignal(null);
    setProcessingStage(processingStages[0]);

    try {
      const response = await fetch('/api/production-generate-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pair: selectedPair,
          timeframe: selectedTimeframe,
          enableDeepAnalysis: true,
          maxProcessingTime: 180000 // 3 minutes
        }),
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.signal) {
        setSignal(data.signal);
        setProcessingStage('Signal generated successfully!');
      } else {
        throw new Error(data.message || 'Signal generation failed');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setProcessingStage('Signal generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Check system health
  const checkSystemHealth = async () => {
    try {
      const response = await fetch('/api/system-health');
      const health = await response.json();
      setSystemHealth(health);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  // Load system health on component mount
  useEffect(() => {
    checkSystemHealth();
  }, []);

  // Get signal direction color
  const getSignalColor = (direction: string) => {
    switch (direction) {
      case 'BUY': return 'text-green-500';
      case 'SELL': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Get risk score color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-500 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-500';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🧠 Production AI Trading Signal Generator
        </h2>
        <p className="text-gray-600">
          Ultra-accurate signals (85-90% target) with real-time + historical data fusion
        </p>
      </div>

      {/* System Health Indicator */}
      {systemHealth && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">System Health:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              systemHealth.status === 'HEALTHY' ? 'bg-green-100 text-green-800' :
              systemHealth.status === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {systemHealth.status}
            </span>
          </div>
        </div>
      )}

      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency Pair
          </label>
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            disabled={isGenerating}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            {supportedPairs.map(pair => (
              <option key={pair} value={pair}>{pair}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timeframe
          </label>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            disabled={isGenerating}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            {supportedTimeframes.map(tf => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Generate Button */}
      <div className="mb-6">
        <motion.button
          onClick={generateSignal}
          disabled={isGenerating}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
            isGenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
          }`}
          whileTap={{ scale: 0.98 }}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Generating Ultra-Accurate Signal...
            </div>
          ) : (
            '🚀 Generate Production Signal'
          )}
        </motion.button>
      </div>

      {/* Processing Status */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-800 font-medium">Deep Analysis in Progress</span>
              <span className="text-blue-600 text-sm">{processingTime}s</span>
            </div>
            <div className="text-blue-700 text-sm mb-3">{processingStage}</div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((processingTime / 180) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-blue-600 mt-2">
              ⏱️ Allowing 2-3 minutes for maximum accuracy analysis
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200"
          >
            <div className="flex items-center">
              <span className="text-red-500 mr-2">❌</span>
              <span className="text-red-800 font-medium">Signal Generation Failed</span>
            </div>
            <p className="text-red-700 text-sm mt-2">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signal Display */}
      <AnimatePresence>
        {signal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200"
          >
            {/* Signal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Trading Signal</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">ID: {signal.signalId?.slice(-8)}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(signal.riskScore)}`}>
                  {signal.riskScore} RISK
                </span>
              </div>
            </div>

            {/* Main Signal Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Direction</div>
                <div className={`text-2xl font-bold ${getSignalColor(signal.direction)}`}>
                  {signal.direction === 'BUY' ? '📈 BUY' : 
                   signal.direction === 'SELL' ? '📉 SELL' : '⏸️ NO SIGNAL'}
                </div>
              </div>

              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Confidence</div>
                <div className={`text-2xl font-bold ${getConfidenceColor(signal.confidence)}`}>
                  {signal.confidence}%
                </div>
              </div>

              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Pair & Timeframe</div>
                <div className="text-lg font-semibold text-gray-800">
                  {signal.pair} • {signal.timeframe}
                </div>
              </div>
            </div>

            {/* Signal Reasoning */}
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="text-sm font-medium text-gray-700 mb-2">Analysis Reasoning</div>
              <p className="text-gray-600 text-sm">{signal.reason}</p>
            </div>

            {/* Data Sources */}
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="text-sm font-medium text-gray-700 mb-2">Data Sources Used</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="font-medium">Real-time:</span> {signal.dataSourcesUsed.realtime}
                </div>
                <div>
                  <span className="font-medium">Historical:</span> {signal.dataSourcesUsed.historical}
                </div>
                <div>
                  <span className="font-medium">Generated:</span> {new Date(signal.generatedAt).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* System Performance */}
            {signal.systemPerformance && (
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-700 mb-2">System Performance</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Total Signals:</span> {signal.systemPerformance.totalSignals}
                  </div>
                  <div>
                    <span className="font-medium">Success Rate:</span> {signal.systemPerformance.successRate}
                  </div>
                  <div>
                    <span className="font-medium">Avg Time:</span> {signal.systemPerformance.avgProcessingTime}
                  </div>
                  <div>
                    <span className="font-medium">Health:</span> 
                    <span className={`ml-1 ${
                      signal.systemPerformance.systemHealth === 'HEALTHY' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {signal.systemPerformance.systemHealth}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-500">
        <p>🔒 Production Mode • Real Data Only • No Mock Fallback</p>
        <p>Powered by 3-Brain AI Architecture with Multi-Provider Data Fusion</p>
      </div>
    </div>
  );
};

export default ProductionSignalPanel;