import Router from 'koa-router'
import { Context } from 'koa'
import bluebird from 'bluebird'
import abnormalOutTransactionModel, {AbnormalOutTransaction} from '../model/abnormalOutTransaction'
import invalidTransactionModel, {InvalidTransaction} from '../model/invalidTransaction'
import * as constant from '../constant/index'
import {ethers} from 'ethers'
import mongooseLong from 'mongoose-long'
import mongoose from 'mongoose'
import logger from '../utils/logger'
mongooseLong(mongoose)

const router = new Router({prefix: '/transaction'});

router.get('/invalidTransaction', async (ctx: Context) => {
    const param = ctx.query;
    let {
        current = 1,
        size = 10,
        startTime: start,
        endTime: end,
        state = 0,
        key,
        fromChainId,
        toChainId,
        minAmount,
        maxAmount,
        symbol = ''
    } = param
    state = Number(state);
    size = Number(size)
    current = Number(current);
    symbol = String(symbol);
    if (!current || current <= 0) {
      current = 1;
    }
    const skip = (current - 1) * size;
    const where: any = {};
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
    } else if (state === constant.invalidTransactionState.matched) {
        where.matchStatus = { $eq: 'matched' }
    } else if (state === constant.invalidTransactionState.multiMatched) {
        where.matchStatus = { $eq: 'warning' }
    }
    if (toChainId) {
        where.toChain = { $eq: toChainId }
    }
    if (fromChainId) {
        where.fromChain = { $eq: fromChainId }
    }
    if (symbol) {
        where['symbol'] = { $eq: symbol }
    }
    if (constant.decimalMap[symbol] && (minAmount || maxAmount)) {
        where['symbol'] = { $eq: symbol }
        if (minAmount) {
          minAmount = ethers.utils.parseUnits(String(minAmount), constant.decimalMap[symbol]).toString()
          where.numberToAmount = { $gte: mongoose.Types.Long.fromString(minAmount) }
        //   where.value = { $gte: minAmount }
        } 
        if (maxAmount) {
          maxAmount = ethers.utils.parseUnits(String(maxAmount), constant.decimalMap[symbol]).toString()
          if (!minAmount) {
            where.numberToAmount = { $lte: mongoose.Types.Long.fromString(maxAmount) }
            // where.value = { lte: maxAmount }
          } else {
            where.numberToAmount = { ...where.numberToAmount, $lte: mongoose.Types.Long.fromString(maxAmount) }
            // where.value = { ...where.value, $lte: maxAmount }

          }
        }
    }

    logger.info(JSON.stringify(where));
    const aggregate = [
        {
          "$addFields": { "numberToAmount": { $convert: { input: "$value", "to":"long", "onError": 0 } } }
        },
        {
          $match: where
        },
    ]
    console.log(JSON.stringify(aggregate, undefined, '\t'))
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
    await bluebird.map(docs, async (doc: InvalidTransaction & { value2: string }) => {
        doc.value2 = ethers.utils.formatUnits(doc.value, constant.decimalMap[doc.symbol]).toString()
    })
    ctx.body = { data: docs, pages: current, code: 0, size, total: count };
    return
})

router.get('/abnormalOutTransaction', async (ctx: Context) => {
    const param = ctx.query;
    let {
        current = 1,
        size = 10,
        startTime: start,
        endTime: end,
        key,
        fromChainId,
        toChainId,
        minAmount,
        maxAmount,
        symbol
    } = param
    size = Number(size)
    current = Number(current);
    symbol = String(symbol);
    if (!current || current <= 0) {
      current = 1;
    }
    const skip = (current - 1) * size;
    const where: any = {};
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
    if (toChainId) {
        where.toChain = { $eq: toChainId }
    }
    if (fromChainId) {
        where.fromChain = { $eq: fromChainId }
    }
    if (symbol) {
        where['symbol'] = { $eq: symbol }
    }
    if (constant.decimalMap[symbol] && (minAmount || maxAmount)) {
        where['symbol'] = { $eq: symbol }
        if (minAmount) {
          minAmount = ethers.utils.parseUnits(String(minAmount), constant.decimalMap[symbol]).toString()
          where.numberToAmount = { $gte: mongoose.Types.Long.fromString(minAmount) }
        } 
        if (maxAmount) {
          maxAmount = ethers.utils.parseUnits(String(maxAmount), constant.decimalMap[symbol]).toString()
          if (!minAmount) {
            where.numberToAmount = { $lte: mongoose.Types.Long.fromString(maxAmount) }
          } else {
            where.numberToAmount = { ...where.numberToAmount, $lte: mongoose.Types.Long.fromString(maxAmount) }
          }
        }
    }

    logger.info(JSON.stringify(where));
    const aggregate = [
        {
          "$addFields": { "numberToAmount": { $convert: { input: "$value", "to":"long", "onError": 0 } } }
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

export default router;