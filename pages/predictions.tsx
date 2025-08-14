/**
 * Predictions Page
 * Main page for the human-in-the-loop prediction system
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import AuthForm from '../components/AuthForm';
import PredictionUpload from '../components/PredictionUpload';
import MultiScenarioPredictionUpload from '../components/MultiScenarioPredictionUpload';
import FeedbackForm from '../components/FeedbackForm';
import MultiScenarioFeedbackForm from '../components/MultiScenarioFeedbackForm';
import PredictionHistory from '../components/PredictionHistory';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const PredictionsPage = () => {
  const { user, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [predictionMode, setPredictionMode] = useState('multi-scenario'); // 'multi-scenario' or 'legacy'

  const handlePredictionCreated = (prediction) => {
    setCurrentPrediction(prediction);
    setShowFeedback(true);
    setActiveTab('feedback');
  };

  const handleFeedbackSubmitted = (result) => {
    setShowFeedback(false);
    setCurrentPrediction(null);
    setActiveTab('history');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                🤖 TRADAI Predictions
              </h1>
              <Badge variant="outline" className="ml-3">
                Human-in-the-Loop AI
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user.email}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
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
            disabled={!showFeedback}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'feedback' && showFeedback
                ? 'bg-white text-blue-600 shadow-sm'
                : showFeedback
                ? 'text-gray-600 hover:text-gray-900'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            📝 Provide Feedback
            {showFeedback && (
              <Badge variant="destructive" className="ml-2 text-xs">
                New
              </Badge>
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

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'upload' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Chart for AI Analysis
                </h2>
                <p className="text-gray-600">
                  Upload a trading chart screenshot to get AI-powered predictions. Choose between 
                  multi-scenario analysis (multiple possible paths) or classic single-path predictions.
                  After receiving predictions, you can provide feedback to help improve the model.
                </p>
              </div>
              <MultiScenarioPredictionUpload onPredictionCreated={handlePredictionCreated} />
            </div>
          )}

          {activeTab === 'feedback' && (
            <div>
              {showFeedback && currentPrediction ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Provide Feedback on Predictions
                    </h2>
                    <p className="text-gray-600">
                      Help improve our AI by marking whether each candle prediction was correct or incorrect.
                      Your feedback is valuable for training better models.
                    </p>
                  </div>
                  {currentPrediction?.analysisType === 'multi-scenario' ? (
                    <MultiScenarioFeedbackForm 
                      prediction={currentPrediction} 
                      onFeedbackSubmitted={handleFeedbackSubmitted}
                    />
                  ) : (
                    <FeedbackForm 
                      prediction={currentPrediction} 
                      onFeedbackSubmitted={handleFeedbackSubmitted}
                    />
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-semibold mb-2">No Pending Feedback</h3>
                    <p className="text-gray-600 mb-4">
                      Upload a chart and get predictions to provide feedback.
                    </p>
                    <Button onClick={() => setActiveTab('upload')}>
                      Upload Chart
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Prediction History & Statistics
                </h2>
                <p className="text-gray-600">
                  View your past predictions, accuracy statistics, and feedback history.
                </p>
              </div>
              <PredictionHistory />
            </div>
          )}
        </div>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>💡 How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-3">📤</div>
                <h3 className="font-semibold mb-2">1. Upload Chart</h3>
                <p className="text-sm text-gray-600">
                  Upload a trading chart screenshot. Our AI analyzes technical patterns, 
                  trends, and market conditions.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold mb-2">2. Get Predictions</h3>
                <p className="text-sm text-gray-600">
                  Receive multiple possible scenarios for the next 3 candles, ranked by 
                  probability with AI reasoning for each path.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">📝</div>
                <h3 className="font-semibold mb-2">3. Provide Feedback</h3>
                <p className="text-sm text-gray-600">
                  Mark predictions as correct or incorrect. Your feedback helps train 
                  better AI models for everyone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PredictionsPage;