#!/usr/bin/env python3
"""
Advanced AI Model Trainer for Candle Prediction Specialization
Professional-grade neural network architecture with ensemble methods
Designed for maximum win-rate and market expertise
"""

import tensorflow as tf
import numpy as np
import pandas as pd
import json
import os
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AdvancedModelTrainer:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.training_history = {}
        self.feature_importance = {}
        
        # Model configurations
        self.model_configs = {
            'base_model': {
                'architecture': [256, 128, 64, 32],
                'dropout_rates': [0.3, 0.2, 0.2, 0.1],
                'batch_norm': True,
                'learning_rate': 0.001
            },
            'deep_model': {
                'architecture': [512, 256, 128, 64, 32],
                'dropout_rates': [0.4, 0.3, 0.2, 0.2, 0.1],
                'batch_norm': True,
                'learning_rate': 0.0005
            },
            'wide_model': {
                'architecture': [1024, 512, 256],
                'dropout_rates': [0.5, 0.3, 0.2],
                'batch_norm': True,
                'learning_rate': 0.0008
            }
        }
        
        # Training parameters
        self.training_params = {
            'batch_size': 512,
            'epochs': 100,
            'validation_split': 0.2,
            'early_stopping_patience': 15,
            'reduce_lr_patience': 8,
            'min_lr': 1e-7
        }
    
    def load_dataset(self, dataset_path: str) -> Tuple[np.ndarray, np.ndarray, Dict]:
        """
        Load and preprocess the large-scale dataset
        """
        logger.info(f"📊 Loading dataset from {dataset_path}...")
        
        try:
            with open(dataset_path, 'r') as f:
                dataset = json.load(f)
            
            logger.info(f"✅ Loaded {len(dataset):,} samples")
            
            # Extract features and labels
            X, y, metadata = self.preprocess_dataset(dataset)
            
            logger.info(f"🔧 Preprocessed to {X.shape[0]:,} samples with {X.shape[1]} features")
            return X, y, metadata
            
        except Exception as e:
            logger.error(f"💥 Failed to load dataset: {e}")
            raise
    
    def preprocess_dataset(self, dataset: List[Dict]) -> Tuple[np.ndarray, np.ndarray, Dict]:
        """
        Convert dataset to training-ready format with advanced preprocessing
        """
        logger.info("🔧 Preprocessing dataset...")
        
        features_list = []
        labels_list = []
        metadata = {
            'feature_names': [],
            'timeframes': set(),
            'symbols': set(),
            'confidence_distribution': {}
        }
        
        for sample in dataset:
            try:
                # Extract and flatten features
                feature_vector = self.extract_feature_vector(sample['features'])
                
                # Extract label (direction)
                label = 1 if sample['labels']['direction'] == 'UP' else 0
                
                # Only include high-confidence samples for training
                confidence = sample['labels']['confidence']
                if confidence >= 0.75:  # Filter for quality
                    features_list.append(feature_vector)
                    labels_list.append(label)
                    
                    # Update metadata
                    metadata['symbols'].add(sample['metadata']['symbol'])
                    
                    # Track confidence distribution
                    conf_bucket = f"{int(confidence * 10) * 10}%"
                    metadata['confidence_distribution'][conf_bucket] = metadata['confidence_distribution'].get(conf_bucket, 0) + 1
                
            except Exception as e:
                logger.warning(f"Failed to preprocess sample: {e}")
                continue
        
        # Convert to numpy arrays
        X = np.array(features_list)
        y = np.array(labels_list)
        
        # Generate feature names
        metadata['feature_names'] = self.generate_feature_names()
        metadata['timeframes'] = list(metadata['timeframes'])
        metadata['symbols'] = list(metadata['symbols'])
        
        logger.info(f"✅ Preprocessing complete: {X.shape[0]:,} high-quality samples")
        logger.info(f"📈 Feature vector size: {X.shape[1]}")
        logger.info(f"🎯 Label distribution: UP={np.sum(y):,}, DOWN={len(y)-np.sum(y):,}")
        
        return X, y, metadata
    
    def extract_feature_vector(self, features: Dict) -> List[float]:
        """
        Extract comprehensive features into a sophisticated vector for maximum predictive power
        """
        feature_vector = []

        # === PRICE ACTION FEATURES ===
        if 'price_action' in features:
            pa = features['price_action']
            feature_vector.extend([
                pa.get('body_size', 0),
                pa.get('upper_wick', 0),
                pa.get('lower_wick', 0),
                pa.get('is_bullish', 0),
                pa.get('volume_normalized', 0)
            ])
        else:
            feature_vector.extend([0] * 5)

        # === MULTI-TIMEFRAME TECHNICAL INDICATORS ===
        timeframes = ['1m', '3m', '5m', '15m', '30m', '1h']
        for tf in timeframes:
            if 'timeframe_features' in features and tf in features['timeframe_features']:
                tf_features = features['timeframe_features'][tf]

                # Comprehensive technical indicators (40 features per timeframe)
                feature_vector.extend([
                    # Momentum indicators
                    tf_features.get('rsi14', 50) / 100,
                    tf_features.get('rsi7', 50) / 100,
                    tf_features.get('rsi_divergence', 0) / 100,
                    tf_features.get('stoch_k', 50) / 100,
                    tf_features.get('stoch_d', 50) / 100,
                    (tf_features.get('williams_r', -50) + 100) / 100,  # Normalize to 0-1

                    # Trend indicators
                    tf_features.get('ema9_21_ratio', 1),
                    tf_features.get('ema21_50_ratio', 1),
                    tf_features.get('price_ema9_ratio', 1),
                    tf_features.get('macd', 0) * 10000,
                    tf_features.get('macd_signal', 0) * 10000,
                    tf_features.get('macd_histogram', 0) * 10000,
                    tf_features.get('macd_momentum', 0) * 10000,
                    tf_features.get('adx', 25) / 100,

                    # Volatility indicators
                    tf_features.get('bb_position', 0.5),
                    tf_features.get('bb_squeeze', 0.02) * 100,
                    tf_features.get('bb_width', 0.02) * 100,
                    tf_features.get('bb_upper_break', 0),
                    tf_features.get('bb_lower_break', 0),
                    tf_features.get('atr14', 0.001) * 1000,
                    tf_features.get('atr7', 0.001) * 1000,
                    tf_features.get('atr_normalized', 0.001) * 1000,
                    tf_features.get('atr_ratio', 1),

                    # Volume indicators
                    tf_features.get('volume_ratio_10', 1),
                    tf_features.get('volume_ratio_20', 1),
                    tf_features.get('volume_trend', 1),
                    tf_features.get('obv', 0) / 1000000,  # Scale OBV
                    tf_features.get('obv_momentum', 0) / 1000000,

                    # Price momentum
                    tf_features.get('momentum_3', 0) * 1000,
                    tf_features.get('momentum_5', 0) * 1000,
                    tf_features.get('momentum_10', 0) * 1000,

                    # Support/Resistance
                    tf_features.get('resistance_distance', 0.01) * 100,
                    tf_features.get('support_distance', 0.01) * 100,

                    # Candlestick patterns
                    tf_features.get('is_doji', 0),
                    tf_features.get('upper_wick_ratio', 0) * 100,
                    tf_features.get('lower_wick_ratio', 0) * 100,
                    tf_features.get('is_hammer', 0),
                    tf_features.get('is_shooting_star', 0)
                ])
            else:
                # Fill with neutral/default values if timeframe data missing (40 features)
                feature_vector.extend([
                    0.5, 0.5, 0, 0.5, 0.5, 0.5,  # Momentum (6)
                    1, 1, 1, 0, 0, 0, 0, 0.25,    # Trend (8)
                    0.5, 2, 2, 0, 0, 1, 1, 1, 1,  # Volatility (9)
                    1, 1, 1, 0, 0,                # Volume (5)
                    0, 0, 0,                      # Momentum (3)
                    1, 1,                         # S/R (2)
                    0, 0, 0, 0, 0                 # Patterns (5)
                ])  # Total: 40 features per timeframe

        # === MARKET CONTEXT FEATURES ===
        if 'market_context' in features:
            mc = features['market_context']
            feature_vector.extend([
                mc.get('trend_direction', 0),      # -1, 0, 1 for down, neutral, up
                mc.get('volatility', 0.5),         # 0-1 normalized volatility
                mc.get('support_resistance_distance', 0.5)  # Distance to nearest S/R
            ])
        else:
            feature_vector.extend([0, 0.5, 0.5])

        # === PATTERN RECOGNITION FEATURES ===
        if 'chart_patterns' in features:
            patterns = features['chart_patterns']
            # Convert pattern list to binary features
            pattern_features = [0] * 10  # Support for 10 different patterns

            pattern_map = {
                'Bearish Engulfing': 0, 'Bullish Engulfing': 1,
                'Double Top': 2, 'Double Bottom': 3,
                'Rising Wedge': 4, 'Falling Wedge': 5,
                'Head and Shoulders': 6, 'Inverse Head and Shoulders': 7,
                'Triangle': 8, 'Flag': 9
            }

            for pattern in patterns:
                if pattern in pattern_map:
                    pattern_features[pattern_map[pattern]] = 1

            feature_vector.extend(pattern_features)
        else:
            feature_vector.extend([0] * 10)

        return feature_vector
    
    def generate_feature_names(self) -> List[str]:
        """
        Generate descriptive names for all enhanced features
        """
        names = [
            'price_body_size', 'price_upper_wick', 'price_lower_wick',
            'price_is_bullish', 'price_volume_norm'
        ]

        # Multi-timeframe features (40 per timeframe)
        timeframes = ['1m', '3m', '5m', '15m', '30m', '1h']
        tf_indicators = [
            # Momentum (6)
            'rsi14', 'rsi7', 'rsi_divergence', 'stoch_k', 'stoch_d', 'williams_r',
            # Trend (8)
            'ema9_21_ratio', 'ema21_50_ratio', 'price_ema9_ratio', 'macd', 'macd_signal',
            'macd_histogram', 'macd_momentum', 'adx',
            # Volatility (9)
            'bb_position', 'bb_squeeze', 'bb_width', 'bb_upper_break', 'bb_lower_break',
            'atr14', 'atr7', 'atr_normalized', 'atr_ratio',
            # Volume (5)
            'volume_ratio_10', 'volume_ratio_20', 'volume_trend', 'obv', 'obv_momentum',
            # Price momentum (3)
            'momentum_3', 'momentum_5', 'momentum_10',
            # Support/Resistance (2)
            'resistance_distance', 'support_distance',
            # Candlestick patterns (5)
            'is_doji', 'upper_wick_ratio', 'lower_wick_ratio', 'is_hammer', 'is_shooting_star'
        ]

        for tf in timeframes:
            for indicator in tf_indicators:
                names.append(f'{tf}_{indicator}')

        # Market context features
        names.extend([
            'market_trend_direction', 'market_volatility', 'market_sr_distance'
        ])

        # Chart pattern features
        pattern_names = [
            'pattern_bearish_engulfing', 'pattern_bullish_engulfing',
            'pattern_double_top', 'pattern_double_bottom',
            'pattern_rising_wedge', 'pattern_falling_wedge',
            'pattern_head_shoulders', 'pattern_inv_head_shoulders',
            'pattern_triangle', 'pattern_flag'
        ]
        names.extend(pattern_names)

        return names
    
    def build_advanced_model(self, input_shape: int, model_name: str = 'base_model') -> tf.keras.Model:
        """
        Build sophisticated neural network architecture optimized for financial candle prediction
        """
        logger.info(f"🏗️ Building {model_name} with input shape {input_shape}...")

        config = self.model_configs[model_name]

        # === INPUT PROCESSING ===
        inputs = tf.keras.Input(shape=(input_shape,), name='market_features')

        # Feature preprocessing and normalization
        x = tf.keras.layers.BatchNormalization(name='input_norm')(inputs)

        # Feature importance weighting (learnable)
        x = tf.keras.layers.Dense(input_shape, activation='sigmoid', name='feature_weights')(x)
        x = tf.keras.layers.Multiply(name='weighted_features')([inputs, x])

        # === SPECIALIZED FEATURE BRANCHES ===

        # Price action branch (first 5 features)
        price_features = tf.keras.layers.Lambda(lambda x: x[:, :5], name='price_slice')(x)
        price_branch = tf.keras.layers.Dense(32, activation='relu', name='price_dense')(price_features)
        price_branch = tf.keras.layers.Dropout(0.2)(price_branch)

        # Multi-timeframe branch (features 5 to -13)
        tf_features = tf.keras.layers.Lambda(lambda x: x[:, 5:-13], name='timeframe_slice')(x)
        tf_branch = tf.keras.layers.Dense(128, activation='relu', name='tf_dense1')(tf_features)
        tf_branch = tf.keras.layers.BatchNormalization()(tf_branch)
        tf_branch = tf.keras.layers.Dropout(0.3)(tf_branch)
        tf_branch = tf.keras.layers.Dense(64, activation='relu', name='tf_dense2')(tf_branch)
        tf_branch = tf.keras.layers.Dropout(0.2)(tf_branch)

        # Context and pattern branch (last 13 features)
        context_features = tf.keras.layers.Lambda(lambda x: x[:, -13:], name='context_slice')(x)
        context_branch = tf.keras.layers.Dense(16, activation='relu', name='context_dense')(context_features)
        context_branch = tf.keras.layers.Dropout(0.1)(context_branch)

        # === FEATURE FUSION ===
        # Combine all branches
        combined = tf.keras.layers.Concatenate(name='feature_fusion')([price_branch, tf_branch, context_branch])

        # === MAIN PROCESSING LAYERS ===
        x = combined

        # Build main hidden layers with residual connections and attention
        for i, (units, dropout) in enumerate(zip(config['architecture'], config['dropout_rates'])):
            # Store input for potential residual connection
            residual_input = x

            # Dense layer with advanced initialization
            x = tf.keras.layers.Dense(
                units,
                activation='relu',
                kernel_initializer='he_normal',
                kernel_regularizer=tf.keras.regularizers.l2(0.001),
                name=f'dense_{i+1}'
            )(x)

            # Batch normalization
            if config['batch_norm']:
                x = tf.keras.layers.BatchNormalization(name=f'bn_{i+1}')(x)

            # Dropout with different rates for different layers
            x = tf.keras.layers.Dropout(dropout, name=f'dropout_{i+1}')(x)

            # Add residual connection if dimensions match
            if residual_input.shape[-1] == units and i > 0:
                x = tf.keras.layers.Add(name=f'residual_{i+1}')([x, residual_input])

        # === ATTENTION MECHANISM ===
        # Self-attention for feature importance
        attention_weights = tf.keras.layers.Dense(x.shape[-1], activation='softmax', name='attention_weights')(x)
        x = tf.keras.layers.Multiply(name='attention_applied')([x, attention_weights])

        # === OUTPUT LAYERS ===
        # Direction prediction head
        direction_head = tf.keras.layers.Dense(64, activation='relu', name='direction_head')(x)
        direction_head = tf.keras.layers.Dropout(0.1)(direction_head)
        direction_predictions = tf.keras.layers.Dense(
            2,
            activation='softmax',
            name='direction_prediction'
        )(direction_head)

        # Confidence prediction head (auxiliary output)
        confidence_head = tf.keras.layers.Dense(32, activation='relu', name='confidence_head')(x)
        confidence_head = tf.keras.layers.Dropout(0.1)(confidence_head)
        confidence_predictions = tf.keras.layers.Dense(
            1,
            activation='sigmoid',
            name='confidence_prediction'
        )(confidence_head)

        # === MODEL CREATION ===
        model = tf.keras.Model(
            inputs=inputs,
            outputs=[direction_predictions, confidence_predictions],
            name=model_name
        )

        # === ADVANCED OPTIMIZER CONFIGURATION ===
        # Use different learning rates for different parts of the network
        optimizer = tf.keras.optimizers.Adam(
            learning_rate=config['learning_rate'],
            beta_1=0.9,
            beta_2=0.999,
            epsilon=1e-7,
            clipnorm=1.0  # Gradient clipping for stability
        )

        # === COMPILATION WITH MULTIPLE LOSSES ===
        model.compile(
            optimizer=optimizer,
            loss={
                'direction_prediction': 'sparse_categorical_crossentropy',
                'confidence_prediction': 'binary_crossentropy'
            },
            loss_weights={
                'direction_prediction': 1.0,
                'confidence_prediction': 0.3  # Auxiliary loss weight
            },
            metrics={
                'direction_prediction': ['accuracy', 'precision', 'recall'],
                'confidence_prediction': ['mae', 'mse']
            }
        )

        logger.info(f"✅ {model_name} built successfully")
        logger.info(f"📊 Total parameters: {model.count_params():,}")
        logger.info(f"🏗️ Architecture: {' → '.join(map(str, config['architecture']))} → 2")

        return model
    
    def train_model(self, model: tf.keras.Model, X: np.ndarray, y: np.ndarray,
                   model_name: str, confidence_scores: np.ndarray = None) -> Dict:
        """
        Train model with advanced techniques and dual outputs
        """
        logger.info(f"🚀 Training {model_name}...")

        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=self.training_params['validation_split'],
            random_state=42, stratify=y
        )

        # Handle confidence scores if provided
        if confidence_scores is not None:
            conf_train, conf_val = train_test_split(
                confidence_scores, test_size=self.training_params['validation_split'],
                random_state=42, stratify=y
            )
        else:
            # Generate synthetic confidence scores based on class distribution
            conf_train = np.random.uniform(0.7, 0.95, size=len(y_train))
            conf_val = np.random.uniform(0.7, 0.95, size=len(y_val))

        # Scale features using RobustScaler (more robust to outliers)
        scaler = RobustScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_val_scaled = scaler.transform(X_val)

        # Store scaler for later use
        self.scalers[model_name] = scaler

        # Prepare training targets (dual outputs)
        train_targets = {
            'direction_prediction': y_train,
            'confidence_prediction': conf_train
        }

        val_targets = {
            'direction_prediction': y_val,
            'confidence_prediction': conf_val
        }

        # === ADVANCED CALLBACKS ===
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_direction_prediction_accuracy',
                patience=self.training_params['early_stopping_patience'],
                restore_best_weights=True,
                verbose=1,
                mode='max'
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=self.training_params['reduce_lr_patience'],
                min_lr=self.training_params['min_lr'],
                verbose=1,
                cooldown=3
            ),
            tf.keras.callbacks.ModelCheckpoint(
                f'checkpoints/{model_name}_best.h5',
                monitor='val_direction_prediction_accuracy',
                save_best_only=True,
                verbose=1,
                mode='max'
            ),
            # Custom callback for learning rate scheduling
            tf.keras.callbacks.LearningRateScheduler(
                lambda epoch: self.training_params['epochs'] * 0.95 ** epoch,
                verbose=0
            )
        ]

        # Create checkpoint directory
        os.makedirs('checkpoints', exist_ok=True)

        # === ADVANCED TRAINING WITH DUAL OUTPUTS ===
        logger.info(f"📊 Training data: {X_train_scaled.shape[0]:,} samples")
        logger.info(f"📊 Validation data: {X_val_scaled.shape[0]:,} samples")
        logger.info(f"🎯 Class distribution - UP: {np.sum(y_train):,}, DOWN: {len(y_train)-np.sum(y_train):,}")

        # Train model with dual outputs
        history = model.fit(
            X_train_scaled,
            train_targets,
            batch_size=self.training_params['batch_size'],
            epochs=self.training_params['epochs'],
            validation_data=(X_val_scaled, val_targets),
            callbacks=callbacks,
            verbose=1,
            class_weight={0: 1.0, 1: 1.0}  # Balanced class weights
        )
        
        # Store model and history
        self.models[model_name] = model
        self.training_history[model_name] = history.history
        
        # Evaluate model
        val_predictions = model.predict(X_val_scaled)
        val_pred_classes = np.argmax(val_predictions, axis=1)
        
        # Calculate metrics
        accuracy = np.mean(val_pred_classes == y_val)
        
        # Confidence-based accuracy (only high-confidence predictions)
        high_conf_mask = np.max(val_predictions, axis=1) >= 0.85
        if np.sum(high_conf_mask) > 0:
            high_conf_accuracy = np.mean(val_pred_classes[high_conf_mask] == y_val[high_conf_mask])
            high_conf_coverage = np.mean(high_conf_mask)
        else:
            high_conf_accuracy = 0
            high_conf_coverage = 0
        
        results = {
            'accuracy': accuracy,
            'high_confidence_accuracy': high_conf_accuracy,
            'high_confidence_coverage': high_conf_coverage,
            'total_samples': len(y_val),
            'high_conf_samples': np.sum(high_conf_mask)
        }
        
        logger.info(f"✅ {model_name} training complete!")
        logger.info(f"📊 Validation accuracy: {accuracy:.3f}")
        logger.info(f"🎯 High-confidence accuracy: {high_conf_accuracy:.3f} (coverage: {high_conf_coverage:.1%})")
        
        return results
    
    def train_ensemble(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """
        Train ensemble of models for maximum accuracy
        """
        logger.info("🎯 Training ensemble of specialized models...")
        
        ensemble_results = {}
        
        # Train each model configuration
        for model_name in self.model_configs.keys():
            logger.info(f"\n🔄 Training {model_name}...")
            
            # Build model
            model = self.build_advanced_model(X.shape[1], model_name)
            
            # Train model
            results = self.train_model(model, X, y, model_name)
            ensemble_results[model_name] = results
        
        # Create ensemble predictions
        logger.info("🤝 Creating ensemble predictions...")
        ensemble_accuracy = self.evaluate_ensemble(X, y)
        ensemble_results['ensemble'] = {'accuracy': ensemble_accuracy}
        
        return ensemble_results
    
    def evaluate_ensemble(self, X: np.ndarray, y: np.ndarray) -> float:
        """
        Evaluate ensemble performance
        """
        # Split for evaluation
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Get predictions from all models
        ensemble_predictions = []
        
        for model_name, model in self.models.items():
            scaler = self.scalers[model_name]
            X_test_scaled = scaler.transform(X_test)
            predictions = model.predict(X_test_scaled)
            ensemble_predictions.append(predictions)
        
        # Average predictions
        if ensemble_predictions:
            avg_predictions = np.mean(ensemble_predictions, axis=0)
            ensemble_pred_classes = np.argmax(avg_predictions, axis=1)
            ensemble_accuracy = np.mean(ensemble_pred_classes == y_test)
            
            logger.info(f"🎯 Ensemble accuracy: {ensemble_accuracy:.3f}")
            return ensemble_accuracy
        
        return 0.0
    
    def save_models(self, output_dir: str = 'trained_models') -> None:
        """
        Save all trained models and metadata
        """
        logger.info(f"💾 Saving models to {output_dir}...")
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Save each model
        for model_name, model in self.models.items():
            # Save as TensorFlow.js format
            tfjs_path = os.path.join(output_dir, f'{model_name}_tfjs')
            model.save(tfjs_path, save_format='tf')
            
            # Convert to TensorFlow.js
            os.system(f'tensorflowjs_converter --input_format=tf_saved_model {tfjs_path} {tfjs_path}_web')
            
            # Save scaler
            scaler_path = os.path.join(output_dir, f'{model_name}_scaler.json')
            scaler_data = {
                'mean': self.scalers[model_name].center_.tolist(),
                'scale': self.scalers[model_name].scale_.tolist()
            }
            with open(scaler_path, 'w') as f:
                json.dump(scaler_data, f)
        
        # Save training history
        history_path = os.path.join(output_dir, 'training_history.json')
        with open(history_path, 'w') as f:
            json.dump(self.training_history, f, indent=2)
        
        logger.info("✅ All models saved successfully!")

if __name__ == "__main__":
    # Initialize trainer
    trainer = AdvancedModelTrainer()
    
    # Load dataset
    X, y, metadata = trainer.load_dataset('training_data/large_scale_dataset.json')
    
    # Train ensemble
    results = trainer.train_ensemble(X, y)
    
    # Save models
    trainer.save_models()
    
    print("\n🎉 Advanced Model Training Complete!")
    for model_name, result in results.items():
        if 'accuracy' in result:
            print(f"📊 {model_name}: {result['accuracy']:.3f} accuracy")
    print("🚀 Models ready for production deployment!")
