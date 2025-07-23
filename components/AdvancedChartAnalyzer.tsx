/**
 * Advanced Chart Analyzer Component
 * 
 * React component for uploading trading chart screenshots and displaying
 * comprehensive analysis results with high-confidence signals.
 */

import React, { useState, useCallback } from 'react';
import { Upload, TrendingUp, TrendingDown, AlertTriangle, Target, Shield } from 'lucide-react';

interface Signal {
    id: string;
    direction: 'UP' | 'DOWN';
    type: string;
    strength: string;
    confidence: number;
    entry: number;
    stopLoss: number;
    targets: number[];
    riskReward: number;
    reasoning: string;
    timeframe: string;
    timestamp: string;
}

interface AnalysisResult {
    success: boolean;
    confidence: number;
    processingTime: number;
    tradingData: {
        currencyPair: string;
        currentPrice: number | null;
        timeframe: string;
        platform: string;
    };
    marketAssessment: {
        overallBias: string;
        trendDirection: string;
        volatility: string;
        keyLevels: any[];
        majorPatterns: any[];
    };
    signals: Signal[];
    riskAssessment: {
        overallRisk: string;
        recommendedPositionSize: number;
        riskFactors: string[];
        opportunities: string[];
    };
    technicalAnalysis: {
        trend: string;
        bias: string;
        volatility: string;
        keyLevels: any[];
        patterns: any[];
    };
    metadata: {
        analysisId: string;
        totalSignalsGenerated: number;
        highConfidenceSignals: number;
        timestamp: string;
    };
}

const AdvancedChartAnalyzer: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFileUpload = useCallback(async (file: File) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file (PNG, JPG, WebP)');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/advanced-chart-analysis', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Analysis failed');
            }

            setAnalysisResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    }, [handleFileUpload]);

    const getSignalIcon = (direction: string) => {
        return direction === 'UP' ? (
            <TrendingUp className="w-5 h-5 text-green-500" />
        ) : (
            <TrendingDown className="w-5 h-5 text-red-500" />
        );
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return 'text-green-600 bg-green-100';
        if (confidence >= 80) return 'text-blue-600 bg-blue-100';
        if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getRiskColor = (risk: string) => {
        switch (risk.toLowerCase()) {
            case 'low': return 'text-green-600 bg-green-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'high': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Advanced Chart Analysis
                </h1>
                <p className="text-gray-600">
                    Upload trading chart screenshots for comprehensive technical analysis and high-confidence signals
                </p>
            </div>

            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-700">
                        Drop your chart screenshot here
                    </p>
                    <p className="text-gray-500">
                        or{' '}
                        <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                            browse files
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </label>
                    </p>
                    <p className="text-sm text-gray-400">
                        Supports PNG, JPG, WebP (max 10MB)
                    </p>
                </div>
            </div>

            {/* Loading State */}
            {isAnalyzing && (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Analyzing chart...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Analysis Results */}
            {analysisResult && (
                <div className="space-y-6">
                    {/* Overview */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-bold mb-4">Analysis Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <p className="text-sm text-gray-500">Currency Pair</p>
                                <p className="text-lg font-semibold">{analysisResult.tradingData.currencyPair}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-500">Current Price</p>
                                <p className="text-lg font-semibold">
                                    {analysisResult.tradingData.currentPrice?.toFixed(5) || 'N/A'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-500">Timeframe</p>
                                <p className="text-lg font-semibold">{analysisResult.tradingData.timeframe}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-500">Confidence</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(analysisResult.confidence)}`}>
                                    {analysisResult.confidence.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Market Assessment */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-bold mb-4">Market Assessment</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Overall Bias</p>
                                <p className={`text-lg font-semibold ${
                                    analysisResult.marketAssessment.overallBias === 'bullish' ? 'text-green-600' :
                                    analysisResult.marketAssessment.overallBias === 'bearish' ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                    {analysisResult.marketAssessment.overallBias.toUpperCase()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Trend Direction</p>
                                <p className="text-lg font-semibold">{analysisResult.marketAssessment.trendDirection}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Volatility</p>
                                <p className="text-lg font-semibold">{analysisResult.marketAssessment.volatility}</p>
                            </div>
                        </div>
                    </div>

                    {/* Trading Signals */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-bold mb-4">
                            Trading Signals ({analysisResult.signals.length})
                        </h2>
                        {analysisResult.signals.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">
                                No high-confidence signals detected
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {analysisResult.signals.map((signal) => (
                                    <div key={signal.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                {getSignalIcon(signal.direction)}
                                                <span className="font-semibold">
                                                    {signal.direction} Signal
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    ({signal.type})
                                                </span>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-sm font-medium ${getConfidenceColor(signal.confidence)}`}>
                                                {signal.confidence}%
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500">Entry</p>
                                                <p className="font-medium">{signal.entry.toFixed(5)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Stop Loss</p>
                                                <p className="font-medium">{signal.stopLoss.toFixed(5)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Target 1</p>
                                                <p className="font-medium">{signal.targets[0]?.toFixed(5)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Risk/Reward</p>
                                                <p className="font-medium">1:{signal.riskReward?.toFixed(1)}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2">{signal.reasoning}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Risk Assessment */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <Shield className="w-5 h-5 mr-2" />
                            Risk Assessment
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-gray-500 mb-2">Overall Risk Level</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(analysisResult.riskAssessment.overallRisk)}`}>
                                    {analysisResult.riskAssessment.overallRisk.toUpperCase()}
                                </span>
                                <p className="text-sm text-gray-500 mt-2">
                                    Recommended Position Size: {(analysisResult.riskAssessment.recommendedPositionSize * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div>
                                {analysisResult.riskAssessment.riskFactors.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-red-600 mb-1">Risk Factors:</p>
                                        <ul className="text-sm text-red-600 space-y-1">
                                            {analysisResult.riskAssessment.riskFactors.map((factor, index) => (
                                                <li key={index}>• {factor}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {analysisResult.riskAssessment.opportunities.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-green-600 mb-1">Opportunities:</p>
                                        <ul className="text-sm text-green-600 space-y-1">
                                            {analysisResult.riskAssessment.opportunities.map((opportunity, index) => (
                                                <li key={index}>• {opportunity}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedChartAnalyzer;
