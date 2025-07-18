/**
 * Production Trading Signal Generator Page
 * 
 * Main interface for the production-ready AI trading signal generator
 */

import React from 'react';
import Head from 'next/head';
import ProductionSignalPanel from '../components/ProductionSignalPanel';

const ProductionPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Production AI Trading Signal Generator | TRADAI</title>
        <meta name="description" content="Ultra-accurate AI trading signals with 85-90% target accuracy using real-time and historical data fusion" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  🧠 TRADAI Production
                </h1>
                <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  LIVE
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Target Accuracy:</span> 85-90%
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Mode:</span> Real Data Only
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Introduction */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Production AI Trading Signal Generator
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Generate ultra-accurate trading signals using our advanced 3-brain AI architecture 
              with real-time data from multiple providers and historical context analysis.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">📡</span>
                <h3 className="text-lg font-semibold text-gray-900">Real-Time Data</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Multi-provider failover system with Twelve Data, Finnhub, Alpha Vantage, and Polygon.io
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">🧠</span>
                <h3 className="text-lg font-semibold text-gray-900">3-Brain AI</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Quant Brain, Analyst Brain, and Reflex Brain working together for maximum accuracy.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">📊</span>
                <h3 className="text-lg font-semibold text-gray-900">Deep Analysis</h3>
              </div>
              <p className="text-gray-600 text-sm">
                2-3 minute processing time for comprehensive technical and pattern analysis.
              </p>
            </div>
          </div>

          {/* Signal Generator Panel */}
          <ProductionSignalPanel />

          {/* System Information */}
          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Architecture</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Data Sources</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Real-time:</strong> Twelve Data (Primary), Finnhub, Alpha Vantage, Polygon</li>
                  <li>• <strong>Historical:</strong> Yahoo Finance for trend context</li>
                  <li>• <strong>Timeframes:</strong> 1m, 3m, 5m, 15m, 30m, 1h, 4h</li>
                  <li>• <strong>Failover:</strong> Automatic provider switching</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">AI Processing</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Quant Brain:</strong> ML/Statistical analysis</li>
                  <li>• <strong>Analyst Brain:</strong> Pattern recognition & reasoning</li>
                  <li>• <strong>Reflex Brain:</strong> Final validation & risk assessment</li>
                  <li>• <strong>Consensus:</strong> 2/3 agreement required</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-yellow-500 mr-2 mt-0.5">⚠️</span>
              <div>
                <h4 className="font-medium text-yellow-800">Important Notice</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  This system is designed for educational and research purposes. All signals are generated 
                  using real market data but should not be considered as financial advice. Always conduct 
                  your own research and consider your risk tolerance before making trading decisions.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-50 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-gray-600">
              <p>© 2024 TRADAI Production Signal Generator</p>
              <p className="mt-1">
                Powered by Multi-Provider Data Fusion • 3-Brain AI Architecture • Real-Time Analysis
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ProductionPage;