import mongoose from 'mongoose'
import env from '../config/env'

export const starknetTxConnection = mongoose.createConnection(env.mongodbStarknetTx.url)
export const zksynceraConnection = mongoose.createConnection(env.mongodbZksynceraConnectionTx.url)
console.log(env)
export const startnetReceiptConnection = mongoose.createConnection(env.mongodbStarknetReceipt.url)

