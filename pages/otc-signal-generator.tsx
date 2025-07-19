/**
 * OTC Signal Generator Page
 * 
 * Main page for the comprehensive OTC trading signal generator
 * Implements the complete system as specified in the ultra-detailed prompt
 */

import React from 'react';
import Head from 'next/head';
import OTCSignalGenerator from '../components/OTCSignalGenerator';

const OTCSignalGeneratorPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>AI OTC Trading Signal Generator | TRADAI</title>
        <meta 
          name="description" 
          content="Professional AI-powered OTC trading signal generator using real-time browser automation, OCR, pattern matching, and dual-AI validation for binary options trading." 
        />
        <meta name="keywords" content="OTC trading, binary options, AI signals, pattern matching, technical analysis, Quotex, Pocket Option" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph */}
        <meta property="og:title" content="AI OTC Trading Signal Generator" />
        <meta property="og:description" content="Professional AI-powered OTC trading signal generator with real-time data analysis" />
        <meta property="og:type" content="website" />
        
        {/* Additional meta tags for trading apps */}
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#1f2937" />
      </Head>

      <main className="min-h-screen bg-gray-900">
        <OTCSignalGenerator />
      </main>
    </>
  );
};

export default OTCSignalGeneratorPage;