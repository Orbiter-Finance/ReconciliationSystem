
import Router from 'koa-router'
import fakerMakerTx from '../model/fakerMakerTx'
import makerTx from '../model/failMakerTransaction'
import bluebird from 'bluebird'
import moment from 'moment'
import dashbroddb from '../model/dashbroddb'
import * as constant from '../constant/index'
import { getFormatDate } from '../utils/index'
import mongoose from 'mongoose'
import logger from '../utils/logger'
import mongooseLong from 'mongoose-long'
mongooseLong(mongoose)
import {ethers} from 'ethers'
import getUrl from '../utils/getScanUrl'
import * as is from '../utils/is'
import axios from 'axios'
import starknetTxModel from '../model/starknetTx'
import { BigNumber } from '@ethersproject/bignumber'
import isMaker from '../utils/isMaker'
import remarkModel from '../model/remark'
import zksyncliteTxModel from '../model/zksynceraTx'
import arbNovaScan from '../utils/scanNova'
import { getScanDataByMakerTx } from '../service/matchService/getScanDataByMakerTx'
import { IDoneCallbackBody } from '../constant/type'
const router = new Router();

router.get("/newlist", async (ctx) => {
  let {
    current = 1,
    size = 10,
    fromTxHash,
    startTime: start,
    endTime: end,
    makerAddress,
    state = 0,
    transactionId,
    fromChainId,
    toChainId,
    minAmount,
    maxAmount,
    symbol = 'ETH'
  } = ctx.query;
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
    where['inData.timestamp'] = {
      $gt: new Date(Number(start)),
      $lte: new Date(Number(end)),
    };
  }
  if (transactionId) {
    if (/^\d+$/.test(String(transactionId))) {
      where.inId = { $eq: Number(transactionId) };
    } else {
      where.$or = [
        { transcationId: { $eq: transactionId } },
        { replyAccount:  { $eq: transactionId } },
        { 'inData.hash':  { $eq: transactionId } }
      ]
    }
  }
  if (state === constant.state.successByMatched) {
    where.status = {
      $eq: "matched",
    };
  } else if (state === constant.state.successByAdmin) {
    where.confirmStatus = {
      $eq: constant.confirmStatus.successByAdmin,
    };
  } else if (state === constant.state.failByAdmin) {
    where.status = { $nin: ["matched", "warning"] };
    where.confirmStatus = {
      $eq: constant.confirmStatus.failByAdmin,
    };
  } else if (state === constant.state.failByMulti) {
    where.$and = [
      { status: "warning" },
      {
        confirmStatus: {
          $nin: [
            constant.confirmStatus.failByAdmin,
            constant.confirmStatus.successByAdmin,
            constant.confirmStatus.doubtByAdmin,
          ],
        },
      },
    ];
  } else if (state === constant.state.doubtByAdmin) {
    where.$and = [
      { status: { $nin: ["matched", "warning"] } },
      { 
        confirmStatus: { $eq: constant.confirmStatus.doubtByAdmin }
      }
    ]
  } else if (state === constant.state.failByUnknown) {
    where.$and = [
      { status: { $nin: ["matched", "warning"] } },
      {
        confirmStatus: {
          $nin: [
            constant.confirmStatus.failByAdmin,
            constant.confirmStatus.successByAdmin,
            constant.confirmStatus.doubtByAdmin,
            constant.confirmStatus.failByAdminAndAutoReply,
          ],
        },
      },
    ];
  } else if (state === constant.state.failByAdminAndAutoReply) {
    where.$and = [
      { status: { $nin: ["matched", "warning"] } },
      {
        confirmStatus: { $eq: constant.confirmStatus.failByAdminAndAutoReply }
      }
    ]
  }
  if (toChainId) {
    where.toChain = { $eq: toChainId }
  }
  if (fromChainId) {
    where.fromChain = { $eq: fromChainId }
  }
  if (symbol) {
    where['inData.extra.toSymbol'] = { $eq: symbol }
  }
  if (constant.decimalMap[symbol] && (minAmount || maxAmount)) {
    where['inData.extra.toSymbol'] = { $eq: symbol }
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
      "$addFields": { "numberToAmount": { $convert: { input: "$toAmount", "to":"long", "onError": 0 } } }
    },
    {
      $match: where
    },
  ]
  const docs = await makerTx.aggregate([
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
  const r = await makerTx.aggregate([
    ...aggregate,
    {
      $count: "count"
    },
  ])
  const count = r[0]?.count || 0
  // const docs = await makerTx.find(where).sort({ createdAt: -1 }).skip(skip).limit(size).lean();
  // const count = await makerTx.count(where);
  await bluebird.map(
    docs,
    async (doc: any) => {
      // format state

      let state = constant.state.failByUnknown; // default fail
      const status = doc.status;
      const confirmStatus = doc.confirmStatus;
      if (status === "matched") {
        state = constant.state.successByMatched;
      } else {
        if (confirmStatus === constant.confirmStatus.successByAdmin) {
          state = constant.state.successByAdmin;
        } else if (confirmStatus === constant.confirmStatus.failByAdmin) {
          state = constant.state.failByAdmin;
        } else if (confirmStatus === constant.confirmStatus.failByAdminAndAutoReply) {
          state = constant.state.failByAdminAndAutoReply;
        } else if (confirmStatus === constant.confirmStatus.doubtByAdmin) {
          state = constant.state.doubtByAdmin;
        } else if (status === "warning") {
          state = constant.state.failByMulti;
        }
      }
      doc.state = state;

      doc.createdAt = getFormatDate(doc.createdAt);
      doc.updatedAt = getFormatDate(doc.updatedAt);

      // find user tx

      // const inId = doc.inId;
      // const sql = `SELECT * FROM transaction WHERE id = ${inId}`;
      // const [r] = await dashbroddb.query(sql);
      // if (r.length) {
      //   doc.inData = r[0];
      // }
      if (doc.inData?.timestamp) doc.inData.timestamp = getFormatDate(doc.inData.timestamp, 0);
      if (doc.inData?.createdAt) doc.inData.createdAt = getFormatDate(doc.inData.createdAt);
      const list = await remarkModel.find({ transactionId: doc.transcationId }).sort({ createdAt: -1 }).lean();
      doc.remarkList = list;
    },
    { concurrency: 10 }
  );
  ctx.body = { data: docs, pages: current, code: 0, size, total: count };
});

router.get("/notMatchMakerTxList", async (ctx) => {
  let {
    current = 1,
    size = 10,
    startTime: start,
    endTime: end,
    makerAddress,
    state,
    chain,
  } = ctx.query;
  state = String(state)
  size = Number(size)
  current = Number(current);
  if (!current || current <= 0) {
    current = 1;
  }

  const skip = (current - 1) * size;
  let bind_status = ["Error", "multi", "too_old"];
  if (["Error", "multi", "too_old"].includes(state)) {
    bind_status = [state];
  }
  const where: any = { bind_status: { $in: bind_status } };
  if (makerAddress) {
    where.fake_maker_address = makerAddress;
  }
  if (chain && constant.chainDesc.includes(String(chain))) {
    where.tx_env = { $eq: chain };
  }
  const txList = await fakerMakerTx.find(where).sort({ timestamp: -1 }).skip(skip).limit(size).lean();
  const count = await fakerMakerTx.count(where);
  ctx.body = { data: txList, pages: current, code: 0, size, total: count };
});

router.get("/statistic", async (ctx) => {
  let {
    startTime: start,
    endTime: end,
    fromChainId,
    toChainId
  } = ctx.query;
  const where: any = {};
  if (start && end) {
    where['inData.timestamp'] = {
      $gt: new Date(Number(start)),
      $lte: new Date(Number(end)),
    };
  }
  if (toChainId) {
    where.toChain = { $eq: toChainId }
  }
  if (fromChainId) {
    where.fromChain = { $eq: fromChainId }
  }
  const successByMatchedWhere = { ...where, status: { $eq: "matched" } };
  const successByAdminCountWhere = {
    ...where,
    // status: { $nin: ["matched", "warning"] },
    confirmStatus: { $eq: constant.confirmStatus.successByAdmin },
  };
  const failByAdminCountWhere = {
    ...where,
    status: { $nin: ["matched", "warning"] },
    confirmStatus: { $in: [constant.confirmStatus.failByAdmin, constant.confirmStatus.failByAdminAndAutoReply] },
  };
  delete successByAdminCountWhere['inData.timestamp'] // ignore time
  delete failByAdminCountWhere['inData.timestamp'] // ignore time
  const failByMultiAnd = [
    { status: "warning" },
    {
      confirmStatus: {
        $nin: [
          constant.confirmStatus.failByAdmin,
          constant.confirmStatus.failByAdminAndAutoReply,
          constant.confirmStatus.successByAdmin,
          constant.confirmStatus.doubtByAdmin,
        ],
      },
    },
  ];
  const failByMultiCountWhere = { ...where, $and: failByMultiAnd };
  let failByUnknownAnd = [
    { status: { $nin: ["matched", "warning"] } },
    {
      confirmStatus: {
        $nin: [
          constant.confirmStatus.failByAdmin,
          constant.confirmStatus.failByAdminAndAutoReply,
          constant.confirmStatus.successByAdmin,
          constant.confirmStatus.doubtByAdmin,
        ],
      },
    },
  ];
  const failByUnknownCountWhere = { ...where, $and: failByUnknownAnd };
  let doubtByAdminAnd = [
    { status: { $nin: ["matched", "warning"] } },
    {
      confirmStatus: {
        $eq: constant.confirmStatus.doubtByAdmin,
      },
    },
  ];
  const doubtByAdminCountWhere = {...where, $and: doubtByAdminAnd }
  const tasks = [
    successByMatchedWhere,
    successByAdminCountWhere,
    failByAdminCountWhere,
    failByMultiCountWhere,
    failByUnknownCountWhere,
    doubtByAdminCountWhere,
  ];
  const [
    successByMatchedCount,
    successByAdminCount,
    failByAdminCount,
    failByMultiCount,
    failByUnknownCount,
    doubtByAdminCount,
  ] = await bluebird.map(
    tasks,
    async (task) => {
      const count = await makerTx.count(task);
      return count;
    },
    { concurrency: 3 }
  );
  const result = await makerTx.aggregate([
    {
      $match: failByUnknownCountWhere
    },
    {
      $addFields: { "numberToAmount": { $convert: { input: "$toAmount", "to":"long", "onError": 0 } } }
    },
    {
        $group: { _id : "$inData.extra.toSymbol", "count2":{"$sum": "$numberToAmount"} }
    },
    {
        $addFields: { "count": { $convert: { input: "$count2", "to":"string", "onError": 0 } } }
    }
  ])
  const pendingPay = {}
  if (result.length) {
    result.map(e => {
      pendingPay[e._id] = ethers.utils.formatUnits(parseFloat(e.count).toString(), constant.decimalMap[e._id] || 18)
    })
  }
  ctx.body = {
    data: {
      successByMatchedCount,
      successByAdminCount,
      failByAdminCount,
      failByMultiCount,
      failByUnknownCount,
      doubtByAdminCount,
      pendingPay
    },
    code: 0,
  };
});


router.get("/userTxList", async (ctx) => {
  const result = {
    code: 0,
    data: [],
  }
  ctx.body = result
  const { transactionId } = ctx.query;
  const failTx = await makerTx.findOne({ transcationId: transactionId  })
  if (!failTx) {
    return;
  }
  const failTxTime = new Date(failTx.inData.timestamp).getTime();
  let flist = await getScanDataByMakerTx(failTx, failTxTime)
  result.data = flist
  return
})

router.get('/failByAdminList', async (ctx) => {
  let { endTime, sid, size = 20 } = ctx.query;
  const result = { code: 0, msg: '', data: [], sid: 0 }
  size = parseInt(String(size))
  const limit = size + 1
  if (!size) {
    result.code = 1;
    result.msg = 'Parameter error'
    ctx.body = result;
    return
  }
  const where:any = {
    status: { $nin: ['matched', 'warning'] },
    confirmStatus: { $eq: constant.confirmStatus.failByAdminAndAutoReply },
    signature: { $exists: true },
    autoReplyStatus: { $exists: true, $eq: 'init' }
  }
  if (endTime) {
    where['inData.timestamp'] = {
      $lte: new Date(Number(endTime)),
    }
  }
  if (sid) {
    where.id = { $gt: Number(sid) }
  }
  logger.info(JSON.stringify(where))
  const list = await makerTx.find(where).sort({ id: 1 }).limit(limit);
  result.data = list;
  if (list.length >= limit) {
    result.data = list.slice(0, list.length -1)
    result.sid = result.data[result.data.length - 1].id;
  }
  ctx.body = result
})

router.post('/autoReplyCallback', async (ctx) => {
  const body = ctx.request.body as IDoneCallbackBody;
  const result = { code: 0, data: {}, msg: '' }
  ctx.body = result
  let {
    transactionId,
    status,
    hash,
    failMessage
  } = body
  logger.info(`autoReplyCallback, body: ${JSON.stringify(body)}`)
  if (!transactionId || (status !== 'fail' && status !== 'success')  || (status === 'success' && !hash) || (status === 'fail' && !failMessage)) {
    result.code = 1
    result.msg = 'Parameter error'
    return
  }
  const where = {
    transcationId: transactionId,
    confirmStatus: constant.confirmStatus.failByAdminAndAutoReply
  }
  const tx = await makerTx.findOne(where);
  if (!tx) {
    result.code = 1
    result.msg = 'Transaction not found'
    return 
  }
  const updateData: any = {}
  if (status === 'success') {
    updateData.autoReplyHash = hash;
    updateData.autoReplyStatus = 'success'
    updateData.status = constant.failMakerTransactionStatus.matched; 
  } else {
    updateData.autoReplyStatus = 'fail'
    updateData.autoReplyFailMsg = failMessage
  }
  logger.info(`autoReplyCallback, where:${JSON.stringify(where)}, updateData:${JSON.stringify(updateData)}`)
  await makerTx.findOneAndUpdate(where, { $set: updateData })
  ctx.body = result
})

export default router;
