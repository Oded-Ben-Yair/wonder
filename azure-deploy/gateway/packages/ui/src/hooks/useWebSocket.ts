import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '@/types';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  messageHistory: WebSocketMessage[];
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = '/socket.io',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
    messageHistory: []
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);
  const listenersRef = useRef<Map<string, Function[]>>(new Map());

  const updateState = (updates: Partial<WebSocketState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const connect = () => {
    if (socketRef.current?.connected) return;

    updateState({ connecting: true, error: null });

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: false
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      reconnectCountRef.current = 0;
      updateState({ 
        connected: true, 
        connecting: false, 
        error: null 
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      updateState({ 
        connected: false, 
        connecting: false,
        error: reason === 'io client disconnect' ? null : reason
      });
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      updateState({ 
        connecting: false, 
        error: error.message 
      });

      // Auto-reconnect logic
      if (reconnectCountRef.current < reconnectAttempts) {
        setTimeout(() => {
          reconnectCountRef.current++;
          connect();
        }, reconnectDelay * Math.pow(2, reconnectCountRef.current));
      }
    });

    // Handle incoming messages
    socket.on('message', (data: WebSocketMessage) => {
      const message = {
        ...data,
        timestamp: new Date(data.timestamp)
      };

      setState(prev => ({
        ...prev,
        lastMessage: message,
        messageHistory: [...prev.messageHistory.slice(-99), message] // Keep last 100 messages
      }));

      // Trigger registered listeners
      const listeners = listenersRef.current.get(message.type) || [];
      listeners.forEach(listener => listener(message));
    });

    socketRef.current = socket;
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    updateState({
      connected: false,
      connecting: false,
      error: null
    });
  };

  const sendMessage = (message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (!socketRef.current?.connected) {
      console.warn('WebSocket not connected, message not sent:', message);
      return false;
    }

    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date()
    };

    socketRef.current.emit('message', fullMessage);
    return true;
  };

  const subscribe = (eventType: string, callback: (message: WebSocketMessage) => void) => {
    const currentListeners = listenersRef.current.get(eventType) || [];
    listenersRef.current.set(eventType, [...currentListeners, callback]);

    // Return unsubscribe function
    return () => {
      const listeners = listenersRef.current.get(eventType) || [];
      const updatedListeners = listeners.filter(listener => listener !== callback);
      if (updatedListeners.length === 0) {
        listenersRef.current.delete(eventType);
      } else {
        listenersRef.current.set(eventType, updatedListeners);
      }
    };
  };

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    isConnected: state.connected,
    isConnecting: state.connecting
  };
}

// Hook for specific message types
export function useWebSocketMessages(messageType: string) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const { subscribe, isConnected } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(messageType, (message) => {
      setMessages(prev => [...prev.slice(-49), message]); // Keep last 50 messages
    });

    return unsubscribe;
  }, [messageType, subscribe]);

  return {
    messages,
    isConnected,
    clearMessages: () => setMessages([])
  };
}

// Hook for real-time search updates
export function useRealTimeSearch() {
  const { sendMessage, subscribe, isConnected } = useWebSocket();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const unsubscribeResults = subscribe('search_result', (message) => {
      if (message.data?.results) {
        setSearchResults(message.data.results);
        setIsSearching(false);
      }
    });

    const unsubscribeError = subscribe('search_error', (message) => {
      console.error('Search error:', message.data);
      setIsSearching(false);
    });

    const unsubscribeStatus = subscribe('search_status', (message) => {
      setIsSearching(message.data?.status === 'searching');
    });

    return () => {
      unsubscribeResults();
      unsubscribeError();
      unsubscribeStatus();
    };
  }, [subscribe]);

  const startSearch = (query: any, sessionId: string = `session-${Date.now()}`) => {
    if (!isConnected) {
      console.warn('WebSocket not connected, cannot start search');
      return false;
    }

    setIsSearching(true);
    setSearchResults([]);

    return sendMessage({
      type: 'search_request',
      sessionId,
      data: { query }
    });
  };

  return {
    searchResults,
    isSearching,
    isConnected,
    startSearch
  };
}

export default useWebSocket;