import send from '../config/MailConfig'
import bcrypt from 'bcrypt'
import moment from 'dayjs'
import jsonwebtoken from 'jsonwebtoken'
import config from '../config'
import { checkCode } from '@/common/Utils'
import User from '@/model/User'
import SignRecord from '@/model/SingRecord'
import { getValue, setValue } from '@/config/RedisConfig'
import { v4 as uuidv4 } from 'uuid'

class LoginController {
  // 忘记密码发送邮件
  async forget (ctx) {
    const { body } = ctx.request
    const user = await User.findOne({ username: body.username })
    if (!user) {
      ctx.body = {
        code: 404,
        msg: '请检查账号'
      }
      return
    }
    try {
      const key = uuidv4()
      setValue(
        key,
        jsonwebtoken.sign({ _id: user._id }, config.JWT_SECRET, {
          expiresIn: '30m'
        }),
        30 * 60
      )
      // body.username -> database -> email
      const result = await send({
        type: 'reset',
        data: {
          key: key,
          username: body.username
        },
        expire: moment()
          .add(30, 'minutes')
          .format('YYYY-MM-DD HH:mm:ss'),
        email: body.username,
        user: user.name ? user.name : body.username
      })
      ctx.body = {
        code: 200,
        data: result,
        msg: '邮件发送成功'
      }
    } catch (e) {
      console.log(e)
    }
  }

  // 登录接口
  async login (ctx) {
    // 接收用户数据
    // 返回token
    const { body } = ctx.request
    const sid = body.sid
    const code = body.code
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code)
    if (result) {
      // 验证用户名密码是否正确
      let checkUserPasswrod = false
      const user = await User.findOne({ username: body.username })
      if (user === null) {
        ctx.body = {
          code: 404,
          msg: '用户名或者密码错误'
        }
        return
      }
      if (await bcrypt.compare(body.password, user.password)) {
        checkUserPasswrod = true
      }
      // mongDB查库
      if (checkUserPasswrod) {
        const userObj = user.toJSON()
        const arr = ['password', 'username']

        arr.map((item) => {
          return delete userObj[item]
        })
        // 通过验证，返回token数据
        const token = jsonwebtoken.sign({ _id: userObj._id }, config.JWT_SECRET, {
          expiresIn: '1d'
        })
        // 加入isSing 属性
        const signRecord = await SignRecord.findByUid(userObj._id)
        if (signRecord !== null) {
          if (moment(signRecord.created).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')) {
            userObj.isSign = true
          } else {
            userObj.isSign = false
          }
          userObj.lastSign = signRecord.created
        } else {
          // 用户无签到记录
          userObj.isSign = false
        }
        ctx.body = {
          code: 200,
          data: userObj,
          token: token
        }
      } else {
        // 用户名 密码验证失败，返回提示
        ctx.body = {
          code: 404,
          msg: '用户名密码错误'
        }
      }
    } else {
      // 图片验证码校验失败
      ctx.body = {
        code: 401,
        msg: '图形验证码不正确，请检查'
      }
    }
  }

  // 注册接口
  async reg (ctx) {
    // 接收客户端数据
    const { body } = ctx.request
    // 校验验证码的时效性、正确性
    const sid = body.sid
    const code = body.code
    const msg = {}
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code)
    let check = true
    if (result) {
      // 查库，看username是否被注册
      const user1 = await User.findOne({ username: body.username })
      if (user1 !== null && typeof user1.username !== 'undefined') {
        msg.username = ['此邮箱已注册，可以通过邮箱找回密码']
        check = false
      }
      // 查库，看 name 是否被注册
      const user2 = await User.findOne({ name: body.name })
      if (user2 !== null && typeof user2.name !== 'undefined') {
        msg.name = '此昵称已注册，请修改'
        check = false
      }
      // 写入数据到数据库
      if (check) {
        body.password = await bcrypt.hash(body.password, 5)
        const user = new User({
          username: body.username,
          name: body.name,
          password: body.password,
          created: moment().format('YYYY-MM-DD HH:mm:ss')
        })
        const result = await user.save()
        ctx.body = {
          code: 200,
          data: result,
          msg: '注册成功'
        }
        return
      }
    } else {
      // veevalidate 显示的错误
      msg.code = '验证码已失效，请重新获取！'
    }
    ctx.body = {
      code: 500,
      msg: msg
    }
  }

  // 重置密码接口
  async reset (ctx) {
    const { body } = ctx.request
    const sid = body.sid
    const code = body.code
    const msg = {}
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code)
    if (!body.key) {
      ctx.body = {
        code: 500,
        msg: '请求参数异常，请重新获取链接'
      }
      return
    }
    if (!result) {
      msg.code = '验证码已失效，请重新获取'
      ctx.body = {
        code: 500,
        msg: msg
      }
      return
    }
    const token = await getValue(body.key)
    if (token) {
      body.password = await bcrypt.hash(body.password, 5)
      await User.updateOne(
        { _id: ctx._id },
        {
          password: body.password
        }
      )
      ctx.body = {
        code: 200,
        msg: '更新用户密码成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '链接已经失效'
      }
    }
  }
}

export default new LoginController()
