import mongoose from '../config/DBHelpler'
import moment from 'dayjs'

const Scheama = mongoose.Schema

const PostScheama = new Scheama({
  uid: { type: String, ref: 'users' },
  title: { type: String },
  content: { type: String },
  created: { type: Date },
  catalog: { type: String },
  isEnd: { type: String },
  fav: { type: String },
  reads: { type: Number },
  answer: { type: Number },
  status: { type: String },
  isTop: { type: String },
  sort: { type: String },
  tags: { type: Array }
})

PostScheama.pre('save', function (next) {
  this.created = moment().format('YYYY-MM-DD HH:mm:ss')
  next()
})

PostScheama.statics = {
  /**
   * 获取文章列表数据
   * @param {Object} options 筛选条件
   * @param {String} sort 排序方式
   * @param {Number} page 分页页数
   * @param {Number} limit 分页条数
   * @returns
   */
  getList: function (options, sort, page, limit) {
    return this.find(options)
      .sort({ [sort]: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate({
        path: 'uid',
        select: 'name isVip pic'
      })
  },

  getTopWeek: function () {
    return this.find({
      created: {
        $gte: moment().subtract(7, 'days')
      }
    }, {
      answer: 1,
      title: 1
    })
      .sort({ answer: -1 })
      .limit(15)
  }
}

const PostModel = mongoose.model('post', PostScheama)

export default PostModel
