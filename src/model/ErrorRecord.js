import mongoose from '@/config/DBHelpler'

const Schema = mongoose.Schema

const ErrorRecordScheam = new Schema({
  message: { type: String, default: '' },
  code: { type: String, default: '' },
  method: { type: String, default: '' },
  path: { type: String, default: '' },
  param: { type: Schema.Types.Mixed, default: '' },
  username: { type: String, default: '' },
  stack: { type: String, default: '' },
  created: { type: Date }
})

ErrorRecordScheam.pre('save', function (next) {
  this.created = new Date()
  next()
})

const ErrorRecord = mongoose.model('error_record', ErrorRecordScheam)

export default ErrorRecord
