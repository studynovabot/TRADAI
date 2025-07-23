/**
 * Advanced Chart Analysis Page
 * 
 * Main page for the advanced trading chart analysis system
 */

import React from 'react';
import Head from 'next/head';
import AdvancedChartAnalyzer from '../components/AdvancedChartAnalyzer';

const AdvancedChartAnalysisPage: React.FC = () => {
    return (
        <>
            <Head>
                <title>Advanced Chart Analysis - TRADAI</title>
                <meta name="description" content="Advanced trading chart analysis with AI-powered pattern recognition and signal generation" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <div className="flex items-center">
                                <h1 className="text-2xl font-bold text-gray-900">TRADAI</h1>
                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                    Advanced
                                </span>
                            </div>
                            <nav className="flex space-x-4">
                                <a href="/" className="text-gray-600 hover:text-gray-900">
                                    Home
                                </a>
                                <a href="/forex-signal-generator" className="text-gray-600 hover:text-gray-900">
                                    Forex Signals
                                </a>
                                <a href="/otc-signal-generator" className="text-gray-600 hover:text-gray-900">
                                    OTC Signals
                                </a>
                            </nav>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="py-8">
                    <AdvancedChartAnalyzer />
                </main>

                {/* Features Section */}
                <section className="bg-white py-12">
                    <div className="max-w-6xl mx-auto px-6">
                        <h2 className="text-2xl font-bold text-center mb-8">Advanced Analysis Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Advanced OCR</h3>
                                <p className="text-gray-600">
                                    High-accuracy text extraction from trading platforms with multi-region analysis
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Computer Vision</h3>
                                <p className="text-gray-600">
                                    AI-powered pattern recognition for candlesticks, support/resistance, and chart formations
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Signal Generation</h3>
                                <p className="text-gray-600">
                                    High-confidence trading signals with precise entry/exit points and risk management
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Technical Specifications */}
                <section className="bg-gray-50 py-12">
                    <div className="max-w-6xl mx-auto px-6">
                        <h2 className="text-2xl font-bold text-center mb-8">Technical Specifications</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <h3 className="text-lg font-semibold mb-4">Analysis Capabilities</h3>
                                <ul className="space-y-2 text-gray-600">
                                    <li>• Multi-timeframe confluence analysis</li>
                                    <li>• 20+ candlestick pattern recognition</li>
                                    <li>• Support/resistance level detection</li>
                                    <li>• Technical indicator interpretation</li>
                                    <li>• Trend and volatility analysis</li>
                                    <li>• Risk/reward calculation</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                                <ul className="space-y-2 text-gray-600">
                                    <li>• 85%+ OCR accuracy on trading platforms</li>
                                    <li>• 80%+ minimum signal confidence</li>
                                    <li>• Sub-30 second processing time</li>
                                    <li>• Support for PNG, JPG, WebP formats</li>
                                    <li>• 10MB maximum file size</li>
                                    <li>• Real-time analysis results</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-white border-t py-8">
                    <div className="max-w-6xl mx-auto px-6 text-center">
                        <p className="text-gray-600">
                            © 2025 TRADAI Advanced Chart Analysis System. 
                            Powered by AI and Computer Vision.
                        </p>
                        <div className="mt-4 flex justify-center space-x-6">
                            <a href="#" className="text-gray-400 hover:text-gray-600">
                                Documentation
                            </a>
                            <a href="#" className="text-gray-400 hover:text-gray-600">
                                API Reference
                            </a>
                            <a href="#" className="text-gray-400 hover:text-gray-600">
                                Support
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default AdvancedChartAnalysisPage;
