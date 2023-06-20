import Router from 'koa-router'
import { Context } from 'koa'
import bluebird from 'bluebird'
import abnormalOutTransactionModel, {AbnormalOutTransaction} from '../model/abnormalOutTransaction'
import invalidTransactionModel, {InvalidTransaction} from '../model/invalidTransaction'
import * as constant from '../constant/index'
import {ethers} from 'ethers'
import mongoose from 'mongoose'
import logger from '../utils/logger'
import checkLogin from '../middleware/checkLogin'
import _ from 'lodash'
import { getScanDataByInvalidReceiveTransaction } from '../service/matchService/getScanDataByMakerTx';
const router = new Router({prefix: '/transaction'});

router.post('/invalidTransaction', async (ctx: Context) => {
    const param = ctx.request.body as any;
    let {
        current = 1,
        size = 10,
        startTime: start,
        endTime: end,
        state = 0,
        key,
        chainId,
        minAmount,
        maxAmount,
        symbol = '',
        filterAddressList
    } = param
    if (!filterAddressList) {
      filterAddressList = []
    }
    if (filterAddressList && !Array.isArray(filterAddressList)) {
      ctx.body = { code: 1, msg: 'Parameter error' };
      return
    }
    state = Number(state);
    size = Number(size)
    current = Number(current);
    symbol = String(symbol);
    if (!current || current <= 0) {
      current = 1;
    }
    const skip = (current - 1) * size;
    const where: any = {};
    if (filterAddressList.length > 0) {
      where.$and = [
        { from: { $nin: filterAddressList } }
      ]
    }
    if (start && end) {
        where['timestamp'] = {
          $gt: new Date(Number(start)),
          $lte: new Date(Number(end)),
        };
    }
    if (key) {
        if (/^\d+$/.test(String(key))) {
          where.id = { $eq: Number(key) };
        } else {
          where.$or = [
            { from:  { $eq: key } },
            { to:  { $eq: key } },
            { hash:  { $eq: key } },
            {'userLog.hash': key},
            {'userLog.hash': `sync-tx:${key}`},
            {'matchedTx.hash': key},
            {'matchedTx._id': key.replace(/0x0+/, '0x')},
            {'matchedTx.blockHash': key},
            {'matchedTx.txHash': key},
            {warnTxList: { $in: [key] }},
            {warnTxList: { $in: [key.replace(/0x0+/, '0x')] }},
          ]
        }
    }

    if (state === constant.invalidTransactionState.noMatched) {
        where.matchStatus = { $eq: 'init' }
        where.confirmStatus = { $eq: 'noConfirm' }
    } else if (state === constant.invalidTransactionState.matched) {
        where.matchStatus = { $eq: 'matched' }
    } else if (state === constant.invalidTransactionState.replyByAdmin) {
      where.matchStatus = { $eq: 'init' }
      where.confirmStatus = { $eq: constant.invalidTransactionConfirmStatus.replyByAdmin }
    } else if (state === constant.invalidTransactionState.multiMatched) {
        where.matchStatus = { $eq: 'warning' }
    } else if (state === constant.invalidTransactionState.successByAdmin) {
        where.matchStatus = { $nin: ['matched', 'warning'] }
        where.confirmStatus = {
            $eq: constant.invalidTransactionConfirmStatus.successByAdmin
        };
    } else if (state === constant.invalidTransactionState.autoReply) {
        where.matchStatus = { $nin: ['matched', 'warning'] }
        where.confirmStatus = {
            $eq: constant.invalidTransactionConfirmStatus.autoReply
        };
    } else if (state === constant.invalidTransactionState.ignoreByAdmin) {
        where.matchStatus = { $nin: ['matched', 'warning'] }
        where.confirmStatus = {
            $eq: constant.invalidTransactionConfirmStatus.ignoreByAdmin
        };
    }
    if (chainId) {
        where.chainId = { $eq: Number(chainId) }
    }
    if (symbol) {
        where['symbol'] = { $eq: symbol }
    }
    if (constant.decimalMap[symbol] && (minAmount || maxAmount)) {
      where['symbol'] = { $eq: symbol }
      if (minAmount) {
        minAmount = ethers.utils.parseUnits(String(minAmount), constant.decimalMap[symbol]).toString()
        where.numberToAmount = { $gte: mongoose.Types.Decimal128.fromString(minAmount) }
      } 
      if (maxAmount) {
        maxAmount = ethers.utils.parseUnits(String(maxAmount), constant.decimalMap[symbol]).toString()
        if (!minAmount) {
          where.numberToAmount = { $lte: mongoose.Types.Decimal128.fromString(maxAmount) }
        } else {
          where.numberToAmount = { ...where.numberToAmount, $lte: mongoose.Types.Decimal128.fromString(maxAmount) }
        }
      }
    }
    logger.info(JSON.stringify(where));
    const aggregate = [
        {
          "$addFields": { "numberToAmount": { $convert: { input: "$value", "to":"decimal", "onError": 0 } } }
        },
        {
          $match: where
        },
    ]
    const docs = await invalidTransactionModel.aggregate([
        ...aggregate,
        {
          $sort: { timestamp: -1 }
        },
        {
          $skip: skip,
        },
        {
          $limit: Number(size)
        }
    ])
    const r = await invalidTransactionModel.aggregate([
        ...aggregate,
        {
          $count: "count"
        },
    ])
    const count = r[0]?.count || 0
    await bluebird.map(docs, async (doc: InvalidTransaction & { value2: string, state: number }) => {
        doc.value2 = ethers.utils.formatUnits(doc.value, constant.decimalMap[doc.symbol]).toString()
        if (doc.matchStatus === 'init' && doc.confirmStatus === constant.invalidTransactionConfirmStatus.noConfirm) {
            doc.state = constant.invalidTransactionState.noMatched
        } else if (doc.matchStatus === 'matched') {
            doc.state = constant.invalidTransactionState.matched
        } else if (doc.matchStatus === 'warning') {
            doc.state = constant.invalidTransactionState.multiMatched
        } else if (doc.confirmStatus === constant.invalidTransactionConfirmStatus.autoReply) {
            doc.state = constant.invalidTransactionState.autoReply
        } else if (doc.confirmStatus === constant.invalidTransactionConfirmStatus.successByAdmin) {
            doc.state = constant.invalidTransactionState.successByAdmin
        } else if (doc.confirmStatus === constant.invalidTransactionConfirmStatus.ignoreByAdmin) {
            doc.state = constant.invalidTransactionState.ignoreByAdmin
        } else if (doc.confirmStatus === constant.invalidTransactionConfirmStatus.replyByAdmin) {
            doc.state = constant.invalidTransactionState.replyByAdmin
        }
    })
    ctx.body = { data: docs, pages: current, code: 0, size, total: count };
    return
})

router.post('/abnormalOutTransaction', async (ctx: Context) => {
    const param = ctx.request.body as any;
    let {
        current = 1,
        size = 10,
        startTime: start,
        endTime: end,
        key,
        chainId,
        minAmount,
        maxAmount,
        symbol = '',
        filterAddressList,
        state,
    } = param
    if (filterAddressList && !Array.isArray(filterAddressList)) {
      ctx.body = { code: 1, msg: 'Parameter error' };
      return
    }
    state = Number(state)
    size = Number(size)
    current = Number(current);
    symbol = String(symbol);
    if (!current || current <= 0) {
      current = 1;
    }
    const skip = (current - 1) * size;
    const where: any = {
      $and: []
    };
    if (state === constant.abnormalOutTransactionState.noConfirm) {
      where.$and.push({
        $or: [
          { confirmStatus: { $exists: false } },
          { confirmStatus: constant.abnormalOutTransactionConfirmStatus.noConfirm }
        ]
      })
    } else if (state === constant.abnormalOutTransactionState.successByAdmin) {
      where.$and.push({
        $or: [
          { confirmStatus: constant.abnormalOutTransactionConfirmStatus.successByAdmin }
        ]
      })
    } else if (state === constant.abnormalOutTransactionState.failByAdmin) {
      where.$and.push({
        $or: [
          { confirmStatus: constant.abnormalOutTransactionConfirmStatus.failByAdmin }
        ]
      })
    }
    if (filterAddressList && filterAddressList.length > 0) {
      where.$and.push({ to: { $nin: filterAddressList } })
    }
    if (start && end) {
        where['timestamp'] = {
          $gt: new Date(Number(start)),
          $lte: new Date(Number(end)),
        };
    }
    if (key) {
        if (/^\d+$/.test(String(key))) {
          where.id = { $eq: Number(key) };
        } else {
          where.$or = [
            { from:  { $eq: key } },
            { to:  { $eq: key } },
            { hash:  { $eq: key } }
          ]
        }
    }
    if (chainId) {
        where.chainId = { $eq: Number(chainId) }
    }
    if (symbol) {
        where['symbol'] = { $eq: symbol }
    }
    if (constant.decimalMap[symbol] && (minAmount || maxAmount)) {
      where['symbol'] = { $eq: symbol }
      if (minAmount) {
        minAmount = ethers.utils.parseUnits(String(minAmount), constant.decimalMap[symbol]).toString()
        where.numberToAmount = { $gte: mongoose.Types.Decimal128.fromString(minAmount) }
      } 
      if (maxAmount) {
        maxAmount = ethers.utils.parseUnits(String(maxAmount), constant.decimalMap[symbol]).toString()
        if (!minAmount) {
          where.numberToAmount = { $lte: mongoose.Types.Decimal128.fromString(maxAmount) }
        } else {
          where.numberToAmount = { ...where.numberToAmount, $lte: mongoose.Types.Decimal128.fromString(maxAmount) }
        }
      }
    }
    if (where.$and && where.$and.length < 1) {
      delete where.$and
    } 
    logger.info(JSON.stringify(where));
    const aggregate = [
        {
          "$addFields": { "numberToAmount": { $convert: { input: "$value", "to":"decimal", "onError": 0 } } }
        },
        {
          $match: where
        },
    ]
    const docs = await abnormalOutTransactionModel.aggregate([
        ...aggregate,
        {
          $sort: { timestamp: -1 }
        },
        {
          $skip: skip,
        },
        {
          $limit: Number(size)
        }
    ])
    const r = await abnormalOutTransactionModel.aggregate([
        ...aggregate,
        {
          $count: "count"
        },
    ])
    const count = r[0]?.count || 0
    docs.forEach(item => {
      if (!item.confirmStatus || item.confirmStatus === constant.abnormalOutTransactionConfirmStatus.noConfirm) {
        item.state = constant.abnormalOutTransactionState.noConfirm
      } else if (item.confirmStatus === constant.abnormalOutTransactionConfirmStatus.successByAdmin) {
        item.state = constant.abnormalOutTransactionState.successByAdmin
      } else if (item.confirmStatus === constant.abnormalOutTransactionConfirmStatus.failByAdmin){
        item.state = constant.abnormalOutTransactionState.failByAdmin
      }
    })
    ctx.body = { data: docs, pages: current, code: 0, size, total: count };
})


router.post('/submit', checkLogin, async (ctx: Context) => {
    const body: any = ctx.request.body;
    let { txIds, hash, signature } = body;
    const status = +body.status as constant.invalidTransactionSubmitStatus
    const { uid, name, role } = ctx as any;
    if (!txIds || (Array.isArray(txIds) && txIds.length < 1) || ![0,1,2,3,4].includes(status) || (!signature && status === 2) || (status === 1 && !hash)) {
        ctx.body = { code: 1, msg: 'Parameter error' };
        return;
    }
    if (!Array.isArray(txIds)) {
        txIds = [txIds]
    }
    if (![3,4].includes(status) && txIds.length > 1) {
        ctx.body = { code: 1, msg: 'Unable to operate Multiple transaction unless ignoreByAdmin or replyByAdmin' };
        return
    }
    txIds = _.uniq(txIds)
    const txList = await invalidTransactionModel.find({
        id: { $in: txIds }
    });
    if (txList.length !== txIds.length) {
        ctx.body = { code: 1, msg: 'Someone transactions do not exist' };
        return;
    }
    for (const tx of txList) {
        if (tx.matchStatus === 'matched') {
            ctx.body = { code: 1, msg: 'Unable to operate a successful transaction' };
            return;
        }
    }
    let confirmStatus;
    switch(status) {
        case 0: confirmStatus = constant.invalidTransactionConfirmStatus.noConfirm;break;
        case 1: confirmStatus = constant.invalidTransactionConfirmStatus.successByAdmin;break;
        case 2: confirmStatus = constant.invalidTransactionConfirmStatus.autoReply;break; // not auto reply
        case 3: confirmStatus = constant.invalidTransactionConfirmStatus.ignoreByAdmin;break;
        case 4: confirmStatus = constant.invalidTransactionConfirmStatus.replyByAdmin;break;
    }
    const userLog = { uid, name, hash, updateStatus: status, role, updateTime: new Date() };
    const updateData:any = { confirmStatus, userLog }
    if (status === 2) {
        updateData.signature = signature;
    }
    await bluebird.map(txIds, async (id) => {
        logger.info(`submit update, id: ${id}, updateData:${JSON.stringify(updateData)}`)
        await invalidTransactionModel.updateOne({
            id: id,
        }, { $set: updateData })
    }, { concurrency: 2 });
    ctx.body = { code: 0, msg: 'success' };
})

router.get('/userReceiveTxList', async (ctx: Context) => {
    const result = {
        code: 0,
        data: [],
      }
      ctx.body = result
      const { txId } = ctx.query;
      const invalidTx = await invalidTransactionModel.findOne({ id: txId })
      if (!invalidTx) {
        return;
      }
      const time = new Date(invalidTx.timestamp).getTime();
      let list = await getScanDataByInvalidReceiveTransaction(invalidTx, time)
      result.data = list
      return
})

router.post('/abnormalOutTransaction/submit', checkLogin, async (ctx: Context) => {
  const body: any = ctx.request.body;
  let { txIds, hash, chainId } = body;
  const status = +body.status as constant.abnormalOutTransactionSubmitStatus
  const { uid, name, role } = ctx as any;
  if (!txIds || (Array.isArray(txIds) && txIds.length < 1) || ![0,1,2].includes(status) || (status === 1 && (!hash || !chainId))) {
      ctx.body = { code: 1, msg: 'Parameter error' };
      return;
  }
  if (!Array.isArray(txIds)) {
    txIds = [txIds]
  }
  txIds = _.uniq(txIds)
  const txList = await abnormalOutTransactionModel.find({
        id: { $in: txIds }
  });
  if (txList.length !== txIds.length) {
      ctx.body = { code: 1, msg: 'Someone transactions do not exist' };
      return;
  }
  let confirmStatus;
  switch(status) {
      case 0: confirmStatus = constant.abnormalOutTransactionConfirmStatus.noConfirm;break;
      case 1: confirmStatus = constant.abnormalOutTransactionConfirmStatus.successByAdmin;break;
      case 2: confirmStatus = constant.abnormalOutTransactionConfirmStatus.failByAdmin;break; // not auto reply
  }
  const userLog = { uid, name, hash, chainId, updateStatus: status, role, updateTime: new Date() };
  const updateData:any = { confirmStatus, userLog }
  await bluebird.map(txIds, async (id) => {
      logger.info(`submit update, id: ${id}, updateData:${JSON.stringify(updateData)}`)
      await abnormalOutTransactionModel.updateOne({
          id: id,
      }, { $set: updateData })
  }, { concurrency: 2 });
  ctx.body = { code: 0, msg: 'success' };
})

router.post('/abnormalOutTransaction/statistic', async (ctx: Context) => {
  const param = ctx.request.body as any;
  let {
      startTime: start,
      endTime: end,
      chainId,
      filterAddressList,
  } = param
  if (filterAddressList && !Array.isArray(filterAddressList)) {
    ctx.body = { code: 1, msg: 'Parameter error' };
    return
  }
  const where: any = {
    $and: []
  }
  if (filterAddressList && filterAddressList.length > 0) {
    where.$and.push({ to: { $nin: filterAddressList } })
  }
  if (start && end) {
    where['timestamp'] = {
      $gt: new Date(Number(start)),
      $lte: new Date(Number(end)),
    };
}
  if (chainId) {
    where.chainId = { $eq: Number(chainId) }
  }
  logger.info(JSON.stringify(where))
  const noConfirmWhere = _.cloneDeep(where)
  const successByAdminWhere = _.cloneDeep(where)
  const failByAdminWhere = _.cloneDeep(where)
  noConfirmWhere.$and.push({
    $or: [
      { confirmStatus: { $exists: false } },
      { confirmStatus: constant.abnormalOutTransactionConfirmStatus.noConfirm }
    ]
  })
  successByAdminWhere.$and.push({
    $or: [
      { confirmStatus: constant.abnormalOutTransactionConfirmStatus.successByAdmin }
    ]
  })
  failByAdminWhere.$and.push({
    $or: [
      { confirmStatus: constant.abnormalOutTransactionConfirmStatus.failByAdmin }
    ]
  })
  const { noConfirmCountResult, successByAdminCountResult, failByAdminCountResult } = await bluebird.props({
    noConfirmCountResult: abnormalOutTransactionModel.count(noConfirmWhere),
    successByAdminCountResult: abnormalOutTransactionModel.count(successByAdminWhere),
    failByAdminCountResult: abnormalOutTransactionModel.count(failByAdminWhere),
  })
  const result = await bluebird.map([noConfirmWhere, successByAdminWhere, failByAdminWhere], async where => {
    if (where.$and && where.$and.length < 1) {
      delete where.$and
    } 
    let r =await abnormalOutTransactionModel.aggregate([
      {
        $match: where
      },
      {
        $addFields: { "numberToAmount": { $convert: { input: "$value", "to":"decimal", "onError": 0 } } }
      },
      {
          $group: { _id : "$symbol", "count2":{"$sum": "$numberToAmount"} }
      },
      {
          $addFields: { "count": { $convert: { input: "$count2", "to":"string", "onError": 0 } } }
      }
    ])
    return r 
  })
  let noConfirmAmount = {}
  let successByAdminAmount = {}
  let failByAdminAmount = {}
  if (result[0] && result[0].length) {
    for (const item of result[0]) {
      if (!item._id) {
        continue
      }
      noConfirmAmount[item._id] = parseFloat(ethers.utils.formatUnits(item.count.toString(), constant.decimalMap[item._id] || 18)).toFixed(2)
    }
  }
  if (result[1] && result[1].length) {
    for (const item of result[1]) {
      if (!item._id) {
        continue
      }
      successByAdminAmount[item._id] = parseFloat(ethers.utils.formatUnits(item.count.toString(), constant.decimalMap[item._id] || 18)).toFixed(2)
    }
  }
  if (result[2] && result[2].length) {
    for (const item of result[2]) {
      if (!item._id) {
        continue
      }
      failByAdminAmount[item._id] = parseFloat(ethers.utils.formatUnits(item.count.toString(), constant.decimalMap[item._id] || 18)).toFixed(2)
    }
  }
  ctx.body = {
    data: {
      noConfirmCount: noConfirmCountResult,
      successByAdminCount: successByAdminCountResult,
      failByAdminCount: failByAdminCountResult,
      noConfirmAmount,
      successByAdminAmount,
      failByAdminAmount
    },
    code: 0
  }
})

export default router;