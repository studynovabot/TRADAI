/**
 * QXBroker OTC Signals Page
 * 
 * Main page for the QXBroker OTC trading signal generator
 * Implements the complete system as specified in the ultra-detailed prompt
 */

import React from 'react';
import Head from 'next/head';
import QXBrokerOTCSignalGenerator from '../components/QXBrokerOTCSignalGenerator';

const QXBrokerOTCSignalsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>QXBroker OTC Signal Generator | TRADAI</title>
        <meta 
          name="description" 
          content="Professional AI-powered QXBroker OTC trading signal generator using real-time browser automation, OCR, pattern matching, and multi-timeframe analysis for binary options trading." 
        />
        <meta name="keywords" content="QXBroker, OTC trading, binary options, AI signals, pattern matching, technical analysis, multi-timeframe" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph */}
        <meta property="og:title" content="QXBroker OTC Signal Generator" />
        <meta property="og:description" content="Professional AI-powered QXBroker OTC trading signal generator with real-time data analysis" />
        <meta property="og:type" content="website" />
        
        {/* Additional meta tags for trading apps */}
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#1f2937" />
      </Head>

      <main className="min-h-screen bg-gray-900">
        <QXBrokerOTCSignalGenerator />
      </main>
    </>
  );
};

export default QXBrokerOTCSignalsPage;