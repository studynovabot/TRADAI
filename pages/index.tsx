import { useState, useCallback } from 'react';
import Head from 'next/head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Upload,
  Image,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  FileImage,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2
} from 'lucide-react';

interface AnalysisResult {
  success: boolean;
  confidence: number;
  processingTime: number;
  analysis: {
    trend: string;
    currentPrice: string;
    marketCondition: string;
    timeframeBias: string;
    supportLevels: string[];
    resistanceLevels: string[];
    technicalIndicators: {
      ema: string;
      sma: string;
      stochastic: string;
      rsi: string;
      volume: string;
      momentum: string;
    };
    chartPatterns: string;
    candlestickPatterns: string;
    predictions: Array<{
      candle: number;
      direction: 'UP' | 'DOWN';
      confidence: number;
      reasoning: string;
    }>;
    tradingSignal: {
      action: 'BUY' | 'SELL' | 'HOLD';
      confidence: number;
      entryPoint: string;
      reasoning: string;
      riskLevel: string;
    };
    overallConfidence: number;
  };
  detectedAsset?: string;
  detectedTimeframe?: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setAnalysisResult(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const analyzeChart = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/gemini-vision-signal', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result);
      } else {
        setError(result.error || 'Analysis failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY': return <ArrowUp className="h-5 w-5 text-green-500" />;
      case 'SELL': return <ArrowDown className="h-5 w-5 text-red-500" />;
      case 'HOLD': return <Minus className="h-5 w-5 text-yellow-500" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'bg-green-100 text-green-800 border-green-200';
      case 'SELL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HOLD': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <>
      <Head>
        <title>TRADAI - Gemini Chart Analyzer</title>
        <meta name="description" content="AI-powered trading chart analysis using Google Gemini" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">TRADAI</h1>
                <Badge variant="outline" className="ml-3">Gemini AI</Badge>
              </div>

              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">Ready</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Upload Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Upload Trading Chart Screenshot
              </CardTitle>
              <CardDescription>
                Upload a PNG or JPG image of your trading chart for comprehensive AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedFile ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop your chart image here
                  </p>
                  <p className="text-gray-500 mb-4">
                    or click to browse files
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="cursor-pointer">
                      <FileImage className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                  </label>
                  <p className="text-xs text-gray-400 mt-4">
                    Supports PNG, JPG, JPEG • Max 5MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Preview */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileImage className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={resetUpload}>
                      Remove
                    </Button>
                  </div>

                  {/* Image Preview */}
                  {previewUrl && (
                    <div className="border rounded-lg overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Chart preview"
                        className="w-full h-64 object-contain bg-gray-50"
                      />
                    </div>
                  )}

                  {/* Analyze Button */}
                  <Button
                    onClick={analyzeChart}
                    disabled={isAnalyzing}
                    className="w-full"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing Chart...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analyze Chart
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisResult && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Analysis Results
                </CardTitle>
                <CardDescription>
                  Comprehensive AI-powered technical analysis with next 3 candles predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Processing Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Processing Time</span>
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-lg font-semibold">{Math.round(analysisResult.processingTime / 1000)}s</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Overall Confidence</span>
                      <Target className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className={`text-lg font-semibold ${getConfidenceColor(analysisResult.confidence)}`}>
                      {analysisResult.confidence}%
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Detected Asset</span>
                      <BarChart3 className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-lg font-semibold">
                      {analysisResult.detectedAsset || 'Auto-detected'}
                    </div>
                  </div>
                </div>

                {/* Market Overview */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Market Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Trend</span>
                      <div className="font-medium">{analysisResult.analysis.trend}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Current Price</span>
                      <div className="font-medium">{analysisResult.analysis.currentPrice}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Market Condition</span>
                      <div className="font-medium">{analysisResult.analysis.marketCondition}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Timeframe Bias</span>
                      <div className="font-medium">{analysisResult.analysis.timeframeBias}</div>
                    </div>
                  </div>
                </div>

                {/* Support & Resistance */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Support & Resistance Levels</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Support Levels</h4>
                      <div className="space-y-1">
                        {analysisResult.analysis.supportLevels?.map((level, index) => (
                          <div key={index} className="text-sm bg-green-50 text-green-800 px-2 py-1 rounded">
                            {level}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Resistance Levels</h4>
                      <div className="space-y-1">
                        {analysisResult.analysis.resistanceLevels?.map((level, index) => (
                          <div key={index} className="text-sm bg-red-50 text-red-800 px-2 py-1 rounded">
                            {level}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Indicators */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Technical Indicators</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">EMA</div>
                      <div className="font-medium">{analysisResult.analysis.technicalIndicators.ema}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">SMA</div>
                      <div className="font-medium">{analysisResult.analysis.technicalIndicators.sma}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">Stochastic</div>
                      <div className="font-medium">{analysisResult.analysis.technicalIndicators.stochastic}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">RSI</div>
                      <div className="font-medium">{analysisResult.analysis.technicalIndicators.rsi}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">Volume</div>
                      <div className="font-medium">{analysisResult.analysis.technicalIndicators.volume}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">Momentum</div>
                      <div className="font-medium">{analysisResult.analysis.technicalIndicators.momentum}</div>
                    </div>
                  </div>
                </div>

                {/* Chart Patterns */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Chart Patterns</h3>
                  <div className="space-y-2">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-sm text-blue-600 font-medium">Chart Patterns</div>
                      <div className="text-sm">{analysisResult.analysis.chartPatterns}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-sm text-purple-600 font-medium">Candlestick Patterns</div>
                      <div className="text-sm">{analysisResult.analysis.candlestickPatterns}</div>
                    </div>
                  </div>
                </div>

                {/* Next 3 Candles Predictions */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Next 3 Candles Predictions
                  </h3>
                  <div className="space-y-3">
                    {analysisResult.analysis.predictions?.map((prediction, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {prediction.direction === 'UP' ? (
                              <ArrowUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <ArrowDown className="h-5 w-5 text-red-500" />
                            )}
                            <span className="font-semibold">Candle {prediction.candle}</span>
                          </div>
                          <div className={`font-semibold ${getConfidenceColor(prediction.confidence)}`}>
                            {prediction.confidence}% confidence
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Direction:</strong> {prediction.direction}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <strong>Reasoning:</strong> {prediction.reasoning}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trading Signal */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Trading Signal
                  </h3>
                  <div className="border rounded-lg p-6 bg-gradient-to-r from-gray-50 to-blue-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getSignalIcon(analysisResult.analysis.tradingSignal.action)}
                        <div>
                          <Badge className={getSignalColor(analysisResult.analysis.tradingSignal.action)}>
                            {analysisResult.analysis.tradingSignal.action}
                          </Badge>
                          <div className="text-sm text-gray-600 mt-1">
                            Risk Level: {analysisResult.analysis.tradingSignal.riskLevel}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getConfidenceColor(analysisResult.analysis.tradingSignal.confidence)}`}>
                          {analysisResult.analysis.tradingSignal.confidence}%
                        </div>
                        <div className="text-sm text-gray-600">Confidence</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm text-gray-600">Entry Point</div>
                      <div className="font-semibold text-lg">{analysisResult.analysis.tradingSignal.entryPoint}</div>
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Analysis Reasoning</div>
                      <div className="text-sm text-gray-600">{analysisResult.analysis.tradingSignal.reasoning}</div>
                    </div>
                  </div>
                </div>

                {/* Upload Another Button */}
                <div className="text-center">
                  <Button onClick={resetUpload} variant="outline" size="lg">
                    <Upload className="h-4 w-4 mr-2" />
                    Analyze Another Chart
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}


