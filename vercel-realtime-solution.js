// 🚀 VERCEL-OPTIMIZED REAL-TIME SYSTEM

// 📡 API Route: /api/realtime/socket.js

let clients = [];

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 📊 Server-Sent Events for real-time updates
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const clientId = Date.now();
    clients.push({ id: clientId, res });
    
    // 💓 Keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000);
    
    // 🔄 Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      clients = clients.filter(client => client.id !== clientId);
    });
    
    return;
  }
  
  if (req.method === 'POST') {
    // 📤 Broadcast to all clients
    const { type, data } = req.body;
    
    clients.forEach(client => {
      client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    });
    
    return res.status(200).json({ success: true });
  }
}

// 🔌 CLIENT-SIDE HOOK: hooks/useRealTime.ts
import { useEffect, useState } from 'react';

export function useRealTime() {
  const [signals, setSignals] = useState([]);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const eventSource = new EventSource('/api/realtime/socket');
    
    eventSource.onopen = () => setConnected(true);
    eventSource.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      
      if (type === 'newSignal') {
        setSignals(prev => [data, ...prev.slice(0, 99)]);
      }
    };
    
    eventSource.onerror = () => setConnected(false);
    
    return () => eventSource.close();
  }, []);
  
  return { signals, connected };
}

// 📊 SIGNAL BROADCASTER: lib/realtime/broadcaster.js
export class SignalBroadcaster {
  static async broadcast(signal) {
    try {
      await fetch('/api/realtime/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'newSignal',
          data: signal
        })
      });
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  }
}