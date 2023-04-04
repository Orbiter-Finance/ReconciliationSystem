import pool from '../model/dashbroddb'
import makerTxModel from '../model/failMakerTransaction'
import bluebird from 'bluebird'
import { initMongodb } from '../model/initMongodb'
import fakerMakerTx from '../model/fakerMakerTx'
import * as utils from '../utils'
import logger from '../utils/logger'
import moment from 'moment'
import * as constant from '../constant/index'
import isMaker from '../utils/isMaker'
import getScanUrl from '../utils/getScanUrl'
import { isZksynclite, isStarknet, isZkSyncera, isArbNova } from '../utils/is'
import starknetTxModel from '../model/starknetTx'
import zksyncliteTxModel from '../model/zksynceraTx'
import { BigNumber } from '@ethersproject/bignumber'
import BigNumberJs from 'bignumber.js'
import axios from 'axios'
import arbNovaScan from '../utils/scanNova'
import { getMatchedTxByMakerTx } from '../service/matchService/getMatchedTxByMakerTx'
const REG = new RegExp(/^(?:\d*90..|.*?90..(?:0{0,10}|$))$/)

async function startFetch() {
  const start = moment().add(-10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  const maxIdDoc = await makerTxModel.find({}).sort({ id: -1 }).limit(1);
  let sql = `SELECT * FROM maker_transaction WHERE ISNULL(outId) AND toAmount != 'null' AND toAmount != 'undefined' AND createdAt <= '${start}' AND createdAt >= '20230316'`
  if (maxIdDoc && maxIdDoc.length) {
    sql = `${sql} AND id > ${maxIdDoc[0].id}`
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
    }, { concurrency: 10 })
  } catch (error) {
    logger.error(`fetch error`, error)
  }

}

async function startCheck() {
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
}

async function startMatch2() {
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
              hash: data.hash ? data.hash : data.tx_hash ? data.txHash : data._id,
            },
            status: "matched",
          },
        }
      );
      logger.info("更新 ：", findNum++);
      logger.info("剩下没找到 ：", makerTxs.length - findNum);
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
      logger.info("更新 ：", findNum++);
      logger.info("剩下没找到 ：", makerTxs.length - findNum);
    }
  }, { concurrency: 2 })
}


export async function start() {
  // await initMongodb()
  let fetching = false
  let checking = false
  let matching = false
  setInterval(() => {
    if (fetching) {
      logger.info('fetching')
      return
    }
    fetching = true
    let start = moment().format('YYYY-MM-DD HH:mm:ss');
    logger.info(`start fetching at at ${moment().format('YYYY-MM-DD HH:mm:ss')}`)
    startFetch()
    .catch(error => logger.error('fetching error:',error))
    .finally(() => { fetching = false;logger.info(`end fetch: start:${start} end:${moment().format('YYYY-MM-DD HH:mm:ss')}`) })
  }, 30 * 1000)

  setInterval(() => {
    if (checking) {
      logger.info('checking')
      return
    }
    let start = moment().format('YYYY-MM-DD HH:mm:ss');
    logger.info(`start checking at ${start}`)
    checking = true
    startCheck()
    .catch(error => logger.error('checking error:',error))
    .finally(() => { checking = false;logger.info(`end check start:${start} end:${moment().format('YYYY-MM-DD HH:mm:ss')}`) })
  }, 30 * 1000)

  setInterval(() => {
    if (matching) {
      logger.info('matching')
      return
    }
    let start = moment().format('YYYY-MM-DD HH:mm:ss');
    logger.info(`start matching at ${start}`)
    matching = true
    startMatch2()
    .catch(error => logger.error('matching error:',error))
    .finally(() => { matching = false;logger.info(`end match start:${start} end: ${moment().format('YYYY-MM-DD HH:mm:ss')}`) })
  }, 30 * 1000)
}
// start()