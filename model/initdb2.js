const mongoose = require("mongoose");
const env = require("../config/env");

module.exports = {
  starknetTxConnection: mongoose.createConnection(env.mongodbStarknetTx.url),
  zksynceraConnection: mongoose.createConnection(env.mongodbZksynceraConnectionTx.url),
};
