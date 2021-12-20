import Router from 'koa-router'
import userController from '@/api/UserController'
import contentController from '@/api/ContentController'
import errorController from '@/api/ErrorController'

const router = new Router()

router.prefix('/user')

// 用户签到
router.get('/fav', userController.userSign)

// 更新用户基本信息
router.post('/basic', userController.updateUserInfo)

// 修改密码接口
router.post('/change-password', userController.changePasswd)

// 取消、设置收藏
router.get('/set-collect', userController.setCollect)

// 获取用户收藏列表
router.get('/collect', userController.getCollectByUid)

// 获取用户发帖记录
router.get('/post', contentController.getPostByUid)

// 删除发帖记录
router.get('/delete-post', contentController.deletePostByUid)

// 获取历史消息
router.get('/getmsg', userController.getMsg)

// 设置历史消息
router.get('/setmsg', userController.setMsg)

// 保存错误日志
router.post('/add-error', errorController.addError)

export default router
