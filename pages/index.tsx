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
    console.log('File input changed:', e.target.files);
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name);
      handleFileSelect(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    console.log('Triggering file input...');
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      console.log('File input found, clicking...');
      fileInput.click();
    } else {
      console.error('File input not found!');
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
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    dragActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
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
                  <label
                    htmlFor="file-upload"
                    onClick={triggerFileInput}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                  >
                    <FileImage className="h-4 w-4 mr-2" />
                    Browse Files
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

                  {/* Analyze Button - Enhanced */}
                  <Button
                    onClick={analyzeChart}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        🤖 AI Analyzing Chart... (60s)
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-5 w-5 mr-2" />
                        🚀 Start Professional Analysis
                      </>
                    )}
                  </Button>

                  {/* Analysis Progress Indicator */}
                  {isAnalyzing && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        <span className="text-sm font-medium text-blue-800">
                          Gemini AI is analyzing your chart...
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-blue-700">
                        <div className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                          Processing image with OCR
                        </div>
                        <div className="flex items-center">
                          <Loader2 className="h-3 w-3 text-blue-500 mr-2 animate-spin" />
                          Analyzing technical indicators
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Clock className="h-3 w-3 mr-2" />
                          Generating trading signals
                        </div>
                      </div>
                      <Progress value={33} className="mt-3 h-2" />
                    </div>
                  )}
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
                {/* Processing Info & Quality Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700 font-medium">Processing Time</span>
                      <Clock className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-xl font-bold text-blue-800">{Math.round(analysisResult.processingTime / 1000)}s</div>
                    <div className="text-xs text-blue-600 mt-1">
                      {analysisResult.processingTime < 60000 ? '⚡ Fast' : '🔄 Processing'}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 font-medium">Signal Quality</span>
                      <Target className="h-4 w-4 text-green-500" />
                    </div>
                    <div className={`text-xl font-bold ${getConfidenceColor(analysisResult.confidence)}`}>
                      {analysisResult.confidence}%
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {analysisResult.confidence >= 80 ? '🎯 High Quality' :
                       analysisResult.confidence >= 70 ? '✅ Good Quality' : '⚠️ Low Quality'}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-700 font-medium">Detected Asset</span>
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="text-xl font-bold text-purple-800">
                      {analysisResult.detectedAsset || 'Auto-detected'}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      {analysisResult.detectedTimeframe || 'Multi-timeframe'}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-700 font-medium">Analysis Status</span>
                      <CheckCircle className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="text-xl font-bold text-orange-800">
                      {analysisResult.success ? 'SUCCESS' : 'FAILED'}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      {analysisResult.success ? '✅ Ready to Trade' : '❌ Retry Analysis'}
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

                {/* Next 3 Candles Predictions - Enhanced Professional Layout */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Target className="h-6 w-6 mr-2 text-purple-600" />
                    🔮 Next 3 Candles Predictions
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysisResult.analysis.predictions?.map((prediction, index) => (
                      <div
                        key={index}
                        className={`border-2 rounded-xl p-5 shadow-lg transition-all hover:shadow-xl ${
                          prediction.direction === 'UP'
                            ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200'
                            : 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200'
                        }`}
                      >
                        {/* Candle Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${
                              prediction.direction === 'UP' ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {prediction.direction === 'UP' ? (
                                <ArrowUp className="h-5 w-5 text-white" />
                              ) : (
                                <ArrowDown className="h-5 w-5 text-white" />
                              )}
                            </div>
                            <div>
                              <span className="text-lg font-bold text-gray-800">
                                Candle {prediction.candle}
                              </span>
                              <div className="text-xs text-gray-600">Next prediction</div>
                            </div>
                          </div>
                        </div>

                        {/* Direction & Confidence */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Direction</span>
                            <Badge
                              className={`${
                                prediction.direction === 'UP'
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : 'bg-red-100 text-red-800 border-red-300'
                              } font-bold`}
                            >
                              {prediction.direction}
                            </Badge>
                          </div>

                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-600">Confidence</span>
                              <span className={`font-bold ${getConfidenceColor(prediction.confidence)}`}>
                                {prediction.confidence}%
                              </span>
                            </div>
                            <Progress
                              value={prediction.confidence}
                              className="h-2"
                            />
                          </div>
                        </div>

                        {/* AI Reasoning */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                            <span className="mr-1">🤖</span>
                            AI Reasoning
                          </div>
                          <div className="text-xs text-gray-600 leading-relaxed">
                            {prediction.reasoning}
                          </div>
                        </div>

                        {/* Prediction Quality Indicator */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Quality:</span>
                            <span className={`font-semibold ${
                              prediction.confidence >= 80 ? 'text-green-600' :
                              prediction.confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {prediction.confidence >= 80 ? '🎯 High' :
                               prediction.confidence >= 70 ? '✅ Good' : '⚠️ Low'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trading Signal - Enhanced Professional Layout */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Activity className="h-6 w-6 mr-2 text-blue-600" />
                    🎯 Professional Trading Signal
                  </h3>

                  {/* Main Signal Card */}
                  <div className="border-2 rounded-xl p-6 bg-gradient-to-br from-white via-blue-50 to-indigo-50 shadow-lg">
                    {/* Signal Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-white shadow-md">
                          {getSignalIcon(analysisResult.analysis.tradingSignal.action)}
                        </div>
                        <div>
                          <Badge
                            className={`${getSignalColor(analysisResult.analysis.tradingSignal.action)} text-lg px-4 py-2 font-bold`}
                          >
                            {analysisResult.analysis.tradingSignal.action} SIGNAL
                          </Badge>
                          <div className="text-sm text-gray-600 mt-2 flex items-center">
                            <span className="mr-2">🛡️ Risk Level:</span>
                            <span className="font-semibold">{analysisResult.analysis.tradingSignal.riskLevel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Confidence Meter */}
                      <div className="text-right">
                        <div className={`text-3xl font-black ${getConfidenceColor(analysisResult.analysis.tradingSignal.confidence)}`}>
                          {analysisResult.analysis.tradingSignal.confidence}%
                        </div>
                        <div className="text-sm text-gray-600 font-medium">Signal Confidence</div>
                        <Progress
                          value={analysisResult.analysis.tradingSignal.confidence}
                          className="w-24 mt-2"
                        />
                      </div>
                    </div>

                    {/* Entry Point & Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="text-sm text-gray-600 font-medium mb-1">💰 Recommended Entry Point</div>
                        <div className="text-2xl font-bold text-blue-800">{analysisResult.analysis.tradingSignal.entryPoint}</div>
                        <div className="text-xs text-gray-500 mt-1">Based on technical confluence</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="text-sm text-gray-600 font-medium mb-1">⏱️ Signal Validity</div>
                        <div className="text-2xl font-bold text-green-600">
                          {analysisResult.detectedTimeframe || 'Multi-TF'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Timeframe analysis</div>
                      </div>
                    </div>

                    {/* Professional Analysis Reasoning */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-5 border border-gray-200">
                      <div className="flex items-center mb-3">
                        <span className="text-lg font-bold text-gray-800 mr-2">🧠 AI Analysis Reasoning</span>
                        <Badge variant="outline" className="text-xs">Gemini Pro</Badge>
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {analysisResult.analysis.tradingSignal.reasoning}
                      </div>
                    </div>

                    {/* Trust & Reliability Indicators */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            AI Verified
                          </span>
                          <span className="flex items-center text-blue-600">
                            <Target className="h-4 w-4 mr-1" />
                            Multi-Indicator Confluence
                          </span>
                          <span className="flex items-center text-purple-600">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Professional Grade
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Generated: {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    onClick={resetUpload}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Analyze Another Chart
                  </Button>

                  <Button
                    onClick={() => window.print()}
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <FileImage className="h-4 w-4 mr-2" />
                    Save Analysis Report
                  </Button>

                  <Button
                    onClick={() => {
                      const analysisText = `
TRADAI Analysis Report
======================
Asset: ${analysisResult.detectedAsset || 'Unknown'}
Signal: ${analysisResult.analysis.tradingSignal.action}
Confidence: ${analysisResult.analysis.tradingSignal.confidence}%
Entry Point: ${analysisResult.analysis.tradingSignal.entryPoint}
Risk Level: ${analysisResult.analysis.tradingSignal.riskLevel}

Predictions:
${analysisResult.analysis.predictions?.map(p =>
  `Candle ${p.candle}: ${p.direction} (${p.confidence}%)`
).join('\n')}

Generated: ${new Date().toLocaleString()}
                      `.trim();
                      navigator.clipboard.writeText(analysisText);
                    }}
                    variant="default"
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Copy Trading Signal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Professional Disclaimer */}
          <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-orange-800 mb-2">⚠️ Professional Trading Disclaimer</h3>
                  <div className="text-sm text-orange-700 space-y-2">
                    <p>
                      <strong>Risk Warning:</strong> Trading involves substantial risk and may result in the loss of your invested capital.
                      Past performance does not guarantee future results.
                    </p>
                    <p>
                      <strong>AI Analysis:</strong> This analysis is generated by AI and should be used as a tool to assist your trading decisions,
                      not as the sole basis for trading. Always conduct your own research and risk assessment.
                    </p>
                    <p>
                      <strong>No Financial Advice:</strong> This tool provides technical analysis only and does not constitute financial advice.
                      Consult with a qualified financial advisor before making investment decisions.
                    </p>
                    <p className="font-semibold">
                      <strong>Recommendation:</strong> Never risk more than you can afford to lose. Use proper risk management and position sizing.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">TRADAI</span>
                <Badge variant="outline" className="text-xs">Powered by Gemini AI</Badge>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  Professional Grade Analysis
                </span>
                <span className="flex items-center">
                  <Target className="h-4 w-4 text-blue-500 mr-1" />
                  Multi-Timeframe Signals
                </span>
                <span className="flex items-center">
                  <Activity className="h-4 w-4 text-purple-500 mr-1" />
                  Real-Time Processing
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                © 2024 TRADAI. Advanced AI-powered trading analysis system.
                Built with cutting-edge technology for professional traders.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}


