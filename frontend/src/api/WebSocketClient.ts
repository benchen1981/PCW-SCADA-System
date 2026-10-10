import { API_CONFIG } from './config';

export interface WsMessage {
  type: 'SENSOR_UPDATE' | 'ALARM_UPDATE' | 'PREDICTION_UPDATE' | 'SYSTEM_UPDATE';
  payload: any;
}

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private url = API_CONFIG.WS_URL;

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    console.log(`[WS] Connecting to ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WS] Connected successfully.');
      if (this.reconnectTimer) clearInterval(this.reconnectTimer);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        const typeHandlers = this.handlers.get(msg.type);
        if (typeHandlers) {
          typeHandlers.forEach(handler => handler(msg.payload));
        }
      } catch (err) {
        console.error('[WS] Failed to parse message', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected. Reconnecting in 5s...');
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error', err);
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 5000);
    }
  }

  public subscribe(type: WsMessage['type'], handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  public unsubscribe(type: WsMessage['type'], handler: MessageHandler) {
    if (this.handlers.has(type)) {
      this.handlers.get(type)!.delete(handler);
    }
  }
}

export const wsClient = new WebSocketClient();
