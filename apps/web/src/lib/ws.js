'use client';
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Hook useSocket(namespace, path, handler):
 * conecta socket.io al namespace indicado (p. ej. 'counters' en
 * '/socket.io/music') y llama a `handler(payload)` por cada evento
 * que llegue a ese namespace.
 *
 * `handler` se guarda en un ref para reconectar con la última versión.
 */
export function useSocket(namespace, path, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = io(namespace, {
      path,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.onAny((event, payload) => {
      if (typeof handlerRef.current === 'function') {
        handlerRef.current(payload, event);
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [namespace, path]);
}
