/**
 * Ultra-Precision Signals Page
 * 
 * Main page for the ultra-precision trading signal system
 */

import React from 'react';
import Head from 'next/head';
import UltraPrecisionSignalDashboard from '../components/UltraPrecisionSignalDashboard';

const UltraPrecisionSignalsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Ultra-Precision Trading Signals | TRADAI</title>
        <meta name="description" content="Ultra-precision 2-5 minute trading signals with multi-indicator convergence and advanced pattern recognition" />
        <meta name="keywords" content="trading signals, forex, precision trading, technical analysis, RSI, MACD, candlestick patterns" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        <UltraPrecisionSignalDashboard />
      </main>
    </>
  );
};

export default UltraPrecisionSignalsPage;