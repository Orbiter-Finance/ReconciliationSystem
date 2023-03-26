const makerTx = require('../model/makerTx');

async function main() {
  await makerTx.find();
}

main()