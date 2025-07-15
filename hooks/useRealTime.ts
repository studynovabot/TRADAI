// 🔄 REAL-TIME DATA HOOK FOR VERCEL DEPLOYMENT
// hooks/useRealTime.ts

import { useState, useEffect, useRef } from 'react';

export interface Signal {
  id: string;
  pair: string;
  direction: 'CALL' | 'PUT';
  confidence: number;
  timestamp: number;
  timeframe: string;
}

export interface UseRealTimeReturn {
  signals: Signal[];
  connected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
}

export function useRealTime(): UseRealTimeReturn {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSignals = async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);

      const response = await fetch('/api/signals');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.signals) {
        setSignals(data.signals);
        setConnected(true);
        setConnectionStatus('connected');
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching signals:', err);
      setConnected(false);
      setConnectionStatus('error');
      setError('Failed to fetch signals');
    }
  };

  const connect = () => {
    fetchSignals();
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
    setConnectionStatus('disconnected');
  };

  useEffect(() => {
    // Initial fetch
    fetchSignals();
    
    // Poll for new signals every 10 seconds
    const intervalId = setInterval(fetchSignals, 10000);
    
    return () => {
      clearInterval(intervalId);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    signals,
    connected,
    connectionStatus,
    error
  };
}