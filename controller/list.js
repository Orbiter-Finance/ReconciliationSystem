const Router = require("koa-router");

const db = require("../model/index");
const fakerMakerTx = require("../model/fakerMakerTx");
const makerTx = require("../model/failMakerTransaction");
const txServices = require("../mock/txServices");
const bluebird = require("bluebird");
const _ = require("lodash");
const moment = require("moment");
const pairTable = require("../target.json");
const router = new Router();
const dashbroddb = require("../model/dashbroddb");
const constant = require('../constant');
const { getFormatDate } = require("../utils/index");
const mongoose = require('mongoose');
const logger = require("../utils/logger");
require('mongoose-long')(mongoose);
const ethers = require('ethers')
const getUrl = require('../utils/getScanUrl')
const is = require('../utils/is')
const axios = require('axios')
const starknetTxModel = require("../model/starknetTx");
const { BigNumber } = require("@ethersproject/bignumber");
const isMaker = require("../utils/isMaker");
const remarkModel = require('../model/remark')
const zksyncliteTxModel = require("../model/zksyncliteTx");
const arbNovaScan = require('../utils/scanNova')

router.get("/newlist", async (ctx) => {
  let {
    current = 1,
    size = 10,
    fromTxHash,
    startTime: start,
    endTime: end,
    makerAddress,
    state,
    transactionId,
    fromChainId,
    toChainId,
    minAmount,
    maxAmount,
    symbol = 'ETH'
  } = ctx.query;
  current = Number(current);
  if (!current || current <= 0) {
    current = 1;
  }
  const skip = (current - 1) * size;
  const where = {};
  if (start && end) {
    where['inData.timestamp'] = {
      $gt: new Date(Number(start)),
      $lte: new Date(Number(end)),
    };
  }
  if (transactionId) {
    if (/^\d+$/.test(transactionId)) {
      where.inId = { $eq: Number(transactionId) };
    } else {
      where.$or = [
        { transcationId: { $eq: transactionId } },
        { replyAccount:  { $eq: transactionId } },
        { 'inData.hash':  { $eq: transactionId } }
      ]
    }
  }
  state = Number(state);
  if (state === constant.state.successByMatched) {
    where.status = {
      $eq: "matched",
    };
  } else if (state === constant.state.successByAdmin) {
    where.confirmStatus = {
      $eq: constant.confirmStatus.successByAdmin,
    };
  } else if (state === constant.state.failByAdmin) {
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
          ],
        },
      },
    ];
  }
  if (toChainId) {
    where.toChain = { $eq: toChainId }
  }
  if (fromChainId) {
    where.fromChain = { $eq: fromChainId }
  }
  if (constant.decimalMap[symbol] && (minAmount || maxAmount)) {
    where['inData.extra.toSymbol'] = { $eq: symbol }
    if (minAmount) {
      minAmount = ethers.parseUnits(minAmount, constant.decimalMap[symbol]).toString()
      where.numberToAmount = { $gte: mongoose.Types.Long.fromString(minAmount) }
    } 
    if (maxAmount) {
      maxAmount = ethers.parseUnits(maxAmount, constant.decimalMap[symbol]).toString()
      if (!minAmount) {
        where.numberToAmount = { $lte: mongoose.Types.Long.fromString(maxAmount) }
      } else {
        where.numberToAmount = { ...where.numberToAmount, $lte: mongoose.Types.Long.fromString(maxAmount) }
      }
    }
  }

  console.log(JSON.stringify(where), minAmount, maxAmount);
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
    async (doc) => {
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
  current = Number(current);
  if (!current || current <= 0) {
    current = 1;
  }

  const skip = (current - 1) * size;
  let bind_status = ["Error", "multi", "too_old"];
  if (["Error", "multi", "too_old"].includes(state)) {
    bind_status = [state];
  }
  const where = { bind_status: { $in: bind_status } };
  if (makerAddress) {
    where.fake_maker_address = makerAddress;
  }
  if (chain && constant.chainDesc.includes(chain)) {
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
  const where = {};
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
    confirmStatus: { $eq: constant.confirmStatus.successByAdmin },
  };
  const failByAdminCountWhere = {
    ...where,
    confirmStatus: { $eq: constant.confirmStatus.failByAdmin },
  };
  delete successByAdminCountWhere['inData.timestamp'] // ignore time
  delete failByAdminCountWhere['inData.timestamp'] // ignore time
  const failByMultiAnd = [
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
  const failByMultiCountWhere = { ...where, $and: failByMultiAnd };
  let failByUnknownAnd = [
    { status: { $nin: ["matched", "warning"] } },
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
      pendingPay[e._id] = ethers.formatUnits(parseFloat(e.count).toString(), constant.decimalMap[e._id] || 18)
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
  console.log(ctx.query)
  const failTx = await makerTx.findOne({ transcationId: transactionId  })
  if (!failTx) {
    return;
  }
  const failTxTime = new Date(failTx.inData.timestamp).getTime();
  let list = [];
  if (is.isStarknet(failTx)) {
    const matcheds = await starknetTxModel.find({
      "input.6": BigNumber.from(failTx.replyAccount).toString(),
      "timestamp": { $gte: parseInt(failTxTime / 1000) }
    });
    list = matcheds
  } else if (is.isZk2(failTx)) {
    list = await zksyncliteTxModel.find({
      to: failTx.replyAccount.toLowerCase(),
    });
  } else if (is.isArbNova(failTx)) {
    list = await arbNovaScan.scanNova(failTx.replyAccount, 200);
  } else {
    const url = getUrl(failTx);
    if (!url) {
      list = []
      result.data = list
      return
    }
    const res = await axios.get(url);
    if (is.isZksynclite(failTx)) {
      if (res.data.status === "success" && Array.isArray(res.data.result.list)) {
        list = res.data.result.list.filter((item) => {
          if (item.failReason !== null || item.op.type !== "Transfer") {
            return false;
          }
          const timeValid = moment(new Date(item.createdAt)).isAfter(moment(new Date(failTxTime)))
          return timeValid && isMaker(item.op.from)
        });

      }
    } else {
      if (res.data.status === "1" && Array.isArray(res.data.result)) {
        list = res.data.result.filter((item) => {
          const timeValid = (Number(item.timeStamp) * 1000) >= failTxTime
          item.createdAt = getFormatDate((Number(item.timeStamp) * 1000), 0)
          return timeValid && isMaker(item.from);
        });
      }
    }
  }
  result.data = list
})

module.exports = router;
