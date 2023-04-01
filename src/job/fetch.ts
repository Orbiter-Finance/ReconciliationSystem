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
import { isZksynclite, isStarknet, isZk2, isArbNova } from '../utils/is'
import starknetTxModel from '../model/starknetTx'
import zksyncliteTxModel from '../model/zksyncliteTx'
import { BigNumber } from '@ethersproject/bignumber'
import BigNumberJs from 'bignumber.js'
import axios from 'axios'
import arbNovaScan from '../utils/scanNova'


async function startFetch() {
  const start = moment().add(-10, 'minutes').format('YYYY-MM-DD HH:mm:ss');

  const sql = `SELECT * FROM maker_transaction WHERE ISNULL(outId) AND createdAt <= '${start}' AND createdAt >= '20230316'`
  let [list] : any = await pool.query(sql)
  logger.info(`fetch sql ${sql}, length:`, list.length)
  try {
    await bluebird.map(list, async (item: any) => {
      try {
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
        if (!value.substring(value.length - 4).startsWith('90')) {
          logger.info(`checkResult source value error,tranId:${item.transcationId}, inId:${item.inId}, value: ${value}`)
          // return
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
  await bluebird.map(docs, async (doc: any) => {
    let id = doc.id;
    const value = String(doc.inData?.value);
    // if (doc.inData && doc.inData.value && !value.substring(value.length - 4).startsWith('90')) {
    //   logger.info(`delete by value: ${value}, transcationId: ${doc.transcationId}`,)
    //   await makerTxModel.findOneAndDelete({id: id});
    //   return
    // }
    const sql = `SELECT * FROM maker_transaction mt LEFT JOIN transaction t on mt.inId= t.id WHERE mt.id = ${id} AND (outId IS NOT NULL OR t.status = 99 OR t.source='xvm')`
    const [r]: any = await pool.query(sql);
    if (r.length) {
      logger.info('delete---', doc.transcationId, r[0].status)
      await makerTxModel.findOneAndDelete({id: id});
    }
  }, { concurrency: 10 })
}

async function startMatch() {
  let docs = await makerTxModel.find({ status: { $ne: 'matched' }})
  // logger.info('docs.length:',docs.length)
  await bluebird.map(docs, async (doc: any) => {
    const hits = await fakerMakerTx.find({amount: doc.toAmount});
    // logger.info('hits.length:', hits.length)
    if (!hits.length) {
      return
    }
    
    const filterResult = hits.filter(e => {
      // logger.info('address:',e.to_address, doc.replyAccount, doc.replyAccount===e.to_address, utils.isEqualsAddress(e.to_address, doc.replyAccount))
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



const checkStarknetTx = async function (makerTx) {
  if (!makerTx.replyAccount || !makerTx.toAmount) {
    return false;
  }

  const toAmount = makerTx.toAmount.slice(0, makerTx.toAmount.length - 4) + "0000";
  const matcheds = await starknetTxModel.find({
    "input.6": BigNumber.from(makerTx.replyAccount).toString(),
    "input.7": {
      $in: [BigNumber.from(toAmount).toString(), makerTx.toAmount],
    },
  });

  return matcheds;
};
const checkZk2Tx = async function (makerTx) {
  if (!makerTx.replyAccount || !makerTx.toAmount) {
    return false;
  }

  const matcheds = await zksyncliteTxModel.find({
    to: makerTx.replyAccount.toLowerCase(),
    value: "0x" + new BigNumberJs(makerTx.toAmount).toString(16),
  });

  return matcheds;
};

const checkOtherTx = async function (makerTx) {
  const url = getScanUrl(makerTx);

  if (!url || !makerTx.toAmount) {
    return undefined;
  }
  try {
    const res = await axios.get(url);
    // logger.info("url", url, makerTx.transcationId);
    if (isZksynclite(makerTx)) {
      if (res.data.status === "success" && Array.isArray(res.data.result.list)) {
        const list = res.data.result.list.filter((item) => {
          if (item.failReason !== null || item.op.type !== "Transfer") {
            return false;
          }
          if (BigNumber.from(makerTx.toAmount).eq(item.op.amount) && isMaker(item.op.from)) {
            return true;
          }
          return false;
        });
        return list;
      }
    } else {
      if (res.data.status === "1" && Array.isArray(res.data.result)) {
        const list = res.data.result.filter((item) => {
          if (BigNumber.from(makerTx.toAmount).eq(item.value) && isMaker(item.from)) {
            return true;
          }
          return false;
        });

        return list;
      }
    }
    throw new Error(`res error ${res.data.status}`);
  } catch (error) {
    logger.error("get scan data error", error);
    return undefined;
  }
};

const checkArbNova = async function (makerTx) {
  let list = []
  try {
    const txList = await arbNovaScan(makerTx.replyAccount, 200);
    txList.map(e => {
      const amountValid = e.amount === makerTx.toAmount
      if (amountValid) {
        list.push(e)
      }
    })
  } catch (error) {
    logger.error('scan nova error:', error)
  }
  return list
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
    let res:any = [];
    if (isStarknet(makerTx)) {
      res = await checkStarknetTx(makerTx)
    } else if (isZk2(makerTx)) {
      res = await checkZk2Tx(makerTx)
    } else if (isArbNova(makerTx)) {
      res = await checkArbNova(makerTx)
      // console.log('----res', makerTx.transcationId ,makerTx.replyAccount, makerTx.toAmount, res.length)
    } else {
      res = await checkOtherTx(makerTx)
    }

    if (res && res.length === 1) {
      const [data] = res;
      await makerTxModel.findOneAndUpdate(
        { id: makerTx.id },
        {
          $set: {
            matchedScanTx: {
              ...data,
              hash: data.hash ? data.hash : data._id,
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
    startFetch().finally(() => { fetching = false;logger.info(`end fetch: start:${start} end:${moment().format('YYYY-MM-DD HH:mm:ss')}`) })
  }, 30 * 1000)

  setInterval(() => {
    if (checking) {
      logger.info('checking')
      return
    }
    let start = moment().format('YYYY-MM-DD HH:mm:ss');
    logger.info(`start checking at ${start}`)
    checking = true
    startCheck().finally(() => { checking = false;logger.info(`end check start:${start} end:${moment().format('YYYY-MM-DD HH:mm:ss')}`) })
  }, 30 * 1000)

  setInterval(() => {
    if (matching) {
      logger.info('matching')
      return
    }
    let start = moment().format('YYYY-MM-DD HH:mm:ss');
    logger.info(`start matching at ${start}`)
    matching = true
    startMatch2().finally(() => { matching = false;logger.info(`end match start:${start} end: ${moment().format('YYYY-MM-DD HH:mm:ss')}`) })
  }, 30 * 1000)
}
// start()