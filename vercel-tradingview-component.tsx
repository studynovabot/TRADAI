// 📊 TRADINGVIEW CHART COMPONENT FOR VERCEL
// components/charts/TradingViewChart.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useRealTime } from './hooks/useRealTime';

interface TradingViewChartProps {
  symbol: string;
  interval: string;
  theme?: 'light' | 'dark';
}

export default function TradingViewChart({ 
  symbol, 
  interval, 
  theme = 'dark' 
}: TradingViewChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { signals } = useRealTime();
  
  useEffect(() => {
    // 📦 Load TradingView script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, []);
  
  useEffect(() => {
    if (!isLoaded || !chartRef.current) return;
    
    // 🎯 Initialize TradingView widget
    const containerId = `tradingview-widget-${Date.now()}`;
    chartRef.current.id = containerId;
    
    widgetRef.current = new (window as any).TradingView.widget({
      symbol,
      interval,
      container_id: containerId,
      width: '100%',
      height: 600,
      theme,
      style: '1', // Candlestick
      locale: 'en',
      toolbar_bg: theme === 'dark' ? '#1a1a1a' : '#ffffff',
      enable_publishing: false,
      allow_symbol_change: true,
      studies: [
        'RSI@tv-basicstudies',
        'MACD@tv-basicstudies',
        'BB@tv-basicstudies',
        'EMA@tv-basicstudies'
      ],
      overrides: {
        'paneProperties.background': theme === 'dark' ? '#1a1a1a' : '#ffffff',
        'paneProperties.vertGridProperties.color': theme === 'dark' ? '#2a2a2a' : '#e0e0e0',
        'paneProperties.horzGridProperties.color': theme === 'dark' ? '#2a2a2a' : '#e0e0e0',
        'symbolWatermarkProperties.transparency': 90,
        'scalesProperties.textColor': theme === 'dark' ? '#ffffff' : '#333333'
      }
    });
    
    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
      }
    };
  }, [isLoaded, symbol, interval, theme]);
  
  // 🎯 Add signal markers to chart
  useEffect(() => {
    if (!widgetRef.current || !signals.length) return;
    
    const latestSignal = signals[0];
    if (latestSignal.pair === symbol) {
      // 📍 Add signal marker
      widgetRef.current.chart().createShape({
        time: new Date(latestSignal.timestamp).getTime() / 1000,
        channel: 'high',
        text: `${latestSignal.direction} - ${latestSignal.confidence}%`,
        shape: 'arrow_up',
        color: latestSignal.direction === 'CALL' ? '#00ff00' : '#ff0000'
      });
    }
  }, [signals, symbol]);
  
  return (
    <div className="relative w-full">
      <div ref={chartRef} className="w-full h-[600px] bg-gray-900 rounded-lg" />
      
      {/* 🎯 Signal Overlay */}
      {signals.length > 0 && (
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white">
          <h3 className="font-bold mb-2">Latest Signal</h3>
          <div className="space-y-1 text-sm">
            <p>Direction: <span className={`font-bold ${signals[0].direction === 'CALL' ? 'text-green-400' : 'text-red-400'}`}>
              {signals[0].direction}
            </span></p>
            <p>Confidence: <span className="text-blue-400">{signals[0].confidence}%</span></p>
            <p>Time: {new Date(signals[0].timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// 🎯 SIGNAL DISPLAY COMPONENT
// components/dashboard/LiveSignals.tsx

import React from 'react';
import { useRealTime } from './hooks/useRealTime';

export default function LiveSignals() {
  const { signals, connected } = useRealTime();
  
  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Live Signals</h2>
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {signals.map((signal) => (
          <div key={signal.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">{signal.pair}</span>
              <span className={`px-2 py-1 rounded text-sm font-bold ${
                signal.direction === 'CALL' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {signal.direction}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Confidence</p>
                <p className="text-blue-400 font-semibold">{signal.confidence}%</p>
              </div>
              <div>
                <p className="text-gray-400">Timeframe</p>
                <p className="text-white">{signal.timeframe}</p>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-400">
              {new Date(signal.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}