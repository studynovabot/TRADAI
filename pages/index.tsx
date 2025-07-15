import React from 'react';
import TradingViewChart, { LiveSignals } from '../vercel-tradingview-component';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">
          🤖 TRADAI - AI Trading Dashboard
        </h1>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Trading Chart */}
          <div className="xl:col-span-2">
            <TradingViewChart 
              symbol="EURUSD" 
              interval="5m" 
              theme="dark" 
            />
          </div>
          
          {/* Live Signals */}
          <div className="xl:col-span-1">
            <LiveSignals />
          </div>
        </div>
      </div>
    </div>
  );
}