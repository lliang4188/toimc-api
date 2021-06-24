const DB_URL = 'mongodb://test:123456@10.211.55.3:15000/testdb'

const REDIS = {
  host: '10.211.55.3',
  port: 15001,
  password: '123456',
}
const JWT_SECRET = 'liuworkss'

const baseUrl =
  process.env.NODE_ENV === 'production'
    ? 'http://www.toimc.com'
    : 'http://localhost:3000'

export default {
  DB_URL,
  REDIS,
  JWT_SECRET,
  baseUrl,
}
