const mysql2 = require('mysql2/promise')
const env = require('../config/env')
const pool = mysql2.createPool({
    connectTimeout: 1000000,
    ...env.mysql2
})

module.exports = pool;