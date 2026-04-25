import type { OutboundMessage, InboundMessage, WsStatus } from '../../shared/types'
import {
  WS_HEARTBEAT_INTERVAL_MS,
  WS_RECONNECT_BASE_MS,
  WS_RECONNECT_MAX_MS,
  WS_QUEUE_MAX,
} from '../../shared/constants'

const WS_BASE = import.meta.env.VITE_WS_BASE as string

interface SocketOpts {
  interviewId: string
  jwt: string
  onMessage: (msg: InboundMessage) => void
  onStatus: (status: WsStatus) => void
}

export class InterviewSocket {
  private ws?: WebSocket
  private queue: OutboundMessage[] = []
  private heartbeatTimer?: ReturnType<typeof setInterval>
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private reconnectDelay = WS_RECONNECT_BASE_MS
  private wantOpen = false
  private opts: SocketOpts

  constructor(opts: SocketOpts) {
    this.opts = opts
  }

  open() {
    this.wantOpen = true
    this.reconnectDelay = WS_RECONNECT_BASE_MS
    this._connect()
  }

  send(msg: OutboundMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    } else {
      if (this.queue.length < WS_QUEUE_MAX) {
        this.queue.push(msg)
      }
    }
  }

  close() {
    this.wantOpen = false
    clearInterval(this.heartbeatTimer)
    clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }

  private _connect() {
    const { interviewId, jwt } = this.opts
    const url = `${WS_BASE}/ws/interviews/${interviewId}?token=${encodeURIComponent(jwt)}`

    this.opts.onStatus('CONNECTING')
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.reconnectDelay = WS_RECONNECT_BASE_MS
      this.opts.onStatus('OPEN')
      this._flushQueue()
      this._startHeartbeat()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as InboundMessage
        this.opts.onMessage(msg)
      } catch {
        // malformed frame — ignore
      }
    }

    ws.onerror = () => {
      this.opts.onStatus('ERROR')
    }

    ws.onclose = (event) => {
      clearInterval(this.heartbeatTimer)
      // 4001 / 4003 = auth error — don't reconnect
      if (event.code === 4001 || event.code === 4003) {
        this.wantOpen = false
        this.opts.onStatus('ERROR')
        return
      }
      this.opts.onStatus('CLOSED')
      if (this.wantOpen) {
        this._scheduleReconnect()
      }
    }
  }

  private _flushQueue() {
    while (this.queue.length > 0) {
      const msg = this.queue.shift()!
      this.ws?.send(JSON.stringify(msg))
    }
  }

  private _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, WS_HEARTBEAT_INTERVAL_MS)
  }

  private _scheduleReconnect() {
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      if (this.wantOpen) this._connect()
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, WS_RECONNECT_MAX_MS)
  }
}
