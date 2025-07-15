# 📊 React TradingView Components

This project now includes React components for displaying TradingView charts and live trading signals. These components are designed for Vercel deployment and can be integrated into Next.js or React applications.

## 🚀 Quick Start

### Prerequisites
- React 19.1.0+
- TypeScript 5.8.3+
- Tailwind CSS (for styling)

### Installation
The required dependencies are already installed:
```bash
npm install react react-dom @types/react @types/react-dom typescript
```

## 📁 Component Structure

### 1. TradingViewChart Component
Location: `vercel-tradingview-component.tsx`

```tsx
import TradingViewChart from './vercel-tradingview-component';

<TradingViewChart 
  symbol="EURUSD" 
  interval="5" 
  theme="dark" 
/>
```

**Props:**
- `symbol`: Trading pair (e.g., "EURUSD", "BTCUSD")
- `interval`: Chart interval (e.g., "1", "5", "15", "60")
- `theme`: "light" or "dark" (optional, defaults to "dark")

### 2. LiveSignals Component
Location: `vercel-tradingview-component.tsx` (second component)

```tsx
import LiveSignals from './vercel-tradingview-component';

<LiveSignals />
```

Shows real-time trading signals with:
- Signal direction (CALL/PUT)
- Confidence percentage
- Timestamp
- Trading pair

### 3. useRealTime Hook
Location: `hooks/useRealTime.ts`

```tsx
import { useRealTime } from './hooks/useRealTime';

const { signals, connected, connectionStatus, error } = useRealTime();
```

**Returns:**
- `signals`: Array of trading signals
- `connected`: Boolean connection status
- `connectionStatus`: 'connecting' | 'connected' | 'disconnected' | 'error'
- `error`: Error message if any

## 🔧 Configuration

### WebSocket Connection
Edit the WebSocket URL in `hooks/useRealTime.ts`:

```typescript
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
```

### Environment Variables
Create a `.env.local` file:
```
NEXT_PUBLIC_WS_URL=ws://your-websocket-server.com
```

## 🎯 Usage Example

```tsx
// pages/dashboard.tsx or app/dashboard/page.tsx
import TradingDashboard from '../components/TradingDashboard';

export default function Dashboard() {
  return <TradingDashboard />;
}
```

## 🌐 Deployment

### Vercel Deployment
1. Push your code to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Vercel
```
NEXT_PUBLIC_WS_URL=wss://your-websocket-server.com
```

## 🔄 WebSocket Integration

The components expect WebSocket messages in this format:

```json
{
  "type": "signal",
  "id": "unique-signal-id",
  "pair": "EURUSD",
  "direction": "CALL",
  "confidence": 85,
  "timestamp": 1703764800000,
  "timeframe": "5m"
}
```

## 🎨 Styling

Components use Tailwind CSS classes. Make sure to include Tailwind in your project:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## 🔍 Troubleshooting

### Common Issues

1. **TradingView not loading**: Check if the TradingView script is properly loaded
2. **WebSocket connection failed**: Verify the WebSocket URL and server status
3. **Styling issues**: Ensure Tailwind CSS is properly configured
4. **TypeScript errors**: Check tsconfig.json configuration

### Debug Mode
Enable debug logging by adding this to your component:

```tsx
useEffect(() => {
  console.log('🔄 Signals:', signals);
  console.log('🔄 Connected:', connected);
}, [signals, connected]);
```

## 🚀 Next Steps

1. Set up your WebSocket server to send trading signals
2. Customize the chart appearance and indicators
3. Add more trading pairs and timeframes
4. Implement signal filtering and alerts
5. Add trading execution capabilities

## 📞 Support

If you need help integrating these components:
1. Check the browser console for errors
2. Verify WebSocket connection
3. Ensure all dependencies are installed
4. Test with mock data first