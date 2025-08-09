/**
 * Demo Page - Human-in-the-Loop Prediction System
 * Works without Firebase for testing and demonstration
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';

const DemoPage = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [feedback, setFeedback] = useState({ "1": null, "2": null, "3": null });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Mock predictions data
  const mockPredictions = [
    {
      id: 'demo-1',
      asset: 'EURUSD',
      timeframe: '5m',
      signal: 'BUY',
      signalConfidence: 85,
      overallConfidence: 78,
      predictions: {
        "1": { direction: "UP", probability: 82, explanation: "Strong bullish momentum with RSI showing upward trend and price breaking above EMA resistance" },
        "2": { direction: "UP", probability: 75, explanation: "Continuation of upward movement expected based on volume confirmation and MACD crossover" },
        "3": { direction: "DOWN", probability: 68, explanation: "Potential pullback after strong upward movement, approaching overbought conditions" }
      },
      timestamp: Date.now(),
      modelVersion: 'v1.0.0-demo'
    },
    {
      id: 'demo-2',
      asset: 'GBPUSD',
      timeframe: '15m',
      signal: 'SELL',
      signalConfidence: 92,
      overallConfidence: 88,
      predictions: {
        "1": { direction: "DOWN", probability: 89, explanation: "Clear bearish divergence with RSI and strong resistance at current level" },
        "2": { direction: "DOWN", probability: 85, explanation: "Downward momentum likely to continue with volume supporting the move" },
        "3": { direction: "UP", probability: 72, explanation: "Potential bounce from support level after initial decline" }
      },
      timestamp: Date.now() - 3600000,
      modelVersion: 'v1.0.0-demo'
    }
  ];

  const [demoHistory] = useState(mockPredictions);
  const [demoStats] = useState({
    totalPredictions: 25,
    labeledPredictions: 20,
    pendingPredictions: 5,
    totalCandles: 60,
    correctCandles: 47,
    accuracy: 78.33,
    modelVersions: ['v1.0.0-demo']
  });

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setProgress(0);

    // Simulate analysis progress
    const intervals = [20, 40, 60, 80, 100];
    for (let i = 0; i < intervals.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(intervals[i]);
    }

    // Generate random prediction
    const randomPrediction = mockPredictions[Math.floor(Math.random() * mockPredictions.length)];
    setPrediction({
      ...randomPrediction,
      id: 'demo-' + Date.now(),
      timestamp: Date.now()
    });

    setIsAnalyzing(false);
    setActiveTab('feedback');
  };

  const handleFeedback = (candleNum, isCorrect) => {
    setFeedback(prev => ({
      ...prev,
      [candleNum]: isCorrect
    }));
  };

  const handleSubmitFeedback = () => {
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setActiveTab('history');
    }, 2000);
  };

  const resetDemo = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPrediction(null);
    setFeedback({ "1": null, "2": null, "3": null });
    setFeedbackSubmitted(false);
    setActiveTab('upload');
  };

  const getDirectionIcon = (direction) => {
    switch (direction?.toUpperCase()) {
      case 'UP': return '📈';
      case 'DOWN': return '📉';
      default: return '➡️';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getFeedbackCount = () => {
    return Object.values(feedback).filter(val => val !== null).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                🤖 TRADAI Predictions Demo
              </h1>
              <Badge variant="outline" className="ml-3">
                Demo Mode
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">No Firebase Required</Badge>
              <Button variant="outline" size="sm" onClick={resetDemo}>
                Reset Demo
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📤 Upload & Predict
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            disabled={!prediction}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'feedback' && prediction
                ? 'bg-white text-blue-600 shadow-sm'
                : prediction
                ? 'text-gray-600 hover:text-gray-900'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            📝 Provide Feedback
            {prediction && !feedbackSubmitted && (
              <Badge variant="destructive" className="ml-2 text-xs">New</Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 History & Stats
          </button>
        </div>

        {/* Content */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📊 Chart Analysis Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!imagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <div className="space-y-4">
                      <div className="text-4xl">📷</div>
                      <div>
                        <p className="text-lg font-medium">Upload Chart Screenshot</p>
                        <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                      </div>
                      <label htmlFor="image-upload">
                        <Button as="span">Select Image</Button>
                      </label>
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
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2"
                        variant="destructive"
                        size="sm"
                      >
                        ✕
                      </Button>
                    </div>
                    
                    {isAnalyzing && (
                      <div className="space-y-2">
                        <Progress value={progress} className="w-full" />
                        <p className="text-sm text-center text-gray-600">
                          Analyzing chart... {progress}%
                        </p>
                      </div>
                    )}

                    {!isAnalyzing && !prediction && (
                      <div className="text-center">
                        <Button onClick={handleAnalyze} size="lg">
                          🔍 Analyze Chart
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {prediction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>🎯 AI Prediction Results</span>
                    <Badge variant="outline">{prediction.modelVersion}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Next 3 Candles Prediction</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(prediction.predictions).map(([candleNum, candlePred]) => (
                        <Card key={candleNum} className="border-2">
                          <CardContent className="p-4">
                            <div className="text-center space-y-2">
                              <div className="text-lg font-bold">Candle {candleNum}</div>
                              <div className="text-3xl">{getDirectionIcon(candlePred.direction)}</div>
                              <div className="text-xl font-semibold">{candlePred.direction}</div>
                              <div className="flex items-center justify-center">
                                <div className={`px-3 py-1 rounded-full text-white text-sm ${getConfidenceColor(candlePred.probability)}`}>
                                  {candlePred.probability}%
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mt-2">{candlePred.explanation}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'feedback' && prediction && (
          <div className="space-y-6">
            {feedbackSubmitted ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Feedback Submitted Successfully!
                  </h3>
                  <p className="text-green-700">
                    Thank you for helping improve our AI model. Your feedback will be used 
                    to train better predictions.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>📝 Provide Feedback</span>
                    <Badge variant="outline">{getFeedbackCount()}/3 labeled</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(prediction.predictions).map(([candleNum, candlePred]) => (
                      <Card key={candleNum} className="border-2">
                        <CardContent className="p-4">
                          <div className="text-center space-y-3">
                            <div>
                              <div className="text-lg font-bold">Candle {candleNum}</div>
                              <div className="text-2xl">{getDirectionIcon(candlePred.direction)}</div>
                              <div className="text-lg font-semibold">{candlePred.direction}</div>
                              <div className="flex items-center justify-center mt-1">
                                <div className={`px-2 py-1 rounded-full text-white text-xs ${getConfidenceColor(candlePred.probability)}`}>
                                  {candlePred.probability}%
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-medium">Was this prediction correct?</p>
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant={feedback[candleNum] === true ? "default" : "outline"}
                                  onClick={() => handleFeedback(candleNum, true)}
                                  className={feedback[candleNum] === true ? "bg-green-600 hover:bg-green-700" : ""}
                                >
                                  ✅ Correct
                                </Button>
                                <Button
                                  size="sm"
                                  variant={feedback[candleNum] === false ? "default" : "outline"}
                                  onClick={() => handleFeedback(candleNum, false)}
                                  className={feedback[candleNum] === false ? "bg-red-600 hover:bg-red-700" : ""}
                                >
                                  ❌ Wrong
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleSubmitFeedback}
                      disabled={getFeedbackCount() === 0}
                      size="lg"
                    >
                      Submit Feedback ({getFeedbackCount()}/3)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📊 Your Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">{demoStats.totalPredictions}</div>
                    <div className="text-sm text-gray-600">Total Predictions</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">{demoStats.labeledPredictions}</div>
                    <div className="text-sm text-gray-600">Labeled</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">{demoStats.totalCandles}</div>
                    <div className="text-sm text-gray-600">Candles Labeled</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{demoStats.accuracy}%</div>
                    <div className="text-sm text-gray-600">Accuracy</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📋 Recent Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demoHistory.map((pred) => (
                    <Card key={pred.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{pred.asset} • {pred.timeframe}</div>
                            <div className="text-sm text-gray-600">
                              Signal: {pred.signal} ({pred.signalConfidence}%)
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {Object.entries(pred.predictions).map(([candleNum, candlePred]) => (
                              <div key={candleNum} className="text-center">
                                <div className="text-lg">{getDirectionIcon(candlePred.direction)}</div>
                                <div className="text-xs">{candlePred.probability}%</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">💡</div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Demo Mode Information</h3>
                <p className="text-blue-800 text-sm mb-3">
                  This is a demonstration of the Human-in-the-Loop Prediction System. 
                  All predictions are simulated and no data is actually stored.
                </p>
                <div className="text-xs text-blue-700">
                  <p>• Upload any image to see mock AI predictions</p>
                  <p>• Provide feedback to see the complete workflow</p>
                  <p>• View simulated statistics and history</p>
                  <p>• No Firebase or authentication required</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DemoPage;