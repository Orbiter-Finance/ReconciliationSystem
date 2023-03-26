const pool = require('../model/dashbroddb')
const makerTxModel = require('../model/failMakerTransaction')
const bluebird = require('bluebird')
const init = require('../model/initMongodb')
const fakerMakerTx = require('../model/fakerMakerTx')
const utils = require('../utils')
const logger = require('../utils/logger')
const moment = require('moment')
async function startFecth() {
  const start = moment().add(-2, 'hour').format('YYYY-MM-DD HH:mm:ss');

  const sql = `SELECT * FROM maker_transaction WHERE ISNULL(outId) AND toChain in (2,3,4,14) AND createdAt <= '${start}'`
  let [list] = await pool.query(sql)
  try {
    await bluebird.map(list, async (item) => {
      try {
        const newItem = { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) }
        await makerTxModel.create(newItem)
      } catch (error) {
      }
    }, { concurrency: 10 })
  } catch (error) {
    
  }

}

async function startCheck() {
  const docs = await makerTxModel.find({});
  await bluebird.map(docs, async doc => {
    let id = doc.id;
    const sql = `SELECT * FROM maker_transaction mt LEFT JOIN transaction t on mt.inId= t.id WHERE mt.id = ${id} AND (outId IS NOT NULL OR t.status = 99)`
    const [r] = await pool.query(sql);
    if (r.length) {
      logger.info('delete---', doc.transcationId, r[0].status)
      await makerTxModel.findOneAndDelete({id: id});
    }
  }, { concurrency: 10 })
}

async function startMatch() {
  let docs = await makerTxModel.find({ status: { $ne: 'matched' }})
  // console.log('docs.length:',docs.length)
  await bluebird.map(docs, async (doc) => {
    const hits = await fakerMakerTx.find({amount: doc.toAmount});
    // console.log('hits.length:', hits.length)
    if (!hits.length) {
      return
    }
    
    const filterResult = hits.filter(e => {
      // console.log('address:',e.to_address, doc.replyAccount, doc.replyAccount===e.to_address, utils.isEqualsAddress(e.to_address, doc.replyAccount))
      return utils.isEqualsAddress(e.to_address, doc.replyAccount)
    })
    if (filterResult.length === 1) {
      let newDoc = doc.toJSON()
      newDoc.status = 'matched'
      newDoc.matchedTx = filterResult[0];
      let ur = await makerTxModel.findOneAndUpdate({ id: doc.id }, newDoc)
      logger.info(`${doc.transcationId}: match success`)
    } else if (filterResult.length > 1) {
      let newDoc = doc.toJSON()
      newDoc.status = 'warning'
      let ur = await makerTxModel.findOneAndUpdate({ id: doc.id }, newDoc)
      logger.info(`${doc.transcationId}: warning`)
    }
  }, { concurrency: 10 })
}

async function start() {
  // await init()
  let fecting = false
  let checking = false
  let matching = false
  setInterval(() => {
    if (fecting) {
      logger.info('fecthing')
      return
    }
    fecting = true
    logger.info('start fetching')
    startFecth().finally(() => { fetching = false;logger.info('end fetch') })
  }, 30 * 1000)

  setInterval(() => {
    if (checking) {
      logger.info('checking')
      return
    }
    logger.info('start checking')
    checking = true
    startCheck().finally(() => { checking = false;logger.info('end check') })
  }, 30 * 1000)

  setInterval(() => {
    if (matching) {
      logger.info('matching')
      return
    }
    logger.info('start matching')
    matching = true
    startMatch().finally(() => { matching = false;logger.info('end match') })
  }, 30 * 1000)
}
// start()
module.exports.start = start