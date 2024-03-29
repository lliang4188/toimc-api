import { getMenuData, getRights } from '@/common/Utils'
import Comments from '@/model/Comments'
import Menu from '@/model/Menus'
import Post from '@/model/Post'
import Roles from '@/model/Roles'
import SignRecord from '@/model/SingRecord'
import User from '@/model/User'
import moment from 'dayjs'
import qs from 'qs'
const weekday = require('dayjs/plugin/weekday')
moment.extend(weekday)
class AdminController {
  async getMenu (ctx) {
    const result = await Menu.find({})
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async addMenu (ctx) {
    const { body } = ctx.request
    const menu = new Menu(body)
    const result = await menu.save()
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async updateMenu (ctx) {
    const { body } = ctx.request
    const data = { ...body }
    delete data._id
    const result = await Menu.updateOne({ _id: body._id }, { ...data })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async deleteMenu (ctx) {
    const { body } = ctx.request
    const result = await Menu.deleteOne({ _id: body._id })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async addRole (ctx) {
    const { body } = ctx.request
    const roles = new Roles(body)
    const result = await roles.save()
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async getRole (ctx) {
    const result = await Roles.find({})
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async updateRole (ctx) {
    const { body } = ctx.request
    const data = { ...body }
    delete data._id
    const result = await Roles.updateOne({ _id: body._id }, { ...data })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async deleteRole (ctx) {
    const { body } = ctx.request
    const result = await Roles.deleteOne({ _id: body._id })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async getRoleNames (ctx) {
    const result = await Roles.find({}, { menu: 0, desc: 0 })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 获取用户的菜单权限，菜单数据
  async getRoutes (ctx) {
    const user = await User.findOne({ _id: ctx._id }, { roles: 1 })
    const { roles } = user
    // obj -> _id -> roles
    // 通过角色 -> menus -> 可以访问的菜单数据
    // 用户角色可能有多个
    // 角色 menus -> 去重
    let menus = []
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i]
      const rights = await Roles.findOne({ role }, { menu: 1 })
      menus = menus.concat(rights.menu)
    }
    menus = Array.from(new Set(menus))
    // 3. menus -> 可以访问的菜单数据
    const treeData = await Menu.find({})
    // 递归查询 type = 'menu' && _id 包含在menus中
    // 结构进行改造
    const routes = getMenuData(treeData, menus, ctx.isAdmin)

    ctx.body = {
      code: 200,
      data: routes
    }
  }

  // 评论信息获取
  async getCommentsAll (ctx) {
    const params = qs.parse(ctx.query)
    let options = {}
    if (params.options) {
      options = params.options
    }
    const page = params.page ? parseInt(params.page) : 0
    const limit = params.limit ? parseInt(params.limit) : 20

    // 使用MongoDB中的视图，效率提升1倍
    // const test = await CommentsUsers.find({ 'uid.name': { $regex: 'admin1', $options: 'i' } })
    const result = await Comments.getCommentsOptions(options, page, limit)
    let total = await Comments.getCommentsOptionsCount(options)
    if (typeof total === 'object') {
      if (total.length > 0) {
        total = total[0].count
      } else {
        total = 0
      }
    }
    ctx.body = {
      code: 200,
      data: result,
      total
    }
  }

  async updateComment (ctx) {
    const { body } = ctx.request
    const data = { ...body }
    delete data._id
    const result = await Comments.updateOne({ _id: body._id }, { ...data })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async upadteCommentsBatch (ctx) {
    const { body } = ctx.request
    const result = await Comments.updateMany(
      { _id: { $in: body.ids } },
      { $set: { ...body.settings } }
    )
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async deleteCommentsBatch (ctx) {
    const { body } = ctx.request
    const result = await Comments.deleteMany({ _id: { $in: body.ids } })
    ctx.body = {
      code: 200,
      data: result,
      msg: '删除成功'
    }
  }

  async getOperations (ctx) {
    const user = await User.findOne({ _id: ctx._id }, { roles: 1 })
    const { roles } = user
    let menus = []
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i]
      const rights = await Roles.findOne({ role }, { menu: 1 })
      menus = menus.concat(rights.menu)
    }
    menus = Array.from(new Set(menus))
    // 3. menus -> 可以访问的菜单数据
    const treeData = await Menu.find({})
    const operations = getRights(treeData, menus)
    return operations
  }

  async getStats (ctx) {
    let result = {}
    const nowZero = new Date().setHours(0, 0, 0, 0)
    // 1.顶部的card
    const inforCardData = []
    const time = moment().format('YYYY-MM-DD 00:00:00')
    const userNewCount = await User.find({ created: { $gte: time } }).countDocuments()
    const postsCount = await Post.find({}).countDocuments()
    const commentNewCount = await Comments.find({ created: { $gte: time } }).countDocuments()
    const starttime = moment(nowZero).weekday(1)
    const endtime = moment(nowZero).weekday(8)
    const weekEndCount = await Comments.find({ created: { $gte: starttime, $lte: endtime }, isBest: '1' }).countDocuments()
    const signWeekCount = await SignRecord.find({ created: { $gte: starttime, $lte: endtime } }).countDocuments()
    const postWeekCount = await Post.find({ created: { $gte: starttime, $lte: endtime } }).countDocuments()

    inforCardData.push(userNewCount)
    inforCardData.push(postsCount)
    inforCardData.push(commentNewCount)
    inforCardData.push(weekEndCount)
    inforCardData.push(signWeekCount)
    inforCardData.push(postWeekCount)
    // 2。左侧饼图数据
    const postsCatalogCount = await Post.aggregate([
      { $group: { _id: '$catalog', count: { $sum: 1 } } }
    ])
    const pieData = {}
    postsCatalogCount.forEach((item) => {
      pieData[item._id] = item.count
    })
    // 3. 本周右侧统计数据
    // 3-1.计算6个月前的时间： 1号 00:00:00
    // 3-2，查询数据库中对应时间内大数据 $get
    // 3-3. group组合 -> sum -> sort排序
    const startMonth = moment(nowZero).subtract(5, 'M').date(1).format()
    const endMonth = moment(nowZero).add(1, 'M').date(1).format()
    let monthData = await Post.aggregate([
      { $match: { created: { $gte: new Date(startMonth), $lt: new Date(endMonth) } } },
      { $project: { created: { $dateToString: { format: '%Y-%m', date: '$created' } } } },
      { $group: { _id: '$created', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    monthData = monthData.reduce((obj, item) => {
      return {
        ...obj,
        [item._id]: item.count
      }
    }, {})
    // 4. 底部的数据
    const _aggregate = async (model) => {
      let result = await model.aggregate([
        { $match: { created: { $gte: new Date(startMonth) } } },
        { $project: { created: { $dateToString: { format: '%Y-%m-%d', date: '$created' } } } },
        { $group: { _id: '$created', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
      result = result.reduce((obj, item) => {
        return {
          ...obj,
          [item._id]: item.count
        }
      }, {})
      return result
    }
    const userWeekData = await _aggregate(User)
    const signWeekData = await _aggregate(SignRecord)
    const postWeekData = await _aggregate(Post)
    const commentWeekData = await _aggregate(Comments)
    const dataArr = []
    for (let i = 0; i <= 6; i++) {
      dataArr.push(moment().subtract(6 - i, 'day').format('YYYY-MM-DD'))
    }
    const addData = (obj) => {
      const arr = []
      dataArr.forEach((item) => {
        if (obj[item]) {
          arr.push(obj[item])
        } else {
          arr.push(0)
        }
      })
      return arr
    }
    const weekData = {
      user: addData(userWeekData),
      sign: addData(signWeekData),
      post: addData(postWeekData),
      comments: addData(commentWeekData)
    }
    result = {
      inforCardData,
      pieData,
      monthData,
      weekData
    }
    ctx.body = {
      code: 200,
      data: result
    }
  }
}

export default new AdminController()
