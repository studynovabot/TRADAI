import React, { useState } from 'react';

interface AssetSelectorProps {
  selectedAsset: string;
  onAssetChange: (asset: string) => void;
}

export function AssetSelector({ selectedAsset, onAssetChange }: AssetSelectorProps) {
  const [activeCategory, setActiveCategory] = useState('forex');

  const assets = {
    forex: [
      { symbol: 'EUR/USD', name: 'Euro / US Dollar' },
      { symbol: 'GBP/USD', name: 'British Pound / US Dollar' },
      { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
      { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar' },
      { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc' },
      { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar' },
      { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar' },
      { symbol: 'EUR/GBP', name: 'Euro / British Pound' },
      { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen' },
      { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen' }
    ],
    crypto: [
      { symbol: 'BTC/USDT', name: 'Bitcoin / Tether' },
      { symbol: 'ETH/USDT', name: 'Ethereum / Tether' },
      { symbol: 'BNB/USDT', name: 'Binance Coin / Tether' },
      { symbol: 'XRP/USDT', name: 'Ripple / Tether' },
      { symbol: 'ADA/USDT', name: 'Cardano / Tether' },
      { symbol: 'SOL/USDT', name: 'Solana / Tether' },
      { symbol: 'DOT/USDT', name: 'Polkadot / Tether' },
      { symbol: 'AVAX/USDT', name: 'Avalanche / Tether' },
      { symbol: 'MATIC/USDT', name: 'Polygon / Tether' },
      { symbol: 'LINK/USDT', name: 'Chainlink / Tether' }
    ],
    commodities: [
      { symbol: 'XAU/USD', name: 'Gold / US Dollar' },
      { symbol: 'XAG/USD', name: 'Silver / US Dollar' },
      { symbol: 'WTI/USD', name: 'Crude Oil WTI / US Dollar' },
      { symbol: 'BRENT/USD', name: 'Brent Oil / US Dollar' },
      { symbol: 'NATGAS/USD', name: 'Natural Gas / US Dollar' },
      { symbol: 'COPPER/USD', name: 'Copper / US Dollar' },
      { symbol: 'PLATINUM/USD', name: 'Platinum / US Dollar' },
      { symbol: 'PALLADIUM/USD', name: 'Palladium / US Dollar' }
    ],
    stocks: [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'TSLA', name: 'Tesla, Inc.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'META', name: 'Meta Platforms, Inc.' },
      { symbol: 'NFLX', name: 'Netflix, Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'AMD', name: 'Advanced Micro Devices' },
      { symbol: 'INTC', name: 'Intel Corporation' }
    ]
  };

  const categories = [
    { id: 'forex', name: 'Forex', icon: '💱', color: 'blue' },
    { id: 'crypto', name: 'Crypto', icon: '₿', color: 'orange' },
    { id: 'commodities', name: 'Commodities', icon: '🏆', color: 'yellow' },
    { id: 'stocks', name: 'Stocks', icon: '📈', color: 'green' }
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      blue: isActive ? 'bg-blue-600 text-white' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/40',
      orange: isActive ? 'bg-orange-600 text-white' : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/40',
      yellow: isActive ? 'bg-yellow-600 text-white' : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40',
      green: isActive ? 'bg-green-600 text-white' : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-3">
        Select Asset
      </label>
      
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              getColorClasses(category.color, activeCategory === category.id)
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Asset List */}
      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
        {assets[activeCategory as keyof typeof assets].map((asset) => (
          <button
            key={asset.symbol}
            onClick={() => onAssetChange(asset.symbol)}
            className={`p-3 rounded-lg text-left transition-all duration-200 ${
              selectedAsset === asset.symbol
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <div className="font-semibold">{asset.symbol}</div>
            <div className="text-sm opacity-80">{asset.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}