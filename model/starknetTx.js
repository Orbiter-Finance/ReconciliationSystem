let mongoose = require("mongoose");
const db2 = require('./initdb2')
let Schema = mongoose.Schema;

let starknetTx = new Schema({
  _id: Schema.Types.ObjectId,
  block_hash: String,
  block_number: Number,
  calldata: Array,
  class_hash: String,
  sender_address: String,
  timestamp: Number,
  input: Array,
});

module.exports = db2.model("Starknet", starknetTx, "Starknet");
