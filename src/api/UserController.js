import config from '@/config/index'
import send from '@/config/MailConfig'
import { getValue, setValue } from '@/config/RedisConfig'
import Comments from '@/model/Comments'
import SignRecord from '@/model/SingRecord'
import User from '@/model/User'
import UserCollect from '@/model/UserCollect'
import bcrypt from 'bcrypt'
import moment from 'dayjs'
import jwt from 'jsonwebtoken'
import qs from 'qs'
import { v4 as uuidv4 } from 'uuid'
import { getJWTPayload } from '../common/Utils'
// import CommentsHands from '../model/CommentsHands'
class UserController {
  // 用户签到接口
  async userSign (ctx) {
    // 取用户的ID
    const obj = await getJWTPayload(ctx.header.authorization)
    // 查询上一次签到记录
    const recode = await SignRecord.findByUid(obj._id)
    const user = await User.findById(obj._id)
    let newRecord = {}
    let result = ''
    // 判断签到逻辑
    if (recode !== null) {
      // 有历史签到数据
      //  如果当前时间的日期 与 上一次签到的日期相同，说明用户已经签到
      if (
        moment(recode.created).format('YYYY-MM-DD') ===
        moment().format('YYYY-MM-DD')
      ) {
        ctx.body = {
          code: 500,
          favs: user.favs,
          count: user.count,
          lastSign: recode.created,
          msg: '用户已经签到'
        }
        return
      } else {
        // 判断上一次签到记录的created时间, 并且不与今天相同，进行连续签到判断
        // 如果相同，代表用户是在连续签到
        let count = user.count
        let fav = 0
        // 判断用户签到时间：上一次签到的时间等于，当前时间的前一天，说明用户在连续签到
        if (
          moment(recode.created).format('YYYY-MM-DD') ===
          moment().subtract(1, 'days').format('YYYY-MM-DD')
        ) {
          // 连续签到的积分逻辑
          count += 1
          if (count < 5) {
            fav = 5
          } else if (count >= 5 && count < 15) {
            fav = 10
          } else if (count >= 15 && count < 30) {
            fav = 15
          } else if (count >= 30 && count < 100) {
            fav = 20
          } else if (count >= 100 && count < 365) {
            fav = 30
          } else if (count >= 365) {
            fav = 50
          }
          await User.updateOne(
            { _id: obj._id },
            {
              // user.favs += fav
              $inc: { favs: fav, count: 1 }
            }
          )
          result = {
            favs: user.favs + fav,
            count: user.count + 1
          }
        } else {
          // 用户中断了签到
          fav = 5
          await User.updateOne(
            { _id: obj._id },
            {
              $set: { count: 1 },
              $inc: { favs: fav }
            }
          )
          result = {
            favs: user.favs + fav,
            count: 1
          }
        }
        // 更新签到记录
        newRecord = new SignRecord({
          uid: obj._id,
          favs: fav
        })
        await newRecord.save()
      }
    } else {
      // 无签到数据 => 第一次签到
      // 保存用户的签到数据，签到计数 + 积分数据
      await User.updateOne(
        {
          _id: obj._id
        },
        {
          $set: { count: 1 },
          $inc: { favs: 5 }
        }
      )
      // 保存用户的签到记录
      newRecord = new SignRecord({
        uid: obj._id,
        favs: 5
      })
      await newRecord.save()
      result = {
        favs: user.favs + 5,
        count: 1
      }
    }
    ctx.body = {
      code: 200,
      msg: '请求成功',
      ...result,
      lastSign: newRecord.created
    }
  }

  // 更新用户基本信息接口
  async updateUserInfo (ctx) {
    const { body } = ctx.request
    const obj = await getJWTPayload(ctx.header.authorization)
    const user = await User.findOne({ _id: obj._id })
    let msg = ''
    // 判断用户是否修改了邮箱
    if (body.username && body.username !== user.username) {
      // 用户修改了邮箱
      // 发送reset邮件
      // 判断用户的新邮箱是否已经有人注册
      const tmpUser = await User.findOne({ username: body.username })
      if (tmpUser && tmpUser.password) {
        ctx.body = {
          code: 501,
          msg: '邮箱已经注册'
        }
        return
      }
      const key = uuidv4()
      setValue(
        key,
        jwt.sign({ _id: obj._id }, config.JWT_SECRET, {
          expiresIn: '30m'
        })
      )
      await send({
        token: '',
        type: 'email',
        data: {
          key: key,
          username: body.username
        },
        code: '',
        expire: moment().add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
        email: user.username,
        user: user.name
      })
      msg = '账号修改需要邮件确认，请查收邮件！'
    }

    const arr = ['username', 'mobile', 'password']
    arr.map((item) => delete body[item])
    const result = await User.updateOne({ _id: obj._id }, body)
    if (result.n === 1 && result.ok === 1) {
      ctx.body = {
        code: 200,
        msg: msg === '' ? '更新成功' : msg
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '更新失败'
      }
    }
  }

  // 更新用户名
  async updateUsername (ctx) {
    const body = ctx.query
    if (body.key) {
      const token = await getValue(body.key)
      const obj = getJWTPayload('Bearer ' + token)
      await User.updateOne(
        { _id: obj._id },
        {
          username: body.username
        }
      )
      ctx.body = {
        code: 200,
        msg: '更新用户名成功'
      }
    }
  }

  // 更改密码接口
  async changePasswd (ctx) {
    const { body } = ctx.request
    const obj = await getJWTPayload(ctx.header.authorization)
    const user = await User.findOne({ _id: obj._id })
    if (await bcrypt.compare(body.oldpwd, user.password)) {
      const newpasswd = await bcrypt.hash(body.newpwd, 5)
      const result = await User.updateOne(
        { _id: obj._id },
        { $set: { password: newpasswd } }
      )
      ctx.body = {
        code: 200,
        data: result,
        msg: '更新密码成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '更新密码失败，请检查！'
      }
    }
  }

  // 设置收藏
  async setCollect (ctx) {
    const params = ctx.query
    const obj = await getJWTPayload(ctx.header.authorization)
    if (parseInt(params.isFav)) {
      // 说明用户已经收藏了帖子
      await UserCollect.deleteOne({ uid: obj._id, tid: params.tid })
      ctx.body = {
        code: 200,
        msg: '取消收藏成功'
      }
    } else {
      const newCollect = new UserCollect({
        uid: obj._id,
        tid: params.tid,
        title: params.title
      })
      const result = await newCollect.save()
      if (result.uid) {
        ctx.body = {
          code: 200,
          data: result,
          msg: '收藏成功'
        }
      }
    }
  }

  // 获取收藏列表
  async getCollectByUid (ctx) {
    const params = ctx.query
    const obj = await getJWTPayload(ctx.header.authorization)
    const result = await UserCollect.getListByUid(
      obj._id,
      params.page,
      params.limit ? parseInt(params.limit) : 10
    )
    const total = await UserCollect.countByUid(obj._id)
    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        total,
        msg: '查询列表成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '查询列表失败'
      }
    }
  }

  // 获取用户基本信息
  async getBasicInfo (ctx) {
    const params = ctx.query
    const uid = params.uid || ctx._id
    let user = await User.findByID(uid)
    // 取得用户的签到记录，有没有 > today 00:00:00
    if (user) {
      user = user.toJSON()
      const date = moment().format('YYYY-MM-DD')
      const result = await SignRecord.findOne({ uid: uid, created: { $gte: (date + ' 00:00:00') } })
      if (result && result.uid) {
        user.isSign = true
      } else {
        user.isSign = false
      }
    }

    ctx.body = {
      code: 200,
      data: user,
      msg: '查询用户成功'
    }
  }

  // 获取历史消息
  // 记录评论之后，给作者发送消息
  async getMsg (ctx) {
    const params = ctx.query
    const page = params.page ? params.page : 0
    const limit = params.limit ? parseInt(params.limit) : 10
    // 方法1: 嵌套查询 -> aggregate
    // 方法2: 通过冗余换时间
    const obj = await getJWTPayload(ctx.header.authorization)
    const num = await Comments.getTotal(obj._id)
    const result = await Comments.getMsgList(obj._id, page, limit)
    ctx.body = {
      code: 200,
      data: result,
      total: num
    }
  }

  // 设置已读消息
  async setMsg (ctx) {
    const params = ctx.query
    if (params.id) {
      const result = await Comments.updateOne({ _id: params.id }, { isRead: '1' })
      if (result.ok === 1) {
        ctx.body = {
          code: 200
        }
      }
    } else {
      const obj = await getJWTPayload(ctx.header.authorization)
      const result = await Comments.updateMany({ uid: obj._id }, { isRead: '1' })
      if (result.ok === 1) {
        ctx.body = {
          code: 200
        }
      }
    }
  }

  // 获取用户列表
  async getUsers (ctx) {
    let params = ctx.query
    params = qs.parse(params)
    const page = params.page ? params.page : 0
    const limit = params.limit ? parseInt(params.limit) : 10
    const sort = params.sort || 'created'
    const option = params.options || {}
    const result = await User.getList(option, sort, page, limit)
    const total = await User.countList({})
    ctx.body = {
      code: 200,
      data: result,
      total: total
    }
  }

  // 管理员删除用户
  async deleteUserById (ctx) {
    const { body } = ctx.request
    // const user = await User.findOne({ _id: params.id })
    // if (user) {
    const result = await User.deleteMany({ _id: { $in: body.ids } })
    ctx.body = {
      code: 200,
      msg: '删除成功',
      data: result
    }
    // } else {
    //   ctx.body = {
    //     code: 500,
    //     msg: '用户不存在或者id信息错误！'
    //   }
    // }
  }

  // 管理员更新特定用户信息
  async updateUserById (ctx) {
    const { body } = ctx.request
    const user = await User.findOne({ _id: body._id })
    // 1.校验用户是否存在 -> 用户名是否冲突
    if (!user) {
      ctx.body = {
        code: 500,
        msg: '用户不存在或者id信息错误！'
      }
      return
    }
    // if (body.username !== user.username) {
    //   const userCheckName = await User.findOne({ username: body.username })
    //   if (userCheckName) {
    //     ctx.body = {
    //       code: 501,
    //       msg: '用户名已经存在， 更新失败！'
    //     }
    //     return
    //   }
    // }
    // 2.判断密码是否传递 -> 进行加密保存
    if (body.password) {
      body.password = await bcrypt.hash(body.password, 5)
    }
    const result = await User.updateOne({ _id: body._id }, body)
    if (result.ok === 1 && result.nModified === 1) {
      ctx.body = {
        code: 200,
        msg: '更新成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '服务异常，更新失败'
      }
    }
  }

  // 批量设置用户属性
  // 方法一：新增一个接口， 方法二： options -> action 'one' ro 'many'
  async updateUserBatch (ctx) {
    const { body } = ctx.request
    const result = await User.updateMany({ _id: { $in: body.ids } }, { $set: { ...body.settings } })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  async checkUsername (ctx) {
    const params = ctx.query
    const user = await User.findOne({ username: params.username })
    // 默认是 1 -> 校验通过，0 -> 校验失败
    let result = 1
    if (user && user.username) {
      result = 0
    }
    ctx.body = {
      code: 200,
      data: result,
      msg: '用户名已经存在， 更新失败！'
    }
  }

  async checkNickname (ctx) {
    const params = ctx.query
    const user = await User.findOne({ name: params.name })
    // 默认是 1 -> 校验通过，0 -> 校验失败
    let result = 1
    if (user && user.name) {
      result = 0
    }
    ctx.body = {
      code: 200,
      data: result,
      msg: '昵称已经存在， 更新失败！'
    }
  }

  async addUser (ctx) {
    const { body } = ctx.request
    body.password = await bcrypt.hash(body.password, 5)
    const user = new User(body)
    const result = await user.save()
    const userObj = result.toJSON()
    const arr = ['password']
    arr.map(item => {
      return delete userObj[item]
    })
    if (result) {
      ctx.body = {
        code: 200,
        data: userObj,
        msg: '添加用户成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '服务异常'
      }
    }
  }
}

export default new UserController()
