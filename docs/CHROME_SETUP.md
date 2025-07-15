# Chrome/Chromium Installation Guide

The AI Binary Trading Bot requires Chrome or Chromium for Selenium automation on QXBroker. Here's how to install it on different systems:

## 🪟 **Windows Installation**

### Option 1: Google Chrome (Recommended)
1. Download from: https://www.google.com/chrome/
2. Run the installer
3. Chrome will be automatically detected by the bot

### Option 2: Chromium (Open Source)
1. Download from: https://www.chromium.org/getting-involved/download-chromium/
2. Extract to a folder (e.g., `C:\chromium\`)
3. Add to PATH or update bot config

### Option 3: Using Chocolatey
```powershell
# Install Chocolatey first: https://chocolatey.org/install
choco install googlechrome
# OR
choco install chromium
```

## 🐧 **Linux Installation**

### Ubuntu/Debian
```bash
# Google Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install google-chrome-stable

# OR Chromium
sudo apt update
sudo apt install chromium-browser
```

### CentOS/RHEL/Fedora
```bash
# Google Chrome
sudo dnf install google-chrome-stable

# OR Chromium
sudo dnf install chromium
```

## 🍎 **macOS Installation**

### Option 1: Direct Download
1. Download from: https://www.google.com/chrome/
2. Drag to Applications folder

### Option 2: Using Homebrew
```bash
# Install Homebrew first: https://brew.sh/
brew install --cask google-chrome
# OR
brew install --cask chromium
```

## 🔧 **Verification**

After installation, verify Chrome is accessible:

### Windows
```powershell
# Check if Chrome is in PATH
chrome --version
# OR
"C:\Program Files\Google\Chrome\Application\chrome.exe" --version
```

### Linux/macOS
```bash
# Check if Chrome/Chromium is installed
google-chrome --version
# OR
chromium --version
# OR
chromium-browser --version
```

## ⚙️ **Bot Configuration**

The bot automatically detects Chrome in these locations:

### Windows
- `C:\Program Files\Google\Chrome\Application\chrome.exe`
- `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### Linux
- `/usr/bin/google-chrome`
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/snap/bin/chromium`

### macOS
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

## 🚨 **Troubleshooting**

### "Chrome not found" Error
1. **Verify installation**: Run `chrome --version` in terminal
2. **Check PATH**: Ensure Chrome is in your system PATH
3. **Manual path**: Update `src/core/TradingExecutor.js` with your Chrome path:
   ```javascript
   const chromeOptions = {
     binary: '/path/to/your/chrome'  // Add this line
   };
   ```

### Headless Mode Issues
If you encounter display issues, you can disable headless mode:

1. Edit `.env` file:
   ```
   SELENIUM_HEADLESS=false
   ```

2. Or in `config/trading.json`:
   ```json
   {
     "selenium": {
       "headless": false
     }
   }
   ```

### Permission Issues (Linux)
```bash
# Add user to chrome group
sudo usermod -a -G chrome $USER

# Set proper permissions
sudo chmod +x /usr/bin/google-chrome
```

## 🧪 **Test Chrome Installation**

Run this command to test if Chrome works with Selenium:

```bash
node -e "
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function testChrome() {
  const options = new chrome.Options();
  options.addArguments('--headless');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
    
  await driver.get('https://www.google.com');
  console.log('✅ Chrome/Selenium test successful!');
  await driver.quit();
}

testChrome().catch(err => {
  console.log('❌ Chrome/Selenium test failed:', err.message);
});
"
```

## 📞 **Need Help?**

If you're still having issues:

1. **Check bot logs**: Look in `logs/trading.log` for specific error messages
2. **Run system test**: `npm run test-system`
3. **Verify installation**: Use the test command above
4. **Update drivers**: The bot automatically manages ChromeDriver, but you can manually update if needed

The bot requires Chrome for automated trading on QXBroker. Once installed and verified, you'll be ready to start paper trading!
