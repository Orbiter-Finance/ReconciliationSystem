import mongoose from 'mongoose'
import env from '../config/env'


export const initMongodb = async () => {
    await mongoose.connect(env.mongodb.url)
    // await mongoose.connect(env.mongodbStarknetTx.url)
}