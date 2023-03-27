const mongoose = require("mongoose");
const env = require("../config/env");

const con = mongoose.createConnection(env.mongodbStarknetTx.url);

module.exports = con;

(async function name() {
  const res = await con.asPromise();
})();
