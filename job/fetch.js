const pool = require('../model/dashbroddb')
const makerTxModel = require('../model/failMakerTransaction')
const bluebird = require('bluebird')
const init = require('../model/initMongodb')
const fakerMakerTx = require('../model/fakerMakerTx')
const utils = require('../utils')
const logger = require('../utils/logger')
const moment = require('moment')
const constant = require('../constant/index')
async function startFetch() {
  const start = moment().add(-2, 'hour').format('YYYY-MM-DD HH:mm:ss');

  const sql = `SELECT * FROM maker_transaction WHERE ISNULL(outId) AND createdAt <= '${start}' AND createdAt >= '20230316'`
  let [list] = await pool.query(sql)
  logger.info(`fetch length:`, list.length)
  try {
    await bluebird.map(list, async (item) => {
      try {
        const checkSql = `SELECT * FROM transaction WHERE id = ${item.inId} `;
        const [checkResult] = await pool.query(checkSql);
        if (!checkResult.length) {
          logger.info(`not found transaction: ${item.inId}`)
          return
        }
        if (checkResult[0].source === 'xvm') {
          // logger.info(`checkResult source error, inId:${item.inId}, source: ${checkResult[0].source}`)
          return
        }
        const value = String(checkResult[0].value);
        if (!value.substring(value.length - 4).startsWith('90')) {
          // logger.info(`checkResult source value error, inId:${item.inId}, value: ${value}`)
          return
        }
        const newItem = { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) }
        const findOne = await makerTxModel.findOne({ id: Number(newItem.id) });
        if (findOne) {
          // logger.info('update one', newItem.id)
          newItem.inData = checkResult[0];
          await makerTxModel.findOneAndUpdate({ id: Number(newItem.id) }, { $set: newItem })
        } else {
          logger.info('new insert', newItem.transcationId)
          await makerTxModel.create(newItem)
        }
      } catch (error) {
        logger.info(error)
      }
    }, { concurrency: 10 })
  } catch (error) {
    
  }

}

async function startCheck() {
  const docs = await makerTxModel.find({
    status: { $eq: 'init' },
    confirmStatus: constant.confirmStatus.noConfirm
  });
  logger.info(`check length:${docs.length}`)
  await bluebird.map(docs, async doc => {
    let id = doc.id;
    const value = String(doc.inData?.value);
    if (doc.inData && doc.inData.value && !value.substring(value.length - 4).startsWith('90')) {
      logger.info(`delete by value: ${value}, transcationId: ${doc.transcationId}`,)
      await makerTxModel.findOneAndDelete({id: id});
      return
    }
    const sql = `SELECT * FROM maker_transaction mt LEFT JOIN transaction t on mt.inId= t.id WHERE mt.id = ${id} AND (outId IS NOT NULL OR t.status = 99 OR t.source='xvm')`
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
      const update = {
        status: 'matched',
        matchedTx: filterResult
      };
      let ur = await makerTxModel.findOneAndUpdate({ id: doc.id }, { $set: update })
      logger.info(`${doc.transcationId}: match success`)
    } else if (filterResult.length > 1) {
      const update = {
        status: 'warning',
        warnTxList: filterResult.map(item => item.tx_hash)
      };
      // let newDoc = doc.toJSON()
      // newDoc.status = 'warning'
      // newDoc.warnTxList = filterResult.map(item => item.tx_hash);
      let ur = await makerTxModel.findOneAndUpdate({ id: doc.id }, { $set: update })
      logger.info(`${doc.transcationId}: warning`)
    }
  }, { concurrency: 10 })
}

async function start() {
  // await init()
  let fetching = false
  let checking = false
  let matching = true
  setInterval(() => {
    if (fetching) {
      logger.info('fetching')
      return
    }
    fetching = true
    logger.info('start fetching')
    startFetch().finally(() => { fetching = false;logger.info('end fetch') })
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