import { useEffect, useRef } from 'react';
import { LayoutChange } from '@/types';

interface WsHandlers {
  onLayoutChanged?: (data: {
    scenarioId: string;
    version: number;
    changes: LayoutChange;
  }) => void;
  onCalcStatus?: (data: {
    scenarioId: string;
    status: 'queued' | 'running' | 'done';
    AEP_MWh?: number;
  }) => void;
  onTelemetry?: (data: {
    scenarioId: string;
    wind: { dir: number; v: number; p: number };
  }) => void;
}

export function useWs(scenarioId: string, handlers: WsHandlers) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    const connect = () => {
    const wsUrl = (import.meta as any).env.DEV
        ? 'ws://localhost:3001/ws'
        : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
        ws.send(JSON.stringify({ event: 'join', data: { scenarioId } }));
      };

      ws.onmessage = (m) => {
        try {
          const { event, data } = JSON.parse(m.data as string);
          
          if (event === 'layout_changed' && handlers.onLayoutChanged) {
            handlers.onLayoutChanged(data);
          }
          
          if (event === 'calc_status' && handlers.onCalcStatus) {
            handlers.onCalcStatus(data);
          }
          
          if (event === 'telemetry' && handlers.onTelemetry) {
            handlers.onTelemetry(data);
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WS error:', err);
      };

      ws.onclose = () => {
        console.log('WebSocket closed, attempting reconnect...');
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [scenarioId, handlers]);

  return wsRef;
}
