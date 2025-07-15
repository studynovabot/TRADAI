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

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      // Use your WebSocket endpoint here
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔄 WebSocket connected');
        setConnected(true);
        setConnectionStatus('connected');
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'signal') {
            const newSignal: Signal = {
              id: data.id || Date.now().toString(),
              pair: data.pair,
              direction: data.direction,
              confidence: data.confidence,
              timestamp: data.timestamp || Date.now(),
              timeframe: data.timeframe || '5m'
            };
            
            setSignals(prev => [newSignal, ...prev.slice(0, 49)]); // Keep last 50 signals
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔄 WebSocket disconnected');
        setConnected(false);
        setConnectionStatus('disconnected');
        
        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('🔄 WebSocket error:', error);
        setConnected(false);
        setConnectionStatus('error');
        setError('WebSocket connection failed');
      };

    } catch (err) {
      console.error('🔄 Failed to create WebSocket:', err);
      setConnectionStatus('error');
      setError('Failed to create WebSocket connection');
    }
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
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    signals,
    connected,
    connectionStatus,
    error
  };
}