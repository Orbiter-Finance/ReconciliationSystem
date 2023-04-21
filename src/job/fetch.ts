import pool from '../model/dashbroddb'
import makerTxModel from '../model/failMakerTransaction'
import bluebird from 'bluebird'
import logger from '../utils/logger'
import moment from 'moment'
import * as constant from '../constant/index'
import { getMatchedTxByMakerTx, getMatchedTxByInvalidReceiveTransaction } from '../service/matchService/getMatchedTxByMakerTx'
import invalidTransaction, { InvalidTransaction } from '../model/invalidTransaction'
import { InvalidTransactionMysql } from '../constant/type'
import abnormalOutTransactionModel, {AbnormalOutTransaction} from '../model/abnormalOutTransaction'
import isMaker, { IsIgnoreAddress } from '../utils/isMaker'
const REG = new RegExp(/^(?:\d*90..|.*?90..(?:0{0,10}|$))$/)

let first = false;
export async function startFetch() {
  const start = moment().add(-10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  const concurrency = 10;
  // To avoid missing data, the offset needs to be the same as the amount of insert concurrency 
  const maxIdDoc = await makerTxModel.find({}).sort({ id: -1 }).limit(concurrency);
  let sql = `SELECT * FROM maker_transaction WHERE ISNULL(outId) AND toAmount != 'null' AND toAmount != 'undefined' AND createdAt <= '${start}' AND createdAt >= '20230316'`
  if (first) {
    sql = `${sql} AND id > 12056920`
    first = false
  } else if (maxIdDoc && maxIdDoc.length) {
    sql = `${sql} AND id > ${maxIdDoc[maxIdDoc.length - 1].id}`
  }
  let [list] : any = await pool.query(sql)
  logger.info(`fetch sql ${sql}, length:`, list.length)
  try {
    await bluebird.map(list, async (item: any) => {
      try {
        if (!/^\d+$/.test(item.toAmount)) {
          logger.info(`toAmount error, tranId:${item.transcationId}, toAmount: ${item.toAmount}`)
          return
        }
        const checkSql = `SELECT * FROM transaction WHERE id = ${item.inId} `;
        const [checkResult]: any = await pool.query(checkSql);
        if (!checkResult.length) {
          logger.info(`not found transaction: ${item.inId}`)
          return
        }
        if (checkResult[0].source === 'xvm') {
          logger.info(`checkResult source error tranId:${item.transcationId}, inId:${item.inId}, source: ${checkResult[0].source}`)
          return
        }
        const value = String(checkResult[0].value);
        if (!REG.test(value))
        {
          logger.info(`checkResult source value error,tranId:${item.transcationId}, inId:${item.inId}, value: ${value}`)
          return
        }
        item.inData = checkResult[0]
        const newItem = { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) }
        const findOne = await makerTxModel.findOne({ id: Number(newItem.id) });
        if (findOne) {
          // logger.info('update one', newItem.transcationId)
          newItem.inData = checkResult[0];
          await makerTxModel.findOneAndUpdate({ id: Number(newItem.id) }, { $set: newItem })
        } else {
          logger.info('new insert', newItem.transcationId)
          await makerTxModel.create(newItem)
        }
      } catch (error) {
        logger.info(error)
      }
    }, { concurrency: concurrency })
  } catch (error) {
    logger.error(`fetch error`, error)
  }

}

export async function startCheck() {
  const docs = await makerTxModel.find({
    status: { $eq: 'init' },
    confirmStatus: constant.confirmStatus.noConfirm
  });
  logger.info(`check length:${docs.length}`)
  await bluebird.map(docs, async (doc: any) => {
    let id = doc.id;
    const value = String(doc.inData?.value);
    if ((doc.inData && doc.inData.value && !REG.test(doc.inData.value))) {
      logger.info(`delete by value, value: ${value}, transcationId: ${doc.transcationId}`,)
      await makerTxModel.findOneAndDelete({id: id});
      return
    }
    if (!/^\d+$/.test(doc.toAmount)) {
      logger.info(`delete by toAmount: ${doc.toAmount}, transcationId: ${doc.transcationId}`,)
      await makerTxModel.findOneAndDelete({id: id});
      return
    }
    const sql = `SELECT * FROM maker_transaction mt LEFT JOIN transaction t on mt.inId= t.id WHERE mt.id = ${id} AND (outId IS NOT NULL OR t.status = 99 OR t.source='xvm')`
    const [r]: any = await pool.query(sql);
    if (r.length) {
      logger.info('delete---', doc.transcationId, r[0].status)
      await makerTxModel.findOneAndDelete({id: id});
    }
    if (!doc.inData) {
      const checkSql = `SELECT * FROM transaction WHERE id = ${doc.inId} `;
      const [checkResult]: any = await pool.query(checkSql);
      if (checkResult) {
        await makerTxModel.findOneAndUpdate({ id: Number(doc.id) }, { $set: { inData: checkResult[0] } })
      }
      logger.info('update inData by check', doc.transcationId)
    }
  }, { concurrency: 10 })
  logger.info('checking inData')
  const noInDataDocs = await makerTxModel.find({
    inData: { $exists: false }
  })
  logger.info('need update inData length: ', noInDataDocs.length)
  await bluebird.map(noInDataDocs, async (doc: any) => {
    if (doc.inData) {
      return
    }
    const checkSql = `SELECT * FROM transaction WHERE id = ${doc.inId} `;
    const [checkResult]: any = await pool.query(checkSql);
    if (checkResult && checkResult.length) {
      await makerTxModel.findOneAndUpdate({ id: Number(doc.id) }, { $set: { inData: checkResult[0] } })
    }
  }, { concurrency: 3 })

}

export async function startMatch2() {
  logger.info(`startMatch2`)
  const makerTxs = await makerTxModel.find({
    status: { $nin: ["matched", "warning"] },
    matchedScanTx: { $exists: false }
  });
  let findNum = 0;
  logger.info(`startMatch2: makerTxs.length:${makerTxs.length}`)
  await bluebird.map(makerTxs, async (makerTx: any, index) => {
    let res = await getMatchedTxByMakerTx(makerTx)
    if (res && res.length === 1) {
      const [data]: any = res;
      await makerTxModel.findOneAndUpdate(
        { id: makerTx.id },
        {
          $set: {
            matchedScanTx: {
              ...data,
              hash: data.hash ? data.hash : data.txHash ? data.txHash : data._id,
            },
            status: "matched",
          },
        }
      );
      logger.info("startMatch2 updated ：", findNum++);
      logger.info("startMatch2 left ：", makerTxs.length - findNum);
    }

    if (res && res.length > 1) {
      await makerTxModel.findOneAndUpdate(
        { id: makerTx.id },
        {
          $set: {
            warnTxList: res.map((item) =>
              item.hash ? item.hash : item.txHash ? item.txHash : item._id
            ),
            status: "warning",
          },
        }
      );
      logger.info("startMatch2 updated ：", findNum++);
      logger.info("startMatch2 left ：", makerTxs.length - findNum);
    }
  }, { concurrency: 2 })
}


export async function fetchInvalidTransaction() {
  const concurrency = 3
  const maxIdDoc = await invalidTransaction.find({}).sort({ id: -1 }).limit(concurrency);
  let sql = `SELECT * FROM transaction WHERE \`status\` = 3 AND \`timestamp\` > '2023-04-13' AND side = 0 AND \`value\` != '0'`
  if (maxIdDoc && maxIdDoc.length) {
    sql = `${sql} AND id > ${maxIdDoc[maxIdDoc.length - 1].id}`;
  }
  let result = await pool.query(sql)
  const list = result[0] as InvalidTransactionMysql[]
  logger.info(`fetchInvalidTransaction sql: ${sql} , length:${list.length}`)
  if (!list.length) {
    return
  }
  await bluebird.map(list, async (item) => {
    const hash = item.hash;
    if (IsIgnoreAddress(item.from)) {
      logger.info(`fetchInvalidTransaction: maker transfer, makerAddress:${item.from}, id:${item.id}`)
    }
    const doc = await invalidTransaction.findOne({
      hash: hash
    })

    const insertData = item as unknown as InvalidTransaction
    if (doc) {
      return
    }
    insertData.timestamp = new Date(item.timestamp)
    insertData.createdAt = new Date(item.createdAt)
    insertData.updatedAt = new Date(item.updatedAt)
    await invalidTransaction.create(insertData)
  }, {concurrency: concurrency})
}


export async function fetchAbnormalOutTransaction() {
  const concurrency = 3
  const end = moment().add(-10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  let sql = `SELECT * FROM transaction WHERE \`status\` !=99 AND \`timestamp\` > '2023-03-15' AND \`timestamp\` < '${end}' AND side = 1`;
  const maxIdDoc = await abnormalOutTransactionModel.find({}).sort({ id: -1 }).limit(concurrency);
  if (maxIdDoc && maxIdDoc.length) {
    sql = `${sql} AND id > ${maxIdDoc[maxIdDoc.length - 1].id}`;
  }
  let result = await pool.query(sql)
  const list = result[0] as AbnormalOutTransaction[]
  logger.info(`fetchAbnormalOutTransaction sql: ${sql} , length:${list.length}`)
  await bluebird.map(list, async (item) => {
    if (isMaker(item.to)) {
      logger.info(`fetchAbnormalOutTransaction: to maker: ${item.to}, id: ${item.id}`)
      return;
    }
    const hash = item.hash;
    const doc = await abnormalOutTransactionModel.findOne({
      hash: hash
    })
    const insertData = item
    if (doc) {
      return
    }
    const matchedTx = await invalidTransaction.findOne({ 'matchedTx.hash': hash, chainId: Number(item.chainId) })
    if (matchedTx) {
      logger.info(`fetchAbnormalOutTransaction ignore by return tx:${item.hash}, id:${item.id}`)
      return
    }
    insertData.timestamp = new Date(item.timestamp)
    insertData.createdAt = new Date(item.createdAt)
    insertData.updatedAt = new Date(item.updatedAt)
    await abnormalOutTransactionModel.create(insertData)
  }, {concurrency: concurrency})
}


export async function matchInvalidReceiveTransaction() {
  const invalidTxs = await invalidTransaction.find({
    matchStatus: 'init',
  })
  logger.info('checkInvalidReceiveTransaction length:', invalidTxs.length);
  if (!invalidTxs.length) {
    return
  }
  let findNum = 0;
  await bluebird.map(invalidTxs, async (invalidTx , index) => {
    let res = await getMatchedTxByInvalidReceiveTransaction(invalidTx)
    if (res && res.length === 1) {
      const [data]: any = res;
      await invalidTransaction.findOneAndUpdate(
        { id: invalidTx.id },
        {
          $set: {
            matchedTx: {
              ...data,
              hash: data.hash ? data.hash : data.txHash ? data.txHash : data._id,
            },
            matchStatus: "matched",
          },
        }
      );
      logger.info("matchInvalidReceiveTransaction updated ：", findNum++);
      logger.info("matchInvalidReceiveTransaction left ：", invalidTxs.length - findNum);
    }

    if (res && res.length > 1) {
      await invalidTransaction.findOneAndUpdate(
        { id: invalidTx.id },
        {
          $set: {
            warnTxList: res.map((item) =>
              item.hash ? item.hash : item.txHash ? item.txHash : item._id
            ),
            matchStatus: "warning",
          },
        }
      );
      logger.info("matchInvalidReceiveTransaction updated ：", findNum++);
      logger.info("matchInvalidReceiveTransaction left ：", invalidTxs.length - findNum);
    }
  }, { concurrency: 2 })
}

export async function checkAbnormalOutTransaction() {
  let done = false;
  let where: { id?: any } = {};
  let pageSize = 100;
  do {
    const docs = await abnormalOutTransactionModel.find(where).sort({id: -1}).limit(pageSize).lean();
    await bluebird.map(docs, async (doc) => {
      const sql = `SELECT * FROM transaction WHERE \`status\` = 99 AND id=${doc.id}`
      let result = await pool.query(sql)
      const list = result[0] as InvalidTransactionMysql[]
      if (list.length) {
        logger.info(`checkAbnormalOutTransaction delete by status=99, id:${doc.id}`)
        await abnormalOutTransactionModel.deleteOne({ id: doc.id })
      }
      const matchedTx = await invalidTransaction.findOne({ 'matchedTx.hash': doc.hash, chainId: Number(doc.chainId) })
      if (matchedTx) {
        logger.info(`checkAbnormalOutTransaction delete by return tx:${doc.hash}, id:${doc.id}`)
        await abnormalOutTransactionModel.deleteOne({ id: doc.id })
      }
    }, { concurrency: 3 });
    if (docs.length && docs.length === pageSize) {
      where.id = { $lt: docs[docs.length - 1].id }
    } else {
      done = true
    }
  } while(!done)
}