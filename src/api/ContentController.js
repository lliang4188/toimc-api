import Post from '../model/Post'
import PostTags from '../model/PostTags'
import Links from '../model/Links'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import moment from 'dayjs'
import config from '@/config/index'

// method1
import mkdir from 'make-dir'
// import { dirExists } from '@/common/Utils'
import { checkCode, getJWTPayload } from '@/common/Utils'
import User from '@/model/User'
import UserCollect from '@/model/UserCollect'

class ContentController {
  async getPostList (ctx) {
    const body = ctx.query

    // 测试数据
    // const post = new Post(
    //   {
    //     title: 'test title 2',
    //     content: 'test conent 2',
    //     catalog: 'advise',
    //     fav: 20,
    //     isEnd: '0',
    //     reads: 0,
    //     answer: 0,
    //     status: '0',
    //     isTop: '0',
    //     sort: '0',
    //     tags: []
    //   }
    // )
    // const tmp = await post.save()
    // console.log('TCl: -> ContentController -> getPostList -> tmp', tmp)
    const sort = body.sort ? body.sort : 'created'
    const page = body.page ? parseInt(body.page) : 0
    const limit = body.limit ? parseInt(body.limit) : 20
    const options = body.options || {}

    if (typeof body.catalog !== 'undefined' && body.catalog !== '') {
      options.catalog = body.catalog
    }
    if (typeof body.isTop !== 'undefined') {
      options.isTop = body.isTop
    }
    if (typeof body.status !== 'undefined' && body.status !== '') {
      options.status = body.status
    }
    if (typeof body.isEnd !== 'undefined') {
      options.isEnd = body.isEnd
    }
    if (typeof body.tag !== 'undefined' && body.tag !== '') {
      options.tags = { $elemMatch: { name: body.tag } }
    }

    const result = await Post.getList(options, sort, page, limit)
    const total = await Post.countList(options)
    ctx.body = {
      code: 200,
      data: result,
      msg: '获取文章列表成功',
      total: total
    }
  }

  // 查询友链
  async getLinks (ctx) {
    const result = await Links.find({ type: 'links' })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 查询温馨提醒
  async getTips (ctx) {
    const result = await Links.find({ type: 'tips' })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 本周热议
  async getTopWeek (ctx) {
    const result = await Post.getTopWeek()
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 上传图片
  async uploadImg (ctx) {
    const file = ctx.request.files.file
    // 图片名称、图片格式、存储位置，返回前台可以读取的路径
    const ext = file.name.split('.').pop()
    const dir = `${config.uploadPath}/${moment().format('YYYYMMDD')}`
    // 判断路径是否存在，不存在则创建
    await mkdir(dir)
    // 存储文件到指定的路径
    // 给文件一个唯一的名称
    const picname = uuidv4()
    const destPath = `${dir}/${picname}.${ext}`
    const reader = fs.createReadStream(file.path, {
      highWaterMark: 1 * 1024
    })
    const upStream = fs.createWriteStream(destPath)
    const filePath = `/${moment().format('YYYYMMDD')}/${picname}.${ext}`
    // method1
    reader.pipe(upStream)

    const stat = fs.statSync(file.path)
    console.log('TCl: -> ContentController -> uploadImg -> stat', stat.size)
    // method2
    // let totalLength = 0
    // reader.on('data', (chunk) => {
    //   totalLength += chunk.length
    //   console.log('TCl: -> ContentController -> uploadImg -> totalLength', totalLength)
    //   if (upStream.write(chunk) === false) {
    //     reader.pause()
    //   }
    // })

    // reader.on('drain', () => {
    //   reader.resume()
    // })

    // reader.on('end', () => {
    //   upStream.end()
    // })

    ctx.body = {
      code: 200,
      msg: '图片上传成功',
      data: filePath
    }
  }

  // 发表新帖
  async addPost (ctx) {
    const { body } = ctx.request
    const sid = body.sid
    const code = body.code
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code)
    if (result) {
      const obj = await getJWTPayload(ctx.header.authorization)
      // 判断用户积分数是否 > fav, 否则提示用户积分不足
      // 用户积分足够的时候， 新建Post, 减除用户对应的积分
      const user = await User.findByID({ _id: obj._id })

      if (user.favs < body.fav) {
        ctx.body = {
          code: 501,
          msg: '积分不足'
        }
        return
      } else {
        await User.updateOne({ _id: obj._id }, { $inc: { favs: -body.fav } })
      }
      const newPost = new Post(body)
      newPost.uid = obj._id
      const result = await newPost.save()
      ctx.body = {
        code: 200,
        data: result,
        msg: '保存文章成功'
      }
    } else {
      // 图片验证码验证失败
      ctx.body = {
        code: 500,
        msg: '图片验证码验证失败'
      }
    }
  }

  // 更新文章、编辑帖子
  async updatePost (ctx) {
    const { body } = ctx.request
    const sid = body.sid
    const code = body.code
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code)
    if (result) {
      const obj = await getJWTPayload(ctx.header.authorization)
      // 判断帖子作者是否为本人
      const post = await Post.findOne({ _id: body.tid })
      // 判断帖子是否结贴
      if (post.uid === obj._id && post.isEnd === '0') {
        const result = await Post.updateOne({ _id: body.tid }, body)

        if (result.ok === 1) {
          ctx.body = {
            code: 200,
            data: result,
            msg: '更新帖子成功'
          }
        } else {
          ctx.body = {
            code: 500,
            msg: '编辑帖子，更新失败'
          }
        }
      } else {
        ctx.body = {
          code: 401,
          msg: '没有操作的权限'
        }
      }
    } else {
      // 图片验证码验证失败
      ctx.body = {
        code: 500,
        msg: '图片验证码验证失败'
      }
    }
  }

  async updatePostByTid (ctx) {
    const { body } = ctx.request
    const result = await Post.updateOne({ _id: body._id }, body)
    if (result.ok === 1) {
      ctx.body = {
        code: 200,
        data: result,
        msg: '更新帖子成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '编辑帖子，更新失败'
      }
    }
  }

  // 获取文章详情
  async getPostDetail (ctx) {
    const params = ctx.query
    if (!params.tid) {
      ctx.body = {
        code: 500,
        msg: '文章标题为空'
      }
      return
    }
    const post = await Post.findByTid(params.tid)
    let isFav = 0
    // 判断用户是否传递Authorization的数据，即是否登录
    if (
      typeof ctx.header.authorization !== 'undefined' &&
      ctx.header.authorization !== ''
    ) {
      const obj = await getJWTPayload(ctx.header.authorization)
      const userCollect = await UserCollect.findOne({
        uid: obj._id,
        tid: params.tid
      })
      if (userCollect && userCollect.tid) {
        isFav = 1
      }
    }
    const newPost = post.toJSON()
    newPost.isFav = isFav

    // 更新文章计数
    const result = await Post.updateOne(
      { _id: params.tid },
      { $inc: { reads: 1 } }
    )
    if (post._id && result.ok === 1) {
      ctx.body = {
        code: 200,
        data: newPost,
        msg: '查询文章详情成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '查询文章详情失败'
      }
    }
    // const result = rename(post.toJSON(), 'uid', 'user')
  }

  // 获取用户发帖信息
  async getPostByUid (ctx) {
    const params = ctx.query
    const obj = await getJWTPayload(ctx.header.authorization)
    const result = await Post.getListByUid(
      obj._id,
      params.page,
      params.limit ? parseInt(params.limit) : 10
    )
    const total = await Post.countByUid(obj._id)
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

  // 获取最近的发帖信息
  async getPostPublic (ctx) {
    const params = ctx.query
    const result = await Post.getListByUid(
      params.uid,
      params.page,
      params.limit ? parseInt(params.limit) : 10
    )
    const total = await Post.countByUid(params.uid)
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

  // 删除发帖记录
  async deletePostByUid (ctx) {
    const params = ctx.query
    const obj = await getJWTPayload(ctx.header.authorization)
    const post = await Post.findOne({ uid: obj._id, _id: params.tid })
    if (post.id === params.tid && post.isEnd === '0') {
      await ContentController.prototype.deletePost(ctx)
    //   const result = await Post.deleteOne({ _id: params.tid })
    //   if (result.ok === 1) {
    //     ctx.body = {
    //       code: 200,
    //       msg: '删除成功'
    //     }
    //   } else {
    //     ctx.body = {
    //       code: 500,
    //       msg: '执行删除失败'
    //     }
    //   }
    // } else {
    //   ctx.body = {
    //     code: 500,
    //     msg: '删除失败，无权限'
    //   }
    }
  }

  async deletePost (ctx) {
    const { body } = ctx.request
    const result = await Post.deleteOne({ _id: { $in: body.ids } })
    if (result.ok === 1) {
      ctx.body = {
        code: 200,
        msg: '删除成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '执行删除失败'
      }
    }
  }

  async updatePostBatch (ctx) {
    const { body } = ctx.request
    const result = await Post.updateMany(
      { _id: { $in: body.ids } },
      { $set: { ...body.settings } }
    )
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 添加标签
  async addTag (ctx) {
    const { body } = ctx.request
    const tag = new PostTags(body)
    await tag.save()
    ctx.body = {
      code: 200,
      msg: '标签保存成功'
    }
  }

  // 获取文章标签
  async getTags (ctx) {
    const params = ctx.query
    const page = params.page ? parseInt(params.page) : 0
    const limit = params.limit ? parseInt(params.limit) : 10
    const result = await PostTags.getList({}, page, limit)
    const total = await PostTags.countList({})
    ctx.body = {
      code: 200,
      data: result,
      total,
      msg: '查询tags成功！'
    }
  }

  // 删除标签
  async removeTag (ctx) {
    const params = ctx.query
    const result = await PostTags.deleteOne({ id: params.ptid })

    ctx.body = {
      code: 200,
      data: result,
      msg: '删除成功'
    }
  }

  // 更新标签
  async updateTag (ctx) {
    const { body } = ctx.request
    const result = await PostTags.updateOne({ _id: body._id }, body)

    ctx.body = {
      code: 200,
      data: result,
      msg: '更新成功'
    }
  }
}

export default new ContentController()
