import adminController from '@/api/AdminController'
import { getJWTPayload } from '@/common/Utils'
import config from '@/config/index'
import { getValue } from '@/config/RedisConfig'
export default async (ctx, next) => {
  const headers = ctx.header.authorization
  if (typeof headers !== 'undefined') {
    const obj = await getJWTPayload(ctx.header.authorization)
    if (obj._id) {
      ctx._id = obj._id
      const admins = JSON.parse(await getValue('admin'))
      if (admins.includes(obj._id)) {
        ctx.isAdmin = true
        await next()
        return
      } else {
        ctx.isAdmin = false
      }
    }
  }
  // 1. 过滤掉公共路径
  const { publicPath } = config
  if (publicPath.some((item) => item.test(ctx.url))) {
    await next()
    return
  }
  // 2. 根据用户的roles -> menus -> operations
  const operations = await adminController.getOperations(ctx)
  // console.log('TCl: -> operations', operations)
  // 3. 判断用户的请求路径是否在operation里面， 如果在放行，否则禁止访问
  if (operations.includes(ctx.url)) {
    await next()
  } else {
    ctx.throw(401)
  }

  await next()
}
