// @ts-nocheck
import type { RealtimeClientOptions } from '@supabase/realtime-js'
import { SOCKET_STATES } from '@supabase/realtime-js/dist/module/lib/constants'

export const WxRealtimeTransport: NonNullable<RealtimeClientOptions['transport']> = function (
  address: string | URL,
  _ignored: any,
  options?: { headers?: any }
) {
  const addressString = address.toString()
  return new (class {
    binaryType: string = 'arraybuffer'
    private socket: WechatMiniprogram.SocketTask
    readyState = SOCKET_STATES.connecting
    url: string | URL | null = null

    onclose: ((event?: any) => void) | null = null
    onmessage: ((event?: any) => void) | null = null
    onerror: ((event?: any) => void) | null = null
    onopen: (() => void) | null = null

    constructor(address: string) {
      this.url = address
      this.socket = wx.connectSocket({
        url: address,
        header: {
          ...options?.headers,
          'Sec-WebSocket-Protocol': 'websocket',
        },
        tcpNoDelay: true,
        fail: (error) => {
          console.error('[WS] Connection failed:', error)
          this.onerror?.(error)
        },
        success: () => {
          console.log('[WS] Connection established successfully')
        },
      })

      this.socket.onOpen(() => {
        this.readyState = SOCKET_STATES.open
        this.onopen?.()
      })

      this.socket.onMessage((res) => {
        if (this.readyState === SOCKET_STATES.open && this.onmessage) {
          this.onmessage({
            data: res.data,
          })
        }
      })

      this.socket.onError((err) => {
        console.error('[WS] Error:', err)
        this.readyState = SOCKET_STATES.closed
        if (this.onerror) {
          this.onerror(err)
        }
      })

      this.socket.onClose((res) => {
        this.readyState = SOCKET_STATES.closed
        if (this.onclose) {
          this.onclose({
            code: res.code,
            reason: res.reason,
          })
        }
      })
    }

    setupConnection(): void {
      this.binaryType = 'arraybuffer'
    }

    send(data: string | ArrayBuffer) {
      if (this.readyState === SOCKET_STATES.open) {
        this.socket.send({
          data,
          fail: (error) => {
            console.error('[WS] Send failed:', error)
            this.onerror?.(error)
          },
        })
      }
    }

    close(code?: number, reason?: string) {
      console.log('[WS] Closing socket', code, reason)
      this.readyState = SOCKET_STATES.closing
      this.socket.close({
        code,
        reason,
        success: () => {
          console.log('[WS] Closed successfully')
          this.readyState = SOCKET_STATES.closed
        },
        fail: (error) => {
          console.error('[WS] Close failed:', error)
          this.readyState = SOCKET_STATES.closed
        },
      })
    }
  })(addressString)
} as unknown as {
  new (address: string | URL, _ignored: any, options?: { headers?: any }): WebSocket
}
