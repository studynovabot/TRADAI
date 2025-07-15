"""
AI Trading Sniper - FastAPI Backend
Professional-grade AI model server for binary options prediction
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import logging
import asyncio
import uvicorn
import joblib
import os
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Trading Sniper API",
    description="Professional binary options prediction service",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class CandleData(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float = 0

class TimeframeData(BaseModel):
    candles: List[CandleData]
    indicators: Dict[str, Any] = {}
    trend: str = "neutral"
    volatility: str = "normal"
    lastPrice: float = 0

class Pattern(BaseModel):
    name: str
    type: str  # bullish, bearish, reversal, continuation
    strength: str  # weak, medium, strong, very_strong
    timeframe: str = "5M"
    reliability: float = 50.0
    context: Dict[str, Any] = {}

class MarketContext(BaseModel):
    dataQuality: str = "fair"
    volatility: str = "normal"
    trend: str = "neutral"
    volume: str = "normal"

class PredictionInput(BaseModel):
    symbol: str = "EURUSD"
    platform: str = "generic"
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
    timeframes: Dict[str, TimeframeData] = {}
    indicators: Dict[str, Any] = {}
    patterns: List[Pattern] = []
    context: MarketContext = MarketContext()

class PredictionOutput(BaseModel):
    prediction: str  # UP, DOWN, NEUTRAL
    confidence: float  # 0-100
    reason: str
    risk: str  # Low, Medium, High
    volatility: str
    timestamp: int
    model_version: str
    features_used: List[str] = []
    signal_strength: str = "medium"
    confluence: Dict[str, Any] = {}
    timeframe_agreement: Dict[str, Any] = {}
    entry_timing: Dict[str, Any] = {}
    risk_score: Dict[str, Any] = {}

class HealthResponse(BaseModel):
    status: str
    model_version: str
    uptime: str
    predictions_served: int
    accuracy: float

# Global state
class ModelState:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names = []
        self.model_version = "v2.0.0"
        self.start_time = datetime.now()
        self.predictions_served = 0
        self.successful_predictions = 0
        self.is_loaded = False

model_state = ModelState()

# Load AI model on startup
@app.on_event("startup")
async def load_model():
    """Load the trained AI model and preprocessors"""
    try:
        logger.info("🧠 Loading AI trading model...")
        
        # Check if model files exist
        model_path = Path("models/trading_model.joblib")
        scaler_path = Path("models/scaler.joblib")
        features_path = Path("models/feature_names.joblib")
        
        if model_path.exists() and scaler_path.exists():
            # Load real trained model
            model_state.model = joblib.load(model_path)
            model_state.scaler = joblib.load(scaler_path)
            
            if features_path.exists():
                model_state.feature_names = joblib.load(features_path)
            
            model_state.is_loaded = True
            logger.info("✅ AI model loaded successfully")
        else:
            # Initialize with mock model for development
            logger.warning("⚠️ Model files not found, using mock model")
            model_state.model = MockTradingModel()
            model_state.is_loaded = True
            
    except Exception as e:
        logger.error(f"💥 Failed to load model: {e}")
        model_state.model = MockTradingModel()
        model_state.is_loaded = True

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """System health and status"""
    uptime = datetime.now() - model_state.start_time
    uptime_str = str(uptime).split('.')[0]  # Remove microseconds
    
    accuracy = 0.0
    if model_state.predictions_served > 0:
        accuracy = (model_state.successful_predictions / model_state.predictions_served) * 100
    
    return HealthResponse(
        status="healthy" if model_state.is_loaded else "loading",
        model_version=model_state.model_version,
        uptime=uptime_str,
        predictions_served=model_state.predictions_served,
        accuracy=round(accuracy, 2)
    )

# Main prediction endpoint
@app.post("/predict", response_model=PredictionOutput)
async def predict_market(input_data: PredictionInput):
    """Generate AI trading prediction"""
    try:
        logger.info(f"🎯 Prediction request for {input_data.symbol}")
        
        if not model_state.is_loaded:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        # Extract features from input
        features = extract_features(input_data)
        
        # Generate prediction
        prediction = await generate_prediction(features, input_data)
        
        # Update statistics
        model_state.predictions_served += 1
        
        logger.info(f"✅ Prediction: {prediction.prediction} ({prediction.confidence}%)")
        
        return prediction
        
    except Exception as e:
        logger.error(f"💥 Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# Batch prediction endpoint
@app.post("/predict/batch")
async def predict_batch(inputs: List[PredictionInput]):
    """Generate predictions for multiple assets"""
    try:
        results = []
        for input_data in inputs:
            prediction = await predict_market(input_data)
            results.append(prediction)
        
        return {"predictions": results, "count": len(results)}
        
    except Exception as e:
        logger.error(f"💥 Batch prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")

# Model performance endpoint
@app.get("/performance")
async def get_performance():
    """Get model performance metrics"""
    return {
        "accuracy": calculate_model_accuracy(),
        "predictions_today": get_predictions_today(),
        "top_performing_pairs": get_top_pairs(),
        "confidence_distribution": get_confidence_distribution(),
        "risk_distribution": get_risk_distribution()
    }

# Feature extraction function
def extract_features(input_data: PredictionInput) -> Dict[str, float]:
    """Extract numerical features for ML model"""
    features = {}
    
    try:
        # Basic features
        features['data_quality_score'] = quality_to_score(input_data.context.dataQuality)
        features['volatility_score'] = volatility_to_score(input_data.context.volatility)
        features['trend_score'] = trend_to_score(input_data.context.trend)
        
        # Indicator features
        indicators = input_data.indicators
        features['rsi'] = indicators.get('RSI', 50.0)
        features['ema9'] = indicators.get('EMA9', 0.0)
        features['ema21'] = indicators.get('EMA21', 0.0)
        features['ema50'] = indicators.get('EMA50', 0.0)
        features['macd'] = indicators.get('MACD', 0.0)
        features['atr'] = indicators.get('ATR', 0.0)
        features['volume'] = indicators.get('Volume', 1000.0)
        
        # EMA relationships
        if features['ema21'] != 0:
            features['ema9_ema21_ratio'] = features['ema9'] / features['ema21']
        else:
            features['ema9_ema21_ratio'] = 1.0
            
        if features['ema50'] != 0:
            features['ema21_ema50_ratio'] = features['ema21'] / features['ema50']
        else:
            features['ema21_ema50_ratio'] = 1.0
        
        # Pattern features
        features['bullish_patterns'] = len([p for p in input_data.patterns if p.type == 'bullish'])
        features['bearish_patterns'] = len([p for p in input_data.patterns if p.type == 'bearish'])
        features['reversal_patterns'] = len([p for p in input_data.patterns if p.type == 'reversal'])
        features['strong_patterns'] = len([p for p in input_data.patterns if p.strength in ['strong', 'very_strong']])
        
        # Multi-timeframe features
        timeframe_trends = []
        for tf, data in input_data.timeframes.items():
            if data.trend:
                trend_score = trend_to_score(data.trend)
                features[f'{tf}_trend'] = trend_score
                timeframe_trends.append(trend_score)
        
        # Timeframe agreement
        if timeframe_trends:
            features['timeframe_agreement'] = np.std(timeframe_trends)  # Lower std = more agreement
            features['avg_timeframe_trend'] = np.mean(timeframe_trends)
        else:
            features['timeframe_agreement'] = 1.0
            features['avg_timeframe_trend'] = 0.0
        
        # Candle analysis features
        features.update(extract_candle_features(input_data.timeframes))
        
        # Time-based features
        timestamp = datetime.fromtimestamp(input_data.timestamp / 1000)
        features['hour'] = timestamp.hour
        features['day_of_week'] = timestamp.weekday()
        features['is_market_hours'] = 1.0 if 8 <= timestamp.hour <= 17 else 0.0
        
        logger.info(f"📊 Extracted {len(features)} features")
        
    except Exception as e:
        logger.error(f"💥 Feature extraction error: {e}")
        # Return basic features if extraction fails
        features = {
            'rsi': input_data.indicators.get('RSI', 50.0),
            'data_quality_score': 0.5,
            'volatility_score': 0.5,
            'trend_score': 0.0
        }
    
    return features

def extract_candle_features(timeframes: Dict[str, TimeframeData]) -> Dict[str, float]:
    """Extract features from candlestick data"""
    features = {}
    
    try:
        # Use 5M timeframe as primary
        primary_tf = timeframes.get('5M') or timeframes.get('1M')
        if not primary_tf or not primary_tf.candles:
            return features
        
        candles = primary_tf.candles[-10:]  # Last 10 candles
        
        if len(candles) < 3:
            return features
        
        # Price movement features
        closes = [c.close for c in candles]
        highs = [c.high for c in candles]
        lows = [c.low for c in candles]
        
        features['price_change_pct'] = (closes[-1] - closes[0]) / closes[0] * 100
        features['volatility_pct'] = (max(highs) - min(lows)) / closes[-1] * 100
        
        # Recent candle analysis
        last_candle = candles[-1]
        features['body_size'] = abs(last_candle.close - last_candle.open)
        features['upper_shadow'] = last_candle.high - max(last_candle.open, last_candle.close)
        features['lower_shadow'] = min(last_candle.open, last_candle.close) - last_candle.low
        features['is_bullish_candle'] = 1.0 if last_candle.close > last_candle.open else 0.0
        
        # Volume analysis if available
        volumes = [c.volume for c in candles if c.volume > 0]
        if volumes:
            features['volume_ratio'] = volumes[-1] / np.mean(volumes) if len(volumes) > 1 else 1.0
        else:
            features['volume_ratio'] = 1.0
        
    except Exception as e:
        logger.error(f"💥 Candle feature extraction error: {e}")
    
    return features

async def generate_prediction(features: Dict[str, float], input_data: PredictionInput) -> PredictionOutput:
    """Generate prediction using AI model"""
    try:
        # Use AI model for prediction
        if hasattr(model_state.model, 'predict_proba'):
            # Real ML model
            feature_array = prepare_feature_array(features)
            probabilities = model_state.model.predict_proba(feature_array)[0]
            prediction_class = model_state.model.predict(feature_array)[0]
            
            direction = "UP" if prediction_class == 1 else "DOWN"
            confidence = max(probabilities) * 100
            
        else:
            # Mock model or fallback
            direction, confidence = model_state.model.predict(features)
        
        # Generate comprehensive analysis
        confluence = analyze_confluence(input_data)
        timeframe_agreement = analyze_timeframe_agreement(input_data)
        entry_timing = calculate_entry_timing(input_data)
        risk_score = calculate_risk_score(input_data, confidence)
        
        # Generate reason
        reason = generate_reason(features, input_data.patterns, confluence)
        
        # Determine risk level
        risk_level = "Low" if confidence > 80 else "Medium" if confidence > 65 else "High"
        
        # Features used
        important_features = get_important_features(features)
        
        return PredictionOutput(
            prediction=direction,
            confidence=round(confidence, 1),
            reason=reason,
            risk=risk_level,
            volatility=input_data.context.volatility,
            timestamp=int(datetime.now().timestamp() * 1000),
            model_version=model_state.model_version,
            features_used=important_features,
            signal_strength=get_signal_strength(confidence),
            confluence=confluence,
            timeframe_agreement=timeframe_agreement,
            entry_timing=entry_timing,
            risk_score=risk_score
        )
        
    except Exception as e:
        logger.error(f"💥 Prediction generation error: {e}")
        raise

def prepare_feature_array(features: Dict[str, float]) -> np.ndarray:
    """Prepare feature array for ML model"""
    if model_state.feature_names:
        # Use saved feature names for consistency
        feature_vector = []
        for feature_name in model_state.feature_names:
            feature_vector.append(features.get(feature_name, 0.0))
        
        feature_array = np.array(feature_vector).reshape(1, -1)
        
        # Scale features if scaler is available
        if model_state.scaler:
            feature_array = model_state.scaler.transform(feature_array)
        
        return feature_array
    else:
        # Fallback: use available features
        feature_vector = list(features.values())
        return np.array(feature_vector).reshape(1, -1)

# Helper functions
def quality_to_score(quality: str) -> float:
    mapping = {'poor': 0.2, 'fair': 0.5, 'good': 0.7, 'excellent': 1.0}
    return mapping.get(quality, 0.5)

def volatility_to_score(volatility: str) -> float:
    mapping = {'low': 0.3, 'normal': 0.6, 'high': 0.9}
    return mapping.get(volatility, 0.6)

def trend_to_score(trend: str) -> float:
    mapping = {'bearish': -1.0, 'neutral': 0.0, 'bullish': 1.0}
    return mapping.get(trend, 0.0)

def analyze_confluence(input_data: PredictionInput) -> Dict[str, Any]:
    """Analyze signal confluence across indicators and timeframes"""
    bullish_signals = 0
    bearish_signals = 0
    factors = []
    
    # Indicator analysis
    indicators = input_data.indicators
    
    if indicators.get('RSI', 50) < 30:
        bullish_signals += 2
        factors.append("RSI oversold")
    elif indicators.get('RSI', 50) > 70:
        bearish_signals += 2
        factors.append("RSI overbought")
    
    if indicators.get('EMA9', 0) > indicators.get('EMA21', 0):
        bullish_signals += 1
        factors.append("EMA bullish")
    elif indicators.get('EMA9', 0) < indicators.get('EMA21', 0):
        bearish_signals += 1
        factors.append("EMA bearish")
    
    if indicators.get('MACD', 0) > 0:
        bullish_signals += 1
        factors.append("MACD positive")
    elif indicators.get('MACD', 0) < 0:
        bearish_signals += 1
        factors.append("MACD negative")
    
    # Pattern analysis
    for pattern in input_data.patterns:
        weight = 2 if pattern.strength in ['strong', 'very_strong'] else 1
        
        if pattern.type == 'bullish':
            bullish_signals += weight
            factors.append(f"{pattern.name} pattern")
        elif pattern.type == 'bearish':
            bearish_signals += weight
            factors.append(f"{pattern.name} pattern")
    
    total_signals = bullish_signals + bearish_signals
    confluence_score = max(bullish_signals, bearish_signals) / max(total_signals, 1) * 100
    
    return {
        "score": round(confluence_score, 1),
        "bullish_signals": bullish_signals,
        "bearish_signals": bearish_signals,
        "direction": "bullish" if bullish_signals > bearish_signals else "bearish" if bearish_signals > bullish_signals else "mixed",
        "factors": factors[:5]  # Top 5 factors
    }

def analyze_timeframe_agreement(input_data: PredictionInput) -> Dict[str, Any]:
    """Analyze agreement across multiple timeframes"""
    trends = {}
    for tf, data in input_data.timeframes.items():
        if data.trend and data.trend != 'neutral':
            trends[tf] = data.trend
    
    if not trends:
        return {"agreement": 0, "direction": "mixed", "timeframes": {}}
    
    bullish_count = sum(1 for trend in trends.values() if trend == 'bullish')
    bearish_count = sum(1 for trend in trends.values() if trend == 'bearish')
    total_count = len(trends)
    
    if bullish_count > bearish_count:
        agreement = (bullish_count / total_count) * 100
        direction = "bullish"
    elif bearish_count > bullish_count:
        agreement = (bearish_count / total_count) * 100
        direction = "bearish"
    else:
        agreement = 0
        direction = "mixed"
    
    return {
        "agreement": round(agreement, 1),
        "direction": direction,
        "timeframes": trends,
        "strength": "strong" if agreement > 75 else "medium" if agreement > 50 else "weak"
    }

def calculate_entry_timing(input_data: PredictionInput) -> Dict[str, Any]:
    """Calculate optimal entry timing"""
    primary_tf = "5M"
    if primary_tf in input_data.timeframes:
        return {
            "timeframe": primary_tf,
            "recommendation": f"Enter on next {primary_tf} candle",
            "urgency": "high" if len(input_data.patterns) > 0 else "medium"
        }
    
    return {
        "timeframe": "5M",
        "recommendation": "Wait for next 5M candle",
        "urgency": "medium"
    }

def calculate_risk_score(input_data: PredictionInput, confidence: float) -> Dict[str, Any]:
    """Calculate comprehensive risk score"""
    risk_score = 50  # Base risk
    
    # Confidence adjustment
    if confidence > 80:
        risk_score -= 15
    elif confidence < 65:
        risk_score += 15
    
    # Volatility adjustment
    if input_data.context.volatility == 'high':
        risk_score += 20
    elif input_data.context.volatility == 'low':
        risk_score += 10
    
    # Data quality adjustment
    quality_adj = {'poor': 25, 'fair': 10, 'good': -5, 'excellent': -10}
    risk_score += quality_adj.get(input_data.context.dataQuality, 0)
    
    risk_score = max(0, min(100, risk_score))
    
    return {
        "score": risk_score,
        "level": "High" if risk_score > 70 else "Medium" if risk_score > 40 else "Low",
        "factors": [
            f"Confidence: {confidence}%",
            f"Volatility: {input_data.context.volatility}",
            f"Data quality: {input_data.context.dataQuality}"
        ]
    }

def generate_reason(features: Dict[str, float], patterns: List[Pattern], confluence: Dict[str, Any]) -> str:
    """Generate human-readable prediction reason"""
    reasons = []
    
    # RSI reasons
    rsi = features.get('rsi', 50)
    if rsi < 30:
        reasons.append("RSI oversold condition")
    elif rsi > 70:
        reasons.append("RSI overbought condition")
    
    # EMA reasons
    ema9_ema21_ratio = features.get('ema9_ema21_ratio', 1.0)
    if ema9_ema21_ratio > 1.001:
        reasons.append("EMA bullish alignment")
    elif ema9_ema21_ratio < 0.999:
        reasons.append("EMA bearish alignment")
    
    # Pattern reasons
    strong_patterns = [p for p in patterns if p.strength in ['strong', 'very_strong']]
    if strong_patterns:
        reasons.append(f"{strong_patterns[0].name} pattern")
    
    # Confluence reasons
    if confluence.get('score', 0) > 70:
        reasons.append("Strong signal confluence")
    
    # Multi-timeframe reasons
    timeframe_agreement = features.get('timeframe_agreement', 1.0)
    if timeframe_agreement < 0.3:  # Low std = high agreement
        reasons.append("Multi-timeframe agreement")
    
    return " + ".join(reasons[:3]) if reasons else "Mixed technical signals"

def get_important_features(features: Dict[str, float]) -> List[str]:
    """Get list of most important features for this prediction"""
    important = []
    
    rsi = features.get('rsi', 50)
    if rsi < 35 or rsi > 65:
        important.append('RSI')
    
    if features.get('ema9_ema21_ratio', 1.0) != 1.0:
        important.append('EMA_alignment')
    
    if features.get('macd', 0) != 0:
        important.append('MACD')
    
    if features.get('strong_patterns', 0) > 0:
        important.append('candlestick_patterns')
    
    if features.get('timeframe_agreement', 1.0) < 0.5:
        important.append('multi_timeframe_confluence')
    
    return important[:5]  # Top 5 features

def get_signal_strength(confidence: float) -> str:
    """Determine signal strength based on confidence"""
    if confidence > 85:
        return "very_strong"
    elif confidence > 75:
        return "strong"
    elif confidence > 65:
        return "medium"
    else:
        return "weak"

# Mock model for development/testing
class MockTradingModel:
    """Mock trading model for development and testing"""
    
    def predict(self, features: Dict[str, float]) -> tuple:
        """Generate mock prediction based on simple rules"""
        
        # Simple rule-based logic for demonstration
        score = 0
        
        # RSI influence
        rsi = features.get('rsi', 50)
        if rsi < 30:
            score += 30
        elif rsi > 70:
            score -= 30
        
        # EMA influence
        ema_ratio = features.get('ema9_ema21_ratio', 1.0)
        if ema_ratio > 1.002:
            score += 20
        elif ema_ratio < 0.998:
            score -= 20
        
        # Pattern influence
        bullish_patterns = features.get('bullish_patterns', 0)
        bearish_patterns = features.get('bearish_patterns', 0)
        score += bullish_patterns * 15
        score -= bearish_patterns * 15
        
        # Trend influence
        trend_score = features.get('avg_timeframe_trend', 0)
        score += trend_score * 25
        
        # Determine direction and confidence
        if score > 0:
            direction = "UP"
            confidence = min(85, 55 + abs(score) * 0.5)
        elif score < 0:
            direction = "DOWN" 
            confidence = min(85, 55 + abs(score) * 0.5)
        else:
            direction = "UP" if np.random.random() > 0.5 else "DOWN"
            confidence = 60
        
        return direction, confidence

# Performance tracking functions
def calculate_model_accuracy():
    """Calculate model accuracy based on historical predictions"""
    # This would connect to a database to track actual vs predicted
    return 72.5  # Mock accuracy

def get_predictions_today():
    """Get number of predictions made today"""
    return model_state.predictions_served

def get_top_pairs():
    """Get top performing currency pairs"""
    return ["EURUSD", "GBPUSD", "USDJPY"]

def get_confidence_distribution():
    """Get distribution of confidence scores"""
    return {
        "high_confidence": 25,
        "medium_confidence": 60, 
        "low_confidence": 15
    }

def get_risk_distribution():
    """Get distribution of risk levels"""
    return {
        "low_risk": 30,
        "medium_risk": 50,
        "high_risk": 20
    }

# Run the server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )