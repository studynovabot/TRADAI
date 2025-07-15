# 🚀 TRADAI - Next.js Vercel Deployment

This project has been configured as a Next.js application for deployment on Vercel.

## 📁 Project Structure

```
/
├── pages/                 # Next.js pages
│   ├── _app.tsx          # App wrapper
│   ├── _document.tsx     # Document template
│   ├── index.tsx         # Main dashboard
│   └── api/              # API routes
│       └── health.ts     # Health check endpoint
├── components/           # React components
├── hooks/               # Custom React hooks
│   └── useRealTime.ts   # Real-time data hook
├── styles/              # Global styles
│   └── globals.css      # Tailwind + custom styles
├── vercel-tradingview-component.tsx  # TradingView components
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind configuration
└── package.json         # Dependencies with Next.js
```

## 🔧 Key Changes Made

### 1. **Package.json Updates**
- Added `next` as a dependency
- Added Next.js build scripts
- Added Tailwind CSS and PostCSS
- Added ESLint for Next.js

### 2. **Next.js Configuration**
- Created `next.config.js` with TradingView security headers
- Added TypeScript support
- Configured external script loading

### 3. **Components Fixed**
- Fixed duplicate export default error
- `TradingViewChart` remains default export
- `LiveSignals` is now a named export

### 4. **Styling**
- Added Tailwind CSS configuration
- Created global styles for TradingView widgets
- Added trading-specific color palette

## 🚀 Deployment Instructions

### 1. **Vercel Dashboard Settings**
- **Root Directory**: Leave empty (uses repository root)
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 2. **Environment Variables**
Add these to your Vercel project settings:
```
NEXT_PUBLIC_WS_URL=wss://your-websocket-url.com
```

### 3. **Local Development**
```bash
npm install
npm run dev
```

### 4. **Production Build**
```bash
npm run build
npm run start
```

## 🔄 WebSocket Integration

The `useRealTime` hook connects to a WebSocket server for live trading signals. Configure your WebSocket URL in the environment variables.

## 📊 TradingView Integration

The TradingView component loads the official TradingView library and creates charts with:
- Real-time price data
- Technical indicators (RSI, MACD, Bollinger Bands, EMA)
- Signal overlays
- Dark/light theme support

## 🎯 API Routes

- `/api/health` - Health check endpoint
- Add more API routes as needed for your trading backend

## 📱 Components

### TradingViewChart (Default Export)
- Primary chart component
- Props: `symbol`, `interval`, `theme`
- Displays trading signals as overlays

### LiveSignals (Named Export)
- Live signal feed component
- Shows real-time trading signals
- Connection status indicator

## 🔧 Troubleshooting

1. **Build Errors**: Check TypeScript errors in components
2. **Missing Dependencies**: Run `npm install` to install all dependencies
3. **WebSocket Issues**: Verify NEXT_PUBLIC_WS_URL environment variable
4. **TradingView Loading**: Check Content Security Policy in next.config.js

## 🎨 Customization

- Modify `tailwind.config.js` for custom colors
- Update `styles/globals.css` for global styles
- Add new pages in the `pages/` directory
- Create API endpoints in `pages/api/`

## 📈 Performance

- TradingView script is loaded asynchronously
- WebSocket connections auto-reconnect
- Tailwind CSS is optimized for production
- Next.js provides automatic code splitting