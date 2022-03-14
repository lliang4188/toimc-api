import adminController from '@/api/AdminController'
import contentController from '@/api/ContentController'
import errorController from '@/api/ErrorController'
import userController from '@/api/UserController'
import Router from 'koa-router'

const router = new Router()

router.prefix('/admin')

// 标签页面
// 获取标签列表
router.get('/getTags', contentController.getTags)

// 添加标签
router.post('/addTag', contentController.addTag)

// 删除标签
router.get('/removeTag', contentController.removeTag)

// 编辑标签
router.post('/editTag', contentController.updateTag)

// 用户管理
// 查询所有用户
router.get('/users', userController.getUsers)

// 删除用户
router.post('/delete-user', userController.deleteUserById)

// 更新特定用户信息
router.post('/update-user', userController.updateUserById)
// 批量设置用户属性
router.post('/update-user-settings', userController.updateUserBatch)

// 添加用户
router.post('/add-user', userController.addUser)

// 校验用户名是否冲突
router.get('/checkname', userController.checkUsername)

// 校验昵称是否冲突
router.get('/check-nickname', userController.checkNickname)

// 添加菜单
router.post('/add-menu', adminController.addMenu)

// 获取菜单
router.get('/get-menu', adminController.getMenu)

// 更新菜单
router.post('/update-menu', adminController.updateMenu)

// 删除菜单
router.post('/delete-menu', adminController.deleteMenu)

// 添加角色
router.post('/add-role', adminController.addRole)

// 获取角色
router.get('/get-role', adminController.getRole)

// 更新角色
router.post('/update-role', adminController.updateRole)

// 删除角色
router.post('/delete-role', adminController.deleteRole)

// 获取角色列表
router.get('/get-roles-names', adminController.getRoleNames)

// 获取用户 -> 角色 -> 动态菜单信息
router.get('/get-routes', adminController.getRoutes)

// 获取统计数据
router.get('/getstat', adminController.getStats)

// 获取错误日志
router.get('/get-error', errorController.getErrorList)
// 删除错误日志
router.post('/delete-error', errorController.deleteError)

// router.get('/get-operations', adminController.getOperations)
// 获取评论信息
router.get('/getComments', adminController.getCommentsAll)

// 更新评论
router.post('/updateCommentsId', adminController.updateComment)
// 批量更新评论
router.post('/updateComments', adminController.upadteCommentsBatch)

// 删除评论信息
router.post('/deleteComments', adminController.deleteCommentsBatch)

export default router
