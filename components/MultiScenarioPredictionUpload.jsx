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
  const [analysisMode, setAnalysisMode] = useState('multi-scenario'); // Always use multi-scenario
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
      
      console.log(`🎯 Analysis Mode: ${analysisMode}`);
      console.log(`🌐 API Endpoint: ${apiEndpoint}`);

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
      {/* Multi-Scenario Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔮</div>
            <div>
              <h3 className="font-semibold text-blue-900">Multi-Scenario Analysis Active</h3>
              <p className="text-sm text-blue-700">
                Generate multiple possible scenarios for the next 3 candles with probability rankings and AI reasoning
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔮 Multi-Scenario Chart Analysis
            <Badge variant="default" className="text-xs">
              Multiple Scenarios
            </Badge>
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
                    Generating multiple scenarios... {uploadProgress}%
                  </p>
                </div>
              )}

              {!isUploading && !prediction && (
                <div className="text-center">
                  <Button onClick={handleUpload} size="lg">
                    🔮 Generate Multiple Scenarios
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
              <span>🎯 Multi-Scenario Predictions</span>
              <Badge variant="outline">
                {prediction.modelVersion || 'Multi-Scenario v1.0'}
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

            {/* Multi-Scenario Display - Always show scenarios */}
            {prediction.scenarios && prediction.scenarios.length > 0 ? (
              <ScenarioCards 
                scenarios={prediction.scenarios}
                mostLikelyPath={prediction.mostLikelyPath}
              />
            ) : (
              /* Fallback if no scenarios - show error */
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ No Scenarios Generated</h3>
                <p className="text-red-700">
                  The multi-scenario analysis failed to generate scenarios. This might be due to:
                </p>
                <ul className="list-disc list-inside text-red-700 mt-2">
                  <li>API endpoint not being called correctly</li>
                  <li>Response parsing issues</li>
                  <li>AI service configuration problems</li>
                </ul>
                <div className="mt-3 p-3 bg-red-100 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Debug Info:</strong> analysisType = {prediction.analysisType || 'undefined'}, 
                    scenarios = {prediction.scenarios ? prediction.scenarios.length : 'undefined'}
                  </p>
                </div>
              </div>
            )}

            {/* Processing Info */}
            <div className="text-center text-sm text-gray-500">
              <p>
                Processed in {(prediction.processingTimeMs / 1000).toFixed(1)}s • 
                Prediction ID: {prediction.predictionId} • 
                Analysis Type: {prediction.analysisType || 'undefined'} •
                {prediction.scenarios && (
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