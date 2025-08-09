/**
 * Prediction History Component
 * Displays user's prediction history with filtering and stats
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const PredictionHistory = () => {
  const { user, getIdToken } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    limit: 20
  });

  useEffect(() => {
    if (user) {
      loadPredictions();
    }
  }, [user, filters]);

  const loadPredictions = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const idToken = await getIdToken();
      
      const params = new URLSearchParams({
        includeStats: 'true',
        limit: filters.limit.toString()
      });

      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/predictions?${params}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load predictions');
      }

      const data = await response.json();
      setPredictions(data.predictions);
      setStats(data.stats);

    } catch (error) {
      console.error('Failed to load predictions:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const variants = {
      'pending_verification': { variant: 'secondary', text: 'Pending' },
      'partial_feedback': { variant: 'outline', text: 'Partial' },
      'labeled': { variant: 'default', text: 'Complete' }
    };

    const config = variants[status] || { variant: 'outline', text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getDirectionIcon = (direction) => {
    switch (direction?.toUpperCase()) {
      case 'UP': return '📈';
      case 'DOWN': return '📉';
      default: return '➡️';
    }
  };

  const getFeedbackSummary = (feedback) => {
    const values = Object.values(feedback);
    const total = values.filter(v => v !== null).length;
    const correct = values.filter(v => v === true).length;
    
    if (total === 0) return 'No feedback';
    return `${correct}/${total} correct`;
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Please sign in to view your prediction history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Your Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{stats.totalPredictions}</div>
                <div className="text-sm text-gray-600">Total Predictions</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{stats.labeledPredictions}</div>
                <div className="text-sm text-gray-600">Labeled</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{stats.totalCandles}</div>
                <div className="text-sm text-gray-600">Candles Labeled</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold ${getAccuracyColor(stats.accuracy)}`}>
                  {stats.accuracy}%
                </div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All</option>
                <option value="pending_verification">Pending</option>
                <option value="partial_feedback">Partial</option>
                <option value="labeled">Complete</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Limit:</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <Button size="sm" onClick={loadPredictions}>
              🔄 Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Predictions List */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Prediction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading predictions...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">❌ {error}</p>
              <Button size="sm" onClick={loadPredictions} className="mt-2">
                Try Again
              </Button>
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-600">No predictions found.</p>
              <p className="text-sm text-gray-500 mt-2">
                Upload a chart to get your first AI prediction!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {predictions.map((prediction) => (
                <Card key={prediction.predictionId} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Basic Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            {prediction.asset} • {prediction.timeframe}
                          </span>
                          {getStatusBadge(prediction.status)}
                          <Badge variant="outline" className="text-xs">
                            {prediction.modelVersion}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(prediction.timestamp)} • 
                          Signal: {prediction.signal} ({prediction.signalConfidence}%)
                        </div>
                      </div>

                      {/* Predictions Summary */}
                      <div className="flex items-center gap-2">
                        {Object.entries(prediction.predictions).map(([candleNum, candlePred]) => (
                          <div key={candleNum} className="text-center">
                            <div className="text-lg">{getDirectionIcon(candlePred.direction)}</div>
                            <div className="text-xs">{candlePred.probability}%</div>
                          </div>
                        ))}
                      </div>

                      {/* Feedback Status */}
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {getFeedbackSummary(prediction.feedback)}
                        </div>
                        {prediction.feedbackComment && (
                          <div className="text-xs text-gray-500 mt-1">
                            💬 Has comment
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expandable Details */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        View Details
                      </summary>
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {Object.entries(prediction.predictions).map(([candleNum, candlePred]) => (
                            <div key={candleNum} className="text-center">
                              <div className="font-medium">Candle {candleNum}</div>
                              <div className="text-2xl">{getDirectionIcon(candlePred.direction)}</div>
                              <div>{candlePred.direction} ({candlePred.probability}%)</div>
                              <div className="text-xs text-gray-600 mt-1">
                                {candlePred.explanation}
                              </div>
                              {prediction.feedback[candleNum] !== null && (
                                <div className="mt-2">
                                  {prediction.feedback[candleNum] ? (
                                    <Badge className="bg-green-600">✅ Correct</Badge>
                                  ) : (
                                    <Badge className="bg-red-600">❌ Wrong</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {prediction.feedbackComment && (
                          <div className="mt-4 p-3 bg-white rounded border">
                            <div className="text-sm font-medium">Comment:</div>
                            <div className="text-sm text-gray-700">{prediction.feedbackComment}</div>
                          </div>
                        )}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictionHistory;