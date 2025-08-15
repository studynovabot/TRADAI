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
  ArrowRight: (LucideIcons as any).ArrowRight,
  Minus: (LucideIcons as any).Minus,
  Loader2: (LucideIcons as any).Loader2,
  Copy: (LucideIcons as any).Copy,
  Info: (LucideIcons as any).Info,
  Gauge: (LucideIcons as any).Gauge,
  RefreshCw: (LucideIcons as any).RefreshCw,
  Download: (LucideIcons as any).Download,
  Settings: (LucideIcons as any).Settings
};

interface Scenario {
  rank: number;
  probability: number;
  path: string[];
  reasoning: string;
}

interface AnalysisResult {
  success: boolean;
  analysisType: string;
  
  // Multi-Scenario Analysis Results
  signal?: string;
  signalConfidence?: number;
  overallConfidence?: number;
  trend?: string;
  marketCondition?: string;
  
  // Multi-Scenario Data
  scenarios?: Scenario[];
  mostLikelyPath?: string[];
  confluenceFactors?: string[];
  
  // Technical Analysis
  technicalAnalysis?: string;
  supportLevels?: string[];
  resistanceLevels?: string[];
  currentPrice?: string;
  
  // Metadata
  timestamp?: string;
  metadata?: any;
  serviceStats?: any;
  debug?: any;
  
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

  // Use relative URLs for same-origin requests to avoid CORS issues
  const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

  // Health check function
  const checkApiHealth = async () => {
    setIsCheckingHealth(true);
    setHealthError(null);
    
    try {
      console.log('Testing health endpoint...');
      
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Health check response:', data);
      
      setHealthStatus({
        status: data.status || 'Unknown',
        timestamp: new Date().toISOString(),
        services: data.services || {}
      });
      
      return data.status === 'OK';
    } catch (error: any) {
      console.error('Health check error:', error);
      setHealthError(error.message);
      setHealthStatus({
        status: 'ERROR',
        timestamp: new Date().toISOString()
      });
      return false;
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Check health on component mount
  useEffect(() => {
    checkApiHealth();
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
  };

  const analyzeChart = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      console.log('🚀 Starting Multi-Scenario Analysis...');
      console.log('Using endpoint: /api/multi-scenario-analysis (relative URL)');

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('asset', 'Auto-detect');
      formData.append('timeframe', 'Auto-detect');
      formData.append('platform', 'Trading Platform');

      const response = await fetch('/api/multi-scenario-analysis', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Multi-scenario analysis completed:', result);

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalysisResult(result);
    } catch (error: any) {
      console.error('❌ Analysis error:', error);
      setError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper functions
  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY': return <Icons.ArrowUp className="h-5 w-5 text-green-500" />;
      case 'SELL': return <Icons.ArrowDown className="h-5 w-5 text-red-500" />;
      case 'NO_TRADE': return <Icons.Minus className="h-5 w-5 text-gray-500" />;
      default: return <Icons.Activity className="h-5 w-5" />;
    }
  };

  // Parse mostLikelyPath - handle both string and array formats
  const parseMostLikelyPath = (analysisResult: any) => {
    // Prefer the array format if available
    if (analysisResult.mostLikelyPathArray && Array.isArray(analysisResult.mostLikelyPathArray)) {
      return analysisResult.mostLikelyPathArray;
    }
    
    const mostLikelyPath = analysisResult.mostLikelyPath;
    if (Array.isArray(mostLikelyPath)) {
      return mostLikelyPath;
    }
    if (typeof mostLikelyPath === 'string') {
      // Extract path from string like "DOWN → UP → DOWN (72%)"
      const pathMatch = mostLikelyPath.match(/^([A-Z]+(?:\s*→\s*[A-Z]+)*)/);
      if (pathMatch) {
        return pathMatch[1].split(/\s*→\s*/);
      }
      // Fallback: split by arrow or return as single item
      return mostLikelyPath.includes('→') ? mostLikelyPath.split('→').map(s => s.trim()) : [mostLikelyPath];
    }
    return [];
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'bg-green-100 text-green-800 border-green-200';
      case 'SELL': return 'bg-red-100 text-red-800 border-red-200';
      case 'NO_TRADE': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <Icons.ArrowUp className="h-4 w-4 text-green-500" />;
      case 'DOWN': return <Icons.ArrowDown className="h-4 w-4 text-red-500" />;
      default: return <Icons.Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Quality score calculation for multi-scenario analysis
  const calculateQualityScore = (analysis: any, processingTime: number) => {
    let score = 0;
    let maxScore = 8;

    if (processingTime < 60000) score++;
    if (analysis.overallConfidence >= 60) score++;
    if (analysis.scenarios && analysis.scenarios.length >= 2) score++;
    if (analysis.signalConfidence >= 60) score++;
    if (analysis.mostLikelyPath) score++;
    if (analysis.confluenceFactors) score++;
    if (analysis.supportLevels && analysis.resistanceLevels) score++;
    if (analysis.analysisType === 'multi-scenario') score++;

    return Math.round((score / maxScore) * 100);
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '🎯 EXCELLENT';
    if (score >= 70) return '✅ GOOD';
    return '⚠️ NEEDS IMPROVEMENT';
  };

  const getScoreClass = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <>
      <Head>
        <title>TRADAI - Multi-Scenario Chart Analyzer</title>
        <meta name="description" content="AI-powered multi-scenario trading chart analysis using Google Gemini" />
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
                <Badge variant="outline" className="ml-3">Multi-Scenario AI</Badge>
              </div>

              <div className="flex items-center space-x-2">
                {healthStatus.status === 'OK' ? (
                  <>
                    <Icons.CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">System Online</span>
                  </>
                ) : (
                  <>
                    <Icons.AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">System Check Required</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Upload Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Icons.Upload className="h-6 w-6 mr-2 text-blue-600" />
                Upload Trading Chart
              </CardTitle>
              <CardDescription>
                Upload a screenshot of your trading chart for AI-powered multi-scenario analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {previewUrl ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Chart preview"
                      className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                    />
                    <div className="flex justify-center space-x-4">
                      <Button
                        onClick={analyzeChart}
                        disabled={isAnalyzing}
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {isAnalyzing ? (
                          <>
                            <Icons.Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Analyzing Chart...
                          </>
                        ) : (
                          <>
                            <Icons.Activity className="h-5 w-5 mr-2" />
                            Generate Multi-Scenario Analysis
                          </>
                        )}
                      </Button>
                      <Button onClick={resetUpload} variant="outline" size="lg">
                        <Icons.Upload className="h-5 w-5 mr-2" />
                        Upload Different Chart
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Icons.FileImage className="h-16 w-16 mx-auto text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Drop your trading chart here
                      </p>
                      <p className="text-gray-600 mb-4">
                        or click to browse files (PNG, JPG, JPEG - Max 10MB)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button asChild size="lg">
                          <span className="cursor-pointer">
                            <Icons.Upload className="h-5 w-5 mr-2" />
                            Choose File
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <Icons.AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700">{error}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="space-y-8">
              {/* Main Signal Card */}
              <Card className="border-2 border-blue-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="text-2xl flex items-center">
                    <Icons.Target className="h-8 w-8 mr-3" />
                    🎯 MULTI-SCENARIO TRADING SIGNAL
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    AI-powered analysis with multiple market scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Primary Signal */}
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full shadow-lg mb-4 ${
                        analysisResult.signal === 'BUY' ? 'bg-green-500' :
                        analysisResult.signal === 'SELL' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}>
                        {getSignalIcon(analysisResult.signal || 'NO_TRADE')}
                        <span className="text-white font-bold text-lg ml-2">
                          {analysisResult.signal || 'NO_TRADE'}
                        </span>
                      </div>
                      <Badge className={`${getSignalColor(analysisResult.signal || 'NO_TRADE')} text-lg px-4 py-2 font-bold`}>
                        {analysisResult.signal || 'NO_TRADE'} SIGNAL
                      </Badge>
                    </div>

                    {/* Signal Confidence */}
                    <div className="text-center">
                      <div className={`text-6xl font-black mb-2 ${getConfidenceColor(analysisResult.signalConfidence || 0)}`}>
                        {analysisResult.signalConfidence || 0}%
                      </div>
                      <div className="text-sm font-bold text-gray-600 mb-3">SIGNAL CONFIDENCE</div>
                      <Progress value={analysisResult.signalConfidence || 0} className="h-4" />
                    </div>

                    {/* Overall Confidence */}
                    <div className="text-center">
                      <div className={`text-6xl font-black mb-2 ${getConfidenceColor(analysisResult.overallConfidence || 0)}`}>
                        {analysisResult.overallConfidence || 0}%
                      </div>
                      <div className="text-sm font-bold text-gray-600 mb-3">OVERALL CONFIDENCE</div>
                      <Progress value={analysisResult.overallConfidence || 0} className="h-4" />
                    </div>
                  </div>

                  {/* Market Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium">Current Price</div>
                      <div className="text-xl font-bold text-blue-800">
                        {analysisResult.currentPrice || 'Auto-detected'}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="text-sm text-purple-600 font-medium">Market Trend</div>
                      <div className="text-xl font-bold text-purple-800 flex items-center">
                        {getTrendIcon(analysisResult.trend || 'NEUTRAL')}
                        <span className="ml-2">{analysisResult.trend || 'NEUTRAL'}</span>
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <div className="text-sm text-orange-600 font-medium">Market Condition</div>
                      <div className="text-xl font-bold text-orange-800">
                        {analysisResult.marketCondition || 'Normal'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Multi-Scenario Analysis */}
              {analysisResult.scenarios && analysisResult.scenarios.length > 0 && (
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <CardTitle className="text-xl flex items-center">
                      <Icons.Activity className="h-6 w-6 mr-2" />
                      🔮 MULTI-SCENARIO ANALYSIS
                    </CardTitle>
                    <CardDescription className="text-purple-100">
                      Multiple market scenarios with probability rankings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {analysisResult.scenarios.map((scenario, index) => (
                        <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="font-bold">
                              Scenario #{scenario.rank}
                            </Badge>
                            <div className="text-lg font-bold text-blue-600">
                              {scenario.probability}% Probability
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">Market Path:</div>
                            <div className="flex items-center space-x-2">
                              {scenario.path.map((step, stepIndex) => (
                                <div key={stepIndex} className="flex items-center">
                                  <Badge variant="secondary" className="text-xs">
                                    {step}
                                  </Badge>
                                  {stepIndex < scenario.path.length - 1 && (
                                    <Icons.ArrowRight className="h-3 w-3 mx-1 text-gray-400" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-sm text-gray-700">
                            <strong>AI Reasoning:</strong> {scenario.reasoning}
                          </div>
                          <Progress value={scenario.probability} className="h-2 mt-2" />
                        </div>
                      ))}
                    </div>

                    {/* Most Likely Path */}
                    {analysisResult.mostLikelyPath && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
                        <div className="text-lg font-bold text-green-800 mb-2 flex items-center">
                          <Icons.Target className="h-5 w-5 mr-2" />
                          🎯 MOST LIKELY PATH
                        </div>
                        <div className="flex items-center space-x-2">
                          {parseMostLikelyPath(analysisResult).map((step, index) => (
                            <div key={index} className="flex items-center">
                              <Badge className="bg-green-600 text-white font-bold">
                                {step}
                              </Badge>
                              {index < parseMostLikelyPath(analysisResult).length - 1 && (
                                <Icons.ArrowRight className="h-4 w-4 mx-2 text-green-600" />
                              )}
                            </div>
                          ))}
                        </div>
                        {/* Show original string if it contains probability */}
                        {typeof analysisResult.mostLikelyPath === 'string' && analysisResult.mostLikelyPath.includes('%') && (
                          <div className="mt-2 text-sm text-green-700 font-medium">
                            {analysisResult.mostLikelyPath}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Technical Analysis */}
              {analysisResult.technicalAnalysis && (
                <Card className="border-2 border-indigo-200">
                  <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                    <CardTitle className="text-xl flex items-center">
                      <Icons.BarChart3 className="h-6 w-6 mr-2" />
                      📊 TECHNICAL ANALYSIS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="prose max-w-none">
                      <div className="text-gray-700 leading-relaxed">
                        {analysisResult.technicalAnalysis}
                      </div>
                    </div>

                    {/* Support and Resistance Levels */}
                    {(analysisResult.supportLevels || analysisResult.resistanceLevels) && (
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysisResult.supportLevels && (
                          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <div className="text-sm font-bold text-green-700 mb-2">📈 Support Levels</div>
                            <div className="space-y-1">
                              {analysisResult.supportLevels.map((level, index) => (
                                <Badge key={index} variant="outline" className="mr-2 text-green-700 border-green-300">
                                  {level}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {analysisResult.resistanceLevels && (
                          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                            <div className="text-sm font-bold text-red-700 mb-2">📉 Resistance Levels</div>
                            <div className="space-y-1">
                              {analysisResult.resistanceLevels.map((level, index) => (
                                <Badge key={index} variant="outline" className="mr-2 text-red-700 border-red-300">
                                  {level}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Confluence Factors */}
              {analysisResult.confluenceFactors && analysisResult.confluenceFactors.length > 0 && (
                <Card className="border-2 border-yellow-200">
                  <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                    <CardTitle className="text-xl flex items-center">
                      <Icons.CheckCircle className="h-6 w-6 mr-2" />
                      ⚡ CONFLUENCE FACTORS
                    </CardTitle>
                    <CardDescription className="text-yellow-100">
                      Multiple indicators supporting the analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysisResult.confluenceFactors.map((factor, index) => (
                        <div key={index} className="flex items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <Icons.CheckCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                          <span className="text-yellow-800 font-medium">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Analysis Quality Score */}
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Icons.Gauge className="h-5 w-5 mr-2 text-gray-600" />
                    Analysis Quality Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Processing Time</div>
                      <div className="text-lg font-bold text-gray-800">
                        {analysisResult.processingTime ? `${(analysisResult.processingTime / 1000).toFixed(1)}s` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Analysis Type</div>
                      <div className="text-lg font-bold text-gray-800">
                        {analysisResult.analysisType || 'Multi-Scenario'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium">Scenarios Generated</div>
                      <div className="text-lg font-bold text-blue-800">
                        {analysisResult.scenarios?.length || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="text-sm text-green-600 font-medium">Analysis Method</div>
                      <div className="text-lg font-bold text-green-800">
                        Multi-Scenario AI
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="text-sm text-purple-600 font-medium">Model Used</div>
                      <div className="text-lg font-bold text-purple-800">
                        {analysisResult.metadata?.model || 'Gemini Vision'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
TRADAI Multi-Scenario Analysis Report
====================================
Analysis Type: ${analysisResult.analysisType || 'Multi-Scenario'}
Timestamp: ${analysisResult.timestamp || new Date().toISOString()}
Processing Time: ${analysisResult.processingTime ? `${(analysisResult.processingTime / 1000).toFixed(1)}s` : 'N/A'}

SIGNAL: ${analysisResult.signal || 'N/A'}
Signal Confidence: ${analysisResult.signalConfidence || 'N/A'}%
Overall Confidence: ${analysisResult.overallConfidence || 'N/A'}%

SCENARIOS:
${analysisResult.scenarios?.map((scenario: any, index: number) => 
  `${index + 1}. ${scenario.path?.join(' → ') || 'N/A'} (${scenario.probability || 0}%)`
).join('\n') || 'No scenarios available'}

MOST LIKELY PATH: ${analysisResult.mostLikelyPath?.join(' → ') || 'N/A'}

TECHNICAL ANALYSIS:
${analysisResult.technicalAnalysis || 'No technical analysis available'}

Generated by TRADAI Multi-Scenario Analysis System
                    `.trim();
                    
                    copyToClipboard(analysisText);
                  }}
                  variant="default"
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Icons.Copy className="h-4 w-4 mr-2" />
                  Copy Full Report
                </Button>
              </div>
            </div>
          )}

          {/* Debug Information */}
          <Card className="mb-8 border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Icons.Settings className="h-5 w-5 mr-2 text-gray-600" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">API Endpoint</div>
                  <div className="text-xs text-gray-600 font-mono break-all">
                    /api/multi-scenario-analysis (relative URL)
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    🚀 Pure Multi-Scenario Analysis - No Legacy Conversion!
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Health Status</div>
                  <div className={`text-xs font-medium ${
                    healthStatus.status === 'OK' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isCheckingHealth ? 'Checking...' : (healthStatus.status || 'Unknown')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last checked: {healthStatus.timestamp ? new Date(healthStatus.timestamp).toLocaleTimeString() : 'Never'}
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
                  Test Connection
                </Button>

                <Button
                  onClick={() => {
                    const debugInfo = {
                      timestamp: new Date().toISOString(),
                      apiBaseUrl: window.location.origin,
                      healthStatus: healthStatus,
                      healthError: healthError,
                      lastAnalysis: analysisResult ? {
                        success: analysisResult.success,
                        analysisType: analysisResult.analysisType,
                        processingTime: analysisResult.processingTime,
                        timestamp: analysisResult.timestamp,
                        scenariosCount: analysisResult.scenarios?.length || 0,
                        signalConfidence: analysisResult.signalConfidence
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
                    console.log('API Base URL:', window.location.origin);
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
                      <li>Check if the current domain is accessible in a new tab</li>
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
                <Icons.AlertCircle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-orange-800 mb-3">⚠️ Important Disclaimer</h3>
                  <div className="text-sm text-orange-700 space-y-2">
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
                <Badge variant="outline" className="text-xs">Powered by Multi-Scenario AI</Badge>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span className="flex items-center">
                  <Icons.CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  Professional Grade Analysis
                </span>
                <span className="flex items-center">
                  <Icons.Target className="h-4 w-4 text-blue-500 mr-1" />
                  Multi-Scenario Analysis
                </span>
                <span className="flex items-center">
                  <Icons.Activity className="h-4 w-4 text-purple-500 mr-1" />
                  Real-Time Processing
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                © 2024 TRADAI. Advanced AI-powered multi-scenario trading analysis system.
                Built with cutting-edge technology for professional traders.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}