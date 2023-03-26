const makerTx = require('../model/failMakerTransaction');
const initMongodb = require('../model/initMongodb')
async function main() {
  await initMongodb();
  const res = await makerTx.find();
  console.log(res.length)
}

main()