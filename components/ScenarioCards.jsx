/**
 * Scenario Cards Component
 * Displays multiple candle prediction scenarios in compact card format
 */

import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const ScenarioCards = ({ scenarios, mostLikelyPath, className = '' }) => {
  const [expandedScenario, setExpandedScenario] = useState(null);

  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No scenarios available</p>
      </div>
    );
  }

  const getPathColor = (direction) => {
    switch (direction?.toUpperCase()) {
      case 'UP':
      case 'BUY':
        return 'text-green-600';
      case 'DOWN':
      case 'SELL':
        return 'text-red-600';
      default:
        return 'text-gray-600';
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
        return '➡️';
    }
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 75) return 'bg-green-500';
    if (probability >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getBorderColor = (rank, probability) => {
    if (rank === 1) return 'border-green-200 bg-green-50';
    if (probability >= 65) return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-gray-50';
  };

  const formatPath = (path) => {
    if (!Array.isArray(path)) return 'Unknown Path';
    return path.map((direction, index) => (
      <span key={index} className="inline-flex items-center">
        <span className={`font-semibold ${getPathColor(direction)}`}>
          {getPathIcon(direction)} {direction}
        </span>
        {index < path.length - 1 && (
          <span className="mx-2 text-gray-400">→</span>
        )}
      </span>
    ));
  };

  const toggleExpanded = (scenarioRank) => {
    setExpandedScenario(expandedScenario === scenarioRank ? null : scenarioRank);
  };

  const truncateReasoning = (reasoning, maxLength = 120) => {
    if (!reasoning || reasoning.length <= maxLength) return reasoning;
    return reasoning.substring(0, maxLength) + '...';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          🎯 Prediction Scenarios
        </h3>
        <Badge variant="outline" className="text-xs">
          {scenarios.length} scenarios
        </Badge>
      </div>

      {/* Most Likely Path Summary */}
      {mostLikelyPath && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-800">
              🏆 Most Likely Path:
            </span>
            <span className="text-sm text-blue-700">{mostLikelyPath}</span>
          </div>
        </div>
      )}

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((scenario) => (
          <Card 
            key={scenario.rank} 
            className={`transition-all duration-200 hover:shadow-md ${getBorderColor(scenario.rank, scenario.probability)}`}
          >
            <CardContent className="p-4">
              {/* Scenario Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={scenario.rank === 1 ? "default" : "secondary"}
                    className="text-xs font-bold"
                  >
                    #{scenario.rank}
                  </Badge>
                  <div className={`px-2 py-1 rounded-full text-white text-xs font-bold ${getProbabilityColor(scenario.probability)}`}>
                    {scenario.probability}% Likely
                  </div>
                </div>
                {scenario.rank === 1 && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    Top Pick
                  </Badge>
                )}
              </div>

              {/* Path Display */}
              <div className="mb-3">
                <div className="flex items-center justify-center py-2 px-3 bg-white rounded-lg border">
                  {formatPath(scenario.path)}
                </div>
              </div>

              {/* Reasoning */}
              <div className="text-sm text-gray-600">
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Reasoning:</span>
                </div>
                <p className="leading-relaxed">
                  {expandedScenario === scenario.rank 
                    ? scenario.reasoning 
                    : truncateReasoning(scenario.reasoning)
                  }
                </p>
                
                {/* Show More/Less Button */}
                {scenario.reasoning && scenario.reasoning.length > 120 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(scenario.rank)}
                    className="mt-2 h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {expandedScenario === scenario.rank ? 'Show Less' : 'Show More'}
                  </Button>
                )}
              </div>

              {/* Confidence Indicator */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Confidence Level</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getProbabilityColor(scenario.probability)} transition-all duration-300`}
                        style={{ width: `${scenario.probability}%` }}
                      />
                    </div>
                    <span className="font-medium">{scenario.probability}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-gray-500 pt-2">
        <p>
          Scenarios are sorted by probability • 
          Most likely scenario appears first • 
          Based on technical analysis and market conditions
        </p>
      </div>
    </div>
  );
};

export default ScenarioCards;