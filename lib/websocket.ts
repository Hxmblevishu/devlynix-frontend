const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NODE_ENV === "production"
    ? "wss://devlynix-buildathon-2-0.onrender.com/ws/websocket"
    : "ws://localhost:8080/ws/websocket");

type MessageHandler = (payload: any) => void;

class LightweightStompClient {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, { destination: string; callback: MessageHandler }> = new Map();
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private userEmail: string | null = null;

  connect(userEmail?: string) {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (userEmail) {
      this.userEmail = userEmail;
    }

    try {
      this.ws = new WebSocket(WS_BASE_URL);

      this.ws.onopen = () => {
        // Send STOMP CONNECT frame
        const connectHeaders = [
          "accept-version:1.1,1.2",
          "heart-beat:10000,10000",
        ];
        if (this.userEmail) {
          connectHeaders.push(`userEmail:${this.userEmail}`);
        }
        const frame = `CONNECT\n${connectHeaders.join("\n")}\n\n\0`;
        this.ws?.send(frame);
      };

      this.ws.onmessage = (event) => {
        const text = typeof event.data === "string" ? event.data : "";
        if (text.startsWith("CONNECTED")) {
          this.isConnected = true;
          // Re-subscribe any active subscriptions
          this.subscriptions.forEach((sub, id) => {
            this.sendSubscribe(id, sub.destination);
          });
        } else if (text.startsWith("MESSAGE")) {
          this.handleIncomingMessage(text);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  subscribe(destination: string, callback: MessageHandler): () => void {
    const subId = `sub-${Math.random().toString(36).slice(2, 9)}`;
    this.subscriptions.set(subId, { destination, callback });

    if (this.isConnected) {
      this.sendSubscribe(subId, destination);
    }

    return () => {
      this.subscriptions.delete(subId);
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(`UNSUBSCRIBE\nid:${subId}\n\n\0`);
      }
    };
  }

  send(destination: string, payload: any) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      const body = JSON.stringify(payload);
      const frame = `SEND\ndestination:${destination}\ncontent-type:application/json\ncontent-length:${body.length}\n\n${body}\0`;
      this.ws.send(frame);
    }
  }

  private sendSubscribe(id: string, destination: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const frame = `SUBSCRIBE\nid:${id}\ndestination:${destination}\nack:auto\n\n\0`;
      this.ws.send(frame);
    }
  }

  private handleIncomingMessage(raw: string) {
    try {
      const headerBodySplit = raw.split("\n\n");
      if (headerBodySplit.length < 2) return;

      const headersRaw = headerBodySplit[0];
      const bodyRaw = headerBodySplit.slice(1).join("\n\n").replace(/\0$/, "");

      const destMatch = headersRaw.match(/destination:(.+)/i);
      const destination = destMatch ? destMatch[1].trim() : "";

      let parsed: any;
      try {
        parsed = JSON.parse(bodyRaw);
      } catch {
        parsed = bodyRaw;
      }

      this.subscriptions.forEach((sub) => {
        if (sub.destination === destination) {
          sub.callback(parsed);
        }
      });
    } catch {
      // Ignore malformed frames safely
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        if (this.isConnected) {
          this.ws.send("DISCONNECT\n\n\0");
        }
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const realtime = new LightweightStompClient();
