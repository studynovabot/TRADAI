// 🎯 TRADING DASHBOARD - EXAMPLE USAGE
// components/TradingDashboard.tsx

import React from 'react';
import TradingViewChart from '../vercel-tradingview-component';
import LiveSignals from '../vercel-tradingview-component';

export default function TradingDashboard() {
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">AI Trading Dashboard</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2">
            <TradingViewChart 
              symbol="EURUSD" 
              interval="5" 
              theme="dark" 
            />
          </div>
          
          {/* Live Signals */}
          <div className="lg:col-span-1">
            <LiveSignals 
              symbol="EURUSD" 
              interval="5" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}