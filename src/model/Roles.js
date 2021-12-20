import mongoose from '../config/DBHelpler'

const Scheama = mongoose.Schema

const RolesSchama = new Scheama({
  name: { type: String, default: '' },
  role: { type: String, default: '' },
  desc: { type: String, default: '' },
  menu: { type: Array, default: [] }

})

const Roles = mongoose.model('roles', RolesSchama)

export default Roles
