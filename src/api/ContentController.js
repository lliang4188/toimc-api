import Post from '../model/Post'
import Links from '../model/Links'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import moment from 'dayjs'
import config from '@/config/index'
// method1
import mkdir from 'make-dir'
// import { dirExists } from '@/common/Utils'

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
    const options = {}

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

    ctx.body = {
      code: 200,
      data: result,
      msg: '获取文章列表成功'
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
}

export default new ContentController()
