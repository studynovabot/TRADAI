#!/usr/bin/env python3
"""
Advanced Large-Scale Dataset Collector for AI Trading Model
Collects 100k-500k+ samples from multiple sources with multi-timeframe context
Professional-grade data pipeline for maximum model accuracy
"""

import yfinance as yf
import pandas as pd
import numpy as np
import requests
import json
import time
import os
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import talib
from typing import Dict, List, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AdvancedDataCollector:
    def __init__(self):
        self.timeframes = ['1m', '3m', '5m', '15m', '30m', '1h']
        self.target_timeframe = '5m'  # Primary prediction timeframe
        self.lookback_candles = 24    # Number of historical candles for context
        self.min_samples_per_symbol = 10000  # Minimum samples per trading pair
        
        # Trading pairs to collect (high-volume, liquid pairs)
        self.forex_pairs = [
            'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X',
            'USDCAD=X', 'NZDUSD=X', 'EURGBP=X', 'EURJPY=X', 'GBPJPY=X'
        ]
        
        self.crypto_pairs = [
            'BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD',
            'SOL-USD', 'DOGE-USD', 'MATIC-USD', 'DOT-USD', 'AVAX-USD'
        ]
        
        # Data quality filters
        self.quality_filters = {
            'min_volume': 1000,           # Minimum volume per candle
            'max_gap_percentage': 0.5,    # Max price gap between candles
            'min_price_movement': 0.0001, # Minimum price movement to avoid flat periods
            'max_volatility': 0.1         # Maximum volatility to filter extreme events
        }
        
        self.collected_data = []
        self.data_stats = {
            'total_samples': 0,
            'quality_samples': 0,
            'sources': {},
            'timeframe_coverage': {}
        }
    
    def collect_large_dataset(self, target_samples: int = 100000) -> Dict:
        """
        Collect large-scale dataset from multiple sources
        """
        logger.info(f"🚀 Starting large-scale data collection for {target_samples:,} samples")
        
        try:
            # Phase 1: Collect from Yahoo Finance (Free, reliable)
            logger.info("📊 Phase 1: Collecting from Yahoo Finance...")
            yf_data = self.collect_from_yahoo_finance(target_samples // 2)
            
            # Phase 2: Collect from Binance (High-quality crypto data)
            logger.info("🪙 Phase 2: Collecting from Binance...")
            binance_data = self.collect_from_binance(target_samples // 4)
            
            # Phase 3: Collect from Alpha Vantage (Professional forex data)
            logger.info("💱 Phase 3: Collecting from Alpha Vantage...")
            av_data = self.collect_from_alpha_vantage(target_samples // 4)
            
            # Combine all data sources
            all_data = yf_data + binance_data + av_data
            
            # Phase 4: Data quality filtering and enhancement
            logger.info("🔍 Phase 4: Quality filtering and enhancement...")
            quality_data = self.apply_quality_filters(all_data)
            
            # Phase 5: Feature engineering and labeling
            logger.info("🧠 Phase 5: Feature engineering and labeling...")
            final_dataset = self.engineer_features_and_labels(quality_data)
            
            # Save dataset
            self.save_dataset(final_dataset)
            
            logger.info(f"✅ Dataset collection complete: {len(final_dataset):,} high-quality samples")
            return {
                'dataset': final_dataset,
                'stats': self.data_stats,
                'quality_score': len(final_dataset) / len(all_data) if all_data else 0
            }
            
        except Exception as e:
            logger.error(f"💥 Dataset collection failed: {e}")
            raise
    
    def collect_from_yahoo_finance(self, target_samples: int) -> List[Dict]:
        """
        Collect data from Yahoo Finance with multi-timeframe context
        """
        logger.info(f"📈 Collecting {target_samples:,} samples from Yahoo Finance...")
        
        collected_data = []
        samples_per_symbol = target_samples // len(self.forex_pairs + self.crypto_pairs)
        
        def collect_symbol_data(symbol: str) -> List[Dict]:
            try:
                logger.info(f"Downloading {symbol}...")
                
                # Download 2 years of data for sufficient samples
                ticker = yf.Ticker(symbol)
                
                # Collect multiple timeframes
                timeframe_data = {}
                for tf in self.timeframes:
                    try:
                        data = ticker.history(period='2y', interval=tf)
                        if len(data) > 100:  # Ensure sufficient data
                            timeframe_data[tf] = data
                            logger.info(f"  {symbol} {tf}: {len(data)} candles")
                    except Exception as e:
                        logger.warning(f"  Failed to get {symbol} {tf}: {e}")
                        continue
                
                # Process multi-timeframe data into samples
                if self.target_timeframe in timeframe_data:
                    samples = self.create_multi_timeframe_samples(symbol, timeframe_data)
                    logger.info(f"  {symbol}: Generated {len(samples)} samples")
                    return samples[:samples_per_symbol]  # Limit samples per symbol
                
                return []
                
            except Exception as e:
                logger.error(f"Failed to collect {symbol}: {e}")
                return []
        
        # Parallel data collection for speed
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            for symbol in self.forex_pairs + self.crypto_pairs:
                futures.append(executor.submit(collect_symbol_data, symbol))
            
            for future in as_completed(futures):
                try:
                    symbol_data = future.result()
                    collected_data.extend(symbol_data)
                except Exception as e:
                    logger.error(f"Symbol collection failed: {e}")
        
        self.data_stats['sources']['yahoo_finance'] = len(collected_data)
        logger.info(f"✅ Yahoo Finance: {len(collected_data):,} samples collected")
        return collected_data
    
    def collect_from_binance(self, target_samples: int) -> List[Dict]:
        """
        Collect high-quality crypto data from Binance API
        """
        logger.info(f"🪙 Collecting {target_samples:,} samples from Binance...")
        
        collected_data = []
        
        # Binance API endpoints
        base_url = "https://api.binance.com/api/v3/klines"
        
        # Convert timeframes to Binance format
        binance_intervals = {
            '1m': '1m', '3m': '3m', '5m': '5m', 
            '15m': '15m', '30m': '30m', '1h': '1h'
        }
        
        crypto_symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT']
        samples_per_symbol = target_samples // len(crypto_symbols)
        
        for symbol in crypto_symbols:
            try:
                logger.info(f"Collecting Binance data for {symbol}...")
                
                timeframe_data = {}
                
                for tf, interval in binance_intervals.items():
                    try:
                        # Get 1000 candles (max per request)
                        params = {
                            'symbol': symbol,
                            'interval': interval,
                            'limit': 1000
                        }
                        
                        response = requests.get(base_url, params=params)
                        if response.status_code == 200:
                            klines = response.json()
                            
                            # Convert to DataFrame
                            df = pd.DataFrame(klines, columns=[
                                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                                'taker_buy_quote', 'ignore'
                            ])
                            
                            # Convert to proper types
                            for col in ['open', 'high', 'low', 'close', 'volume']:
                                df[col] = pd.to_numeric(df[col])
                            
                            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                            df.set_index('timestamp', inplace=True)
                            
                            timeframe_data[tf] = df
                            logger.info(f"  {symbol} {tf}: {len(df)} candles")
                            
                        time.sleep(0.1)  # Rate limiting
                        
                    except Exception as e:
                        logger.warning(f"Failed to get {symbol} {tf} from Binance: {e}")
                        continue
                
                # Create samples from multi-timeframe data
                if self.target_timeframe in timeframe_data:
                    samples = self.create_multi_timeframe_samples(symbol, timeframe_data)
                    collected_data.extend(samples[:samples_per_symbol])
                    logger.info(f"  {symbol}: Generated {len(samples)} samples")
                
            except Exception as e:
                logger.error(f"Failed to collect Binance data for {symbol}: {e}")
                continue
        
        self.data_stats['sources']['binance'] = len(collected_data)
        logger.info(f"✅ Binance: {len(collected_data):,} samples collected")
        return collected_data
    
    def collect_from_alpha_vantage(self, target_samples: int) -> List[Dict]:
        """
        Collect professional forex data from Alpha Vantage
        Note: Requires API key (free tier available)
        """
        logger.info(f"💱 Collecting {target_samples:,} samples from Alpha Vantage...")

        collected_data = []

        # Alpha Vantage API configuration
        api_key = os.getenv('ALPHA_VANTAGE_API_KEY', 'demo')  # Use environment variable
        base_url = "https://www.alphavantage.co/query"

        # Major forex pairs for Alpha Vantage
        av_forex_pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD']
        samples_per_symbol = target_samples // len(av_forex_pairs)

        if api_key == 'demo':
            logger.info("⚠️ Alpha Vantage collection skipped (no API key provided)")
            logger.info("💡 Set ALPHA_VANTAGE_API_KEY environment variable to enable")
            self.data_stats['sources']['alpha_vantage'] = 0
            return []

        for pair in av_forex_pairs:
            try:
                logger.info(f"Collecting Alpha Vantage data for {pair}...")

                timeframe_data = {}

                # Alpha Vantage interval mapping
                av_intervals = {
                    '1m': '1min', '5m': '5min', '15m': '15min',
                    '30m': '30min', '1h': '60min'
                }

                for tf, interval in av_intervals.items():
                    try:
                        params = {
                            'function': 'FX_INTRADAY',
                            'from_symbol': pair[:3],
                            'to_symbol': pair[3:],
                            'interval': interval,
                            'apikey': api_key,
                            'outputsize': 'full'
                        }

                        response = requests.get(base_url, params=params)
                        if response.status_code == 200:
                            data = response.json()

                            if f'Time Series FX ({interval})' in data:
                                time_series = data[f'Time Series FX ({interval})']

                                # Convert to DataFrame
                                df_data = []
                                for timestamp, values in time_series.items():
                                    df_data.append({
                                        'timestamp': pd.to_datetime(timestamp),
                                        'open': float(values['1. open']),
                                        'high': float(values['2. high']),
                                        'low': float(values['3. low']),
                                        'close': float(values['4. close']),
                                        'volume': 1000  # Alpha Vantage doesn't provide forex volume
                                    })

                                df = pd.DataFrame(df_data)
                                df.set_index('timestamp', inplace=True)
                                df.sort_index(inplace=True)

                                timeframe_data[tf] = df
                                logger.info(f"  {pair} {tf}: {len(df)} candles")

                        time.sleep(12)  # Alpha Vantage rate limit (5 calls per minute)

                    except Exception as e:
                        logger.warning(f"Failed to get {pair} {tf} from Alpha Vantage: {e}")
                        continue

                # Create samples from multi-timeframe data
                if self.target_timeframe in timeframe_data:
                    samples = self.create_multi_timeframe_samples(pair, timeframe_data)
                    collected_data.extend(samples[:samples_per_symbol])
                    logger.info(f"  {pair}: Generated {len(samples)} samples")

            except Exception as e:
                logger.error(f"Failed to collect Alpha Vantage data for {pair}: {e}")
                continue

        self.data_stats['sources']['alpha_vantage'] = len(collected_data)
        logger.info(f"✅ Alpha Vantage: {len(collected_data):,} samples collected")
        return collected_data
    
    def create_multi_timeframe_samples(self, symbol: str, timeframe_data: Dict[str, pd.DataFrame]) -> List[Dict]:
        """
        Create training samples with multi-timeframe context
        """
        samples = []
        
        try:
            # Get target timeframe data
            target_df = timeframe_data[self.target_timeframe]
            
            # Ensure we have enough data
            if len(target_df) < self.lookback_candles + 10:
                return samples
            
            # Create samples
            for i in range(self.lookback_candles, len(target_df) - 1):
                try:
                    # Get current timestamp
                    current_time = target_df.index[i]
                    
                    # Extract multi-timeframe context
                    context = {}
                    for tf, df in timeframe_data.items():
                        # Find closest candles for this timeframe
                        tf_candles = self.get_timeframe_context(df, current_time, tf)
                        if tf_candles is not None:
                            context[tf] = tf_candles
                    
                    # Skip if we don't have enough timeframe data
                    if len(context) < 3:
                        continue
                    
                    # Get current and next candle for labeling
                    current_candle = target_df.iloc[i]
                    next_candle = target_df.iloc[i + 1]
                    
                    # Create sample
                    sample = {
                        'symbol': symbol,
                        'timestamp': current_time,
                        'timeframe_context': context,
                        'current_candle': {
                            'open': float(current_candle['open']),
                            'high': float(current_candle['high']),
                            'low': float(current_candle['low']),
                            'close': float(current_candle['close']),
                            'volume': float(current_candle['volume'])
                        },
                        'next_candle': {
                            'open': float(next_candle['open']),
                            'high': float(next_candle['high']),
                            'low': float(next_candle['low']),
                            'close': float(next_candle['close']),
                            'volume': float(next_candle['volume'])
                        }
                    }
                    
                    samples.append(sample)
                    
                except Exception as e:
                    continue  # Skip problematic samples
            
            return samples
            
        except Exception as e:
            logger.error(f"Failed to create samples for {symbol}: {e}")
            return []
    
    def get_timeframe_context(self, df: pd.DataFrame, target_time: pd.Timestamp, timeframe: str) -> Optional[List[Dict]]:
        """
        Get historical candles for a specific timeframe around target time
        """
        try:
            # Find the closest candle to target time
            time_diff = abs(df.index - target_time)
            closest_idx = time_diff.argmin()
            
            # Get lookback candles
            start_idx = max(0, closest_idx - self.lookback_candles)
            end_idx = closest_idx + 1
            
            candles_slice = df.iloc[start_idx:end_idx]
            
            if len(candles_slice) < 5:  # Minimum candles required
                return None
            
            # Convert to list of dictionaries
            candles = []
            for _, candle in candles_slice.iterrows():
                candles.append({
                    'timestamp': candle.name.timestamp() * 1000,  # Convert to milliseconds
                    'open': float(candle['open']),
                    'high': float(candle['high']),
                    'low': float(candle['low']),
                    'close': float(candle['close']),
                    'volume': float(candle['volume'])
                })
            
            return candles
            
        except Exception as e:
            return None
    
    def apply_quality_filters(self, raw_data: List[Dict]) -> List[Dict]:
        """
        Apply quality filters to ensure high-quality training data
        """
        logger.info(f"🔍 Applying quality filters to {len(raw_data):,} samples...")
        
        quality_data = []
        
        for sample in raw_data:
            try:
                # Check if sample meets quality criteria
                if self.is_quality_sample(sample):
                    quality_data.append(sample)
            except Exception as e:
                continue  # Skip problematic samples
        
        quality_ratio = len(quality_data) / len(raw_data) if raw_data else 0
        logger.info(f"✅ Quality filtering complete: {len(quality_data):,} samples ({quality_ratio:.1%} pass rate)")
        
        self.data_stats['quality_samples'] = len(quality_data)
        return quality_data
    
    def is_quality_sample(self, sample: Dict) -> bool:
        """
        Check if a sample meets quality criteria
        """
        try:
            current = sample['current_candle']
            next_candle = sample['next_candle']
            
            # Check volume
            if current['volume'] < self.quality_filters['min_volume']:
                return False
            
            # Check for reasonable price movement
            price_change = abs(next_candle['close'] - current['close']) / current['close']
            if price_change < self.quality_filters['min_price_movement']:
                return False
            
            if price_change > self.quality_filters['max_volatility']:
                return False
            
            # Check for gaps
            gap = abs(next_candle['open'] - current['close']) / current['close']
            if gap > self.quality_filters['max_gap_percentage']:
                return False
            
            # Check timeframe context completeness
            if len(sample['timeframe_context']) < 3:
                return False
            
            return True
            
        except Exception as e:
            return False
    
    def engineer_features_and_labels(self, quality_data: List[Dict]) -> List[Dict]:
        """
        Advanced feature engineering with multi-timeframe context
        """
        logger.info(f"🧠 Engineering features for {len(quality_data):,} samples...")

        engineered_data = []

        for sample in quality_data:
            try:
                # Create advanced feature set
                features = self.create_advanced_features(sample)

                # Create intelligent labels
                labels = self.create_intelligent_labels(sample)

                # Combine into final training sample
                training_sample = {
                    'features': features,
                    'labels': labels,
                    'metadata': {
                        'symbol': sample['symbol'],
                        'timestamp': sample['timestamp'].isoformat() if hasattr(sample['timestamp'], 'isoformat') else sample['timestamp']
                    }
                }

                engineered_data.append(training_sample)

            except Exception as e:
                logger.warning(f"Failed to engineer features for sample: {e}")
                continue

        logger.info(f"✅ Feature engineering complete: {len(engineered_data):,} samples")
        return engineered_data

    def create_advanced_features(self, sample: Dict) -> Dict:
        """
        Create sophisticated feature set for each sample
        """
        features = {
            'timeframe_features': {},
            'technical_indicators': {},
            'pattern_features': {},
            'market_context': {},
            'price_action': {}
        }

        # Process each timeframe
        for tf, candles in sample['timeframe_context'].items():
            if len(candles) >= 10:  # Ensure sufficient data
                tf_features = self.extract_timeframe_features(candles, tf)
                features['timeframe_features'][tf] = tf_features

        # Extract current candle features
        current = sample['current_candle']
        features['price_action'] = {
            'body_size': abs(current['close'] - current['open']) / current['open'],
            'upper_wick': (current['high'] - max(current['open'], current['close'])) / current['open'],
            'lower_wick': (min(current['open'], current['close']) - current['low']) / current['open'],
            'is_bullish': 1 if current['close'] > current['open'] else 0,
            'volume_normalized': current['volume'] / 10000  # Normalize volume
        }

        return features

    def extract_timeframe_features(self, candles: List[Dict], timeframe: str) -> Dict:
        """
        Extract comprehensive technical indicators and features for a specific timeframe
        """
        try:
            # Convert to arrays for TA-Lib
            closes = np.array([c['close'] for c in candles])
            highs = np.array([c['high'] for c in candles])
            lows = np.array([c['low'] for c in candles])
            opens = np.array([c['open'] for c in candles])
            volumes = np.array([c['volume'] for c in candles])

            features = {}

            # === MOMENTUM INDICATORS ===

            # RSI (multiple periods)
            if len(closes) >= 14:
                rsi14 = talib.RSI(closes, timeperiod=14)
                rsi7 = talib.RSI(closes, timeperiod=7) if len(closes) >= 7 else rsi14
                features['rsi14'] = float(rsi14[-1]) if not np.isnan(rsi14[-1]) else 50.0
                features['rsi7'] = float(rsi7[-1]) if not np.isnan(rsi7[-1]) else 50.0
                features['rsi_divergence'] = features['rsi14'] - features['rsi7']

            # Stochastic Oscillator
            if len(closes) >= 14:
                stoch_k, stoch_d = talib.STOCH(highs, lows, closes)
                features['stoch_k'] = float(stoch_k[-1]) if not np.isnan(stoch_k[-1]) else 50.0
                features['stoch_d'] = float(stoch_d[-1]) if not np.isnan(stoch_d[-1]) else 50.0

            # Williams %R
            if len(closes) >= 14:
                willr = talib.WILLR(highs, lows, closes)
                features['williams_r'] = float(willr[-1]) if not np.isnan(willr[-1]) else -50.0

            # === TREND INDICATORS ===

            # Multiple EMAs for trend analysis
            if len(closes) >= 50:
                ema9 = talib.EMA(closes, timeperiod=9)
                ema21 = talib.EMA(closes, timeperiod=21)
                ema50 = talib.EMA(closes, timeperiod=50)

                features['ema9'] = float(ema9[-1]) if not np.isnan(ema9[-1]) else closes[-1]
                features['ema21'] = float(ema21[-1]) if not np.isnan(ema21[-1]) else closes[-1]
                features['ema50'] = float(ema50[-1]) if not np.isnan(ema50[-1]) else closes[-1]

                # EMA relationships (trend strength)
                features['ema9_21_ratio'] = features['ema9'] / features['ema21']
                features['ema21_50_ratio'] = features['ema21'] / features['ema50']
                features['price_ema9_ratio'] = closes[-1] / features['ema9']

            # MACD with enhanced signals
            if len(closes) >= 26:
                macd, signal, hist = talib.MACD(closes)
                features['macd'] = float(macd[-1]) if not np.isnan(macd[-1]) else 0.0
                features['macd_signal'] = float(signal[-1]) if not np.isnan(signal[-1]) else 0.0
                features['macd_histogram'] = float(hist[-1]) if not np.isnan(hist[-1]) else 0.0

                # MACD momentum
                if len(hist) >= 2:
                    features['macd_momentum'] = float(hist[-1] - hist[-2])

            # ADX (trend strength)
            if len(closes) >= 14:
                adx = talib.ADX(highs, lows, closes)
                features['adx'] = float(adx[-1]) if not np.isnan(adx[-1]) else 25.0

            # === VOLATILITY INDICATORS ===

            # Bollinger Bands with enhanced features
            if len(closes) >= 20:
                bb_upper, bb_middle, bb_lower = talib.BBANDS(closes)
                features['bb_position'] = (closes[-1] - bb_lower[-1]) / (bb_upper[-1] - bb_lower[-1])
                features['bb_squeeze'] = (bb_upper[-1] - bb_lower[-1]) / bb_middle[-1]
                features['bb_width'] = (bb_upper[-1] - bb_lower[-1]) / bb_middle[-1]

                # BB breakout signals
                features['bb_upper_break'] = 1 if closes[-1] > bb_upper[-1] else 0
                features['bb_lower_break'] = 1 if closes[-1] < bb_lower[-1] else 0

            # ATR (volatility) with multiple periods
            if len(closes) >= 14:
                atr14 = talib.ATR(highs, lows, closes, timeperiod=14)
                atr7 = talib.ATR(highs, lows, closes, timeperiod=7) if len(closes) >= 7 else atr14

                features['atr14'] = float(atr14[-1]) if not np.isnan(atr14[-1]) else 0.0
                features['atr7'] = float(atr7[-1]) if not np.isnan(atr7[-1]) else 0.0
                features['atr_normalized'] = features['atr14'] / closes[-1]
                features['atr_ratio'] = features['atr7'] / features['atr14'] if features['atr14'] > 0 else 1.0

            # === VOLUME INDICATORS ===

            # Volume analysis with multiple periods
            if len(volumes) >= 20:
                avg_volume_10 = np.mean(volumes[-10:])
                avg_volume_20 = np.mean(volumes[-20:])

                features['volume_ratio_10'] = volumes[-1] / avg_volume_10 if avg_volume_10 > 0 else 1.0
                features['volume_ratio_20'] = volumes[-1] / avg_volume_20 if avg_volume_20 > 0 else 1.0
                features['volume_trend'] = avg_volume_10 / avg_volume_20 if avg_volume_20 > 0 else 1.0

            # On-Balance Volume (OBV)
            if len(closes) >= 10:
                obv = talib.OBV(closes, volumes)
                features['obv'] = float(obv[-1]) if not np.isnan(obv[-1]) else 0.0

                # OBV momentum
                if len(obv) >= 5:
                    features['obv_momentum'] = float(obv[-1] - obv[-5])

            # === PRICE ACTION PATTERNS ===

            # Price momentum (multiple periods)
            if len(closes) >= 10:
                features['momentum_3'] = (closes[-1] - closes[-3]) / closes[-3] if len(closes) >= 3 else 0.0
                features['momentum_5'] = (closes[-1] - closes[-5]) / closes[-5]
                features['momentum_10'] = (closes[-1] - closes[-10]) / closes[-10]

            # Support/Resistance levels
            if len(closes) >= 20:
                recent_highs = highs[-20:]
                recent_lows = lows[-20:]

                resistance = np.max(recent_highs)
                support = np.min(recent_lows)

                features['resistance_distance'] = (resistance - closes[-1]) / closes[-1]
                features['support_distance'] = (closes[-1] - support) / closes[-1]

            # Candlestick patterns (basic)
            if len(closes) >= 3:
                # Doji detection
                body_size = abs(closes[-1] - opens[-1]) / opens[-1]
                features['is_doji'] = 1 if body_size < 0.001 else 0

                # Hammer/Shooting star
                upper_wick = (highs[-1] - max(opens[-1], closes[-1])) / opens[-1]
                lower_wick = (min(opens[-1], closes[-1]) - lows[-1]) / opens[-1]

                features['upper_wick_ratio'] = upper_wick
                features['lower_wick_ratio'] = lower_wick
                features['is_hammer'] = 1 if lower_wick > 2 * body_size and upper_wick < body_size else 0
                features['is_shooting_star'] = 1 if upper_wick > 2 * body_size and lower_wick < body_size else 0

            return features

        except Exception as e:
            logger.warning(f"Failed to extract features for {timeframe}: {e}")
            return {}

    def create_intelligent_labels(self, sample: Dict) -> Dict:
        """
        Create sophisticated labels with multi-factor confidence scoring
        """
        current = sample['current_candle']
        next_candle = sample['next_candle']

        # Basic direction label
        direction = 'UP' if next_candle['close'] > current['close'] else 'DOWN'

        # Calculate price movement metrics
        price_change = (next_candle['close'] - current['close']) / current['close']
        price_change_abs = abs(price_change)

        # === CONFIDENCE SCORING SYSTEM ===

        # Base confidence from price movement strength
        if price_change_abs > 0.01:      # Very strong movement (>1%)
            base_confidence = 0.95
        elif price_change_abs > 0.005:   # Strong movement (>0.5%)
            base_confidence = 0.90
        elif price_change_abs > 0.003:   # Medium movement (>0.3%)
            base_confidence = 0.80
        elif price_change_abs > 0.001:   # Weak movement (>0.1%)
            base_confidence = 0.70
        else:                            # Very weak movement
            base_confidence = 0.60

        # Volume confirmation factor
        volume_ratio = next_candle['volume'] / current['volume'] if current['volume'] > 0 else 1.0
        volume_factor = 0.0

        if volume_ratio > 2.0:      # Exceptional volume
            volume_factor = 0.08
        elif volume_ratio > 1.5:    # High volume confirmation
            volume_factor = 0.05
        elif volume_ratio > 1.2:    # Moderate volume confirmation
            volume_factor = 0.02
        elif volume_ratio < 0.5:    # Low volume (less reliable)
            volume_factor = -0.10
        elif volume_ratio < 0.7:    # Below average volume
            volume_factor = -0.05

        # Candle pattern factor
        pattern_factor = self.analyze_candle_pattern_strength(current, next_candle)

        # Multi-timeframe confluence factor
        confluence_factor = self.analyze_timeframe_confluence(sample)

        # Market context factor (volatility, trend)
        context_factor = self.analyze_market_context(sample)

        # Calculate final confidence
        final_confidence = base_confidence + volume_factor + pattern_factor + confluence_factor + context_factor
        final_confidence = max(0.50, min(0.98, final_confidence))  # Clamp between 50-98%

        # === QUALITY FILTERS ===

        # Filter out noisy/choppy conditions
        is_quality_signal = self.is_quality_trading_signal(sample, price_change_abs, volume_ratio)

        # Trend alignment check
        trend_alignment = self.check_trend_alignment(sample, direction)

        # Support/Resistance confluence
        sr_confluence = self.check_support_resistance_confluence(sample)

        return {
            'direction': direction,
            'confidence': final_confidence,
            'price_change': price_change,
            'price_change_abs': price_change_abs,
            'volume_confirmation': volume_ratio > 1.2,
            'volume_ratio': volume_ratio,
            'is_quality_signal': is_quality_signal,
            'trend_alignment': trend_alignment,
            'sr_confluence': sr_confluence,
            'pattern_strength': pattern_factor,
            'confluence_score': confluence_factor,
            'context_score': context_factor,
            'signal_strength': self.categorize_signal_strength(final_confidence)
        }

    def analyze_candle_pattern_strength(self, current: Dict, next_candle: Dict) -> float:
        """
        Analyze candlestick pattern strength for confidence adjustment
        """
        try:
            # Current candle analysis
            body_size = abs(current['close'] - current['open']) / current['open']
            upper_wick = (current['high'] - max(current['open'], current['close'])) / current['open']
            lower_wick = (min(current['open'], current['close']) - current['low']) / current['open']

            pattern_factor = 0.0

            # Strong body candles are more reliable
            if body_size > 0.005:  # Strong body (>0.5%)
                pattern_factor += 0.03
            elif body_size < 0.001:  # Doji/indecision
                pattern_factor -= 0.05

            # Wick analysis
            total_wick = upper_wick + lower_wick
            if total_wick > body_size * 3:  # Long wicks indicate indecision
                pattern_factor -= 0.03

            # Next candle confirmation
            next_body_size = abs(next_candle['close'] - next_candle['open']) / next_candle['open']
            if next_body_size > 0.003:  # Strong follow-through
                pattern_factor += 0.02

            return pattern_factor

        except Exception:
            return 0.0

    def analyze_timeframe_confluence(self, sample: Dict) -> float:
        """
        Analyze multi-timeframe confluence for confidence boost
        """
        try:
            confluence_factor = 0.0
            timeframe_context = sample.get('timeframe_context', {})

            # Count how many timeframes agree with the direction
            direction = 'UP' if sample['next_candle']['close'] > sample['current_candle']['close'] else 'DOWN'
            agreeing_timeframes = 0
            total_timeframes = 0

            for tf, candles in timeframe_context.items():
                if len(candles) >= 2:
                    tf_direction = 'UP' if candles[-1]['close'] > candles[-2]['close'] else 'DOWN'
                    if tf_direction == direction:
                        agreeing_timeframes += 1
                    total_timeframes += 1

            if total_timeframes > 0:
                agreement_ratio = agreeing_timeframes / total_timeframes
                if agreement_ratio >= 0.8:      # Strong confluence (80%+)
                    confluence_factor = 0.05
                elif agreement_ratio >= 0.6:    # Good confluence (60%+)
                    confluence_factor = 0.03
                elif agreement_ratio < 0.4:     # Poor confluence (<40%)
                    confluence_factor = -0.03

            return confluence_factor

        except Exception:
            return 0.0

    def analyze_market_context(self, sample: Dict) -> float:
        """
        Analyze market context (volatility, trend strength) for confidence adjustment
        """
        try:
            context_factor = 0.0

            # Analyze volatility from timeframe context
            timeframe_context = sample.get('timeframe_context', {})
            target_tf_data = timeframe_context.get(self.target_timeframe, [])

            if len(target_tf_data) >= 10:
                # Calculate recent volatility
                recent_ranges = []
                for candle in target_tf_data[-10:]:
                    range_pct = (candle['high'] - candle['low']) / candle['close']
                    recent_ranges.append(range_pct)

                avg_volatility = np.mean(recent_ranges)

                # Moderate volatility is preferred
                if 0.002 <= avg_volatility <= 0.008:  # Sweet spot for binary options
                    context_factor += 0.02
                elif avg_volatility > 0.015:  # Too volatile
                    context_factor -= 0.05
                elif avg_volatility < 0.001:  # Too quiet
                    context_factor -= 0.03

            return context_factor

        except Exception:
            return 0.0

    def is_quality_trading_signal(self, sample: Dict, price_change_abs: float, volume_ratio: float) -> bool:
        """
        Determine if this is a quality trading signal worth including in training
        """
        try:
            # Minimum price movement required
            if price_change_abs < 0.0005:  # Less than 0.05% movement
                return False

            # Avoid extreme volatility spikes
            if price_change_abs > 0.02:  # More than 2% movement (likely news/manipulation)
                return False

            # Require reasonable volume
            if volume_ratio < 0.3 or volume_ratio > 5.0:  # Extreme volume ratios
                return False

            # Check for gaps (market manipulation)
            current = sample['current_candle']
            next_candle = sample['next_candle']
            gap = abs(next_candle['open'] - current['close']) / current['close']
            if gap > 0.005:  # Gap larger than 0.5%
                return False

            return True

        except Exception:
            return False

    def check_trend_alignment(self, sample: Dict, direction: str) -> bool:
        """
        Check if the signal aligns with the broader trend
        """
        try:
            timeframe_context = sample.get('timeframe_context', {})

            # Check higher timeframes for trend
            higher_timeframes = ['1h', '30m', '15m']
            trend_votes = 0
            total_votes = 0

            for tf in higher_timeframes:
                if tf in timeframe_context and len(timeframe_context[tf]) >= 5:
                    candles = timeframe_context[tf]
                    # Simple trend check: compare recent close to older close
                    if candles[-1]['close'] > candles[-5]['close']:
                        tf_trend = 'UP'
                    else:
                        tf_trend = 'DOWN'

                    if tf_trend == direction:
                        trend_votes += 1
                    total_votes += 1

            return trend_votes / total_votes >= 0.5 if total_votes > 0 else True

        except Exception:
            return True

    def check_support_resistance_confluence(self, sample: Dict) -> bool:
        """
        Check if the signal occurs near significant support/resistance levels
        """
        try:
            timeframe_context = sample.get('timeframe_context', {})
            current_price = sample['current_candle']['close']

            # Look for S/R levels in higher timeframes
            for tf in ['1h', '30m']:
                if tf in timeframe_context and len(timeframe_context[tf]) >= 20:
                    candles = timeframe_context[tf]

                    # Find recent highs and lows
                    recent_highs = [c['high'] for c in candles[-20:]]
                    recent_lows = [c['low'] for c in candles[-20:]]

                    # Check if current price is near significant levels
                    for level in recent_highs + recent_lows:
                        distance = abs(current_price - level) / current_price
                        if distance < 0.002:  # Within 0.2% of S/R level
                            return True

            return False

        except Exception:
            return False

    def categorize_signal_strength(self, confidence: float) -> str:
        """
        Categorize signal strength based on confidence score
        """
        if confidence >= 0.90:
            return 'very_strong'
        elif confidence >= 0.80:
            return 'strong'
        elif confidence >= 0.70:
            return 'medium'
        elif confidence >= 0.60:
            return 'weak'
        else:
            return 'very_weak'

    def save_dataset(self, dataset: List[Dict]) -> None:
        """
        Save the collected dataset to files
        """
        try:
            # Create output directory
            output_dir = 'training_data'
            os.makedirs(output_dir, exist_ok=True)

            # Save as JSON
            json_path = os.path.join(output_dir, 'large_scale_dataset.json')
            with open(json_path, 'w') as f:
                json.dump(dataset, f, indent=2)

            # Save statistics
            stats_path = os.path.join(output_dir, 'dataset_stats.json')
            with open(stats_path, 'w') as f:
                json.dump(self.data_stats, f, indent=2)

            logger.info(f"💾 Dataset saved to {json_path}")
            logger.info(f"📊 Statistics saved to {stats_path}")

        except Exception as e:
            logger.error(f"Failed to save dataset: {e}")

if __name__ == "__main__":
    # Initialize collector
    collector = AdvancedDataCollector()

    # Collect large-scale dataset
    result = collector.collect_large_dataset(target_samples=100000)

    print(f"\n🎉 Dataset Collection Complete!")
    print(f"📊 Total samples: {len(result['dataset']):,}")
    print(f"🎯 Quality score: {result['quality_score']:.1%}")
    print(f"📈 Ready for advanced model training!")
