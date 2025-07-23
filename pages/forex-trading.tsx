import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface ForexSignal {
  pair: string;
  trade_type: string;
  entry: number;
  stop_loss: number;
  take_profit: number;
  rr_ratio: number;
  confidence: number;
  timeframe: string;
  trade_mode: string;
  reason: string;
  dataSource: string;
  strictMode: boolean;
  timestamp: string;
}

interface ForexRequest {
  pair: string;
  trade_mode: string;
  risk: string;
}

export default function ForexTrading() {
  const [selectedPair, setSelectedPair] = useState<string>('EUR/USD');
  const [selectedMode, setSelectedMode] = useState<string>('scalping');
  const [selectedRisk, setSelectedRisk] = useState<string>('2');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [signal, setSignal] = useState<ForexSignal | null>(null);
  const [error, setError] = useState<string>('');
  const [processingTime, setProcessingTime] = useState<number>(0);

  const currencyPairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 
    'USD/CHF', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'
  ];

  const tradeModes = [
    {
      id: 'sniper',
      name: '🟢 Sniper Mode',
      description: 'High-frequency, low-capital, fast-exit trades',
      timeframes: '1M-2M',
      analysis: 'EMA 9/20 crossover, RSI 7, Price action patterns',
      risk: 'Low-Medium',
      color: 'green'
    },
    {
      id: 'scalping',
      name: '🟡 Scalping Mode',
      description: 'Medium-frequency, balanced risk-reward',
      timeframes: '5M-15M',
      analysis: 'MACD crossover, EMA 20/50/200, RSI 14, Support/Resistance',
      risk: 'Medium',
      color: 'yellow'
    },
    {
      id: 'swing',
      name: '🔵 Swing Mode',
      description: 'Low-frequency, high-accuracy trades',
      timeframes: '30M-1H',
      analysis: 'Multi-timeframe confirmation, Fibonacci, RSI divergence, Volume profile',
      risk: 'High (requires larger capital)',
      color: 'blue'
    }
  ];

  const riskLevels = [
    { id: '1', name: 'Conservative', description: 'Lower risk, smaller position sizes' },
    { id: '2', name: 'Moderate', description: 'Balanced risk-reward approach' },
    { id: '3', name: 'Aggressive', description: 'Higher risk, larger potential returns' }
  ];

  const generateSignal = async () => {
    setIsGenerating(true);
    setError('');
    setSignal(null);
    const startTime = Date.now();

    try {
      const request: ForexRequest = {
        pair: selectedPair,
        trade_mode: selectedMode,
        risk: selectedRisk
      };

      console.log('🚀 Generating Forex signal:', request);

      const response = await fetch('/api/forex-signal-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      const endTime = Date.now();
      setProcessingTime((endTime - startTime) / 1000);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Validate response for authenticity
      if (data.entry === 'N/A' || data.stop_loss === 'N/A' || data.take_profit === 'N/A') {
        throw new Error('Signal contains N/A values - this indicates a system error');
      }

      if (typeof data.entry !== 'number' || typeof data.confidence !== 'number') {
        throw new Error('Signal contains invalid data types - expected numeric values');
      }

      if (data.dataSource !== 'real') {
        throw new Error(`Signal not from real data source: ${data.dataSource}`);
      }

      if (!data.strictMode) {
        throw new Error('Signal not generated in strict mode');
      }

      setSignal({
        ...data,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Forex signal generated successfully:', data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Forex signal generation failed:', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-400';
    if (confidence >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-900 border-green-500';
    if (confidence >= 75) return 'bg-yellow-900 border-yellow-500';
    return 'bg-red-900 border-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Head>
        <title>Forex Trading Mode - TRADAI System v2.0</title>
        <meta name="description" content="Professional forex trading signals with real market data analysis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            💱 Forex Trading Mode
          </h1>
          <p className="text-gray-400">
            Professional forex signals with real-time market analysis
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-6">Signal Configuration</h2>
              
              {/* Currency Pair Selection */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Currency Pair</label>
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  {currencyPairs.map(pair => (
                    <option key={pair} value={pair}>{pair}</option>
                  ))}
                </select>
              </div>

              {/* Trade Mode Selection */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Trade Mode</label>
                <div className="space-y-3">
                  {tradeModes.map(mode => (
                    <div
                      key={mode.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedMode === mode.id
                          ? 'border-blue-500 bg-blue-900'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedMode(mode.id)}
                    >
                      <div className="font-semibold text-white mb-1">{mode.name}</div>
                      <div className="text-gray-300 text-sm mb-2">{mode.description}</div>
                      <div className="text-xs text-gray-400">
                        <div>Timeframes: {mode.timeframes}</div>
                        <div>Risk: {mode.risk}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Level Selection */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Risk Level</label>
                <div className="space-y-2">
                  {riskLevels.map(risk => (
                    <div
                      key={risk.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedRisk === risk.id
                          ? 'border-blue-500 bg-blue-900'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedRisk(risk.id)}
                    >
                      <div className="font-semibold text-white">{risk.name}</div>
                      <div className="text-gray-300 text-sm">{risk.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateSignal}
                disabled={isGenerating}
                className={`w-full py-4 px-6 rounded-lg font-bold text-white transition-all ${
                  isGenerating
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating Signal...
                  </div>
                ) : (
                  'Generate Forex Signal'
                )}
              </button>

              {processingTime > 0 && (
                <div className="mt-3 text-center text-gray-400 text-sm">
                  Processing Time: {processingTime.toFixed(1)}s
                </div>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {error && (
              <div className="bg-red-900 border border-red-500 rounded-xl p-6 mb-6">
                <h3 className="text-red-400 font-bold mb-2">Error</h3>
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {signal && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Forex Signal Generated</h2>
                  <div className={`px-4 py-2 rounded-lg border ${getConfidenceBg(signal.confidence)}`}>
                    <span className={`font-bold ${getConfidenceColor(signal.confidence)}`}>
                      {signal.confidence}% Confidence
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Signal Details */}
                  <div className="space-y-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Currency Pair</div>
                      <div className="text-white font-bold text-xl">{signal.pair}</div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Trade Direction</div>
                      <div className={`font-bold text-xl ${
                        signal.trade_type === 'BUY' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {signal.trade_type}
                      </div>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Trade Mode</div>
                      <div className="text-white font-bold capitalize">{signal.trade_mode}</div>
                    </div>
                  </div>

                  {/* Price Levels */}
                  <div className="space-y-4">
                    <div className="bg-blue-900 border border-blue-500 rounded-lg p-4">
                      <div className="text-blue-400 text-sm">Entry Price</div>
                      <div className="text-white font-bold text-xl">{signal.entry}</div>
                    </div>
                    
                    <div className="bg-red-900 border border-red-500 rounded-lg p-4">
                      <div className="text-red-400 text-sm">Stop Loss</div>
                      <div className="text-white font-bold text-xl">{signal.stop_loss}</div>
                    </div>

                    <div className="bg-green-900 border border-green-500 rounded-lg p-4">
                      <div className="text-green-400 text-sm">Take Profit</div>
                      <div className="text-white font-bold text-xl">{signal.take_profit}</div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-2">Risk:Reward Ratio</div>
                    <div className="text-white font-bold text-lg">{signal.rr_ratio}</div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-2">Timeframe</div>
                    <div className="text-white font-bold text-lg">{signal.timeframe}</div>
                  </div>
                </div>

                {/* Analysis Reason */}
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="text-gray-400 text-sm mb-2">Technical Analysis</div>
                  <div className="text-white">{signal.reason}</div>
                </div>

                {/* Validation Status */}
                <div className="bg-green-900 border border-green-500 rounded-lg p-4">
                  <div className="text-green-400 font-bold mb-2">✅ Signal Validation</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Data Source:</span>
                      <span className="text-green-300 ml-2">{signal.dataSource}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Strict Mode:</span>
                      <span className="text-green-300 ml-2">{signal.strictMode ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Generated:</span>
                      <span className="text-green-300 ml-2">{new Date(signal.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Processing:</span>
                      <span className="text-green-300 ml-2">{processingTime.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!signal && !error && !isGenerating && (
              <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
                <div className="text-gray-400 mb-4">
                  <span className="text-4xl">💱</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to Generate Forex Signal</h3>
                <p className="text-gray-400">
                  Configure your trading parameters and click "Generate Forex Signal" to get real-time market analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
