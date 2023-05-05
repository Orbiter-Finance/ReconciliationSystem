
import mongoose from "mongoose"; 
import * as  db2 from "./initdb2";
let Schema = mongoose.Schema;

let ZksynceraTx = new Schema({
  _id: String,
  blockHash: String,
  from: String,
  to: String,
  timestamp: Number,
  input: String,
  value: String,
});

export default db2.zksynceraConnection.model("zksyncera_tx", ZksynceraTx, "zksyncera_tx");
