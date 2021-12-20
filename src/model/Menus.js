import mongoose from '../config/DBHelpler'

const Scheama = mongoose.Schema

const MenuScheama = new Scheama({
  title: { type: String, default: '' },
  name: { type: String, default: '' },
  path: { type: String, default: '' },
  component: { type: String, default: '' },
  hideInBread: { type: Boolean, default: false },
  hideInMeun: { type: Boolean, default: false },
  noCache: { type: Boolean, default: false },
  icon: { type: String, default: '' },
  sort: { type: Number, default: 0 },
  link: { type: String, default: '' },
  redirect: { type: String, default: '' },
  type: { type: String, default: 'menu' },
  // 配合tree组件, 展开对应的树形结构
  expand: { type: Boolean, default: true }
})

const OperationSchema = new Scheama({
  name: { type: String, default: '' },
  type: { type: String, default: '' },
  path: { type: String, default: '' },
  method: { type: String, default: '' },
  regmark: { type: String, default: '' }
})

MenuScheama.add({
  children: [MenuScheama],
  operations: [OperationSchema]
})

const Menus = mongoose.model('menus', MenuScheama)

export default Menus
