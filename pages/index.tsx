import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import * as LucideIcons from 'lucide-react';

// Create typed icon components
const Icons = {
  Upload: (LucideIcons as any).Upload,
  Image: (LucideIcons as any).Image,
  BarChart3: (LucideIcons as any).BarChart3,
  TrendingUp: (LucideIcons as any).TrendingUp,
  TrendingDown: (LucideIcons as any).TrendingDown,
  Activity: (LucideIcons as any).Activity,
  Clock: (LucideIcons as any).Clock,
  Target: (LucideIcons as any).Target,
  AlertCircle: (LucideIcons as any).AlertCircle,
  CheckCircle: (LucideIcons as any).CheckCircle,
  FileImage: (LucideIcons as any).FileImage,
  ArrowUp: (LucideIcons as any).ArrowUp,
  ArrowDown: (LucideIcons as any).ArrowDown,
  Minus: (LucideIcons as any).Minus,
  Loader2: (LucideIcons as any).Loader2,
  Copy: (LucideIcons as any).Copy,
  Info: (LucideIcons as any).Info,
  Gauge: (LucideIcons as any).Gauge,
  RefreshCw: (LucideIcons as any).RefreshCw,
  Download: (LucideIcons as any).Download,
  Settings: (LucideIcons as any).Settings
};

interface AnalysisResult {
  success: boolean;
  processingTime?: number;
  analysis: {
    overallConfidence: number;
    tradingSignal: {
      action: 'BUY' | 'SELL' | 'HOLD';
      confidence: number;
    };
    marketCondition: string;
    detectedAsset?: string;
    detectedTimeframe?: string;
    predictions?: Array<{
      candle: number;
      direction: 'UP' | 'DOWN';
      confidence: number;
      reasoning: string;
    }>;
    trend: string;
    currentPrice: string;
    technicalIndicators?: {
      ema: string;
      sma: string;
      stochastic: string;
    };
    supportLevels?: string[];
    resistanceLevels?: string[];
  };
  error?: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Health check state
  const [healthStatus, setHealthStatus] = useState<{status?: string; timestamp?: string; services?: any}>({});
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const API_BASE_URL = 'https://tradai-4c8p4mlkz-ranveer-singh-rajputs-projects.vercel.app';

  // Health check function
  const checkApiHealth = async () => {
    setIsCheckingHealth(true);
    setHealthError(null);
    
    try {
      console.log('Testing health endpoint...');
      
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('Health response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Health response data:', data);
      
      setHealthStatus({
        status: data.status,
        timestamp: data.timestamp,
        services: data.services
      });
      
      return data.status === 'OK';
    } catch (error: any) {
      console.error('Health check error:', error);
      setHealthError(error.message);
      return false;
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Run health check on mount
  useEffect(() => {
    checkApiHealth();
  }, []);

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

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size too large (max 10MB)');
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
    
    const startTime = Date.now();

    try {
      console.log('Starting image analysis...');
      console.log('Selected file:', selectedFile.name, 'Size:', selectedFile.size, 'Type:', selectedFile.type);

      // Validate file
      if (!selectedFile.type.startsWith('image/')) {
        throw new Error('Selected file is not an image');
      }

      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size too large (max 10MB)');
      }

      const formData = new FormData();
      formData.append('image', selectedFile);

      const API_BASE_URL = 'https://tradai-4c8p4mlkz-ranveer-singh-rajputs-projects.vercel.app';
      console.log('Sending request to:', `${API_BASE_URL}/api/gemini-vision-signal`);

      const response = await fetch(`${API_BASE_URL}/api/gemini-vision-signal`, {
        method: 'POST',
        mode: 'cors',
        body: formData
        // Note: Don't set Content-Type header for FormData, browser will set it with boundary
      });

      const processingTime = Date.now() - startTime;
      console.log('Response received. Status:', response.status, 'Processing time:', processingTime + 'ms');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n\nResponse: ${errorText}`);
      }

      const data = await response.json();
      console.log('Analysis response:', data);

      if (data.success) {
        // Add processing time to the result
        const resultWithTime = {
          ...data,
          processingTime: processingTime
        };
        setAnalysisResult(resultWithTime);
      } else {
        setError(data.error || 'Analysis failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      
      let errorMessage = `Analysis failed: ${err.message}`;
      
      if (err.message.includes('Failed to fetch')) {
        errorMessage = `Network Error - Possible causes:
- API server is not responding
- CORS policy blocking the request
- Network connectivity issues
- Firewall or proxy blocking the request

Troubleshooting steps:
1. Check if the API server is accessible
2. Check browser console for detailed errors
3. Try a different network connection
4. Disable browser extensions temporarily`;
      } else if (err.message.includes('HTTP 4')) {
        errorMessage = `Client Error - Check:
- File format (PNG, JPG, JPEG supported)
- File size (max 10MB)
- Image contains a valid trading chart`;
      } else if (err.message.includes('HTTP 5')) {
        errorMessage = `Server Error - The API server encountered an error
- Try again in a few moments
- Check if the API is experiencing issues`;
      }
      
      setError(errorMessage);
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
      case 'BUY': return <Icons.ArrowUp className="h-5 w-5 text-green-500" />;
      case 'SELL': return <Icons.ArrowDown className="h-5 w-5 text-red-500" />;
      case 'HOLD': return <Icons.Minus className="h-5 w-5 text-yellow-500" />;
      default: return <Icons.Activity className="h-5 w-5" />;
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

  // Quality score calculation (from test-api.html)
  const calculateQualityScore = (analysis: any, processingTime: number) => {
    let score = 0;
    let maxScore = 6;

    if (processingTime < 60000) score++;
    if (analysis.overallConfidence >= 70) score++;
    if (analysis.predictions && analysis.predictions.length === 3) score++;
    if (analysis.tradingSignal.confidence >= 70) score++;
    if (analysis.technicalIndicators) score++;
    if (analysis.supportLevels && analysis.resistanceLevels) score++;

    return Math.round((score / maxScore) * 100);
  };

  const getScoreClass = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'EXCELLENT';
    if (score >= 60) return 'GOOD';
    return 'NEEDS IMPROVEMENT';
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
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
                <Icons.BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">TRADAI</h1>
                <Badge variant="outline" className="ml-3">Gemini AI</Badge>
              </div>

              <div className="flex items-center space-x-2">
                {healthStatus.status === 'OK' ? (
                  <>
                    <Icons.CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-600">API Ready</span>
                  </>
                ) : healthError ? (
                  <>
                    <Icons.AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-600">API Error</span>
                  </>
                ) : (
                  <>
                    <Icons.Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    <span className="text-sm text-gray-600">Checking API...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* API Health Status */}
          {(healthStatus.status || healthError) && (
            <Card className={`mb-8 ${healthStatus.status === 'OK' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  {healthStatus.status === 'OK' ? (
                    <>
                      <Icons.CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                      <span className="text-green-700">Gemini Vision API Status: Online</span>
                    </>
                  ) : (
                    <>
                      <Icons.AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                      <span className="text-red-700">Gemini Vision API Status: Error</span>
                    </>
                  )}
                </CardTitle>
                {healthStatus.status === 'OK' && (
                  <CardDescription className="text-green-600">
                    API is operational and ready to analyze trading charts
                  </CardDescription>
                )}
                {healthError && (
                  <CardDescription className="text-red-600">
                    API connection error: {healthError}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {healthStatus.status === 'OK' && (
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Last Check:</span>{' '}
                        <span className="text-green-700">{healthStatus.timestamp ? new Date(healthStatus.timestamp).toLocaleString() : 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Endpoint:</span>{' '}
                        <span className="text-green-700">https://tradai-4c8p4mlkz-ranveer-singh-rajputs-projects.vercel.app</span>
                      </div>
                      <div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs border-green-300 text-green-700 hover:bg-green-100"
                          onClick={checkApiHealth}
                        >
                          <Icons.Loader2 className="h-3 w-3 mr-1" />
                          Refresh Status
                        </Button>
                      </div>
                    </div>
                  )}
                  {healthError && (
                    <div className="space-y-2">
                      <p className="text-red-700">The API appears to be unavailable or experiencing issues.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs border-red-300 text-red-700 hover:bg-red-100"
                          onClick={checkApiHealth}
                        >
                          <Icons.Loader2 className="h-3 w-3 mr-1" />
                          Retry Connection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Upload Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.Upload className="h-5 w-5 mr-2" />
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
                  <Icons.Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                    <Icons.FileImage className="h-4 w-4 mr-2" />
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
                      <Icons.FileImage className="h-8 w-8 text-blue-600" />
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
                        <Icons.Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        🤖 AI Analyzing Chart... (60s)
                      </>
                    ) : (
                      <>
                        <Icons.BarChart3 className="h-5 w-5 mr-2" />
                        🚀 Start Professional Analysis
                      </>
                    )}
                  </Button>

                  {/* Analysis Progress Indicator */}
                  {isAnalyzing && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <Icons.Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        <span className="text-sm font-medium text-blue-800">
                          Gemini AI is analyzing your chart...
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-blue-700">
                        <div className="flex items-center">
                          <Icons.CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                          Processing image with OCR
                        </div>
                        <div className="flex items-center">
                          <Icons.Loader2 className="h-3 w-3 text-blue-500 mr-2 animate-spin" />
                          Analyzing technical indicators
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Icons.Clock className="h-3 w-3 mr-2" />
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
                  <Icons.AlertCircle className="h-5 w-5 text-red-500 mr-2" />
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
                  <Icons.TrendingUp className="h-5 w-5 mr-2" />
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
                      <Icons.Clock className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-xl font-bold text-blue-800">{Math.round((analysisResult.processingTime || 0) / 1000)}s</div>
                    <div className="text-xs text-blue-600 mt-1">
                      {(analysisResult.processingTime || 0) < 60000 ? '⚡ Fast' : '🔄 Processing'}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 font-medium">Signal Quality</span>
                      <Icons.Target className="h-4 w-4 text-green-500" />
                    </div>
                    <div className={`text-xl font-bold ${getConfidenceColor(analysisResult.analysis.overallConfidence)}`}>
                      {analysisResult.analysis.overallConfidence}%
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {analysisResult.analysis.overallConfidence >= 80 ? '🎯 High Quality' :
                       analysisResult.analysis.overallConfidence >= 70 ? '✅ Good Quality' : '⚠️ Low Quality'}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-700 font-medium">Detected Asset</span>
                      <Icons.BarChart3 className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="text-xl font-bold text-purple-800">
                      {analysisResult.analysis.detectedAsset || 'Auto-detected'}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      {analysisResult.analysis.detectedTimeframe || 'Multi-timeframe'}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-700 font-medium">Analysis Status</span>
                      <Icons.CheckCircle className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="text-xl font-bold text-orange-800">
                      {analysisResult.success ? 'SUCCESS' : 'FAILED'}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      {analysisResult.success ? '✅ Ready to Trade' : '❌ Retry Analysis'}
                    </div>
                  </div>
                </div>

                {/* SIGNAL QUALITY SCORE - PROMINENT DISPLAY */}
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-8 text-white text-center shadow-2xl">
                    <h3 className="text-2xl font-bold mb-4">🎯 SIGNAL QUALITY SCORE</h3>
                    <div className="text-8xl font-black mb-4">
                      {Math.round((analysisResult.analysis.overallConfidence + (analysisResult.analysis.tradingSignal?.confidence || 70) +
                        (analysisResult.analysis.predictions?.reduce((sum, p) => sum + p.confidence, 0) || 210) / 3) / 3)}%
                    </div>
                    <div className="text-2xl font-bold mb-6">
                      {Math.round((analysisResult.analysis.overallConfidence + (analysisResult.analysis.tradingSignal?.confidence || 70) +
                        (analysisResult.analysis.predictions?.reduce((sum, p) => sum + p.confidence, 0) || 210) / 3) / 3) >= 80
                        ? '🎯 EXCELLENT' :
                        Math.round((analysisResult.analysis.overallConfidence + (analysisResult.analysis.tradingSignal?.confidence || 70) +
                        (analysisResult.analysis.predictions?.reduce((sum, p) => sum + p.confidence, 0) || 210) / 3) / 3) >= 70
                        ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}
                    </div>
                    <div className="max-w-md mx-auto">
                      <Progress
                        value={Math.round((analysisResult.analysis.overallConfidence + (analysisResult.analysis.tradingSignal?.confidence || 70) +
                          (analysisResult.analysis.predictions?.reduce((sum, p) => sum + p.confidence, 0) || 210) / 3) / 3)}
                        className="h-4"
                      />
                    </div>
                    <div className="text-lg mt-4 text-emerald-100">
                      Based on AI confidence, signal strength, and prediction accuracy
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
                      <span className="text-sm text-gray-600">Detected Timeframe</span>
                      <div className="font-medium">{analysisResult.analysis.detectedTimeframe || 'Multi-TF'}</div>
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
                {analysisResult.analysis.technicalIndicators && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Icons.Activity className="h-5 w-5 mr-2" />
                      Technical Indicators
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <div className="text-sm text-blue-600 font-medium">EMA</div>
                        <div className="font-bold text-blue-800">{analysisResult.analysis.technicalIndicators.ema}</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <div className="text-sm text-green-600 font-medium">SMA</div>
                        <div className="font-bold text-green-800">{analysisResult.analysis.technicalIndicators.sma}</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <div className="text-sm text-purple-600 font-medium">Stochastic</div>
                        <div className="font-bold text-purple-800">{analysisResult.analysis.technicalIndicators.stochastic}</div>
                      </div>
                    </div>
                  </div>
                )}



                {/* Next 3 Candles Predictions - ENHANCED PROMINENT DISPLAY */}
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl p-6 text-white">
                    <h3 className="text-2xl font-bold mb-2 flex items-center">
                      <Icons.Target className="h-8 w-8 mr-3" />
                      🔮 NEXT 3 CANDLES PREDICTIONS
                    </h3>
                    <p className="text-purple-100">AI-powered directional analysis for immediate trading decisions</p>
                  </div>

                  <div className="bg-white border-2 border-purple-200 rounded-b-xl p-6 shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {analysisResult.analysis.predictions?.map((prediction, index) => (
                        <div
                          key={index}
                          className={`relative border-3 rounded-2xl p-6 shadow-2xl transition-all hover:scale-105 ${
                            prediction.direction === 'UP'
                              ? 'bg-gradient-to-br from-green-50 via-green-100 to-emerald-200 border-green-400'
                              : 'bg-gradient-to-br from-red-50 via-red-100 to-rose-200 border-red-400'
                          }`}
                        >
                          {/* Prominent Direction Indicator */}
                          <div className="text-center mb-6">
                            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full shadow-lg mb-3 ${
                              prediction.direction === 'UP' ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {prediction.direction === 'UP' ? (
                                <Icons.ArrowUp className="h-10 w-10 text-white" />
                              ) : (
                                <Icons.ArrowDown className="h-10 w-10 text-white" />
                              )}
                            </div>
                            <div className="text-3xl font-black text-gray-800 mb-1">
                              CANDLE {prediction.candle}
                            </div>
                            <Badge
                              className={`text-lg px-4 py-2 font-black ${
                                prediction.direction === 'UP'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-red-600 text-white'
                              }`}
                            >
                              {prediction.direction}
                            </Badge>
                          </div>

                          {/* Massive Confidence Display */}
                          <div className="text-center mb-6">
                            <div className="text-5xl font-black mb-2" style={{
                              color: prediction.confidence >= 80 ? '#059669' :
                                     prediction.confidence >= 70 ? '#d97706' : '#dc2626'
                            }}>
                              {prediction.confidence}%
                            </div>
                            <div className="text-sm font-bold text-gray-600 mb-3">CONFIDENCE</div>
                            <Progress
                              value={prediction.confidence}
                              className="h-4 mb-2"
                            />
                            <div className={`text-sm font-bold ${
                              prediction.confidence >= 80 ? 'text-green-600' :
                              prediction.confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {prediction.confidence >= 80 ? '🎯 EXCELLENT SIGNAL' :
                               prediction.confidence >= 70 ? '✅ GOOD SIGNAL' : '⚠️ WEAK SIGNAL'}
                            </div>
                          </div>

                          {/* AI Analysis */}
                          <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-inner">
                            <div className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                              <span className="mr-2">🧠</span>
                              AI ANALYSIS
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {prediction.reasoning}
                            </div>
                          </div>

                          {/* Quality Badge */}
                          <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
                            prediction.confidence >= 80 ? 'bg-green-500 text-white' :
                            prediction.confidence >= 70 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {prediction.confidence >= 80 ? 'HIGH' :
                             prediction.confidence >= 70 ? 'GOOD' : 'LOW'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Overall Prediction Summary */}
                    <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-blue-200">
                      <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                        <Icons.BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                        PREDICTION SUMMARY
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {analysisResult.analysis.predictions?.filter(p => p.direction === 'UP').length || 0}
                          </div>
                          <div className="text-sm text-gray-600">UP Signals</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">
                            {analysisResult.analysis.predictions?.filter(p => p.direction === 'DOWN').length || 0}
                          </div>
                          <div className="text-sm text-gray-600">DOWN Signals</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round((analysisResult.analysis.predictions?.reduce((sum, p) => sum + p.confidence, 0) || 0) / 3)}%
                          </div>
                          <div className="text-sm text-gray-600">Avg Confidence</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trading Signal - ULTRA PROMINENT DISPLAY */}
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl p-6 text-white">
                    <h3 className="text-2xl font-bold mb-2 flex items-center">
                      <Icons.Activity className="h-8 w-8 mr-3" />
                      🎯 PROFESSIONAL TRADING SIGNAL
                    </h3>
                    <p className="text-blue-100">AI-generated signal for immediate trading action</p>
                  </div>

                  <div className="bg-white border-2 border-blue-200 rounded-b-xl p-8 shadow-2xl">
                    {/* MASSIVE Signal Display */}
                    <div className="text-center mb-8">
                      <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full shadow-2xl mb-6 ${
                        analysisResult.analysis.tradingSignal.action === 'BUY' ? 'bg-green-500' :
                        analysisResult.analysis.tradingSignal.action === 'SELL' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}>
                        <div className="text-center">
                          {getSignalIcon(analysisResult.analysis.tradingSignal.action)}
                          <div className="text-white font-black text-lg mt-1">
                            {analysisResult.analysis.tradingSignal.action}
                          </div>
                        </div>
                      </div>

                      <Badge
                        className={`${getSignalColor(analysisResult.analysis.tradingSignal.action)} text-3xl px-8 py-4 font-black mb-4`}
                      >
                        {analysisResult.analysis.tradingSignal.action} SIGNAL
                      </Badge>

                      {/* GIANT Confidence Display */}
                      <div className="mb-6">
                        <div className={`text-7xl font-black mb-2 ${getConfidenceColor(analysisResult.analysis.tradingSignal.confidence)}`}>
                          {analysisResult.analysis.tradingSignal.confidence}%
                        </div>
                        <div className="text-xl font-bold text-gray-600 mb-4">SIGNAL CONFIDENCE</div>
                        <div className="max-w-md mx-auto">
                          <Progress
                            value={analysisResult.analysis.tradingSignal.confidence}
                            className="h-6"
                          />
                        </div>
                        <div className={`text-lg font-bold mt-3 ${
                          analysisResult.analysis.tradingSignal.confidence >= 80 ? 'text-green-600' :
                          analysisResult.analysis.tradingSignal.confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {analysisResult.analysis.tradingSignal.confidence >= 80 ? '🎯 EXCELLENT SIGNAL' :
                           analysisResult.analysis.tradingSignal.confidence >= 70 ? '✅ GOOD SIGNAL' : '⚠️ WEAK SIGNAL'}
                        </div>
                      </div>
                    </div>

                    {/* Key Trading Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 text-center">
                        <div className="text-lg font-bold text-blue-700 mb-2">💰 CURRENT PRICE</div>
                        <div className="text-3xl font-black text-blue-800">{analysisResult.analysis.currentPrice || 'N/A'}</div>
                        <div className="text-sm text-blue-600 mt-2">Market Price</div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 text-center">
                        <div className="text-lg font-bold text-purple-700 mb-2">⏱️ TIMEFRAME</div>
                        <div className="text-3xl font-black text-purple-800">
                          {analysisResult.analysis.detectedTimeframe || 'Multi-TF'}
                        </div>
                        <div className="text-sm text-purple-600 mt-2">Signal Validity</div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200 text-center">
                        <div className="text-lg font-bold text-orange-700 mb-2">📈 TREND</div>
                        <div className="text-3xl font-black text-orange-800">{analysisResult.analysis.trend || 'N/A'}</div>
                        <div className="text-sm text-orange-600 mt-2">Market Direction</div>
                      </div>
                    </div>

                    {/* AI Reasoning - Prominent Display */}
                    <div className="bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl p-6 border-2 border-indigo-200 mb-6">
                      <div className="flex items-center mb-4">
                        <span className="text-xl font-bold text-gray-800 mr-3">🧠 AI ANALYSIS SUMMARY</span>
                        <Badge variant="outline" className="text-sm px-3 py-1">Gemini Pro Vision</Badge>
                      </div>
                      <div className="text-lg text-gray-700 leading-relaxed font-medium">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="font-bold text-gray-800 mb-2">📊 Market Analysis:</div>
                            <div className="text-base">
                              The AI has analyzed the chart and detected a <strong>{analysisResult.analysis.tradingSignal.action}</strong> signal 
                              with <strong>{analysisResult.analysis.tradingSignal.confidence}%</strong> confidence in a <strong>{analysisResult.analysis.marketCondition}</strong> market condition.
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 mb-2">🎯 Signal Strength:</div>
                            <div className="text-base">
                              Overall confidence: <strong>{analysisResult.analysis.overallConfidence}%</strong><br/>
                              Current trend: <strong>{analysisResult.analysis.trend}</strong><br/>
                              {analysisResult.analysis.predictions && (
                                <>Next 3 candles: <strong>{analysisResult.analysis.predictions.length} predictions</strong></>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trust Indicators */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center justify-center space-x-8 text-sm">
                        <span className="flex items-center text-green-600 font-semibold">
                          <Icons.CheckCircle className="h-5 w-5 mr-2" />
                          AI VERIFIED
                        </span>
                        <span className="flex items-center text-blue-600 font-semibold">
                          <Icons.Target className="h-5 w-5 mr-2" />
                          MULTI-INDICATOR
                        </span>
                        <span className="flex items-center text-purple-600 font-semibold">
                          <Icons.BarChart3 className="h-5 w-5 mr-2" />
                          PROFESSIONAL GRADE
                        </span>
                        <span className="text-gray-500 font-medium">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quality Score Section - NEW ENHANCED DISPLAY */}
                {analysisResult.processingTime && (
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl p-6 text-white">
                      <h3 className="text-2xl font-bold mb-2 flex items-center">
                        <Icons.Gauge className="h-8 w-8 mr-3" />
                        🎯 SIGNAL QUALITY SCORE
                      </h3>
                      <p className="text-indigo-100">Comprehensive analysis quality assessment</p>
                    </div>

                    <div className="bg-white border-2 border-indigo-200 rounded-b-xl p-8 shadow-2xl">
                      {(() => {
                        const qualityScore = calculateQualityScore(analysisResult.analysis, analysisResult.processingTime);
                        const scoreClass = getScoreClass(qualityScore);
                        const scoreLabel = getScoreLabel(qualityScore);
                        
                        return (
                          <>
                            {/* GIANT Quality Score Display */}
                            <div className="text-center mb-8">
                              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full shadow-2xl mb-6 ${
                                qualityScore >= 80 ? 'bg-green-500' :
                                qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}>
                                <div className="text-center">
                                  <div className="text-white font-black text-4xl">{qualityScore}</div>
                                  <div className="text-white font-bold text-sm">SCORE</div>
                                </div>
                              </div>

                              <Badge className={`${scoreClass} text-2xl px-6 py-3 font-black mb-4`}>
                                {scoreLabel}
                              </Badge>

                              <div className="max-w-md mx-auto mb-4">
                                <Progress value={qualityScore} className="h-6" />
                              </div>

                              <div className={`text-lg font-bold ${
                                qualityScore >= 80 ? 'text-green-600' :
                                qualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {qualityScore >= 80 ? '🏆 PREMIUM QUALITY ANALYSIS' :
                                 qualityScore >= 60 ? '✅ GOOD QUALITY ANALYSIS' : '⚠️ BASIC QUALITY ANALYSIS'}
                              </div>
                            </div>

                            {/* Quality Breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                              <div className={`p-4 rounded-lg border-2 ${
                                analysisResult.processingTime < 60000 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="text-center">
                                  <div className={`text-2xl mb-2 ${
                                    analysisResult.processingTime < 60000 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {analysisResult.processingTime < 60000 ? '✅' : '❌'}
                                  </div>
                                  <div className="text-sm font-bold text-gray-700">Processing Speed</div>
                                  <div className="text-xs text-gray-600">{(analysisResult.processingTime / 1000).toFixed(1)}s</div>
                                </div>
                              </div>

                              <div className={`p-4 rounded-lg border-2 ${
                                analysisResult.analysis.overallConfidence >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="text-center">
                                  <div className={`text-2xl mb-2 ${
                                    analysisResult.analysis.overallConfidence >= 70 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {analysisResult.analysis.overallConfidence >= 70 ? '✅' : '❌'}
                                  </div>
                                  <div className="text-sm font-bold text-gray-700">Overall Confidence</div>
                                  <div className="text-xs text-gray-600">{analysisResult.analysis.overallConfidence}%</div>
                                </div>
                              </div>

                              <div className={`p-4 rounded-lg border-2 ${
                                analysisResult.analysis.predictions && analysisResult.analysis.predictions.length === 3 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="text-center">
                                  <div className={`text-2xl mb-2 ${
                                    analysisResult.analysis.predictions && analysisResult.analysis.predictions.length === 3 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {analysisResult.analysis.predictions && analysisResult.analysis.predictions.length === 3 ? '✅' : '❌'}
                                  </div>
                                  <div className="text-sm font-bold text-gray-700">Predictions</div>
                                  <div className="text-xs text-gray-600">{analysisResult.analysis.predictions?.length || 0}/3</div>
                                </div>
                              </div>

                              <div className={`p-4 rounded-lg border-2 ${
                                analysisResult.analysis.tradingSignal.confidence >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="text-center">
                                  <div className={`text-2xl mb-2 ${
                                    analysisResult.analysis.tradingSignal.confidence >= 70 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {analysisResult.analysis.tradingSignal.confidence >= 70 ? '✅' : '❌'}
                                  </div>
                                  <div className="text-sm font-bold text-gray-700">Signal Strength</div>
                                  <div className="text-xs text-gray-600">{analysisResult.analysis.tradingSignal.confidence}%</div>
                                </div>
                              </div>

                              <div className={`p-4 rounded-lg border-2 ${
                                analysisResult.analysis.technicalIndicators ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="text-center">
                                  <div className={`text-2xl mb-2 ${
                                    analysisResult.analysis.technicalIndicators ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {analysisResult.analysis.technicalIndicators ? '✅' : '❌'}
                                  </div>
                                  <div className="text-sm font-bold text-gray-700">Tech Indicators</div>
                                  <div className="text-xs text-gray-600">
                                    {analysisResult.analysis.technicalIndicators ? 'Available' : 'Missing'}
                                  </div>
                                </div>
                              </div>

                              <div className={`p-4 rounded-lg border-2 ${
                                analysisResult.analysis.supportLevels && analysisResult.analysis.resistanceLevels ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="text-center">
                                  <div className={`text-2xl mb-2 ${
                                    analysisResult.analysis.supportLevels && analysisResult.analysis.resistanceLevels ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {analysisResult.analysis.supportLevels && analysisResult.analysis.resistanceLevels ? '✅' : '❌'}
                                  </div>
                                  <div className="text-sm font-bold text-gray-700">S/R Levels</div>
                                  <div className="text-xs text-gray-600">
                                    {analysisResult.analysis.supportLevels && analysisResult.analysis.resistanceLevels ? 'Detected' : 'Missing'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Copy Quality Report Button */}
                            <div className="text-center">
                              <Button
                                onClick={() => copyToClipboard(`
TRADAI Quality Report
====================
Overall Score: ${qualityScore}% (${scoreLabel})
Processing Time: ${((analysisResult.processingTime || 0) / 1000).toFixed(1)}s
Overall Confidence: ${analysisResult.analysis.overallConfidence}%
Signal Confidence: ${analysisResult.analysis.tradingSignal.confidence}%
Predictions: ${analysisResult.analysis.predictions?.length || 0}/3
Technical Indicators: ${analysisResult.analysis.technicalIndicators ? 'Available' : 'Missing'}
Support/Resistance: ${analysisResult.analysis.supportLevels && analysisResult.analysis.resistanceLevels ? 'Detected' : 'Missing'}

Generated: ${new Date().toLocaleString()}
                                `.trim())}
                                variant="outline"
                                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                              >
                                <Icons.Copy className="h-4 w-4 mr-2" />
                                Copy Quality Report
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Processing Time and Metadata */}
                <div className="mb-8">
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <Icons.Info className="h-5 w-5 mr-2 text-blue-600" />
                        Analysis Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <div className="text-sm text-blue-600 font-medium">Processing Time</div>
                          <div className="text-lg font-bold text-blue-800">
                            {analysisResult.processingTime ? `${(analysisResult.processingTime / 1000).toFixed(1)}s` : 'N/A'}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <div className="text-sm text-green-600 font-medium">Detected Asset</div>
                          <div className="text-lg font-bold text-green-800">
                            {analysisResult.analysis.detectedAsset || 'Unknown'}
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                          <div className="text-sm text-purple-600 font-medium">Timeframe</div>
                          <div className="text-lg font-bold text-purple-800">
                            {analysisResult.analysis.detectedTimeframe || 'Multi-TF'}
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                          <div className="text-sm text-orange-600 font-medium">Market Condition</div>
                          <div className="text-lg font-bold text-orange-800">
                            {analysisResult.analysis.marketCondition}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    onClick={resetUpload}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Icons.Upload className="h-4 w-4 mr-2" />
                    Analyze Another Chart
                  </Button>

                  <Button
                    onClick={() => window.print()}
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Icons.FileImage className="h-4 w-4 mr-2" />
                    Save Analysis Report
                  </Button>

                  <Button
                    onClick={() => {
                      const analysisText = `
TRADAI Analysis Report
======================
Asset: ${analysisResult.analysis.detectedAsset || 'Unknown'}
Timeframe: ${analysisResult.analysis.detectedTimeframe || 'Multi-TF'}
Signal: ${analysisResult.analysis.tradingSignal.action}
Signal Confidence: ${analysisResult.analysis.tradingSignal.confidence}%
Overall Confidence: ${analysisResult.analysis.overallConfidence}%
Market Condition: ${analysisResult.analysis.marketCondition}
Current Price: ${analysisResult.analysis.currentPrice || 'N/A'}
Trend: ${analysisResult.analysis.trend || 'N/A'}

Next 3 Candle Predictions:
${analysisResult.analysis.predictions?.map(p =>
  `Candle ${p.candle}: ${p.direction} (${p.confidence}%) - ${p.reasoning}`
).join('\n') || 'No predictions available'}

Technical Indicators:
${analysisResult.analysis.technicalIndicators ? 
  `EMA: ${analysisResult.analysis.technicalIndicators.ema}
SMA: ${analysisResult.analysis.technicalIndicators.sma}
Stochastic: ${analysisResult.analysis.technicalIndicators.stochastic}` : 'Not available'}

Support Levels: ${analysisResult.analysis.supportLevels?.join(', ') || 'Not detected'}
Resistance Levels: ${analysisResult.analysis.resistanceLevels?.join(', ') || 'Not detected'}

Generated: ${new Date().toLocaleString()}
Processing Time: ${analysisResult.processingTime ? `${(analysisResult.processingTime / 1000).toFixed(1)}s` : 'N/A'}
                      `.trim();
                      copyToClipboard(analysisText);
                    }}
                    variant="default"
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  >
                    <Icons.Target className="h-4 w-4 mr-2" />
                    Copy Trading Signal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Debug Section */}
          <Card className="mb-8 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Icons.Settings className="h-5 w-5 mr-2 text-gray-600" />
                🔧 Debug & Troubleshooting
              </CardTitle>
              <CardDescription>
                API connection status and debugging tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">API Endpoint</div>
                  <div className="text-xs text-gray-600 font-mono break-all">
                    {API_BASE_URL}/api/gemini-vision-signal
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Health Status</div>
                  <div className={`text-xs font-medium ${
                    healthStatus.status === 'OK' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {healthStatus.status === 'OK' ? '✅ Online' : '❌ Offline'}
                    {healthStatus.timestamp && (
                      <div className="text-gray-500 mt-1">
                        Last check: {new Date(healthStatus.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={checkApiHealth}
                  disabled={isCheckingHealth}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {isCheckingHealth ? (
                    <Icons.Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Icons.RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Test Health
                </Button>
                
                <Button
                  onClick={() => {
                    const debugInfo = {
                      timestamp: new Date().toISOString(),
                      apiEndpoint: API_BASE_URL,
                      healthStatus: healthStatus,
                      healthError: healthError,
                      lastAnalysis: analysisResult ? {
                        success: analysisResult.success,
                        processingTime: analysisResult.processingTime,
                        overallConfidence: analysisResult.analysis?.overallConfidence,
                        predictionsCount: analysisResult.analysis?.predictions?.length || 0
                      } : null,
                      browserInfo: {
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        platform: navigator.platform
                      }
                    };
                    copyToClipboard(JSON.stringify(debugInfo, null, 2));
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Icons.Download className="h-3 w-3 mr-1" />
                  Export Debug Info
                </Button>
                
                <Button
                  onClick={() => {
                    console.clear();
                    console.log('🔧 TRADAI Debug Mode Activated');
                    console.log('API Base URL:', API_BASE_URL);
                    console.log('Health Status:', healthStatus);
                    console.log('Health Error:', healthError);
                    console.log('Last Analysis Result:', analysisResult);
                    alert('Debug information logged to browser console (F12)');
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Icons.Info className="h-3 w-3 mr-1" />
                  Console Debug
                </Button>
              </div>
              
              {healthError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-red-800 mb-1">Connection Error:</div>
                  <div className="text-xs text-red-700">{healthError}</div>
                  <div className="text-xs text-red-600 mt-2">
                    <strong>Troubleshooting:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Check if {API_BASE_URL} is accessible in a new tab</li>
                      <li>Verify your internet connection</li>
                      <li>Try disabling browser extensions temporarily</li>
                      <li>Check if firewall/antivirus is blocking the request</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Professional Disclaimer */}
          <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Icons.AlertCircle className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
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
                <Icons.BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">TRADAI</span>
                <Badge variant="outline" className="text-xs">Powered by Gemini AI</Badge>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span className="flex items-center">
                  <Icons.CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  Professional Grade Analysis
                </span>
                <span className="flex items-center">
                  <Icons.Target className="h-4 w-4 text-blue-500 mr-1" />
                  Multi-Timeframe Signals
                </span>
                <span className="flex items-center">
                  <Icons.Activity className="h-4 w-4 text-purple-500 mr-1" />
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

// Helper functions for quality score calculation
function calculateQualityScore(analysis: any, processingTime: number): number {
  let score = 0;
  let maxScore = 6;

  // Processing speed (under 60 seconds)
  if (processingTime < 60000) score++;
  
  // Overall confidence (70% or higher)
  if (analysis.overallConfidence >= 70) score++;
  
  // Complete predictions (all 3 candles)
  if (analysis.predictions && analysis.predictions.length === 3) score++;
  
  // Trading signal confidence (70% or higher)
  if (analysis.tradingSignal.confidence >= 70) score++;
  
  // Technical indicators available
  if (analysis.technicalIndicators) score++;
  
  // Support and resistance levels detected
  if (analysis.supportLevels && analysis.resistanceLevels) score++;

  return Math.round((score / maxScore) * 100);
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'bg-green-500 text-white';
  if (score >= 60) return 'bg-yellow-500 text-white';
  return 'bg-red-500 text-white';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'EXCELLENT';
  if (score >= 60) return 'GOOD';
  return 'NEEDS IMPROVEMENT';
}


