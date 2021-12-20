import Koa from 'koa'
import JWT from 'koa-jwt'
import path from 'path'
import helmet from 'koa-helmet'
import statics from 'koa-static'
import router from './routes/routes'
import koaBody from 'koa-body'
import jsonutil from 'koa-json'
import cors from '@koa/cors'
import compose from 'koa-compose'
import compress from 'koa-compress'
import config from './config/index'
import errorHandle from './common/ErrorHandle'
import WebSocketServe from './config/WebSocket'
import auth from '@/common/Auth'
import { run } from './common/Init'
import logo4js from './config/Log4j'
import logger1 from '@/common/Logger'
const app = new Koa()

const ws = new WebSocketServe()

ws.init()
global.ws = ws

// 定义公共的路径，不需要jwt鉴权
const jwt = JWT({ secret: config.JWT_SECRET }).unless({ path: [/^\/public/, /^\/login/] })
/**
 * 使用koa-compose 集成中间件
 */
const middleware = compose([
  logger1,
  koaBody({
    multipart: true,
    formidable: {
      keepExtensions: true,
      maxFieldsSize: 5 * 1024 * 1024
    },
    onError: (err) => {
      console.log('koabody TCl: -> err', err)
    }
  }),
  statics(path.join(__dirname, '../public')),
  cors(),
  jsonutil({ pretty: false, param: 'pretty' }),
  helmet(),
  jwt,
  auth,
  errorHandle,
  config.isDevMode ? logo4js.koaLogger(logo4js.getLogger('http'), { level: 'auto' }) : logo4js.koaLogger(logo4js.getLogger('access'), { level: 'auto' })
])

if (!config.isDevMode) {
  app.use(compress())
}

app.use(middleware)
app.use(router())

app.listen(3000, () => {
  console.log('app is runing at ' + 3000)
  run()
})
