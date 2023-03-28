let mongoose = require("mongoose");
const db2 = require("./initdb2");
let Schema = mongoose.Schema;

let Zk2Tx = new Schema({
  _id: Schema.Types.ObjectId,
  blockHash: String,
  from: String,
  to: String,
  timestamp: Number,
  input: String,
  value: String,
});

module.exports = db2.zk2Connection.model("zksyncera_tx", Zk2Tx, "zksyncera_tx");
