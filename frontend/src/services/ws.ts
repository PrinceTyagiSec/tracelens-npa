import { PacketSummary } from '../types';

export type WsEvent = 
  | { type: 'packet'; data: PacketSummary }
  | { type: 'statistics_update'; data: { total_packets: number; total_bytes: number; packet_rate: number; byte_rate: number; duration: number } }
  | { type: 'capture_started'; capture_id: string; interface: string }
  | { type: 'capture_stopped'; capture_id: string; total_packets: number; total_bytes: number }
  | { type: 'capture_error'; message: string };

export class WsClient {
  private socket: WebSocket | null = null;
  private listeners: ((event: WsEvent) => void)[] = [];
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/capture`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
      };

      this.socket.onmessage = (e) => {
        try {
          const event: WsEvent = JSON.parse(e.data);
          this.listeners.forEach((fn) => fn(event));
        } catch (err) {
          // Ignore non-json
        }
      };

      this.socket.onclose = () => {
        this.socket = null;
        this.isConnecting = false;
        // Reconnect after 3s
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = () => {
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch (e) {
      this.isConnecting = false;
    }
  }

  subscribe(listener: (event: WsEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsClient = new WsClient();
