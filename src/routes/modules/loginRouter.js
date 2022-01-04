import loginController from '@/api/LoginController'
import Router from 'koa-router'

const router = new Router()
router.prefix('/login')
// 忘记密码
router.post('/forget', loginController.forget)
// 登录接口
router.post('/login', loginController.login)
// 注册接口
router.post('/reg', loginController.reg)
// 密码重置
router.post('/reset', loginController.reset)

// refreshToken
router.post('/refresh', loginController.refresh)

export default router
