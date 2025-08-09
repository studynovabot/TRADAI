/**
 * Feedback Form Component
 * Allows users to label prediction accuracy for each candle
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const FeedbackForm = ({ prediction, onFeedbackSubmitted }) => {
  const { getIdToken } = useAuth();
  const [feedback, setFeedback] = useState({
    "1": null,
    "2": null,
    "3": null
  });
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleCandleFeedback = (candleNum, isCorrect) => {
    setFeedback(prev => ({
      ...prev,
      [candleNum]: isCorrect
    }));
  };

  const handleSubmit = async () => {
    // Check if at least one candle has feedback
    const hasFeedback = Object.values(feedback).some(val => val !== null);
    if (!hasFeedback) {
      setError('Please provide feedback for at least one candle');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const idToken = await getIdToken();

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          predictionId: prediction.predictionId,
          feedback,
          comment: comment.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Feedback submission failed');
      }

      const result = await response.json();
      setSubmitted(true);

      // Notify parent component
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

  const getFeedbackCount = () => {
    return Object.values(feedback).filter(val => val !== null).length;
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

  if (submitted) {
    return (
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
          <div className="mt-4 text-sm text-green-600">
            Feedback provided for {getFeedbackCount()} out of 3 candles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📝 Provide Feedback</span>
          <Badge variant="outline">
            {getFeedbackCount()}/3 labeled
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Help us improve by marking whether each candle prediction was correct or incorrect.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Candle Feedback Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(prediction.predictions).map(([candleNum, candlePred]) => (
            <Card key={candleNum} className="border-2">
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  {/* Candle Info */}
                  <div>
                    <div className="text-lg font-bold">Candle {candleNum}</div>
                    <div className="text-2xl">{getDirectionIcon(candlePred.direction)}</div>
                    <div className="text-lg font-semibold">{candlePred.direction}</div>
                    <div className="flex items-center justify-center mt-1">
                      <div 
                        className={`px-2 py-1 rounded-full text-white text-xs ${getConfidenceColor(candlePred.probability)}`}
                      >
                        {candlePred.probability}%
                      </div>
                    </div>
                  </div>

                  {/* Feedback Buttons */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Was this prediction correct?</p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant={feedback[candleNum] === true ? "default" : "outline"}
                        onClick={() => handleCandleFeedback(candleNum, true)}
                        className={feedback[candleNum] === true ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        ✅ Correct
                      </Button>
                      <Button
                        size="sm"
                        variant={feedback[candleNum] === false ? "default" : "outline"}
                        onClick={() => handleCandleFeedback(candleNum, false)}
                        className={feedback[candleNum] === false ? "bg-red-600 hover:bg-red-700" : ""}
                      >
                        ❌ Wrong
                      </Button>
                    </div>
                    {feedback[candleNum] !== null && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCandleFeedback(candleNum, null)}
                        className="text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-gray-600 border-t pt-2">
                    {candlePred.explanation}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comment Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Additional Comments (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any additional observations about the predictions..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none"
            rows={3}
            maxLength={500}
          />
          <div className="text-xs text-gray-500 text-right">
            {comment.length}/500 characters
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">❌ {error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || getFeedbackCount() === 0}
            size="lg"
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              `Submit Feedback (${getFeedbackCount()}/3)`
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          <p>
            💡 You can provide feedback for individual candles or all at once. 
            Your feedback helps train our AI to make better predictions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackForm;