import mongoose from 'mongoose'
import * as db2 from './initdb2'
let Schema = mongoose.Schema;

let starknetTx = new Schema({
  _id: String,
  block_hash: String,
  block_number: Number,
  calldata: Array,
  class_hash: String,
  sender_address: String,
  timestamp: Number,
  input: Array,
});

export default db2.starknetTxConnection.model("Starknet", starknetTx, "Starknet");
