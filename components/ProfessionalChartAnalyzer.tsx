/**
 * Professional Chart Analyzer Component
 * React interface for multi-screenshot upload and analysis display
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface Screenshot {
  file: File;
  timeframe: string;
  preview: string;
}

interface AnalysisResult {
  success: boolean;
  analysis?: any;
  error?: string;
}

const ProfessionalChartAnalyzer: React.FC = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);

  const timeframeOptions = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newScreenshots = acceptedFiles.map((file, index) => ({
      file,
      timeframe: timeframeOptions[index] || '1m',
      preview: URL.createObjectURL(file)
    }));
    
    setScreenshots(prev => [...prev, ...newScreenshots].slice(0, 5)); // Max 5 screenshots
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updateTimeframe = (index: number, timeframe: string) => {
    setScreenshots(prev => {
      const updated = [...prev];
      updated[index].timeframe = timeframe;
      return updated;
    });
  };

  const analyzeCharts = async () => {
    if (screenshots.length === 0) {
      alert('Please upload at least one chart screenshot');
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      
      // Add screenshots
      screenshots.forEach((screenshot, index) => {
        formData.append('screenshots', screenshot.file);
      });
      
      // Add timeframes
      const timeframes = screenshots.map(s => s.timeframe);
      formData.append('timeframes', JSON.stringify(timeframes));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/professional-chart-analysis', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await response.json();
      setAnalysisResult(result);

    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisResult({
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    if (!analysisResult.success) {
      return (
        <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Analysis Failed</h3>
          <p className="text-red-600">{analysisResult.error}</p>
        </div>
      );
    }

    const { analysis } = analysisResult;

    return (
      <div className="mt-8 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-2">{analysis.title}</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>📊 Screenshots: {analysis.screenshotsAnalyzed}</span>
            <span>⏱️ Processing: {analysis.processingTime}</span>
            <span>💱 Pair: {analysis.currencyPair}</span>
          </div>
        </div>

        {/* Individual Screenshot Analyses */}
        {analysis.screenshotAnalyses?.map((screenshot: any, index: number) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              📊 Screenshot {screenshot.screenshot} ({screenshot.timeframe} timeframe)
            </h3>
            
            {/* Indicators */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">🔍 Indicators Analysis:</h4>
              <div className="space-y-1 text-sm">
                <div>• <strong>EMA 5:</strong> {screenshot.indicators.ema5.description}</div>
                <div>• <strong>SMA 20:</strong> {screenshot.indicators.sma20.description}</div>
                <div>• <strong>Stochastic:</strong> {screenshot.indicators.stochastic.description}</div>
              </div>
            </div>

            {/* Patterns */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">📈 Pattern Analysis:</h4>
              <div className="space-y-1 text-sm">
                <div>• <strong>Primary Pattern:</strong> {screenshot.patterns.primary}</div>
                <div>• <strong>Structure:</strong> {screenshot.patterns.structure}</div>
                <div>• <strong>Momentum:</strong> {screenshot.patterns.momentum}</div>
              </div>
            </div>

            {/* Support/Resistance */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">🎯 Support & Resistance:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>• <strong>Major Resistance:</strong> {screenshot.supportResistance.majorResistance}</div>
                <div>• <strong>Current Resistance:</strong> {screenshot.supportResistance.currentResistance}</div>
                <div>• <strong>Current Support:</strong> {screenshot.supportResistance.currentSupport}</div>
                <div>• <strong>Strong Support:</strong> {screenshot.supportResistance.strongSupport}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Trading Signals */}
        {analysis.confluence?.signals && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">🚨 Trading Signals</h3>
            
            {Object.entries(analysis.confluence.signals).map(([timeHorizon, signal]: [string, any]) => {
              if (!signal) return null;
              
              return (
                <div key={timeHorizon} className="mb-4 p-4 bg-white rounded border">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    {timeHorizon.toUpperCase()} SIGNAL
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>• <strong>Direction:</strong> {signal.direction}</div>
                    <div>• <strong>Confidence:</strong> {signal.confidence}</div>
                    <div>• <strong>Entry:</strong> {signal.entry}</div>
                    <div>• <strong>Target:</strong> {signal.target}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Final Verdict */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">🔥 Final Verdict</h3>
          <p className="text-lg font-medium text-green-800">{analysis.finalVerdict}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🚀 Professional Chart Analyzer
        </h1>
        <p className="text-gray-600">
          Upload multiple trading chart screenshots for institutional-level technical analysis
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="text-4xl">📊</div>
          <p className="text-lg font-medium">
            {isDragActive
              ? 'Drop your chart screenshots here...'
              : 'Drag & drop chart screenshots or click to browse'}
          </p>
          <p className="text-sm text-gray-500">
            Supports PNG, JPG, JPEG, WebP • Max 5 files • 10MB each
          </p>
        </div>
      </div>

      {/* Screenshot Preview */}
      {screenshots.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Uploaded Screenshots ({screenshots.length}/5)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {screenshots.map((screenshot, index) => (
              <div key={index} className="border rounded-lg p-4">
                <img
                  src={screenshot.preview}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-32 object-cover rounded mb-3"
                />
                <div className="space-y-2">
                  <select
                    value={screenshot.timeframe}
                    onChange={(e) => updateTimeframe(index, e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    {timeframeOptions.map(tf => (
                      <option key={tf} value={tf}>{tf}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeScreenshot(index)}
                    className="w-full px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyze Button */}
      {screenshots.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={analyzeCharts}
            disabled={isAnalyzing}
            className={`px-8 py-3 rounded-lg font-semibold text-white ${
              isAnalyzing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isAnalyzing ? 'Analyzing Charts...' : 'Analyze Charts'}
          </button>
          
          {isAnalyzing && progress > 0 && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">Processing... {progress}%</p>
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {renderAnalysisResult()}
    </div>
  );
};

export default ProfessionalChartAnalyzer;
