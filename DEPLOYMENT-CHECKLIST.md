# Enhanced Gemini Vision - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Variables
Ensure these environment variables are set in your deployment platform:

**Required:**
- `GOOGLE_VISION_API_KEY` - Your primary Gemini API key

**Optional (for failover):**
- `GEMINI_API_KEY_2` - Backup API key #2
- `GEMINI_API_KEY_3` - Backup API key #3
- `GOOGLE_API_KEY_2` - Alternative backup key #2
- `GOOGLE_API_KEY_3` - Alternative backup key #3

### 2. Dependencies
All required dependencies are included in package.json:
- ✅ `sharp@^0.33.5` - Image preprocessing
- ✅ `@google/generative-ai@^0.24.1` - Gemini AI integration
- ✅ `formidable@^3.5.4` - File upload handling
- ✅ `form-data@^4.0.4` - Form data processing

### 3. Build Verification
- ✅ Local build passes: `npm run build`
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ All API routes compile successfully

### 4. File Structure
```
├── services/
│   ├── EnhancedGeminiVisionService.js ✅
│   └── BacktestingService.js ✅
├── pages/api/
│   ├── enhanced-gemini-vision.js ✅
│   ├── backtesting.js ✅
│   └── gemini-vision-signal.js ✅ (existing)
└── package.json ✅ (updated to v3.0.0-enhanced)
```

## 🚀 Deployment Steps

### For Vercel Deployment:

1. **Push to Repository**
   ```bash
   git add .
   git commit -m "Add enhanced Gemini Vision features with multi-factor confirmation"
   git push origin main
   ```

2. **Set Environment Variables in Vercel Dashboard**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add `GOOGLE_VISION_API_KEY` with your Gemini API key
   - Optionally add backup keys for failover

3. **Deploy**
   - Vercel will automatically deploy on push
   - Or manually trigger deployment from dashboard

## 🧪 Post-Deployment Testing

### 1. Health Check
```bash
curl https://your-domain.vercel.app/api/health
```

### 2. Basic Gemini Vision (existing)
```bash
curl -X POST https://your-domain.vercel.app/api/gemini-vision-signal \
  -F "image=@test-chart.png"
```

### 3. Enhanced Gemini Vision (new)
```bash
curl -X POST https://your-domain.vercel.app/api/enhanced-gemini-vision \
  -F "image=@test-chart.png" \
  -F "imagePreprocessing=true" \
  -F "multiFactorConfirmation=true" \
  -F "contradictionHandling=true"
```

### 4. Backtesting API (new)
```bash
# Check backtesting status
curl https://your-domain.vercel.app/api/backtesting?action=status

# Get performance report
curl https://your-domain.vercel.app/api/backtesting?action=report
```

## 🔧 Configuration for Production

### Recommended Production Settings:
```javascript
// Enhanced service configuration for production
{
  imagePreprocessing: true,       // Enable for better accuracy
  multiFactorConfirmation: true,  // Require 3+ confluences
  contradictionHandling: true,    // Handle conflicting signals
  backtestingEnabled: true,       // Track performance
  uncertaintyThreshold: 70,       // Higher threshold for production
  minConfidence: 70,              // Higher minimum confidence
  maxRetries: 3,                  // API retry attempts
  timeout: 45000                  // 45s timeout for Vercel
}
```

### Performance Considerations:
- **Image preprocessing** adds ~2-5 seconds processing time
- **Multi-factor confirmation** may reduce signal frequency but improves accuracy
- **Backtesting** uses minimal additional resources
- **Sharp library** is optimized for serverless environments

## 📊 Monitoring & Maintenance

### 1. Monitor API Usage
- Track Gemini API quota usage
- Monitor response times
- Check error rates

### 2. Backtesting Performance
- Review accuracy metrics weekly
- Adjust confidence thresholds based on performance
- Export backtesting data for analysis

### 3. Error Monitoring
- Check Vercel function logs for errors
- Monitor image preprocessing failures
- Track API key rotation events

## 🚨 Troubleshooting

### Common Issues:

1. **Sharp Installation Issues**
   - Vercel automatically handles Sharp for serverless
   - If issues persist, Sharp will gracefully fallback

2. **API Key Exhaustion**
   - Service automatically rotates to backup keys
   - Monitor key usage in Gemini AI Studio

3. **Timeout Issues**
   - Vercel has 10s timeout for Hobby plan, 60s for Pro
   - Image preprocessing may need timeout adjustment

4. **Memory Issues**
   - Large images are automatically resized
   - Backtesting data is limited to 10,000 entries

### Debug Endpoints:
- `/api/debug-env` - Check environment variables
- `/api/debug-gemini` - Test Gemini API connection

## 📈 Feature Rollout Strategy

### Phase 1: Parallel Testing
- Deploy enhanced features alongside existing API
- Use `/api/enhanced-gemini-vision` for testing
- Keep `/api/gemini-vision-signal` as fallback

### Phase 2: Gradual Migration
- Start using enhanced features for new requests
- Compare performance between old and new
- Monitor backtesting results

### Phase 3: Full Migration
- Switch primary endpoint to enhanced version
- Deprecate old endpoint
- Optimize based on production data

## 🔒 Security Considerations

### API Key Management:
- Use environment variables only
- Never commit API keys to repository
- Rotate keys regularly
- Monitor for unauthorized usage

### Input Validation:
- File size limits (10MB max)
- File type validation (images only)
- Request rate limiting (if needed)

### Data Privacy:
- Images are processed in memory only
- No persistent storage of user images
- Backtesting data contains no personal information

## 📚 Documentation Links

- **Enhanced Features Guide**: `ENHANCED-FEATURES.md`
- **API Documentation**: Available in each endpoint file
- **Testing Guide**: `test-enhanced-gemini.js`
- **Setup Script**: `setup-enhanced-features.js`

## ✅ Deployment Verification

After deployment, verify these endpoints work:

- [ ] `GET /api/health` - Returns 200 OK
- [ ] `POST /api/gemini-vision-signal` - Original endpoint works
- [ ] `POST /api/enhanced-gemini-vision` - Enhanced endpoint works
- [ ] `GET /api/backtesting?action=status` - Backtesting API works
- [ ] Environment variables are properly set
- [ ] Image preprocessing works (check response metadata)
- [ ] Multi-factor confirmation is applied (check confluence count)
- [ ] Contradiction handling works (test with conflicting signals)

## 🎉 Success Criteria

Deployment is successful when:
- ✅ All API endpoints respond correctly
- ✅ Enhanced features are functional
- ✅ Backtesting system is operational
- ✅ Image preprocessing works without errors
- ✅ Multi-factor confirmation reduces false signals
- ✅ Performance metrics are being tracked

---

**Version**: 3.0.0-enhanced  
**Last Updated**: December 2024  
**Deployment Platform**: Vercel (recommended)