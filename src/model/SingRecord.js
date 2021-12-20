import mongoose from '@/config/DBHelpler'
import monent from 'dayjs'

const Schema = mongoose.Schema

const SignRecordSchema = new Schema({
  uid: { type: String, ref: 'users' },
  created: { type: Date },
  favs: { type: Number }
})

SignRecordSchema.pre('save', function (next) {
  this.created = monent().format('YYYY-MM-DD HH:mm:ss')
  next()
})

SignRecordSchema.statics = {
  findByUid: function (uid) {
    return this.findOne({ uid: uid }).sort({ created: -1 })
  },
  getLatestSign: function (page, limit) {
    return this.find({})
      .populate({
        path: 'uid',
        select: '_id name pic'
      })
      .skip(page * limit)
      .limit(limit)
      .sort({ created: -1 })
  },
  getTopSign: function (page, limit) {
    return this.find({
      created: { $gte: monent().format('YYYY-MM-DD 00:00:00') }
    }).populate({
      path: 'uid',
      select: '_id name pic'
    })
      .skip(page * limit)
      .limit(limit)
      .sort({ created: 1 })
  },
  getSignCount: function () {
    return this.find({}).countDocuments()
  },
  getTopSignCount: function () {
    return this.find({
      created: { $gte: monent().format('YYYY-MM-DD 00:00:00') }
    }).countDocuments()
  }

}

const SignRecord = mongoose.model('sign_record', SignRecordSchema)

export default SignRecord
