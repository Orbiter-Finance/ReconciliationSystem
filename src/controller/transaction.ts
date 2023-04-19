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
          where.inId = { $eq: Number(key) };
        } else {
          where.$or = [
            { from:  { $eq: key } },
            { to:  { $eq: key } },
            { hash:  { $eq: key } }
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
      where.confirmStatus = { $eq: constant.invalidTransactionState.replyByAdmin }
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
          $sort: { createdAt: -1 }
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
        filterAddressList
    } = param
    if (filterAddressList && !Array.isArray(filterAddressList)) {
      ctx.body = { code: 1, msg: 'Parameter error' };
      return
    }
    size = Number(size)
    current = Number(current);
    symbol = String(symbol);
    if (!current || current <= 0) {
      current = 1;
    }
    const skip = (current - 1) * size;
    const where: any = {};
    if (filterAddressList && filterAddressList.length > 0) {
      where.$and = [
        { to: { $nin: filterAddressList } }
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
          where.inId = { $eq: Number(key) };
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
          $sort: { createdAt: -1 }
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


export default router;