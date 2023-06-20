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
import {checkTxValidOnChain} from '../service/matchService/checkTxValidOnChain'
const REG = new RegExp(/^(?:\d*90..|.*?90..(?:0{0,10}|$))$/)

let first = false;
export async function startFetch() {
  const start = moment().add(-10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  const concurrency = 10;
  // To avoid missing data, the offset needs to be the same as the amount of insert concurrency 
  const maxIdDoc = await makerTxModel.find({}).sort({ id: -1 }).limit(concurrency);
  let sql = `SELECT * FROM maker_transaction WHERE ISNULL(outId) AND toAmount != 'null' AND toAmount != 'undefined' AND createdAt <= '${start}' AND createdAt >= '20230316'`
  if (first) {
    sql = `${sql} AND id = 13473237`
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
  let done = false;
  let limit = 5;
  const where:any = {
    status: { $nin: ["matched", "warning"] },
    matchedScanTx: { $exists: false }
  }
  const count = await makerTxModel.count(where);
  logger.info(`startMatch2: makerTxs.length:${count}`)
  if (!count) {
    return
  }
  let findNum = 0;
  do {
    const makerTxs = await makerTxModel.find(where).sort({id: -1}).limit(limit);
    await bluebird.map(makerTxs, async (makerTx: any, index) => {
      // logger.info(`startMatch2, getMatchedTxByMakerTx, ${makerTx.id}, ${makerTx.toChain}, ${makerTx.inData.extra?.toSymbol}`)
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
        logger.info("startMatch2 left ：", count - findNum);
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
        logger.info("startMatch2 left ：", count - findNum);
      }
    }, { concurrency: 1 })

    if (makerTxs.length >= limit) {
      where.id = { $lt: makerTxs[makerTxs.length - 1].id }
    } else {
      done = true;
    }
  } while(!done)
}


export async function fetchInvalidTransaction() {
  const concurrency = 2
  const maxIdDoc = await invalidTransaction.find({}).sort({ id: -1 }).limit(concurrency);
  let sql = `SELECT * FROM transaction WHERE \`status\` = 3 AND \`timestamp\` > '2023-03-01' AND side = 0 AND \`value\` != '0'`
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
      return
    }
    let checkR = await checkTxValidOnChain(item.hash, String(item.chainId))
    if (!checkR) {
      logger.info(`fetchInvalidTransaction: ignore by checkTxValidOnChain: ${checkR} hash:${item.hash}, id:${item.id}`)
      return
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
  const concurrency = 2
  const end = moment().add(-10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  let sql = `SELECT * FROM transaction WHERE \`status\` != 99 AND \`status\` != 2 AND \`timestamp\` > '2023-03-15' AND \`timestamp\` < '${end}' AND side = 1`;
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
    let checkR = await checkTxValidOnChain(item.hash, String(item.chainId))
    if (!checkR) {
      logger.info(`fetchAbnormalOutTransaction: ignore by checkTxValidOnChain: ${checkR} hash:${item.hash}, id:${item.id}`)
      return
    }
    const hash = item.hash;
    const doc = await abnormalOutTransactionModel.findOne({
      hash: hash
    })
    const insertData = item
    if (doc) {
      return
    }
    const matchedTx = await invalidTransaction.findOne({
      $or: [
        {'userLog.hash': hash},
        {'matchedTx.hash': hash},
        {'matchedTx._id': hash.replace(/0x0+/, '0x')},
        {'matchedTx.blockHash': hash},
        {'matchedTx.txHash': hash},
        {warnTxList: { $in: [hash] }},
        {warnTxList: { $in: [hash.replace(/0x0+/, '0x')] }},
      ],
      chainId: Number(item.chainId)
    })
    if (matchedTx) {
      logger.info(`fetchAbnormalOutTransaction ignore by return tx:${item.hash}, id:${item.id}`)
      return
    }

    const matchedTx2 = await makerTxModel.findOne({
      toChain: String(item.chainId),
      $or: [
        {'matchedScanTx.hash': hash},
        {'matchedScanTx._id': hash.replace(/0x0+/, '0x')},
        {'matchedScanTx.blockHash': hash},
        {warnTxList: { $in: [hash] }},
      ]
    })

    if (matchedTx2) {
      logger.info(`fetchAbnormalOutTransaction ignore by makerTxModel tx:${item.hash}, id:${item.id}`)
      return
    }
    if (item.timestamp) {
      insertData.timestamp = new Date(item.timestamp)
    }
    if (item.createdAt) {
      insertData.createdAt = new Date(item.createdAt)
    }
    if (item.updatedAt) {
      insertData.updatedAt = new Date(item.updatedAt)
    }
    // insertData.timestamp = new Date(item.timestamp)
    // insertData.createdAt = new Date(item.createdAt)
    // insertData.updatedAt = new Date(item.updatedAt)
    await abnormalOutTransactionModel.create(insertData)
  }, {concurrency: concurrency})
}


export async function matchInvalidReceiveTransaction() {
  const where: any = {
    matchStatus: 'init',
  }
  let done = false;
  const limit = 1000;
  const count = await invalidTransaction.count(where)
  logger.info('checkInvalidReceiveTransaction length:', count);
  if (!count) {
    return
  }
  let findNum = 0;
  do {
    const invalidTxs = await invalidTransaction.find(where).sort({id: -1}).limit(limit);
    await bluebird.map(invalidTxs, async (invalidTx , index) => {
      const sql = `SELECT * FROM transaction WHERE id = ${invalidTx.id} AND status = 99`
      let [r]: any = await pool.query(sql)
      if (r.length) {
        logger.info(`匹配无效转入=> 此转入已在dashboard 匹配成功，删除此无效转入 hash: ${invalidTx.hash}, id: ${invalidTx.id}`);
        await invalidTransaction.findOneAndDelete({ hash: invalidTx.hash, id: invalidTx.id })
        return
      }
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
        logger.info("matchInvalidReceiveTransaction left ：", count - findNum);
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
        logger.info("matchInvalidReceiveTransaction left ：", count - findNum);
      }
    }, { concurrency: 1 })
    if (invalidTxs.length >= limit) {
      where.id = { $lt: invalidTxs[invalidTxs.length - 1].id }
    } else {
      done = true
    }
  } while(!done)
}

export async function checkAbnormalOutTransaction() {
  let done = false;
  let where: { id?: any, hash?: string } = {
    // hash: "0x7d6472483be5dd9a896efb1c2a2bea0d4b3ac3f176359a2ebefee3fad5af8d00"
  };
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
        return
      }
      const matchedTx = await invalidTransaction.findOne({
        chainId: Number(doc.chainId),
        $or: [
          {'userLog.hash': doc.hash},
          {'userLog.hash': `sync-tx:${doc.hash.substring(2)}`},
          {'matchedTx.hash': doc.hash},
          {'matchedTx._id': doc.hash.replace(/0x0+/, '0x')},
          {'matchedTx.blockHash': doc.hash},
          {'matchedTx.txHash': doc.hash},
          {warnTxList: { $in: [doc.hash] }},
          {warnTxList: { $in: [doc.hash.replace(/0x0+/, '0x')] }},
        ]
      })
      if (matchedTx) {
        logger.info(`checkAbnormalOutTransaction delete by return tx:${doc.hash}, id:${doc.id}`)
        await abnormalOutTransactionModel.deleteOne({ id: doc.id })
        return
      }
      const matchedTx2 = await makerTxModel.findOne({
        toChain: String(doc.chainId),
        $or: [
          {'matchedScanTx.hash': doc.hash},
          {'matchedScanTx._id': doc.hash.replace(/0x0+/, '0x')},
          {'matchedScanTx.blockHash': doc.hash},
          {warnTxList: { $in: [doc.hash] }},
        ]
      })
      if (matchedTx2) {
        logger.info(`checkAbnormalOutTransaction delete by makerTxModel tx:${doc.hash}, id:${doc.id}`)
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

export async function checkAbnormalOutTransaction2() {
  let done = false;
  let where: { id?: any, hash?:string, chainId?: number } = {
    // hash: "0xebea7da4710f642056f859535cc07b191681f000cc08228c92d94b3158727f1f"
    // chainId: 3
  };
  let pageSize = 100;
  do {
    const docs = await invalidTransaction.find(where).sort({id: -1}).limit(pageSize).lean();
    await bluebird.map(docs, async (doc) => {
      const result = await checkTxValidOnChain(doc.hash, String(doc.chainId))
      console.log(`id: ${doc.id}, hash: ${doc.hash}, chain:${doc.chainId}, result: ${result}`)
      if (!result) {
        await invalidTransaction.deleteOne({id: doc.id})
      }
    }, { concurrency: 1 });
    if (docs.length && docs.length === pageSize) {
      where.id = { $lt: docs[docs.length - 1].id }
    } else {
      done = true
    }
  } while(!done)
}


// export async function matchInvalidReceiveTransaction2() {
//   const where: any = {
//     matchStatus: { $ne: 'init'},
//   }
//   let done = false;
//   const limit = 100;
//   const count = await invalidTransaction.count(where)
//   logger.info('checkInvalidReceiveTransaction length:', count);
//   if (!count) {
//     return
//   }
//   let findNum = 0;
//   do {
//     const invalidTxs = await invalidTransaction.find(where).sort({id: -1}).limit(limit);
//     await bluebird.map(invalidTxs, async (invalidTx , index) => {
//       const sql = `SELECT * FROM maker_transaction mt LEFT JOIN transaction t ON mt.outId = t.id WHERE mt.inId = ${invalidTx.id} AND mt.outId IS NOT NULL`
//       let [r]: any = await pool.query(sql)
//       if (r.length) {
//         logger.info(`匹配无效转入=> 此转入已在dashboard 匹配成功，删除此无效转入 hash: ${invalidTx.hash}, id: ${invalidTx.id}`);
//         console.log(sql)
//         // await invalidTransaction.findOneAndDelete({ hash: invalidTx.hash, id: invalidTx.id })
//         return
//       }

//     }, { concurrency: 20 })
//     if (invalidTxs.length >= limit) {
//       where.id = { $lt: invalidTxs[invalidTxs.length - 1].id }
//     } else {
//       done = true
//     }
//   } while(!done)
// }