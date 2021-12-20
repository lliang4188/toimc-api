import WebSocket from 'ws'
import { getJWTPayload } from '@/common/Utils'
import Comments from '@/model/Comments'

class WebSocketServe {
  // 初始化websocket服务
  constructor (config = {}) {
    const defaultConfig = {
      port: 3001,
      timeInterval: 5 * 1000,
      isAuth: true
    }
    // 最终配置
    const finalConfig = { ...defaultConfig, ...config }
    this.wss = {}
    this.interval = finalConfig.timeInterval
    this.isAuth = finalConfig.isAuth
    this.port = finalConfig.port
    this.options = config.options || {}
  }

  init () {
    this.wss = new WebSocket.Server({ port: this.port, ...this.options })

    // 链接信息
    this.wss.on('connection', (ws) => {
      ws.isAlive = true

      ws.on('message', (msg) => this.onMessage(ws, msg))

      ws.on('close', () => this.onClose(ws))
    })
    // 心跳检测
    this.heartbeat()
  }

  onMessage (ws, msg) {
    // 用户鉴权 -> tokem -> _id
    // 心跳检测
    // 消息发送
    const msgObj = JSON.parse(msg)
    const events = {
      auth: async () => {
        try {
          const obj = await getJWTPayload(msgObj.message)
          if (obj) {
            ws.isAuth = true
            ws._id = obj._id
            const num = await Comments.getTotal(obj._id)
            ws.send(JSON.stringify({
              event: 'message',
              message: num
            }))
          }
        } catch (error) {
          ws.send(JSON.stringify({
            event: 'noauth',
            message: 'please auth again'
          }))
        }
      },
      heartbeat: () => {
        if (msgObj.message === 'pong') {
          ws.isAlive = true
        }
      },
      message: () => {
        // 鉴权拦截
        // if (!ws.isAuth && this.isAuth) {
        //   return
        // }
        // 消息广播
        // this.wss.clients.forEach((client) => {
        //   if (client.readyState === WebSocket.OPEN && client._id === ws._id) {
        //     this.send(msg)
        //   }
        // })
      }
    }
    events[msgObj.event]()
  }

  // 点对点发送消息
  send (uid, msg) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client._id === uid) {
        client.send(msg)
      }
    })
  }

  // 广播消息 -> 推送系统消息
  boradcast (msg) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg)
      }
    })
  }

  onClose (ws) { }

  // 心跳检测
  heartbeat () {
    clearInterval(this.interval)
    this.interval = setInterval(() => {
      // console.log(this.timeInterval)
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive && ws.roomid) {
          return ws.terminate()
        }
        // 主动发送心跳检测请求
        // 当客户端返回了消息之后，主动设置flag为在线
        ws.isAlive = false
        ws.send(JSON.stringify({
          event: 'heartbeat',
          message: 'ping'
        }))
      })
    }, this.timeInterval)
  }
}

export default WebSocketServe
