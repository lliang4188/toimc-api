import SignRecord from '@/model/SingRecord'
import { getJWTPayload } from '../common/Utils'
import User from '@/model/User'
import send from '@/config/MailConfig'
import moment from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { setValue, getValue } from '@/config/RedisConfig'
import config from '@/config/index'
import bcrypt from 'bcrypt'
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
      if (moment(recode.created).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')) {
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
        if (moment(recode.created).format('YYYY-MM-DD') === moment().subtract(1, 'days').format('YYYY-MM-DD')) {
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
      await User.updateOne({
        _id: obj._id
      }, {
        $set: { count: 1 },
        $inc: { favs: 5 }
      })
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
      setValue(key, jwt.sign({ _id: obj._id }, config.JWT_SECRET, {
        expiresIn: '30m'
      }))
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
      await User.updateOne({ _id: obj._id }, {
        username: body.username
      })
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
      console.log('TCl: -> UserController -> changePasswd -> result', result)
      ctx.body = {
        code: 200,
        msg: '更新密码成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '更新密码失败，请检查！'
      }
    }
  }
}

export default new UserController()
