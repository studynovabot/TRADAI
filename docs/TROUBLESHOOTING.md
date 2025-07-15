# 🔧 Troubleshooting Guide

This guide helps resolve common issues with the AI Binary Trading Bot.

## 🚨 **Critical API Issues**

### ❌ **Twelve Data API: "Symbol parameter is missing or invalid"**

**Problem**: API rejects requests with currency pair format error.

**Solution**: 
- ✅ **FIXED**: Bot now converts `USD/INR` → `USDINR` automatically
- The `DataCollector.formatSymbol()` method handles this conversion
- Test with: `npm run test-apis`

**Manual verification**:
```bash
# Test the API directly
curl "https://api.twelvedata.com/time_series?symbol=USDINR&interval=1min&outputsize=1&apikey=YOUR_KEY"
```

### ❌ **Groq API: 401 Unauthorized Error**

**Problem**: Authentication failure despite providing API key.

**Solutions**:
1. **Check API key format**: Must start with `gsk_`
2. **Verify key is active**: Login to https://console.groq.com/
3. **Test manually**:
   ```bash
   curl -X POST "https://api.groq.com/openai/v1/chat/completions" \
     -H "Authorization: Bearer YOUR_GROQ_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"llama3-70b-8192","messages":[{"role":"user","content":"test"}],"max_tokens":10}'
   ```

**Fallback**: Bot automatically switches to Together AI if Groq fails.

### ❌ **Chrome/Chromium Missing**

**Problem**: Selenium cannot find Chrome browser.

**Solutions**:
1. **Install Chrome**: See [Chrome Setup Guide](./CHROME_SETUP.md)
2. **Windows**: Download from https://www.google.com/chrome/
3. **Linux**: `sudo apt install google-chrome-stable`
4. **macOS**: `brew install --cask google-chrome`

**Test installation**:
```bash
chrome --version
```

## 🔍 **Diagnostic Commands**

### **Quick System Check**
```bash
npm run verify
```

### **Detailed API Testing**
```bash
npm run test-apis
```

### **Full System Test**
```bash
npm run test-system
```

### **Check Logs**
```bash
# Windows
Get-Content -Path "logs/trading.log" -Wait

# Linux/Mac
tail -f logs/trading.log
```

## 🐛 **Common Issues & Solutions**

### **1. "Module not found" Errors**
```bash
# Reinstall dependencies
npm install

# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **2. Database Connection Issues**
```bash
# Recreate database
rm -f data/trading.db
node scripts/verify-setup.js
```

### **3. Rate Limiting Issues**
**Symptoms**: "Too many requests" errors

**Solutions**:
- Twelve Data: 800 calls/day on free plan
- Check usage: https://twelvedata.com/account/usage
- Upgrade plan if needed
- Bot automatically handles rate limiting

### **4. AI Response Parsing Errors**
**Symptoms**: "Failed to parse AI response"

**Solutions**:
- Check AI provider status
- Verify API credits/quota
- Bot automatically retries with fallback provider

### **5. Selenium WebDriver Issues**
```bash
# Update ChromeDriver
npm install chromedriver@latest

# Test Selenium manually
node -e "
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const options = new chrome.Options().addArguments('--headless');
new Builder().forBrowser('chrome').setChromeOptions(options).build()
  .then(driver => { console.log('✅ Selenium OK'); return driver.quit(); })
  .catch(err => console.log('❌ Selenium Error:', err.message));
"
```

## 📊 **Performance Issues**

### **High Memory Usage**
- **Cause**: Chrome browser instances not closing
- **Solution**: Enable headless mode in `.env`:
  ```
  SELENIUM_HEADLESS=true
  ```

### **Slow API Responses**
- **Cause**: Network latency or API server issues
- **Solution**: Increase timeouts in `src/config/Config.js`:
  ```javascript
  apiTimeout: 30000  // 30 seconds
  ```

### **Database Lock Errors**
- **Cause**: Multiple bot instances running
- **Solution**: Ensure only one bot instance is active:
  ```bash
  # Check running processes
  ps aux | grep node
  
  # Kill existing instances
  pkill -f "node src/index.js"
  ```

## 🔐 **Security Issues**

### **API Key Exposure**
- **Never commit `.env` file to version control**
- **Use environment variables in production**
- **Rotate keys regularly**

### **QXBroker Login Issues**
- **Update credentials in `.env`**:
  ```
  QXBROKER_EMAIL=your_email@example.com
  QXBROKER_PASSWORD=your_password
  ```
- **Enable 2FA if supported**

## 📈 **Trading Issues**

### **No Trades Being Executed**
**Check**:
1. **Paper trading mode**: Set `PAPER_TRADING=false` for live trading
2. **Confidence threshold**: Lower `MIN_CONFIDENCE` in config
3. **Market hours**: Check if markets are open
4. **Daily limits**: Verify not exceeded in config

### **Low Win Rate**
**Optimize**:
1. **Increase confidence threshold**: `MIN_CONFIDENCE=80`
2. **Adjust technical indicators**: Modify periods in `config/trading.json`
3. **Review AI decisions**: Check `logs/trading.log` for reasoning

### **Frequent API Errors**
**Solutions**:
1. **Check API quotas**: Monitor usage limits
2. **Implement backoff**: Bot has built-in retry logic
3. **Switch providers**: Use Together AI as fallback

## 🆘 **Emergency Procedures**

### **Stop All Trading Immediately**
```bash
# Kill bot process
pkill -f "node src/index.js"

# Or use Ctrl+C in terminal
```

### **Reset Everything**
```bash
# Stop bot
pkill -f "node src/index.js"

# Clear logs
rm -rf logs/*

# Reset database
rm -f data/trading.db

# Reinstall
npm install
node install.js
```

### **Backup Important Data**
```bash
# Backup trading database
cp data/trading.db data/trading_backup_$(date +%Y%m%d).db

# Backup logs
tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/
```

## 📞 **Getting Help**

### **Log Analysis**
When reporting issues, include:
1. **Error logs**: From `logs/error.log`
2. **System info**: OS, Node.js version
3. **Configuration**: Sanitized config files (no API keys)
4. **Steps to reproduce**: Exact commands run

### **Useful Debug Commands**
```bash
# System information
node --version
npm --version
chrome --version

# Bot configuration
npm run verify

# API connectivity
npm run test-apis

# Full system test
npm run test-system
```

## ✅ **Success Indicators**

Your bot is working correctly when you see:
- ✅ All API connections successful
- ✅ Regular data collection (every 1 minute)
- ✅ Trading decisions (every 5 minutes)
- ✅ Confidence scores > your threshold
- ✅ No repeated error messages in logs

Monitor these indicators regularly to ensure optimal performance!
