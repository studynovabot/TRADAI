/**
 * Multi-Scenario Feedback Form Component
 * Handles feedback collection for multi-scenario predictions
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';

const MultiScenarioFeedbackForm = ({ prediction, onFeedbackSubmitted }) => {
  const { user, getIdToken } = useAuth();
  const [actualPath, setActualPath] = useState(['', '', '']);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!prediction) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold mb-2">No Prediction to Review</h3>
          <p className="text-gray-600">
            Upload a chart and get predictions to provide feedback.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handlePathChange = (candleIndex, direction) => {
    const newPath = [...actualPath];
    newPath[candleIndex] = direction;
    setActualPath(newPath);
    
    // Check if this path matches any scenario
    if (prediction.scenarios) {
      const matchingScenario = prediction.scenarios.find(scenario => 
        scenario.path.every((dir, idx) => dir === newPath[idx] || newPath[idx] === '')
      );
      setSelectedScenario(matchingScenario);
    }
  };

  const isPathComplete = () => {
    return actualPath.every(direction => direction !== '');
  };

  const getMatchingScenario = () => {
    if (!prediction.scenarios || !isPathComplete()) return null;
    
    return prediction.scenarios.find(scenario => 
      scenario.path.every((dir, idx) => dir === actualPath[idx])
    );
  };

  const handleSubmit = async () => {
    if (!user || !isPathComplete()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const idToken = await getIdToken();
      const matchingScenario = getMatchingScenario();
      
      const feedbackData = {
        predictionId: prediction.predictionId,
        actualPath: actualPath,
        matchingScenario: matchingScenario ? matchingScenario.rank : null,
        wasCorrect: !!matchingScenario,
        comment: comment.trim() || null
      };

      const response = await fetch('/api/multi-scenario-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Feedback submission failed');
      }

      const result = await response.json();
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(result);
      }

    } catch (error) {
      console.error('Feedback submission error:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPathColor = (direction) => {
    switch (direction?.toUpperCase()) {
      case 'UP':
      case 'BUY':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'DOWN':
      case 'SELL':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPathIcon = (direction) => {
    switch (direction?.toUpperCase()) {
      case 'UP':
      case 'BUY':
        return '📈';
      case 'DOWN':
      case 'SELL':
        return '📉';
      default:
        return '❓';
    }
  };

  const matchingScenario = getMatchingScenario();

  return (
    <div className="space-y-6">
      {/* Prediction Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Prediction Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold">{prediction.signal}</div>
              <div className="text-sm text-gray-600">Signal</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold">{prediction.overallConfidence}%</div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold">{prediction.scenarios?.length || 0}</div>
              <div className="text-sm text-gray-600">Scenarios</div>
            </div>
          </div>
          
          {prediction.mostLikelyPath && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800">
                🏆 Most Likely Path: {prediction.mostLikelyPath}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actual Path Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📝 What Actually Happened?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Select the actual direction for each of the next 3 candles that occurred after the prediction:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((candleIndex) => (
              <div key={candleIndex} className="space-y-2">
                <div className="text-center font-medium">
                  Candle {candleIndex + 1}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={actualPath[candleIndex] === 'UP' ? 'default' : 'outline'}
                    onClick={() => handlePathChange(candleIndex, 'UP')}
                    className="flex-1"
                    size="sm"
                  >
                    📈 UP
                  </Button>
                  <Button
                    variant={actualPath[candleIndex] === 'DOWN' ? 'default' : 'outline'}
                    onClick={() => handlePathChange(candleIndex, 'DOWN')}
                    className="flex-1"
                    size="sm"
                  >
                    📉 DOWN
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Path Display */}
          {actualPath.some(dir => dir !== '') && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Selected Path:</div>
              <div className="flex items-center justify-center py-3 px-4 bg-gray-50 rounded-lg border">
                {actualPath.map((direction, index) => (
                  <span key={index} className="inline-flex items-center">
                    <span className={`px-2 py-1 rounded border ${getPathColor(direction)}`}>
                      {getPathIcon(direction)} {direction || '?'}
                    </span>
                    {index < actualPath.length - 1 && (
                      <span className="mx-2 text-gray-400">→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenario Match Result */}
      {isPathComplete() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {matchingScenario ? '✅ Scenario Match Found!' : '❌ No Scenario Match'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matchingScenario ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    Scenario #{matchingScenario.rank}
                  </Badge>
                  <Badge variant="outline">
                    {matchingScenario.probability}% Predicted
                  </Badge>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800 mb-1">
                    AI Reasoning (Correct):
                  </div>
                  <div className="text-sm text-green-700">
                    {matchingScenario.reasoning}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-sm font-medium text-orange-800 mb-1">
                  Path Not Predicted
                </div>
                <div className="text-sm text-orange-700">
                  The actual path {actualPath.join(' → ')} was not among the predicted scenarios. 
                  This feedback will help improve future predictions.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Optional Comment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💬 Additional Comments (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any additional observations about the prediction accuracy, market conditions, or suggestions for improvement..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={!isPathComplete() || isSubmitting}
          size="lg"
          className="px-8"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting Feedback...
            </>
          ) : (
            '📤 Submit Feedback'
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Your feedback helps train better AI models. Thank you for contributing to the system's improvement!
        </p>
      </div>
    </div>
  );
};

export default MultiScenarioFeedbackForm;