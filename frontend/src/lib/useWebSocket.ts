"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { WSEvent, WSEventType } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

type EventHandler = (data: any) => void;

interface UseWebSocketOptions {
  matchId: string;
  userId: string;
  userName: string;
  onEvent?: (event: WSEvent) => void;
}

export function useWebSocket({ matchId, userId, userName, onEvent }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<WSEventType, EventHandler[]>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);

  const on = useCallback((eventType: WSEventType, handler: EventHandler) => {
    const handlers = handlersRef.current.get(eventType) || [];
    handlers.push(handler);
    handlersRef.current.set(eventType, handlers);

    // Return cleanup function
    return () => {
      const current = handlersRef.current.get(eventType) || [];
      handlersRef.current.set(
        eventType,
        current.filter((h) => h !== handler)
      );
    };
  }, []);

  const send = useCallback((type: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  const submitDecision = useCallback(
    (eventId: string, choice: string) => {
      send("SUBMIT_DECISION", { event_id: eventId, choice });
    },
    [send]
  );

  useEffect(() => {
    if (!matchId || !userId) return;

    let isMounted = true;

    function connect() {
      const url = `${WS_URL}/ws/${matchId}?user_id=${encodeURIComponent(userId)}&user_name=${encodeURIComponent(userName)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) {
          setIsConnected(true);
          console.log("[WS] Connected to match:", matchId);
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed: WSEvent = JSON.parse(event.data);
          if (isMounted) {
            setLastEvent(parsed);
            onEvent?.(parsed);

            // Call registered handlers
            const handlers = handlersRef.current.get(parsed.type) || [];
            handlers.forEach((h) => h(parsed.data));
          }
        } catch (err) {
          console.error("[WS] Failed to parse message:", err);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsConnected(false);
          console.log("[WS] Disconnected. Reconnecting in 3s...");
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error("[WS] Error:", err);
        ws.close();
      };
    }

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [matchId, userId, userName, onEvent]);

  return { isConnected, lastEvent, on, send, submitDecision };
}
