# Human-in-the-Loop Prediction System

## Overview

This system implements a comprehensive human-in-the-loop machine learning pipeline for trading predictions. Users upload chart screenshots, receive AI predictions for the next 3 candles, and provide feedback to continuously improve the model.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Upload   │───▶│  AI Prediction   │───▶│   Feedback      │
│   Chart Image   │    │   Generation     │    │   Collection    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Firebase Storage│    │   Feature        │    │   Training      │
│ (Images)        │    │   Extraction     │    │   Queue         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Firestore     │    │   Prediction     │    │   Model         │
│   Database      │    │   Storage        │    │   Retraining    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components

### 1. Frontend Components

#### PredictionUpload.jsx
- Handles chart image upload
- Displays AI predictions with confidence scores
- Shows 3-candle predictions with explanations

#### FeedbackForm.jsx
- Allows users to mark predictions as correct/incorrect
- Collects optional comments
- Validates feedback before submission

#### PredictionHistory.jsx
- Shows user's prediction history
- Displays accuracy statistics
- Filters by status and model version

#### AuthForm.jsx
- Firebase authentication (email/password + Google)
- User registration and login

### 2. Backend Services

#### PredictionService.js
- Creates prediction records in Firestore
- Handles feedback submission
- Manages prediction lifecycle
- Generates user statistics

#### FeatureExtractionService.js
- Extracts 50+ technical features from market data
- Calculates indicators: RSI, MACD, Bollinger Bands, etc.
- Prepares data for ML training

#### Firebase Integration
- `firebase-admin.js`: Server-side Firebase operations
- `firebase-client.js`: Client-side Firebase configuration

### 3. API Endpoints

#### POST /api/predict
- Accepts chart image (base64)
- Returns AI predictions for next 3 candles
- Stores prediction in database

#### POST /api/feedback
- Accepts feedback for prediction candles
- Updates prediction status
- Queues for training when complete

#### GET /api/predictions
- Returns user's prediction history
- Supports filtering and pagination
- Includes accuracy statistics

#### POST /api/retrain-request (Admin)
- Triggers model retraining
- Exports labeled data for training
- Manages training pipeline

## Data Flow

### 1. Prediction Creation
```javascript
User uploads image → AI analysis → Feature extraction → Store in Firestore
```

### 2. Feedback Collection
```javascript
User provides feedback → Validate feedback → Update prediction → Queue for training
```

### 3. Model Training
```javascript
Collect labeled data → Export features → Train model → Deploy new version
```

## Database Schema

### Predictions Collection
```javascript
{
  userId: string,
  predictionId: string,
  imagePath: string,
  timestamp: number,
  asset: string,
  timeframe: string,
  currentPrice: number,
  
  // AI Analysis Results
  trend: string,
  marketCondition: string,
  signal: string,
  signalConfidence: number,
  overallConfidence: number,
  
  // 3-Candle Predictions
  predictions: {
    "1": { direction: "UP", probability: 82, explanation: "..." },
    "2": { direction: "UP", probability: 75, explanation: "..." },
    "3": { direction: "DOWN", probability: 68, explanation: "..." }
  },
  
  // ML Features (50+ technical indicators)
  features: {
    currentPrice: number,
    ema5: number,
    ema20: number,
    rsi: number,
    macd: number,
    // ... 45+ more features
  },
  
  // Human Feedback
  feedback: {
    "1": boolean | null,
    "2": boolean | null,
    "3": boolean | null
  },
  
  // Metadata
  modelVersion: string,
  status: "pending_verification" | "partial_feedback" | "labeled",
  createdAt: Date,
  updatedAt: Date
}
```

### Training Queue Collection
```javascript
{
  predictionId: string,
  queuedAt: Date,
  processed: boolean
}
```

## Setup Instructions

### 1. Environment Configuration

Add to `.env.local`:
```bash
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Add to `.env`:
```bash
# Firebase Server Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_bucket

# Human-in-the-Loop Configuration
CURRENT_MODEL_VERSION=v1.0.0
ENABLE_FEEDBACK_COLLECTION=true
MIN_FEEDBACK_FOR_RETRAIN=100
EXTRACT_TECHNICAL_FEATURES=true
FEATURE_LOOKBACK_CANDLES=50
```

### 2. Firebase Setup

1. **Create Firebase Project**
   - Go to Firebase Console
   - Create new project
   - Enable Authentication, Firestore, and Storage

2. **Configure Authentication**
   - Enable Email/Password authentication
   - Enable Google authentication
   - Set up authorized domains

3. **Set up Firestore**
   - Create database in production mode
   - Deploy security rules from `firestore.rules`

4. **Set up Storage**
   - Create storage bucket
   - Deploy security rules from `storage.rules`

5. **Initialize Collections**
   ```bash
   npm run setup:firebase
   ```

### 3. Required Firestore Indexes

Create these indexes in Firebase Console:

1. **predictions** collection:
   - `userId` (Ascending) + `timestamp` (Descending)
   - `userId` (Ascending) + `status` (Ascending) + `timestamp` (Descending)
   - `status` (Ascending) + `modelVersion` (Ascending)

2. **training_queue** collection:
   - `processed` (Ascending) + `queuedAt` (Ascending)

## Usage

### 1. Start Development Server
```bash
npm run dev
```

### 2. Access the Application
- Navigate to `http://localhost:3000/predictions`
- Sign up or sign in with email/password or Google
- Upload chart images and receive predictions
- Provide feedback to improve the model

### 3. Testing
```bash
# Test the complete system
npm run test:prediction-system

# Test feature extraction
npm run test:features

# Test Firebase setup
npm run setup:firebase
```

## Features

### ✅ Implemented
- [x] Chart image upload and storage
- [x] AI-powered 3-candle predictions
- [x] Human feedback collection
- [x] Feature extraction (50+ indicators)
- [x] User authentication (Firebase Auth)
- [x] Prediction history and statistics
- [x] Responsive UI with Tailwind CSS
- [x] Firebase integration (Firestore + Storage)
- [x] Security rules and data validation

### 🚧 In Progress
- [ ] Model retraining pipeline
- [ ] Advanced analytics dashboard
- [ ] Batch prediction processing
- [ ] Performance monitoring

### 📋 Planned
- [ ] Real-time market data integration
- [ ] Advanced ML model deployment
- [ ] Multi-asset support
- [ ] API rate limiting
- [ ] Data export functionality

## Security

### Authentication
- Firebase Authentication with email/password and Google OAuth
- JWT token validation on all API endpoints
- User-specific data access controls

### Data Protection
- Firestore security rules prevent unauthorized access
- Storage rules protect uploaded images
- Input validation and sanitization
- CORS configuration for API endpoints

### Privacy
- Users can only access their own predictions
- Admin roles for system management
- Data deletion capabilities
- Transparent data usage policies

## Performance

### Optimization
- Image compression with Sharp
- Efficient Firestore queries with indexes
- Client-side caching
- Lazy loading of components

### Scalability
- Firebase auto-scaling
- Stateless API design
- Efficient data structures
- Background processing for training

## Monitoring

### Metrics to Track
- Prediction accuracy over time
- User engagement and feedback rates
- System performance and errors
- Model improvement trends

### Logging
- Structured logging with Winston
- Error tracking and alerting
- Performance monitoring
- User activity analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request
5. Ensure all tests pass

## License

This project is proprietary software for TRADAI Pro.

---

For questions or support, contact the development team.