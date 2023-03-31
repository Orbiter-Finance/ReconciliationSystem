import mysql2 from 'mysql2/promise'

import env from '../config/env'
const pool = mysql2.createPool({
    connectTimeout: 1000000,
    ...env.mysql2
})

export default pool;