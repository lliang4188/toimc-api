import mongoose from '../config/DBHelpler'

const Scheam = mongoose.Schema

const UserScheam = new Scheam({
  'username': { type: String },
  'name': {type: String},
  'password': { type: String }
})

const UserModel = mongoose.model('users', UserScheam)

export default UserModel
