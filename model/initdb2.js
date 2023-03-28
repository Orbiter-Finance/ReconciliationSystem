const mongoose = require("mongoose");
const env = require("../config/env");

module.exports = {
  starknetTxConnection: mongoose.createConnection(env.mongodbStarknetTx.url),
  zk2Connection: mongoose.createConnection(env.mongodbZK2Tx.url),
};
