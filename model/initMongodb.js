const mongoose = require('mongoose')
const env = require('../config/env')


module.exports = async () => {
    await mongoose.connect(env.mongodb.url)
    // await mongoose.connect(env.mongodbStarknetTx.url)
}