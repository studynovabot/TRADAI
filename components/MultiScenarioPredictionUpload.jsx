/**
 * Multi-Scenario Prediction Upload Component
 * Handles chart image upload and displays AI multi-scenario predictions
 */

import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import ScenarioCards from './ScenarioCards';

const MultiScenarioPredictionUpload = ({ onPredictionCreated }) => {
  const { user, getIdToken } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('multi-scenario'); // 'multi-scenario' or 'legacy'
  const fileInputRef = useRef(null);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setSelectedImage(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedImage || !user) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Convert image to base64
      setUploadProgress(20);
      const base64Image = await convertToBase64(selectedImage);

      // Get auth token
      setUploadProgress(40);
      const idToken = await getIdToken();

      // Choose API endpoint based on analysis mode
      const apiEndpoint = analysisMode === 'multi-scenario' 
        ? '/api/multi-scenario-predict' 
        : '/api/predict';

      // Submit to API
      setUploadProgress(60);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          meta: {
            asset: 'Unknown', // TODO: Add asset selection
            timeframe: 'Unknown' // TODO: Add timeframe selection
          }
        })
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);
      
      setPrediction(result);
      
      // Notify parent component
      if (onPredictionCreated) {
        onPredictionCreated(result);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const resetUpload = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPrediction(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDirectionIcon = (direction) => {
    switch (direction?.toUpperCase()) {
      case 'UP': return '📈';
      case 'DOWN': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Analysis Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={analysisMode === 'multi-scenario' ? 'default' : 'outline'}
              onClick={() => setAnalysisMode('multi-scenario')}
              className="flex-1"
            >
              🔮 Multi-Scenario Analysis
              <Badge variant="secondary" className="ml-2">New</Badge>
            </Button>
            <Button
              variant={analysisMode === 'legacy' ? 'default' : 'outline'}
              onClick={() => setAnalysisMode('legacy')}
              className="flex-1"
            >
              📊 Classic Analysis
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {analysisMode === 'multi-scenario' 
              ? 'Generate multiple possible scenarios for the next 3 candles with probability rankings'
              : 'Traditional single-path prediction for the next 3 candles'
            }
          </p>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Chart Analysis Upload
            {analysisMode === 'multi-scenario' && (
              <Badge variant="outline" className="text-xs">
                Multi-Scenario Mode
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!imagePreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="space-y-4">
                <div className="text-4xl">📷</div>
                <div>
                  <p className="text-lg font-medium">Upload Chart Screenshot</p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG up to 10MB
                  </p>
                </div>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!user}
                >
                  {user ? 'Select Image' : 'Please sign in first'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Chart preview"
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
                <Button
                  onClick={resetUpload}
                  className="absolute top-2 right-2"
                  variant="destructive"
                  size="sm"
                >
                  ✕
                </Button>
              </div>
              
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-center text-gray-600">
                    {analysisMode === 'multi-scenario' 
                      ? `Generating scenarios... ${uploadProgress}%`
                      : `Analyzing chart... ${uploadProgress}%`
                    }
                  </p>
                </div>
              )}

              {!isUploading && !prediction && (
                <div className="text-center">
                  <Button onClick={handleUpload} size="lg">
                    {analysisMode === 'multi-scenario' 
                      ? '🔮 Generate Scenarios'
                      : '🔍 Analyze Chart'
                    }
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">❌ {error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prediction Results */}
      {prediction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {prediction.analysisType === 'multi-scenario' 
                  ? '🎯 Multi-Scenario Predictions'
                  : '🎯 AI Prediction Results'
                }
              </span>
              <Badge variant="outline">
                {prediction.modelVersion}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{prediction.signal}</div>
                <div className="text-sm text-gray-600">Signal</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{prediction.signalConfidence}%</div>
                <div className="text-sm text-gray-600">Signal Confidence</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{prediction.overallConfidence}%</div>
                <div className="text-sm text-gray-600">Overall Confidence</div>
              </div>
            </div>

            {/* Multi-Scenario Display */}
            {prediction.analysisType === 'multi-scenario' && prediction.scenarios ? (
              <ScenarioCards 
                scenarios={prediction.scenarios}
                mostLikelyPath={prediction.mostLikelyPath}
              />
            ) : (
              /* Legacy 3-Candle Predictions */
              <div>
                <h3 className="text-lg font-semibold mb-4">Next 3 Candles Prediction</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(prediction.predictions).map(([candleNum, candlePred]) => (
                    <Card key={candleNum} className="border-2">
                      <CardContent className="p-4">
                        <div className="text-center space-y-2">
                          <div className="text-lg font-bold">
                            Candle {candleNum}
                          </div>
                          <div className="text-3xl">
                            {getDirectionIcon(candlePred.direction)}
                          </div>
                          <div className="text-xl font-semibold">
                            {candlePred.direction}
                          </div>
                          <div className="flex items-center justify-center">
                            <div 
                              className={`px-3 py-1 rounded-full text-white text-sm ${getConfidenceColor(candlePred.probability)}`}
                            >
                              {candlePred.probability}%
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            {candlePred.explanation}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Processing Info */}
            <div className="text-center text-sm text-gray-500">
              <p>
                Processed in {(prediction.processingTimeMs / 1000).toFixed(1)}s • 
                Prediction ID: {prediction.predictionId} •
                {prediction.analysisType === 'multi-scenario' && prediction.scenarios && (
                  <span> {prediction.scenarios.length} scenarios generated</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiScenarioPredictionUpload;