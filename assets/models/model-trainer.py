#!/usr/bin/env python3
"""
TensorFlow.js Model Training Script for Binary Options Prediction
Trains a neural network on historical OHLCV + indicator data
Exports to TensorFlow.js format for in-browser inference
"""

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import json
import os
import yfinance as yf
from datetime import datetime, timedelta
import talib

class TradingModelTrainer:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = []
        self.sequence_length = 24  # 24 candles lookback
        self.prediction_horizon = 1  # Predict next candle
        
    def download_training_data(self, symbols=['EURUSD=X', 'GBPUSD=X', 'USDJPY=X'], 
                              period='2y', interval='5m'):
        """Download historical forex data for training"""
        print("📊 Downloading training data...")
        
        all_data = []
        
        for symbol in symbols:
            try:
                print(f"Downloading {symbol}...")
                ticker = yf.Ticker(symbol)
                data = ticker.history(period=period, interval=interval)
                
                if len(data) > 1000:  # Ensure sufficient data
                    data['Symbol'] = symbol
                    all_data.append(data)
                    print(f"✅ {symbol}: {len(data)} candles")
                else:
                    print(f"⚠️ {symbol}: Insufficient data ({len(data)} candles)")
                    
            except Exception as e:
                print(f"❌ Failed to download {symbol}: {e}")
        
        if not all_data:
            raise ValueError("No training data downloaded!")
        
        # Combine all data
        combined_data = pd.concat(all_data, ignore_index=True)
        print(f"📈 Total training samples: {len(combined_data)}")
        
        return combined_data
    
    def calculate_technical_indicators(self, data):
        """Calculate technical indicators for features"""
        print("🔧 Calculating technical indicators...")
        
        # Ensure we have OHLCV columns
        required_cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        for col in required_cols:
            if col not in data.columns:
                raise ValueError(f"Missing required column: {col}")
        
        # Convert to numpy arrays for TA-Lib
        open_prices = data['Open'].values
        high_prices = data['High'].values
        low_prices = data['Low'].values
        close_prices = data['Close'].values
        volume = data['Volume'].values
        
        # Calculate indicators
        indicators = {}
        
        try:
            # RSI
            indicators['RSI'] = talib.RSI(close_prices, timeperiod=14)
            
            # EMAs
            indicators['EMA9'] = talib.EMA(close_prices, timeperiod=9)
            indicators['EMA21'] = talib.EMA(close_prices, timeperiod=21)
            indicators['EMA50'] = talib.EMA(close_prices, timeperiod=50)
            
            # MACD
            macd, macd_signal, macd_hist = talib.MACD(close_prices)
            indicators['MACD'] = macd
            indicators['MACD_Signal'] = macd_signal
            indicators['MACD_Hist'] = macd_hist
            
            # Bollinger Bands
            bb_upper, bb_middle, bb_lower = talib.BBANDS(close_prices)
            indicators['BB_Upper'] = bb_upper
            indicators['BB_Middle'] = bb_middle
            indicators['BB_Lower'] = bb_lower
            
            # ATR
            indicators['ATR'] = talib.ATR(high_prices, low_prices, close_prices, timeperiod=14)
            
            # Stochastic
            slowk, slowd = talib.STOCH(high_prices, low_prices, close_prices)
            indicators['STOCH_K'] = slowk
            indicators['STOCH_D'] = slowd
            
            # Williams %R
            indicators['WILLR'] = talib.WILLR(high_prices, low_prices, close_prices)
            
            # CCI
            indicators['CCI'] = talib.CCI(high_prices, low_prices, close_prices)
            
            # Volume indicators
            indicators['OBV'] = talib.OBV(close_prices, volume)
            indicators['AD'] = talib.AD(high_prices, low_prices, close_prices, volume)
            
        except Exception as e:
            print(f"⚠️ Error calculating indicators: {e}")
            # Fallback to basic indicators
            indicators['RSI'] = pd.Series(close_prices).rolling(14).apply(
                lambda x: 100 - (100 / (1 + (x.diff().clip(lower=0).mean() / 
                                          x.diff().clip(upper=0).abs().mean())))
            ).values
        
        # Add indicators to dataframe
        for name, values in indicators.items():
            data[name] = values
        
        print(f"✅ Added {len(indicators)} technical indicators")
        return data
    
    def create_features(self, data):
        """Create feature matrix for training"""
        print("🏗️ Creating feature matrix...")
        
        # Define feature columns
        price_features = ['Open', 'High', 'Low', 'Close', 'Volume']
        indicator_features = ['RSI', 'EMA9', 'EMA21', 'EMA50', 'MACD', 'MACD_Signal', 
                            'MACD_Hist', 'BB_Upper', 'BB_Middle', 'BB_Lower', 'ATR',
                            'STOCH_K', 'STOCH_D', 'WILLR', 'CCI', 'OBV', 'AD']
        
        # Price-based features (normalized)
        data['Price_Change'] = data['Close'].pct_change()
        data['High_Low_Ratio'] = data['High'] / data['Low']
        data['Open_Close_Ratio'] = data['Open'] / data['Close']
        data['Volume_MA'] = data['Volume'].rolling(20).mean()
        data['Volume_Ratio'] = data['Volume'] / data['Volume_MA']
        
        # Volatility features
        data['True_Range'] = np.maximum(
            data['High'] - data['Low'],
            np.maximum(
                abs(data['High'] - data['Close'].shift(1)),
                abs(data['Low'] - data['Close'].shift(1))
            )
        )
        data['Volatility'] = data['True_Range'].rolling(14).mean()
        
        # Pattern features (simplified)
        data['Doji'] = (abs(data['Close'] - data['Open']) / 
                       (data['High'] - data['Low'])).fillna(0)
        data['Upper_Shadow'] = (data['High'] - np.maximum(data['Open'], data['Close'])) / \
                              (data['High'] - data['Low'])
        data['Lower_Shadow'] = (np.minimum(data['Open'], data['Close']) - data['Low']) / \
                              (data['High'] - data['Low'])
        
        # All feature columns
        additional_features = ['Price_Change', 'High_Low_Ratio', 'Open_Close_Ratio', 
                             'Volume_Ratio', 'Volatility', 'Doji', 'Upper_Shadow', 'Lower_Shadow']
        
        self.feature_columns = price_features + indicator_features + additional_features
        
        # Remove rows with NaN values
        data = data.dropna()
        
        print(f"✅ Created {len(self.feature_columns)} features")
        print(f"📊 Clean data samples: {len(data)}")
        
        return data
    
    def create_sequences(self, data):
        """Create sequences for time series prediction"""
        print("📚 Creating training sequences...")
        
        features = data[self.feature_columns].values
        
        # Create target (next candle direction)
        # 1 = price goes up, 0 = price goes down
        future_prices = data['Close'].shift(-self.prediction_horizon)
        current_prices = data['Close']
        targets = (future_prices > current_prices).astype(int)
        
        # Create sequences
        X, y = [], []
        
        for i in range(self.sequence_length, len(features) - self.prediction_horizon):
            # Input sequence
            sequence = features[i-self.sequence_length:i]
            X.append(sequence)
            
            # Target
            y.append(targets.iloc[i])
        
        X = np.array(X)
        y = np.array(y)
        
        print(f"✅ Created {len(X)} sequences")
        print(f"📏 Input shape: {X.shape}")
        print(f"🎯 Target distribution: {np.bincount(y)}")
        
        return X, y
    
    def build_model(self, input_shape):
        """Build the neural network model"""
        print("🏗️ Building neural network...")
        
        model = keras.Sequential([
            # Input layer
            keras.layers.Input(shape=input_shape),
            
            # Flatten the sequence
            keras.layers.Flatten(),
            
            # Dense layers with dropout
            keras.layers.Dense(128, activation='relu'),
            keras.layers.Dropout(0.3),
            keras.layers.BatchNormalization(),
            
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dropout(0.2),
            keras.layers.BatchNormalization(),
            
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dropout(0.1),
            
            # Output layer (binary classification)
            keras.layers.Dense(2, activation='softmax')
        ])
        
        # Compile model
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        print("✅ Model built successfully")
        model.summary()
        
        return model
    
    def train_model(self, X, y, validation_split=0.2, epochs=50, batch_size=32):
        """Train the model"""
        print("🚀 Starting model training...")
        
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=validation_split, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scale_features(X_train, fit=True)
        X_val_scaled = self.scale_features(X_val, fit=False)
        
        # Build model
        self.model = self.build_model(X_train_scaled.shape[1:])
        
        # Callbacks
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor='val_accuracy',
                patience=10,
                restore_best_weights=True
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=0.0001
            )
        ]
        
        # Train model
        history = self.model.fit(
            X_train_scaled, y_train,
            validation_data=(X_val_scaled, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        # Evaluate model
        train_loss, train_acc = self.model.evaluate(X_train_scaled, y_train, verbose=0)
        val_loss, val_acc = self.model.evaluate(X_val_scaled, y_val, verbose=0)
        
        print(f"✅ Training completed!")
        print(f"📊 Training accuracy: {train_acc:.4f}")
        print(f"📊 Validation accuracy: {val_acc:.4f}")
        
        return history
    
    def scale_features(self, X, fit=False):
        """Scale features using StandardScaler"""
        original_shape = X.shape
        X_reshaped = X.reshape(-1, X.shape[-1])
        
        if fit:
            X_scaled = self.scaler.fit_transform(X_reshaped)
        else:
            X_scaled = self.scaler.transform(X_reshaped)
        
        return X_scaled.reshape(original_shape)
    
    def export_to_tensorflowjs(self, export_path='./'):
        """Export model to TensorFlow.js format"""
        print("📦 Exporting model to TensorFlow.js...")
        
        if self.model is None:
            raise ValueError("Model not trained yet!")
        
        # Create export directory
        os.makedirs(export_path, exist_ok=True)
        
        # Export model
        model_path = os.path.join(export_path, 'trading-model')
        tf.saved_model.save(self.model, model_path)
        
        # Convert to TensorFlow.js
        import tensorflowjs as tfjs
        tfjs.converters.convert_tf_saved_model(
            model_path,
            os.path.join(export_path, 'tfjs-model'),
            quantization_bytes=2  # Compress model
        )
        
        # Save scaling parameters
        scaling_params = {
            'mean': self.scaler.mean_.tolist(),
            'std': self.scaler.scale_.tolist(),
            'feature_columns': self.feature_columns
        }
        
        with open(os.path.join(export_path, 'scaling-params.json'), 'w') as f:
            json.dump(scaling_params, f, indent=2)
        
        print(f"✅ Model exported to: {export_path}")
        print("📁 Files created:")
        print("  - tfjs-model/model.json")
        print("  - tfjs-model/*.bin")
        print("  - scaling-params.json")
    
    def run_full_training_pipeline(self):
        """Run the complete training pipeline"""
        print("🚀 Starting full training pipeline...")
        
        try:
            # 1. Download data
            data = self.download_training_data()
            
            # 2. Calculate indicators
            data = self.calculate_technical_indicators(data)
            
            # 3. Create features
            data = self.create_features(data)
            
            # 4. Create sequences
            X, y = self.create_sequences(data)
            
            # 5. Train model
            history = self.train_model(X, y)
            
            # 6. Export model
            self.export_to_tensorflowjs()
            
            print("🎉 Training pipeline completed successfully!")
            
        except Exception as e:
            print(f"💥 Training pipeline failed: {e}")
            raise

if __name__ == "__main__":
    # Create trainer instance
    trainer = TradingModelTrainer()
    
    # Run training pipeline
    trainer.run_full_training_pipeline()