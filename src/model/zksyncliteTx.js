let mongoose = require("mongoose");
const db2 = require("./initdb2");
let Schema = mongoose.Schema;

let ZksynceraTx = new Schema({
  _id: Schema.Types.ObjectId,
  blockHash: String,
  from: String,
  to: String,
  timestamp: Number,
  input: String,
  value: String,
});

module.exports = db2.zksynceraConnection.model("zksyncera_tx", ZksynceraTx, "zksyncera_tx");
