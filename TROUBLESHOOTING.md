# 🔧 AI Trading Sniper - Troubleshooting Guide

## 🚨 **Issue: Platform Not Supported / Asset Not Detected**

### **Step 1: Verify Extension is Loaded**

1. **Reload the Extension:**
   - Go to `chrome://extensions/`
   - Find "AI Trading Sniper"
   - Click **🔄 RELOAD** button
   - Make sure it shows "✅ Active"

2. **Check Extension Console:**
   - Click **"Inspect views: service worker"**
   - Look for these success messages:
   ```
   [Candle Sniper] 🚀 Initializing enhanced background engine...
   [Candle Sniper] ✅ AI integration loaded
   [Candle Sniper] ✅ Enhanced background engine ready
   ```

### **Step 2: Test on Quotex**

1. **Open Quotex:**
   - Go to `https://quotex.io/en/trade`
   - Wait for page to fully load
   - Select any currency pair (EUR/USD recommended)

2. **Check Browser Console:**
   - Press **F12** → **Console** tab
   - Look for these messages:
   ```
   [Candle Sniper] 🚀 Content script starting...
   [Candle Sniper] URL: https://quotex.io/...
   [Candle Sniper] ✅ Content script initialized for: quotex
   [Candle Sniper] 🔍 Starting asset monitoring for quotex
   ```

3. **If NO console messages appear:**
   - The content script isn't loading
   - **Solution:** Refresh the Quotex page

### **Step 3: Manual Asset Detection Test**

1. **On Quotex page, open Console (F12)**
2. **Copy and paste this diagnostic script:**

```javascript
// PASTE THIS IN QUOTEX CONSOLE:
console.log('🔍 QUOTEX DETECTION TEST');
console.log('Hostname:', window.location.hostname);
console.log('Is Quotex?', window.location.hostname.includes('quotex.io'));

// Test selectors
const selectors = [
    '.asset-select__selected .asset-select__name',
    '.selected-instrument-name', 
    '.instrument-selector .selected-name',
    '.trading-panel .asset-name',
    '.asset-name',
    '.pair-name'
];

selectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) console.log(`✅ Found: ${sel} = "${el.textContent}"`);
});

// Check extension status
if (window.candleSniperDetector) {
    console.log('✅ Extension loaded');
    console.log('Platform:', window.candleSniperDetector.platform);
    console.log('Asset:', window.candleSniperDetector.getCurrentAsset());
} else {
    console.log('❌ Extension NOT loaded');
}
```

### **Step 4: Common Solutions**

#### **Problem: Extension Console Shows Errors**
- **Solution:** Reload extension and refresh all trading platform tabs

#### **Problem: "Platform: Unknown"**
- **Check:** Are you on quotex.io domain?
- **Solution:** Make sure URL contains "quotex.io"

#### **Problem: "Asset not detected"**
- **Check:** Is a currency pair selected on Quotex?
- **Try:** Select EUR/USD specifically
- **Solution:** Wait 10 seconds after selecting pair

#### **Problem: Extension popup shows no data**
- **Check:** Is "Start Sniper Mode" clicked?
- **Solution:** Click it and wait 20 seconds

### **Step 5: Advanced Debugging**

1. **Check Extension Permissions:**
   - Go to `chrome://extensions/`
   - Click **"Details"** on AI Trading Sniper
   - Ensure "Site access" is set to "On all sites"

2. **Test Different Browsers:**
   - Try Chrome Incognito mode
   - Test on different trading platforms

3. **Clear Cache:**
   - Clear browser cache
   - Disable other extensions temporarily

### **Step 6: Manual Selector Finding**

If automatic detection fails, find the correct selector:

1. **On Quotex, right-click the currency pair name**
2. **Select "Inspect Element"**
3. **Copy the element's class or ID**
4. **Test in console:** `document.querySelector('.your-selector').textContent`

### **Step 7: Fallback Testing**

Try these platforms to verify extension works:
- **IQ Option:** https://iqoption.com/
- **Olymp Trade:** https://olymptrade.com/
- **Binomo:** https://binomo.com/

### **Step 8: Get Help**

If still not working, provide these details:
- Chrome version
- Extension console logs
- Browser console logs from Quotex
- Screenshot of Quotex interface
- Result of diagnostic script

## ✅ **Expected Working State**

When everything works correctly, you should see:

**Extension Popup:**
```
Platform: Quotex
Current Asset: EURUSD
Status: AI analysis active
```

**Browser Console:**
```
[Candle Sniper] ✅ Content script initialized for: quotex
[Candle Sniper] 🎯 Asset detected: EURUSD on quotex
[Candle Sniper] ✅ Asset locked: EURUSD
```

**Extension Console:**
```
[Candle Sniper] 📡 Content script loaded on quotex
[Candle Sniper] 🎯 Asset detected: EURUSD on quotex
```

## 🎯 **Quick Fix Checklist**

- [ ] Extension reloaded
- [ ] Browser console shows content script messages
- [ ] Quotex page fully loaded
- [ ] Currency pair selected 
- [ ] "Start Sniper Mode" clicked
- [ ] Waited 20 seconds for detection
- [ ] Browser cache cleared
- [ ] Other extensions disabled

Most issues are resolved by **reloading the extension** and **refreshing the Quotex page**!