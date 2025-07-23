import Head from 'next/head';
import Link from 'next/link';
import { useState, useCallback } from 'react';

interface OTCSignal {
  success: boolean;
  signal: string;
  confidence: number;
  qualityGrade: string;
  analysis: string;
  technicalIndicators: {
    rsi: number;
    macd: any;
    trend: string;
    volatility: number;
    dataSource: string;
  };
  strictMode: boolean;
  metadata: {
    dataSource: string;
    analysisMethod: string;
    uniqueId: string;
    timestamp: string;
    bullishStrength: number;
    bearishStrength: number;
    totalStrength: number;
  };
}

interface OTCRequest {
  currencyPair: string;
  timeframe: string;
  tradeDuration: string;
  platform?: string;
  imageData?: string;
}

export default function OTCTrading() {
  const [selectedPair, setSelectedPair] = useState<string>('USD/PKR');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('5m');
  const [selectedDuration, setSelectedDuration] = useState<string>('5');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('quotex');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [signal, setSignal] = useState<OTCSignal | null>(null);
  const [error, setError] = useState<string>('');
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [useImageAnalysis, setUseImageAnalysis] = useState<boolean>(false);

  const currencyPairs = [
    'USD/PKR', 'USD/DZD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'
  ];

  const timeframes = [
    { id: '1m', name: '1 Minute', description: 'Ultra-fast scalping' },
    { id: '3m', name: '3 Minutes', description: 'Quick momentum trades' },
    { id: '5m', name: '5 Minutes', description: 'Balanced analysis' },
    { id: '15m', name: '15 Minutes', description: 'Trend confirmation' },
    { id: '30m', name: '30 Minutes', description: 'Swing analysis' }
  ];

  const tradeDurations = [
    { id: '1', name: '1 Minute', description: 'Quick scalp' },
    { id: '3', name: '3 Minutes', description: 'Short-term' },
    { id: '5', name: '5 Minutes', description: 'Standard' },
    { id: '10', name: '10 Minutes', description: 'Medium-term' },
    { id: '15', name: '15 Minutes', description: 'Long-term' }
  ];

  const platforms = [
    { id: 'quotex', name: 'Quotex', description: 'Popular binary options platform' },
    { id: 'pocket_option', name: 'Pocket Option', description: 'Mobile-friendly platform' },
    { id: 'iq_option', name: 'IQ Option', description: 'Professional trading platform' }
  ];

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, BMP)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be smaller than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setImagePreview(result);
      setError('');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const fakeEvent = {
        target: { files: [file] }
      } as React.ChangeEvent<HTMLInputElement>;
      handleImageUpload(fakeEvent);
    }
  }, [handleImageUpload]);

  const generateSignal = async () => {
    setIsGenerating(true);
    setError('');
    setSignal(null);
    const startTime = Date.now();

    try {
      const request: OTCRequest = {
        currencyPair: selectedPair,
        timeframe: selectedTimeframe,
        tradeDuration: selectedDuration,
        platform: selectedPlatform
      };

      // Add image data if using image analysis
      if (useImageAnalysis && uploadedImage) {
        request.imageData = uploadedImage;
      }

      console.log('🚀 Generating OTC signal:', { ...request, imageData: request.imageData ? '[IMAGE_DATA]' : undefined });

      // Choose endpoint based on whether we're using image analysis
      const endpoint = useImageAnalysis && uploadedImage ? '/api/otc-chart-analysis' : '/api/otc-signal-generator';

      const response = await fetch(endpoint, {
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
        throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Validate response for authenticity
      if (!data.success) {
        throw new Error(data.message || 'Signal generation failed');
      }

      if (!['CALL', 'PUT'].includes(data.signal)) {
        throw new Error(`Invalid signal type: ${data.signal}`);
      }

      if (data.confidence < 75 || data.confidence > 100) {
        throw new Error(`Invalid confidence level: ${data.confidence}%`);
      }

      if (!data.strictMode) {
        throw new Error('Signal not generated in strict mode');
      }

      if (data.metadata && data.metadata.dataSource !== 'real') {
        throw new Error(`Signal not from real data source: ${data.metadata.dataSource}`);
      }

      setSignal(data);
      console.log('✅ OTC signal generated successfully:', data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ OTC signal generation failed:', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-yellow-400'; // Gold
    if (confidence >= 85) return 'text-green-400';
    if (confidence >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 90) return 'bg-yellow-900 border-yellow-500';
    if (confidence >= 85) return 'bg-green-900 border-green-500';
    if (confidence >= 75) return 'bg-yellow-900 border-yellow-500';
    return 'bg-red-900 border-red-500';
  };

  const getQualityGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'text-yellow-400 bg-yellow-900 border-yellow-500';
      case 'A': return 'text-green-400 bg-green-900 border-green-500';
      case 'B+': return 'text-blue-400 bg-blue-900 border-blue-500';
      case 'B': return 'text-purple-400 bg-purple-900 border-purple-500';
      default: return 'text-gray-400 bg-gray-900 border-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <Head>
        <title>OTC Binary Options Trading - TRADAI System v2.0</title>
        <meta name="description" content="AI-powered chart analysis for binary options trading with real market data" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            📈 OTC Binary Options Trading
          </h1>
          <p className="text-gray-400">
            AI-powered chart analysis for binary options trading
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-6">Signal Configuration</h2>
              
              {/* Analysis Mode Toggle */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Analysis Mode</label>
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      !useImageAnalysis
                        ? 'border-purple-500 bg-purple-900'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                    onClick={() => setUseImageAnalysis(false)}
                  >
                    <div className="font-semibold text-white mb-1">🤖 Real Market Data Analysis</div>
                    <div className="text-gray-300 text-sm">Use live market data and technical indicators</div>
                  </div>
                  <div
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      useImageAnalysis
                        ? 'border-purple-500 bg-purple-900'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                    onClick={() => setUseImageAnalysis(true)}
                  >
                    <div className="font-semibold text-white mb-1">📸 Chart Screenshot Analysis</div>
                    <div className="text-gray-300 text-sm">Upload chart screenshots for AI pattern recognition</div>
                  </div>
                </div>
              </div>

              {/* Chart Screenshot Upload (only if image analysis is selected) */}
              {useImageAnalysis && (
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-3">Chart Screenshot</label>
                  <div
                    className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {imagePreview ? (
                      <div className="space-y-3">
                        <img
                          src={imagePreview}
                          alt="Chart preview"
                          className="max-w-full h-32 object-contain mx-auto rounded"
                        />
                        <button
                          onClick={() => {
                            setUploadedImage('');
                            setImagePreview('');
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-gray-400 mb-2">
                          <span className="text-3xl">📸</span>
                        </div>
                        <p className="text-gray-400 mb-2">
                          Drag and drop your chart screenshot here
                        </p>
                        <p className="text-gray-500 text-sm mb-3">
                          Supports JPG, PNG, BMP (max 10MB)
                        </p>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/bmp"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                        >
                          Choose File
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Currency Pair Selection */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Currency Pair</label>
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                >
                  {currencyPairs.map(pair => (
                    <option key={pair} value={pair}>{pair}</option>
                  ))}
                </select>
              </div>

              {/* Timeframe Selection */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Chart Timeframe</label>
                <div className="grid grid-cols-2 gap-2">
                  {timeframes.map(tf => (
                    <div
                      key={tf.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                        selectedTimeframe === tf.id
                          ? 'border-purple-500 bg-purple-900'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedTimeframe(tf.id)}
                    >
                      <div className="font-semibold text-white text-sm">{tf.name}</div>
                      <div className="text-gray-300 text-xs">{tf.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trade Duration Selection */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Trade Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {tradeDurations.map(duration => (
                    <div
                      key={duration.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                        selectedDuration === duration.id
                          ? 'border-purple-500 bg-purple-900'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedDuration(duration.id)}
                    >
                      <div className="font-semibold text-white text-sm">{duration.name}</div>
                      <div className="text-gray-300 text-xs">{duration.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Selection */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Trading Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                >
                  {platforms.map(platform => (
                    <option key={platform.id} value={platform.id}>{platform.name}</option>
                  ))}
                </select>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateSignal}
                disabled={isGenerating || (useImageAnalysis && !uploadedImage)}
                className={`w-full py-4 px-6 rounded-lg font-bold text-white transition-all ${
                  isGenerating || (useImageAnalysis && !uploadedImage)
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Analyzing Chart...
                  </div>
                ) : useImageAnalysis && !uploadedImage ? (
                  'Upload Chart Screenshot First'
                ) : (
                  'Generate OTC Signal'
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
                  <h2 className="text-2xl font-bold text-white">OTC Signal Generated</h2>
                  <div className="flex space-x-3">
                    <div className={`px-4 py-2 rounded-lg border ${getConfidenceBg(signal.confidence)}`}>
                      <span className={`font-bold ${getConfidenceColor(signal.confidence)}`}>
                        {signal.confidence}% Confidence
                      </span>
                    </div>
                    <div className={`px-4 py-2 rounded-lg border ${getQualityGradeColor(signal.qualityGrade)}`}>
                      <span className="font-bold">
                        Grade: {signal.qualityGrade}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Signal Details */}
                  <div className="space-y-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Currency Pair</div>
                      <div className="text-white font-bold text-xl">{selectedPair}</div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Signal Direction</div>
                      <div className={`font-bold text-xl ${
                        signal.signal === 'CALL' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {signal.signal}
                      </div>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Trade Duration</div>
                      <div className="text-white font-bold">{selectedDuration} minutes</div>
                    </div>
                  </div>

                  {/* Technical Indicators */}
                  <div className="space-y-4">
                    {signal.technicalIndicators && (
                      <>
                        <div className="bg-blue-900 border border-blue-500 rounded-lg p-4">
                          <div className="text-blue-400 text-sm">RSI</div>
                          <div className="text-white font-bold text-xl">{signal.technicalIndicators.rsi?.toFixed(1) || 'N/A'}</div>
                        </div>
                        
                        <div className="bg-purple-900 border border-purple-500 rounded-lg p-4">
                          <div className="text-purple-400 text-sm">Trend</div>
                          <div className="text-white font-bold text-xl capitalize">{signal.technicalIndicators.trend || 'N/A'}</div>
                        </div>

                        <div className="bg-yellow-900 border border-yellow-500 rounded-lg p-4">
                          <div className="text-yellow-400 text-sm">Volatility</div>
                          <div className="text-white font-bold text-xl">{signal.technicalIndicators.volatility?.toFixed(3) || 'N/A'}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Analysis */}
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="text-gray-400 text-sm mb-2">AI Analysis</div>
                  <div className="text-white">{signal.analysis}</div>
                </div>

                {/* Metadata */}
                {signal.metadata && (
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-2">Analysis Strength</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-400">Bullish:</span>
                          <span className="text-white">{signal.metadata.bullishStrength?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-400">Bearish:</span>
                          <span className="text-white">{signal.metadata.bearishStrength?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-400">Total:</span>
                          <span className="text-white">{signal.metadata.totalStrength?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-2">Signal ID</div>
                      <div className="text-white text-xs font-mono">{signal.metadata.uniqueId}</div>
                    </div>
                  </div>
                )}

                {/* Validation Status */}
                <div className="bg-green-900 border border-green-500 rounded-lg p-4">
                  <div className="text-green-400 font-bold mb-2">✅ Signal Validation</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Data Source:</span>
                      <span className="text-green-300 ml-2">{signal.metadata?.dataSource || 'real'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Strict Mode:</span>
                      <span className="text-green-300 ml-2">{signal.strictMode ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Analysis Method:</span>
                      <span className="text-green-300 ml-2">{signal.metadata?.analysisMethod || 'real_technical_indicators'}</span>
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
                  <span className="text-4xl">📈</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to Generate OTC Signal</h3>
                <p className="text-gray-400">
                  Configure your trading parameters {useImageAnalysis ? 'and upload a chart screenshot' : ''} to get AI-powered binary options analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
