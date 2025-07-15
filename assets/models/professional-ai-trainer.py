#!/usr/bin/env python3
"""
Professional AI Trading Model Trainer
Trains AI model using high-quality pattern-based candlestick data
"""

import os
import sys
import json
import pandas as pd
import numpy as np
import logging
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# TensorFlow imports
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, callbacks, optimizers
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import talib

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ProfessionalAITrainer:
    """
    Professional AI Trading Model Trainer
    Uses pattern-based candlestick data for maximum accuracy
    """
    
    def __init__(self, training_data_path: str = "assets/training"):
        self.training_data_path = training_data_path
        self.model = None
        self.scaler = None
        self.feature_columns = []
        self.pattern_labels = {
            'pattern_bullish_engulfing': 1,
            'pattern_hammer': 1,
            'pattern_morning_star': 1,
            'pattern_inverted_hammer': 1,
            'pattern_bearish_engulfing': 0,
            'pattern_bearish_marubozu': 0,
            'pattern_evening_star': 0,
            'pattern_shooting_star': 0,
            'pattern_doji': 0.5  # Neutral pattern
        }
        
        # Training configuration
        self.config = {
            'sequence_length': 24,  # 24 candles for prediction
            'features_per_candle': 15,  # Enhanced feature set
            'validation_split': 0.2,
            'test_split': 0.1,
            'batch_size': 64,
            'epochs': 100,
            'learning_rate': 0.001,
            'dropout_rate': 0.3,
            'early_stopping_patience': 15,
            'reduce_lr_patience': 8
        }
        
        logger.info("🚀 Professional AI Trainer initialized")
        logger.info(f"📁 Training data path: {self.training_data_path}")
        
    def load_and_combine_datasets(self) -> pd.DataFrame:
        """
        Load all CSV files and combine them into a single dataset
        """
        logger.info("📊 Loading and combining all training datasets...")
        
        combined_data = []
        pattern_files = []
        
        # Find all pattern CSV files
        for filename in os.listdir(self.training_data_path):
            if filename.endswith('.csv') and 'pattern_' in filename:
                pattern_files.append(filename)
        
        # Also include BTC OHLCV data
        btc_files = [f for f in os.listdir(self.training_data_path) 
                    if f.startswith('btc_') and f.endswith('.csv')]
        
        logger.info(f"📈 Found {len(pattern_files)} pattern files and {len(btc_files)} BTC files")
        
        # Load pattern-specific data
        for filename in pattern_files:
            filepath = os.path.join(self.training_data_path, filename)
            logger.info(f"📥 Loading {filename}...")
            
            try:
                df = pd.read_csv(filepath)
                
                # Add pattern label
                pattern_name = filename.replace('.csv', '')
                if pattern_name in self.pattern_labels:
                    df['pattern_label'] = self.pattern_labels[pattern_name]
                    df['pattern_type'] = pattern_name
                else:
                    df['pattern_label'] = 0.5  # Neutral if unknown
                    df['pattern_type'] = 'unknown'
                
                # Convert timestamp
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df = df.sort_values('timestamp')
                
                combined_data.append(df)
                logger.info(f"✅ Loaded {len(df)} samples from {filename}")
                
            except Exception as e:
                logger.error(f"❌ Error loading {filename}: {e}")
        
        # Load BTC data (for additional market context)
        for filename in btc_files:
            filepath = os.path.join(self.training_data_path, filename)
            logger.info(f"📥 Loading {filename}...")
            
            try:
                df = pd.read_csv(filepath)
                
                # Add neutral label for BTC data
                df['pattern_label'] = 0.5
                df['pattern_type'] = 'market_data'
                
                # Convert timestamp
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df = df.sort_values('timestamp')
                
                # Sample subset to balance dataset
                if len(df) > 20000:
                    df = df.sample(n=20000, random_state=42)
                
                combined_data.append(df)
                logger.info(f"✅ Loaded {len(df)} samples from {filename}")
                
            except Exception as e:
                logger.error(f"❌ Error loading {filename}: {e}")
        
        # Combine all data
        if combined_data:
            full_dataset = pd.concat(combined_data, ignore_index=True)
            logger.info(f"🎯 Combined dataset: {len(full_dataset):,} total samples")
            
            # Balance the dataset
            full_dataset = self.balance_dataset(full_dataset)
            
            return full_dataset
        else:
            raise ValueError("No training data found!")
    
    def balance_dataset(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Balance the dataset to prevent bias
        """
        logger.info("⚖️ Balancing dataset...")
        
        # Group by pattern label
        label_counts = df['pattern_label'].value_counts()
        logger.info(f"📊 Original distribution: {dict(label_counts)}")
        
        # Find minimum count for balancing
        min_count = min(label_counts.values())
        target_count = min(min_count * 2, 15000)  # Cap at 15k per class
        
        balanced_data = []
        
        for label in label_counts.index:
            label_data = df[df['pattern_label'] == label]
            
            if len(label_data) > target_count:
                # Sample down
                sampled_data = label_data.sample(n=target_count, random_state=42)
            else:
                # Use all available data
                sampled_data = label_data
            
            balanced_data.append(sampled_data)
            logger.info(f"📈 Label {label}: {len(sampled_data):,} samples")
        
        balanced_df = pd.concat(balanced_data, ignore_index=True)
        logger.info(f"✅ Balanced dataset: {len(balanced_df):,} total samples")
        
        return balanced_df.sample(frac=1, random_state=42).reset_index(drop=True)

    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate comprehensive technical indicators for each candle
        """
        logger.info("🔧 Calculating technical indicators...")

        # Ensure we have the required columns
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required column: {col}")

        # Convert to numpy arrays for talib
        open_prices = df['open'].values.astype(float)
        high_prices = df['high'].values.astype(float)
        low_prices = df['low'].values.astype(float)
        close_prices = df['close'].values.astype(float)
        volume = df['volume'].values.astype(float)

        # Price-based indicators
        df['rsi_14'] = talib.RSI(close_prices, timeperiod=14)
        df['rsi_7'] = talib.RSI(close_prices, timeperiod=7)

        # Moving averages
        df['ema_12'] = talib.EMA(close_prices, timeperiod=12)
        df['ema_26'] = talib.EMA(close_prices, timeperiod=26)
        df['sma_20'] = talib.SMA(close_prices, timeperiod=20)

        # MACD
        macd, macd_signal, macd_hist = talib.MACD(close_prices, fastperiod=12, slowperiod=26, signalperiod=9)
        df['macd'] = macd
        df['macd_signal'] = macd_signal
        df['macd_histogram'] = macd_hist

        # Bollinger Bands
        bb_upper, bb_middle, bb_lower = talib.BBANDS(close_prices, timeperiod=20, nbdevup=2, nbdevdn=2, matype=0)
        df['bb_upper'] = bb_upper
        df['bb_middle'] = bb_middle
        df['bb_lower'] = bb_lower
        df['bb_width'] = (bb_upper - bb_lower) / bb_middle
        df['bb_position'] = (close_prices - bb_lower) / (bb_upper - bb_lower)

        # ATR (Average True Range)
        df['atr_14'] = talib.ATR(high_prices, low_prices, close_prices, timeperiod=14)

        # Volume indicators
        df['volume_sma'] = talib.SMA(volume, timeperiod=20)
        df['volume_ratio'] = volume / df['volume_sma']

        # Price action features
        df['body_size'] = abs(close_prices - open_prices) / open_prices
        df['upper_shadow'] = (high_prices - np.maximum(open_prices, close_prices)) / np.maximum(open_prices, close_prices)
        df['lower_shadow'] = (np.minimum(open_prices, close_prices) - low_prices) / np.minimum(open_prices, close_prices)
        df['price_change'] = (close_prices - open_prices) / open_prices
        df['high_low_ratio'] = (high_prices - low_prices) / close_prices

        # Momentum indicators
        df['momentum_10'] = talib.MOM(close_prices, timeperiod=10)
        df['roc_10'] = talib.ROC(close_prices, timeperiod=10)

        # Stochastic
        slowk, slowd = talib.STOCH(high_prices, low_prices, close_prices, fastk_period=14, slowk_period=3, slowd_period=3)
        df['stoch_k'] = slowk
        df['stoch_d'] = slowd

        # Williams %R
        df['williams_r'] = talib.WILLR(high_prices, low_prices, close_prices, timeperiod=14)

        # Commodity Channel Index
        df['cci'] = talib.CCI(high_prices, low_prices, close_prices, timeperiod=14)

        # Fill NaN values with forward fill then backward fill
        df = df.fillna(method='ffill').fillna(method='bfill')

        logger.info(f"✅ Technical indicators calculated. Dataset shape: {df.shape}")
        return df

    def create_sequences(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create sequences for LSTM/time series prediction
        """
        logger.info("🔄 Creating sequences for training...")

        # Select feature columns (exclude metadata)
        feature_cols = [col for col in df.columns if col not in
                       ['timestamp', 'pattern_label', 'pattern_type']]

        self.feature_columns = feature_cols
        logger.info(f"📊 Using {len(feature_cols)} features: {feature_cols[:10]}...")

        # Prepare features and labels
        features = df[feature_cols].values
        labels = df['pattern_label'].values

        # Create sequences
        X, y = [], []
        sequence_length = self.config['sequence_length']

        for i in range(sequence_length, len(features)):
            # Get sequence of features
            sequence = features[i-sequence_length:i]

            # Get corresponding label (binary classification)
            label = 1 if labels[i] > 0.5 else 0

            X.append(sequence)
            y.append(label)

        X = np.array(X)
        y = np.array(y)

        logger.info(f"✅ Created {len(X):,} sequences")
        logger.info(f"📊 Sequence shape: {X.shape}")
        logger.info(f"🎯 Label distribution: UP={np.sum(y):,}, DOWN={len(y)-np.sum(y):,}")

        return X, y

    def build_advanced_model(self, input_shape: Tuple) -> keras.Model:
        """
        Build advanced neural network architecture
        """
        logger.info("🏗️ Building advanced model architecture...")

        # Input layer
        inputs = keras.Input(shape=input_shape, name='sequence_input')

        # LSTM layers for sequence processing
        x = layers.LSTM(128, return_sequences=True, dropout=0.2, recurrent_dropout=0.2, name='lstm_1')(inputs)
        x = layers.BatchNormalization(name='batch_norm_1')(x)

        x = layers.LSTM(64, return_sequences=True, dropout=0.2, recurrent_dropout=0.2, name='lstm_2')(x)
        x = layers.BatchNormalization(name='batch_norm_2')(x)

        x = layers.LSTM(32, return_sequences=False, dropout=0.2, recurrent_dropout=0.2, name='lstm_3')(x)
        x = layers.BatchNormalization(name='batch_norm_3')(x)

        # Dense layers for final processing
        x = layers.Dense(64, activation='relu', name='dense_1')(x)
        x = layers.Dropout(self.config['dropout_rate'], name='dropout_1')(x)
        x = layers.BatchNormalization(name='batch_norm_4')(x)

        x = layers.Dense(32, activation='relu', name='dense_2')(x)
        x = layers.Dropout(self.config['dropout_rate'] * 0.5, name='dropout_2')(x)

        # Output layer - binary classification with confidence
        outputs = layers.Dense(2, activation='softmax', name='predictions')(x)

        # Create model
        model = keras.Model(inputs=inputs, outputs=outputs, name='professional_trading_ai')

        # Compile model
        model.compile(
            optimizer=optimizers.Adam(learning_rate=self.config['learning_rate']),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy', 'precision', 'recall']
        )

        logger.info("✅ Model architecture built successfully")
        logger.info(f"📊 Total parameters: {model.count_params():,}")

        return model

    def train_model(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """
        Train the model with advanced techniques
        """
        logger.info("🚀 Starting professional model training...")

        # Split data
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=self.config['test_split'],
            random_state=42, stratify=y
        )

        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=self.config['validation_split']/(1-self.config['test_split']),
            random_state=42, stratify=y_temp
        )

        logger.info(f"📊 Training set: {X_train.shape[0]:,} samples")
        logger.info(f"📊 Validation set: {X_val.shape[0]:,} samples")
        logger.info(f"📊 Test set: {X_test.shape[0]:,} samples")

        # Scale features
        self.scaler = RobustScaler()

        # Reshape for scaling (flatten sequences)
        X_train_flat = X_train.reshape(-1, X_train.shape[-1])
        X_val_flat = X_val.reshape(-1, X_val.shape[-1])
        X_test_flat = X_test.reshape(-1, X_test.shape[-1])

        # Fit scaler on training data
        self.scaler.fit(X_train_flat)

        # Transform all sets
        X_train_scaled = self.scaler.transform(X_train_flat).reshape(X_train.shape)
        X_val_scaled = self.scaler.transform(X_val_flat).reshape(X_val.shape)
        X_test_scaled = self.scaler.transform(X_test_flat).reshape(X_test.shape)

        # Build model
        self.model = self.build_advanced_model(X_train_scaled.shape[1:])

        # Callbacks for training optimization
        callbacks_list = [
            callbacks.EarlyStopping(
                monitor='val_accuracy',
                patience=self.config['early_stopping_patience'],
                restore_best_weights=True,
                verbose=1
            ),
            callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=self.config['reduce_lr_patience'],
                min_lr=1e-7,
                verbose=1
            ),
            callbacks.ModelCheckpoint(
                'best_model.h5',
                monitor='val_accuracy',
                save_best_only=True,
                verbose=1
            )
        ]

        # Train model
        logger.info("🎯 Training model...")
        history = self.model.fit(
            X_train_scaled, y_train,
            validation_data=(X_val_scaled, y_val),
            epochs=self.config['epochs'],
            batch_size=self.config['batch_size'],
            callbacks=callbacks_list,
            verbose=1
        )

        # Evaluate on test set
        logger.info("📈 Evaluating model performance...")
        test_loss, test_accuracy, test_precision, test_recall = self.model.evaluate(
            X_test_scaled, y_test, verbose=0
        )

        # Generate predictions for detailed analysis
        y_pred_proba = self.model.predict(X_test_scaled)
        y_pred = np.argmax(y_pred_proba, axis=1)

        # Calculate additional metrics
        accuracy = accuracy_score(y_test, y_pred)
        conf_matrix = confusion_matrix(y_test, y_pred)
        class_report = classification_report(y_test, y_pred, output_dict=True)

        # Training results
        results = {
            'test_accuracy': float(test_accuracy),
            'test_precision': float(test_precision),
            'test_recall': float(test_recall),
            'test_loss': float(test_loss),
            'confusion_matrix': conf_matrix.tolist(),
            'classification_report': class_report,
            'training_history': {
                'accuracy': history.history['accuracy'],
                'val_accuracy': history.history['val_accuracy'],
                'loss': history.history['loss'],
                'val_loss': history.history['val_loss']
            },
            'model_params': self.model.count_params(),
            'training_samples': X_train.shape[0],
            'validation_samples': X_val.shape[0],
            'test_samples': X_test.shape[0]
        }

        # Log results
        logger.info("🎉 Training completed!")
        logger.info(f"📊 Test Accuracy: {test_accuracy:.4f}")
        logger.info(f"📊 Test Precision: {test_precision:.4f}")
        logger.info(f"📊 Test Recall: {test_recall:.4f}")
        logger.info(f"📊 Test Loss: {test_loss:.4f}")

        return results

    def export_tensorflowjs_model(self, output_dir: str = "assets/models") -> str:
        """
        Export trained model to TensorFlow.js format
        """
        logger.info("📦 Exporting model to TensorFlow.js format...")

        if self.model is None:
            raise ValueError("No trained model found. Train model first.")

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        # Export model
        import tensorflowjs as tfjs

        model_path = os.path.join(output_dir, "trading-model")
        tfjs.converters.save_keras_model(self.model, model_path)

        # Save scaling parameters
        scaler_params = {
            'center_': self.scaler.center_.tolist(),
            'scale_': self.scaler.scale_.tolist(),
            'feature_columns': self.feature_columns
        }

        scaler_path = os.path.join(output_dir, "scaler_params.json")
        with open(scaler_path, 'w') as f:
            json.dump(scaler_params, f, indent=2)

        logger.info(f"✅ Model exported to: {model_path}")
        logger.info(f"✅ Scaler parameters saved to: {scaler_path}")

        return model_path

    def run_complete_training(self) -> Dict:
        """
        Run the complete training pipeline
        """
        logger.info("🚀 Starting complete AI training pipeline...")
        start_time = datetime.now()

        try:
            # Step 1: Load and combine datasets
            logger.info("\n" + "="*60)
            logger.info("📊 STEP 1: DATA LOADING AND PREPARATION")
            logger.info("="*60)

            df = self.load_and_combine_datasets()

            # Step 2: Calculate technical indicators
            logger.info("\n" + "="*60)
            logger.info("🔧 STEP 2: FEATURE ENGINEERING")
            logger.info("="*60)

            df = self.calculate_technical_indicators(df)

            # Step 3: Create sequences
            logger.info("\n" + "="*60)
            logger.info("🔄 STEP 3: SEQUENCE CREATION")
            logger.info("="*60)

            X, y = self.create_sequences(df)

            # Step 4: Train model
            logger.info("\n" + "="*60)
            logger.info("🧠 STEP 4: MODEL TRAINING")
            logger.info("="*60)

            training_results = self.train_model(X, y)

            # Step 5: Export model
            logger.info("\n" + "="*60)
            logger.info("📦 STEP 5: MODEL EXPORT")
            logger.info("="*60)

            model_path = self.export_tensorflowjs_model()

            # Final results
            end_time = datetime.now()
            training_time = (end_time - start_time).total_seconds()

            final_results = {
                'training_results': training_results,
                'model_path': model_path,
                'training_time_seconds': training_time,
                'total_samples': len(X),
                'feature_count': len(self.feature_columns),
                'sequence_length': self.config['sequence_length'],
                'timestamp': end_time.isoformat()
            }

            # Save results
            results_path = "training_results.json"
            with open(results_path, 'w') as f:
                json.dump(final_results, f, indent=2, default=str)

            logger.info("\n" + "="*60)
            logger.info("🎉 TRAINING PIPELINE COMPLETED SUCCESSFULLY!")
            logger.info("="*60)
            logger.info(f"⏱️ Total training time: {training_time:.2f} seconds")
            logger.info(f"📊 Final accuracy: {training_results['test_accuracy']:.4f}")
            logger.info(f"📁 Model saved to: {model_path}")
            logger.info(f"📄 Results saved to: {results_path}")

            return final_results

        except Exception as e:
            logger.error(f"❌ Training pipeline failed: {e}")
            raise


def main():
    """
    Main training execution
    """
    print("🚀 Professional AI Trading Model Trainer")
    print("=" * 50)

    try:
        # Initialize trainer
        trainer = ProfessionalAITrainer()

        # Run complete training
        results = trainer.run_complete_training()

        print("\n🎉 Training completed successfully!")
        print(f"📊 Final Accuracy: {results['training_results']['test_accuracy']:.4f}")
        print(f"📁 Model Path: {results['model_path']}")

    except Exception as e:
        print(f"❌ Training failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
